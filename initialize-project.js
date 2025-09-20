#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { generateConfig } = require("./generate-config");

/**
 * Initialize a new project with awesome-copilot configuration
 */
async function initializeProject(configFile = "awesome-copilot.config.yml") {
  console.log("🚀 Initializing awesome-copilot project...");
  console.log("=" .repeat(50));
  
  // Generate the configuration file
  generateConfig(configFile);
  
  // Create .vscode directory and settings if they don't exist
  createVSCodeSettings();
  
  // Create .gitignore entry for awesome-copilot directory
  updateGitignore();
  
  // Create awesome-copilot directory structure
  createProjectStructure();
  
  console.log("\n" + "=" .repeat(50));
  console.log("✅ Project initialization complete!");
  console.log("=" .repeat(50));
  console.log("\nNext steps:");
  console.log(`1. Edit ${configFile} to enable desired prompts, instructions, and chat modes`);
  console.log("2. Run 'awesome-copilot apply' to copy enabled files to your project");
  console.log("3. Your VS Code is now configured to use .awesome-copilot/ directory");
  console.log("4. Files in .awesome-copilot/ are automatically ignored by git");
  console.log("\nWorkflow:");
  console.log("• Edit configuration → apply → VS Code automatically picks up changes");
}

/**
 * Create VS Code settings that point to .awesome-copilot directory
 */
function createVSCodeSettings() {
  const vscodeDir = ".vscode";
  const settingsFile = path.join(vscodeDir, "settings.json");
  
  // Ensure .vscode directory exists
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
    console.log("📁 Created .vscode directory");
  }
  
  // VS Code settings template for awesome-copilot
  const awesomeCopilotSettings = {
    "chat.modeFilesLocations": {
      ".awesome-copilot/chatmodes": true
    },
    "chat.promptFilesLocations": {
      ".awesome-copilot/prompts": true
    },
    "chat.instructionsFilesLocations": {
      ".awesome-copilot/instructions": true
    }
  };
  
  let settings = {};
  let settingsExisted = false;
  
  // Read existing settings if they exist
  if (fs.existsSync(settingsFile)) {
    try {
      const existingContent = fs.readFileSync(settingsFile, 'utf8');
      settings = JSON.parse(existingContent);
      settingsExisted = true;
    } catch (error) {
      console.log("⚠️  Warning: Could not parse existing VS Code settings, creating new ones");
    }
  }
  
  // Merge awesome-copilot settings
  Object.assign(settings, awesomeCopilotSettings);
  
  // Write settings back
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  
  if (settingsExisted) {
    console.log("⚙️  Updated existing VS Code settings with awesome-copilot configuration");
  } else {
    console.log("⚙️  Created VS Code settings for awesome-copilot");
  }
}

/**
 * Update .gitignore to exclude awesome-copilot directory
 */
function updateGitignore() {
  const gitignoreFile = ".gitignore";
  const gitignoreEntry = "\n# Awesome Copilot generated files\n.awesome-copilot/\n";
  
  let shouldAdd = true;
  
  if (fs.existsSync(gitignoreFile)) {
    const content = fs.readFileSync(gitignoreFile, 'utf8');
    if (content.includes('.awesome-copilot/')) {
      shouldAdd = false;
      console.log("📝 .gitignore already contains .awesome-copilot/ entry");
    }
  }
  
  if (shouldAdd) {
    fs.appendFileSync(gitignoreFile, gitignoreEntry);
    console.log("📝 Added .awesome-copilot/ to .gitignore");
  }
}

/**
 * Create basic project structure
 */
function createProjectStructure() {
  const awesomeDir = ".awesome-copilot";
  
  // Create main directory and subdirectories
  const dirs = [
    awesomeDir,
    path.join(awesomeDir, "prompts"),
    path.join(awesomeDir, "instructions"), 
    path.join(awesomeDir, "chatmodes")
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created ${dir} directory`);
    }
  });
  
  // Create a README in the awesome-copilot directory
  const readmeContent = `# Awesome Copilot Configuration

This directory contains your project's GitHub Copilot customizations.

## Directory Structure

- \`prompts/\` - Custom prompts for /awesome-copilot commands
- \`instructions/\` - Instructions that auto-apply to your coding
- \`chatmodes/\` - Chat modes for enhanced conversations

## Usage

1. Edit \`awesome-copilot.config.yml\` in your project root
2. Run \`awesome-copilot apply\` to update files
3. VS Code automatically detects changes

Files in this directory are automatically ignored by git.
`;
  
  const readmePath = path.join(awesomeDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, readmeContent);
    console.log("📄 Created README.md in .awesome-copilot directory");
  }
}

// CLI usage
if (require.main === module) {
  const configFile = process.argv[2] || "awesome-copilot.config.yml";
  initializeProject(configFile).catch(error => {
    console.error("Error initializing project:", error.message);
    process.exit(1);
  });
}

module.exports = { initializeProject };