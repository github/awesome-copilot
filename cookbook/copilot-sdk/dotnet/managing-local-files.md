# Grouping Files by Metadata

Use Copilot to intelligently organize files in a folder based on their metadata.

> **Runnable example:** [recipe/managing-local-files.cs](recipe/managing-local-files.cs)
>
> ```bash
> dotnet run recipe/managing-local-files.cs
> ```

## Example scenario

You have a folder with many files and want to organize them into subfolders based on metadata like file type, creation date, size, or other attributes. Copilot can analyze the files and suggest or execute a grouping strategy.

## Example code

```csharp
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
```

## Grouping strategies

### By file extension

```csharp
// Groups files like:
// images/   -> .jpg, .png, .gif
// documents/ -> .pdf, .docx, .txt
// videos/   -> .mp4, .avi, .mov
```

### By creation date

```csharp
// Groups files like:
// 2024-01/ -> files created in January 2024
// 2024-02/ -> files created in February 2024
```

### By file size

```csharp
// Groups files like:
// tiny-under-1kb/
// small-under-1mb/
// medium-under-100mb/
// large-over-100mb/
```

## Dry-run mode

For safety, you can ask Copilot to only preview changes:

```csharp
await session.SendAsync(new MessageOptions
{
    Prompt = $"""
        Analyze files in "{targetFolder}" and show me how you would organize them
        by file type. DO NOT move any files - just show me the plan.
        """
});
```

## Custom grouping with AI analysis

Let Copilot determine the best grouping based on file content:

```csharp
await session.SendAsync(new MessageOptions
{
    Prompt = $"""
        Look at the files in "{targetFolder}" and suggest a logical organization.
        Consider:
        - File names and what they might contain
        - File types and their typical uses
        - Date patterns that might indicate projects or events

        Propose folder names that are descriptive and useful.
        """
});
```

## Safety considerations

1. **Confirm before moving**: Ask Copilot to confirm before executing moves
1. **Handle duplicates**: Consider what happens if a file with the same name exists
1. **Preserve originals**: Consider copying instead of moving for important files
