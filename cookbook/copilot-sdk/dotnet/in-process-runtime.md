# In-Process Runtime

Run the Copilot runtime inside your own process instead of launching a separate Copilot CLI process.

> **Runnable example:** [recipe/in-process-runtime.cs](recipe/in-process-runtime.cs)
>
> ```bash
> dotnet run recipe/in-process-runtime.cs
> ```

## Example scenario

By default, `CopilotClient` launches and manages a separate Copilot CLI child process and talks to
it over stdio or TCP. Some deployments — for example, tightly sandboxed hosts, single-binary
services, or environments where spawning child processes is restricted — need the runtime loaded
directly into the application process instead.

## Using the in-process connection

```csharp
using GitHub.Copilot;

// RuntimeConnection.ForInProcess() is an experimental API (diagnostic GHCP001).
#pragma warning disable GHCP001

var client = new CopilotClient(new CopilotClientOptions
{
    Connection = RuntimeConnection.ForInProcess()
});

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

await session.SendAsync(new MessageOptions { Prompt = "Hello from the in-process runtime!" });
Console.WriteLine(await done.Task);

await client.StopAsync();
```

`RuntimeConnection.ForInProcess()` is marked `[Experimental("GHCP001")]`, so any code that calls it
must either suppress the diagnostic with `#pragma warning disable GHCP001` (as above) or opt in at
the project level. Everything past client construction — sessions, streaming events, tools, hooks,
and permissions — behaves the same as with the default CLI-launching connection.

## How it works

Instead of spawning a child process, the SDK loads the native Copilot runtime library directly into
your application and communicates with it over an in-memory connection using the same
`Content-Length`-framed JSON-RPC protocol the CLI transport uses. The runtime can invoke SDK
callbacks from native worker threads; the SDK handles marshalling those calls back onto managed
threads for you.

You can also select the in-process transport without changing application code by setting
`COPILOT_SDK_DEFAULT_CONNECTION=inprocess` before startup — the SDK only falls back to this
environment variable when the client doesn't specify a connection explicitly.

## Limitations

The in-process transport is experimental and comes with a few constraints to be aware of:

- **Shared process state**: every in-process client shares the host process's environment,
  current working directory, and native runtime library — there's no per-client working directory
  or environment override.
- **Rejected process options**: `CopilotClientOptions.Environment`, telemetry configuration, and
  similar options that assume a separate child process are not supported and throw if set.
- **One runtime version per process**: once a native runtime library is loaded, starting another
  client with a different runtime library path or version fails. Starting additional clients that
  reuse the same already-loaded library is fine.
- **Persistent load**: the native library stays loaded for the lifetime of the process even after
  `StopAsync()` gracefully shuts down the client's sessions and connection — don't rely on being
  able to unload and swap in a different runtime build later.

## Best practices

1. **Test per platform**: validate startup, model turns, and shutdown on every OS/architecture
   combination you deploy, since runtime library support varies.
2. **Prefer the default CLI transport** unless you specifically need to avoid a child process —
   it's the most established and isolated deployment path.
3. **Still call `StopAsync()`**: graceful shutdown still closes sessions and the JSON-RPC
   connection cleanly, even though the native library itself remains loaded.
4. **Set process-wide values early**: configure environment variables and working directory before
   creating the first in-process client, since later clients can't override them per-instance.
