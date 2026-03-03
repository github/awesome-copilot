# Azure OpenAI — .NET SDK Quick Reference

> Condensed from **azure-ai-openai-dotnet**. Full patterns (function calling, structured outputs, RAG with Search)
> in the **azure-ai-openai-dotnet** plugin skill if installed.

## Install
```bash
dotnet add package Azure.AI.OpenAI
```

## Quick Start
```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;
var azureClient = new AzureOpenAIClient(new Uri(endpoint), credential);
ChatClient chatClient = azureClient.GetChatClient("gpt-4o-mini");
```

## Non-Obvious Patterns
- Client hierarchy: `AzureOpenAIClient.GetChatClient()` / `GetEmbeddingClient()` / `GetImageClient()` / `GetAudioClient()`
- Reasoning models (o1): use `DeveloperChatMessage` instead of `SystemChatMessage`, set `ReasoningEffortLevel`
- RAG: `#pragma warning disable AOAI001` then `options.AddDataSource(new AzureSearchChatDataSource{...})`
- Structured outputs: `ChatResponseFormat.CreateJsonSchemaFormat(...)`

## Best Practices
1. Use Entra ID in production — avoid API keys
2. Reuse client instances — create once, share across requests
3. Handle rate limits — implement exponential backoff for 429 errors
4. Stream for long responses — use `CompleteChatStreamingAsync`
5. Set appropriate timeouts for long completions
6. Use structured outputs for consistent response format
7. Monitor token usage via `completion.Usage` for cost management
8. Validate tool call arguments before execution
