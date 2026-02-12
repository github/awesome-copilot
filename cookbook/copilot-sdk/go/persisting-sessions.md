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
    "context"
    "fmt"
    copilot "github.com/github/copilot-sdk/go"
)

func main() {
    ctx := context.Background()
    client := copilot.NewClient(nil)
    client.Start(ctx)
    defer client.Stop()

    // Create session with a memorable ID
    session, _ := client.CreateSession(ctx, &copilot.SessionConfig{
        SessionID: "user-123-conversation",
        Model:     "gpt-5",
    })

    session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "Let's discuss TypeScript generics"})

    // Session ID is preserved
    fmt.Println(session.SessionID)

    // Destroy session but keep data on disk
    session.Destroy()
}
```

### Resuming a session

```go
ctx := context.Background()
client := copilot.NewClient(nil)
client.Start(ctx)
defer client.Stop()

// Resume the previous session
session, _ := client.ResumeSession(ctx, "user-123-conversation")

// Previous context is restored
session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "What were we discussing?"})

session.Destroy()
```

### Listing available sessions

```go
sessions, _ := client.ListSessions(ctx)
for _, s := range sessions {
    fmt.Println("Session:", s.SessionID)
}
```

### Deleting a session permanently

```go
// Remove session and all its data from disk
client.DeleteSession(ctx, "user-123-conversation")
```

### Getting session history

```go
messages, _ := session.GetMessages(ctx)
for _, msg := range messages {
    if msg.Data.Content != nil {
        fmt.Printf("[%s] %s\n", msg.Type, *msg.Data.Content)
    }
}
```

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed
