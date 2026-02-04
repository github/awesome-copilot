# Session Persistence and Resumption

Save and restore conversation sessions across application restarts.

## Example scenario

You want users to be able to continue a conversation even after closing and reopening your application.

> **Runnable example:** [recipe/persisting-sessions.go](recipe/persisting-sessions.go)
>
> ```bash
> cd recipe
> go run persisting-sessions.go
> ```

### Creating a session with a custom ID

```go
package main

import (
    "fmt"
    "github.com/github/copilot-sdk/go"
)

func main() {
    client := copilot.NewClient()
    client.Start()
    defer client.Stop()

    // Create session with a memorable ID
    session, _ := client.CreateSession(copilot.SessionConfig{
        SessionID: "user-123-conversation",
        Model:     "gpt-5",
    })

    session.Send(copilot.MessageOptions{Prompt: "Let's discuss TypeScript generics"})

    // Session ID is preserved
    fmt.Println(session.SessionID)

    // Destroy session but keep data on disk
    session.Destroy()
}
```

### Resuming a session

```go
client := copilot.NewClient()
client.Start()
defer client.Stop()

// Resume the previous session
session, _ := client.ResumeSession("user-123-conversation")

// Previous context is restored
session.Send(copilot.MessageOptions{Prompt: "What were we discussing?"})

session.Destroy()
```

### Listing available sessions

```go
sessions, _ := client.ListSessions()
for _, s := range sessions {
    fmt.Println("Session:", s.SessionID)
}
```

### Deleting a session permanently

```go
// Remove session and all its data from disk
client.DeleteSession("user-123-conversation")
```

### Getting session history

```go
messages, _ := session.GetMessages()
for _, msg := range messages {
    fmt.Printf("[%s] %v\n", msg.Type, msg.Data)
}
```

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed
