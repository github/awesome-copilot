# Create Project Reference

Scaffold a new Microsoft 365 agent or Teams app from an ATK template.

## Template Selection

| User Wants | Capability |
|------------|------------|
| Extend M365 Copilot with custom instructions | `declarative-agent` |
| Declarative Agent with new API | `declarative-agent-action` |
| Declarative Agent with existing OpenAPI spec | `declarative-agent-action-from-existing-api` |
| Connect MCP Server to Copilot | `declarative-agent-with-action-from-mcp` |
| Agent with custom LLM (Azure OpenAI, etc.) | `basic-custom-engine-agent` |
| Agent using Azure AI Foundry | `foundry-agent-to-m365` |
| Teams chatbot with AI | `teams-agent` |
| Teams bot with RAG/knowledge base | `teams-agent-rag-customize` |
| Simple Teams echo bot | `bot` |
| Teams tab app | `tab` |
| Teams message extension | `message-extension` |

## Scaffold Command

```bash
# Scaffold into temp, then move to current dir
atk new -c <template-id> -n <project-name> -f /tmp -l <language> -i false
mv /tmp/<project-name>/. .
rmdir /tmp/<project-name>

# Examples
atk new -c declarative-agent -n my-agent -f /tmp -i false
atk new -c basic-custom-engine-agent -l typescript -n my-cea -f /tmp -i false
atk new -c declarative-agent-action-from-existing-api -n my-agent -a <openapi-url> -o "GET /path" -f /tmp -i false
```

## Notes
- `declarative-agent` does NOT require `-l` language flag
- Always use `-i false` for non-interactive scripted creation
- `atk new` can take several minutes — wait for completion (timeout 120000ms+)
- List all samples: `atk list samples`
