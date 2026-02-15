#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

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
