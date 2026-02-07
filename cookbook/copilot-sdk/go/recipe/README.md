# Runnable Recipe Examples

This folder contains standalone, executable Go examples for each cookbook recipe. Each file is a complete program that can be run directly with `go run`.

## Prerequisites

- Go 1.21 or later
- GitHub Copilot SDK for Go

```bash
go get github.com/github/copilot-sdk/go
```

## Running Examples

Each `.go` file is a complete, runnable program. Simply use:

```bash
go run <filename>.go
```

### Available Recipes

| Recipe               | Command                          | Description                                |
| -------------------- | -------------------------------- | ------------------------------------------ |
| Error Handling       | `go run error-handling.go`       | Demonstrates error handling patterns       |
| Multiple Sessions    | `go run multiple-sessions.go`    | Manages multiple independent conversations |
| Managing Local Files | `go run managing-local-files.go` | Organizes files using AI grouping          |
| PR Visualization     | `go run pr-visualization.go`     | Generates PR age charts                    |
| Persisting Sessions  | `go run persisting-sessions.go`  | Save and resume sessions across restarts   |

### Examples with Arguments

**PR Visualization with specific repo:**

```bash
go run pr-visualization.go -repo github/copilot-sdk
```

**Managing Local Files (edit the file to change target folder):**

```bash
# Edit the targetFolder variable in managing-local-files.go first
go run managing-local-files.go
```

## Go Best Practices

These examples follow Go conventions:

- Proper error handling with explicit checks
- Use of `defer` for cleanup
- Idiomatic naming (camelCase for local variables)
- Standard library usage where appropriate
- Clean separation of concerns

## Learning Resources

- [Go Documentation](https://go.dev/doc/)
- [GitHub Copilot SDK for Go](https://github.com/github/copilot-sdk/blob/main/go/README.md)
- [Parent Cookbook](../README.md)
