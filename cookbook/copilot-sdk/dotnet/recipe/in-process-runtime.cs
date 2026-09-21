#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

// The GitHub.Copilot.SDK package exposes the GitHub.Copilot namespace.
using GitHub.Copilot;

// RuntimeConnection.ForInProcess() is an experimental API (diagnostic GHCP001):
// it loads the native Copilot runtime directly into this process instead of
// launching a separate Copilot CLI process.
#pragma warning disable GHCP001

var client = new CopilotClient(new CopilotClientOptions
{
    Connection = RuntimeConnection.ForInProcess()
});

try
{
    await client.StartAsync();

    var session = await client.CreateSessionAsync(new SessionConfig
    {
        Model = "gpt-5",
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
    var response = await done.Task;
    Console.WriteLine(response);

    await session.DisposeAsync();
}
finally
{
    // Gracefully stop; the native runtime library itself stays loaded for the
    // lifetime of the process (see the "Lifecycle behavior" notes in the docs).
    await client.StopAsync();
}
