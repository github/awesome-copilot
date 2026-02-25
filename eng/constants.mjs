import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template sections for the README
const TEMPLATES = {
  instructionsSection: `## 📋 Custom Instructions

Team and project-specific instructions to enhance GitHub Copilot's behavior for specific technologies and coding practices.`,

  instructionsUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-instructions) for guidelines on how to contribute new instructions, improve existing ones, and share your use cases.

### How to Use Custom Instructions

**To Install:**
- Click the **VS Code** or **VS Code Insiders** install button for the instruction you want to use
- Download the \`*.instructions.md\` file and manually add it to your project's instruction collection

**To Use/Apply:**
- Copy these instructions to your \`.github/copilot-instructions.md\` file in your workspace
- Create task-specific \`*.instructions.md\` files in your workspace's \`.github/instructions/\` folder (e.g., \`.github/instructions/my-csharp-rules.instructions.md\`)
- Instructions automatically apply to Copilot behavior once installed in your workspace`,

  pluginsSection: `## 🔌 Plugins

Curated plugins of related agents and skills organized around specific themes, workflows, or use cases. Plugins can be installed directly via GitHub Copilot CLI.`,

  pluginsUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-plugins) for guidelines on how to contribute new plugins, improve existing ones, and share your use cases.

### How to Use Plugins

**Browse Plugins:**
- ⭐ Featured plugins are highlighted and appear at the top of the list
- Explore themed plugins that group related customizations
- Each plugin includes agents and skills for specific workflows
- Plugins make it easy to adopt comprehensive toolkits for particular scenarios

**Install Plugins:**
- Use \\\`copilot plugin install <plugin-name>@awesome-copilot\\\` to install a plugin
- Or browse to the individual files to copy content manually
- Plugins help you discover related customizations you might have missed`,

  featuredPluginsSection: `## 🌟 Featured Plugins

Discover our curated plugins of agents and skills organized around specific themes and workflows.`,

  agentsSection: `## 🤖 Custom Agents

Custom agents for GitHub Copilot, making it easy for users and organizations to "specialize" their Copilot coding agent (CCA) through simple file-based configuration.`,

  agentsUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-agents) for guidelines on how to contribute new agents, improve existing ones, and share your use cases.

### How to Use Custom Agents

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

  skillsSection: `## 🎯 Agent Skills

Agent Skills are self-contained folders with instructions and bundled resources that enhance AI capabilities for specialized tasks. Based on the [Agent Skills specification](https://agentskills.io/specification), each skill contains a \`SKILL.md\` file with detailed instructions that agents load on-demand.

Skills differ from other primitives by supporting bundled assets (scripts, code samples, reference data) that agents can utilize when performing specialized tasks.`,

  skillsUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-skills) for guidelines on how to contribute new agent skills, improve existing ones, and share your use cases.

### How to Use Agent Skills

**What's Included:**
- Each skill is a folder containing a \`SKILL.md\` instruction file
- Skills may include helper scripts, code templates, or reference data
- Skills follow the Agent Skills specification for maximum compatibility

**When to Use:**
- Skills are ideal for complex, repeatable workflows that benefit from bundled resources
- Use skills when you need code templates, helper utilities, or reference data alongside instructions
- Skills provide progressive disclosure - loaded only when needed for specific tasks

**Usage:**
- Browse the skills table below to find relevant capabilities
- Copy the skill folder to your local skills directory
- Reference skills in your prompts or let the agent discover them automatically`,

  hooksSection: `## 🪝 Hooks

Hooks enable automated workflows triggered by specific events during GitHub Copilot coding agent sessions, such as session start, session end, user prompts, and tool usage.`,

  hooksUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-hooks) for guidelines on how to contribute new hooks, improve existing ones, and share your use cases.

### How to Use Hooks

**What's Included:**
- Each hook is a folder containing a \`README.md\` file and a \`hooks.json\` configuration
- Hooks may include helper scripts, utilities, or other bundled assets
- Hooks follow the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

**To Install:**
- Copy the hook folder to your repository's \`.github/hooks/\` directory
- Ensure any bundled scripts are executable (\`chmod +x script.sh\`)
- Commit the hook to your repository's default branch

**To Activate/Use:**
- Hooks automatically execute during Copilot coding agent sessions
- Configure hook events in the \`hooks.json\` file
- Available events: \`sessionStart\`, \`sessionEnd\`, \`userPromptSubmitted\`, \`preToolUse\`, \`postToolUse\`, \`errorOccurred\`

**When to Use:**
- Automate session logging and audit trails
- Auto-commit changes at session end
- Track usage analytics
- Integrate with external tools and services
- Custom session workflows`,

  workflowsSection: `## ⚡ Agentic Workflows

[Agentic Workflows](https://github.github.com/gh-aw) are AI-powered repository automations that run coding agents in GitHub Actions. Defined in markdown with natural language instructions, they enable event-triggered and scheduled automation with built-in guardrails and security-first design.`,

  workflowsUsage: `### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-agentic-workflows) for guidelines on how to contribute new workflows, improve existing ones, and share your use cases.

### How to Use Agentic Workflows

**What's Included:**
- Each workflow is a single \`.md\` file with YAML frontmatter and natural language instructions
- Workflows are compiled to \`.lock.yml\` GitHub Actions files via \`gh aw compile\`
- Workflows follow the [GitHub Agentic Workflows specification](https://github.github.com/gh-aw)

**To Install:**
- Install the \`gh aw\` CLI extension: \`gh extension install github/gh-aw\`
- Copy the workflow \`.md\` file to your repository's \`.github/workflows/\` directory
- Compile with \`gh aw compile\` to generate the \`.lock.yml\` file
- Commit both the \`.md\` and \`.lock.yml\` files

**To Activate/Use:**
- Workflows run automatically based on their configured triggers (schedules, events, slash commands)
- Use \`gh aw run <workflow>\` to trigger a manual run
- Monitor runs with \`gh aw status\` and \`gh aw logs\`

**When to Use:**
- Automate issue triage and labeling
- Generate daily status reports
- Maintain documentation automatically
- Run scheduled code quality checks
- Respond to slash commands in issues and PRs
- Orchestrate multi-step repository automation`,
};

const vscodeInstallImage =
  "https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white";

const vscodeInsidersInstallImage =
  "https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white";

const repoBaseUrl =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";

const AKA_INSTALL_URLS = {
  instructions: "https://aka.ms/awesome-copilot/install/instructions",
  agent: "https://aka.ms/awesome-copilot/install/agent",
  hook: "https://aka.ms/awesome-copilot/install/hook",
};

const ROOT_FOLDER = path.join(__dirname, "..");
const INSTRUCTIONS_DIR = path.join(ROOT_FOLDER, "instructions");
const AGENTS_DIR = path.join(ROOT_FOLDER, "agents");
const SKILLS_DIR = path.join(ROOT_FOLDER, "skills");
const HOOKS_DIR = path.join(ROOT_FOLDER, "hooks");
const PLUGINS_DIR = path.join(ROOT_FOLDER, "plugins");
const WORKFLOWS_DIR = path.join(ROOT_FOLDER, "workflows");
const COOKBOOK_DIR = path.join(ROOT_FOLDER, "cookbook");
const MAX_PLUGIN_ITEMS = 50;

// Agent Skills validation constants
const SKILL_NAME_MIN_LENGTH = 1;
const SKILL_NAME_MAX_LENGTH = 64;
const SKILL_DESCRIPTION_MIN_LENGTH = 10;
const SKILL_DESCRIPTION_MAX_LENGTH = 1024;

const DOCS_DIR = path.join(ROOT_FOLDER, "docs");

export {
  AGENTS_DIR,
  AKA_INSTALL_URLS,
  COOKBOOK_DIR,
  DOCS_DIR,
  HOOKS_DIR,
  INSTRUCTIONS_DIR,
  MAX_PLUGIN_ITEMS,
  PLUGINS_DIR,
  repoBaseUrl,
  ROOT_FOLDER,
  SKILL_DESCRIPTION_MAX_LENGTH,
  SKILL_DESCRIPTION_MIN_LENGTH,
  SKILL_NAME_MAX_LENGTH,
  SKILL_NAME_MIN_LENGTH,
  SKILLS_DIR,
  TEMPLATES,
  vscodeInsidersInstallImage,
  vscodeInstallImage,
  WORKFLOWS_DIR,
};
