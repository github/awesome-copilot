---
agent: "agent"
description: "Suggest relevant GitHub Copilot Custom Agents files from the awesome-copilot repository based on current repository context and chat history, avoiding duplicates with existing custom agents in this repository."
tools: ["edit", "search", "runCommands", "runTasks", "changes", "testFailure", "openSimpleBrowser", "fetch", "githubRepo", "todos"]
---

# Suggest Awesome GitHub Copilot Custom Agents

Analyze current repository context and suggest relevant Custom Agents files from the [GitHub awesome-copilot repository](https://github.com/github/awesome-copilot/blob/main/docs/README.agents.md) that are not already available in this repository. Custom Agent files are located in the [agents](https://github.com/github/awesome-copilot/tree/main/agents) folder of the awesome-copilot repository.

## Process

1. **Fetch Available Custom Agents**: Extract Custom Agents list and descriptions from [awesome-copilot README.agents.md](https://github.com/github/awesome-copilot/blob/main/docs/README.agents.md). Must use `fetch` tool.
2. **Scan Local Custom Agents**: Discover existing custom agent files in `.github/agents/` folder
3. **Extract Descriptions**: Read front matter from local custom agent files to get descriptions
4. **Analyze Context**: Review chat history, repository files, and current project needs
5. **Compare Existing**: Check against custom agents already available in this repository
6. **Match Relevance**: Compare available custom agents against identified patterns and requirements
7. **Present Options**: Display relevant custom agents with descriptions, rationale, and availability status
8. **Validate**: Ensure suggested agents would add value not already covered by existing agents
9. **Output**: Provide structured table with suggestions, descriptions, and links to both awesome-copilot custom agents and similar local custom agents
   **AWAIT** user request to proceed with installation of specific custom agents. DO NOT INSTALL UNLESS DIRECTED TO DO SO.
10. **Download Assets**: For requested agents, automatically download and install individual agents to `.github/agents/` folder. Do NOT adjust content of the files. Use `#todos` tool to track progress. Prioritize use of `#fetch` tool to download assets, but may use `curl` using `#runInTerminal` tool to ensure all content is retrieved.

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

Display analysis results in structured table comparing awesome-copilot custom agents with existing repository custom agents:

| Awesome-Copilot Custom Agent                                                                                                                            | Description                                                                                                                                                                | Already Installed | Similar Local Custom Agent         | Suggestion Rationale                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------- | ------------------------------------------------------------- |
| [amplitude-experiment-implementation.agent.md](https://github.com/github/awesome-copilot/blob/main/agents/amplitude-experiment-implementation.agent.md) | This custom agent uses Amplitude's MCP tools to deploy new experiments inside of Amplitude, enabling seamless variant testing capabilities and rollout of product features | ❌ No             | None                               | Would enhance experimentation capabilities within the product |
| [launchdarkly-flag-cleanup.agent.md](https://github.com/github/awesome-copilot/blob/main/agents/launchdarkly-flag-cleanup.agent.md)                     | Feature flag cleanup agent for LaunchDarkly                                                                                                                                | ✅ Yes            | launchdarkly-flag-cleanup.agent.md | Already covered by existing LaunchDarkly custom agents        |

## Local Agent Discovery Process

1. List all `*.agent.md` files in `.github/agents/` directory
2. For each discovered file, read front matter to extract `description`
3. Build comprehensive inventory of existing agents
4. Use this inventory to avoid suggesting duplicates

## Requirements

- Use `githubRepo` tool to get content from awesome-copilot repository agents folder
- Scan local file system for existing agents in `.github/agents/` directory
- Read YAML front matter from local agent files to extract descriptions
- Compare against existing agents in this repository to avoid duplicates
- Focus on gaps in current agent library coverage
- Validate that suggested agents align with repository's purpose and standards
- Provide clear rationale for each suggestion
- Include links to both awesome-copilot agents and similar local agents
- Don't provide any additional information or context beyond the table and the analysis

## Icons Reference

- ✅ Already installed in repo
- ❌ Not installed in repo
