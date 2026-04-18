#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const MATERIALIZED_SPECS = {
  agents: {
    path: "agents",
    restore(dirPath) {
      return collectFiles(dirPath).map((relativePath) => `./agents/${relativePath}`);
    },
  },
  commands: {
    path: "commands",
    restore(dirPath) {
      return collectFiles(dirPath).map((relativePath) => `./commands/${relativePath}`);
    },
  },
  skills: {
    path: "skills",
    restore(dirPath) {
      return collectSkillDirectories(dirPath).map((relativePath) => `./skills/${relativePath}/`);
    },
  },
};

export function restoreManifestFromMaterializedFiles(pluginPath) {
  const pluginJsonPath = path.join(pluginPath, ".github/plugin", "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    return false;
  }

  let plugin;
  try {
    plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse ${pluginJsonPath}: ${error.message}`);
  }

  let changed = false;
  for (const [field, spec] of Object.entries(MATERIALIZED_SPECS)) {
    const materializedPath = path.join(pluginPath, spec.path);
    if (!fs.existsSync(materializedPath) || !fs.statSync(materializedPath).isDirectory()) {
      continue;
    }

    const restored = spec.restore(materializedPath);
    if (!arraysEqual(plugin[field], restored)) {
      plugin[field] = restored;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  }

  return changed;
}

function cleanPlugin(pluginPath) {
  const manifestUpdated = restoreManifestFromMaterializedFiles(pluginPath);
  if (manifestUpdated) {
    console.log(`  Updated ${path.basename(pluginPath)}/.github/plugin/plugin.json`);
  }

  let removed = 0;
  for (const { path: subdir } of Object.values(MATERIALIZED_SPECS)) {
    const target = path.join(pluginPath, subdir);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      const count = countFiles(target);
      fs.rmSync(target, { recursive: true, force: true });
      removed += count;
      console.log(`  Removed ${path.basename(pluginPath)}/${subdir}/ (${count} files)`);
    }
  }

  return { removed, manifestUpdated };
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

function collectFiles(dir, rootDir = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, rootDir));
    } else {
      files.push(toPosixPath(path.relative(rootDir, entryPath)));
    }
  }
  return files.sort();
}

function collectSkillDirectories(dir, rootDir = dir) {
  const skillDirs = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (fs.existsSync(path.join(entryPath, "SKILL.md"))) {
      skillDirs.push(toPosixPath(path.relative(rootDir, entryPath)));
      continue;
    }

    skillDirs.push(...collectSkillDirectories(entryPath, rootDir));
  }
  return skillDirs.sort();
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function main() {
  console.log("Cleaning materialized files from plugins...\n");

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Error: plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  let total = 0;
  let manifestsUpdated = 0;
  for (const dirName of pluginDirs) {
    const { removed, manifestUpdated } = cleanPlugin(path.join(PLUGINS_DIR, dirName));
    total += removed;
    if (manifestUpdated) {
      manifestsUpdated++;
    }
  }

  console.log();
  if (total === 0 && manifestsUpdated === 0) {
    console.log("✅ No materialized files found. Plugins are already clean.");
  } else {
    console.log(`✅ Removed ${total} materialized file(s) from plugins.`);
    if (manifestsUpdated > 0) {
      console.log(`✅ Updated ${manifestsUpdated} plugin manifest(s) with folder trailing slashes.`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
