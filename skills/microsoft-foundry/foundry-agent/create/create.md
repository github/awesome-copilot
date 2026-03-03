# Create Hosted Agent Application

Create new hosted agent applications for Microsoft Foundry, or convert existing agent projects to be Foundry-compatible using the hosting adapter.

## Quick Reference

| Property | Value |
|----------|-------|
| **Samples Repo** | `microsoft-foundry/foundry-samples` |
| **Python Samples** | `samples/python/hosted-agents/{framework}/` |
| **C# Samples** | `samples/csharp/hosted-agents/{framework}/` |
| **Hosted Agents Docs** | https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents |
| **Best For** | Creating new or converting existing agent projects for Foundry |

## When to Use This Skill

- Create a new hosted agent application from scratch (greenfield)
- Start from an official sample and customize it
- Convert an existing agent project to be Foundry-compatible (brownfield)
- Help user choose a framework or sample for their agent

## Workflow

### Step 1: Determine Scenario

Check the user's workspace for existing agent project indicators:

- **No agent-related code found** → **Greenfield**. Proceed to Greenfield Workflow (Step 2).
- **Existing agent code present** → **Brownfield**. Proceed to Brownfield Workflow.

### Step 2: Gather Requirements (Greenfield)

If the user hasn't already specified, use `ask_user` to collect:

**Framework:**

| Framework | Python Path | C# Path |
|-----------|------------|---------|
| Microsoft Agent Framework (default) | `agent-framework` | `AgentFramework` |
| LangGraph | `langgraph` | ❌ Python only |
| Custom | `custom` | `AgentWithCustomFramework` |

**Language:** Python (default) or C#.

> ⚠️ **Warning:** LangGraph is Python-only. For C# + LangGraph, suggest Agent Framework or Custom instead.

If user has no specific preference, suggest Microsoft Agent Framework + Python as defaults.

### Step 3: Browse and Select Sample

List available samples using the GitHub API:

```
GET https://api.github.com/repos/microsoft-foundry/foundry-samples/contents/samples/{language}/hosted-agents/{framework}
```

If the user has specified any information on what they want their agent to do, just choose the most relevant or most simple sample to start with. Only if user has not given any preferences, present the sample directories to the user and help them choose based on their requirements (e.g., RAG, tools, multi-agent workflows, HITL).

### Step 4: Download Sample Files

Download only the selected sample directory — do NOT clone the entire repo. Preserve the directory structure by creating subdirectories as needed.

**Using `gh` CLI (preferred if available):**
```bash
gh api repos/microsoft-foundry/foundry-samples/contents/samples/{language}/hosted-agents/{framework}/{sample} \
  --jq '.[] | select(.type=="file") | .download_url' | while read url; do
  filepath="${url##*/samples/{language}/hosted-agents/{framework}/{sample}/}"
  mkdir -p "$(dirname "$filepath")"
  curl -sL "$url" -o "$filepath"
done
```

**Using curl (fallback):**
```bash
curl -s "https://api.github.com/repos/microsoft-foundry/foundry-samples/contents/samples/{language}/hosted-agents/{framework}/{sample}" | \
  jq -r '.[] | select(.type=="file") | .path + "\t" + .download_url' | while IFS=$'\t' read path url; do
    relpath="${path#samples/{language}/hosted-agents/{framework}/{sample}/}"
    mkdir -p "$(dirname "$relpath")"
    curl -sL "$url" -o "$relpath"
  done
```

For nested directories, recursively fetch the GitHub contents API for entries where `type == "dir"` and repeat the download for each.

### Step 5: Customize and Implement

1. Read the sample's README.md to understand its structure
2. Read the sample code to understand patterns and dependencies used
3. If using Agent Framework, follow the best practices in [references/agentframework.md](references/agentframework.md)
4. Implement the user's specific requirements on top of the sample
5. Update configuration (`.env`, dependency files) as needed.
6. Ensure the project is in a runnable state

### Step 6: Verify Startup

1. Install dependencies (use virtual environment for Python)
2. Ask user to provide values for .env variables if placeholders were used using `ask_user` tool.
3. Run the main entrypoint
4. Fix startup errors and retry if needed
5. Send a test request to the agent. The agent will support OpenAI Responses schema.
6. Fix any errors from the test request and retry until it succeeds
7. Once startup and test request succeed, stop the server to prevent resource usage

**Guardrails:**
- ✅ Perform real run to catch startup errors
- ✅ Cleanup after verification (stop server)
- ✅ Ignore auth/connection/timeout errors (expected without Azure config)
- ❌ Don't wait for user input or create test scripts

## Brownfield Workflow: Convert Existing Agent to Hosted Agent

Use this workflow when the user has an existing agent project that needs to be made compatible with Foundry hosted agent deployment. The key requirement is wrapping the agent with the appropriate **hosting adapter** package, which converts any agent into an HTTP service compatible with the Foundry Responses API.

### Step B1: Analyze Existing Project

Scan the project to determine:

1. **Language** — Python (look for `requirements.txt`, `pyproject.toml`, `*.py`) or C# (look for `*.csproj`, `*.cs`)
2. **Framework** — Identify which agent framework is in use:

| Indicator | Framework |
|-----------|-----------|
| Imports from `agent_framework` or `Microsoft.Agents.AI` | Microsoft Agent Framework |
| Imports from `langgraph`, `langchain` | LangGraph |
| No recognized framework imports, or other frameworks (e.g., Semantic Kernel, AutoGen) | Custom |

3. **Entry point** — Identify the main script/entrypoint that creates and runs the agent
4. **Agent object** — Identify the agent instance that needs to be wrapped (e.g., a `BaseAgent` subclass, a compiled `StateGraph`, or an existing server/app)

### Step B2: Add Hosting Adapter Dependency

Add the correct adapter package based on framework and language. Get the latest version from the package registry — do not hardcode versions.

**Python adapter packages:**

| Framework | Package |
|-----------|---------|
| Microsoft Agent Framework | `azure-ai-agentserver-agentframework` |
| LangGraph | `azure-ai-agentserver-langgraph` |
| Custom | `azure-ai-agentserver-core` |

**.NET adapter packages:**

| Framework | Package |
|-----------|---------|
| Microsoft Agent Framework | `Azure.AI.AgentServer.AgentFramework` |
| Custom | `Azure.AI.AgentServer.Core` |

Add the package to the project's dependency file (`requirements.txt`, `pyproject.toml`, or `.csproj`). For Python, also add `python-dotenv` if not present.

### Step B3: Wrap Agent with Hosting Adapter

Modify the project's main entrypoint to wrap the existing agent with the adapter. The approach differs by framework:

**Microsoft Agent Framework (Python):**
- Import `from_agent_framework` from the adapter package
- Pass the agent instance (a `BaseAgent` subclass) to the adapter
- Call `.run()` on the adapter as the default entrypoint
- The agent must implement both `run()` and `run_stream()` methods

**LangGraph (Python):**
- Import `from_langgraph` from the adapter package
- Pass the compiled `StateGraph` to the adapter
- Call `.run()` on the adapter as the default entrypoint

**Custom code (Python):**
- Import `FoundryCBAgent` from the core adapter package
- Create a class that extends `FoundryCBAgent`
- Implement the `agent_run()` method which receives an `AgentRunContext` and returns either an `OpenAIResponse` (non-streaming) or `AsyncGenerator[ResponseStreamEvent]` (streaming)
- The agent must handle the Foundry request/response protocol manually — refer to the [custom sample](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/custom) for the exact interface
- Instantiate and call `.run()` as the default entrypoint

**Custom code (C#):**
- Use `AgentServerApplication.RunAsync()` with dependency injection to register an `IAgentInvocation` implementation
- Refer to the [C# custom sample](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/csharp/hosted-agents/AgentWithCustomFramework) for the exact interface

> ⚠️ **Warning:** The adapter MUST be the default entrypoint (no flags required to start). This is required for both local debugging and containerized deployment.

### Step B4: Configure Environment

1. Create or update a `.env` file with required environment variables (project endpoint, model deployment name, etc.)
2. For Python: ensure the code uses `load_dotenv()` so Foundry-injected environment variables is available at runtime.
3. If the project uses Azure credentials: ensure Python uses `azure.identity.aio.DefaultAzureCredential` (async version) for **local development**, not `azure.identity.DefaultAzureCredential`. In production, use `ManagedIdentityCredential`. See [auth-best-practices.md](../../references/auth-best-practices.md)

### Step B5: Create agent.yaml

Create an `agent.yaml` file in the project root. This file defines the agent's metadata and deployment configuration for Foundry. Required fields:

- `name` — Unique identifier (alphanumeric + hyphens, max 63 chars)
- `description` — What the agent does
- `template.kind` — Must be `hosted`
- `template.protocols` — Must include `responses` protocol v1
- `template.environment_variables` — List all environment variables the agent needs at runtime

Refer to any sample's `agent.yaml` in the [foundry-samples repo](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents) for the exact schema.

### Step B6: Create Dockerfile

Create a `Dockerfile` if one doesn't exist. Requirements:

- Base image appropriate for the language (e.g., `python:3.12-slim` for Python, `mcr.microsoft.com/dotnet/sdk` for C#)
- Copy source code into the container
- Install dependencies
- Expose port **8088** (the adapter's default port)
- Set the main entrypoint as the CMD

> ⚠️ **Warning:** When building, MUST use `--platform linux/amd64`. Hosted agents run on Linux AMD64 infrastructure. Images built for other architectures (e.g., ARM64 on Apple Silicon) will fail.

Refer to any sample's `Dockerfile` in the [foundry-samples repo](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents) for the exact pattern.

### Step B7: Test Locally

1. Install dependencies (use virtual environment for Python)
2. Run the main entrypoint — the adapter should start an HTTP server on `localhost:8088`
3. Send a test request: `POST http://localhost:8088/responses` with body `{"input": "hello"}`
4. Verify the response follows the OpenAI Responses API format
5. Fix any errors and retry until the test request succeeds
6. Stop the server

> 💡 **Tip:** If auth/connection errors occur for Azure services, that's expected without real Azure credentials configured. The key validation is that the HTTP server starts and accepts requests.

## Common Guidelines

IMPORTANT: YOU MUST FOLLOW THESE.

Apply these to both greenfield and brownfield projects:

1. **Logging** — Implement proper logging using the language's standard logging framework (Python `logging` module, .NET `ILogger`). Hosted agents stream container stdout/stderr logs to Foundry, so all log output is visible via the troubleshoot workflow. Use structured log levels (INFO, WARNING, ERROR) and include context like request IDs and agent names.

2. **Framework-specific best practices** — When using Agent Framework, read the [Agent Framework best practices](references/agentframework.md) for hosting adapter setup, credential patterns, and debugging guidance.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| GitHub API rate limit | Too many requests | Authenticate with `gh auth login` |
| `gh` not available | CLI not installed | Use curl REST API fallback |
| Sample not found | Path changed in repo | List parent directory to discover current samples |
| Dependency install fails | Version conflicts | Use versions from sample's own dependency file |
