# Sampling

Sampling lets a tool **call the LLM through the client** instead of bringing its own model. The server says "summarise this for me" and the client routes the request to whatever model the user has configured (Claude, GPT, local model, anything). Costs and rate limits live with the client, not the server.

## When to use sampling

- The tool needs an LLM step (summarise, classify, draft, extract) and you don't want to ship/configure your own model in the server.
- You want to respect the user's model choice, key, and cost preferences.
- You're building a "meta" tool that orchestrates LLM work as part of its job (e.g. multi-step agents).

If you already have a deterministic algorithm, don't add a sampling call "for flavour" — it adds latency and cost.

## Prerequisite: stateful transport

Like elicitation, sampling needs the server to call back to the client. STDIO works always; HTTP needs `options.Stateless = false`.

## Recommended: `IChatClient` adapter

The cleanest API wraps the sampling channel as `Microsoft.Extensions.AI.IChatClient`, so you write code that looks like normal LLM-calling .NET:

```csharp
using System.ComponentModel;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Server;

[McpServerToolType]
public class SummaryTools
{
    [McpServerTool(Name = "SummarizeContent"), Description("Summarises arbitrary text using the client's LLM.")]
    public static async Task<string> Summarize(
        IMcpServer server,
        [Description("The text to summarize")] string text,
        CancellationToken cancellationToken)
    {
        ChatMessage[] messages =
        [
            new(ChatRole.User, "Briefly summarize the following content:"),
            new(ChatRole.User, text),
        ];

        var options = new ChatOptions
        {
            MaxOutputTokens = 256,
            Temperature = 0.3f,
        };

        var response = await server.AsSamplingChatClient()
            .GetResponseAsync(messages, options, cancellationToken);

        return $"Summary: {response}";
    }
}
```

Why this is nice:
- Same `IChatClient` API the rest of the .NET AI ecosystem uses.
- Works with `Microsoft.Extensions.AI` middleware (rate limiting, retries, telemetry, function calling).
- You can swap to a direct provider in tests by injecting a different `IChatClient`.

## Lower-level: `SampleAsync`

When you need full control over the request shape:

```csharp
using ModelContextProtocol.Protocol;

CreateMessageResult result = await server.SampleAsync(
    new CreateMessageRequestParams
    {
        Messages =
        [
            new SamplingMessage
            {
                Role = Role.User,
                Content = [new TextContentBlock { Text = "What is 2 + 2?" }]
            }
        ],
        MaxTokens = 100,
        Temperature = 0.0f,
        SystemPrompt = "You are a precise calculator.",
        // ModelPreferences, StopSequences, IncludeContext...
    },
    cancellationToken);

string answer = result.Content
    .OfType<TextContentBlock>()
    .FirstOrDefault()?.Text ?? string.Empty;
```

`ModelPreferences` lets you hint at model selection (cost vs. speed vs. intelligence priority); the *client* decides the actual model.

```csharp
ModelPreferences = new ModelPreferences
{
    Hints = [new ModelHint { Name = "claude" }],   // soft preference
    CostPriority = 0.2,        // 0..1
    SpeedPriority = 0.4,
    IntelligencePriority = 0.9,
}
```

## `IncludeContext`

Sampling requests can ask the client to include context from the current conversation:

```csharp
IncludeContext = ContextInclusion.ThisServer   // include this server's prior messages
// or AllServers, or None (default)
```

Useful when you need the LLM to consider what's happened in the chat so far without you re-supplying it.

## Capability check

Always confirm the client supports sampling — many do not:

```csharp
if (server.ClientCapabilities?.Sampling is null)
    throw new McpException(
        "This client does not support sampling. " +
        "Configure a model in the host or use a different MCP client.");
```

## Performance notes

- Sampling calls are network round-trips (client → its provider → back). Expect 100ms–multiple seconds. Don't loop tightly.
- Token costs are paid by the *user* (their API key/quota). Be conservative with `MaxTokens`.
- Cancellation propagates: if the user kills the tool call, the sampling request is cancelled too.

## Sampling vs. doing it server-side

| Sampling (via client) | Direct LLM call (server-side) |
|---|---|
| Uses the user's model + key | Uses your service's key |
| Respects user's policy/quota | Your responsibility to bill/track |
| Works in any host the user has | Locked to the model you ship with |
| Higher latency (extra hop) | Lower latency, direct |
| No secrets to manage | You manage the API key |

For "smart" servers shipped to many users, prefer sampling. For internal corporate servers where you want consistent behaviour and you're already paying for the model, direct is fine.
