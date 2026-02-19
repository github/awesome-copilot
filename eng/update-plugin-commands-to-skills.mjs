#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { PLUGINS_DIR } from "./constants.mjs";

/**
 * Convert commands references to skills references in a plugin.json
 * @param {string} pluginJsonPath - Path to the plugin.json file
 * @returns {object} Result with success status and details
 */
function updatePluginManifest(pluginJsonPath) {
  const pluginDir = path.dirname(path.dirname(path.dirname(pluginJsonPath)));
  const pluginName = path.basename(pluginDir);
  
  console.log(`\nProcessing plugin: ${pluginName}`);

  // Read and parse plugin.json
  let plugin;
  try {
    const content = fs.readFileSync(pluginJsonPath, "utf8");
    plugin = JSON.parse(content);
  } catch (error) {
    console.log(`  ✗ Error reading/parsing: ${error.message}`);
    return { success: false, name: pluginName, reason: "parse-error" };
  }

  // Check if plugin has commands field
  if (!plugin.commands || !Array.isArray(plugin.commands)) {
    console.log(`  ℹ  No commands field found`);
    return { success: false, name: pluginName, reason: "no-commands" };
  }

  const commandCount = plugin.commands.length;
  console.log(`  Found ${commandCount} command(s) to convert`);

  // Convert commands to skills format
  // Commands: "./commands/foo.md" → Skills: "./skills/foo/"
  const skills = plugin.commands.map((cmd) => {
    const basename = path.basename(cmd, ".md");
    return `./skills/${basename}/`;
  });

  // Initialize skills array if it doesn't exist
  if (!plugin.skills) {
    plugin.skills = [];
  }

  // Add converted commands to skills array
  plugin.skills.push(...skills);

  // Remove commands field
  delete plugin.commands;

  // Write updated plugin.json
  try {
    fs.writeFileSync(
      pluginJsonPath,
      JSON.stringify(plugin, null, 2) + "\n",
      "utf8"
    );
    console.log(`  ✓ Converted ${commandCount} command(s) to skills`);
    return { success: true, name: pluginName, count: commandCount };
  } catch (error) {
    console.log(`  ✗ Error writing file: ${error.message}`);
    return { success: false, name: pluginName, reason: "write-error" };
  }
}

/**
 * Main function to update all plugin manifests
 */
function main() {
  console.log("=".repeat(60));
  console.log("Updating Plugin Manifests: Commands → Skills");
  console.log("=".repeat(60));

  // Check if plugins directory exists
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Error: Plugins directory not found: ${PLUGINS_DIR}`);
    process.exit(1);
  }

  // Find all plugin.json files
  const pluginDirs = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  console.log(`Found ${pluginDirs.length} plugin directory(ies)\n`);

  const results = {
    updated: [],
    noCommands: [],
    failed: [],
  };

  // Process each plugin
  for (const dirName of pluginDirs) {
    const pluginJsonPath = path.join(
      PLUGINS_DIR,
      dirName,
      ".github/plugin",
      "plugin.json"
    );

    if (!fs.existsSync(pluginJsonPath)) {
      console.log(`\nSkipping ${dirName}: no plugin.json found`);
      continue;
    }

    const result = updatePluginManifest(pluginJsonPath);
    if (result.success) {
      results.updated.push({ name: result.name, count: result.count });
    } else if (result.reason === "no-commands") {
      results.noCommands.push(result.name);
    } else {
      results.failed.push(result.name);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("Update Summary");
  console.log("=".repeat(60));
  console.log(`✓ Updated plugins: ${results.updated.length}`);
  console.log(`ℹ No commands field: ${results.noCommands.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`Total processed: ${pluginDirs.length}`);

  if (results.updated.length > 0) {
    console.log("\nUpdated plugins:");
    results.updated.forEach(({ name, count }) =>
      console.log(`  - ${name} (${count} command(s) → skills)`)
    );
  }

  if (results.failed.length > 0) {
    console.log("\nFailed updates:");
    results.failed.forEach((name) => console.log(`  - ${name}`));
  }

  console.log("\n✅ Plugin manifest updates complete!");
  console.log(
    "\nNext steps:\n" +
      "1. Run 'npm run plugin:validate' to validate all updated plugins\n" +
      "2. Test that plugins work correctly\n"
  );
}

// Run the update
main();
