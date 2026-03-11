#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { ROOT_FOLDER } from "./constants.mjs";

const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");

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
  const out = { name: undefined, keywords: undefined };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--name" || a === "-n") {
      out.name = args[i + 1];
      i++;
    } else if (a.startsWith("--name=")) {
      out.name = a.split("=")[1];
    } else if (a === "--keywords" || a === "--tags" || a === "-t") {
      out.keywords = args[i + 1];
      i++;
    } else if (a.startsWith("--keywords=") || a.startsWith("--tags=")) {
      out.keywords = a.split("=")[1];
    } else if (!a.startsWith("-") && !out.name) {
      // first positional -> name
      out.name = a;
    } else if (!a.startsWith("-") && out.name && !out.keywords) {
      // second positional -> keywords
      out.keywords = a;
    }
  }

  if (Array.isArray(out.keywords)) {
    out.keywords = out.keywords.join(",");
  }

  return out;
}

async function createPlugin() {
  try {
    console.log("🔌 Plugin Creator");
    console.log("This tool will help you create a new plugin.\n");

    const parsed = parseArgs();

    // Get plugin ID
    let pluginId = parsed.name;
    if (!pluginId) {
      pluginId = await prompt("Plugin ID (lowercase, hyphens only): ");
    }

    if (!pluginId) {
      console.error("❌ Plugin ID is required");
      process.exit(1);
    }

    if (!/^[a-z0-9-]+$/.test(pluginId)) {
      console.error(
        "❌ Plugin ID must contain only lowercase letters, numbers, and hyphens"
      );
      process.exit(1);
    }

    const pluginDir = path.join(PLUGINS_DIR, pluginId);

    // Check if plugin already exists
    if (fs.existsSync(pluginDir)) {
      console.log(
        `⚠️  Plugin ${pluginId} already exists at ${pluginDir}`
      );
      console.log("💡 Please edit that plugin instead or choose a different ID.");
      process.exit(1);
    }

    // Get display name
    const defaultDisplayName = pluginId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    let displayName = await prompt(
      `Display name (default: ${defaultDisplayName}): `
    );
    if (!displayName.trim()) {
      displayName = defaultDisplayName;
    }

    // Get description
    const defaultDescription = `A plugin for ${displayName.toLowerCase()}.`;
    let description = await prompt(
      `Description (default: ${defaultDescription}): `
    );
    if (!description.trim()) {
      description = defaultDescription;
    }

    // Get keywords
    let keywords = [];
    let keywordInput = parsed.keywords;
    if (!keywordInput) {
      keywordInput = await prompt(
        "Keywords (comma-separated, or press Enter for defaults): "
      );
    }

    if (keywordInput && keywordInput.toString().trim()) {
      keywords = keywordInput
        .toString()
        .split(",")
        .map((kw) => kw.trim())
        .filter((kw) => kw);
    } else {
      keywords = pluginId.split("-").slice(0, 3);
    }

    // Create directory structure
    const githubPluginDir = path.join(pluginDir, ".github", "plugin");
    fs.mkdirSync(githubPluginDir, { recursive: true });

    // Generate plugin.json
    const pluginJson = {
      name: pluginId,
      description,
      version: "1.0.0",
      keywords,
      author: { name: "Awesome Copilot Community" },
      repository: "https://github.com/github/awesome-copilot",
      license: "MIT",
    };

    fs.writeFileSync(
      path.join(githubPluginDir, "plugin.json"),
      JSON.stringify(pluginJson, null, 2) + "\n"
    );

    // Generate README.md
    const readmeContent = `# ${displayName} Plugin

${description}

## Installation

\`\`\`bash
copilot plugin install ${pluginId}@awesome-copilot
\`\`\`

## What's Included

_Add your plugin contents here._

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
`;

    fs.writeFileSync(path.join(pluginDir, "README.md"), readmeContent);

    console.log(`\n✅ Created plugin: ${pluginDir}`);
    console.log("\n📝 Next steps:");
    console.log(`1. Add agents, prompts, or instructions to plugins/${pluginId}/`);
    console.log(`2. Update plugins/${pluginId}/.github/plugin/plugin.json with your metadata`);
    console.log(`3. Edit plugins/${pluginId}/README.md to describe your plugin`);
    console.log("4. Run 'npm run build' to regenerate documentation");
  } catch (error) {
    console.error(`❌ Error creating plugin: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createPlugin();
