#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { SKILLS_DIR } from "./constants.mjs";

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
  const out = { name: undefined, description: undefined };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--name" || a === "-n") {
      out.name = args[i + 1];
      i++;
    } else if (a.startsWith("--name=")) {
      out.name = a.split("=")[1];
    } else if (a === "--description" || a === "-d") {
      out.description = args[i + 1];
      i++;
    } else if (a.startsWith("--description=")) {
      out.description = a.split("=")[1];
    } else if (!a.startsWith("-") && !out.name) {
      out.name = a;
    }
  }

  return out;
}

async function createSkillTemplate() {
  try {
    console.log("🎯 Agent Skills Creator");
    console.log(
      "This tool will help you create a new skill following the Agent Skills specification.\n"
    );

    const parsed = parseArgs();

    // Get skill name
    let skillName = parsed.name;
    if (!skillName) {
      skillName = await prompt("Skill name (lowercase, hyphens only): ");
    }

    // Validate skill name format
    if (!skillName) {
      console.error("❌ Skill name is required");
      process.exit(1);
    }

    if (!/^[a-z0-9-]+$/.test(skillName)) {
      console.error(
        "❌ Skill name must contain only lowercase letters, numbers, and hyphens"
      );
      process.exit(1);
    }

    const skillFolder = path.join(SKILLS_DIR, skillName);

    // Check if folder already exists
    if (fs.existsSync(skillFolder)) {
      console.log(`⚠️  Skill folder ${skillName} already exists at ${skillFolder}`);
      console.log("💡 Please choose a different name or edit the existing skill.");
      process.exit(1);
    }

    // Get description
    let description = parsed.description;
    if (!description) {
      description = await prompt(
        "Description (what this skill does and when to use it): "
      );
    }

    if (!description || description.trim().length < 10) {
      console.error(
        "❌ Description is required and must be at least 10 characters (max 1024)"
      );
      process.exit(1);
    }

    // Get skill title (display name)
    const defaultTitle = skillName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    let skillTitle = await prompt(`Skill title (default: ${defaultTitle}): `);
    if (!skillTitle.trim()) {
      skillTitle = defaultTitle;
    }

    // Create skill folder
    fs.mkdirSync(skillFolder, { recursive: true });

    // Create SKILL.md template
    const skillMdContent = `---
name: ${skillName}
description: ${description}
---

# ${skillTitle}

This skill provides [brief overview of what this skill does].

## When to Use This Skill

Use this skill when you need to:
- [Primary use case]
- [Secondary use case]
- [Additional use case]

## Prerequisites

- [Required tool/environment]
- [Optional dependency]

## Core Capabilities

### 1. [Capability Name]
[Description of what this capability does]

### 2. [Capability Name]
[Description of what this capability does]

## Usage Examples

### Example 1: [Use Case]
\`\`\`[language]
// Example code or instructions
\`\`\`

### Example 2: [Use Case]
\`\`\`[language]
// Example code or instructions
\`\`\`

## Guidelines

1. **[Guideline 1]** - [Explanation]
2. **[Guideline 2]** - [Explanation]
3. **[Guideline 3]** - [Explanation]

## Common Patterns

### Pattern: [Pattern Name]
\`\`\`[language]
// Example pattern
\`\`\`

### Pattern: [Pattern Name]
\`\`\`[language]
// Example pattern
\`\`\`

## Limitations

- [Limitation 1]
- [Limitation 2]
- [Limitation 3]
`;

    const skillFilePath = path.join(skillFolder, "SKILL.md");
    fs.writeFileSync(skillFilePath, skillMdContent);

    console.log(`\n✅ Created skill folder: ${skillFolder}`);
    console.log(`✅ Created SKILL.md: ${skillFilePath}`);

    // Ask if they want to add bundled assets
    const addAssets = await prompt(
      "\nWould you like to add bundled assets? (helper scripts, templates, etc.) [y/N]: "
    );

    if (addAssets.toLowerCase() === "y" || addAssets.toLowerCase() === "yes") {
      console.log(
        "\n📁 You can now add files to the skill folder manually or using your editor."
      );
      console.log(
        "   Common bundled assets: helper scripts, code templates, reference data"
      );
      console.log(`   Skill folder location: ${skillFolder}`);
    }

    console.log("\n📝 Next steps:");
    console.log("1. Edit SKILL.md to complete the skill instructions");
    console.log("2. Add any bundled assets (scripts, templates, data) to the skill folder");
    console.log("3. Run 'npm run skill:validate' to validate the skill");
    console.log("4. Run 'npm run build' to generate documentation");

    console.log("\n📖 Resources:");
    console.log(
      "   - Anthropic Skills Spec: https://agentskills.io/specification"
    );
    console.log(
      "   - Project Documentation: AGENTS.md (section on Agent Skills)"
    );
  } catch (error) {
    console.error(`❌ Error creating skill template: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the interactive creation process
createSkillTemplate();
