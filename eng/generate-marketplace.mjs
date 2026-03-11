#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const EXTERNAL_PLUGINS_FILE = path.join(ROOT_FOLDER, "plugins", "external.json");
const MARKETPLACE_FILE = path.join(ROOT_FOLDER, ".github/plugin", "marketplace.json");

/**
 * Validate an external plugin entry has required fields and a non-local source
 * @param {object} plugin - External plugin entry
 * @param {number} index - Index in the array (for error messages)
 * @returns {string[]} - Array of validation error messages
 */
function validateExternalPlugin(plugin, index) {
  const errors = [];
  const prefix = `external.json[${index}]`;

  if (!plugin.name || typeof plugin.name !== "string") {
    errors.push(`${prefix}: "name" is required and must be a string`);
  }
  if (!plugin.description || typeof plugin.description !== "string") {
    errors.push(`${prefix}: "description" is required and must be a string`);
  }
  if (!plugin.version || typeof plugin.version !== "string") {
    errors.push(`${prefix}: "version" is required and must be a string`);
  }

  if (!plugin.source) {
    errors.push(`${prefix}: "source" is required`);
  } else if (typeof plugin.source === "string") {
    errors.push(`${prefix}: "source" must be an object (local file paths are not allowed for external plugins)`);
  } else if (typeof plugin.source === "object") {
    if (!plugin.source.source) {
      errors.push(`${prefix}: "source.source" is required (e.g. "github", "url", "npm", "pip")`);
    }
  } else {
    errors.push(`${prefix}: "source" must be an object`);
  }

  return errors;
}

/**
 * Read external plugin entries from external.json
 * @returns {Array} - Array of external plugin entries (merged as-is)
 */
function readExternalPlugins() {
  if (!fs.existsSync(EXTERNAL_PLUGINS_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(EXTERNAL_PLUGINS_FILE, "utf8");
    const plugins = JSON.parse(content);
    if (!Array.isArray(plugins)) {
      console.warn("Warning: external.json must contain an array");
      return [];
    }

    // Validate each entry
    let hasErrors = false;
    for (let i = 0; i < plugins.length; i++) {
      const errors = validateExternalPlugin(plugins[i], i);
      if (errors.length > 0) {
        errors.forEach(e => console.error(`Error: ${e}`));
        hasErrors = true;
      }
    }
    if (hasErrors) {
      console.error("Error: external.json contains invalid entries");
      process.exit(1);
    }

    return plugins;
  } catch (error) {
    console.error(`Error reading external.json: ${error.message}`);
    return [];
  }
}

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

/**
 * Generate marketplace.json from plugin directories
 */
function generateMarketplace() {
  console.log("Generating marketplace.json...");

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Error: Plugins directory not found at ${PLUGINS_DIR}`);
    process.exit(1);
  }

  // Read all plugin directories
  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  console.log(`Found ${pluginDirs.length} plugin directories`);

  // Read metadata for each plugin
  const plugins = [];
  for (const dirName of pluginDirs) {
    const pluginPath = path.join(PLUGINS_DIR, dirName);
    const metadata = readPluginMetadata(pluginPath);

    if (metadata) {
      plugins.push({
        name: metadata.name,
        source: dirName,
        description: metadata.description,
        version: metadata.version || "1.0.0"
      });
      console.log(`✓ Added plugin: ${metadata.name}`);
    } else {
      console.log(`✗ Skipped: ${dirName} (no valid plugin.json)`);
    }
  }

  // Read external plugins and merge as-is
  const externalPlugins = readExternalPlugins();
  if (externalPlugins.length > 0) {
    console.log(`\nFound ${externalPlugins.length} external plugins`);

    // Warn on duplicate names
    const localNames = new Set(plugins.map(p => p.name));
    for (const ext of externalPlugins) {
      if (localNames.has(ext.name)) {
        console.warn(`Warning: external plugin "${ext.name}" has the same name as a local plugin`);
      }
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
      version: "1.0.0",
      pluginRoot: "./plugins"
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
