package main

import (
    "fmt"
    "log"

    "github.com/github/copilot-sdk/go"
)

func main() {
    client := copilot.NewClient()
    if err := client.Start(); err != nil {
        log.Fatal(err)
    }
    defer client.Stop()

    // Create session with a memorable ID
    session, err := client.CreateSession(copilot.SessionConfig{
        SessionID: "user-123-conversation",
        Model:     "gpt-5",
    })
    if err != nil {
        log.Fatal(err)
    }

    if err := session.Send(copilot.MessageOptions{Prompt: "Let's discuss TypeScript generics"}); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Session created: %s\n", session.SessionID)

    // Destroy session but keep data on disk
    if err := session.Destroy(); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Session destroyed (state persisted)")

    // Resume the previous session
    resumed, err := client.ResumeSession("user-123-conversation")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Resumed: %s\n", resumed.SessionID)

    if err := resumed.Send(copilot.MessageOptions{Prompt: "What were we discussing?"}); err != nil {
        log.Fatal(err)
    }

    // List sessions
    sessions, err := client.ListSessions()
    if err != nil {
        log.Fatal(err)
    }
    ids := make([]string, 0, len(sessions))
    for _, s := range sessions {
        ids = append(ids, s.SessionID)
    }
    fmt.Printf("Sessions: %v\n", ids)

    // Delete session permanently
    if err := client.DeleteSession("user-123-conversation"); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Session deleted")

    if err := resumed.Destroy(); err != nil {
        log.Fatal(err)
    }
}
