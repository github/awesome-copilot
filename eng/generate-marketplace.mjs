#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";
import { readExternalPlugins } from "./external-plugin-validation.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTENSIONS_DIR = path.join(ROOT_FOLDER, "extensions");
const MARKETPLACE_FILE = path.join(ROOT_FOLDER, ".github/plugin", "marketplace.json");

/**
 * Read plugin metadata from plugin.json file
 * @param {string} pluginDir - Path to plugin directory
 * @returns {object|null} - Plugin metadata or null if not found
 */
function readPluginMetadata(pluginDir) {
  const pluginJsonPath = path.join(pluginDir, ".github/plugin", "plugin.json");

  if (!fs.existsSync(pluginJsonPath)) {
    console.warn(`Warning: No plugin.json found for ${path.basename(pluginDir)}`);
    return null;
  }

  try {
    const content = fs.readFileSync(pluginJsonPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading plugin.json for ${path.basename(pluginDir)}:`, error.message);
    return null;
  }
}

function collectLocalPluginsFromRoot(rootDir, sourcePrefix, includeEntry = () => true) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => includeEntry(entry.name))
    .map(entry => entry.name)
    .sort();

  const plugins = [];
  for (const dirName of entries) {
    const pluginPath = path.join(rootDir, dirName);
    const metadata = readPluginMetadata(pluginPath);

    if (!metadata) {
      continue;
    }

    plugins.push({
      name: metadata.name,
      source: `${sourcePrefix}/${dirName}`,
      description: metadata.description,
      version: metadata.version || "1.0.0"
    });
  }

  return plugins;
}

/**
 * Generate marketplace.json from plugin directories
 */
function generateMarketplace() {
  console.log("Generating marketplace.json...");

  if (!fs.existsSync(PLUGINS_DIR) && !fs.existsSync(EXTENSIONS_DIR)) {
    console.error(`Error: Neither plugins directory (${PLUGINS_DIR}) nor extensions directory (${EXTENSIONS_DIR}) was found`);
    process.exit(1);
  }

  const plugins = [
    ...collectLocalPluginsFromRoot(PLUGINS_DIR, "plugins"),
    ...collectLocalPluginsFromRoot(
      EXTENSIONS_DIR,
      "extensions",
      (entryName) => fs.existsSync(path.join(EXTENSIONS_DIR, entryName, "extension.mjs"))
    )
  ];

  console.log(`Found ${plugins.length} local plugin manifests`);

  // Read external plugins and merge as-is
  const { plugins: externalPlugins, errors: externalErrors, warnings: externalWarnings } = readExternalPlugins({
    localPluginNames: plugins.map((plugin) => plugin.name),
    policy: "marketplace",
  });
  externalWarnings.forEach((warning) => console.warn(`Warning: ${warning}`));
  if (externalErrors.length > 0) {
    externalErrors.forEach((error) => console.error(`Error: ${error}`));
    console.error("Error: external.json contains invalid entries");
    process.exit(1);
  }

  if (externalPlugins.length > 0) {
    console.log(`\nFound ${externalPlugins.length} external plugins`);
    for (const ext of externalPlugins) {
      plugins.push(ext);
      console.log(`✓ Added external plugin: ${ext.name}`);
    }
  }

  // Sort all plugins by name (case-insensitive)
  plugins.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  // Create marketplace.json structure
  const marketplace = {
    name: "awesome-copilot",
    metadata: {
      description: "Community-driven collection of GitHub Copilot plugins, agents, prompts, and skills",
      version: "1.0.0"
    },
    owner: {
      name: "GitHub",
      email: "copilot@github.com"
    },
    plugins: plugins
  };

  // Ensure directory exists
  const marketplaceDir = path.dirname(MARKETPLACE_FILE);
  if (!fs.existsSync(marketplaceDir)) {
    fs.mkdirSync(marketplaceDir, { recursive: true });
  }

  // Write marketplace.json
  fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(marketplace, null, 2) + "\n");

  console.log(`\n✓ Successfully generated marketplace.json with ${plugins.length} plugins (${plugins.length - externalPlugins.length} local, ${externalPlugins.length} external)`);
  console.log(`  Location: ${MARKETPLACE_FILE}`);
}

// Run the script
generateMarketplace();
