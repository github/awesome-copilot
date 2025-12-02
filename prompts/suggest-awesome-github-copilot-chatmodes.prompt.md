---
agent: 'agent'
description: 'Suggest relevant GitHub Copilot Custom Chat Modes files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing custom chat modes in this repository.'
tools: ['edit', 'search', 'runCommands', 'runTasks', 'think', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'todos', 'search']
---

# Suggest Awesome GitHub Copilot Custom Chat Modes

Analyze current repository context and suggest relevant Custom Chat Modes files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.chatmodes.md) that are not already available in this repository. Custom Chat Mode files are located in the [chatmodes](https://github.com/github/awesome-copilot/tree/main/chatmodes) folder of the awesome-copilot repository.

## Process

1. **Fetch Available Custom Chat Modes**: Extract Custom Chat Modes list and descriptions from [awesome-copilot README.chatmodes.md](https://github.com/github/awesome-copilot/blob/main/docs/README.chatmodes.md). Must use `#fetch` tool.
2. **Scan Local Custom Chat Modes**: Discover existing custom chat mode files in `.github/agents/` folder
3. **Extract Descriptions**: Read front matter from local custom chat mode files to get descriptions
4. **Analyze Context**: Review chat history, repository files, and current project needs
5. **Compare Existing**: Check against custom chat modes already available in this repository
6. **Match Relevance**: Compare available custom chat modes against identified patterns and requirements
7. **Present Options**: Display relevant custom chat modes with descriptions, rationale, and availability status
8. **Validate**: Ensure suggested chatmodes would add value not already covered by existing chatmodes
9. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot custom chat modes and similar local custom chat modes
   **AWAIT** user request to proceed with installation of specific custom chat modes. DO NOT INSTALL UNLESS DIRECTED TO DO SO.
10. **Download Assets**: For requested chat modes, automatically download and install individual chat modes to `.github/agents/` folder. Do NOT adjust content of the files. Use `#todos` tool to track progress. Prioritize use of `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved.

## Context Analysis Criteria

🔍 **Repository Patterns**:
- Programming languages used (.cs, .js, .py, etc.)
- Framework indicators (ASP.NET, React, Azure, etc.)
- Project types (web apps, APIs, libraries, tools)
- Documentation needs (README, specs, ADRs)

🗨️ **Chat History Context**:
- Recent discussions and pain points
- Feature requests or implementation needs
- Code review patterns
- Development workflow requirements

## Output Format

Display analysis results in structured table comparing awesome-copilot custom chat modes with existing repository custom chat modes:

| Awesome-Copilot Custom Chat Mode | Description | Already Installed | Similar Local Custom Chat Mode | Suggestion Rationale |
|---------------------------|-------------|-------------------|-------------------------|---------------------|
| [code-reviewer.agent.md](https://github.com/github/awesome-copilot/blob/main/agents/code-reviewer.agent.md) | Specialized code review custom chat mode | ❌ No | None | Would enhance development workflow with dedicated code review assistance |
| [architect.agent.md](https://github.com/github/awesome-copilot/blob/main/agents/architect.agent.md) | Software architecture guidance | ✅ Yes | azure_principal_architect.agent.md | Already covered by existing architecture custom chat modes |
| [debugging-expert.agent.md](https://github.com/github/awesome-copilot/blob/main/agents/debugging-expert.agent.md) | Debug assistance custom chat mode | ❌ No | None | Could improve troubleshooting efficiency for development team |

## Local Chatmodes Discovery Process

1. List all `*.agent.md` files in `.github/agents/` directory
2. For each discovered file, read front matter to extract `description`
3. Build comprehensive inventory of existing chatmodes
4. Use this inventory to avoid suggesting duplicates

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository chatmodes folder
- Scan local file system for existing chatmodes in `.github/agents/` directory
- Read YAML front matter from local chatmode files to extract descriptions
- Compare against existing chatmodes in this repository to avoid duplicates
- Focus on gaps in current chatmode library coverage
- Validate that suggested chatmodes align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot chatmodes and similar local chatmodes
- Don't provide any additional information or context beyond the table and the analysis

## Icons Reference

- ✅ Already installed in repo
- ❌ Not installed in repo
