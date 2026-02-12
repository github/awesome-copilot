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
		log.Fatalf("Failed to start client: %v", err)
	}
	defer client.Stop()

	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		Model: "gpt-5",
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	defer session.Destroy()

	result, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "Hello!"})
	if err != nil {
		log.Printf("Failed to send message: %v", err)
		return
	}

	if result != nil && result.Data.Content != nil {
		fmt.Println(*result.Data.Content)
	}
}
