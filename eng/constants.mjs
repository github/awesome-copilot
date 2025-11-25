import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  collectionsSection: `## 📦 Collections

Curated collections of related prompts, instructions, and agents organized around specific themes, workflows, or use cases.`,

  collectionsUsage: `### How to Use Collections

**Browse Collections:**
- ⭐ Featured collections are highlighted and appear at the top of the list
- Explore themed collections that group related customizations
- Each collection includes prompts, instructions, and agents for specific workflows
- Collections make it easy to adopt comprehensive toolkits for particular scenarios

**Install Items:**
- Click install buttons for individual items within collections
- Or browse to the individual files to copy content manually
- Collections help you discover related customizations you might have missed`,

  featuredCollectionsSection: `## 🌟 Featured Collections

Discover our curated collections of prompts, instructions, and agents organized around specific themes and workflows.`,

  agentsSection: `## 🤖 Custom Agents

Custom agents for GitHub Copilot, making it easy for users and organizations to "specialize" their Copilot coding agent (CCA) through simple file-based configuration.`,

  agentsUsage: `### How to Use Custom Agents

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the agent you want to use
- Download the \`*.agent.md\` file and add it to your repository

**MCP Server Setup:**
- Each agent may require one or more MCP servers to function
- Click the MCP server to view it on the GitHub MCP registry
- Follow the guide on how to add the MCP server to your repository

**To Activate/Use:**
- Access installed agents through the VS Code Chat interface, assign them in CCA, or through Copilot CLI (coming soon)
- Agents will have access to tools from configured MCP servers
- Follow agent-specific instructions for optimal usage`,
};

const vscodeInstallImage =
  "https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white";

const vscodeInsidersInstallImage =
  "https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white";

const repoBaseUrl =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";

const AKA_INSTALL_URLS = {
  instructions: "https://aka.ms/awesome-copilot/install/instructions",
  prompt: "https://aka.ms/awesome-copilot/install/prompt",
  agent: "https://aka.ms/awesome-copilot/install/agent",
};

const ROOT_FOLDER = path.join(__dirname, "..");
const INSTRUCTIONS_DIR = path.join(ROOT_FOLDER, "instructions");
const PROMPTS_DIR = path.join(ROOT_FOLDER, "prompts");
const AGENTS_DIR = path.join(ROOT_FOLDER, "agents");
const COLLECTIONS_DIR = path.join(ROOT_FOLDER, "collections");
const MAX_COLLECTION_ITEMS = 50;

const DOCS_DIR = path.join(ROOT_FOLDER, "docs");

export {
  TEMPLATES,
  vscodeInstallImage,
  vscodeInsidersInstallImage,
  repoBaseUrl,
  AKA_INSTALL_URLS,
  ROOT_FOLDER,
  INSTRUCTIONS_DIR,
  PROMPTS_DIR,
  AGENTS_DIR,
  COLLECTIONS_DIR,
  MAX_COLLECTION_ITEMS,
  DOCS_DIR,
};

