---
applyTo: '**.cs, **.csproj'
description: 'This file provides guidance on building C# applications using GitHub Copilot SDK.'
name: 'GitHub Copilot SDK C# Instructions'
---

## Core Principles

- The SDK is in technical preview and may have breaking changes
- Requires .NET 10.0 or later
- Requires GitHub Copilot CLI installed and in PATH
- Uses async/await patterns throughout
- Implements IAsyncDisposable for resource cleanup

## Installation

Always install via NuGet:
```bash
dotnet add package GitHub.Copilot.SDK
```

## Client Initialization

### Basic Client Setup

```csharp
await using var client = new CopilotClient();
await client.StartAsync();
```

### Client Configuration Options

When creating a CopilotClient, use `CopilotClientOptions`:

- `CliPath` - Path to CLI executable (default: "copilot" from PATH)
- `CliArgs` - Extra arguments prepended before SDK-managed flags
- `CliUrl` - URL of existing CLI server (e.g., "localhost:8080"). When provided, client won't spawn a process
- `Port` - Server port (default: 0 for random)
- `UseStdio` - Use stdio transport instead of TCP (default: true)
- `LogLevel` - Log level (default: "info")
- `AutoStart` - Auto-start server (default: true)
- `AutoRestart` - Auto-restart on crash (default: true)
- `Cwd` - Working directory for the CLI process
- `Environment` - Environment variables for the CLI process
- `Logger` - ILogger instance for SDK logging

### Manual Server Control

For explicit control:
```csharp
var client = new CopilotClient(new CopilotClientOptions { AutoStart = false });
await client.StartAsync();
// Use client...
await client.StopAsync();
```

Use `ForceStopAsync()` when `StopAsync()` takes too long.

## Session Management

### Creating Sessions

Use `SessionConfig` for configuration:

```csharp
await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    Streaming = true,
    Tools = [...],
    SystemMessage = new SystemMessageConfig { ... },
    AvailableTools = ["tool1", "tool2"],
    ExcludedTools = ["tool3"],
    Provider = new ProviderConfig { ... }
});
```

### Session Config Options

- `SessionId` - Custom session ID
- `Model` - Model name ("gpt-5", "claude-sonnet-4.5", etc.)
- `Tools` - Custom tools exposed to the CLI
- `SystemMessage` - System message customization
- `AvailableTools` - Allowlist of tool names
- `ExcludedTools` - Blocklist of tool names
- `Provider` - Custom API provider configuration (BYOK)
- `Streaming` - Enable streaming response chunks (default: false)

### Resuming Sessions

```csharp
var session = await client.ResumeSessionAsync(sessionId, new ResumeSessionConfig { ... });
```

### Session Operations

- `session.SessionId` - Get session identifier
- `session.SendAsync(new MessageOptions { Prompt = "...", Attachments = [...] })` - Send message
- `session.AbortAsync()` - Abort current processing
- `session.GetMessagesAsync()` - Get all events/messages
- `await session.DisposeAsync()` - Clean up resources

## Event Handling

### Event Subscription Pattern

ALWAYS use TaskCompletionSource for waiting on session events:

```csharp
var done = new TaskCompletionSource();

session.On(evt =>
{
    if (evt is AssistantMessageEvent msg)
    {
        Console.WriteLine(msg.Data.Content);
    }
    else if (evt is SessionIdleEvent)
    {
        done.SetResult();
    }
});

await session.SendAsync(new MessageOptions { Prompt = "..." });
await done.Task;
```

### Unsubscribing from Events

The `On()` method returns an IDisposable:

```csharp
var subscription = session.On(evt => { /* handler */ });
// Later...
subscription.Dispose();
```

### Event Types

Use pattern matching or switch expressions for event handling:

```csharp
session.On(evt =>
{
    switch (evt)
    {
        case UserMessageEvent userMsg:
            // Handle user message
            break;
        case AssistantMessageEvent assistantMsg:
            Console.WriteLine(assistantMsg.Data.Content);
            break;
        case ToolExecutionStartEvent toolStart:
            // Tool execution started
            break;
        case ToolExecutionCompleteEvent toolComplete:
            // Tool execution completed
            break;
        case SessionStartEvent start:
            // Session started
            break;
        case SessionIdleEvent idle:
            // Session is idle (processing complete)
            break;
        case SessionErrorEvent error:
            Console.WriteLine($"Error: {error.Data.Message}");
            break;
    }
});
```

## Streaming Responses

### Enabling Streaming

Set `Streaming = true` in SessionConfig:

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    Streaming = true
});
```

### Handling Streaming Events

Handle both delta events (incremental) and final events:

```csharp
var done = new TaskCompletionSource();

session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageDeltaEvent delta:
            // Incremental text chunk
            Console.Write(delta.Data.DeltaContent);
            break;
        case AssistantReasoningDeltaEvent reasoningDelta:
            // Incremental reasoning chunk (model-dependent)
            Console.Write(reasoningDelta.Data.DeltaContent);
            break;
        case AssistantMessageEvent msg:
            // Final complete message
            Console.WriteLine("\n--- Final ---");
            Console.WriteLine(msg.Data.Content);
            break;
        case AssistantReasoningEvent reasoning:
            // Final reasoning content
            Console.WriteLine("--- Reasoning ---");
            Console.WriteLine(reasoning.Data.Content);
            break;
        case SessionIdleEvent:
            done.SetResult();
            break;
    }
});

await session.SendAsync(new MessageOptions { Prompt = "Tell me a story" });
await done.Task;
```

Note: Final events (`AssistantMessageEvent`, `AssistantReasoningEvent`) are ALWAYS sent regardless of streaming setting.

## Custom Tools

### Defining Tools with AIFunctionFactory

Use `Microsoft.Extensions.AI.AIFunctionFactory.Create` for type-safe tools:

```csharp
using Microsoft.Extensions.AI;
using System.ComponentModel;

var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    Tools = [
        AIFunctionFactory.Create(
            async ([Description("Issue ID")] string id) => {
                var issue = await FetchIssueAsync(id);
                return issue;
            },
            "lookup_issue",
            "Fetch issue details from tracker"),
    ]
});
```

### Tool Return Types

- Return any JSON-serializable value (automatically wrapped)
- Or return `ToolResultAIContent` wrapping `ToolResultObject` for full control over metadata

### Tool Execution Flow

When Copilot invokes a tool, the client automatically:
1. Runs your handler function
2. Serializes the return value
3. Responds to the CLI

## System Message Customization

### Append Mode (Default - Preserves Guardrails)

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    SystemMessage = new SystemMessageConfig
    {
        Mode = SystemMessageMode.Append,
        Content = @"
<workflow_rules>
- Always check for security vulnerabilities
- Suggest performance improvements when applicable
</workflow_rules>
"
    }
});
```

### Replace Mode (Full Control - Removes Guardrails)

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    SystemMessage = new SystemMessageConfig
    {
        Mode = SystemMessageMode.Replace,
        Content = "You are a helpful assistant."
    }
});
```

## File Attachments

Attach files to messages using `UserMessageDataAttachmentsItem`:

```csharp
await session.SendAsync(new MessageOptions
{
    Prompt = "Analyze this file",
    Attachments = new List<UserMessageDataAttachmentsItem>
    {
        new UserMessageDataAttachmentsItem
        {
            Type = UserMessageDataAttachmentsItemType.File,
            Path = "/path/to/file.cs",
            DisplayName = "My File"
        }
    }
});
```

## Message Delivery Modes

Use the `Mode` property in `MessageOptions`:

- `"enqueue"` - Queue message for processing
- `"immediate"` - Process message immediately

```csharp
await session.SendAsync(new MessageOptions
{
    Prompt = "...",
    Mode = "enqueue"
});
```

## Multiple Sessions

Sessions are independent and can run concurrently:

```csharp
var session1 = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });
var session2 = await client.CreateSessionAsync(new SessionConfig { Model = "claude-sonnet-4.5" });

await session1.SendAsync(new MessageOptions { Prompt = "Hello from session 1" });
await session2.SendAsync(new MessageOptions { Prompt = "Hello from session 2" });
```

## Bring Your Own Key (BYOK)

Use custom API providers via `ProviderConfig`:

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Provider = new ProviderConfig
    {
        Type = "openai",
        BaseUrl = "https://api.openai.com/v1",
        ApiKey = "your-api-key"
    }
});
```

## Session Lifecycle Management

### Listing Sessions

```csharp
var sessions = await client.ListSessionsAsync();
foreach (var metadata in sessions)
{
    Console.WriteLine($"Session: {metadata.SessionId}");
}
```

### Deleting Sessions

```csharp
await client.DeleteSessionAsync(sessionId);
```

### Checking Connection State

```csharp
var state = client.State;
```

## Error Handling

### Standard Exception Handling

```csharp
try
{
    var session = await client.CreateSessionAsync();
    await session.SendAsync(new MessageOptions { Prompt = "Hello" });
}
catch (StreamJsonRpc.RemoteInvocationException ex)
{
    Console.Error.WriteLine($"JSON-RPC Error: {ex.Message}");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Error: {ex.Message}");
}
```

### Session Error Events

Monitor `SessionErrorEvent` for runtime errors:

```csharp
session.On(evt =>
{
    if (evt is SessionErrorEvent error)
    {
        Console.Error.WriteLine($"Session Error: {error.Data.Message}");
    }
});
```

## Connectivity Testing

Use PingAsync to verify server connectivity:

```csharp
var response = await client.PingAsync("test message");
```

## Resource Cleanup

### Automatic Cleanup with Using

ALWAYS use `await using` for automatic disposal:

```csharp
await using var client = new CopilotClient();
await using var session = await client.CreateSessionAsync();
// Resources automatically cleaned up
```

### Manual Cleanup

If not using `await using`:

```csharp
var client = new CopilotClient();
try
{
    await client.StartAsync();
    // Use client...
}
finally
{
    await client.StopAsync();
}
```

## Best Practices

1. **Always use `await using`** for CopilotClient and CopilotSession
2. **Use TaskCompletionSource** to wait for SessionIdleEvent
3. **Handle SessionErrorEvent** for robust error handling
4. **Use pattern matching** (switch expressions) for event handling
5. **Enable streaming** for better UX in interactive scenarios
6. **Use AIFunctionFactory** for type-safe tool definitions
7. **Dispose event subscriptions** when no longer needed
8. **Use SystemMessageMode.Append** to preserve safety guardrails
9. **Provide descriptive tool names and descriptions** for better model understanding
10. **Handle both delta and final events** when streaming is enabled

## Common Patterns

### Simple Query-Response

```csharp
await using var client = new CopilotClient();
await client.StartAsync();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5"
});

var done = new TaskCompletionSource();

session.On(evt =>
{
    if (evt is AssistantMessageEvent msg)
    {
        Console.WriteLine(msg.Data.Content);
    }
    else if (evt is SessionIdleEvent)
    {
        done.SetResult();
    }
});

await session.SendAsync(new MessageOptions { Prompt = "What is 2+2?" });
await done.Task;
```

### Multi-Turn Conversation

```csharp
await using var session = await client.CreateSessionAsync();

async Task SendAndWait(string prompt)
{
    var done = new TaskCompletionSource();
    var subscription = session.On(evt =>
    {
        if (evt is AssistantMessageEvent msg)
        {
            Console.WriteLine(msg.Data.Content);
        }
        else if (evt is SessionIdleEvent)
        {
            done.SetResult();
        }
    });

    await session.SendAsync(new MessageOptions { Prompt = prompt });
    await done.Task;
    subscription.Dispose();
}

await SendAndWait("What is the capital of France?");
await SendAndWait("What is its population?");
```

### Tool with Complex Return Type

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Tools = [
        AIFunctionFactory.Create(
            ([Description("User ID")] string userId) => {
                return new {
                    Id = userId,
                    Name = "John Doe",
                    Email = "john@example.com",
                    Role = "Developer"
                };
            },
            "get_user",
            "Retrieve user information")
    ]
});
```

