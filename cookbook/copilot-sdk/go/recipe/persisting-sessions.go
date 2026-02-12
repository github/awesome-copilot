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

	// Create session with a memorable ID
	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		SessionID: "user-123-conversation",
		Model:     "gpt-5",
	})
	if err != nil {
		log.Fatal(err)
	}

	_, err = session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "Let's discuss TypeScript generics"})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Session created: %s\n", session.SessionID)

	// Destroy session but keep data on disk
	session.Destroy()
	fmt.Println("Session destroyed (state persisted)")

	// Resume the previous session
	resumed, err := client.ResumeSession(ctx, "user-123-conversation")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Resumed: %s\n", resumed.SessionID)

	_, err = resumed.SendAndWait(ctx, copilot.MessageOptions{Prompt: "What were we discussing?"})
	if err != nil {
		log.Fatal(err)
	}

	// List sessions
	sessions, err := client.ListSessions(ctx)
	if err != nil {
		log.Fatal(err)
	}
	ids := make([]string, 0, len(sessions))
	for _, s := range sessions {
		ids = append(ids, s.SessionID)
	}
	fmt.Printf("Sessions: %v\n", ids)

	// Delete session permanently
	if err := client.DeleteSession(ctx, "user-123-conversation"); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Session deleted")

	resumed.Destroy()
}
