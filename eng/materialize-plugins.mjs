#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");
const COPILOT_NAMESPACE = "com.github.copilot";

/**
 * Recursively copy a directory.
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Resolve a plugin-relative path to the repo-root source file.
 *
 *   ./agents/foo.md   → ROOT/agents/foo.agent.md
 *   ./skills/baz/      → ROOT/skills/baz/
 */
function resolveSource(relPath) {
  const basename = path.basename(relPath, ".md");
  if (relPath.startsWith("./agents/")) {
    return path.join(ROOT_FOLDER, "agents", `${basename}.agent.md`);
  }
  if (relPath.startsWith("./skills/")) {
    // Strip trailing slash and get the skill folder name
    const skillName = relPath.replace(/^\.\/skills\//, "").replace(/\/$/, "");
    return path.join(ROOT_FOLDER, "skills", skillName);
  }
  if (relPath.startsWith("./extensions/")) {
    const extensionName = relPath.replace(/^\.\/extensions\//, "").replace(/\/$/, "");
    return path.join(ROOT_FOLDER, "extensions", extensionName);
  }
  return null;
}

function readExtensionReferences(metadata, pluginName) {
  const extensionData = metadata.extensions?.[COPILOT_NAMESPACE];
  const directories = extensionData?.directories ?? [];
  if (!Array.isArray(directories) || directories.some((entry) => typeof entry !== "string")) {
    throw new Error(`extensions["${COPILOT_NAMESPACE}"].directories must contain plugin-relative paths`);
  }

  const names = new Set(directories.map((entry) =>
    entry.replace(/^\.\/extensions\//, "").replace(/\/$/, "")
  ));
  if (fs.existsSync(path.join(EXTENSIONS_DIR, pluginName, "extension.mjs"))) {
    names.add(pluginName);
  }

  return [...names].sort();
}

function materializePlugins() {
  console.log("Materializing plugin files...\n");

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Error: Plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  let totalAgents = 0;
  let totalSkills = 0;
  let totalExtensions = 0;
  let warnings = 0;
  let errors = 0;

  for (const dirName of pluginDirs) {
    const pluginPath = path.join(PLUGINS_DIR, dirName);
    const pluginJsonPath = path.join(pluginPath, "plugin.json");

    if (!fs.existsSync(pluginJsonPath)) {
      continue;
    }

    let metadata;
    try {
      metadata = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
    } catch (err) {
      console.error(`Error: Failed to parse ${pluginJsonPath}: ${err.message}`);
      errors++;
      continue;
    }

    const pluginName = metadata.name || dirName;

    // Process agents
    if (Array.isArray(metadata.agents)) {
      for (const relPath of metadata.agents) {
        const src = resolveSource(relPath);
        if (!src) {
          console.warn(`  ⚠ ${pluginName}: Unknown path format: ${relPath}`);
          warnings++;
          continue;
        }
        if (!fs.existsSync(src)) {
          console.warn(`  ⚠ ${pluginName}: Source not found: ${src}`);
          warnings++;
          continue;
        }
        const dest = path.join(pluginPath, relPath.replace(/^\.\//, ""));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        totalAgents++;
      }
    }

    // Process skills
    if (Array.isArray(metadata.skills)) {
      for (const relPath of metadata.skills) {
        const src = resolveSource(relPath);
        if (!src) {
          console.warn(`  ⚠ ${pluginName}: Unknown path format: ${relPath}`);
          warnings++;
          continue;
        }
        if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
          console.warn(`  ⚠ ${pluginName}: Source directory not found: ${src}`);
          warnings++;
          continue;
        }
        const dest = path.join(pluginPath, relPath.replace(/^\.\//, "").replace(/\/$/, ""));
        copyDirRecursive(src, dest);
        totalSkills++;
      }
    }

    // Process extension directories declared in the Copilot namespace.
    const extensionRefs = readExtensionReferences(metadata, pluginName);
    for (const extensionName of extensionRefs) {
      const relPath = `./extensions/${extensionName}`;
      const src = resolveSource(relPath);
      if (!src) {
        console.warn(`  ⚠ ${pluginName}: Unknown extension path format: ${relPath}`);
        warnings++;
        continue;
      }
      if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
        console.warn(`  ⚠ ${pluginName}: Extension source directory not found: ${src}`);
        warnings++;
        continue;
      }
      const dest = path.join(pluginPath, COPILOT_NAMESPACE, extensionName);
      copyDirRecursive(src, dest);
      totalExtensions++;
    }

    // Emit a spec-compliant served manifest for the marketplace branch.
    // Source manifests keep composition fields (agents and skills)
    // for build tooling. The served manifest retains only Agent Plugins v1.0.0 fields
    // so the runtime uses conventional directory discovery for all content.
    const SPEC_FIELDS = new Set(["$schema", "name", "version", "description", "author",
      "homepage", "repository", "license", "keywords", "extensions"]);
    const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

    const served = { "$schema": AGENT_PLUGINS_SCHEMA };
    for (const [key, val] of Object.entries(metadata)) {
      if (SPEC_FIELDS.has(key) && key !== "$schema") {
        if (key === "extensions" && val?.[COPILOT_NAMESPACE]?.directories) {
          served[key] = {
            ...val,
            [COPILOT_NAMESPACE]: {
              ...val[COPILOT_NAMESPACE],
              directories: undefined,
            },
          };
          delete served[key][COPILOT_NAMESPACE].directories;
        } else {
          served[key] = val;
        }
      }
    }

    fs.writeFileSync(pluginJsonPath, JSON.stringify(served, null, 2) + "\n", "utf8");

    const counts = [];
    if (metadata.agents?.length) counts.push(`${metadata.agents.length} agents`);
    if (metadata.skills?.length) counts.push(`${metadata.skills.length} skills`);
    if (extensionRefs.length) counts.push(`${extensionRefs.length} extensions`);
    if (counts.length) {
      console.log(`✓ ${pluginName}: ${counts.join(", ")}`);
    }
  }

  console.log(`\nDone. Copied ${totalAgents} agents, ${totalSkills} skills, ${totalExtensions} extensions.`);
  if (warnings > 0) {
    console.log(`${warnings} warning(s).`);
  }
  if (errors > 0) {
    console.error(`${errors} error(s).`);
    process.exit(1);
  }
}

materializePlugins();
