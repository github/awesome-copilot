# Generating PR Age Charts

Build an interactive CLI tool that visualizes pull request age distribution for a GitHub repository using Copilot's built-in capabilities.

> **Runnable example:** [recipe/pr-visualization.cs](recipe/pr-visualization.cs)
>
> ```bash
> # Auto-detect from current git repo
> dotnet run recipe/pr-visualization.cs
>
> # Specify a repo explicitly
> dotnet run recipe/pr-visualization.cs -- --repo github/copilot-sdk
> ```

## Example scenario

You want to understand how long PRs have been open in a repository. This tool detects the current Git repo or accepts a repo as input, then lets Copilot fetch PR data via the GitHub MCP Server and generate a chart image.

## Prerequisites

```bash
dotnet add package GitHub.Copilot.SDK
```

## Usage

```bash
# Auto-detect from current git repo
dotnet run

# Specify a repo explicitly
dotnet run -- --repo github/copilot-sdk
```

## Full example: pr-visualization.cs

```csharp
using System.Diagnostics;
using GitHub.Copilot.SDK;

// ============================================================================
// Git & GitHub Detection
// ============================================================================

bool IsGitRepo()
{
    try
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "git",
            Arguments = "rev-parse --git-dir",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        })?.WaitForExit();
        return true;
    }
    catch
    {
        return false;
    }
}

string? GetGitHubRemote()
{
    try
    {
        var proc = Process.Start(new ProcessStartInfo
        {
            FileName = "git",
            Arguments = "remote get-url origin",
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        });

        var remoteUrl = proc?.StandardOutput.ReadToEnd().Trim();
        proc?.WaitForExit();

        if (string.IsNullOrEmpty(remoteUrl)) return null;

        // Handle SSH: git@github.com:owner/repo.git
        var sshMatch = System.Text.RegularExpressions.Regex.Match(
            remoteUrl, @"git@github\.com:(.+/.+?)(?:\.git)?$");
        if (sshMatch.Success) return sshMatch.Groups[1].Value;

        // Handle HTTPS: https://github.com/owner/repo.git
        var httpsMatch = System.Text.RegularExpressions.Regex.Match(
            remoteUrl, @"https://github\.com/(.+/.+?)(?:\.git)?$");
        if (httpsMatch.Success) return httpsMatch.Groups[1].Value;

        return null;
    }
    catch
    {
        return null;
    }
}

string? ParseRepoArg(string[] args)
{
    var repoIndex = Array.IndexOf(args, "--repo");
    if (repoIndex != -1 && repoIndex + 1 < args.Length)
    {
        return args[repoIndex + 1];
    }
    return null;
}

string PromptForRepo()
{
    Console.Write("Enter GitHub repo (owner/repo): ");
    return Console.ReadLine()?.Trim() ?? "";
}

// ============================================================================
// Main Application
// ============================================================================

Console.WriteLine("🔍 PR Age Chart Generator\n");

// Determine the repository
var repo = ParseRepoArg(args);

if (!string.IsNullOrEmpty(repo))
{
    Console.WriteLine($"📦 Using specified repo: {repo}");
}
else if (IsGitRepo())
{
    var detected = GetGitHubRemote();
    if (detected != null)
    {
        repo = detected;
        Console.WriteLine($"📦 Detected GitHub repo: {repo}");
    }
    else
    {
        Console.WriteLine("⚠️  Git repo found but no GitHub remote detected.");
        repo = PromptForRepo();
    }
}
else
{
    Console.WriteLine("📁 Not in a git repository.");
    repo = PromptForRepo();
}

if (string.IsNullOrEmpty(repo) || !repo.Contains('/'))
{
    Console.WriteLine("❌ Invalid repo format. Expected: owner/repo");
    return;
}

var parts = repo.Split('/');
var owner = parts[0];
var repoName = parts[1];

// Create Copilot client - no custom tools needed!
await using var client = new CopilotClient(new CopilotClientOptions { LogLevel = "error" });
await client.StartAsync();

var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    SystemMessage = new SystemMessageConfig
    {
        Content = $"""
<context>
You are analyzing pull requests for the GitHub repository: {owner}/{repoName}
The current working directory is: {Environment.CurrentDirectory}
</context>

<instructions>
- Use the GitHub MCP Server tools to fetch PR data
- Use your file and code execution tools to generate charts
- Save any generated images to the current working directory
- Be concise in your responses
</instructions>
"""
    }
});

// Set up event handling
session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageEvent msg:
            Console.WriteLine($"\n🤖 {msg.Data.Content}\n");
            break;
        case ToolExecutionStartEvent toolStart:
            Console.WriteLine($"  ⚙️  {toolStart.Data.ToolName}");
            break;
    }
});

// Initial prompt - let Copilot figure out the details
Console.WriteLine("\n📊 Starting analysis...\n");

await session.SendAsync(new MessageOptions
{
    Prompt = $"""
      Fetch the open pull requests for {owner}/{repoName} from the last week.
      Calculate the age of each PR in days.
      Then generate a bar chart image showing the distribution of PR ages
      (group them into sensible buckets like <1 day, 1-3 days, etc.).
      Save the chart as "pr-age-chart.png" in the current directory.
      Finally, summarize the PR health - average age, oldest PR, and how many might be considered stale.
    """
});

// Interactive loop
Console.WriteLine("\n💡 Ask follow-up questions or type \"exit\" to quit.\n");
Console.WriteLine("Examples:");
Console.WriteLine("  - \"Expand to the last month\"");
Console.WriteLine("  - \"Show me the 5 oldest PRs\"");
Console.WriteLine("  - \"Generate a pie chart instead\"");
Console.WriteLine("  - \"Group by author instead of age\"");
Console.WriteLine();

while (true)
{
    Console.Write("You: ");
    var input = Console.ReadLine()?.Trim();

    if (string.IsNullOrEmpty(input)) continue;
    if (input.ToLower() is "exit" or "quit")
    {
        Console.WriteLine("👋 Goodbye!");
        break;
    }

    await session.SendAsync(new MessageOptions { Prompt = input });
}
```

## How it works

1. **Repository detection**: Checks `--repo` flag → git remote → prompts user
2. **No custom tools**: Relies entirely on Copilot CLI's built-in capabilities:
   - **GitHub MCP Server** - Fetches PR data from GitHub
   - **File tools** - Saves generated chart images
   - **Code execution** - Generates charts using Python/matplotlib or other methods
3. **Interactive session**: After initial analysis, user can ask for adjustments

## Why this approach?

| Aspect          | Custom Tools      | Built-in Copilot                  |
| --------------- | ----------------- | --------------------------------- |
| Code complexity | High              | **Minimal**                       |
| Maintenance     | You maintain      | **Copilot maintains**             |
| Flexibility     | Fixed logic       | **AI decides best approach**      |
| Chart types     | What you coded    | **Any type Copilot can generate** |
| Data grouping   | Hardcoded buckets | **Intelligent grouping**          |
