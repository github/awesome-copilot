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
using GitHub.Copilot.SDK;

await using var client = new CopilotClient();
await client.StartAsync();

// Create session with a memorable ID
var session = await client.CreateSessionAsync(new SessionConfig
{
    SessionId = "user-123-conversation",
    Model = "gpt-5"
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
var session = await client.ResumeSessionAsync("user-123-conversation");

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

Retrieve all messages from a session:

```csharp
var messages = await session.GetMessagesAsync();
foreach (var msg in messages)
{
    Console.WriteLine($"[{msg.Type}] {msg.Data.Content}");
}
```

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed
