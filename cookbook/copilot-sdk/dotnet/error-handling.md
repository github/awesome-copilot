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
using GitHub.Copilot.SDK;

var client = new CopilotClient();

try
{
    await client.StartAsync();
    var session = await client.CreateSessionAsync(new SessionConfig
    {
        Model = "gpt-5"
    });

    var done = new TaskCompletionSource<string>();
    session.On(evt =>
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
var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });

try
{
    var done = new TaskCompletionSource<string>();
    session.On(evt =>
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
var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });

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

    var errors = await client.StopAsync();
    if (errors.Count > 0)
    {
        Console.WriteLine($"Cleanup errors: {string.Join(", ", errors)}");
    }

    Environment.Exit(0);
};
```

## Using await using for automatic disposal

```csharp
await using var client = new CopilotClient();
await client.StartAsync();

var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });

// ... do work ...

// client.StopAsync() is automatically called when exiting scope
```

## Best practices

1. **Always clean up**: Use try-finally or `await using` to ensure `StopAsync()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Use `CancellationToken` for long-running requests
4. **Log errors**: Capture error details for debugging
