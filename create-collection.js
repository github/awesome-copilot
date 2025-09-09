#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function createCollectionTemplate(collectionId) {
  if (!collectionId) {
    console.error("Collection ID is required");
    console.log("Usage: node create-collection.js <collection-id>");
    process.exit(1);
  }

  // Validate collection ID format
  if (!/^[a-z0-9-]+$/.test(collectionId)) {
    console.error("Collection ID must contain only lowercase letters, numbers, and hyphens");
    process.exit(1);
  }

  const collectionsDir = path.join(__dirname, "collections");
  const filePath = path.join(collectionsDir, `${collectionId}.collection.yml`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.error(`Collection ${collectionId} already exists at ${filePath}`);
    process.exit(1);
  }

  // Ensure collections directory exists
  if (!fs.existsSync(collectionsDir)) {
    fs.mkdirSync(collectionsDir, { recursive: true });
  }

  // Create a friendly name from the ID
  const friendlyName = collectionId
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Template content
  const template = `id: ${collectionId}
name: ${friendlyName}
description: A collection of related prompts, instructions, and chat modes for ${friendlyName.toLowerCase()}.
tags: [${collectionId.split("-").slice(0, 3).join(", ")}] # Add relevant tags
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

  try {
    fs.writeFileSync(filePath, template);
    console.log(`✅ Created collection template: ${filePath}`);
    console.log("\nNext steps:");
    console.log("1. Edit the collection manifest to add your items");
    console.log("2. Update the name, description, and tags as needed");
    console.log("3. Run 'node validate-collections.js' to validate");
    console.log("4. Run 'node update-readme.js' to generate documentation");
    console.log("\nCollection template contents:");
    console.log(template);
  } catch (error) {
    console.error(`Error creating collection template: ${error.message}`);
    process.exit(1);
  }
}

// Get collection ID from command line arguments
const collectionId = process.argv[2];
createCollectionTemplate(collectionId);