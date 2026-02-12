#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { COLLECTIONS_DIR, ROOT_FOLDER } from "./constants.mjs";
import {
  parseCollectionYaml,
  parseFrontmatter,
  parseHookMetadata,
} from "./yaml-parser.mjs";

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
  const out = { collection: undefined, mode: "migrate", all: false };

  // Check for mode from environment variable (set by npm scripts)
  if (process.env.PLUGIN_MODE === "refresh") {
    out.mode = "refresh";
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--collection" || a === "-c") {
      out.collection = args[i + 1];
      i++;
    } else if (a.startsWith("--collection=")) {
      out.collection = a.split("=")[1];
    } else if (a === "--refresh" || a === "-r") {
      out.mode = "refresh";
    } else if (a === "--migrate" || a === "-m") {
      out.mode = "migrate";
    } else if (a === "--all" || a === "-a") {
      out.all = true;
    } else if (!a.startsWith("-") && !out.collection) {
      out.collection = a;
    }
  }

  return out;
}

/**
 * List available collections
 */
function listCollections() {
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(COLLECTIONS_DIR)
    .filter((file) => file.endsWith(".collection.yml"))
    .map((file) => file.replace(".collection.yml", ""));
}

/**
 * List existing plugins that have a corresponding collection
 */
function listExistingPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    return [];
  }

  const collections = listCollections();
  const plugins = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  // Return only plugins that have a matching collection
  return plugins.filter((plugin) => collections.includes(plugin));
}

/**
 * Create a symlink from destPath pointing to srcPath
 * Uses relative paths for portability
 */
function createSymlink(srcPath, destPath) {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Calculate relative path from dest to src
  const relativePath = path.relative(destDir, srcPath);

  // Remove existing file/symlink if present
  try {
    const stats = fs.lstatSync(destPath);
    if (stats) {
      fs.unlinkSync(destPath);
    }
  } catch {
    // File doesn't exist, which is fine
  }

  fs.symlinkSync(relativePath, destPath);
}

/**
 * Create a symlink to a directory
 */
function symlinkDirectory(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    return;
  }

  const parentDir = path.dirname(destDir);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Calculate relative path from dest to src
  const relativePath = path.relative(parentDir, srcDir);

  // Remove existing directory/symlink if present
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }

  fs.symlinkSync(relativePath, destDir);
}

/**
 * Generate plugin.json content
 */
function generatePluginJson(collection) {
  return {
    name: collection.id,
    description: collection.description,
    version: "1.0.0",
    author: {
      name: "Awesome Copilot Community",
    },
    repository: "https://github.com/github/awesome-copilot",
    license: "MIT",
  };
}

/**
 * Get the base name without extension for display
 */
function getDisplayName(filePath, kind) {
  const basename = path.basename(filePath);
  if (kind === "prompt") {
    return basename.replace(".prompt.md", "");
  } else if (kind === "agent") {
    return basename.replace(".agent.md", "");
  } else if (kind === "instruction") {
    return basename.replace(".instructions.md", "");
  } else if (kind === "hook") {
    // For folder-based hooks like hooks/<hook>/README.md, use the folder name.
    if (basename.toLowerCase() === "readme.md") {
      return path.basename(path.dirname(filePath));
    }
    return basename.replace(".hook.md", "");
  } else if (kind === "skill") {
    return path.basename(filePath);
  }
  return basename;
}

/**
 * Generate README.md content for the plugin
 */
function generateReadme(collection, items) {
  const lines = [];

  // Title from collection name
  const title = collection.name || collection.id;
  lines.push(`# ${title} Plugin`);
  lines.push("");
  lines.push(collection.description);
  lines.push("");

  // Installation section
  lines.push("## Installation");
  lines.push("");
  lines.push("```bash");
  lines.push("# Using Copilot CLI");
  lines.push(`copilot plugin install ${collection.id}@awesome-copilot`);
  lines.push("```");
  lines.push("");

  lines.push("## What's Included");
  lines.push("");

  // Commands (prompts)
  const prompts = items.filter((item) => item.kind === "prompt");
  if (prompts.length > 0) {
    lines.push("### Commands (Slash Commands)");
    lines.push("");
    lines.push("| Command | Description |");
    lines.push("|---------|-------------|");
    for (const item of prompts) {
      const name = getDisplayName(item.path, "prompt");
      const description =
        item.frontmatter?.description || item.frontmatter?.title || name;
      lines.push(`| \`/${collection.id}:${name}\` | ${description} |`);
    }
    lines.push("");
  }

  // Agents
  const agents = items.filter((item) => item.kind === "agent");
  if (agents.length > 0) {
    lines.push("### Agents");
    lines.push("");
    lines.push("| Agent | Description |");
    lines.push("|-------|-------------|");
    for (const item of agents) {
      const name = getDisplayName(item.path, "agent");
      const description =
        item.frontmatter?.description || item.frontmatter?.name || name;
      lines.push(`| \`${name}\` | ${description} |`);
    }
    lines.push("");
  }

  // Hooks
  const hooks = items.filter((item) => item.kind === "hook");
  if (hooks.length > 0) {
    lines.push("### Hooks");
    lines.push("");
    lines.push("| Hook | Description | Event |");
    lines.push("|------|-------------|-------|");
    for (const item of hooks) {
      const name = getDisplayName(item.path, "hook");
      const description =
        item.frontmatter?.description || item.frontmatter?.name || name;
      // Extract events from hooks.json rather than frontmatter
      const hookFolderPath = path.join(ROOT_FOLDER, path.dirname(item.path));
      const hookMeta = parseHookMetadata(hookFolderPath);
      const event =
        hookMeta?.hooks?.length > 0 ? hookMeta.hooks.join(", ") : "N/A";
      lines.push(`| \`${name}\` | ${description} | ${event} |`);
    }
    lines.push("");
  }

  // Skills
  const skills = items.filter((item) => item.kind === "skill");
  if (skills.length > 0) {
    lines.push("### Skills");
    lines.push("");
    lines.push("| Skill | Description |");
    lines.push("|-------|-------------|");
    for (const item of skills) {
      const name = getDisplayName(item.path, "skill");
      const description = item.frontmatter?.description || name;
      lines.push(`| \`${name}\` | ${description} |`);
    }
    lines.push("");
  }

  // Source
  lines.push("## Source");
  lines.push("");
  lines.push(
    "This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions."
  );
  lines.push("");
  lines.push("## License");
  lines.push("");
  lines.push("MIT");

  return lines.join("\n");
}

/**
 * Convert a collection to a plugin
 * @param {string} collectionId - The collection ID
 * @param {string} mode - "migrate" for first-time creation, "refresh" for updating existing
 * @param {boolean} silent - If true, return false instead of exiting on errors (for batch mode)
 * @returns {boolean} - True if successful
 */
function convertCollectionToPlugin(
  collectionId,
  mode = "migrate",
  silent = false
) {
  const collectionFile = path.join(
    COLLECTIONS_DIR,
    `${collectionId}.collection.yml`
  );

  if (!fs.existsSync(collectionFile)) {
    if (silent) {
      console.warn(`⚠️  Collection file not found: ${collectionId}`);
      return false;
    }
    console.error(`❌ Collection file not found: ${collectionFile}`);
    process.exit(1);
  }

  const collection = parseCollectionYaml(collectionFile);
  if (!collection) {
    if (silent) {
      console.warn(`⚠️  Failed to parse collection: ${collectionId}`);
      return false;
    }
    console.error(`❌ Failed to parse collection: ${collectionFile}`);
    process.exit(1);
  }

  const pluginDir = path.join(PLUGINS_DIR, collectionId);
  const pluginExists = fs.existsSync(pluginDir);

  if (mode === "migrate") {
    // Migrate mode: fail if plugin already exists
    if (pluginExists) {
      if (silent) {
        console.warn(`⚠️  Plugin already exists: ${collectionId}`);
        return false;
      }
      console.error(`❌ Plugin already exists: ${pluginDir}`);
      console.log(
        "💡 Use 'npm run plugin:refresh' to update an existing plugin."
      );
      process.exit(1);
    }
    console.log(`\n📦 Migrating collection "${collectionId}" to plugin...`);
  } else {
    // Refresh mode: fail if plugin doesn't exist
    if (!pluginExists) {
      if (silent) {
        console.warn(`⚠️  Plugin does not exist: ${collectionId}`);
        return false;
      }
      console.error(`❌ Plugin does not exist: ${pluginDir}`);
      console.log(
        "💡 Use 'npm run plugin:migrate' to create a new plugin first."
      );
      process.exit(1);
    }
    console.log(`\n🔄 Refreshing plugin "${collectionId}" from collection...`);
    // Remove existing plugin directory for refresh
    fs.rmSync(pluginDir, { recursive: true });
  }

  // Create plugin directory structure
  fs.mkdirSync(path.join(pluginDir, ".github", "plugin"), { recursive: true });

  // Process items and collect metadata
  const processedItems = [];
  const stats = { prompts: 0, agents: 0, instructions: 0, skills: 0 };

  for (const item of collection.items || []) {
    const srcPath = path.join(ROOT_FOLDER, item.path);

    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  Source file not found, skipping: ${item.path}`);
      continue;
    }

    let destPath;
    let frontmatter = null;

    switch (item.kind) {
      case "prompt":
        // Prompts go to commands/ with .md extension
        const promptName = path
          .basename(item.path)
          .replace(".prompt.md", ".md");
        destPath = path.join(pluginDir, "commands", promptName);
        frontmatter = parseFrontmatter(srcPath);
        stats.prompts++;
        break;

      case "agent":
        // Agents go to agents/ with .md extension
        const agentName = path.basename(item.path).replace(".agent.md", ".md");
        destPath = path.join(pluginDir, "agents", agentName);
        frontmatter = parseFrontmatter(srcPath);
        stats.agents++;
        break;

      case "instruction":
        // Instructions are not supported in plugins - track for summary
        stats.instructions++;
        continue;

      case "skill":
        // Skills are folders - path can be either the folder or the SKILL.md file
        let skillSrcDir = srcPath;
        let skillMdPath;

        // If path points to SKILL.md, use parent directory as the skill folder
        if (item.path.endsWith("SKILL.md")) {
          skillSrcDir = path.dirname(srcPath);
          skillMdPath = srcPath;
        } else {
          skillMdPath = path.join(srcPath, "SKILL.md");
        }

        const skillName = path.basename(skillSrcDir);
        destPath = path.join(pluginDir, "skills", skillName);

        // Verify the source is a directory
        if (!fs.statSync(skillSrcDir).isDirectory()) {
          console.warn(
            `⚠️  Skill path is not a directory, skipping: ${item.path}`
          );
          continue;
        }

        symlinkDirectory(skillSrcDir, destPath);

        // Try to get SKILL.md frontmatter
        if (fs.existsSync(skillMdPath)) {
          frontmatter = parseFrontmatter(skillMdPath);
        }
        stats.skills++;
        processedItems.push({ ...item, frontmatter });
        continue; // Already linked

      default:
        console.warn(
          `⚠️  Unknown item kind "${item.kind}", skipping: ${item.path}`
        );
        continue;
    }

    // Create symlink to the source file
    createSymlink(srcPath, destPath);
    processedItems.push({ ...item, frontmatter });
  }

  // Generate plugin.json
  const pluginJson = generatePluginJson(collection);
  fs.writeFileSync(
    path.join(pluginDir, ".github", "plugin", "plugin.json"),
    JSON.stringify(pluginJson, null, 2) + "\n"
  );

  // Generate README.md
  const readme = generateReadme(collection, processedItems);
  fs.writeFileSync(path.join(pluginDir, "README.md"), readme + "\n");

  // Print summary
  console.log(`\n✅ Plugin created: ${pluginDir}`);
  console.log("\n📊 Summary:");
  if (stats.prompts > 0)
    console.log(`   - Commands (prompts): ${stats.prompts}`);
  if (stats.agents > 0) console.log(`   - Agents: ${stats.agents}`);
  if (stats.skills > 0) console.log(`   - Skills: ${stats.skills}`);

  console.log("\n📁 Generated files:");
  console.log(
    `   - ${path.join(pluginDir, ".github", "plugin", "plugin.json")}`
  );
  console.log(`   - ${path.join(pluginDir, "README.md")}`);
  if (stats.prompts > 0)
    console.log(`   - ${path.join(pluginDir, "commands", "*.md")}`);
  if (stats.agents > 0)
    console.log(`   - ${path.join(pluginDir, "agents", "*.md")}`);
  if (stats.skills > 0)
    console.log(`   - ${path.join(pluginDir, "skills", "*")}`);

  // Note about excluded instructions
  if (stats.instructions > 0) {
    console.log(
      `\n📋 Note: ${stats.instructions} instruction${
        stats.instructions > 1 ? "s" : ""
      } excluded (not supported in plugins)`
    );
  }
  return true;
}

async function main() {
  try {
    const parsed = parseArgs();
    const isRefresh = parsed.mode === "refresh";

    console.log(isRefresh ? "🔄 Plugin Refresh" : "📦 Plugin Migration");
    console.log(
      isRefresh
        ? "This tool refreshes an existing plugin from its collection.\n"
        : "This tool migrates a collection to a new plugin.\n"
    );

    // Handle --all flag (only valid for refresh mode)
    if (parsed.all) {
      if (!isRefresh) {
        console.error("❌ The --all flag is only valid with plugin:refresh");
        process.exit(1);
      }

      const existingPlugins = listExistingPlugins();
      if (existingPlugins.length === 0) {
        console.log("No existing plugins with matching collections found.");
        process.exit(0);
      }

      console.log(`Found ${existingPlugins.length} plugins to refresh:\n`);

      let successCount = 0;
      let failCount = 0;

      for (const pluginId of existingPlugins) {
        const success = convertCollectionToPlugin(pluginId, "refresh", true);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      console.log(`\n${"=".repeat(50)}`);
      console.log(`✅ Refreshed: ${successCount} plugins`);
      if (failCount > 0) {
        console.log(`⚠️  Failed: ${failCount} plugins`);
      }
      return;
    }

    let collectionId = parsed.collection;
    if (!collectionId) {
      // List available collections
      const collections = listCollections();
      if (collections.length === 0) {
        console.error("❌ No collections found in collections directory");
        process.exit(1);
      }

      console.log("Available collections:");
      collections.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      console.log("");

      collectionId = await prompt(
        "Enter collection ID (or number from list): "
      );

      // Check if user entered a number
      const num = parseInt(collectionId, 10);
      if (!isNaN(num) && num >= 1 && num <= collections.length) {
        collectionId = collections[num - 1];
      }
    }

    if (!collectionId) {
      console.error("❌ Collection ID is required");
      process.exit(1);
    }

    convertCollectionToPlugin(collectionId, parsed.mode);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
