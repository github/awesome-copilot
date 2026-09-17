#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");
const COPILOT_CONTENT_DIR = "com.github.copilot";
const AWESOME_COPILOT_NAMESPACE = "com.github.awesome-copilot";
const MATERIALIZED_SPECS = {
  agents: {
    paths: [path.join(COPILOT_CONTENT_DIR, "agents"), "agents"],
    restore(dirPath) {
      return collectFiles(dirPath).map((relativePath) => `./agents/${relativePath}`);
    },
  },
  hooks: {
    paths: [path.join(COPILOT_CONTENT_DIR, "hooks"), "hooks"],
    restore(dirPath) {
      return collectDirectoriesContainingFile(dirPath, "hooks.json")
        .map((relativePath) => `./hooks/${relativePath}/`);
    },
  },
  skills: {
    paths: ["skills"],
    restore(dirPath) {
      return collectSkillDirectories(dirPath).map((relativePath) => `./skills/${relativePath}/`);
    },
  },
  extensions: {
    paths: [path.join(COPILOT_CONTENT_DIR, "extensions"), "extensions"],
    restore(dirPath) {
      return collectDirectoriesContainingFile(dirPath, "extension.mjs")
        .map((relativePath) => `./extensions/${relativePath}`);
    },
  },
};

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
    if (!["EXDEV", "EEXIST", "ENOTEMPTY", "EPERM"].includes(error?.code)) {
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

export function restoreManifestFromMaterializedFiles(pluginPath) {
  const pluginJsonPath = path.join(pluginPath, "plugin.json");
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
    const materializedPath = spec.paths
      .map((subdir) => path.join(pluginPath, subdir))
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
    if (!materializedPath) {
      continue;
    }

    const restored = spec.restore(materializedPath);
    const composition = plugin.extensions?.[AWESOME_COPILOT_NAMESPACE];
    if (!arraysEqual(composition?.[field], restored)) {
      plugin.extensions ??= {};
      plugin.extensions[AWESOME_COPILOT_NAMESPACE] ??= {};
      plugin.extensions[AWESOME_COPILOT_NAMESPACE][field] = restored;
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
    console.log(`  Updated ${path.basename(pluginPath)}/plugin.json`);
  }

  let removed = 0;
  for (const { paths } of Object.values(MATERIALIZED_SPECS)) {
    for (const subdir of paths) {
      const target = path.join(pluginPath, subdir);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        const count = countFiles(target);
        fs.rmSync(target, { recursive: true, force: true });
        removed += count;
        console.log(`  Removed ${path.basename(pluginPath)}/${subdir}/ (${count} files)`);
      }
    }
  }

  const copilotContentPath = path.join(pluginPath, COPILOT_CONTENT_DIR);
  if (fs.existsSync(copilotContentPath) && fs.readdirSync(copilotContentPath).length === 0) {
    fs.rmdirSync(copilotContentPath);
  }

  return { removed, manifestUpdated };
}

export function cleanMaterializedExtensionPlugin(extensionPath) {
  const pluginJsonPath = path.join(extensionPath, "plugin.json");
  let manifestUpdated = false;
  if (fs.existsSync(pluginJsonPath)) {
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
    const extensionBundlePrefix = `extensions/${path.basename(extensionPath)}/`;
    if (plugin.extensions === "extensions") {
      plugin.extensions = ".";
      manifestUpdated = true;
    }
    if (typeof plugin.logo === "string" && plugin.logo.startsWith(extensionBundlePrefix)) {
      plugin.logo = plugin.logo.slice(extensionBundlePrefix.length);
      manifestUpdated = true;
    }
    if (manifestUpdated) {
      fs.writeFileSync(pluginJsonPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
      console.log(`  Updated ${path.basename(extensionPath)}/plugin.json`);
    }
  }

  const target = path.join(extensionPath, "extensions");
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    return { removed: 0, manifestUpdated };
  }

  const bundleRoot = path.join(target, path.basename(extensionPath));
  const count = countFiles(target);
  if (fs.existsSync(bundleRoot) && fs.statSync(bundleRoot).isDirectory()) {
    for (const entry of fs.readdirSync(bundleRoot, { withFileTypes: true })) {
      moveEntry(path.join(bundleRoot, entry.name), path.join(extensionPath, entry.name));
    }
    console.log(`  Restored ${path.basename(extensionPath)}/ from materialized extensions bundle`);
  }

  fs.rmSync(target, { recursive: true, force: true });
  console.log(`  Removed ${path.basename(extensionPath)}/extensions/ (${count} files)`);
  return { removed: count, manifestUpdated };
}

function isExtensionPluginDirectory(extensionPath) {
  if (fs.existsSync(path.join(extensionPath, "extension.mjs"))) {
    return true;
  }

  const bundleEntry = path.join(extensionPath, "extensions", path.basename(extensionPath), "extension.mjs");
  if (fs.existsSync(bundleEntry)) {
    return true;
  }

  const pluginJsonPath = path.join(extensionPath, "plugin.json");
  if (!fs.existsSync(pluginJsonPath)) {
    return false;
  }

  try {
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
    return plugin.extensions === "extensions";
  } catch {
    return false;
  }
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

function collectDirectoriesContainingFile(dir, fileName, rootDir = dir) {
  const directories = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (fs.existsSync(path.join(entryPath, fileName))) {
      directories.push(toPosixPath(path.relative(rootDir, entryPath)));
      continue;
    }

    directories.push(...collectDirectoriesContainingFile(entryPath, fileName, rootDir));
  }
  return directories.sort();
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

  if (fs.existsSync(EXTENSIONS_DIR)) {
    const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const dirName of extensionDirs) {
      const extensionPath = path.join(EXTENSIONS_DIR, dirName);
      if (!isExtensionPluginDirectory(extensionPath)) {
        continue;
      }
      const { removed, manifestUpdated } = cleanMaterializedExtensionPlugin(extensionPath);
      total += removed;
      if (manifestUpdated) {
        manifestsUpdated++;
      }
    }
  }

  console.log();
  if (total === 0 && manifestsUpdated === 0) {
    console.log("✅ No materialized files found. Plugins are already clean.");
  } else {
    console.log(`✅ Removed ${total} materialized file(s) from plugins.`);
    if (manifestsUpdated > 0) {
      console.log(`✅ Updated ${manifestsUpdated} plugin manifest(s) to restore and normalize spec entries.`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
