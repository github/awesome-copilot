# Generating Accessibility Reports

Build a CLI tool that analyzes web page accessibility using the Playwright MCP server and generates detailed WCAG-compliant reports with optional test generation.

> **Runnable example:** [recipe/accessibility-report.cs](recipe/accessibility-report.cs)
>
> ```bash
> dotnet run recipe/accessibility-report.cs
> ```

## Example scenario

You want to audit a website's accessibility compliance. This tool navigates to a URL using Playwright, captures an accessibility snapshot, and produces a structured report covering WCAG criteria like landmarks, heading hierarchy, focus management, and touch targets. It can also generate Playwright test files to automate future accessibility checks.

## Prerequisites

```bash
dotnet add package GitHub.Copilot.SDK
```

You also need `npx` available (Node.js installed) for the Playwright MCP server.

## Usage

```bash
dotnet run recipe/accessibility-report.cs
# Enter a URL when prompted
```

## Full example: accessibility-report.cs

```csharp
#:package GitHub.Copilot.SDK@*

using GitHub.Copilot.SDK;

// Create and start client
await using var client = new CopilotClient();
await client.StartAsync();

Console.WriteLine("=== Accessibility Report Generator ===");
Console.WriteLine();

Console.Write("Enter URL to analyze: ");
var url = Console.ReadLine()?.Trim();

if (string.IsNullOrWhiteSpace(url))
{
    Console.WriteLine("No URL provided. Exiting.");
    return;
}

// Ensure URL has a scheme
if (!url.StartsWith("http://") && !url.StartsWith("https://"))
{
    url = "https://" + url;
}

Console.WriteLine($"\nAnalyzing: {url}");
Console.WriteLine("Please wait...\n");

// Create a session with Playwright MCP server
await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "claude-opus-4.6",
    Streaming = true,
    McpServers = new Dictionary<string, object>()
    {
        ["playwright"] =
        new McpLocalServerConfig
        {
            Type = "local",
            Command = "npx",
            Args = ["@playwright/mcp@latest"],
            Tools = ["*"]
        }
    },
});

// Wait for response using session.idle event
var done = new TaskCompletionSource();

session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageDeltaEvent delta:
            Console.Write(delta.Data.DeltaContent);
            break;
        case SessionIdleEvent:
            done.TrySetResult();
            break;
        case SessionErrorEvent error:
            Console.WriteLine($"\nError: {error.Data.Message}");
            done.TrySetResult();
            break;
    }
});

var prompt = $"""
    Use the Playwright MCP server to analyze the accessibility of this webpage: {url}
    
    Please:
    1. Navigate to the URL using playwright-browser_navigate
    2. Take an accessibility snapshot using playwright-browser_snapshot
    3. Analyze the snapshot and provide a detailed accessibility report
    
    Format the report EXACTLY like this structure with emoji indicators:

    📊 Accessibility Report: [Page Title] (domain.com)

    ✅ What's Working Well
    | Category | Status | Details |
    |----------|--------|---------|
    | Language | ✅ Pass | lang="en-US" properly set |
    | Page Title | ✅ Pass | "[Title]" is descriptive |
    | Heading Hierarchy | ✅ Pass | Single H1, proper H2/H3 structure |
    | Images | ✅ Pass | All X images have alt text |

    ⚠️ Issues Found
    | Severity | Issue | WCAG Criterion | Recommendation |
    |----------|-------|----------------|----------------|
    | 🔴 High | No <main> landmark | 1.3.1, 2.4.1 | Wrap main content in <main> element |
    | 🟡 Medium | Focus outlines disabled | 2.4.7 | Ensure visible :focus styles exist |

    📋 Stats Summary
    - Total Links: X
    - Total Headings: X
    - Focusable Elements: X
    - Landmarks Found: banner ✅, navigation ✅, main ❌, footer ✅

    ⚙️ Priority Recommendations
    ...

    Use ✅ for pass, 🔴 for high severity issues, 🟡 for medium severity, ❌ for missing items.
    Include actual findings from the page analysis - don't just copy the example.
    """;

await session.SendAsync(new MessageOptions { Prompt = prompt });
await done.Task;

Console.WriteLine("\n\n=== Report Complete ===\n");

// Prompt user for test generation
Console.Write("Would you like to generate Playwright accessibility tests? (y/n): ");
var generateTests = Console.ReadLine()?.Trim().ToLowerInvariant();

if (generateTests == "y" || generateTests == "yes")
{
    // Reset for next interaction
    done = new TaskCompletionSource();

    var detectLanguagePrompt = $"""
        Analyze the current working directory to detect the primary programming language used in this project.
        Respond with ONLY the detected language name and a brief explanation.
        If no project is detected, suggest "TypeScript" as the default for Playwright tests.
        """;

    Console.WriteLine("\nDetecting project language...\n");
    await session.SendAsync(new MessageOptions { Prompt = detectLanguagePrompt });
    await done.Task;

    Console.Write("\n\nConfirm language for tests (or enter a different one): ");
    var language = Console.ReadLine()?.Trim();

    if (string.IsNullOrWhiteSpace(language))
    {
        language = "TypeScript";
    }

    // Reset for test generation
    done = new TaskCompletionSource();

    var testGenerationPrompt = $"""
        Based on the accessibility report you just generated for {url}, create Playwright accessibility tests in {language}.
        
        The tests should:
        1. Verify all the accessibility checks from the report
        2. Test for the issues that were found (to ensure they get fixed)
        3. Include tests for landmarks, heading hierarchy, alt text, focus indicators, and more
        4. Use Playwright's accessibility testing features
        5. Include helpful comments explaining each test
        
        Output the complete test file that can be saved and run.
        """;

    Console.WriteLine("\nGenerating accessibility tests...\n");
    await session.SendAsync(new MessageOptions { Prompt = testGenerationPrompt });
    await done.Task;

    Console.WriteLine("\n\n=== Tests Generated ===");
}
```

## How it works

1. **Playwright MCP server**: Configures a local MCP server running `@playwright/mcp` to provide browser automation tools
2. **Streaming output**: Uses `Streaming = true` and `AssistantMessageDeltaEvent` for real-time token-by-token output
3. **Accessibility snapshot**: Playwright's `browser_snapshot` tool captures the full accessibility tree of the page
4. **Structured report**: The prompt engineers a consistent WCAG-aligned report format with emoji severity indicators
5. **Test generation**: Optionally detects the project language and generates Playwright accessibility tests

## Key concepts

### MCP server configuration

The recipe configures a local MCP server that runs alongside the session:

```csharp
McpServers = new Dictionary<string, object>()
{
    ["playwright"] = new McpLocalServerConfig
    {
        Type = "local",
        Command = "npx",
        Args = ["@playwright/mcp@latest"],
        Tools = ["*"]
    }
}
```

This gives the model access to Playwright browser tools like `browser_navigate`, `browser_snapshot`, and `browser_click`.

### Streaming with events

Unlike `SendAndWaitAsync`, this recipe uses streaming for real-time output:

```csharp
session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageDeltaEvent delta:
            Console.Write(delta.Data.DeltaContent); // Token-by-token
            break;
        case SessionIdleEvent:
            done.TrySetResult(); // Model finished
            break;
    }
});
```

## Sample interaction

```
=== Accessibility Report Generator ===

Enter URL to analyze: github.com

Analyzing: https://github.com
Please wait...

📊 Accessibility Report: GitHub (github.com)

✅ What's Working Well
| Category | Status | Details |
|----------|--------|---------|
| Language | ✅ Pass | lang="en" properly set |
| Page Title | ✅ Pass | "GitHub" is recognizable |
| Heading Hierarchy | ✅ Pass | Proper H1/H2 structure |
| Images | ✅ Pass | All images have alt text |

⚠️ Issues Found
| Severity | Issue | WCAG Criterion | Recommendation |
|----------|-------|----------------|----------------|
| 🟡 Medium | Some links lack descriptive text | 2.4.4 | Add aria-label to icon-only links |

📋 Stats Summary
- Total Links: 47
- Total Headings: 8 (1× H1, proper hierarchy)
- Focusable Elements: 52
- Landmarks Found: banner ✅, navigation ✅, main ✅, footer ✅

=== Report Complete ===

Would you like to generate Playwright accessibility tests? (y/n): y

Detecting project language...
TypeScript detected (package.json found)

Confirm language for tests (or enter a different one): 

Generating accessibility tests...
[Generated test file output...]

=== Tests Generated ===
```
