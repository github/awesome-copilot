#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");

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

function moveEntry(srcPath, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  try {
    fs.renameSync(srcPath, destPath);
    return;
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }
  }

  const stats = fs.statSync(srcPath);
  if (stats.isDirectory()) {
    copyDirRecursive(srcPath, destPath);
    fs.rmSync(srcPath, { recursive: true, force: true });
    return;
  }

  fs.copyFileSync(srcPath, destPath);
  fs.rmSync(srcPath, { force: true });
}

function isRelativeAssetPath(assetPath) {
  return typeof assetPath === "string" &&
    assetPath.length > 0 &&
    !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(assetPath) &&
    !assetPath.startsWith("data:") &&
    !path.isAbsolute(assetPath);
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

export function materializeExtensionPlugin(extensionPath) {
  const pluginJsonPath = path.join(extensionPath, ".github", "plugin", "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    return { movedEntries: 0, manifestUpdated: false, skipped: true };
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse ${pluginJsonPath}: ${err.message}`);
  }

  const extensionContainerPath = path.join(extensionPath, "extensions");
  const extensionBundlePath = path.join(extensionContainerPath, path.basename(extensionPath));
  fs.rmSync(extensionContainerPath, { recursive: true, force: true });
  fs.mkdirSync(extensionBundlePath, { recursive: true });

  let movedEntries = 0;
  for (const entry of fs.readdirSync(extensionPath, { withFileTypes: true })) {
    if (entry.name === ".github" || entry.name === "extensions") {
      continue;
    }

    moveEntry(
      path.join(extensionPath, entry.name),
      path.join(extensionBundlePath, entry.name)
    );
    movedEntries++;
  }

  if (isRelativeAssetPath(metadata.logo)) {
    const normalizedLogoPath = metadata.logo.replace(/\\/g, "/").replace(/^\.\//, "");
    const bundledLogoPath = path.join(extensionBundlePath, normalizedLogoPath);
    if (fs.existsSync(bundledLogoPath)) {
      const rootLogoPath = path.join(extensionPath, normalizedLogoPath);
      fs.mkdirSync(path.dirname(rootLogoPath), { recursive: true });
      fs.copyFileSync(bundledLogoPath, rootLogoPath);
    }
  }

  let manifestUpdated = false;
  if (metadata.extensions !== "extensions") {
    metadata.extensions = "extensions";
    manifestUpdated = true;
  }
  if (manifestUpdated) {
    fs.writeFileSync(pluginJsonPath, JSON.stringify(metadata, null, 2) + "\n", "utf8");
  }

  return { movedEntries, manifestUpdated, skipped: false };
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
  let totalExtensionPlugins = 0;
  let totalExtensionPluginEntries = 0;
  let warnings = 0;
  let errors = 0;

  for (const dirName of pluginDirs) {
    const pluginPath = path.join(PLUGINS_DIR, dirName);
    const pluginJsonPath = path.join(pluginPath, ".github/plugin", "plugin.json");

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

    // Process extension references from x-awesome-copilot.extensions
    const extensionRefs = Array.isArray(metadata?.["x-awesome-copilot"]?.extensions)
      ? metadata["x-awesome-copilot"].extensions
      : [];
    for (const relPath of extensionRefs) {
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
      const dest = path.join(pluginPath, relPath.replace(/^\.\//, "").replace(/\/$/, ""));
      copyDirRecursive(src, dest);
      totalExtensions++;
    }

    // Rewrite plugin.json to use folder paths instead of individual file paths.
    // On staged, paths like ./agents/foo.md point to individual source files.
    // On main, after materialization, we only need the containing directory.
    const rewritten = { ...metadata };
    let changed = false;

    for (const field of ["agents", "commands"]) {
      if (Array.isArray(rewritten[field]) && rewritten[field].length > 0) {
        const dirs = [...new Set(rewritten[field].map(p => path.dirname(p)))];
        rewritten[field] = dirs;
        changed = true;
      }
    }

    if (Array.isArray(rewritten.skills) && rewritten.skills.length > 0) {
      // Skills are already folder refs (./skills/name/); strip trailing slash
      rewritten.skills = rewritten.skills.map(p => p.replace(/\/$/, ""));
      changed = true;
    }

    if (Array.isArray(rewritten?.["x-awesome-copilot"]?.extensions) &&
      rewritten["x-awesome-copilot"].extensions.length > 0) {
      rewritten["x-awesome-copilot"].extensions =
        rewritten["x-awesome-copilot"].extensions.map((p) => p.replace(/\/$/, ""));
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(pluginJsonPath, JSON.stringify(rewritten, null, 2) + "\n", "utf8");
    }

    const counts = [];
    if (metadata.agents?.length) counts.push(`${metadata.agents.length} agents`);
    if (metadata.skills?.length) counts.push(`${metadata.skills.length} skills`);
    if (extensionRefs.length) counts.push(`${extensionRefs.length} extensions`);
    if (counts.length) {
      console.log(`✓ ${pluginName}: ${counts.join(", ")}`);
    }
  }

  if (fs.existsSync(EXTENSIONS_DIR)) {
    const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const dirName of extensionDirs) {
      const extensionPath = path.join(EXTENSIONS_DIR, dirName);
      if (!fs.existsSync(path.join(extensionPath, "extension.mjs"))) {
        continue;
      }

      try {
        const result = materializeExtensionPlugin(extensionPath);
        if (result.skipped) {
          continue;
        }

        totalExtensionPlugins++;
        totalExtensionPluginEntries += result.movedEntries;
        console.log(`✓ ${dirName}: materialized extension bundle into ./extensions (${result.movedEntries} entries)`);
      } catch (err) {
        console.error(`Error: Failed to materialize extension plugin ${dirName}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone. Copied ${totalAgents} agents, ${totalSkills} skills, ${totalExtensions} plugin extension refs.`);
  console.log(`Materialized ${totalExtensionPlugins} extension plugins (${totalExtensionPluginEntries} top-level entries).`);
  if (warnings > 0) {
    console.log(`${warnings} warning(s).`);
  }
  if (errors > 0) {
    console.error(`${errors} error(s).`);
    process.exit(1);
  }
}

export { materializePlugins };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  materializePlugins();
}
