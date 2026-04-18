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
		OnPermissionRequest: copilot.PermissionHandler.ApproveAll,
		Model:               "gpt-5.4",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer session.Disconnect()

	// Event handler
	session.On(func(event copilot.SessionEvent) {
		switch d := event.Data.(type) {
		case *copilot.AssistantMessageData:
			fmt.Printf("\nCopilot: %s\n", d.Content)
		case *copilot.ToolExecutionStartData:
			fmt.Printf("  → Running: %s\n", d.ToolName)
		case *copilot.ToolExecutionCompleteData:
			fmt.Printf("  ✓ Completed (success=%v)\n", d.Success)
		}
	})

	// Ask Copilot to organize files
	// Change this to your target folder
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
