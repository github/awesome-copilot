# Go Guide

Use this reference when the user explicitly asks for Go.

## Prerequisites

- Go 1.21+
- GitHub Copilot CLI installed and authenticated (`copilot --version`)

## Install

```bash
mkdir copilot-demo && cd copilot-demo
go mod init copilot-demo
go get github.com/github/copilot-sdk/go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"
    "os"
    copilot "github.com/github/copilot-sdk/go"
)

func main() {
    client := copilot.NewClient(nil)
    if err := client.Start(); err != nil {
        log.Fatal(err)
    }
    defer client.Stop()

    session, err := client.CreateSession(&copilot.SessionConfig{Model: "gpt-4.1"})
    if err != nil {
        log.Fatal(err)
    }

    response, err := session.SendAndWait(copilot.MessageOptions{Prompt: "What is 2 + 2?"}, 0)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(*response.Data.Content)
    os.Exit(0)
}
```

## Streaming Responses

Enable real-time output for better UX:

```go
session, err := client.CreateSession(&copilot.SessionConfig{
    Model:     "gpt-4.1",
    Streaming: true,
})

session.On(func(event copilot.SessionEvent) {
    if event.Type == "assistant.message_delta" {
        fmt.Print(*event.Data.DeltaContent)
    }
    if event.Type == "session.idle" {
        fmt.Println()
    }
})

_, err = session.SendAndWait(copilot.MessageOptions{Prompt: "Tell me a short joke"}, 0)
```

## Custom Tools

Define tools that Copilot can invoke during reasoning. When you define a tool, you tell Copilot:
1. **What the tool does** (description)
2. **What parameters it needs** (schema)
3. **What code to run** (handler)

```go
type WeatherParams struct {
    City string `json:"city" jsonschema:"The city name"`
}

type WeatherResult struct {
    City        string `json:"city"`
    Temperature string `json:"temperature"`
    Condition   string `json:"condition"`
}

getWeather := copilot.DefineTool(
    "get_weather",
    "Get the current weather for a city",
    func(params WeatherParams, inv copilot.ToolInvocation) (WeatherResult, error) {
        conditions := []string{"sunny", "cloudy", "rainy", "partly cloudy"}
        temp := rand.Intn(30) + 50
        condition := conditions[rand.Intn(len(conditions))]
        return WeatherResult{
            City:        params.City,
            Temperature: fmt.Sprintf("%d°F", temp),
            Condition:   condition,
        }, nil
    },
)

session, _ := client.CreateSession(&copilot.SessionConfig{
    Model:     "gpt-4.1",
    Streaming: true,
    Tools:     []copilot.Tool{getWeather},
})
```

## MCP Server Integration

Connect to MCP (Model Context Protocol) servers for pre-built tools. Connect to GitHub's MCP server for repository, issue, and PR access:

```go
session, _ := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-4.1",
    MCPServers: map[string]copilot.MCPServerConfig{
        "github": {
            Type: "http",
            URL:  "https://api.githubcopilot.com/mcp/",
        },
    },
})
```

## External CLI Server

Run the CLI in server mode separately and connect the SDK to it. Useful for debugging, resource sharing, or custom environments.

### Start CLI in Server Mode

```bash
copilot --server --port 4321
```

### Connect SDK to External Server

```go
client := copilot.NewClient(&copilot.ClientOptions{
    CLIUrl: "localhost:4321",
})

if err := client.Start(); err != nil {
    log.Fatal(err)
}

session, _ := client.CreateSession(&copilot.SessionConfig{Model: "gpt-4.1"})
```

## Samples

- Go: https://github.com/github/copilot-sdk/tree/main/go/samples
