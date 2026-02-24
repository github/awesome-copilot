#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const MATERIALIZED_DIRS = ["agents", "commands", "skills"];

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
  return removed;
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
  for (const dirName of pluginDirs) {
    total += cleanPlugin(path.join(PLUGINS_DIR, dirName));
  }

  console.log();
  if (total === 0) {
    console.log("✅ No materialized files found. Plugins are already clean.");
  } else {
    console.log(`✅ Removed ${total} materialized file(s) from plugins.`);
  }
}

main();
