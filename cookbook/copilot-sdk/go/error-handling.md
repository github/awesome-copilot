# Error Handling Patterns

Handle errors gracefully in your Copilot SDK applications.

> **Runnable example:** [recipe/error-handling.go](recipe/error-handling.go)
>
> ```bash
> go run recipe/error-handling.go
> ```

## Example scenario

You need to handle various error conditions like connection failures, timeouts, and invalid responses.

## Basic error handling

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
    }

    response := <-responseChan
    fmt.Println(response)
}
```

## Handling specific error types

```go
import (
    "errors"
    "os/exec"
)

func startClient() error {
    client := copilot.NewClient()

    if err := client.Start(); err != nil {
        var execErr *exec.Error
        if errors.As(err, &execErr) {
            return fmt.Errorf("Copilot CLI not found. Please install it first: %w", err)
        }
        if errors.Is(err, context.DeadlineExceeded) {
            return fmt.Errorf("Could not connect to Copilot CLI server: %w", err)
        }
        return fmt.Errorf("Unexpected error: %w", err)
    }

    return nil
}
```

## Timeout handling

```go
import (
    "context"
    "time"
)

func sendWithTimeout(session *copilot.Session) error {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    responseChan := make(chan string, 1)
    errChan := make(chan error, 1)

    session.On(func(event copilot.Event) {
        if msg, ok := event.(copilot.AssistantMessageEvent); ok {
            responseChan <- msg.Data.Content
        }
    })

    if err := session.Send(copilot.MessageOptions{Prompt: "Complex question..."}); err != nil {
        return err
    }

    select {
    case response := <-responseChan:
        fmt.Println(response)
        return nil
    case err := <-errChan:
        return err
    case <-ctx.Done():
        return fmt.Errorf("request timed out")
    }
}
```

## Aborting a request

```go
func abortAfterDelay(session *copilot.Session) {
    // Start a request
    session.Send(copilot.MessageOptions{Prompt: "Write a very long story..."})

    // Abort it after some condition
    time.AfterFunc(5*time.Second, func() {
        if err := session.Abort(); err != nil {
            log.Printf("Failed to abort: %v", err)
        }
        fmt.Println("Request aborted")
    })
}
```

## Graceful shutdown

```go
import (
    "os"
    "os/signal"
    "syscall"
)

func main() {
    client := copilot.NewClient()

    // Set up signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    go func() {
        <-sigChan
        fmt.Println("\nShutting down...")

        if err := client.Stop(); err != nil {
            log.Printf("Cleanup errors: %v", err)
        }

        os.Exit(0)
    }()

    if err := client.Start(); err != nil {
        log.Fatal(err)
    }

    // ... do work ...
}
```

## Deferred cleanup pattern

```go
func doWork() error {
    client := copilot.NewClient()

    if err := client.Start(); err != nil {
        return fmt.Errorf("failed to start: %w", err)
    }
    defer client.Stop()

    session, err := client.CreateSession(copilot.SessionConfig{Model: "gpt-5"})
    if err != nil {
        return fmt.Errorf("failed to create session: %w", err)
    }
    defer session.Destroy()

    // ... do work ...

    return nil
}
```

## Best practices

1. **Always clean up**: Use defer to ensure `Stop()` is called
2. **Handle connection errors**: The CLI might not be installed or running
3. **Set appropriate timeouts**: Use `context.WithTimeout` for long-running requests
4. **Log errors**: Capture error details for debugging
5. **Wrap errors**: Use `fmt.Errorf` with `%w` to preserve error chains
