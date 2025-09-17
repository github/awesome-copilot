#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseCollectionYaml } = require("./yaml-parser");

// Maximum number of items allowed in a collection
const MAX_COLLECTION_ITEMS = 50;
function safeFileOperation(operation, filePath, defaultValue = null) {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
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
  if (items.length > MAX_COLLECTION_ITEMS) {
    return `Maximum ${MAX_COLLECTION_ITEMS} items allowed`;
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
    // Normalize ordering and show_badge in case the YAML parser left inline comments
    const normalize = (val) => {
      if (typeof val !== 'string') return val;
      // Strip any inline comment starting with '#'
      const hashIndex = val.indexOf('#');
      if (hashIndex !== -1) {
        val = val.substring(0, hashIndex).trim();
      }
      // Also strip surrounding quotes if present
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      return val.trim();
    };

    if (display.ordering) {
      const normalizedOrdering = normalize(display.ordering);
      if (!["manual", "alpha"].includes(normalizedOrdering)) {
        return "Display ordering must be 'manual' or 'alpha'";
      }
    }

    if (display.show_badge !== undefined) {
      const raw = display.show_badge;
      const normalizedBadge = normalize(raw);
      // Accept boolean or string boolean values
      if (typeof normalizedBadge === 'string') {
        if (!['true', 'false'].includes(normalizedBadge.toLowerCase())) {
          return "Display show_badge must be boolean";
        }
      } else if (typeof normalizedBadge !== 'boolean') {
        return "Display show_badge must be boolean";
      }
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
