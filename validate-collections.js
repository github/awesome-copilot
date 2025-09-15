#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Simple YAML parser (same as in update-readme.js)
function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

function parseCollectionYaml(filePath) {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const result = {};
      let currentKey = null;
      let currentArray = null;
      let currentObject = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith("#")) continue;

        const leadingSpaces = line.length - line.trimLeft().length;
        
        // Handle array items starting with -
        if (trimmed.startsWith("- ")) {
          if (currentKey === "items") {
            if (!currentArray) {
              currentArray = [];
              result[currentKey] = currentArray;
            }
            
            // Parse item object
            const item = {};
            currentArray.push(item);
            currentObject = item;
            
            // Handle inline properties on same line as -
            const restOfLine = trimmed.substring(2).trim();
            if (restOfLine) {
              const colonIndex = restOfLine.indexOf(":");
              if (colonIndex > -1) {
                const key = restOfLine.substring(0, colonIndex).trim();
                const value = restOfLine.substring(colonIndex + 1).trim();
                item[key] = value;
              }
            }
          } else if (currentKey === "tags") {
            if (!currentArray) {
              currentArray = [];
              result[currentKey] = currentArray;
            }
            const value = trimmed.substring(2).trim();
            currentArray.push(value);
          }
        }
        // Handle key-value pairs
        else if (trimmed.includes(":")) {
          const colonIndex = trimmed.indexOf(":");
          const key = trimmed.substring(0, colonIndex).trim();
          let value = trimmed.substring(colonIndex + 1).trim();
          
          if (leadingSpaces === 0) {
            // Top-level property
            currentKey = key;
            currentArray = null;
            currentObject = null;
            
            if (value) {
              // Handle array format [item1, item2, item3]
              if (value.startsWith("[") && value.endsWith("]")) {
                const arrayContent = value.slice(1, -1);
                if (arrayContent.trim()) {
                  result[key] = arrayContent.split(",").map(item => item.trim());
                } else {
                  result[key] = [];
                }
                currentKey = null; // Reset since we handled the array
              } else {
                result[key] = value;
              }
            } else if (key === "items" || key === "tags") {
              // Will be populated by array items
              result[key] = [];
              currentArray = result[key];
            } else if (key === "display") {
              result[key] = {};
              currentObject = result[key];
            }
          } else if (currentObject && leadingSpaces > 0) {
            // Property of current object (e.g., display properties)
            currentObject[key] = value === "true" ? true : value === "false" ? false : value;
          } else if (currentArray && currentObject && leadingSpaces > 2) {
            // Property of array item object
            currentObject[key] = value;
          }
        }
      }
      
      return result;
    },
    filePath,
    null
  );
}

// Validation functions
function validateCollectionId(id) {
  if (!id || typeof id !== "string") {
    return "ID is required and must be a string";
  }
  if (!/^[a-z0-9-]+$/.test(id)) {
    return "ID must contain only lowercase letters, numbers, and hyphens";
  }
  if (id.length < 1 || id.length > 50) {
    return "ID must be between 1 and 50 characters";
  }
  return null;
}

function validateCollectionName(name) {
  if (!name || typeof name !== "string") {
    return "Name is required and must be a string";
  }
  if (name.length < 1 || name.length > 100) {
    return "Name must be between 1 and 100 characters";
  }
  return null;
}

function validateCollectionDescription(description) {
  if (!description || typeof description !== "string") {
    return "Description is required and must be a string";
  }
  if (description.length < 1 || description.length > 500) {
    return "Description must be between 1 and 500 characters";
  }
  return null;
}

function validateCollectionTags(tags) {
  if (tags && !Array.isArray(tags)) {
    return "Tags must be an array";
  }
  if (tags && tags.length > 10) {
    return "Maximum 10 tags allowed";
  }
  if (tags) {
    for (const tag of tags) {
      if (typeof tag !== "string") {
        return "All tags must be strings";
      }
      if (!/^[a-z0-9-]+$/.test(tag)) {
        return `Tag "${tag}" must contain only lowercase letters, numbers, and hyphens`;
      }
      if (tag.length < 1 || tag.length > 30) {
        return `Tag "${tag}" must be between 1 and 30 characters`;
      }
    }
  }
  return null;
}

function validateCollectionItems(items) {
  if (!items || !Array.isArray(items)) {
    return "Items is required and must be an array";
  }
  if (items.length < 1) {
    return "At least one item is required";
  }
  if (items.length > 50) {
    return "Maximum 50 items allowed";
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== "object") {
      return `Item ${i + 1} must be an object`;
    }
    if (!item.path || typeof item.path !== "string") {
      return `Item ${i + 1} must have a path string`;
    }
    if (!item.kind || typeof item.kind !== "string") {
      return `Item ${i + 1} must have a kind string`;
    }
    if (!["prompt", "instruction", "chat-mode"].includes(item.kind)) {
      return `Item ${i + 1} kind must be one of: prompt, instruction, chat-mode`;
    }
    
    // Validate file path exists
    const filePath = path.join(__dirname, item.path);
    if (!fs.existsSync(filePath)) {
      return `Item ${i + 1} file does not exist: ${item.path}`;
    }

    // Validate path pattern matches kind
    if (item.kind === "prompt" && !item.path.endsWith(".prompt.md")) {
      return `Item ${i + 1} kind is "prompt" but path doesn't end with .prompt.md`;
    }
    if (item.kind === "instruction" && !item.path.endsWith(".instructions.md")) {
      return `Item ${i + 1} kind is "instruction" but path doesn't end with .instructions.md`;
    }
    if (item.kind === "chat-mode" && !item.path.endsWith(".chatmode.md")) {
      return `Item ${i + 1} kind is "chat-mode" but path doesn't end with .chatmode.md`;
    }
  }
  return null;
}

function validateCollectionDisplay(display) {
  if (display && typeof display !== "object") {
    return "Display must be an object";
  }
  if (display) {
    if (display.ordering && !["manual", "alpha"].includes(display.ordering)) {
      return "Display ordering must be 'manual' or 'alpha'";
    }
    if (display.show_badge && typeof display.show_badge !== "boolean") {
      return "Display show_badge must be boolean";
    }
  }
  return null;
}

function validateCollectionManifest(collection, filePath) {
  const errors = [];

  const idError = validateCollectionId(collection.id);
  if (idError) errors.push(`ID: ${idError}`);

  const nameError = validateCollectionName(collection.name);
  if (nameError) errors.push(`Name: ${nameError}`);

  const descError = validateCollectionDescription(collection.description);
  if (descError) errors.push(`Description: ${descError}`);

  const tagsError = validateCollectionTags(collection.tags);
  if (tagsError) errors.push(`Tags: ${tagsError}`);

  const itemsError = validateCollectionItems(collection.items);
  if (itemsError) errors.push(`Items: ${itemsError}`);

  const displayError = validateCollectionDisplay(collection.display);
  if (displayError) errors.push(`Display: ${displayError}`);

  return errors;
}

// Main validation function
function validateCollections() {
  const collectionsDir = path.join(__dirname, "collections");
  
  if (!fs.existsSync(collectionsDir)) {
    console.log("No collections directory found - validation skipped");
    return true;
  }

  const collectionFiles = fs
    .readdirSync(collectionsDir)
    .filter((file) => file.endsWith(".collection.yml"));

  if (collectionFiles.length === 0) {
    console.log("No collection files found - validation skipped");
    return true;
  }

  console.log(`Validating ${collectionFiles.length} collection files...`);

  let hasErrors = false;
  const usedIds = new Set();

  for (const file of collectionFiles) {
    const filePath = path.join(collectionsDir, file);
    console.log(`\nValidating ${file}...`);
    
    const collection = parseCollectionYaml(filePath);
    if (!collection) {
      console.error(`❌ Failed to parse ${file}`);
      hasErrors = true;
      continue;
    }

    // Validate the collection structure
    const errors = validateCollectionManifest(collection, filePath);
    
    if (errors.length > 0) {
      console.error(`❌ Validation errors in ${file}:`);
      errors.forEach(error => console.error(`   - ${error}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${file} is valid`);
    }

    // Check for duplicate IDs
    if (collection.id) {
      if (usedIds.has(collection.id)) {
        console.error(`❌ Duplicate collection ID "${collection.id}" found in ${file}`);
        hasErrors = true;
      } else {
        usedIds.add(collection.id);
      }
    }
  }

  if (!hasErrors) {
    console.log(`\n✅ All ${collectionFiles.length} collections are valid`);
  }

  return !hasErrors;
}

// Run validation
try {
  const isValid = validateCollections();
  if (!isValid) {
    console.error("\n❌ Collection validation failed");
    process.exit(1);
  }
  console.log("\n🎉 Collection validation passed");
} catch (error) {
  console.error(`Error during validation: ${error.message}`);
  process.exit(1);
}