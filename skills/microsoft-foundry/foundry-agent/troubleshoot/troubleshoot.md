# Foundry Agent Troubleshoot

Troubleshoot and debug Foundry agents by collecting container logs, discovering observability connections, and querying Application Insights telemetry.

## Quick Reference

| Property | Value |
|----------|-------|
| Agent types | Prompt (LLM-based), Hosted (container-based) |
| MCP servers | `foundry-mcp` |
| Key MCP tools | `agent_get`, `agent_container_status_get` |
| Related skills | `azure-kusto` (for KQL telemetry queries) |
| CLI references | `az cognitiveservices agent logs`, `az cognitiveservices account connection` |

## When to Use This Skill

- Agent is not responding or returning errors
- Hosted agent container is failing to start
- Need to view container logs for a hosted agent
- Diagnose latency or timeout issues
- Query Application Insights for agent traces and exceptions
- Investigate agent runtime failures

## MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `agent_get` | Get agent details to determine type (prompt/hosted) | `projectEndpoint` (required), `agentName` (optional) |
| `agent_container_status_get` | Check hosted agent container status | `projectEndpoint`, `agentName` (required); `agentVersion` |

## Workflow

### Step 1: Collect Agent Information

Use the project endpoint and agent name from the project context (see Common: Project Context Resolution). Ask the user only for values not already resolved:
- **Project endpoint** — AI Foundry project endpoint URL
- **Agent name** — Name of the agent to troubleshoot

### Step 2: Determine Agent Type

Use `agent_get` with `projectEndpoint` and `agentName` to retrieve the agent definition. Check the `kind` field:
- `"hosted"` → Proceed to Step 3 (Container Logs)
- `"prompt"` → Skip to Step 4 (Discover Observability Connections)

### Step 3: Retrieve Container Logs (Hosted Agents Only)

First check the container status using `agent_container_status_get`. Report the current status to the user.

Retrieve container logs using the Azure CLI command documented at:
[az cognitiveservices agent logs show](https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/agent/logs?view=azure-cli-latest#az-cognitiveservices-agent-logs-show)

Refer to the documentation above for the exact command syntax and parameters. Present the logs to the user and highlight any errors or warnings found.

### Step 4: Discover Observability Connections

List the project connections to find Application Insights or Azure Monitor resources using the Azure CLI command documented at:
[az cognitiveservices account connection](https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account/connection?view=azure-cli-latest)

Refer to the documentation above for the exact command syntax and parameters. Look for connections of type `ApplicationInsights` or `AzureMonitor` in the output.

If no observability connection is found, inform the user and suggest setting up Application Insights for the project. Ask if they want to proceed without telemetry data.

### Step 5: Query Application Insights Telemetry

Delegate telemetry querying to the `azure-kusto` skill. Provide it the Application Insights resource details discovered in Step 4 and the user's reported issue. The `azure-kusto` skill handles KQL query construction, execution via MCP tools, and result formatting.

Use `* contains "<response_id>"` or `* contains "<agent_name>"` filters to narrow down results to the specific agent instance.

### Step 6: Summarize Findings

Present a summary to the user including:
- **Agent type and status** — hosted/prompt, container status (if hosted)
- **Container log errors** — key errors from logs (hosted only)
- **Telemetry insights** — exceptions, failed requests, latency trends
- **Recommended actions** — specific steps to resolve identified issues

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Agent not found | Invalid agent name or project endpoint | Use `agent_get` to list available agents and verify name |
| Container logs unavailable | Agent is a prompt agent or container never started | Prompt agents don't have container logs — skip to telemetry |
| No observability connection | Application Insights not configured for the project | Suggest configuring Application Insights for the Foundry project |
| Kusto query failed | Invalid cluster/database or insufficient permissions | Verify Application Insights resource details and reader permissions |
| No telemetry data | Agent not instrumented or too recent | Check if Application Insights SDK is configured; data may take a few minutes to appear |

## Additional Resources

- [Foundry Hosted Agents](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents?view=foundry)
- [Agent Logs CLI Reference](https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/agent/logs?view=azure-cli-latest)
- [Account Connection CLI Reference](https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account/connection?view=azure-cli-latest)
- [KQL Quick Reference](https://learn.microsoft.com/azure/data-explorer/kusto/query/kql-quick-reference)
- [Foundry Samples](https://github.com/azure-ai-foundry/foundry-samples)
