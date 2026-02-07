# Runnable Recipe Examples

This folder contains standalone, executable C# examples for each cookbook recipe. These are [file-based apps](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps) that can be run directly with `dotnet run`.

## Prerequisites

- .NET 10.0 or later
- GitHub Copilot SDK package (referenced automatically)

## Running Examples

Each `.cs` file is a complete, runnable program. Simply use:

```bash
dotnet run <filename>.cs
```

### Available Recipes

| Recipe               | Command                              | Description                                |
| -------------------- | ------------------------------------ | ------------------------------------------ |
| Error Handling       | `dotnet run error-handling.cs`       | Demonstrates error handling patterns       |
| Multiple Sessions    | `dotnet run multiple-sessions.cs`    | Manages multiple independent conversations |
| Managing Local Files | `dotnet run managing-local-files.cs` | Organizes files using AI grouping          |
| PR Visualization     | `dotnet run pr-visualization.cs`     | Generates PR age charts                    |
| Persisting Sessions  | `dotnet run persisting-sessions.cs`  | Save and resume sessions across restarts   |

### Examples with Arguments

**PR Visualization with specific repo:**

```bash
dotnet run pr-visualization.cs -- --repo github/copilot-sdk
```

**Managing Local Files (edit the file to change target folder):**

```bash
# Edit the targetFolder variable in managing-local-files.cs first
dotnet run managing-local-files.cs
```

## File-Based Apps

These examples use .NET's file-based app feature, which allows single-file C# programs to:

- Run without a project file
- Automatically reference common packages
- Support top-level statements

## Learning Resources

- [.NET File-Based Apps Documentation](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps)
- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk/blob/main/dotnet/README.md)
- [Parent Cookbook](../README.md)
