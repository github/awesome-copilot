#:package GitHub.Copilot.SDK@*
#:property PublishAot=false

using GitHub.Copilot.SDK;

// Create and start client
await using var client = new CopilotClient();
await client.StartAsync();

// Define tools for file operations
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5"
});

// Wait for completion
var done = new TaskCompletionSource();

session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageEvent msg:
            Console.WriteLine($"\nCopilot: {msg.Data.Content}");
            break;
        case ToolExecutionStartEvent toolStart:
            Console.WriteLine($"  → Running: {toolStart.Data.ToolName} ({toolStart.Data.ToolCallId})");
            break;
        case ToolExecutionCompleteEvent toolEnd:
            Console.WriteLine($"  ✓ Completed: {toolEnd.Data.ToolCallId}");
            break;
        case SessionIdleEvent:
            done.SetResult();
            break;
    }
});

// Ask Copilot to organize files
// Change this to your target folder
var targetFolder = @"C:\Users\Me\Downloads";

await session.SendAsync(new MessageOptions
{
    Prompt = $"""
        Analyze the files in "{targetFolder}" and organize them into subfolders.

        1. First, list all files and their metadata
        2. Preview grouping by file extension
        3. Create appropriate subfolders (e.g., "images", "documents", "videos")
        4. Move each file to its appropriate subfolder

        Please confirm before moving any files.
        """
});

await done.Task;
