#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseCollectionYaml } = require("./yaml-parser");

/**
 * Simple YAML parser for configuration files
 */
function parseConfigYamlContent(content) {
  const lines = content.split("\n");
  const result = {};
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!trimmed.includes(":")) {
      continue;
    }

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
      continue;
    }

    // Handle boolean values
    if (value === "true") value = true;
    else if (value === "false") value = false;

    if (currentSection) {
      result[currentSection][key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

function parseConfigYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return parseConfigYamlContent(content);
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
  const outputDir = config.project?.output_directory || ".github";

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

  // Import config manager for effective state computation
  const { computeEffectiveItemStates } = require("./config-manager");

  // Compute effective states using precedence rules
  const effectiveStates = computeEffectiveItemStates(config);

  // Create sets of effectively enabled items for performance
  const effectivelyEnabledSets = {
    prompts: new Set(),
    instructions: new Set(),
    chatmodes: new Set()
  };

  for (const section of ["prompts", "instructions", "chatmodes"]) {
    for (const [itemName, state] of Object.entries(effectiveStates[section])) {
      if (state.enabled) {
        effectivelyEnabledSets[section].add(itemName);
      }
    }
  }

  // Count enabled collections for summary
  if (config.collections) {
    for (const [collectionName, enabled] of Object.entries(config.collections)) {
      if (enabled) {
        const collectionPath = path.join(rootDir, "collections", `${collectionName}.collection.yml`);
        if (fs.existsSync(collectionPath)) {
          const collection = parseCollectionYaml(collectionPath);
          if (collection && collection.items) {
            summary.collections++;
            console.log(`✓ Enabled collection: ${collectionName} (${collection.items.length} items)`);
          }
        }
      }
    }
  }

  // Clean up files that are no longer enabled (requirement #3: Toggling instructions off will remove them)
  const cleanupSummary = cleanupDisabledFiles(outputDir, effectivelyEnabledSets, rootDir);
  
  // Process prompts using effective states
  for (const promptName of effectivelyEnabledSets.prompts) {
    const sourcePath = path.join(rootDir, "prompts", `${promptName}.prompt.md`);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(outputDir, "prompts", `${promptName}.prompt.md`);
      if (copyFile(sourcePath, destPath)) {
        copiedCount++;
      }
      summary.prompts++;
    }
  }

  // Process instructions using effective states
  for (const instructionName of effectivelyEnabledSets.instructions) {
    const sourcePath = path.join(rootDir, "instructions", `${instructionName}.instructions.md`);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(outputDir, "instructions", `${instructionName}.instructions.md`);
      if (copyFile(sourcePath, destPath)) {
        copiedCount++;
      }
      summary.instructions++;
    }
  }

  // Process chat modes using effective states
  for (const chatmodeName of effectivelyEnabledSets.chatmodes) {
    const sourcePath = path.join(rootDir, "chatmodes", `${chatmodeName}.chatmode.md`);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(outputDir, "chatmodes", `${chatmodeName}.chatmode.md`);
      if (copyFile(sourcePath, destPath)) {
        copiedCount++;
      }
      summary.chatmodes++;
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
  
  // Suggest generating repository instructions if instructions are enabled
  if (summary.instructions > 0) {
    console.log("5. Consider running 'awesome-copilot generate-repo-instructions' to create .github/copilot-instructions.md");
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Copy file from source to destination with idempotency check
 */
function copyFile(sourcePath, destPath) {
  try {
    // Validate source file exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    // Check if destination exists and has same content (idempotency)
    if (fs.existsSync(destPath)) {
      const sourceContent = fs.readFileSync(sourcePath, 'utf8');
      const destContent = fs.readFileSync(destPath, 'utf8');
      
      if (sourceContent === destContent) {
        console.log(`✓ Already exists and up-to-date: ${path.basename(sourcePath)}`);
        return false; // No copy needed
      }
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    ensureDirectoryExists(destDir);
    
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copied: ${path.basename(sourcePath)}`);
    return true; // File was copied
  } catch (error) {
    console.error(`❌ Failed to copy ${path.basename(sourcePath)}: ${error.message}`);
    return false; // Copy failed
  }
}

/**
 * Cleans up files in the output directory that are no longer enabled.
 *
 * @param {string} outputDir - The root directory where generated files are stored.
 * @param {Object} effectivelyEnabledSets - An object mapping section names to Sets of enabled item names.
 * @param {string} rootDir - The root directory of the project (used for path resolution).
 * @returns {Object} Summary of the number of files removed per section.
 */
function cleanupDisabledFiles(outputDir, effectivelyEnabledSets, rootDir) {
  const removedCounts = {
    prompts: 0,
    instructions: 0,
    chatmodes: 0
  };

  const sections = [
    { name: "prompts", ext: ".prompt.md" },
    { name: "instructions", ext: ".instructions.md" },
    { name: "chatmodes", ext: ".chatmode.md" }
  ];

  for (const section of sections) {
    const sectionDir = path.join(outputDir, section.name);
    if (!fs.existsSync(sectionDir)) continue;

    try {
      const existingFiles = fs.readdirSync(sectionDir);
      for (const fileName of existingFiles) {
        if (!fileName.endsWith(section.ext)) continue;
        
        const itemName = fileName.replace(section.ext, '');
        
        // Check if this item is still enabled
        if (!effectivelyEnabledSets[section.name].has(itemName)) {
          const filePath = path.join(sectionDir, fileName);
          try {
            fs.unlinkSync(filePath);
            removedCounts[section.name]++;
            console.log(`🗑️  Removed: ${section.name}/${fileName}`);
          } catch (error) {
            console.error(`❌ Failed to remove ${section.name}/${fileName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to read directory ${sectionDir}: ${error.message}`);
    }
  }

  return removedCounts;
}

// CLI usage
if (require.main === module) {
  const configPath = process.argv[2] || "awesome-copilot.config.yml";
  applyConfig(configPath).catch(error => {
    console.error("Error applying configuration:", error.message);
    process.exit(1);
  });
}

module.exports = {
  applyConfig,
  parseConfigYaml,
  parseConfigYamlContent
};
