#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Generate a configuration file with all available options
 */
function generateConfig(outputPath = "awesome-copilot.config.yml") {
  const rootDir = __dirname;

  // Get all available items
  const prompts = getAvailableItems(path.join(rootDir, "prompts"), ".prompt.md");
  const instructions = getAvailableItems(path.join(rootDir, "instructions"), ".instructions.md");
  const chatmodes = getAvailableItems(path.join(rootDir, "chatmodes"), ".chatmode.md");
  const collections = getAvailableItems(path.join(rootDir, "collections"), ".collection.yml");

  // Create config structure
  const config = {
    version: "1.0",
    project: {
      name: "My Project", 
      description: "A project using awesome-copilot customizations",
      output_directory: ".awesome-copilot"
    },
    prompts: {},
    instructions: {},
    chatmodes: {},
    collections: {}
  };

  // Only populate collections with defaults (set to false)
  // Individual items are left undefined to allow collection precedence
  collections.forEach(item => {
    config.collections[item] = false;
  });

  // Note: prompts, instructions, and chatmodes are left empty
  // Users can explicitly enable items they want, or enable collections
  // to get groups of items. Undefined items respect collection settings.

  const yamlContent = objectToYaml(config);
  const fullContent = generateConfigHeader() + yamlContent;

  fs.writeFileSync(outputPath, fullContent);
  console.log(`Configuration file generated: ${outputPath}`);
  console.log(`Found ${prompts.length} prompts, ${instructions.length} instructions, ${chatmodes.length} chat modes, ${collections.length} collections`);
  console.log("\nNext steps:");
  console.log("1. Edit the configuration file to enable desired items");
  console.log("2. Run: awesome-copilot apply to apply the configuration");
}

/**
 * Get all available items in a directory
 */
function getAvailableItems(directory, extension) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory)
    .filter(file => file.endsWith(extension))
    .map(file => path.basename(file, extension))
    .sort();
}

/**
 * Convert object to YAML format (simple implementation)
 */
function objectToYaml(obj, indent = 0) {
  const spaces = "  ".repeat(indent);
  let yaml = "";

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      yaml += `${spaces}${key}:\n`;
      yaml += objectToYaml(value, indent + 1);
    } else {
      const valueStr = typeof value === "string" ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${valueStr}\n`;
    }
  }

  return yaml;
}

function generateConfigHeader(date = new Date()) {
  return `# Awesome Copilot Configuration File
# Generated on ${date.toISOString()}
#
# This file uses effective state precedence:
# 1. Explicit item settings (true/false) override everything
# 2. Items not listed inherit from enabled collections
# 3. Otherwise items are disabled
#
# To use:
# - Enable collections for curated sets of related items
# - Explicitly set individual items to true/false to override collections
# - Items not mentioned will follow collection settings
#
# After configuring, run: awesome-copilot apply
#

`;
}

// CLI usage
if (require.main === module) {
  const outputPath = process.argv[2] || "awesome-copilot.config.yml";
  generateConfig(outputPath);
}

module.exports = {
  generateConfig,
  getAvailableItems,
  objectToYaml,
  generateConfigHeader
};
