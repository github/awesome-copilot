const path = require("path");

// Template sections for the README
const TEMPLATES = {
  instructionsSection: `## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices.`,

  instructionsUsage: `### How to Use Custom Instructions

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the instruction you want to use
- Download the \`*.instructions.md\` file and manually add it to your project's instruction collection

**To Use/Apply:**
- Copy these instructions to your \`.github/copilot-instructions.md\` file in your workspace
- Create task-specific \`.github/.instructions.md\` files in your workspace's \`.github/instructions\` folder
- Instructions automatically apply to Copilot behavior once installed in your workspace`,

  promptsSection: `## 🎯 Reusable Prompts

Ready-to-use prompt templates for specific development scenarios and tasks, defining prompt text with a specific mode, model, and available set of tools.`,

  promptsUsage: `### How to Use Reusable Prompts

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the prompt you want to use
- Download the \`*.prompt.md\` file and manually add it to your prompt collection

**To Run/Execute:**
- Use \`/prompt-name\` in VS Code chat after installation
- Run the \`Chat: Run Prompt\` command from the Command Palette
- Hit the run button while you have a prompt file open in VS Code`,

  chatmodesSection: `## 💭 Custom Chat Modes

Custom chat modes define specific behaviors and tools for GitHub Copilot Chat, enabling enhanced context-aware assistance for particular tasks or workflows.`,

  chatmodesUsage: `### How to Use Custom Chat Modes

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the chat mode you want to use
- Download the \`*.chatmode.md\` file and manually install it in VS Code using the Command Palette

**To Activate/Use:**
- Import the chat mode configuration into your VS Code settings
- Access the installed chat modes through the VS Code Chat interface
- Select the desired chat mode from the available options in VS Code Chat`,

  collectionsSection: `## 📦 Collections

Curated collections of related prompts, instructions, and chat modes organized around specific themes, workflows, or use cases.`,

  collectionsUsage: `### How to Use Collections

**Browse Collections:**
- ⭐ Featured collections are highlighted and appear at the top of the list
- Explore themed collections that group related customizations
- Each collection includes prompts, instructions, and chat modes for specific workflows
- Collections make it easy to adopt comprehensive toolkits for particular scenarios

**Install Items:**
- Click install buttons for individual items within collections
- Or browse to the individual files to copy content manually
- Collections help you discover related customizations you might have missed`,

  featuredCollectionsSection: `## 🌟 Featured Collections

Discover our curated collections of prompts, instructions, and chat modes organized around specific themes and workflows.`,

  agentsSection: `## 🤖 Custom Agents

Custom GitHub Copilot agents that integrate with MCP servers to provide enhanced capabilities for specific workflows and tools.`,

  agentsUsage: `### How to Use Custom Agents

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the agent you want to use
- Download the \`*.agent.md\` file and manually add it to your repository

**MCP Server Setup:**
- Each agent may require one or more MCP servers to function
- Click the MCP server to view it on the GitHub MCP registry
- Agents will automatically install the MCP servers they need when activated

**To Activate/Use:**
- Access installed agents through the VS Code Chat interface, through Copilot CLI, or assign them in Coding Agent
- Agents will have access to tools from configured MCP servers
- Follow agent-specific instructions for optimal usage`,
};
exports.TEMPLATES = TEMPLATES;
/**
 * Generate badges for installation links in VS Code and VS Code Insiders.
 * @param {string} link - The relative link to the instructions or prompts file.
 * @returns {string} - Markdown formatted badges for installation.
 */
const vscodeInstallImage =
  "https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white";
exports.vscodeInstallImage = vscodeInstallImage;
const vscodeInsidersInstallImage =
  "https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white";
exports.vscodeInsidersInstallImage = vscodeInsidersInstallImage;
const repoBaseUrl =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";
exports.repoBaseUrl = repoBaseUrl;
// Map install types to aka.ms short links. Both VS Code and Insiders will use
// the same aka.ms target; the redirect base (vscode vs insiders) is preserved
// so VS Code or Insiders opens correctly but the installation URL is uniform.
const AKA_INSTALL_URLS = {
  instructions: "https://aka.ms/awesome-copilot/install/instructions",
  prompt: "https://aka.ms/awesome-copilot/install/prompt",
  mode: "https://aka.ms/awesome-copilot/install/chatmode",
  agent: "https://aka.ms/awesome-copilot/install/agent",
};
exports.AKA_INSTALL_URLS = AKA_INSTALL_URLS;
const ROOT_FOLDER = path.join(__dirname, "..");
exports.ROOT_FOLDER = ROOT_FOLDER;
const INSTRUCTIOSN_DIR = path.join(ROOT_FOLDER, "instructions");
exports.INSTRUCTIOSN_DIR = INSTRUCTIOSN_DIR;
const PROMPTS_DIR = path.join(ROOT_FOLDER, "prompts");
exports.PROMPTS_DIR = PROMPTS_DIR;
const CHATMODES_DIR = path.join(ROOT_FOLDER, "chatmodes");
exports.CHATMODES_DIR = CHATMODES_DIR;
const AGENTS_DIR = path.join(ROOT_FOLDER, "agents");
exports.AGENTS_DIR = AGENTS_DIR;
const COLLECTIONS_DIR = path.join(ROOT_FOLDER, "collections");
exports.COLLECTIONS_DIR = COLLECTIONS_DIR; // Maximum number of items allowed in a collection
const MAX_COLLECTION_ITEMS = 50;
exports.MAX_COLLECTION_ITEMS = MAX_COLLECTION_ITEMS;
