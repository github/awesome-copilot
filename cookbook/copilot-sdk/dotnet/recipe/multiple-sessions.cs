#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

// The GitHub.Copilot.SDK package exposes the GitHub.Copilot namespace.
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

Console.WriteLine("Created 3 independent sessions");

// Each session maintains its own conversation history
await session1.SendAsync(new MessageOptions { Prompt = "You are helping with a Python project" });
await session2.SendAsync(new MessageOptions { Prompt = "You are helping with a TypeScript project" });
await session3.SendAsync(new MessageOptions { Prompt = "You are helping with a Go project" });

Console.WriteLine("Sent initial context to all sessions");

// Follow-up messages stay in their respective contexts
await session1.SendAsync(new MessageOptions { Prompt = "How do I create a virtual environment?" });
await session2.SendAsync(new MessageOptions { Prompt = "How do I set up tsconfig?" });
await session3.SendAsync(new MessageOptions { Prompt = "How do I initialize a module?" });

Console.WriteLine("Sent follow-up questions to each session");

// Clean up all sessions
await session1.DisposeAsync();
await session2.DisposeAsync();
await session3.DisposeAsync();

Console.WriteLine("All sessions destroyed successfully");
