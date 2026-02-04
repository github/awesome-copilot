# Working with Multiple Sessions

Manage multiple independent conversations simultaneously.

> **Runnable example:** [recipe/multiple-sessions.go](recipe/multiple-sessions.go)
>
> ```bash
> go run recipe/multiple-sessions.go
> ```

## Example scenario

You need to run multiple conversations in parallel, each with its own context and history.

## Go

```go
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

    // Create multiple independent sessions
    session1, err := client.CreateSession(copilot.SessionConfig{Model: "gpt-5"})
    if err != nil {
        log.Fatal(err)
    }
    defer session1.Destroy()

    session2, err := client.CreateSession(copilot.SessionConfig{Model: "gpt-5"})
    if err != nil {
        log.Fatal(err)
    }
    defer session2.Destroy()

    session3, err := client.CreateSession(copilot.SessionConfig{Model: "claude-sonnet-4.5"})
    if err != nil {
        log.Fatal(err)
    }
    defer session3.Destroy()

    // Each session maintains its own conversation history
    session1.Send(copilot.MessageOptions{Prompt: "You are helping with a Python project"})
    session2.Send(copilot.MessageOptions{Prompt: "You are helping with a TypeScript project"})
    session3.Send(copilot.MessageOptions{Prompt: "You are helping with a Go project"})

    // Follow-up messages stay in their respective contexts
    session1.Send(copilot.MessageOptions{Prompt: "How do I create a virtual environment?"})
    session2.Send(copilot.MessageOptions{Prompt: "How do I set up tsconfig?"})
    session3.Send(copilot.MessageOptions{Prompt: "How do I initialize a module?"})
}
```

## Custom session IDs

Use custom IDs for easier tracking:

```go
session, err := client.CreateSession(copilot.SessionConfig{
    SessionID: "user-123-chat",
    Model:     "gpt-5",
})
if err != nil {
    log.Fatal(err)
}

fmt.Println(session.SessionID) // "user-123-chat"
```

## Listing sessions

```go
sessions, err := client.ListSessions()
if err != nil {
    log.Fatal(err)
}

for _, sessionInfo := range sessions {
    fmt.Printf("Session: %s\n", sessionInfo.SessionID)
}
```

## Deleting sessions

```go
// Delete a specific session
if err := client.DeleteSession("user-123-chat"); err != nil {
    log.Printf("Failed to delete session: %v", err)
}
```

## Use cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models
