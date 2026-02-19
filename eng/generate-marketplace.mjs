#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
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
        source: `./plugins/${dirName}`,
        description: metadata.description,
        version: metadata.version || "1.0.0"
      });
      console.log(`✓ Added plugin: ${metadata.name}`);
    } else {
      console.log(`✗ Skipped: ${dirName} (no valid plugin.json)`);
    }
  }
  
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
  
  console.log(`\n✓ Successfully generated marketplace.json with ${plugins.length} plugins`);
  console.log(`  Location: ${MARKETPLACE_FILE}`);
}

// Run the script
generateMarketplace();
