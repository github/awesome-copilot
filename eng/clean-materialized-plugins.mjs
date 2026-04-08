#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const MATERIALIZED_DIRS = ["agents", "commands", "skills"];
const MATERIALIZED_FIELDS = ["agents", "commands", "skills"];

function addTrailingSlashToFolderPath(entry) {
  if (typeof entry !== "string" || !entry.startsWith("./") || entry.endsWith("/")) {
    return entry;
  }

  return path.extname(entry) === "" ? `${entry}/` : entry;
}

export function normalizeManifestFolderPaths(pluginPath) {
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
  for (const field of MATERIALIZED_FIELDS) {
    if (!Array.isArray(plugin[field])) {
      continue;
    }

    const normalized = plugin[field].map(addTrailingSlashToFolderPath);
    if (normalized.some((entry, index) => entry !== plugin[field][index])) {
      plugin[field] = normalized;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  }

  return changed;
}

function cleanPlugin(pluginPath) {
  let removed = 0;
  for (const subdir of MATERIALIZED_DIRS) {
    const target = path.join(pluginPath, subdir);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      const count = countFiles(target);
      fs.rmSync(target, { recursive: true, force: true });
      removed += count;
      console.log(`  Removed ${path.basename(pluginPath)}/${subdir}/ (${count} files)`);
    }
  }

  const manifestUpdated = normalizeManifestFolderPaths(pluginPath);
  if (manifestUpdated) {
    console.log(`  Updated ${path.basename(pluginPath)}/.github/plugin/plugin.json`);
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
