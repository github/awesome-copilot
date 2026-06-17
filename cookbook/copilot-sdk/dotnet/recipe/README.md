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
| Managing Local Files ⚠️ | `dotnet run managing-local-files.cs` | Organizes files using AI grouping          |
| PR Visualization ℹ️   | `dotnet run pr-visualization.cs`     | Generates PR age charts                    |
| Persisting Sessions  | `dotnet run persisting-sessions.cs`  | Save and resume sessions across restarts   |
| Accessibility Report ℹ️ | `dotnet run accessibility-report.cs` | Analyzes web page accessibility            |
| Ralph Loop ⚠️         | `dotnet run ralph-loop.cs`           | Autonomous development loop                |

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

## Safety & Prerequisites

Some recipes have side effects or external dependencies. Expand each section for safe testing patterns and prerequisites.

<details>
<summary><strong>⚠️ Managing Local Files</strong> — Modifies your filesystem</summary>

Before running on a real directory, test it on a copy first.
Run these snippets from this recipe directory so the recipe path is captured before switching to the temporary folder.

**PowerShell:**
```powershell
$recipeDir = (Get-Location).Path
$tempDir = New-Item -ItemType Directory -Path ([IO.Path]::Combine([IO.Path]::GetTempPath(), "copilot-test-files"))
@("document1.txt", "image1.png", "data.json") | ForEach-Object { 
    New-Item -Path "$tempDir/$_" -ItemType File
}
cd $tempDir
dotnet run "$recipeDir/managing-local-files.cs"
# Inspect results, then clean up
Remove-Item $tempDir -Recurse
```

**Bash:**
```bash
recipeDir=$(pwd)
tempDir=$(mktemp -d)
touch "$tempDir"/{document1.txt,image1.png,data.json}
cd "$tempDir"
dotnet run "$recipeDir/managing-local-files.cs"
# Inspect results, then clean up
rm -rf "$tempDir"
```

Edit the `targetFolder` variable in the `.cs` file to point to your test directory before running.
</details>

<details>
<summary><strong>⚠️ Ralph Loop</strong> — Creates git commits and modifies files</summary>

Always run it in an isolated git repository first to verify behavior.
Run these snippets from this recipe directory so the recipe path is captured before switching to the temporary repository.

**PowerShell:**
```powershell
$recipeDir = (Get-Location).Path
$tempDir = New-Item -ItemType Directory -Path ([IO.Path]::Combine([IO.Path]::GetTempPath(), "copilot-test-repo"))
cd $tempDir
git init
git config user.email "test@example.com"
git config user.name "Test User"

# Create a PROMPT_task.md for the recipe to work with
"# Task`nCreate a simple README" | Out-File PROMPT_task.md
dotnet run "$recipeDir/ralph-loop.cs"

# Review commits and changes
git log --oneline
git diff

# Clean up
cd ..
Remove-Item $tempDir -Recurse
```

**Bash:**
```bash
recipeDir=$(pwd)
tempDir=$(mktemp -d)
cd "$tempDir"
git init
git config user.email "test@example.com"
git config user.name "Test User"

# Create a PROMPT_task.md for the recipe to work with
echo -e "# Task\nCreate a simple README" > PROMPT_task.md
dotnet run "$recipeDir/ralph-loop.cs"

# Review commits and changes
git log --oneline
git diff

# Clean up
cd ..
rm -rf "$tempDir"
```

The recipe requires a git repository with at least one `PROMPT_*.md` file and will run in an infinite loop until manually stopped.
</details>

<details>
<summary><strong>ℹ️ Accessibility Report</strong> — Requires Playwright MCP</summary>

This recipe requires Playwright MCP to be installed and available:

```bash
npm install -g @playwright/mcp
```

Or let Node Package Manager install it on-demand. The recipe will attempt to launch `npx @playwright/mcp` automatically. Run the recipe as normal:

```bash
dotnet run accessibility-report.cs
```

The recipe will prompt you for a URL to analyze and generate an accessibility report.
</details>

<details>
<summary><strong>ℹ️ PR Visualization</strong> — Requires GitHub API access</summary>

This recipe requires:

- Access to a GitHub repository (public or private, with appropriate credentials)
- `gh` CLI tool installed and authenticated: https://cli.github.com/

Run with a repository argument:

```bash
dotnet run pr-visualization.cs -- --repo owner/repo-name
```

Example:

```bash
dotnet run pr-visualization.cs -- --repo github/copilot-sdk
```

**Note:** GitHub API requests are rate-limited. Large repositories or frequent runs may hit rate limits. See [GitHub API rate limiting](https://docs.github.com/rest/overview/rate-limits-for-the-rest-api) for details.
</details>

## File-Based Apps

These examples use .NET's file-based app feature, which allows single-file C# programs to:

- Run without a project file
- Automatically reference common packages
- Support top-level statements

## Learning Resources

- [.NET File-Based Apps Documentation](https://learn.microsoft.com/en-us/dotnet/core/sdk/file-based-apps)
- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk/blob/main/dotnet/README.md)
- [Parent Cookbook](../README.md)
