#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

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
Console.WriteLine($"Session created: {session.SessionId}");

// Destroy session but keep data on disk
await session.DisposeAsync();
Console.WriteLine("Session destroyed (state persisted)");

// Resume the previous session
var resumed = await client.ResumeSessionAsync("user-123-conversation");
Console.WriteLine($"Resumed: {resumed.SessionId}");

await resumed.SendAsync(new MessageOptions { Prompt = "What were we discussing?" });

// List sessions
var sessions = await client.ListSessionsAsync();
Console.WriteLine("Sessions: " + string.Join(", ", sessions.Select(s => s.SessionId)));

// Delete session permanently
await client.DeleteSessionAsync("user-123-conversation");
Console.WriteLine("Session deleted");

await resumed.DisposeAsync();
await client.StopAsync();
