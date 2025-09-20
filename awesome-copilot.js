#!/usr/bin/env node

const { generateConfig } = require("./generate-config");
const { applyConfig } = require("./apply-config");

const commands = {
  init: {
    description: "Initialize a new project with awesome-copilot configuration",
    usage: "awesome-copilot init [config-file]",
    action: async (args) => {
      const configFile = args[0] || "awesome-copilot.config.yml";
      const { initializeProject } = require("./initialize-project");
      await initializeProject(configFile);
    }
  },
  
  apply: {
    description: "Apply configuration and copy files to project",
    usage: "awesome-copilot apply [config-file]",
    action: async (args) => {
      const configFile = args[0] || "awesome-copilot.config.yml";
      await applyConfig(configFile);
    }
  },
  
  help: {
    description: "Show help information",
    usage: "awesome-copilot help",
    action: () => {
      showHelp();
    }
  }
};

function showHelp() {
  console.log("🤖 Awesome GitHub Copilot Configuration Tool");
  console.log("=".repeat(50));
  console.log("");
  console.log("Usage: awesome-copilot <command> [options]");
  console.log("");
  console.log("Commands:");
  
  for (const [name, cmd] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(10)} ${cmd.description}`);
    console.log(`  ${' '.repeat(10)} ${cmd.usage}`);
    console.log("");
  }
  
  console.log("Examples:");
  console.log("  awesome-copilot init                    # Create default config file");
  console.log("  awesome-copilot init my-config.yml      # Create named config file");
  console.log("  awesome-copilot apply                   # Apply default config");
  console.log("  awesome-copilot apply my-config.yml     # Apply specific config");
  console.log("");
  console.log("Workflow:");
  console.log("  1. Run 'awesome-copilot init' to create a configuration file");
  console.log("  2. Edit the configuration file to enable desired items");
  console.log("  3. Run 'awesome-copilot apply' to copy files to your project");
}

function showError(message) {
  console.error(`❌ Error: ${message}`);
  console.log("");
  console.log("Run 'awesome-copilot help' for usage information.");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  if (!commands[command]) {
    showError(`Unknown command: ${command}`);
  }
  
  try {
    await commands[command].action(commandArgs);
  } catch (error) {
    showError(error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };