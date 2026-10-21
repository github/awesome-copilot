---
name: go-mcp-server-generator
description: 'Generate a complete Go MCP server project with proper structure, dependencies, and implementation using the official github.com/modelcontextprotocol/go-sdk.'
---

# Go MCP Server Project Generator

Generate a complete, production-ready Model Context Protocol (MCP) server project in Go.

## Project Requirements

You will create a Go MCP server with:

1. **Project Structure**: Proper Go module layout
2. **Dependencies**: Official MCP SDK and necessary packages
3. **Server Setup**: Configured MCP server with transports
4. **Tools**: At least 2-3 useful tools with typed inputs/outputs
5. **Error Handling**: Proper error handling and context usage
6. **Documentation**: README with setup and usage instructions
7. **Testing**: Basic test structure

## Template Structure

```
myserver/
├── go.mod
├── go.sum
├── main.go
├── tools/
│   ├── tool1.go
│   └── tool2.go
├── resources/
│   └── resource1.go
├── config/
│   └── config.go
├── README.md
└── main_test.go
```

## go.mod Template

```go
module github.com/yourusername/{{PROJECT_NAME}}

go 1.23

require (
    github.com/modelcontextprotocol/go-sdk v1.0.0
)
```

## main.go Template

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/modelcontextprotocol/go-sdk/mcp"
    "github.com/yourusername/{{PROJECT_NAME}}/config"
    "github.com/yourusername/{{PROJECT_NAME}}/tools"
)

func main() {
    cfg := config.Load()
    
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Handle graceful shutdown
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
    go func() {
        <-sigCh
        log.Println("Shutting down...")
        cancel()
    }()

    // Create server
    server := mcp.NewServer(
        &mcp.Implementation{
            Name:    cfg.ServerName,
            Version: cfg.Version,
        },
        &mcp.Options{
            Capabilities: &mcp.ServerCapabilities{
                Tools:     &mcp.ToolsCapability{},
                Resources: &mcp.ResourcesCapability{},
                Prompts:   &mcp.PromptsCapability{},
            },
        },
    )

    // Register tools
    tools.RegisterTools(server)

    // Run server
    transport := &mcp.StdioTransport{}
    if err := server.Run(ctx, transport); err != nil {
        log.Fatalf("Server error: %v", err)
    }
}
```

## tools/tool1.go Template

```go
package tools

import (
    "context"
    "fmt"

    "github.com/modelcontextprotocol/go-sdk/mcp"
)

type Tool1Input struct {
    Param1 string `json:"param1" jsonschema:"required,description=First parameter"`
    Param2 int    `json:"param2,omitempty" jsonschema:"description=Optional second parameter"`
}

type Tool1Output struct {
    Result string `json:"result" jsonschema:"description=The result of the operation"`
    Status string `json:"status" jsonschema:"description=Operation status"`
}

func Tool1Handler(ctx context.Context, req *mcp.CallToolRequest, input Tool1Input) (
    *mcp.CallToolResult,
    Tool1Output,
    error,
) {
    // Validate input
    if input.Param1 == "" {
        return nil, Tool1Output{}, fmt.Errorf("param1 is required")
    }

    // Check context
    if ctx.Err() != nil {
        return nil, Tool1Output{}, ctx.Err()
    }

    // Perform operation
    result := fmt.Sprintf("Processed: %s", input.Param1)

    return nil, Tool1Output{
        Result: result,
        Status: "success",
    }, nil
}

func RegisterTool1(server *mcp.Server) {
    mcp.AddTool(server,
        &mcp.Tool{
            Name:        "tool1",
            Description: "Description of what tool1 does",
        },
        Tool1Handler,
    )
}
```

## tools/registry.go Template

```go
package tools

import "github.com/modelcontextprotocol/go-sdk/mcp"

func RegisterTools(server *mcp.Server) {
    RegisterTool1(server)
    RegisterTool2(server)
    // Register additional tools here
}
```

## config/config.go Template

```go
package config

import "os"

type Config struct {
    ServerName string
    Version    string
    LogLevel   string
}

func Load() *Config {
    return &Config{
        ServerName: getEnv("SERVER_NAME", "{{PROJECT_NAME}}"),
        Version:    getEnv("VERSION", "v1.0.0"),
        LogLevel:   getEnv("LOG_LEVEL", "info"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

## main_test.go Template

```go
package main

import (
    "context"
    "testing"

    "github.com/yourusername/{{PROJECT_NAME}}/tools"
)

func TestTool1Handler(t *testing.T) {
    ctx := context.Background()
    input := tools.Tool1Input{
        Param1: "test",
        Param2: 42,
    }

    result, output, err := tools.Tool1Handler(ctx, nil, input)
    if err != nil {
        t.Fatalf("Tool1Handler failed: %v", err)
    }

    if output.Status != "success" {
        t.Errorf("Expected status 'success', got '%s'", output.Status)
    }

    if result != nil {
        t.Error("Expected result to be nil")
    }
}
```

## README.md Template

```markdown
# {{PROJECT_NAME}}

A Model Context Protocol (MCP) server built with Go.

## Description

{{PROJECT_DESCRIPTION}}

## Installation

\`\`\`bash
go mod download
go build -o {{PROJECT_NAME}}
\`\`\`

## Usage

Run the server with stdio transport:

\`\`\`bash
./{{PROJECT_NAME}}
\`\`\`

## Configuration

Configure via environment variables:

- `SERVER_NAME`: Server name (default: "{{PROJECT_NAME}}")
- `VERSION`: Server version (default: "v1.0.0")
- `LOG_LEVEL`: Logging level (default: "info")

## Available Tools

### tool1
{{TOOL1_DESCRIPTION}}

**Input:**
- `param1` (string, required): First parameter
- `param2` (int, optional): Second parameter

**Output:**
- `result` (string): Operation result
- `status` (string): Status of the operation

## Development

Run tests:

\`\`\`bash
go test ./...
\`\`\`

Build:

\`\`\`bash
go build -o {{PROJECT_NAME}}
\`\`\`

## License

MIT
```

## Generation Instructions

When generating a Go MCP server:

1. **Initialize Module**: Create `go.mod` with proper module path
2. **Structure**: Follow the template directory structure
3. **Type Safety**: Use structs with JSON schema tags for all inputs/outputs
4. **Error Handling**: Validate inputs, check context, wrap errors
5. **Documentation**: Add clear descriptions and examples
6. **Testing**: Include at least one test per tool
7. **Configuration**: Use environment variables for config
8. **Logging**: Use structured logging (log/slog)
9. **Graceful Shutdown**: Handle signals properly
10. **Transport**: Default to stdio, document alternatives

## Best Practices

- Keep tools focused and single-purpose
- Use descriptive names for types and functions
- Include JSON schema documentation in struct tags
- Always respect context cancellation
- Return descriptive errors
- Keep main.go minimal, logic in packages
- Write tests for tool handlers
- Document all exported functions
