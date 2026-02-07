---
applyTo: "**.go, go.mod"
description: "This file provides guidance on building Go applications using GitHub Copilot SDK."
name: "GitHub Copilot SDK Go Instructions"
---

## Core Principles

- The SDK is in technical preview and may have breaking changes
- Requires Go 1.21 or later
- Requires GitHub Copilot CLI installed and in PATH
- Uses goroutines and channels for concurrent operations
- No external dependencies beyond the standard library

## Installation

Always install via Go modules:

```bash
go get github.com/github/copilot-sdk/go
```

## Client Initialization

### Basic Client Setup

```go
import "github.com/github/copilot-sdk/go"

client := copilot.NewClient(nil)
if err := client.Start(); err != nil {
    log.Fatal(err)
}
defer client.Stop()
```

### Client Configuration Options

When creating a CopilotClient, use `ClientOptions`:

- `CLIPath` - Path to CLI executable (default: "copilot" from PATH)
- `CLIUrl` - URL of existing CLI server (e.g., "localhost:8080"). When provided, client won't spawn a process
- `Port` - Server port (default: 0 for random)
- `UseStdio` - Use stdio transport instead of TCP (default: true)
- `LogLevel` - Log level (default: "info")
- `AutoStart` - Auto-start server (default: true, use pointer: `boolPtr(true)`)
- `AutoRestart` - Auto-restart on crash (default: true, use pointer: `boolPtr(true)`)
- `Cwd` - Working directory for the CLI process
- `Env` - Environment variables for the CLI process ([]string)

### Manual Server Control

For explicit control:

```go
autoStart := false
client := copilot.NewClient(&copilot.ClientOptions{AutoStart: &autoStart})
if err := client.Start(); err != nil {
    log.Fatal(err)
}
// Use client...
client.Stop()
```

Use `ForceStop()` when `Stop()` takes too long.

## Session Management

### Creating Sessions

Use `SessionConfig` for configuration:

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    Streaming: true,
    Tools: []copilot.Tool{...},
    SystemMessage: &copilot.SystemMessageConfig{ ... },
    AvailableTools: []string{"tool1", "tool2"},
    ExcludedTools: []string{"tool3"},
    Provider: &copilot.ProviderConfig{ ... },
})
if err != nil {
    log.Fatal(err)
}
```

### Session Config Options

- `SessionID` - Custom session ID
- `Model` - Model name ("gpt-5", "claude-sonnet-4.5", etc.)
- `Tools` - Custom tools exposed to the CLI ([]Tool)
- `SystemMessage` - System message customization (\*SystemMessageConfig)
- `AvailableTools` - Allowlist of tool names ([]string)
- `ExcludedTools` - Blocklist of tool names ([]string)
- `Provider` - Custom API provider configuration (BYOK) (\*ProviderConfig)
- `Streaming` - Enable streaming response chunks (bool)
- `MCPServers` - MCP server configurations
- `CustomAgents` - Custom agent configurations
- `ConfigDir` - Config directory override
- `SkillDirectories` - Skill directories ([]string)
- `DisabledSkills` - Disabled skills ([]string)

### Resuming Sessions

```go
session, err := client.ResumeSession("session-id")
// Or with options:
session, err := client.ResumeSessionWithOptions("session-id", &copilot.ResumeSessionConfig{ ... })
```

### Session Operations

- `session.SessionID` - Get session identifier (string)
- `session.Send(copilot.MessageOptions{Prompt: "...", Attachments: []copilot.Attachment{...}})` - Send message, returns (messageID string, error)
- `session.SendAndWait(options, timeout)` - Send and wait for idle, returns (\*SessionEvent, error)
- `session.Abort()` - Abort current processing, returns error
- `session.GetMessages()` - Get all events/messages, returns ([]SessionEvent, error)
- `session.Destroy()` - Clean up session, returns error

## Event Handling

### Event Subscription Pattern

ALWAYS use channels or done signals for waiting on session events:

```go
done := make(chan struct{})

unsubscribe := session.On(func(evt copilot.SessionEvent) {
    switch evt.Type {
    case copilot.AssistantMessage:
        fmt.Println(*evt.Data.Content)
    case copilot.SessionIdle:
        close(done)
    }
})
defer unsubscribe()

session.Send(copilot.MessageOptions{Prompt: "..."})
<-done
```

### Unsubscribing from Events

The `On()` method returns a function that unsubscribes:

```go
unsubscribe := session.On(func(evt copilot.SessionEvent) {
    // handler
})
// Later...
unsubscribe()
```

### Event Types

Use type switches for event handling:

```go
session.On(func(evt copilot.SessionEvent) {
    switch evt.Type {
    case copilot.UserMessage:
        // Handle user message
    case copilot.AssistantMessage:
        if evt.Data.Content != nil {
            fmt.Println(*evt.Data.Content)
        }
    case copilot.ToolExecutionStart:
        // Tool execution started
    case copilot.ToolExecutionComplete:
        // Tool execution completed
    case copilot.SessionStart:
        // Session started
    case copilot.SessionIdle:
        // Session is idle (processing complete)
    case copilot.SessionError:
        if evt.Data.Message != nil {
            fmt.Println("Error:", *evt.Data.Message)
        }
    }
})
```

## Streaming Responses

### Enabling Streaming

Set `Streaming: true` in SessionConfig:

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    Streaming: true,
})
```

### Handling Streaming Events

Handle both delta events (incremental) and final events:

```go
done := make(chan struct{})

session.On(func(evt copilot.SessionEvent) {
    switch evt.Type {
    case copilot.AssistantMessageDelta:
        // Incremental text chunk
        if evt.Data.DeltaContent != nil {
            fmt.Print(*evt.Data.DeltaContent)
        }
    case copilot.AssistantReasoningDelta:
        // Incremental reasoning chunk (model-dependent)
        if evt.Data.DeltaContent != nil {
            fmt.Print(*evt.Data.DeltaContent)
        }
    case copilot.AssistantMessage:
        // Final complete message
        fmt.Println("\n--- Final ---")
        if evt.Data.Content != nil {
            fmt.Println(*evt.Data.Content)
        }
    case copilot.AssistantReasoning:
        // Final reasoning content
        fmt.Println("--- Reasoning ---")
        if evt.Data.Content != nil {
            fmt.Println(*evt.Data.Content)
        }
    case copilot.SessionIdle:
        close(done)
    }
})

session.Send(copilot.MessageOptions{Prompt: "Tell me a story"})
<-done
```

Note: Final events (`AssistantMessage`, `AssistantReasoning`) are ALWAYS sent regardless of streaming setting.

## Custom Tools

### Defining Tools

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    Tools: []copilot.Tool{
        {
            Name:        "lookup_issue",
            Description: "Fetch issue details from tracker",
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "id": map[string]interface{}{
                        "type":        "string",
                        "description": "Issue ID",
                    },
                },
                "required": []string{"id"},
            },
            Handler: func(inv copilot.ToolInvocation) (copilot.ToolResult, error) {
                args := inv.Arguments.(map[string]interface{})
                issueID := args["id"].(string)

                issue, err := fetchIssue(issueID)
                if err != nil {
                    return copilot.ToolResult{}, err
                }

                return copilot.ToolResult{
                    TextResultForLLM: fmt.Sprintf("Issue: %v", issue),
                    ResultType:       "success",
                    ToolTelemetry:    map[string]interface{}{},
                }, nil
            },
        },
    },
})
```

### Tool Return Types

- Return `ToolResult` struct with fields:
  - `TextResultForLLM` (string) - Result text for the LLM
  - `ResultType` (string) - "success" or "failure"
  - `Error` (string, optional) - Internal error message (not shown to LLM)
  - `ToolTelemetry` (map[string]interface{}) - Telemetry data

### Tool Execution Flow

When Copilot invokes a tool, the client automatically:

1. Runs your handler function
2. Returns the ToolResult
3. Responds to the CLI

## System Message Customization

### Append Mode (Default - Preserves Guardrails)

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    SystemMessage: &copilot.SystemMessageConfig{
        Mode: "append",
        Content: `
<workflow_rules>
- Always check for security vulnerabilities
- Suggest performance improvements when applicable
</workflow_rules>
`,
    },
})
```

### Replace Mode (Full Control - Removes Guardrails)

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    SystemMessage: &copilot.SystemMessageConfig{
        Mode:    "replace",
        Content: "You are a helpful assistant.",
    },
})
```

## File Attachments

Attach files to messages using `Attachment`:

```go
messageID, err := session.Send(copilot.MessageOptions{
    Prompt: "Analyze this file",
    Attachments: []copilot.Attachment{
        {
            Type:        "file",
            Path:        "/path/to/file.go",
            DisplayName: "My File",
        },
    },
})
```

## Message Delivery Modes

Use the `Mode` field in `MessageOptions`:

- `"enqueue"` - Queue message for processing
- `"immediate"` - Process message immediately

```go
session.Send(copilot.MessageOptions{
    Prompt: "...",
    Mode:   "enqueue",
})
```

## Multiple Sessions

Sessions are independent and can run concurrently:

```go
session1, _ := client.CreateSession(&copilot.SessionConfig{Model: "gpt-5"})
session2, _ := client.CreateSession(&copilot.SessionConfig{Model: "claude-sonnet-4.5"})

session1.Send(copilot.MessageOptions{Prompt: "Hello from session 1"})
session2.Send(copilot.MessageOptions{Prompt: "Hello from session 2"})
```

## Bring Your Own Key (BYOK)

Use custom API providers via `ProviderConfig`:

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Provider: &copilot.ProviderConfig{
        Type:    "openai",
        BaseURL: "https://api.openai.com/v1",
        APIKey:  "your-api-key",
    },
})
```

## Session Lifecycle Management

### Checking Connection State

```go
state := client.GetState()
// Returns: "disconnected", "connecting", "connected", or "error"
```

## Error Handling

### Standard Exception Handling

```go
session, err := client.CreateSession(&copilot.SessionConfig{})
if err != nil {
    log.Fatalf("Failed to create session: %v", err)
}

_, err = session.Send(copilot.MessageOptions{Prompt: "Hello"})
if err != nil {
    log.Printf("Failed to send: %v", err)
}
```

### Session Error Events

Monitor `SessionError` type for runtime errors:

```go
session.On(func(evt copilot.SessionEvent) {
    if evt.Type == copilot.SessionError {
        if evt.Data.Message != nil {
            fmt.Fprintf(os.Stderr, "Session Error: %s\n", *evt.Data.Message)
        }
    }
})
```

## Connectivity Testing

Use Ping to verify server connectivity:

```go
resp, err := client.Ping("test message")
if err != nil {
    log.Printf("Server unreachable: %v", err)
} else {
    log.Printf("Server responded at %d", resp.Timestamp)
}
```

## Resource Cleanup

### Cleanup with Defer

ALWAYS use `defer` for cleanup:

```go
client := copilot.NewClient(nil)
if err := client.Start(); err != nil {
    log.Fatal(err)
}
defer client.Stop()

session, err := client.CreateSession(nil)
if err != nil {
    log.Fatal(err)
}
defer session.Destroy()
```

### Manual Cleanup

If not using defer:

```go
client := copilot.NewClient(nil)
err := client.Start()
if err != nil {
    log.Fatal(err)
}

session, err := client.CreateSession(nil)
if err != nil {
    client.Stop()
    log.Fatal(err)
}

// Use session...

session.Destroy()
errors := client.Stop()
for _, err := range errors {
    log.Printf("Cleanup error: %v", err)
}
```

## Best Practices

1. **Always use `defer`** for cleanup of clients and sessions
2. **Use channels** to wait for SessionIdle event
3. **Handle SessionError** events for robust error handling
4. **Use type switches** for event handling
5. **Enable streaming** for better UX in interactive scenarios
6. **Provide descriptive tool names and descriptions** for better model understanding
7. **Call unsubscribe functions** when no longer needed
8. **Use SystemMessageConfig with Mode: "append"** to preserve safety guardrails
9. **Handle both delta and final events** when streaming is enabled
10. **Check nil pointers** in event data (Content, Message, etc. are pointers)

## Common Patterns

### Simple Query-Response

```go
client := copilot.NewClient(nil)
if err := client.Start(); err != nil {
    log.Fatal(err)
}
defer client.Stop()

session, err := client.CreateSession(&copilot.SessionConfig{Model: "gpt-5"})
if err != nil {
    log.Fatal(err)
}
defer session.Destroy()

done := make(chan struct{})

session.On(func(evt copilot.SessionEvent) {
    if evt.Type == copilot.AssistantMessage && evt.Data.Content != nil {
        fmt.Println(*evt.Data.Content)
    } else if evt.Type == copilot.SessionIdle {
        close(done)
    }
})

session.Send(copilot.MessageOptions{Prompt: "What is 2+2?"})
<-done
```

### Multi-Turn Conversation

```go
session, _ := client.CreateSession(nil)
defer session.Destroy()

sendAndWait := func(prompt string) error {
    done := make(chan struct{})
    var eventErr error

    unsubscribe := session.On(func(evt copilot.SessionEvent) {
        switch evt.Type {
        case copilot.AssistantMessage:
            if evt.Data.Content != nil {
                fmt.Println(*evt.Data.Content)
            }
        case copilot.SessionIdle:
            close(done)
        case copilot.SessionError:
            if evt.Data.Message != nil {
                eventErr = fmt.Errorf(*evt.Data.Message)
            }
        }
    })
    defer unsubscribe()

    if _, err := session.Send(copilot.MessageOptions{Prompt: prompt}); err != nil {
        return err
    }
    <-done
    return eventErr
}

sendAndWait("What is the capital of France?")
sendAndWait("What is its population?")
```

### SendAndWait Helper

```go
// Use built-in SendAndWait for simpler synchronous interaction
response, err := session.SendAndWait(copilot.MessageOptions{
    Prompt: "What is 2+2?",
}, 0) // 0 uses default 60s timeout

if err != nil {
    log.Printf("Error: %v", err)
}
if response != nil && response.Data.Content != nil {
    fmt.Println(*response.Data.Content)
}
```

### Tool with Struct Return Type

```go
type UserInfo struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
    Role  string `json:"role"`
}

session, _ := client.CreateSession(&copilot.SessionConfig{
    Tools: []copilot.Tool{
        {
            Name:        "get_user",
            Description: "Retrieve user information",
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "user_id": map[string]interface{}{
                        "type":        "string",
                        "description": "User ID",
                    },
                },
                "required": []string{"user_id"},
            },
            Handler: func(inv copilot.ToolInvocation) (copilot.ToolResult, error) {
                args := inv.Arguments.(map[string]interface{})
                userID := args["user_id"].(string)

                user := UserInfo{
                    ID:    userID,
                    Name:  "John Doe",
                    Email: "john@example.com",
                    Role:  "Developer",
                }

                jsonBytes, _ := json.Marshal(user)
                return copilot.ToolResult{
                    TextResultForLLM: string(jsonBytes),
                    ResultType:       "success",
                    ToolTelemetry:    map[string]interface{}{},
                }, nil
            },
        },
    },
})
```
