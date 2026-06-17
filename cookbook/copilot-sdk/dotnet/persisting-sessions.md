# Session Persistence and Resumption

Save and restore conversation sessions across application restarts.

## Example scenario

You want users to be able to continue a conversation even after closing and reopening your application.

> **Runnable example:** [recipe/persisting-sessions.cs](recipe/persisting-sessions.cs)
>
> ```bash
> cd recipe
> dotnet run persisting-sessions.cs
> ```

### Creating a session with a custom ID

```csharp
using GitHub.Copilot;

await using var client = new CopilotClient();
await client.StartAsync();

// Create session with a memorable ID
var session = await client.CreateSessionAsync(new SessionConfig
{
    SessionId = "user-123-conversation",
    Model = "gpt-5",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

await session.SendAsync(new MessageOptions { Prompt = "Let's discuss TypeScript generics" });

// Session ID is preserved
Console.WriteLine(session.SessionId); // "user-123-conversation"

// Destroy session but keep data on disk
await session.DisposeAsync();
await client.StopAsync();
```

### Resuming a session

```csharp
await using var client = new CopilotClient();
await client.StartAsync();

// Resume the previous session
var session = await client.ResumeSessionAsync("user-123-conversation", new ResumeSessionConfig { OnPermissionRequest = PermissionHandler.ApproveAll });

// Previous context is restored
await session.SendAsync(new MessageOptions { Prompt = "What were we discussing?" });

await session.DisposeAsync();
await client.StopAsync();
```

### Listing available sessions

```csharp
var sessions = await client.ListSessionsAsync();
foreach (var s in sessions)
{
    Console.WriteLine($"Session: {s.SessionId}");
}
```

### Deleting a session permanently

```csharp
// Remove session and all its data from disk
await client.DeleteSessionAsync("user-123-conversation");
```

### Getting session history

Retrieve all events from a session:

```csharp
using GitHub.Copilot; // UserMessageEvent, AssistantMessageEvent, etc. live in this namespace

var events = await session.GetEventsAsync();
foreach (var evt in events)
{
    switch (evt)
    {
        case UserMessageEvent user:
            Console.WriteLine($"[user] {user.Data.Content}");
            break;
        case AssistantMessageEvent assistant:
            Console.WriteLine($"[assistant] {assistant.Data.Content}");
            break;
        default:
            // Sessions can also contain other events (tool calls, tool results, system events).
            Console.WriteLine($"[{evt.GetType().Name}]");
            break;
    }
}
```

> A session's event stream may include event kinds beyond user and assistant messages
> (for example tool calls, tool results, and system events). Handle the ones you care
> about and fall back to a default case so nothing is silently dropped.

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed
