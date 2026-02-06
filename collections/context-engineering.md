# Context Engineering

Tools and techniques for maximizing GitHub Copilot effectiveness through better context management. Includes guidelines for structuring code, an agent for planning multi-file changes, and prompts for context-aware development.

**Tags:** context, productivity, refactoring, best-practices, architecture

## Items in this Collection

| Title | Type | Description | MCP Servers |
| ----- | ---- | ----------- | ----------- |
| [Context Engineering](../instructions/context-engineering.instructions.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/instructions?url=vscode%3Achat-instructions%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Finstructions%2Fcontext-engineering.instructions.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/instructions?url=vscode-insiders%3Achat-instructions%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Finstructions%2Fcontext-engineering.instructions.md) | Instruction | Guidelines for structuring code and projects to maximize GitHub Copilot effectiveness through better context management |  |
| [Context Architect](../agents/context-architect.agent.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fcontext-architect.agent.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/agent?url=vscode-insiders%3Achat-agent%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fagents%2Fcontext-architect.agent.md) | Agent | An agent that helps plan and execute multi-file changes by identifying relevant context and dependencies [see usage](#context-architect) |  |
| [Context Map](../prompts/context-map.prompt.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Fcontext-map.prompt.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode-insiders%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Fcontext-map.prompt.md) | Prompt | Generate a map of all files relevant to a task before making changes [see usage](#context-map) |  |
| [What Context Do You Need?](../prompts/what-context-needed.prompt.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Fwhat-context-needed.prompt.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode-insiders%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Fwhat-context-needed.prompt.md) | Prompt | Ask Copilot what files it needs to see before answering a question [see usage](#what-context-do-you-need?) |  |
| [Refactor Plan](../prompts/refactor-plan.prompt.md)<br />[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Frefactor-plan.prompt.md)<br />[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://aka.ms/awesome-copilot/install/prompt?url=vscode-insiders%3Achat-prompt%2Finstall%3Furl%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2Fgithub%2Fawesome-copilot%2Fmain%2Fprompts%2Frefactor-plan.prompt.md) | Prompt | Plan a multi-file refactor with proper sequencing and rollback steps [see usage](#refactor-plan) |  |

## Collection Usage

### Context Architect

recommended

The Context Architect agent helps plan multi-file changes by mapping dependencies
and identifying all relevant files before making modifications.

Use this agent when:
- Planning refactors that span multiple files
- Adding features that touch several modules
- Investigating unfamiliar parts of the codebase

Example usage:
```
@context-architect I need to add rate limiting to all API endpoints.
What files are involved and what's the best approach?
```

For best results:
- Describe the high-level goal, not just the immediate task
- Let the agent search before you provide files
- Review the context map before approving changes

---

### Context Map

optional

Use before any significant change to understand the blast radius.
Produces a structured map of files, dependencies, and tests.

---

### What Context Do You Need?

optional

Use when Copilot gives a generic or incorrect answer.
Asks Copilot to explicitly list what files it needs to see.

---

### Refactor Plan

optional

Use for multi-file refactors. Produces a phased plan with
verification steps and rollback procedures.

---

*This collection includes 5 curated items for **Context Engineering**.*