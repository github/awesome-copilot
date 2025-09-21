#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseCollectionYaml } = require("./yaml-parser");

/**
 * Simple YAML parser for configuration files with enhanced error handling
 */
function parseConfigYamlContent(content) {
  const lines = content.split("\n");
  const result = {};
  let currentSection = null;
  let lineNumber = 0;

  try {
    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      if (!trimmed.includes(":")) {
        continue;
      }

      const colonIndex = trimmed.indexOf(":");
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Validate key format
      if (!key || key.includes(" ") && !currentSection) {
        throw new Error(`Invalid key format on line ${lineNumber}: "${key}"`);
      }

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
  } catch (error) {
    throw new Error(`YAML parsing error: ${error.message}`);
  }
}

/**
 * Validate configuration structure and content
 */
function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push("Configuration must be a valid object");
    return errors;
  }

  // Check version
  if (!config.version) {
    errors.push("Configuration must have a 'version' field");
  }

  // Check project structure
  if (config.project && typeof config.project !== 'object') {
    errors.push("'project' field must be an object");
  }

  // Validate sections
  const validSections = ['prompts', 'instructions', 'chatmodes', 'collections'];
  validSections.forEach(section => {
    if (config[section] && typeof config[section] !== 'object') {
      errors.push(`'${section}' field must be an object`);
    } else if (config[section]) {
      // Validate section items
      Object.entries(config[section]).forEach(([key, value]) => {
        if (typeof value !== 'boolean') {
          errors.push(`${section}.${key} must be a boolean value (true/false)`);
        }
      });
    }
  });

  // Check for unknown top-level fields
  const knownFields = ['version', 'project', ...validSections];
  Object.keys(config).forEach(key => {
    if (!knownFields.includes(key)) {
      errors.push(`Unknown configuration field: '${key}'`);
    }
  });

  return errors;
}

function parseConfigYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const config = parseConfigYamlContent(content);
    
    // Validate the parsed configuration
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      console.error(`Configuration validation errors in ${filePath}:`);
      validationErrors.forEach(error => {
        console.error(`  ❌ ${error}`);
      });
      throw new Error("Configuration validation failed");
    }
    
    return config;
  } catch (error) {
    if (error.message === "Configuration validation failed") {
      throw error;
    }
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
  
  // Check if this is a subsequent run by looking for existing state
  const stateFilePath = path.join(outputDir, ".awesome-copilot-state.json");
  let previousState = {};
  if (fs.existsSync(stateFilePath)) {
    try {
      previousState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    } catch (error) {
      // If state file is corrupted, treat as first run
      previousState = {};
    }
  }

  let copiedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;
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

  // Helper function to process section files
  function processSection(sectionName, sourceDir, destDir, fileExtension) {
    const enabledInSection = new Set();
    
    if (config[sectionName]) {
      for (const [itemName, enabled] of Object.entries(config[sectionName])) {
        const sourcePath = path.join(rootDir, sourceDir, `${itemName}${fileExtension}`);
        const destPath = path.join(outputDir, destDir, `${itemName}${fileExtension}`);
        
        if (enabled && fs.existsSync(sourcePath)) {
          const copyResult = copyFileWithTracking(sourcePath, destPath);
          if (copyResult.copied) {
            copiedCount++;
            summary[sectionName]++;
          } else if (copyResult.skipped) {
            skippedCount++;
          }
          enabledInSection.add(itemName);
        } else if (!enabled && fs.existsSync(destPath)) {
          // Remove file if it's disabled
          fs.unlinkSync(destPath);
          console.log(`✗ Removed: ${itemName}${fileExtension}`);
          removedCount++;
        }
      }
    }

    // Remove any files in destination that are not enabled
    const destDirPath = path.join(outputDir, destDir);
    if (fs.existsSync(destDirPath)) {
      const existingFiles = fs.readdirSync(destDirPath)
        .filter(file => file.endsWith(fileExtension));
      
      existingFiles.forEach(file => {
        const itemName = file.replace(fileExtension, '');
        if (!enabledInSection.has(itemName) && !isItemInEnabledCollection(file, enabledItems)) {
          const filePath = path.join(destDirPath, file);
          fs.unlinkSync(filePath);
          console.log(`✗ Removed orphaned: ${file}`);
          removedCount++;
        }
      });
    }
  }

  // Helper function to copy files with tracking
  function copyFileWithTracking(sourcePath, destPath) {
    // Check if file already exists and is identical
    if (fs.existsSync(destPath)) {
      try {
        const sourceContent = fs.readFileSync(sourcePath);
        const destContent = fs.readFileSync(destPath);
        
        if (sourceContent.equals(destContent)) {
          // Files are identical, no need to copy
          console.log(`⚡ Skipped (up to date): ${path.basename(sourcePath)}`);
          return { copied: false, skipped: true };
        }
      } catch (error) {
        // If we can't read files for comparison, just proceed with copy
      }
    }

    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copied: ${path.basename(sourcePath)}`);
    return { copied: true, skipped: false };
  }

  // Helper function to check if an item is in an enabled collection
  function isItemInEnabledCollection(filename, enabledItems) {
    for (const itemPath of enabledItems) {
      if (path.basename(itemPath) === filename) {
        return true;
      }
    }
    return false;
  }

  // Process prompts
  processSection("prompts", "prompts", "prompts", ".prompt.md");

  // Process instructions
  processSection("instructions", "instructions", "instructions", ".instructions.md");

  // Process chat modes
  processSection("chatmodes", "chatmodes", "chatmodes", ".chatmode.md");

  // Process items from enabled collections, but respect individual overrides
  for (const itemPath of enabledItems) {
    const sourcePath = path.join(rootDir, itemPath);
    if (fs.existsSync(sourcePath)) {
      const fileName = path.basename(itemPath);
      const itemName = fileName.replace(/\.(prompt|instructions|chatmode)\.md$/, '');
      let destPath;
      let section;
      
      if (fileName.endsWith('.prompt.md')) {
        destPath = path.join(outputDir, "prompts", fileName);
        section = "prompts";
      } else if (fileName.endsWith('.chatmode.md')) {
        destPath = path.join(outputDir, "chatmodes", fileName);
        section = "chatmodes";
      } else if (fileName.endsWith('.instructions.md')) {
        destPath = path.join(outputDir, "instructions", fileName);
        section = "instructions";
      }
      
      // Only copy if not explicitly disabled in individual settings
      const isExplicitlyDisabled = config[section] && config[section][itemName] === false;
      
      if (destPath && !isExplicitlyDisabled) {
        const copyResult = copyFileWithTracking(sourcePath, destPath);
        if (copyResult.copied) {
          copiedCount++;
        } else if (copyResult.skipped) {
          skippedCount++;
        }
      }
    }
  }

  // Generate summary
  console.log("\n" + "=".repeat(50));
  console.log("Configuration applied successfully!");
  console.log("=".repeat(50));
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`📝 Total files copied: ${copiedCount}`);
  if (skippedCount > 0) {
    console.log(`⚡ Files skipped (up to date): ${skippedCount}`);
  }
  if (removedCount > 0) {
    console.log(`🗑️  Total files removed: ${removedCount}`);
  }
  console.log(`🎯 Prompts: ${summary.prompts}`);
  console.log(`📋 Instructions: ${summary.instructions}`);
  console.log(`💭 Chat modes: ${summary.chatmodes}`);
  console.log(`📦 Collections: ${summary.collections}`);
  
  if (config.project?.name) {
    console.log(`🏷️  Project: ${config.project.name}`);
  }

  // Save current state for future idempotency checks
  const currentState = {
    lastApplied: new Date().toISOString(),
    configHash: Buffer.from(JSON.stringify(config)).toString('base64'),
    outputDir: outputDir
  };
  
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(currentState, null, 2));
  } catch (error) {
    // State saving failure is not critical
    console.log("⚠️  Warning: Could not save state file for future optimization");
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
