package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/github/copilot-sdk/go"
)

func main() {
	// Create and start client
	client := copilot.NewClient()
	if err := client.Start(); err != nil {
		log.Fatal(err)
	}
	defer client.Stop()

	// Create session
	session, err := client.CreateSession(copilot.SessionConfig{
		Model: "gpt-5",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer session.Destroy()

	// Event handler
	session.On(func(event copilot.Event) {
		switch e := event.(type) {
		case copilot.AssistantMessageEvent:
			fmt.Printf("\nCopilot: %s\n", e.Data.Content)
		case copilot.ToolExecutionStartEvent:
			fmt.Printf("  → Running: %s\n", e.Data.ToolName)
		case copilot.ToolExecutionCompleteEvent:
			fmt.Printf("  ✓ Completed: %s\n", e.Data.ToolName)
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

	if err := session.Send(copilot.MessageOptions{Prompt: prompt}); err != nil {
		log.Fatal(err)
	}

	session.WaitForIdle()
}
