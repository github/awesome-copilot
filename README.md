# 🤖 Awesome GitHub Copilot
[![Powered by Awesome Copilot](https://img.shields.io/badge/Powered_by-Awesome_Copilot-blue?logo=githubcopilot)](https://aka.ms/awesome-github-copilot) [![GitHub contributors from allcontributors.org](https://img.shields.io/github/all-contributors/github/awesome-copilot?color=ee8449)](#contributors-)


A community created collection of custom agents, prompts, and instructions to supercharge your GitHub Copilot experience across different domains, languages, and use cases.

## 🚀 What is Awesome GitHub Copilot?

This repository provides a comprehensive toolkit for enhancing GitHub Copilot with specialized:

- **👉 [Awesome Agents](docs/README.agents.md)** - Specialized GitHub Copilot agents that integrate with MCP servers to provide enhanced capabilities for specific workflows and tools
- **👉 [Awesome Prompts](docs/README.prompts.md)** - Focused, task-specific prompts for generating code, documentation, and solving specific problems
- **👉 [Awesome Instructions](docs/README.instructions.md)** - Comprehensive coding standards and best practices that apply to specific file patterns or entire projects
- **👉 [Awesome Hooks](docs/README.hooks.md)** - Automated workflows triggered by specific events during development, testing, and deployment
- **👉 [Awesome Agentic Workflows](docs/README.workflows.md)** - AI-powered repository automations that run coding agents in GitHub Actions with natural language instructions
- **👉 [Awesome Skills](docs/README.skills.md)** - Self-contained folders with instructions and bundled resources that enhance AI capabilities for specialized tasks
- **👉 [Awesome Plugins](docs/README.plugins.md)** - Curated plugins of related prompts, agents, and skills organized around specific themes and workflows
- **👉 [Awesome Cookbook Recipes](cookbook/README.md)** - Practical, copy-paste-ready code snippets and real-world examples for working with GitHub Copilot tools and features

## 🌟 Featured Plugins

Discover our curated plugins of prompts, agents, and skills organized around specific themes and workflows.

| Name | Description | Items | Tags |
| ---- | ----------- | ----- | ---- |
| [Awesome Copilot](plugins/awesome-copilot/README.md) | Meta prompts that help you discover and generate curated GitHub Copilot agents, collections, instructions, prompts, and skills. | 5 items | github-copilot, discovery, meta, prompt-engineering, agents |
| [Copilot SDK](plugins/copilot-sdk/README.md) | Build applications with the GitHub Copilot SDK across multiple programming languages. Includes comprehensive instructions for C#, Go, Node.js/TypeScript, and Python to help you create AI-powered applications. | 5 items | copilot-sdk, sdk, csharp, go, nodejs, typescript, python, ai, github-copilot |
| [Partners](plugins/partners/README.md) | Custom agents that have been created by GitHub partners | 20 items | devops, security, database, cloud, infrastructure, observability, feature-flags, cicd, migration, performance |


## How to Install Customizations

To make it easy to add these customizations to your editor, we have created an [MCP Server](https://developer.microsoft.com/blog/announcing-awesome-copilot-mcp-server) that provides a prompt for searching and installing prompts, instructions, agents, and skills directly from this repository. You'll need to have Docker installed and running to run the MCP server locally.

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode) [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vscode-insiders) [![Install in Visual Studio](https://img.shields.io/badge/Visual_Studio-Install-C16FDE?logo=visualstudio&logoColor=white)](https://aka.ms/awesome-copilot/mcp/vs)

<details>
<summary>Show MCP Server JSON configuration</summary>

```json
{
  "servers": {
    "awesome-copilot": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest"
      ]
    }
  }
}
```

</details>

## 📄 llms.txt

An [`llms.txt`](https://github.github.io/awesome-copilot/llms.txt) file following the [llmstxt.org](https://llmstxt.org/) specification is available on the GitHub Pages site. This machine-readable file makes it easy for Large Language Models to discover and understand all available agents, prompts, instructions, and skills, providing a structured overview of the repository's resources with names and descriptions.

## 🔧 How to Use

### 🔌 Plugins

Plugins are installable packages that bundle related agents, commands (prompts), and skills, making it easy to install a curated set of resources.

#### Installing Plugins

First, add the Awesome Copilot marketplace to your Copilot CLI:

```bash
copilot plugin marketplace add github/awesome-copilot
```

Then install any plugin:

```bash
copilot plugin install <plugin-name>@awesome-copilot
```

Alternatively, you can use the `/plugin` command within a Copilot chat session to browse and install plugins interactively.

### 🤖 Custom Agents

Custom agents can be used in Copilot coding agent (CCA), VS Code, and Copilot CLI (coming soon). For CCA, when assigning an issue to Copilot, select the custom agent from the provided list. In VS Code, you can activate the custom agent in the agents session, alongside built-in agents like Plan and Agent.

### 🎯 Prompts

Use the `/` command in GitHub Copilot Chat to access prompts:

```plaintext
/awesome-copilot create-readme
```

### 📋 Instructions

Instructions automatically apply to files based on their patterns and provide contextual guidance for coding standards, frameworks, and best practices.

### 🪝 Hooks

Hooks enable automated workflows triggered by specific events during GitHub Copilot coding agent sessions (like sessionStart, sessionEnd, userPromptSubmitted). They can automate tasks like logging, auto-committing changes, or integrating with external services.

### ⚡ Agentic Workflows

[Agentic Workflows](https://github.github.com/gh-aw) are AI-powered repository automations that run coding agents in GitHub Actions. Defined in markdown with natural language instructions, they enable event-triggered and scheduled automation — from issue triage to daily reports.

## 🎯 Why Use Awesome GitHub Copilot?

- **Productivity**: Pre-built agents, prompts and instructions save time and provide consistent results.
- **Best Practices**: Benefit from community-curated coding standards and patterns.
- **Specialized Assistance**: Access expert-level guidance through specialized custom agents.
- **Continuous Learning**: Stay updated with the latest patterns and practices across technologies.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to:

- Add new prompts, instructions, hooks, workflows, agents, or skills
- Improve existing content
- Report issues or suggest enhancements

For AI coding agents working with this project, refer to [AGENTS.md](AGENTS.md) for detailed technical guidance on development workflows, setup commands, and contribution standards.

### Quick Contribution Guide

1. Follow our file naming conventions and frontmatter requirements
2. Test your contributions thoroughly
3. Update the appropriate README tables
4. Submit a pull request with a clear description

## 📖 Repository Structure

```plaintext
├── prompts/          # Task-specific prompts (.prompt.md)
├── instructions/     # Coding standards and best practices (.instructions.md)
├── agents/           # AI personas and specialized modes (.agent.md)
├── hooks/            # Automated hooks for Copilot coding agent sessions
├── workflows/        # Agentic Workflows for GitHub Actions automation
├── plugins/          # Installable plugins bundling related items
├── scripts/          # Utility scripts for maintenance
└── skills/           # AI capabilities for specialized tasks
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛡️ Security & Support

- **Security Issues**: Please see our [Security Policy](SECURITY.md)
- **Support**: Check our [Support Guide](SUPPORT.md) for getting help
- **Code of Conduct**: We follow the [Contributor Covenant](CODE_OF_CONDUCT.md)

## ℹ️ Disclaimer

The customizations in this repository are sourced from and created by third-party developers. GitHub does not verify, endorse, or guarantee the functionality or security of these agents. Please carefully inspect any agent and its documentation before installing to understand permissions it may require and actions it may perform.

---

**Ready to supercharge your coding experience?** Start exploring our [prompts](docs/README.prompts.md), [instructions](docs/README.instructions.md), [hooks](docs/README.hooks.md), [agentic workflows](docs/README.workflows.md), and [custom agents](docs/README.agents.md)!

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](./CONTRIBUTING.md#contributors-recognition)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aaron-powell.com/"><img src="https://avatars.githubusercontent.com/u/434140?v=4?s=100" width="100px;" alt="Aaron Powell"/><br /><sub><b>Aaron Powell</b></sub></a><br /><a href="#agents-aaronpowell" title="Specialized agents for GitHub Copilot">🎭</a> <a href="https://github.com/github/awesome-copilot/commits?author=aaronpowell" title="Code">💻</a> <a href="#plugins-aaronpowell" title="Curated plugins of related content">🎁</a> <a href="https://github.com/github/awesome-copilot/commits?author=aaronpowell" title="Documentation">📖</a> <a href="#infra-aaronpowell" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#instructions-aaronpowell" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#maintenance-aaronpowell" title="Maintenance">🚧</a> <a href="#prompts-aaronpowell" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://codemilltech.com/"><img src="https://avatars.githubusercontent.com/u/2053639?v=4?s=100" width="100px;" alt="Matt Soucoup"/><br /><sub><b>Matt Soucoup</b></sub></a><br /><a href="#infra-codemillmatt" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.buymeacoffee.com/troystaylor"><img src="https://avatars.githubusercontent.com/u/44444967?v=4?s=100" width="100px;" alt="Troy Simeon Taylor"/><br /><sub><b>Troy Simeon Taylor</b></sub></a><br /><a href="#agents-troystaylor" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-troystaylor" title="Curated plugins of related content">🎁</a> <a href="#instructions-troystaylor" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-troystaylor" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abbas133"><img src="https://avatars.githubusercontent.com/u/7757139?v=4?s=100" width="100px;" alt="Abbas"/><br /><sub><b>Abbas</b></sub></a><br /><a href="#agents-abbas133" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-abbas133" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://calva.io/"><img src="https://avatars.githubusercontent.com/u/30010?v=4?s=100" width="100px;" alt="Peter Strömberg"/><br /><sub><b>Peter Strömberg</b></sub></a><br /><a href="#agents-PEZ" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-PEZ" title="Curated plugins of related content">🎁</a> <a href="#instructions-PEZ" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-PEZ" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://danielscottraynsford.com/"><img src="https://avatars.githubusercontent.com/u/7589164?v=4?s=100" width="100px;" alt="Daniel Scott-Raynsford"/><br /><sub><b>Daniel Scott-Raynsford</b></sub></a><br /><a href="#agents-PlagueHO" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-PlagueHO" title="Curated plugins of related content">🎁</a> <a href="#instructions-PlagueHO" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-PlagueHO" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jhauga"><img src="https://avatars.githubusercontent.com/u/10998676?v=4?s=100" width="100px;" alt="John Haugabook"/><br /><sub><b>John Haugabook</b></sub></a><br /><a href="#instructions-jhauga" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-jhauga" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://witter.cz/@pavel"><img src="https://avatars.githubusercontent.com/u/7853836?v=4?s=100" width="100px;" alt="Pavel Simsa"/><br /><sub><b>Pavel Simsa</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=psimsa" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://digitarald.de/"><img src="https://avatars.githubusercontent.com/u/8599?v=4?s=100" width="100px;" alt="Harald Kirschner"/><br /><sub><b>Harald Kirschner</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=digitarald" title="Code">💻</a> <a href="https://github.com/github/awesome-copilot/commits?author=digitarald" title="Documentation">📖</a> <a href="#maintenance-digitarald" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mubaidr.js.org/"><img src="https://avatars.githubusercontent.com/u/2222702?v=4?s=100" width="100px;" alt="Muhammad Ubaid Raza"/><br /><sub><b>Muhammad Ubaid Raza</b></sub></a><br /><a href="#agents-mubaidr" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-mubaidr" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tmeschter"><img src="https://avatars.githubusercontent.com/u/10506730?v=4?s=100" width="100px;" alt="Tom Meschter"/><br /><sub><b>Tom Meschter</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=tmeschter" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aungmyokyaw.com/"><img src="https://avatars.githubusercontent.com/u/9404824?v=4?s=100" width="100px;" alt="Aung Myo Kyaw"/><br /><sub><b>Aung Myo Kyaw</b></sub></a><br /><a href="#agents-AungMyoKyaw" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-AungMyoKyaw" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JasonYeMSFT"><img src="https://avatars.githubusercontent.com/u/39359541?v=4?s=100" width="100px;" alt="JasonYeMSFT"/><br /><sub><b>JasonYeMSFT</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=JasonYeMSFT" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/jrc356/"><img src="https://avatars.githubusercontent.com/u/37387479?v=4?s=100" width="100px;" alt="Jon Corbin"/><br /><sub><b>Jon Corbin</b></sub></a><br /><a href="#agents-Jrc356" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-Jrc356" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/troytaylor-msft"><img src="https://avatars.githubusercontent.com/u/248058374?v=4?s=100" width="100px;" alt="troytaylor-msft"/><br /><sub><b>troytaylor-msft</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=troytaylor-msft" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://delatorre.dev/"><img src="https://avatars.githubusercontent.com/u/38289677?v=4?s=100" width="100px;" alt="Emerson Delatorre"/><br /><sub><b>Emerson Delatorre</b></sub></a><br /><a href="#instructions-fazedordecodigo" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/burkeholland"><img src="https://avatars.githubusercontent.com/u/686963?v=4?s=100" width="100px;" alt="Burke Holland"/><br /><sub><b>Burke Holland</b></sub></a><br /><a href="#agents-burkeholland" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#infra-burkeholland" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#instructions-burkeholland" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-burkeholland" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://yaooqinn.github.io/"><img src="https://avatars.githubusercontent.com/u/8326978?v=4?s=100" width="100px;" alt="Kent Yao"/><br /><sub><b>Kent Yao</b></sub></a><br /><a href="#instructions-yaooqinn" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-yaooqinn" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.devprodlogs.com/"><img src="https://avatars.githubusercontent.com/u/51440732?v=4?s=100" width="100px;" alt="Daniel Meppiel"/><br /><sub><b>Daniel Meppiel</b></sub></a><br /><a href="#prompts-danielmeppiel" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yeelam-gordon"><img src="https://avatars.githubusercontent.com/u/73506701?v=4?s=100" width="100px;" alt="Gordon Lam"/><br /><sub><b>Gordon Lam</b></sub></a><br /><a href="#instructions-yeelam-gordon" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.madskristensen.net/"><img src="https://avatars.githubusercontent.com/u/1258877?v=4?s=100" width="100px;" alt="Mads Kristensen"/><br /><sub><b>Mads Kristensen</b></sub></a><br /><a href="#instructions-madskristensen" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ks6088ts.github.io/"><img src="https://avatars.githubusercontent.com/u/1254960?v=4?s=100" width="100px;" alt="Shinji Takenaka"/><br /><sub><b>Shinji Takenaka</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=ks6088ts" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/spectatora"><img src="https://avatars.githubusercontent.com/u/1385755?v=4?s=100" width="100px;" alt="spectatora"/><br /><sub><b>spectatora</b></sub></a><br /><a href="#agents-spectatora" title="Specialized agents for GitHub Copilot">🎭</a> <a href="https://github.com/github/awesome-copilot/commits?author=spectatora" title="Code">💻</a> <a href="#maintenance-spectatora" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sinedied"><img src="https://avatars.githubusercontent.com/u/593151?v=4?s=100" width="100px;" alt="Yohan Lasorsa"/><br /><sub><b>Yohan Lasorsa</b></sub></a><br /><a href="#instructions-sinedied" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-sinedied" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/VamshiVerma"><img src="https://avatars.githubusercontent.com/u/21999324?v=4?s=100" width="100px;" alt="Vamshi Verma"/><br /><sub><b>Vamshi Verma</b></sub></a><br /><a href="#instructions-VamshiVerma" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-VamshiVerma" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://montemagno.com/"><img src="https://avatars.githubusercontent.com/u/1676321?v=4?s=100" width="100px;" alt="James Montemagno"/><br /><sub><b>James Montemagno</b></sub></a><br /><a href="#agents-jamesmontemagno" title="Specialized agents for GitHub Copilot">🎭</a> <a href="https://github.com/github/awesome-copilot/commits?author=jamesmontemagno" title="Documentation">📖</a> <a href="#instructions-jamesmontemagno" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-jamesmontemagno" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/alefragnani"><img src="https://avatars.githubusercontent.com/u/3781424?v=4?s=100" width="100px;" alt="Alessandro Fragnani"/><br /><sub><b>Alessandro Fragnani</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=alefragnani" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/ambilykk/"><img src="https://avatars.githubusercontent.com/u/10282550?v=4?s=100" width="100px;" alt="Ambily"/><br /><sub><b>Ambily</b></sub></a><br /><a href="#agents-ambilykk" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-ambilykk" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/krushideep"><img src="https://avatars.githubusercontent.com/u/174652083?v=4?s=100" width="100px;" alt="krushideep"/><br /><sub><b>krushideep</b></sub></a><br /><a href="#prompts-krushideep" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mihsoft"><img src="https://avatars.githubusercontent.com/u/53946345?v=4?s=100" width="100px;" alt="devopsfan"/><br /><sub><b>devopsfan</b></sub></a><br /><a href="#agents-mihsoft" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://tgrall.github.io/"><img src="https://avatars.githubusercontent.com/u/541250?v=4?s=100" width="100px;" alt="Tugdual Grall"/><br /><sub><b>Tugdual Grall</b></sub></a><br /><a href="#instructions-tgrall" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-tgrall" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.promptboost.dev/"><img src="https://avatars.githubusercontent.com/u/5461862?v=4?s=100" width="100px;" alt="Oren Me"/><br /><sub><b>Oren Me</b></sub></a><br /><a href="#agents-OrenMe" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-OrenMe" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mjrousos"><img src="https://avatars.githubusercontent.com/u/10077254?v=4?s=100" width="100px;" alt="Mike Rousos"/><br /><sub><b>Mike Rousos</b></sub></a><br /><a href="#instructions-mjrousos" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-mjrousos" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://devkimchi.com/"><img src="https://avatars.githubusercontent.com/u/1538528?v=4?s=100" width="100px;" alt="Justin Yoo"/><br /><sub><b>Justin Yoo</b></sub></a><br /><a href="#instructions-justinyoo" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/guiopen"><img src="https://avatars.githubusercontent.com/u/94094527?v=4?s=100" width="100px;" alt="Guilherme do Amaral Alves "/><br /><sub><b>Guilherme do Amaral Alves </b></sub></a><br /><a href="#instructions-guiopen" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/griffinashe/"><img src="https://avatars.githubusercontent.com/u/6391612?v=4?s=100" width="100px;" alt="Griffin Ashe"/><br /><sub><b>Griffin Ashe</b></sub></a><br /><a href="#agents-griffinashe" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-griffinashe" title="Curated plugins of related content">🎁</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anchildress1"><img src="https://avatars.githubusercontent.com/u/6563688?v=4?s=100" width="100px;" alt="Ashley Childress"/><br /><sub><b>Ashley Childress</b></sub></a><br /><a href="#agents-anchildress1" title="Specialized agents for GitHub Copilot">🎭</a> <a href="https://github.com/github/awesome-copilot/commits?author=anchildress1" title="Documentation">📖</a> <a href="#instructions-anchildress1" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#infra-anchildress1" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/github/awesome-copilot/commits?author=anchildress1" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.senseof.tech/"><img src="https://avatars.githubusercontent.com/u/50712277?v=4?s=100" width="100px;" alt="Adrien Clerbois"/><br /><sub><b>Adrien Clerbois</b></sub></a><br /><a href="#agents-AClerbois" title="Specialized agents for GitHub Copilot">🎭</a> <a href="https://github.com/github/awesome-copilot/commits?author=AClerbois" title="Documentation">📖</a> <a href="#prompts-AClerbois" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vhivi"><img src="https://avatars.githubusercontent.com/u/38220028?v=4?s=100" width="100px;" alt="ANGELELLI David"/><br /><sub><b>ANGELELLI David</b></sub></a><br /><a href="#agents-Vhivi" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://markdav.is/"><img src="https://avatars.githubusercontent.com/u/311063?v=4?s=100" width="100px;" alt="Mark Davis"/><br /><sub><b>Mark Davis</b></sub></a><br /><a href="#instructions-markdav-is" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MattVevang"><img src="https://avatars.githubusercontent.com/u/20714898?v=4?s=100" width="100px;" alt="Matt Vevang"/><br /><sub><b>Matt Vevang</b></sub></a><br /><a href="#instructions-MattVevang" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://max.irro.at/"><img src="https://avatars.githubusercontent.com/u/589073?v=4?s=100" width="100px;" alt="Maximilian Irro"/><br /><sub><b>Maximilian Irro</b></sub></a><br /><a href="#instructions-mpgirro" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nullchimp"><img src="https://avatars.githubusercontent.com/u/58362593?v=4?s=100" width="100px;" alt="NULLchimp"/><br /><sub><b>NULLchimp</b></sub></a><br /><a href="#agents-nullchimp" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pkarda"><img src="https://avatars.githubusercontent.com/u/12649718?v=4?s=100" width="100px;" alt="Peter Karda"/><br /><sub><b>Peter Karda</b></sub></a><br /><a href="#prompts-pkarda" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sdolgin"><img src="https://avatars.githubusercontent.com/u/576449?v=4?s=100" width="100px;" alt="Saul Dolgin"/><br /><sub><b>Saul Dolgin</b></sub></a><br /><a href="#agents-sdolgin" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-sdolgin" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-sdolgin" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/shubham070"><img src="https://avatars.githubusercontent.com/u/5480589?v=4?s=100" width="100px;" alt="Shubham Gaikwad"/><br /><sub><b>Shubham Gaikwad</b></sub></a><br /><a href="#agents-shubham070" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-shubham070" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-shubham070" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TheovanKraay"><img src="https://avatars.githubusercontent.com/u/24420698?v=4?s=100" width="100px;" alt="Theo van Kraay"/><br /><sub><b>Theo van Kraay</b></sub></a><br /><a href="#instructions-TheovanKraay" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TianqiZhang"><img src="https://avatars.githubusercontent.com/u/5326582?v=4?s=100" width="100px;" alt="Tianqi Zhang"/><br /><sub><b>Tianqi Zhang</b></sub></a><br /><a href="#agents-TianqiZhang" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.miniasp.com/"><img src="https://avatars.githubusercontent.com/u/88981?v=4?s=100" width="100px;" alt="Will 保哥"/><br /><sub><b>Will 保哥</b></sub></a><br /><a href="#agents-doggy8088" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-doggy8088" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://tsubalog.hatenablog.com/"><img src="https://avatars.githubusercontent.com/u/1592808?v=4?s=100" width="100px;" alt="Yuta Matsumura"/><br /><sub><b>Yuta Matsumura</b></sub></a><br /><a href="#instructions-tsubakimoto" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anschnapp"><img src="https://avatars.githubusercontent.com/u/17565996?v=4?s=100" width="100px;" alt="anschnapp"/><br /><sub><b>anschnapp</b></sub></a><br /><a href="#agents-anschnapp" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hizahizi-hizumi"><img src="https://avatars.githubusercontent.com/u/163728895?v=4?s=100" width="100px;" alt="hizahizi-hizumi"/><br /><sub><b>hizahizi-hizumi</b></sub></a><br /><a href="#instructions-hizahizi-hizumi" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jianminhuang.cc/"><img src="https://avatars.githubusercontent.com/u/6296280?v=4?s=100" width="100px;" alt="黃健旻 Vincent Huang"/><br /><sub><b>黃健旻 Vincent Huang</b></sub></a><br /><a href="#prompts-Jian-Min-Huang" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://brunoborges.io/"><img src="https://avatars.githubusercontent.com/u/129743?v=4?s=100" width="100px;" alt="Bruno Borges"/><br /><sub><b>Bruno Borges</b></sub></a><br /><a href="#plugins-brunoborges" title="Curated plugins of related content">🎁</a> <a href="#instructions-brunoborges" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.movinglive.ca/"><img src="https://avatars.githubusercontent.com/u/14792628?v=4?s=100" width="100px;" alt="Steve Magne"/><br /><sub><b>Steve Magne</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=MovingLive" title="Documentation">📖</a> <a href="#instructions-MovingLive" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://shaneneuville.com/"><img src="https://avatars.githubusercontent.com/u/5375137?v=4?s=100" width="100px;" alt="Shane Neuville"/><br /><sub><b>Shane Neuville</b></sub></a><br /><a href="#agents-PureWeen" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-PureWeen" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://asilva.dev/"><img src="https://avatars.githubusercontent.com/u/2493377?v=4?s=100" width="100px;" alt="André Silva"/><br /><sub><b>André Silva</b></sub></a><br /><a href="#agents-askpt" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-askpt" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/agreaves-ms"><img src="https://avatars.githubusercontent.com/u/111466195?v=4?s=100" width="100px;" alt="Allen Greaves"/><br /><sub><b>Allen Greaves</b></sub></a><br /><a href="#agents-agreaves-ms" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-agreaves-ms" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AmeliaRose802"><img src="https://avatars.githubusercontent.com/u/26167931?v=4?s=100" width="100px;" alt="Amelia Payne"/><br /><sub><b>Amelia Payne</b></sub></a><br /><a href="#agents-AmeliaRose802" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BBoyBen"><img src="https://avatars.githubusercontent.com/u/34445365?v=4?s=100" width="100px;" alt="BBoyBen"/><br /><sub><b>BBoyBen</b></sub></a><br /><a href="#instructions-BBoyBen" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://azureincubations.io/"><img src="https://avatars.githubusercontent.com/u/45323234?v=4?s=100" width="100px;" alt="Brooke Hamilton"/><br /><sub><b>Brooke Hamilton</b></sub></a><br /><a href="#instructions-brooke-hamilton" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GeekTrainer"><img src="https://avatars.githubusercontent.com/u/6109729?v=4?s=100" width="100px;" alt="Christopher Harrison"/><br /><sub><b>Christopher Harrison</b></sub></a><br /><a href="#instructions-GeekTrainer" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/breakid"><img src="https://avatars.githubusercontent.com/u/1446918?v=4?s=100" width="100px;" alt="Dan"/><br /><sub><b>Dan</b></sub></a><br /><a href="#instructions-breakid" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.codewithdan.com/"><img src="https://avatars.githubusercontent.com/u/1767249?v=4?s=100" width="100px;" alt="Dan Wahlin"/><br /><sub><b>Dan Wahlin</b></sub></a><br /><a href="#agents-DanWahlin" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://debbie.codes/"><img src="https://avatars.githubusercontent.com/u/13063165?v=4?s=100" width="100px;" alt="Debbie O'Brien"/><br /><sub><b>Debbie O'Brien</b></sub></a><br /><a href="#agents-debs-obrien" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-debs-obrien" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-debs-obrien" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/echarrod"><img src="https://avatars.githubusercontent.com/u/1381991?v=4?s=100" width="100px;" alt="Ed Harrod"/><br /><sub><b>Ed Harrod</b></sub></a><br /><a href="#prompts-echarrod" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://learn.microsoft.com/dotnet"><img src="https://avatars.githubusercontent.com/u/24882762?v=4?s=100" width="100px;" alt="Genevieve Warren"/><br /><sub><b>Genevieve Warren</b></sub></a><br /><a href="#prompts-gewarren" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/guigui42"><img src="https://avatars.githubusercontent.com/u/2376010?v=4?s=100" width="100px;" alt="Guillaume"/><br /><sub><b>Guillaume</b></sub></a><br /><a href="#agents-guigui42" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-guigui42" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/riqueufmg"><img src="https://avatars.githubusercontent.com/u/108551585?v=4?s=100" width="100px;" alt="Henrique Nunes"/><br /><sub><b>Henrique Nunes</b></sub></a><br /><a href="#prompts-riqueufmg" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jeremiah-snee-openx"><img src="https://avatars.githubusercontent.com/u/113928685?v=4?s=100" width="100px;" alt="Jeremiah Snee"/><br /><sub><b>Jeremiah Snee</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=jeremiah-snee-openx" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kartikdhiman"><img src="https://avatars.githubusercontent.com/u/59189590?v=4?s=100" width="100px;" alt="Kartik Dhiman"/><br /><sub><b>Kartik Dhiman</b></sub></a><br /><a href="#instructions-kartikdhiman" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kristiyanvelkov.com/"><img src="https://avatars.githubusercontent.com/u/40764277?v=4?s=100" width="100px;" alt="Kristiyan Velkov"/><br /><sub><b>Kristiyan Velkov</b></sub></a><br /><a href="#agents-kristiyan-velkov" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/msalaman"><img src="https://avatars.githubusercontent.com/u/28122166?v=4?s=100" width="100px;" alt="msalaman"/><br /><sub><b>msalaman</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=msalaman" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://soderlind.no/"><img src="https://avatars.githubusercontent.com/u/1649452?v=4?s=100" width="100px;" alt="Per Søderlind"/><br /><sub><b>Per Søderlind</b></sub></a><br /><a href="#instructions-soderlind" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://dotneteers.net/"><img src="https://avatars.githubusercontent.com/u/28162552?v=4?s=100" width="100px;" alt="Peter Smulovics"/><br /><sub><b>Peter Smulovics</b></sub></a><br /><a href="#instructions-psmulovics" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/madvimer"><img src="https://avatars.githubusercontent.com/u/3188898?v=4?s=100" width="100px;" alt="Ravish Rathod"/><br /><sub><b>Ravish Rathod</b></sub></a><br /><a href="#instructions-madvimer" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ricksm.it/"><img src="https://avatars.githubusercontent.com/u/7207783?v=4?s=100" width="100px;" alt="Rick Smit"/><br /><sub><b>Rick Smit</b></sub></a><br /><a href="#agents-ricksmit3000" title="Specialized agents for GitHub Copilot">🎭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pertrai1"><img src="https://avatars.githubusercontent.com/u/442374?v=4?s=100" width="100px;" alt="Rob Simpson"/><br /><sub><b>Rob Simpson</b></sub></a><br /><a href="#instructions-pertrai1" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/inquinity"><img src="https://avatars.githubusercontent.com/u/406234?v=4?s=100" width="100px;" alt="Robert Altman"/><br /><sub><b>Robert Altman</b></sub></a><br /><a href="#instructions-inquinity" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://salih.guru/"><img src="https://avatars.githubusercontent.com/u/76786120?v=4?s=100" width="100px;" alt="Salih"/><br /><sub><b>Salih</b></sub></a><br /><a href="#instructions-salihguru" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://graef.io/"><img src="https://avatars.githubusercontent.com/u/19261257?v=4?s=100" width="100px;" alt="Sebastian Gräf"/><br /><sub><b>Sebastian Gräf</b></sub></a><br /><a href="#agents-segraef" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-segraef" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SebastienDegodez"><img src="https://avatars.githubusercontent.com/u/2349146?v=4?s=100" width="100px;" alt="Sebastien DEGODEZ"/><br /><sub><b>Sebastien DEGODEZ</b></sub></a><br /><a href="#instructions-SebastienDegodez" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sesmyrnov"><img src="https://avatars.githubusercontent.com/u/59627981?v=4?s=100" width="100px;" alt="Sergiy Smyrnov"/><br /><sub><b>Sergiy Smyrnov</b></sub></a><br /><a href="#prompts-sesmyrnov" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SomeSolutionsArchitect"><img src="https://avatars.githubusercontent.com/u/139817767?v=4?s=100" width="100px;" alt="SomeSolutionsArchitect"/><br /><sub><b>SomeSolutionsArchitect</b></sub></a><br /><a href="#agents-SomeSolutionsArchitect" title="Specialized agents for GitHub Copilot">🎭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kewalaka"><img src="https://avatars.githubusercontent.com/u/3146590?v=4?s=100" width="100px;" alt="Stu Mace"/><br /><sub><b>Stu Mace</b></sub></a><br /><a href="#agents-kewalaka" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-kewalaka" title="Curated plugins of related content">🎁</a> <a href="#instructions-kewalaka" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/STRUDSO"><img src="https://avatars.githubusercontent.com/u/1543732?v=4?s=100" width="100px;" alt="Søren Trudsø Mahon"/><br /><sub><b>Søren Trudsø Mahon</b></sub></a><br /><a href="#instructions-STRUDSO" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://enakdesign.com/"><img src="https://avatars.githubusercontent.com/u/14024037?v=4?s=100" width="100px;" alt="Tj Vita"/><br /><sub><b>Tj Vita</b></sub></a><br /><a href="#agents-semperteneo" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pelikhan"><img src="https://avatars.githubusercontent.com/u/4175913?v=4?s=100" width="100px;" alt="Peli de Halleux"/><br /><sub><b>Peli de Halleux</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=pelikhan" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.paulomorgado.net/"><img src="https://avatars.githubusercontent.com/u/470455?v=4?s=100" width="100px;" alt="Paulo Morgado"/><br /><sub><b>Paulo Morgado</b></sub></a><br /><a href="#prompts-paulomorgado" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://paul.crane.net.nz/"><img src="https://avatars.githubusercontent.com/u/808676?v=4?s=100" width="100px;" alt="Paul Crane"/><br /><sub><b>Paul Crane</b></sub></a><br /><a href="#agents-pcrane" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.pamelafox.org/"><img src="https://avatars.githubusercontent.com/u/297042?v=4?s=100" width="100px;" alt="Pamela Fox"/><br /><sub><b>Pamela Fox</b></sub></a><br /><a href="#prompts-pamelafox" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://oskarthornblad.se/"><img src="https://avatars.githubusercontent.com/u/640102?v=4?s=100" width="100px;" alt="Oskar Thornblad"/><br /><sub><b>Oskar Thornblad</b></sub></a><br /><a href="#instructions-prewk" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nischays"><img src="https://avatars.githubusercontent.com/u/54121853?v=4?s=100" width="100px;" alt="Nischay Sharma"/><br /><sub><b>Nischay Sharma</b></sub></a><br /><a href="#agents-nischays" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Naikabg"><img src="https://avatars.githubusercontent.com/u/19915620?v=4?s=100" width="100px;" alt="Nikolay Marinov"/><br /><sub><b>Nikolay Marinov</b></sub></a><br /><a href="#agents-Naikabg" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/niksac"><img src="https://avatars.githubusercontent.com/u/20246918?v=4?s=100" width="100px;" alt="Nik Sachdeva"/><br /><sub><b>Nik Sachdeva</b></sub></a><br /><a href="#agents-niksacdev" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#plugins-niksacdev" title="Curated plugins of related content">🎁</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://onetipaweek.com/"><img src="https://avatars.githubusercontent.com/u/833231?v=4?s=100" width="100px;" alt="Nick Taylor"/><br /><sub><b>Nick Taylor</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=nickytonline" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nicholasdbrady.github.io/cookbook/"><img src="https://avatars.githubusercontent.com/u/18353756?v=4?s=100" width="100px;" alt="Nick Brady"/><br /><sub><b>Nick Brady</b></sub></a><br /><a href="#agents-nicholasdbrady" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nastanford"><img src="https://avatars.githubusercontent.com/u/1755947?v=4?s=100" width="100px;" alt="Nathan Stanford Sr"/><br /><sub><b>Nathan Stanford Sr</b></sub></a><br /><a href="#instructions-nastanford" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/matebarabas"><img src="https://avatars.githubusercontent.com/u/22733424?v=4?s=100" width="100px;" alt="Máté Barabás"/><br /><sub><b>Máté Barabás</b></sub></a><br /><a href="#instructions-matebarabas" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikeparker104"><img src="https://avatars.githubusercontent.com/u/12763221?v=4?s=100" width="100px;" alt="Mike Parker"/><br /><sub><b>Mike Parker</b></sub></a><br /><a href="#instructions-mikeparker104" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikekistler"><img src="https://avatars.githubusercontent.com/u/85643503?v=4?s=100" width="100px;" alt="Mike Kistler"/><br /><sub><b>Mike Kistler</b></sub></a><br /><a href="#prompts-mikekistler" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/giomartinsdev"><img src="https://avatars.githubusercontent.com/u/125399281?v=4?s=100" width="100px;" alt="Giovanni de Almeida Martins"/><br /><sub><b>Giovanni de Almeida Martins</b></sub></a><br /><a href="#instructions-giomartinsdev" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dgh06175"><img src="https://avatars.githubusercontent.com/u/77305722?v=4?s=100" width="100px;" alt="이상현"/><br /><sub><b>이상현</b></sub></a><br /><a href="#instructions-dgh06175" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zooav"><img src="https://avatars.githubusercontent.com/u/12625412?v=4?s=100" width="100px;" alt="Ankur Sharma"/><br /><sub><b>Ankur Sharma</b></sub></a><br /><a href="#prompts-zooav" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/webreidi"><img src="https://avatars.githubusercontent.com/u/55603905?v=4?s=100" width="100px;" alt="Wendy Breiding"/><br /><sub><b>Wendy Breiding</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=webreidi" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/voidfnc"><img src="https://avatars.githubusercontent.com/u/194750710?v=4?s=100" width="100px;" alt="voidfnc"/><br /><sub><b>voidfnc</b></sub></a><br /><a href="#agents-voidfnc" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://about.me/shane-lee"><img src="https://avatars.githubusercontent.com/u/5466825?v=4?s=100" width="100px;" alt="shane lee"/><br /><sub><b>shane lee</b></sub></a><br /><a href="#instructions-shavo007" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sdanzo-hrb"><img src="https://avatars.githubusercontent.com/u/136493100?v=4?s=100" width="100px;" alt="sdanzo-hrb"/><br /><sub><b>sdanzo-hrb</b></sub></a><br /><a href="#agents-sdanzo-hrb" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nativebpm"><img src="https://avatars.githubusercontent.com/u/33398121?v=4?s=100" width="100px;" alt="sauran"/><br /><sub><b>sauran</b></sub></a><br /><a href="#instructions-isauran" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/samqbush"><img src="https://avatars.githubusercontent.com/u/74389839?v=4?s=100" width="100px;" alt="samqbush"/><br /><sub><b>samqbush</b></sub></a><br /><a href="#prompts-samqbush" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pareenaverma"><img src="https://avatars.githubusercontent.com/u/59843121?v=4?s=100" width="100px;" alt="pareenaverma"/><br /><sub><b>pareenaverma</b></sub></a><br /><a href="#agents-pareenaverma" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/oleksiyyurchyna"><img src="https://avatars.githubusercontent.com/u/10256765?v=4?s=100" width="100px;" alt="oleksiyyurchyna"/><br /><sub><b>oleksiyyurchyna</b></sub></a><br /><a href="#plugins-oleksiyyurchyna" title="Curated plugins of related content">🎁</a> <a href="#prompts-oleksiyyurchyna" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/time-by-waves"><img src="https://avatars.githubusercontent.com/u/34587654?v=4?s=100" width="100px;" alt="oceans-of-time"/><br /><sub><b>oceans-of-time</b></sub></a><br /><a href="#instructions-time-by-waves" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kshashank57"><img src="https://avatars.githubusercontent.com/u/57212456?v=4?s=100" width="100px;" alt="kshashank57"/><br /><sub><b>kshashank57</b></sub></a><br /><a href="#agents-kshashank57" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-kshashank57" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hueanmy"><img src="https://avatars.githubusercontent.com/u/20430626?v=4?s=100" width="100px;" alt="Meii"/><br /><sub><b>Meii</b></sub></a><br /><a href="#agents-hueanmy" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/factory-davidgu"><img src="https://avatars.githubusercontent.com/u/229352262?v=4?s=100" width="100px;" alt="factory-davidgu"/><br /><sub><b>factory-davidgu</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=factory-davidgu" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dangelov-qa"><img src="https://avatars.githubusercontent.com/u/92313553?v=4?s=100" width="100px;" alt="dangelov-qa"/><br /><sub><b>dangelov-qa</b></sub></a><br /><a href="#agents-dangelov-qa" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BenoitMaucotel"><img src="https://avatars.githubusercontent.com/u/54392431?v=4?s=100" width="100px;" alt="BenoitMaucotel"/><br /><sub><b>BenoitMaucotel</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=BenoitMaucotel" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/benjisho-aidome"><img src="https://avatars.githubusercontent.com/u/218995725?v=4?s=100" width="100px;" alt="benjisho-aidome"/><br /><sub><b>benjisho-aidome</b></sub></a><br /><a href="#agents-benjisho-aidome" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#instructions-benjisho-aidome" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-benjisho-aidome" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yukiomoto"><img src="https://avatars.githubusercontent.com/u/38450410?v=4?s=100" width="100px;" alt="Yuki Omoto"/><br /><sub><b>Yuki Omoto</b></sub></a><br /><a href="#instructions-yukiomoto" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wschultz-boxboat"><img src="https://avatars.githubusercontent.com/u/110492948?v=4?s=100" width="100px;" alt="Will Schultz"/><br /><sub><b>Will Schultz</b></sub></a><br /><a href="#agents-wschultz-boxboat" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://bio.warengonzaga.com/"><img src="https://avatars.githubusercontent.com/u/15052701?v=4?s=100" width="100px;" alt="Waren Gonzaga"/><br /><sub><b>Waren Gonzaga</b></sub></a><br /><a href="#agents-warengonzaga" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linktr.ee/vincentkoc"><img src="https://avatars.githubusercontent.com/u/25068?v=4?s=100" width="100px;" alt="Vincent Koc"/><br /><sub><b>Vincent Koc</b></sub></a><br /><a href="#agents-vincentkoc" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vaporjawn"><img src="https://avatars.githubusercontent.com/u/15694665?v=4?s=100" width="100px;" alt="Victor Williams"/><br /><sub><b>Victor Williams</b></sub></a><br /><a href="#agents-Vaporjawn" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://vesharma.dev/"><img src="https://avatars.githubusercontent.com/u/62218708?v=4?s=100" width="100px;" alt="Ve Sharma"/><br /><sub><b>Ve Sharma</b></sub></a><br /><a href="#agents-VeVarunSharma" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.ferryhopper.com/"><img src="https://avatars.githubusercontent.com/u/19361558?v=4?s=100" width="100px;" alt="Vasileios Lahanas"/><br /><sub><b>Vasileios Lahanas</b></sub></a><br /><a href="#instructions-vlahanas" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://tinyurl.com/3p5j9mwe"><img src="https://avatars.githubusercontent.com/u/9591887?v=4?s=100" width="100px;" alt="Udaya Veeramreddygari"/><br /><sub><b>Udaya Veeramreddygari</b></sub></a><br /><a href="#instructions-udayakumarreddyv" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/iletai"><img src="https://avatars.githubusercontent.com/u/26614687?v=4?s=100" width="100px;" alt="Tài Lê"/><br /><sub><b>Tài Lê</b></sub></a><br /><a href="#prompts-iletai" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tsubasaogawa.me/"><img src="https://avatars.githubusercontent.com/u/7788821?v=4?s=100" width="100px;" alt="Tsubasa Ogawa"/><br /><sub><b>Tsubasa Ogawa</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=tsubasaogawa" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://glsauto.com/"><img src="https://avatars.githubusercontent.com/u/132710946?v=4?s=100" width="100px;" alt="Troy Witthoeft (glsauto)"/><br /><sub><b>Troy Witthoeft (glsauto)</b></sub></a><br /><a href="#instructions-twitthoeft-gls" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jfversluis.dev/"><img src="https://avatars.githubusercontent.com/u/939291?v=4?s=100" width="100px;" alt="Gerald Versluis"/><br /><sub><b>Gerald Versluis</b></sub></a><br /><a href="#instructions-jfversluis" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/geoder101"><img src="https://avatars.githubusercontent.com/u/145904?v=4?s=100" width="100px;" alt="George Dernikos"/><br /><sub><b>George Dernikos</b></sub></a><br /><a href="#prompts-geoder101" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gautambaghel"><img src="https://avatars.githubusercontent.com/u/22324290?v=4?s=100" width="100px;" alt="Gautam"/><br /><sub><b>Gautam</b></sub></a><br /><a href="#agents-gautambaghel" title="Specialized agents for GitHub Copilot">🎭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/feapaydin"><img src="https://avatars.githubusercontent.com/u/19946639?v=4?s=100" width="100px;" alt="Furkan Enes"/><br /><sub><b>Furkan Enes</b></sub></a><br /><a href="#instructions-feapaydin" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/fmuecke"><img src="https://avatars.githubusercontent.com/u/7921024?v=4?s=100" width="100px;" alt="Florian Mücke"/><br /><sub><b>Florian Mücke</b></sub></a><br /><a href="#agents-fmuecke" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.felixarjuna.dev/"><img src="https://avatars.githubusercontent.com/u/79026094?v=4?s=100" width="100px;" alt="Felix Arjuna"/><br /><sub><b>Felix Arjuna</b></sub></a><br /><a href="#instructions-felixarjuna" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ewega"><img src="https://avatars.githubusercontent.com/u/26189114?v=4?s=100" width="100px;" alt="Eldrick Wega"/><br /><sub><b>Eldrick Wega</b></sub></a><br /><a href="#prompts-ewega" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danchev"><img src="https://avatars.githubusercontent.com/u/12420863?v=4?s=100" width="100px;" alt="Dobri Danchev"/><br /><sub><b>Dobri Danchev</b></sub></a><br /><a href="#prompts-danchev" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dgamboa.com/"><img src="https://avatars.githubusercontent.com/u/7052267?v=4?s=100" width="100px;" alt="Diego Gamboa"/><br /><sub><b>Diego Gamboa</b></sub></a><br /><a href="#prompts-difegam" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/derekclair"><img src="https://avatars.githubusercontent.com/u/5247629?v=4?s=100" width="100px;" alt="Derek Clair"/><br /><sub><b>Derek Clair</b></sub></a><br /><a href="#agents-derekclair" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-derekclair" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://dev.to/davidortinau"><img src="https://avatars.githubusercontent.com/u/41873?v=4?s=100" width="100px;" alt="David Ortinau"/><br /><sub><b>David Ortinau</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=davidortinau" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danielabbatt"><img src="https://avatars.githubusercontent.com/u/8926756?v=4?s=100" width="100px;" alt="Daniel Abbatt"/><br /><sub><b>Daniel Abbatt</b></sub></a><br /><a href="#instructions-danielabbatt" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CypherHK"><img src="https://avatars.githubusercontent.com/u/230935834?v=4?s=100" width="100px;" alt="CypherHK"/><br /><sub><b>CypherHK</b></sub></a><br /><a href="#agents-CypherHK" title="Specialized agents for GitHub Copilot">🎭</a> <a href="#prompts-CypherHK" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/craigbekker"><img src="https://avatars.githubusercontent.com/u/1115912?v=4?s=100" width="100px;" alt="Craig Bekker"/><br /><sub><b>Craig Bekker</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=craigbekker" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.peug.net/"><img src="https://avatars.githubusercontent.com/u/3845786?v=4?s=100" width="100px;" alt="Christophe Peugnet"/><br /><sub><b>Christophe Peugnet</b></sub></a><br /><a href="#instructions-tossnet" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lechnerc77"><img src="https://avatars.githubusercontent.com/u/22294087?v=4?s=100" width="100px;" alt="Christian Lechner"/><br /><sub><b>Christian Lechner</b></sub></a><br /><a href="#instructions-lechnerc77" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/charris-msft"><img src="https://avatars.githubusercontent.com/u/74415662?v=4?s=100" width="100px;" alt="Chris Harris"/><br /><sub><b>Chris Harris</b></sub></a><br /><a href="#agents-charris-msft" title="Specialized agents for GitHub Copilot">🎭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/artemsaveliev"><img src="https://avatars.githubusercontent.com/u/15679218?v=4?s=100" width="100px;" alt="Artem Saveliev"/><br /><sub><b>Artem Saveliev</b></sub></a><br /><a href="#instructions-artemsaveliev" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://javaetmoi.com/"><img src="https://avatars.githubusercontent.com/u/838318?v=4?s=100" width="100px;" alt="Antoine Rey"/><br /><sub><b>Antoine Rey</b></sub></a><br /><a href="#prompts-arey" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/PiKa919"><img src="https://avatars.githubusercontent.com/u/96786190?v=4?s=100" width="100px;" alt="Ankit Das"/><br /><sub><b>Ankit Das</b></sub></a><br /><a href="#instructions-PiKa919" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alineavila"><img src="https://avatars.githubusercontent.com/u/24813256?v=4?s=100" width="100px;" alt="Aline Ávila"/><br /><sub><b>Aline Ávila</b></sub></a><br /><a href="#instructions-alineavila" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/martin-cod"><img src="https://avatars.githubusercontent.com/u/33550246?v=4?s=100" width="100px;" alt="Alexander Martinkevich"/><br /><sub><b>Alexander Martinkevich</b></sub></a><br /><a href="#agents-martin-cod" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/aldunchev"><img src="https://avatars.githubusercontent.com/u/4631021?v=4?s=100" width="100px;" alt="Aleksandar Dunchev"/><br /><sub><b>Aleksandar Dunchev</b></sub></a><br /><a href="#agents-aldunchev" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.qreate.it/"><img src="https://avatars.githubusercontent.com/u/1868590?v=4?s=100" width="100px;" alt="Alan Sprecacenere"/><br /><sub><b>Alan Sprecacenere</b></sub></a><br /><a href="#instructions-tegola" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/akashxlr8"><img src="https://avatars.githubusercontent.com/u/58072860?v=4?s=100" width="100px;" alt="Akash Kumar Shaw"/><br /><sub><b>Akash Kumar Shaw</b></sub></a><br /><a href="#instructions-akashxlr8" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abdidaudpropel"><img src="https://avatars.githubusercontent.com/u/51310019?v=4?s=100" width="100px;" alt="Abdi Daud"/><br /><sub><b>Abdi Daud</b></sub></a><br /><a href="#agents-abdidaudpropel" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AIAlchemyForge"><img src="https://avatars.githubusercontent.com/u/253636689?v=4?s=100" width="100px;" alt="AIAlchemyForge"/><br /><sub><b>AIAlchemyForge</b></sub></a><br /><a href="#instructions-AIAlchemyForge" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/4regab"><img src="https://avatars.githubusercontent.com/u/178603515?v=4?s=100" width="100px;" alt="4regab"/><br /><sub><b>4regab</b></sub></a><br /><a href="#instructions-4regab" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MiguelElGallo"><img src="https://avatars.githubusercontent.com/u/60221874?v=4?s=100" width="100px;" alt="Miguel P Z"/><br /><sub><b>Miguel P Z</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=MiguelElGallo" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://a11ysupport.io/"><img src="https://avatars.githubusercontent.com/u/498678?v=4?s=100" width="100px;" alt="Michael Fairchild"/><br /><sub><b>Michael Fairchild</b></sub></a><br /><a href="#instructions-mfairchild365" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/michael-volz/"><img src="https://avatars.githubusercontent.com/u/129928?v=4?s=100" width="100px;" alt="Michael A. Volz (Flynn)"/><br /><sub><b>Michael A. Volz (Flynn)</b></sub></a><br /><a href="#prompts-michaelvolz" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Mike-Hanna"><img src="https://avatars.githubusercontent.com/u/50142889?v=4?s=100" width="100px;" alt="Michael"/><br /><sub><b>Michael</b></sub></a><br /><a href="#instructions-Mike-Hanna" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.mehmetalierol.com/"><img src="https://avatars.githubusercontent.com/u/16721723?v=4?s=100" width="100px;" alt="Mehmet Ali EROL"/><br /><sub><b>Mehmet Ali EROL</b></sub></a><br /><a href="#agents-mehmetalierol" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://maxprilutskiy.com/"><img src="https://avatars.githubusercontent.com/u/5614659?v=4?s=100" width="100px;" alt="Max Prilutskiy"/><br /><sub><b>Max Prilutskiy</b></sub></a><br /><a href="#agents-maxprilutskiy" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mbianchidev"><img src="https://avatars.githubusercontent.com/u/37507190?v=4?s=100" width="100px;" alt="Matteo Bianchi"/><br /><sub><b>Matteo Bianchi</b></sub></a><br /><a href="#agents-mbianchidev" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://marknoble.com/"><img src="https://avatars.githubusercontent.com/u/3819700?v=4?s=100" width="100px;" alt="Mark Noble"/><br /><sub><b>Mark Noble</b></sub></a><br /><a href="#agents-marknoble" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ManishJayaswal"><img src="https://avatars.githubusercontent.com/u/9527491?v=4?s=100" width="100px;" alt="Manish Jayaswal"/><br /><sub><b>Manish Jayaswal</b></sub></a><br /><a href="#agents-ManishJayaswal" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linktr.ee/lukemurray"><img src="https://avatars.githubusercontent.com/u/24467442?v=4?s=100" width="100px;" alt="Luke Murray"/><br /><sub><b>Luke Murray</b></sub></a><br /><a href="#agents-lukemurraynz" title="Specialized agents for GitHub Copilot">🎭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/LouellaCreemers"><img src="https://avatars.githubusercontent.com/u/46204894?v=4?s=100" width="100px;" alt="Louella Creemers"/><br /><sub><b>Louella Creemers</b></sub></a><br /><a href="#instructions-LouellaCreemers" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/saikoumudi"><img src="https://avatars.githubusercontent.com/u/22682497?v=4?s=100" width="100px;" alt="Sai Koumudi Kaluvakolanu"/><br /><sub><b>Sai Koumudi Kaluvakolanu</b></sub></a><br /><a href="#agents-saikoumudi" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/whiteken"><img src="https://avatars.githubusercontent.com/u/20211937?v=4?s=100" width="100px;" alt="Kenny White"/><br /><sub><b>Kenny White</b></sub></a><br /><a href="#instructions-whiteken" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/KaloyanGenev"><img src="https://avatars.githubusercontent.com/u/42644424?v=4?s=100" width="100px;" alt="KaloyanGenev"/><br /><sub><b>KaloyanGenev</b></sub></a><br /><a href="#agents-KaloyanGenev" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ranrar"><img src="https://avatars.githubusercontent.com/u/95967772?v=4?s=100" width="100px;" alt="Kim Skov Rasmussen"/><br /><sub><b>Kim Skov Rasmussen</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=Ranrar" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.julien-dubois.com/"><img src="https://avatars.githubusercontent.com/u/316835?v=4?s=100" width="100px;" alt="Julien Dubois"/><br /><sub><b>Julien Dubois</b></sub></a><br /><a href="#prompts-jdubois" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://digio.es/"><img src="https://avatars.githubusercontent.com/u/173672918?v=4?s=100" width="100px;" alt="José Antonio Garrido"/><br /><sub><b>José Antonio Garrido</b></sub></a><br /><a href="#instructions-josegarridodigio" title="Custom instructions for GitHub Copilot">🧭</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.sugbo4j.co.nz/"><img src="https://avatars.githubusercontent.com/u/15100839?v=4?s=100" width="100px;" alt="Joseph Gonzales"/><br /><sub><b>Joseph Gonzales</b></sub></a><br /><a href="#instructions-josephgonzales01" title="Custom instructions for GitHub Copilot">🧭</a> <a href="#prompts-josephgonzales01" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yortch"><img src="https://avatars.githubusercontent.com/u/4576246?v=4?s=100" width="100px;" alt="Jorge Balderas"/><br /><sub><b>Jorge Balderas</b></sub></a><br /><a href="#instructions-yortch" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://johnpapa.net/"><img src="https://avatars.githubusercontent.com/u/1202528?v=4?s=100" width="100px;" alt="John Papa"/><br /><sub><b>John Papa</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=johnpapa" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.johnlokerse.dev/"><img src="https://avatars.githubusercontent.com/u/3514513?v=4?s=100" width="100px;" alt="John"/><br /><sub><b>John</b></sub></a><br /><a href="#agents-johnlokerse" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://joe-watkins.io/"><img src="https://avatars.githubusercontent.com/u/3695795?v=4?s=100" width="100px;" alt="Joe Watkins"/><br /><sub><b>Joe Watkins</b></sub></a><br /><a href="#instructions-joe-watkins" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jan-v.nl/"><img src="https://avatars.githubusercontent.com/u/462356?v=4?s=100" width="100px;" alt="Jan de Vries"/><br /><sub><b>Jan de Vries</b></sub></a><br /><a href="#agents-Jandev" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nohwnd"><img src="https://avatars.githubusercontent.com/u/5735905?v=4?s=100" width="100px;" alt="Jakub Jareš"/><br /><sub><b>Jakub Jareš</b></sub></a><br /><a href="#prompts-nohwnd" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jaxn"><img src="https://avatars.githubusercontent.com/u/29095?v=4?s=100" width="100px;" alt="Jackson Miller"/><br /><sub><b>Jackson Miller</b></sub></a><br /><a href="#instructions-jaxn" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ioana37"><img src="https://avatars.githubusercontent.com/u/69301842?v=4?s=100" width="100px;" alt="Ioana A"/><br /><sub><b>Ioana A</b></sub></a><br /><a href="#instructions-Ioana37" title="Custom instructions for GitHub Copilot">🧭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hunterhogan"><img src="https://avatars.githubusercontent.com/u/2958419?v=4?s=100" width="100px;" alt="Hunter Hogan"/><br /><sub><b>Hunter Hogan</b></sub></a><br /><a href="#agents-hunterhogan" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hashimwarren"><img src="https://avatars.githubusercontent.com/u/6027587?v=4?s=100" width="100px;" alt="Hashim Warren"/><br /><sub><b>Hashim Warren</b></sub></a><br /><a href="#agents-hashimwarren" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Arggon"><img src="https://avatars.githubusercontent.com/u/20962238?v=4?s=100" width="100px;" alt="Gonzalo"/><br /><sub><b>Gonzalo</b></sub></a><br /><a href="#prompts-Arggon" title="Reusable prompts for GitHub Copilot">⌨️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hachyderm.io/@0gis0"><img src="https://avatars.githubusercontent.com/u/175379?v=4?s=100" width="100px;" alt="Gisela Torres"/><br /><sub><b>Gisela Torres</b></sub></a><br /><a href="#agents-0GiS0" title="Specialized agents for GitHub Copilot">🎭</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/shibicr93"><img src="https://avatars.githubusercontent.com/u/6803434?v=4?s=100" width="100px;" alt="Shibi Ramachandran"/><br /><sub><b>Shibi Ramachandran</b></sub></a><br /><a href="https://github.com/github/awesome-copilot/commits?author=shibicr93" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide

## ™️ Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
