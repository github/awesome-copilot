package main

import (
	"context"
	"fmt"
	"log"

	copilot "github.com/github/copilot-sdk/go"
)

func main() {
	ctx := context.Background()
	client := copilot.NewClient(nil)

	if err := client.Start(ctx); err != nil {
		log.Fatal(err)
	}
	defer client.Stop()

	// Create multiple independent sessions
	session1, err := client.CreateSession(ctx, &copilot.SessionConfig{Model: "gpt-5"})
	if err != nil {
		log.Fatal(err)
	}
	defer session1.Destroy()

	session2, err := client.CreateSession(ctx, &copilot.SessionConfig{Model: "gpt-5"})
	if err != nil {
		log.Fatal(err)
	}
	defer session2.Destroy()

	session3, err := client.CreateSession(ctx, &copilot.SessionConfig{Model: "claude-sonnet-4.5"})
	if err != nil {
		log.Fatal(err)
	}
	defer session3.Destroy()

	fmt.Println("Created 3 independent sessions")

	// Each session maintains its own conversation history
	session1.Send(ctx, copilot.MessageOptions{Prompt: "You are helping with a Python project"})
	session2.Send(ctx, copilot.MessageOptions{Prompt: "You are helping with a TypeScript project"})
	session3.Send(ctx, copilot.MessageOptions{Prompt: "You are helping with a Go project"})

	fmt.Println("Sent initial context to all sessions")

	// Follow-up messages stay in their respective contexts
	session1.Send(ctx, copilot.MessageOptions{Prompt: "How do I create a virtual environment?"})
	session2.Send(ctx, copilot.MessageOptions{Prompt: "How do I set up tsconfig?"})
	session3.Send(ctx, copilot.MessageOptions{Prompt: "How do I initialize a module?"})

	fmt.Println("Sent follow-up questions to each session")
	fmt.Println("All sessions will be destroyed on exit")
}
