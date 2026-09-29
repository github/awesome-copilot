# Working with Multiple Sessions

Manage multiple independent conversations simultaneously.

> **Runnable example:** [recipe/multiple-sessions.cs](recipe/multiple-sessions.cs)
>
> ```bash
> dotnet run recipe/multiple-sessions.cs
> ```

## Example scenario

You need to run multiple conversations in parallel, each with its own context and history.

## C #

```csharp
using GitHub.Copilot;

await using var client = new CopilotClient();
await client.StartAsync();

// Create multiple independent sessions. Most sessions should let Copilot pick the
// best model automatically; pin an explicit model only when you have a deliberate
// reason to (e.g. an A/B comparison, as with session3 here).
var session1 = await client.CreateSessionAsync(new SessionConfig
{
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});
var session2 = await client.CreateSessionAsync(new SessionConfig
{
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});
var session3 = await client.CreateSessionAsync(new SessionConfig
{
    Model = "claude-sonnet-5",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

// Each session maintains its own conversation history
await session1.SendAsync(new MessageOptions { Prompt = "You are helping with a Python project" });
await session2.SendAsync(new MessageOptions { Prompt = "You are helping with a TypeScript project" });
await session3.SendAsync(new MessageOptions { Prompt = "You are helping with a Go project" });

// Follow-up messages stay in their respective contexts
await session1.SendAsync(new MessageOptions { Prompt = "How do I create a virtual environment?" });
await session2.SendAsync(new MessageOptions { Prompt = "How do I set up tsconfig?" });
await session3.SendAsync(new MessageOptions { Prompt = "How do I initialize a module?" });

// Clean up all sessions
await session1.DisposeAsync();
await session2.DisposeAsync();
await session3.DisposeAsync();
```

## Custom session IDs

Use custom IDs for easier tracking:

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    SessionId = "user-123-chat",
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

Console.WriteLine(session.SessionId); // "user-123-chat"
```

## Listing sessions

```csharp
var sessions = await client.ListSessionsAsync();
foreach (var sessionInfo in sessions)
{
    Console.WriteLine($"Session: {sessionInfo.SessionId}");
}
```

## Deleting sessions

```csharp
// Delete a specific session
await client.DeleteSessionAsync("user-123-chat");
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models by pinning an explicit
  `Model` per session (as `session3` does above) instead of the default `"auto"`
