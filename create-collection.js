#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createCollectionTemplate() {
  try {
    console.log("🎯 Collection Creator");
    console.log("This tool will help you create a new collection manifest.\n");

    // Get collection ID
    let collectionId;
    if (process.argv[2]) {
      collectionId = process.argv[2];
    } else {
      collectionId = await prompt("Collection ID (lowercase, hyphens only): ");
    }

    // Validate collection ID format
    if (!collectionId) {
      console.error("❌ Collection ID is required");
      process.exit(1);
    }

    if (!/^[a-z0-9-]+$/.test(collectionId)) {
      console.error("❌ Collection ID must contain only lowercase letters, numbers, and hyphens");
      process.exit(1);
    }

    const collectionsDir = path.join(__dirname, "collections");
    const filePath = path.join(collectionsDir, `${collectionId}.collection.yml`);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⚠️  Collection ${collectionId} already exists at ${filePath}`);
      console.log("💡 Please edit that file instead or choose a different ID.");
      process.exit(1);
    }

    // Ensure collections directory exists
    if (!fs.existsSync(collectionsDir)) {
      fs.mkdirSync(collectionsDir, { recursive: true });
    }

    // Get collection name
    const defaultName = collectionId
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    let collectionName = await prompt(`Collection name (default: ${defaultName}): `);
    if (!collectionName.trim()) {
      collectionName = defaultName;
    }

    // Get description
    const defaultDescription = `A collection of related prompts, instructions, and chat modes for ${collectionName.toLowerCase()}.`;
    let description = await prompt(`Description (default: ${defaultDescription}): `);
    if (!description.trim()) {
      description = defaultDescription;
    }

    // Get tags
    let tags = [];
    const tagInput = await prompt("Tags (comma-separated, or press Enter for defaults): ");
    if (tagInput.trim()) {
      tags = tagInput.split(",").map(tag => tag.trim()).filter(tag => tag);
    } else {
      // Generate some default tags from the collection ID
      tags = collectionId.split("-").slice(0, 3);
    }

    // Template content
    const template = `id: ${collectionId}
name: ${collectionName}
description: ${description}
tags: [${tags.join(", ")}]
items:
  # Add your collection items here
  # Example:
  # - path: prompts/example.prompt.md
  #   kind: prompt
  # - path: instructions/example.instructions.md
  #   kind: instruction
  # - path: chatmodes/example.chatmode.md
  #   kind: chat-mode
display:
  ordering: alpha # or "manual" to preserve the order above
  show_badge: false # set to true to show collection badge on items
`;

    fs.writeFileSync(filePath, template);
    console.log(`✅ Created collection template: ${filePath}`);
    console.log("\n📝 Next steps:");
    console.log("1. Edit the collection manifest to add your items");
    console.log("2. Update the name, description, and tags as needed");
    console.log("3. Run 'node validate-collections.js' to validate");
    console.log("4. Run 'node update-readme.js' to generate documentation");
    console.log("\n📄 Collection template contents:");
    console.log(template);

  } catch (error) {
    console.error(`❌ Error creating collection template: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the interactive creation process
createCollectionTemplate();