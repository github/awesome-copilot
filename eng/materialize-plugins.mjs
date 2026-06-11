#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");

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
  return null;
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

    if (changed) {
      fs.writeFileSync(pluginJsonPath, JSON.stringify(rewritten, null, 2) + "\n", "utf8");
    }

    const counts = [];
    if (metadata.agents?.length) counts.push(`${metadata.agents.length} agents`);
    if (metadata.skills?.length) counts.push(`${metadata.skills.length} skills`);
    if (counts.length) {
      console.log(`✓ ${pluginName}: ${counts.join(", ")}`);
    }
  }

  console.log(`\nDone. Copied ${totalAgents} agents, ${totalSkills} skills.`);
  if (warnings > 0) {
    console.log(`${warnings} warning(s).`);
  }
  if (errors > 0) {
    console.error(`${errors} error(s).`);
    process.exit(1);
  }
}

materializePlugins();
