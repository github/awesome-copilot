# Microsoft Agent Framework — Best Practices for Hosted Agents

Best practices when building hosted agents with Microsoft Agent Framework for deployment to Foundry Agent Service.

## Official Resources

| Resource | URL |
|----------|-----|
| **GitHub Repo** | https://github.com/microsoft/agent-framework |
| **MS Learn Overview** | https://learn.microsoft.com/agent-framework/overview/agent-framework-overview |
| **Quick Start** | https://learn.microsoft.com/agent-framework/tutorials/quick-start |
| **User Guide** | https://learn.microsoft.com/agent-framework/user-guide/overview |
| **Hosted Agents Concepts** | https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents |
| **Python Samples (MAF repo)** | https://github.com/microsoft/agent-framework/tree/main/python/samples |
| **.NET Samples (MAF repo)** | https://github.com/microsoft/agent-framework/tree/main/dotnet/samples |
| **PyPI** | https://pypi.org/project/agent-framework/ |
| **NuGet** | https://www.nuget.org/profiles/MicrosoftAgentFramework/ |

## Installation

**Python:** `pip install agent-framework --pre` (installs all sub-packages)

**.NET:** `dotnet add package Microsoft.Agents.AI`

> ⚠️ **Warning:** Always pin specific pre-release versions. Use `--pre` to get the latest. Check the [PyPI page](https://pypi.org/project/agent-framework/) or [NuGet profile](https://www.nuget.org/profiles/MicrosoftAgentFramework/) for current stable versions.

## Hosting Adapter

Hosted agents must expose an HTTP server using the hosting adapter. This enables local testing and Foundry deployment with the same code.

**Python adapter packages:** `azure-ai-agentserver-core`, `azure-ai-agentserver-agentframework`

**.NET adapter packages:** `Azure.AI.AgentServer.Core`, `Azure.AI.AgentServer.AgentFramework`

The adapter handles protocol translation between Foundry request/response formats and your framework's native data structures, including conversation management, message serialization, and streaming.

> 💡 **Tip:** Make HTTP server mode the default entrypoint (no flags needed). This simplifies both local debugging and containerized deployment.

## Key Patterns

### Python: Async Credentials

For **local development**, use `DefaultAzureCredential` from `azure.identity.aio` (not `azure.identity`) — `AzureAIClient` requires async credentials. In production, use `ManagedIdentityCredential` from `azure.identity.aio`. See [auth-best-practices.md](../../../references/auth-best-practices.md).

### Python: Environment Variables

Always use `load_dotenv(override=False)` so environment variables set by Foundry at runtime take precedence over local `.env` values.

Required `.env` variables:
- `FOUNDRY_PROJECT_ENDPOINT` — project endpoint URL
- `FOUNDRY_MODEL_DEPLOYMENT_NAME` — model deployment name

### Authentication

If explicitly asked to use API key instead of managed identity, then use AzureOpenAIResponsesClient and pass in api_key parameter to it.

### Agent Naming Rules

Agent names must: start/end with alphanumeric characters, may contain hyphens in the middle, max 63 characters. Examples: `MyAgent`, `agent-1`. Invalid: `-agent`, `agent-`, `sample_agent`.

### Python: Virtual Environment

Always use a virtual environment. Never use bare `python` or `pip` — use venv-activated versions or full paths (e.g., `.venv/bin/pip`).

## Workflow Patterns

Agent Framework supports single-agent and multi-agent workflow patterns using graph-based orchestration:

- **Single Agent** — Basic agent with tools, RAG, or MCP integration
- **Multi-Agent Workflow** — Graph-based orchestration connecting multiple agents and deterministic functions
- **Advanced Patterns** — Reflection, switch-case, fan-out/fan-in, loop, human-in-the-loop

For workflow samples and advanced patterns, search the [Agent Framework GitHub repo](https://github.com/microsoft/agent-framework).

## Debugging

Use [AI Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-windows-ai-studio.windows-ai-studio) with the `agentdev` CLI tool for interactive debugging:

1. Install `debugpy` for VS Code Python Debugger support
2. Install `agent-dev-cli` (pre-release) for the `agentdev` command
3. Key debug tasks: `agentdev run <entrypoint>.py --port 8087` starts the agent HTTP server, `debugpy --listen 127.0.0.1:5679` attaches the debugger, and the `ai-mlstudio.openTestTool` VS Code command opens the Agent Inspector UI

For VS Code `launch.json` and `tasks.json` configuration templates, see [AI Toolkit Agent Inspector — Configure debugging manually](https://github.com/microsoft/vscode-ai-toolkit/blob/main/doc/agent-test-tool.md#configure-debugging-manually).

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError` | Missing SDK | `pip install agent-framework --pre` in venv |
| Async credential error | Wrong import | Use `azure.identity.aio.DefaultAzureCredential` (local dev) or `azure.identity.aio.ManagedIdentityCredential` (production) |
| Agent name validation error | Invalid characters | Use alphanumeric + hyphens, start/end alphanumeric, max 63 chars |
| Hosting adapter not found | Missing package | Install `azure-ai-agentserver-agentframework` |
