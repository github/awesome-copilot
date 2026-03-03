# SDK Operations for Foundry Agent Service

Use the Foundry MCP tools for agent CRUD operations. When MCP tools are unavailable, use the `azure-ai-projects` Python SDK or REST API.

## Agent Operations via MCP

| Operation | MCP Tool | Description |
|-----------|----------|-------------|
| Create/Update agent | `agent_update` | Create a new agent or update an existing one (creates new version) |
| List/Get agents | `agent_get` | List all agents, or get a specific agent by name |
| Delete agent | `agent_delete` | Delete an agent |
| Invoke agent | `agent_invoke` | Send a message to an agent and get a response |
| Get schema | `agent_definition_schema_get` | Get the full JSON schema for agent definitions |

## SDK Agent Operations

When MCP tools are unavailable, use the `azure-ai-projects` Python SDK (`pip install azure-ai-projects --pre`):

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

endpoint = "https://<resource>.services.ai.azure.com/api/projects/<project>"
client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
```

| Operation | SDK Method |
|-----------|------------|
| Create | `client.agents.create_version(agent_name, definition)` |
| List | `client.agents.list()` |
| Get | `client.agents.get(agent_name)` |
| Update | `client.agents.create_version(agent_name, definition)` (creates new version) |
| Delete | `client.agents.delete(agent_name)` |
| Chat | `client.get_openai_client().responses.create(model=<deployment>, input=<text>, extra_body={"agent": {"name": agent_name, "type": "agent_reference"}})` |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PROJECT_ENDPOINT` | Foundry project endpoint (`https://<resource>.services.ai.azure.com/api/projects/<project>`) |
| `MODEL_DEPLOYMENT_NAME` | Deployed model name (e.g., `gpt-4.1-mini`) |

## References

- [Agent quickstart](https://learn.microsoft.com/azure/ai-foundry/agents/quickstart?view=foundry)
- [Create agents](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/create-agent?view=foundry)
- [Tool Catalog](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog?view=foundry)
