---
description: 'Best practices and patterns for building Model Context Protocol (MCP) servers in Go using the official github.com/modelcontextprotocol/go-sdk package.'
applyTo: "**/*.go, **/go.mod, **/go.sum"
---

# Go MCP Server Development Guidelines

When building MCP servers in Go, follow these best practices and patterns using the official Go SDK.

## Server Setup

Create an MCP server using `mcp.NewServer`:

```go
import "github.com/modelcontextprotocol/go-sdk/mcp"

server := mcp.NewServer(
    &mcp.Implementation{
        Name:    "my-server",
        Version: "v1.0.0",
    },
    nil, // or provide mcp.Options
)
```

## Adding Tools

Use `mcp.AddTool` with struct-based input and output for type safety:

```go
type ToolInput struct {
    Query string `json:"query" jsonschema:"the search query"`
    Limit int    `json:"limit,omitempty" jsonschema:"maximum results to return"`
}

type ToolOutput struct {
    Results []string `json:"results" jsonschema:"list of search results"`
    Count   int      `json:"count" jsonschema:"number of results found"`
}

func SearchTool(ctx context.Context, req *mcp.CallToolRequest, input ToolInput) (
    *mcp.CallToolResult,
    ToolOutput,
    error,
) {
    // Implement tool logic
    results := performSearch(ctx, input.Query, input.Limit)
    
    return nil, ToolOutput{
        Results: results,
        Count:   len(results),
    }, nil
}

// Register the tool
mcp.AddTool(server, 
    &mcp.Tool{
        Name:        "search",
        Description: "Search for information",
    },
    SearchTool,
)
```

## Adding Resources

Use `mcp.AddResource` for providing accessible data:

```go
func GetResource(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
    content, err := loadResourceContent(ctx, req.URI)
    if err != nil {
        return nil, err
    }
    
    return &mcp.ReadResourceResult{
        Contents: []any{
            &mcp.TextResourceContents{
                ResourceContents: mcp.ResourceContents{
                    URI:      req.URI,
                    MIMEType: "text/plain",
                },
                Text: content,
            },
        },
    }, nil
}

mcp.AddResource(server,
    &mcp.Resource{
        URI:         "file:///data/example.txt",
        Name:        "Example Data",
        Description: "Example resource data",
        MIMEType:    "text/plain",
    },
    GetResource,
)
```

## Adding Prompts

Use `mcp.AddPrompt` for reusable prompt templates:

```go
type PromptInput struct {
    Topic string `json:"topic" jsonschema:"the topic to analyze"`
}

func AnalyzePrompt(ctx context.Context, req *mcp.GetPromptRequest, input PromptInput) (
    *mcp.GetPromptResult,
    error,
) {
    return &mcp.GetPromptResult{
        Description: "Analyze the given topic",
        Messages: []mcp.PromptMessage{
            {
                Role: mcp.RoleUser,
                Content: mcp.TextContent{
                    Text: fmt.Sprintf("Analyze this topic: %s", input.Topic),
                },
            },
        },
    }, nil
}

mcp.AddPrompt(server,
    &mcp.Prompt{
        Name:        "analyze",
        Description: "Analyze a topic",
        Arguments: []mcp.PromptArgument{
            {
                Name:        "topic",
                Description: "The topic to analyze",
                Required:    true,
            },
        },
    },
    AnalyzePrompt,
)
```

## Transport Configuration

### Stdio Transport

For communication over stdin/stdout (most common for desktop integrations):

```go
if err := server.Run(ctx, &mcp.StdioTransport{}); err != nil {
    log.Fatal(err)
}
```

### HTTP Transport

For HTTP-based communication:

```go
import "github.com/modelcontextprotocol/go-sdk/mcp"

transport := &mcp.HTTPTransport{
    Addr: ":8080",
    // Optional: configure TLS, timeouts, etc.
}

if err := server.Run(ctx, transport); err != nil {
    log.Fatal(err)
}
```

## Error Handling

Always return proper errors and use context for cancellation:

```go
func MyTool(ctx context.Context, req *mcp.CallToolRequest, input MyInput) (
    *mcp.CallToolResult,
    MyOutput,
    error,
) {
    // Check context cancellation
    if ctx.Err() != nil {
        return nil, MyOutput{}, ctx.Err()
    }
    
    // Return errors for invalid input
    if input.Query == "" {
        return nil, MyOutput{}, fmt.Errorf("query cannot be empty")
    }
    
    // Perform operation
    result, err := performOperation(ctx, input)
    if err != nil {
        return nil, MyOutput{}, fmt.Errorf("operation failed: %w", err)
    }
    
    return nil, result, nil
}
```

## JSON Schema Tags

Use `jsonschema` tags to document your structs for better client integration:

```go
type Input struct {
    Name     string   `json:"name" jsonschema:"required,description=User's name"`
    Age      int      `json:"age" jsonschema:"minimum=0,maximum=150"`
    Email    string   `json:"email,omitempty" jsonschema:"format=email"`
    Tags     []string `json:"tags,omitempty" jsonschema:"uniqueItems=true"`
    Active   bool     `json:"active" jsonschema:"default=true"`
}
```

## Context Usage

Always respect context cancellation and deadlines:

```go
func LongRunningTool(ctx context.Context, req *mcp.CallToolRequest, input Input) (
    *mcp.CallToolResult,
    Output,
    error,
) {
    select {
    case <-ctx.Done():
        return nil, Output{}, ctx.Err()
    case result := <-performWork(ctx, input):
        return nil, result, nil
    }
}
```

## Server Options

Configure server behavior with options:

```go
options := &mcp.Options{
    Capabilities: &mcp.ServerCapabilities{
        Tools:     &mcp.ToolsCapability{},
        Resources: &mcp.ResourcesCapability{
            Subscribe: true, // Enable resource subscriptions
        },
        Prompts: &mcp.PromptsCapability{},
    },
}

server := mcp.NewServer(
    &mcp.Implementation{Name: "my-server", Version: "v1.0.0"},
    options,
)
```

## Testing

Test your MCP tools using standard Go testing patterns:

```go
func TestSearchTool(t *testing.T) {
    ctx := context.Background()
    input := ToolInput{Query: "test", Limit: 10}
    
    result, output, err := SearchTool(ctx, nil, input)
    if err != nil {
        t.Fatalf("SearchTool failed: %v", err)
    }
    
    if len(output.Results) == 0 {
        t.Error("Expected results, got none")
    }
}
```

## Module Setup

Initialize your Go module properly:

```bash
go mod init github.com/yourusername/yourserver
go get github.com/modelcontextprotocol/go-sdk@latest
```

Your `go.mod` should include:

```go
module github.com/yourusername/yourserver

go 1.23

require github.com/modelcontextprotocol/go-sdk v1.0.0
```

## Common Patterns

### Logging

Use structured logging:

```go
import "log/slog"

logger := slog.Default()
logger.Info("tool called", "name", req.Params.Name, "args", req.Params.Arguments)
```

### Configuration

Use environment variables or config files:

```go
type Config struct {
    ServerName string
    Version    string
    Port       int
}

func LoadConfig() *Config {
    return &Config{
        ServerName: getEnv("SERVER_NAME", "my-server"),
        Version:    getEnv("VERSION", "v1.0.0"),
        Port:       getEnvInt("PORT", 8080),
    }
}
```

### Graceful Shutdown

Handle shutdown signals properly:

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

go func() {
    <-sigCh
    cancel()
}()

if err := server.Run(ctx, transport); err != nil {
    log.Fatal(err)
}
```
