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
      output_directory: ".github"
    },
    prompts: {},
    instructions: {},
    chatmodes: {},
    collections: {}
  };

  // Populate with all items disabled by default (user can enable what they want)
  prompts.forEach(item => {
    config.prompts[item] = false;
  });

  instructions.forEach(item => {
    config.instructions[item] = false;
  });

  chatmodes.forEach(item => {
    config.chatmodes[item] = false;
  });

  collections.forEach(item => {
    config.collections[item] = false;
  });

  // Convert to YAML format manually (since we don't want to add dependencies)
  const yamlContent = objectToYaml(config);
  
  // Add header comment
  const header = `# Awesome Copilot Configuration File
# Generated on ${new Date().toISOString()}
# 
# This file allows you to enable/disable specific prompts, instructions, 
# chat modes, and collections for your project.
#
# Set items to 'true' to include them in your project
# Set items to 'false' to exclude them
#
# After configuring, run: node apply-config.js
#

`;

  const fullContent = header + yamlContent;

  fs.writeFileSync(outputPath, fullContent);
  console.log(`Configuration file generated: ${outputPath}`);
  console.log(`Found ${prompts.length} prompts, ${instructions.length} instructions, ${chatmodes.length} chat modes, ${collections.length} collections`);
  console.log("\nNext steps:");
  console.log("1. Edit the configuration file to enable desired items");
  console.log("2. Run: node apply-config.js to apply the configuration");
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

// CLI usage
if (require.main === module) {
  const outputPath = process.argv[2] || "awesome-copilot.config.yml";
  generateConfig(outputPath);
}

module.exports = { generateConfig, getAvailableItems };

// CLI usage
if (require.main === module) {
  const outputPath = process.argv[2] || "awesome-copilot.config.yml";
  generateConfig(outputPath);
}

module.exports = { generateConfig, getAvailableItems };