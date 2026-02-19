#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ROOT_FOLDER, PROMPTS_DIR, SKILLS_DIR } from "./constants.mjs";
import { parseFrontmatter } from "./yaml-parser.mjs";

/**
 * Convert a prompt file to a skill folder
 * @param {string} promptFilePath - Full path to the prompt file
 * @returns {object} Result with success status and details
 */
function convertPromptToSkill(promptFilePath) {
  const filename = path.basename(promptFilePath);
  const baseName = filename.replace(".prompt.md", "");
  
  console.log(`\nConverting: ${baseName}`);

  // Parse the prompt file frontmatter
  const frontmatter = parseFrontmatter(promptFilePath);
  const content = fs.readFileSync(promptFilePath, "utf8");

  // Extract the content after frontmatter
  const frontmatterEndMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  const mainContent = frontmatterEndMatch
    ? content.substring(frontmatterEndMatch[0].length).trim()
    : content.trim();

  // Create skill folder
  const skillFolderPath = path.join(SKILLS_DIR, baseName);
  if (fs.existsSync(skillFolderPath)) {
    console.log(`  ⚠️  Skill folder already exists: ${baseName}`);
    return { success: false, reason: "already-exists", name: baseName };
  }

  fs.mkdirSync(skillFolderPath, { recursive: true });

  // Build new frontmatter for SKILL.md
  const skillFrontmatter = {
    name: baseName,
    description: frontmatter?.description || `Skill converted from ${filename}`,
  };

  // Build SKILL.md content
  const skillContent = `---
name: ${skillFrontmatter.name}
description: '${skillFrontmatter.description.replace(/'/g, "'\\''")}'
---

${mainContent}
`;

  // Write SKILL.md
  const skillFilePath = path.join(skillFolderPath, "SKILL.md");
  fs.writeFileSync(skillFilePath, skillContent, "utf8");

  console.log(`  ✓ Created skill: ${baseName}`);
  return { success: true, name: baseName, path: skillFolderPath };
}

/**
 * Main migration function
 */
function main() {
  console.log("=".repeat(60));
  console.log("Starting Prompt to Skills Migration");
  console.log("=".repeat(60));

  // Check if prompts directory exists
  if (!fs.existsSync(PROMPTS_DIR)) {
    console.error(`Error: Prompts directory not found: ${PROMPTS_DIR}`);
    process.exit(1);
  }

  // Get all prompt files
  const promptFiles = fs
    .readdirSync(PROMPTS_DIR)
    .filter((file) => file.endsWith(".prompt.md"))
    .map((file) => path.join(PROMPTS_DIR, file));

  console.log(`Found ${promptFiles.length} prompt files to convert\n`);

  const results = {
    success: [],
    alreadyExists: [],
    failed: [],
  };

  // Convert each prompt
  for (const promptFile of promptFiles) {
    try {
      const result = convertPromptToSkill(promptFile);
      if (result.success) {
        results.success.push(result.name);
      } else if (result.reason === "already-exists") {
        results.alreadyExists.push(result.name);
      } else {
        results.failed.push(result.name);
      }
    } catch (error) {
      const baseName = path.basename(promptFile, ".prompt.md");
      console.error(`  ✗ Error converting ${baseName}: ${error.message}`);
      results.failed.push(baseName);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`✓ Successfully converted: ${results.success.length}`);
  console.log(`⚠ Already existed: ${results.alreadyExists.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`Total processed: ${promptFiles.length}`);

  if (results.failed.length > 0) {
    console.log("\nFailed conversions:");
    results.failed.forEach((name) => console.log(`  - ${name}`));
  }

  if (results.alreadyExists.length > 0) {
    console.log("\nSkipped (already exist):");
    results.alreadyExists.forEach((name) => console.log(`  - ${name}`));
  }

  console.log("\n✅ Migration complete!");
  console.log(
    "\nNext steps:\n" +
      "1. Run 'npm run skill:validate' to validate all new skills\n" +
      "2. Update plugin manifests to reference skills instead of commands\n" +
      "3. Remove prompts directory after testing\n"
  );
}

// Run migration
main();
