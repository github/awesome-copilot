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
```

## Handling specific error types

```go
import (
    "context"
    "errors"
    "fmt"
    "os/exec"
    copilot "github.com/github/copilot-sdk/go"
)

func startClient(ctx context.Context) error {
    client := copilot.NewClient(nil)

    if err := client.Start(ctx); err != nil {
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
    "errors"
    "fmt"
    "time"
    copilot "github.com/github/copilot-sdk/go"
)

func sendWithTimeout(session *copilot.Session) error {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    result, err := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "Complex question..."})
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return fmt.Errorf("request timed out")
        }
        return err
    }

    if result != nil && result.Data.Content != nil {
        fmt.Println(*result.Data.Content)
    }
    return nil
}
```

## Aborting a request

```go
func abortAfterDelay(ctx context.Context, session *copilot.Session) {
    // Start a request (non-blocking send)
    session.Send(ctx, copilot.MessageOptions{Prompt: "Write a very long story..."})

    // Abort it after some condition
    time.AfterFunc(5*time.Second, func() {
        if err := session.Abort(ctx); err != nil {
            log.Printf("Failed to abort: %v", err)
        }
        fmt.Println("Request aborted")
    })
}
```

## Graceful shutdown

```go
import (
    "context"
    "fmt"
    "log"
    "os"
    "os/signal"
    "syscall"
    copilot "github.com/github/copilot-sdk/go"
)

func main() {
    ctx := context.Background()
    client := copilot.NewClient(nil)

    // Set up signal handling
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

    go func() {
        <-sigChan
        fmt.Println("\nShutting down...")
        client.Stop()
        os.Exit(0)
    }()

    if err := client.Start(ctx); err != nil {
        log.Fatal(err)
    }

    // ... do work ...
}
```

## Deferred cleanup pattern

```go
func doWork() error {
    ctx := context.Background()
    client := copilot.NewClient(nil)

    if err := client.Start(ctx); err != nil {
        return fmt.Errorf("failed to start: %w", err)
    }
    defer client.Stop()

    session, err := client.CreateSession(ctx, &copilot.SessionConfig{Model: "gpt-5"})
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
