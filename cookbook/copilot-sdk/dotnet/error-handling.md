# Error Handling Patterns

Handle errors gracefully in your Copilot SDK applications.

> **Runnable example:** [recipe/error-handling.cs](recipe/error-handling.cs)
>
> ```bash
> dotnet run recipe/error-handling.cs
> ```

## Example scenario

You need to handle various error conditions like connection failures, timeouts, and invalid responses.

## Basic try-catch

```csharp
using GitHub.Copilot;

var client = new CopilotClient();

try
{
    await client.StartAsync();
    var session = await client.CreateSessionAsync(new SessionConfig
    {
        Model = "auto",
        OnPermissionRequest = PermissionHandler.ApproveAll
    });

    var done = new TaskCompletionSource<string>();
    session.On<SessionEvent>(evt =>
    {
        if (evt is AssistantMessageEvent msg)
        {
            done.SetResult(msg.Data.Content);
        }
    });

    await session.SendAsync(new MessageOptions { Prompt = "Hello!" });
    var response = await done.Task;
    Console.WriteLine(response);

    await session.DisposeAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
finally
{
    await client.StopAsync();
}
```

> `Session.On` is now generic: `On<T>(Action<T> handler) where T : SessionEvent`. The type
> argument can no longer be inferred from a lambda that only pattern-matches inside the body, so
> calls like `session.On(evt => { if (evt is AssistantMessageEvent msg) ... })` fail to compile
> with `CS0411`. Either specify `On<SessionEvent>` and pattern-match inside (as above), or
> subscribe directly to the concrete event type you care about, e.g.
> `session.On<AssistantMessageEvent>(evt => Console.WriteLine(evt.Data?.Content))`.

## Handling specific error types

```csharp
try
{
    await client.StartAsync();
}
catch (FileNotFoundException)
{
    Console.WriteLine("Copilot CLI not found. Please install it first.");
}
catch (HttpRequestException ex) when (ex.Message.Contains("connection"))
{
    Console.WriteLine("Could not connect to Copilot CLI server.");
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
}
```

## Timeout handling

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

try
{
    var done = new TaskCompletionSource<string>();
    session.On<SessionEvent>(evt =>
    {
        if (evt is AssistantMessageEvent msg)
        {
            done.SetResult(msg.Data.Content);
        }
    });

    await session.SendAsync(new MessageOptions { Prompt = "Complex question..." });

    // Wait with timeout (30 seconds)
    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    var response = await done.Task.WaitAsync(cts.Token);

    Console.WriteLine(response);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Request timed out");
}
```

## Aborting a request

```csharp
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

// Start a request
await session.SendAsync(new MessageOptions { Prompt = "Write a very long story..." });

// Abort it after some condition
await Task.Delay(5000);
await session.AbortAsync();
Console.WriteLine("Request aborted");
```

## Graceful shutdown

```csharp
Console.CancelKeyPress += async (sender, e) =>
{
    e.Cancel = true;
    Console.WriteLine("Shutting down...");

    try
    {
        await client.StopAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Cleanup error: {ex.Message}");
    }

    Environment.Exit(0);
};
```

> In 1.0, `StopAsync()` throws if it encounters errors during cleanup rather than returning a
> list of cleanup errors, so wrap it in a try/catch to log failures instead of letting them
> crash shutdown. Use `ForceStopAsync()` if a graceful stop takes too long.

## Using await using for automatic disposal

```csharp
await using var client = new CopilotClient();
await client.StartAsync();

var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "auto",
    OnPermissionRequest = PermissionHandler.ApproveAll
});

// ... do work ...

// client.StopAsync() is automatically called when exiting scope
```

## Tagging message provenance

Since v1.0.14, `MessageOptions` has a `Source` property so you can tag *why* a message was sent —
useful when errors or unexpected turns show up in transcripts and you need to tell human input
apart from messages an automated system (a webhook handler, a scheduled job, another agent) sent
on the user's behalf.

```csharp
using GitHub.Copilot;

// Ordinary human input (also the default when Source is omitted).
await session.SendAsync(new MessageOptions
{
    Prompt = "What changed in the last release?",
    Source = MessageSource.User
});

// A message injected by your own system rather than typed by a person,
// e.g. a scheduled health check or automated retry.
await session.SendAsync(new MessageOptions
{
    Prompt = "Re-run the failed step and report the result.",
    Source = MessageSource.System
});

// A message sent by another agent or automation acting on the user's behalf,
// tagged with a caller-supplied identifier.
await session.SendAsync(new MessageOptions
{
    Prompt = "Summarize the open incidents.",
    Source = MessageSource.Agent("incident-bot")
});
```

`MessageSource` is a closed record with `User`, `System`, and a `MessageSource.Agent(string id)`
factory (serialized as `"agent-<id>"`). Tagging a source only records provenance on the message —
it does not change how the message is delivered, replace the session's system prompt, or grant
extra permissions. When `Source` is omitted, the field is left unset and the runtime treats the
message as ordinary user input.

## Best practices

Permission handling is opt-in. If a session may need tool, file, or system access, set `OnPermissionRequest` explicitly when creating it.

1. **Always clean up**: Use try-finally or `await using` to ensure `StopAsync()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Use `CancellationToken` for long-running requests
4. **Log errors**: Capture error details for debugging
