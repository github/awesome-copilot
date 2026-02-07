package main

import (
	"fmt"
	"log"

	"github.com/github/copilot-sdk/go"
)

func main() {
	client := copilot.NewClient()

	if err := client.Start(); err != nil {
		log.Fatalf("Failed to start client: %v", err)
	}
	defer func() {
		if err := client.Stop(); err != nil {
			log.Printf("Error stopping client: %v", err)
		}
	}()

	session, err := client.CreateSession(copilot.SessionConfig{
		Model: "gpt-5",
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	defer session.Destroy()

	responseChan := make(chan string, 1)
	session.On(func(event copilot.Event) {
		if msg, ok := event.(copilot.AssistantMessageEvent); ok {
			responseChan <- msg.Data.Content
		}
	})

	if err := session.Send(copilot.MessageOptions{Prompt: "Hello!"}); err != nil {
		log.Printf("Failed to send message: %v", err)
		return
	}

	response := <-responseChan
	fmt.Println(response)
}
