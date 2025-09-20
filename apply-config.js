#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseCollectionYaml } = require("./yaml-parser");

/**
 * Simple YAML parser for configuration files
 */
function parseConfigYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const result = {};
    let currentSection = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      // Handle key-value pairs
      if (trimmed.includes(":")) {
        const colonIndex = trimmed.indexOf(":");
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Handle sections (no value)
        if (!value) {
          currentSection = key;
          if (!result[currentSection]) {
            result[currentSection] = {};
          }
        } else {
          // Handle boolean values
          if (value === "true") value = true;
          else if (value === "false") value = false;
          
          if (currentSection) {
            result[currentSection][key] = value;
          } else {
            result[key] = value;
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error parsing config file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Apply configuration and copy enabled files to project
 */
async function applyConfig(configPath = "awesome-copilot.config.yml") {
  if (!fs.existsSync(configPath)) {
    console.error(`Configuration file not found: ${configPath}`);
    console.log("Run 'node generate-config.js' to create a configuration file first.");
    process.exit(1);
  }

  const config = parseConfigYaml(configPath);
  if (!config) {
    console.error("Failed to parse configuration file");
    process.exit(1);
  }

  console.log("Applying awesome-copilot configuration...");
  
  const rootDir = __dirname;
  const outputDir = config.project?.output_directory || ".awesome-copilot";
  
  // Create output directory structure
  ensureDirectoryExists(outputDir);
  ensureDirectoryExists(path.join(outputDir, "prompts"));
  ensureDirectoryExists(path.join(outputDir, "instructions"));
  ensureDirectoryExists(path.join(outputDir, "chatmodes"));
  
  let copiedCount = 0;
  const summary = {
    prompts: 0,
    instructions: 0,
    chatmodes: 0,
    collections: 0
  };

  // Process collections first (they can enable individual items)
  const enabledItems = new Set();
  if (config.collections) {
    for (const [collectionName, enabled] of Object.entries(config.collections)) {
      if (enabled) {
        const collectionPath = path.join(rootDir, "collections", `${collectionName}.collection.yml`);
        if (fs.existsSync(collectionPath)) {
          const collection = parseCollectionYaml(collectionPath);
          if (collection && collection.items) {
            collection.items.forEach(item => {
              enabledItems.add(item.path);
            });
            summary.collections++;
            console.log(`✓ Enabled collection: ${collectionName} (${collection.items.length} items)`);
          }
        }
      }
    }
  }

  // Process prompts
  if (config.prompts) {
    for (const [promptName, enabled] of Object.entries(config.prompts)) {
      if (enabled) {
        const sourcePath = path.join(rootDir, "prompts", `${promptName}.prompt.md`);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(outputDir, "prompts", `${promptName}.prompt.md`);
          copyFile(sourcePath, destPath);
          copiedCount++;
          summary.prompts++;
        }
      }
    }
  }

  // Process instructions
  if (config.instructions) {
    for (const [instructionName, enabled] of Object.entries(config.instructions)) {
      if (enabled) {
        const sourcePath = path.join(rootDir, "instructions", `${instructionName}.instructions.md`);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(outputDir, "instructions", `${instructionName}.instructions.md`);
          copyFile(sourcePath, destPath);
          copiedCount++;
          summary.instructions++;
        }
      }
    }
  }

  // Process chat modes
  if (config.chatmodes) {
    for (const [chatmodeName, enabled] of Object.entries(config.chatmodes)) {
      if (enabled) {
        const sourcePath = path.join(rootDir, "chatmodes", `${chatmodeName}.chatmode.md`);
        if (fs.existsSync(sourcePath)) {
          const destPath = path.join(outputDir, "chatmodes", `${chatmodeName}.chatmode.md`);
          copyFile(sourcePath, destPath);
          copiedCount++;
          summary.chatmodes++;
        }
      }
    }
  }

  // Process items from enabled collections
  for (const itemPath of enabledItems) {
    const sourcePath = path.join(rootDir, itemPath);
    if (fs.existsSync(sourcePath)) {
      const fileName = path.basename(itemPath);
      let destPath;
      
      if (fileName.endsWith('.prompt.md')) {
        destPath = path.join(outputDir, "prompts", fileName);
      } else if (fileName.endsWith('.chatmode.md')) {
        destPath = path.join(outputDir, "chatmodes", fileName);
      } else if (fileName.endsWith('.instructions.md')) {
        destPath = path.join(outputDir, "instructions", fileName);
      }
      
      if (destPath && !fs.existsSync(destPath)) {
        copyFile(sourcePath, destPath);
        copiedCount++;
      }
    }
  }

  // Generate summary
  console.log("\n" + "=".repeat(50));
  console.log("Configuration applied successfully!");
  console.log("=".repeat(50));
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`📝 Total files copied: ${copiedCount}`);
  console.log(`🎯 Prompts: ${summary.prompts}`);
  console.log(`📋 Instructions: ${summary.instructions}`);
  console.log(`💭 Chat modes: ${summary.chatmodes}`);
  console.log(`📦 Collections: ${summary.collections}`);
  
  if (config.project?.name) {
    console.log(`🏷️  Project: ${config.project.name}`);
  }
  
  console.log("\nNext steps:");
  console.log("1. Add the files to your version control system");
  console.log("2. Use prompts with /awesome-copilot command in GitHub Copilot Chat");
  console.log("3. Instructions will automatically apply to your coding");
  console.log("4. Import chat modes in VS Code settings");
}

/**
 * Ensure directory exists, create if it doesn't
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Copy file from source to destination
 */
function copyFile(sourcePath, destPath) {
  fs.copyFileSync(sourcePath, destPath);
  console.log(`✓ Copied: ${path.basename(sourcePath)}`);
}

// CLI usage
if (require.main === module) {
  const configPath = process.argv[2] || "awesome-copilot.config.yml";
  applyConfig(configPath).catch(error => {
    console.error("Error applying configuration:", error.message);
    process.exit(1);
  });
}

module.exports = { applyConfig, parseConfigYaml };