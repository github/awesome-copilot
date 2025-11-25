#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { COLLECTIONS_DIR } from "./constants.mjs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { id: undefined, tags: undefined };

  // simple long/short option parsing
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--id" || a === "-i") {
      out.id = args[i + 1];
      i++;
    } else if (a.startsWith("--id=")) {
      out.id = a.split("=")[1];
    } else if (a === "--tags" || a === "-t") {
      out.tags = args[i + 1];
      i++;
    } else if (a.startsWith("--tags=")) {
      out.tags = a.split("=")[1];
    } else if (!a.startsWith("-") && !out.id) {
      // first positional -> id
      out.id = a;
    } else if (!a.startsWith("-") && out.id && !out.tags) {
      // second positional -> tags
      out.tags = a;
    }
  }

  // normalize tags to string (comma separated) or undefined
  if (Array.isArray(out.tags)) {
    out.tags = out.tags.join(",");
  }

  return out;
}

async function createCollectionTemplate() {
  try {
    console.log("🎯 Collection Creator");
    console.log("This tool will help you create a new collection manifest.\n");

    // Parse CLI args and fall back to interactive prompts when missing
    const parsed = parseArgs();
    // Get collection ID
    let collectionId = parsed.id;
    if (!collectionId) {
      collectionId = await prompt("Collection ID (lowercase, hyphens only): ");
    }

    // Validate collection ID format
    if (!collectionId) {
      console.error("❌ Collection ID is required");
      process.exit(1);
    }

    if (!/^[a-z0-9-]+$/.test(collectionId)) {
      console.error(
        "❌ Collection ID must contain only lowercase letters, numbers, and hyphens"
      );
      process.exit(1);
    }

    const filePath = path.join(
      COLLECTIONS_DIR,
      `${collectionId}.collection.yml`
    );

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(
        `⚠️  Collection ${collectionId} already exists at ${filePath}`
      );
      console.log("💡 Please edit that file instead or choose a different ID.");
      process.exit(1);
    }

    // Ensure collections directory exists
    if (!fs.existsSync(COLLECTIONS_DIR)) {
      fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
    }

    // Get collection name
    const defaultName = collectionId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    let collectionName = await prompt(
      `Collection name (default: ${defaultName}): `
    );
    if (!collectionName.trim()) {
      collectionName = defaultName;
    }

    // Get description
    const defaultDescription = `A collection of related prompts, instructions, and agents for ${collectionName.toLowerCase()}.`;
    let description = await prompt(
      `Description (default: ${defaultDescription}): `
    );
    if (!description.trim()) {
      description = defaultDescription;
    }

    // Get tags (from CLI or prompt)
    let tags = [];
    let tagInput = parsed.tags;
    if (!tagInput) {
      tagInput = await prompt(
        "Tags (comma-separated, or press Enter for defaults): "
      );
    }

    if (tagInput && tagInput.toString().trim()) {
      tags = tagInput
        .toString()
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
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
  # - path: agents/example.agent.md
  #   kind: agent
    # - path: agents/example.agent.md
    #   kind: agent
    #   usage: |
    #     This agent requires the example MCP server to be installed.
    #     Configure any required environment variables (e.g., EXAMPLE_API_KEY).
display:
  ordering: alpha # or "manual" to preserve the order above
  show_badge: false # set to true to show collection badge on items
`;

    fs.writeFileSync(filePath, template);
    console.log(`✅ Created collection template: ${filePath}`);
    console.log("\n📝 Next steps:");
    console.log("1. Edit the collection manifest to add your items");
    console.log("2. Update the name, description, and tags as needed");
    console.log("3. Run 'npm run collection:validate' to validate");
    console.log("4. Run 'npm start' to generate documentation");
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
