# Create Project

Scaffold a new Microsoft 365 agent or Teams app from an ATK template.

## Template Selection Guide

| User Wants | Capability |
|------------|------------|
| Extend M365 Copilot with custom instructions | `declarative-agent` |
| Declarative Agent with new API | `declarative-agent-action` |
| Declarative Agent with new API (Bearer Token) | `declarative-agent-action-bearer` |
| Declarative Agent with new API (OAuth) | `declarative-agent-action-oauth` |
| Declarative Agent with existing OpenAPI spec | `declarative-agent-action-from-existing-api` |
| Connect MCP Server to Copilot | `declarative-agent-with-action-from-mcp` |
| Declarative Agent with Copilot Connector | `declarative-agent-with-graph-connector` |
| Declarative Agent for MetaOS | `declarative-agent-meta-os-new-project` |
| Declarative Agent from TypeSpec | `declarative-agent-typespec` |
| Agent with custom LLM (Azure OpenAI, etc.) | `basic-custom-engine-agent` |
| Weather forecast agent | `weather-agent` |
| Agent using Azure AI Foundry | `foundry-agent-to-m365` |
| Teams chatbot with AI | `teams-agent` |
| Teams bot with RAG/knowledge base | `teams-agent-rag-customize` |
| Teams Agent with Azure AI Search | `teams-agent-rag-azure-ai-search` |
| Teams Agent with Custom API | `teams-agent-rag-custom-api` |
| Teams Collaborator Agent | `teams-collaborator-agent` |
| Simple Teams echo bot | `bot` |
| Teams tab app | `tab` |
| Teams message extension | `message-extension` |
| Copilot Connector | `copilot-connector` |

See [../toolkit/templates.md](../toolkit/templates.md) for the complete template catalog with language support and descriptions.

## Creating Projects

Create templates in the current directory with one generic flow:

```bash
# 1) Scaffold into a temporary parent folder
atk new -c <template-id> -n <project-name> -f /tmp -l <language> -i false

# 2) Move generated files from the scaffold subfolder into current directory
mv /tmp/<project-name>/. .

# 3) Remove the empty scaffold folder
rmdir /tmp/<project-name>
```

Common examples:

```bash
# Declarative Agent (no -l needed)
atk new -c declarative-agent -n my-agent -f /tmp -i false

# Declarative Agent with new API
atk new -c declarative-agent-action -l typescript -n my-api-agent -f /tmp -i false

# Declarative Agent with existing OpenAPI spec
atk new -c declarative-agent-action-from-existing-api -n my-agent -a <openapi-spec-url-or-path> -o "GET /repairs" -o "POST /repairs" -f /tmp -i false

# Custom Engine Agent
atk new -c basic-custom-engine-agent -l typescript -n my-cea -f /tmp -i false

# Teams Agent with RAG
atk new -c teams-agent-rag-customize -l typescript -n my-rag-agent -f /tmp -i false
```

PowerShell equivalent:

```powershell
# 1) Scaffold into temporary folder
atk new -c <template-id> -n <project-name> -f $env:TEMP -l <language> -i false

# 2) Move files into current directory
Move-Item "$env:TEMP\<project-name>\*" .
Move-Item "$env:TEMP\<project-name>\.*" . -ErrorAction SilentlyContinue

# 3) Remove scaffold folder
Remove-Item "$env:TEMP\<project-name>" -Force
```

## Creating from Samples

```bash
atk new sample <sample-id>
```

To place sample files in current directory, scaffold first and then move files from the sample output folder into `.` using the same move pattern as above.

| Sample                                            | Sample ID (`atk new sample <sample-id>`) | Tags                                                                                      |
| ------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Langchain Agent with Agent365 SDK in NodeJS       | `agent365-langchain-nodejs`              | Agent365, TS                                                                              |
| Agent Framework Agent with Agent365 SDK in Python | `agent365-agentframework-python`         | Agent365, Python                                                                          |
| OpenAI Agent with Agent365 SDK in Python          | `agent365-openai-python`                 | Agent365, Python                                                                          |
| Claude Agent with Agent365 SDK in NodeJS          | `agent365-claude-nodejs`                 | Agent365, TS                                                                              |
| Tab App with Azure Backend                        | `hello-world-tab-with-backend`           | Tab, TS, Azure Functions, Dev Proxy                                                       |
| Bot App with SSO Enabled                          | `bot-sso`                                | Bot, TS, Adaptive Cards, SSO                                                              |
| Team Central Dashboard                            | `team-central-dashboard`                 | Tab, TS, Azure Functions, SSO                                                             |
| Copilot connector App                             | `copilot-connector-app`                  | Tab, Azure Functions, TS, SSO, Copilot connector                                          |
| Teams Conversation Bot using Python               | `bot-conversation-python`                | Python, Bot, Bot Framework                                                                |
| Teams Messaging Extensions Search using Python    | `msgext-search-python`                   | Python, Message extension, Bot Framework                                                  |
| Travel Agent                                      | `travel-agent`                           | C#, Custom Engine Agent, M365 Copilot Retrieval API, Agents SDK, Agent Framework          |
| Coffee Agent                                      | `coffee-agent`                           | TS, Custom Engine Agent, Adaptive Cards, Microsoft Teams SDK                              |
| Data Analyst Agent v2                             | `data-analyst-agent-v2`                  | TS, Custom Engine Agent, Data Visualization, Adaptive Cards, LLM SQL, Microsoft Teams SDK |

List all samples with `atk list samples`.

## Notes

- `declarative-agent` does NOT require `-l` language flag
- `declarative-agent-action-from-existing-api` requires `-a` (OpenAPI spec) and `-o` (operation IDs like `"GET /path"`)
- Always use `-i false` for non-interactive scripted creation
- `atk new` can take several minutes — wait for completion (timeout 120000ms+)
- If template/sample already matches the requirement, do not run dependency install by default; continue only when user asks for next steps

## After Scaffolding

Once the project is created:
- To test locally → see [../test-playground/test-playground.md](../test-playground/test-playground.md)
- To understand project files → see [../toolkit/manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)

## Expert Deep Dives

> **Applies to: code-based Teams bots/agents only** (templates: `bot`, `teams-agent*`, `basic-custom-engine-agent`, `weather-agent`, `coffee-agent`, `bot-sso`, `msgext-*`, `tab*`).
>
> Does **not** apply to declarative agents, API plugins, Copilot connectors, or `declarative-agent-*` / `copilot-connector` templates — those have no source code to scaffold against. For those, follow the in-template instructions and the [Microsoft 365 Copilot extensibility docs](https://learn.microsoft.com/microsoft-365-copilot/extensibility/) directly.

For deeper guidance on what `atk new` produces and how to extend it, consult the Teams expert micro-files:

| Topic | Expert |
|---|---|
| Project file layout, `package.json`, `tsconfig.json`, npm scripts, `appPackage/` | [../experts/teams/project.scaffold-files-ts.md](../experts/teams/project.scaffold-files-ts.md) |
| `App` constructor, plugins, credentials, runtime initialization | [../experts/teams/runtime.app-init-ts.md](../experts/teams/runtime.app-init-ts.md) |
| Teams app manifest schema, scopes, bots/composeExtensions/staticTabs | [../experts/teams/runtime.manifest-ts.md](../experts/teams/runtime.manifest-ts.md) |
| Routing handlers (`app.on('message')`, activity types, invokes) | [../experts/teams/runtime.routing-handlers-ts.md](../experts/teams/runtime.routing-handlers-ts.md) |
