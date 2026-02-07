#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

using GitHub.Copilot.SDK;

await using var client = new CopilotClient();
await client.StartAsync();

// Create multiple independent sessions
var session1 = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });
var session2 = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-5" });
var session3 = await client.CreateSessionAsync(new SessionConfig { Model = "claude-sonnet-4.5" });

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
