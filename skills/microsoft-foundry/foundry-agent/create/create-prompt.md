# Create Prompt Agent

Create and manage prompt agents in Azure Foundry Agent Service using MCP tools or Python SDK. For hosted agents (container-based), see [create.md](create.md).

## Quick Reference

| Property | Value |
|----------|-------|
| **Agent Type** | Prompt (`kind: "prompt"`) |
| **Primary Tool** | Foundry MCP server (`foundry_agents_*`) |
| **Fallback SDK** | `azure-ai-projects` v2.x preview |
| **Auth** | `DefaultAzureCredential` / `az login` |

## Workflow

```
User Request (create/list/get/update/delete agent)
    │
    ▼
Step 1: Resolve project context (endpoint + credentials)
    │
    ▼
Step 2: Try MCP tool for the operation
    │  ├─ ✅ MCP available → Execute via MCP tool → Done
    │  └─ ❌ MCP unavailable → Continue to Step 3
    │
    ▼
Step 3: Fall back to SDK
    │  Read references/sdk-operations.md for code
    │
    ▼
Step 4: Execute and confirm result
```

### Step 1: Resolve Project Context

The user needs a Foundry project endpoint. Check for:

1. `PROJECT_ENDPOINT` environment variable
2. Ask the user for their project endpoint
3. Use `foundry_resource_get` MCP tool to discover it

Endpoint format: `https://<resource>.services.ai.azure.com/api/projects/<project>`

### Step 2: Create Agent (MCP — Preferred)

For a **prompt agent**:
- Provide: agent name, model deployment name, instructions
- Optional: tools (code interpreter, file search, function calling, web search, Bing grounding, memory)

For a **workflow**:
- Workflows are created in the Foundry portal visual builder
- Use MCP to create the individual agents that participate in the workflow
- Direct the user to the Foundry portal for workflow assembly

### Step 3: SDK Fallback

If MCP tools are unavailable, use the `azure-ai-projects` SDK:
- See [SDK Operations](references/sdk-operations.md) for create, list, update, delete code samples
- See [Agent Tools](references/agent-tools.md) for adding tools to agents

### Step 4: Add Tools (Optional)

> ⚠️ **MANDATORY:** Before configuring any tool, **read its reference documentation** linked below to understand prerequisites, required parameters, and setup steps. Do not attempt to add a tool without first reviewing its reference.

| Tool Category | Reference |
|---------------|-----------|
| Code Interpreter, Function Calling | [Simple Tools](references/agent-tools.md) |
| File Search (requires vector store) | [File Search](references/tool-file-search.md) |
| Web Search (default, no setup needed) | [Web Search](references/tool-web-search.md) |
| Bing Grounding (explicit request only) | [Bing Grounding](references/tool-bing-grounding.md) |
| Azure AI Search (private data) | [Azure AI Search](references/tool-azure-ai-search.md) |
| MCP Servers | [MCP Tool](references/tool-mcp.md) |
| Memory (persistent across sessions) | [Memory](references/tool-memory.md) |
| Connections (for tools that need them) | [Project Connections](../../project/connections.md) |

> ⚠️ **Web Search Default:** Use `WebSearchPreviewTool` for web search. Only use `BingGroundingAgentTool` when the user explicitly requests Bing Grounding.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Agent creation fails | Missing model deployment | Deploy a model first via `foundry_models_deploy` or portal |
| MCP tool not found | MCP server not running | Fall back to SDK — see [SDK Operations](references/sdk-operations.md) |
| Permission denied | Insufficient RBAC | Need `Azure AI User` role on the project |
| Agent name conflict | Name already exists | Use a unique name or update the existing agent |
| Tool not available | Tool not configured for project | Verify tool prerequisites (e.g., Bing resource for grounding) |
| SDK version mismatch | Using 1.x instead of 2.x | Install `azure-ai-projects --pre` for v2.x preview |
| Tenant mismatch | MCP token tenant differs from resource tenant | Fall back to SDK — `DefaultAzureCredential` resolves the correct tenant |
