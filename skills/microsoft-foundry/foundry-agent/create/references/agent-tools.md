# Agent Tools — Simple Tools

Add tools to agents to extend capabilities. This file covers tools that work without external connections. For tools requiring connections/RBAC setup, see:
- [Web Search tool](tool-web-search.md) — real-time public web search with citations (default for web search)
- [Bing Grounding tool](tool-bing-grounding.md) — web search via dedicated Bing resource (only when explicitly requested)
- [Azure AI Search tool](tool-azure-ai-search.md) — private data grounding with vector search
- [MCP tool](tool-mcp.md) — remote Model Context Protocol servers

## Code Interpreter

Enables agents to write and run Python in a sandboxed environment. Supports data analysis, chart generation, and file processing. Has [additional charges](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/) beyond token-based fees.

> Sessions: 1-hour active / 30-min idle timeout. Each conversation = separate billable session.

For code samples, see: [Code Interpreter tool documentation](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/code-interpreter?view=foundry)

## Function Calling

Define custom functions the agent can invoke. Your app executes the function and returns results. Runs expire 10 minutes after creation — return tool outputs promptly.

> **Security:** Treat tool arguments as untrusted input. Don't pass secrets in tool output. Use `strict=True` for schema validation.

For code samples, see: [Function Calling tool documentation](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/function-calling?view=foundry)

## Tool Summary

| Tool | Connection? | Reference |
|------|-------------|-----------|
| `CodeInterpreterTool` | No | This file |
| `FileSearchTool` | No (vector store required) | [tool-file-search.md](tool-file-search.md) |
| `FunctionTool` | No | This file |
| `WebSearchPreviewTool` | No | [tool-web-search.md](tool-web-search.md) |
| `BingGroundingAgentTool` | Yes (Bing) | [tool-bing-grounding.md](tool-bing-grounding.md) |
| `AzureAISearchAgentTool` | Yes (Search) | [tool-azure-ai-search.md](tool-azure-ai-search.md) |
| `MCPTool` | Optional | [tool-mcp.md](tool-mcp.md) |

> ⚠️ **Default for web search:** Use `WebSearchPreviewTool` unless the user explicitly requests Bing Grounding or Bing Custom Search.

> Combine multiple tools on one agent. The model decides which to invoke.

## References

- [Tool Catalog](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog?view=foundry)
- [Code Interpreter](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/code-interpreter?view=foundry)
- [Function Calling](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/function-calling?view=foundry)
