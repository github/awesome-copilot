# Grouping Files by Metadata

Use Copilot to intelligently organize files in a folder based on their metadata.

> **Runnable example:** [recipe/managing-local-files.go](recipe/managing-local-files.go)
>
> ```bash
> go run recipe/managing-local-files.go
> ```

## Example scenario

You have a folder with many files and want to organize them into subfolders based on metadata like file type, creation date, size, or other attributes. Copilot can analyze the files and suggest or execute a grouping strategy.

## Example code

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "path/filepath"
    copilot "github.com/github/copilot-sdk/go"
)

func main() {
    ctx := context.Background()

    // Create and start client
    client := copilot.NewClient(nil)
    if err := client.Start(ctx); err != nil {
        log.Fatal(err)
    }
    defer client.Stop()

    // Create session
    session, err := client.CreateSession(ctx, &copilot.SessionConfig{
        Model: "gpt-5",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer session.Destroy()

    // Event handler
    session.On(func(event copilot.SessionEvent) {
        switch event.Type {
        case "assistant.message":
            if event.Data.Content != nil {
                fmt.Printf("\nCopilot: %s\n", *event.Data.Content)
            }
        case "tool.execution_start":
            if event.Data.ToolName != nil {
                fmt.Printf("  → Running: %s\n", *event.Data.ToolName)
            }
        case "tool.execution_complete":
            if event.Data.ToolName != nil {
                fmt.Printf("  ✓ Completed: %s\n", *event.Data.ToolName)
            }
        }
    })

    // Ask Copilot to organize files
    homeDir, _ := os.UserHomeDir()
    targetFolder := filepath.Join(homeDir, "Downloads")

    prompt := fmt.Sprintf(`
Analyze the files in "%s" and organize them into subfolders.

1. First, list all files and their metadata
2. Preview grouping by file extension
3. Create appropriate subfolders (e.g., "images", "documents", "videos")
4. Move each file to its appropriate subfolder

Please confirm before moving any files.
`, targetFolder)

    _, err = session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt})
    if err != nil {
        log.Fatal(err)
    }
}
```

## Grouping strategies

### By file extension

```go
// Groups files like:
// images/   -> .jpg, .png, .gif
// documents/ -> .pdf, .docx, .txt
// videos/   -> .mp4, .avi, .mov
```

### By creation date

```go
// Groups files like:
// 2024-01/ -> files created in January 2024
// 2024-02/ -> files created in February 2024
```

### By file size

```go
// Groups files like:
// tiny-under-1kb/
// small-under-1mb/
// medium-under-100mb/
// large-over-100mb/
```

## Dry-run mode

For safety, you can ask Copilot to only preview changes:

```go
prompt := fmt.Sprintf(`
Analyze files in "%s" and show me how you would organize them
by file type. DO NOT move any files - just show me the plan.
`, targetFolder)

session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt})
```

## Custom grouping with AI analysis

Let Copilot determine the best grouping based on file content:

```go
prompt := fmt.Sprintf(`
Look at the files in "%s" and suggest a logical organization.
Consider:
- File names and what they might contain
- File types and their typical uses
- Date patterns that might indicate projects or events

Propose folder names that are descriptive and useful.
`, targetFolder)

session.SendAndWait(ctx, copilot.MessageOptions{Prompt: prompt})
```

## Safety considerations

1. **Confirm before moving**: Ask Copilot to confirm before executing moves
2. **Handle duplicates**: Consider what happens if a file with the same name exists
3. **Preserve originals**: Consider copying instead of moving for important files
