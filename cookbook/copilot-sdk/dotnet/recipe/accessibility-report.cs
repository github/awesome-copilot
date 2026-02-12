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
    | Viewport | ✅ Pass | Allows pinch-zoom (no user-scalable=no) |
    | Links | ✅ Pass | No ambiguous "click here" links |
    | Reduced Motion | ✅ Pass | Supports prefers-reduced-motion |
    | Autoplay Media | ✅ Pass | No autoplay audio/video |
    | Font Selector | ✅ Excellent | Includes OpenDyslexic option for dyslexia |
    | Dark/Light Mode | ✅ Excellent | User-controlled theme toggle |

    ⚠️ Issues Found
    | Severity | Issue | WCAG Criterion | Recommendation |
    |----------|-------|----------------|----------------|
    | 🔴 High | No <main> landmark | 1.3.1, 2.4.1 | Wrap main content in <main> element |
    | 🔴 High | No skip navigation link | 2.4.1 | Add "Skip to content" link at top |
    | 🟡 Medium | Focus outlines disabled | 2.4.7 | Default outline is none - ensure visible :focus styles exist |
    | 🟡 Medium | Small touch targets | 2.5.8 | Navigation links are 37px tall (below 44px minimum) |

    📋 Stats Summary
    - Total Links: X
    - Total Headings: X (1× H1, proper hierarchy)
    - Focusable Elements: X
    - Landmarks Found: banner ✅, navigation ✅, main ❌, footer ✅

    ⚙️ Priority Recommendations
    - Add <main> landmark - Wrap page content in <main role="main"> for screen reader navigation
    - Add skip link - Hidden link at start: <a href="#main-content" class="skip-link">Skip to content</a>
    - Increase touch targets - Add padding to nav links and tags to meet 44×44px minimum
    - Verify focus styles - Test keyboard navigation; add visible :focus or :focus-visible outlines

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
        Look for project files like package.json, *.csproj, pom.xml, requirements.txt, go.mod, etc.

        Respond with ONLY the detected language name (e.g., "TypeScript", "JavaScript", "C#", "Python", "Java")
        and a brief explanation of why you detected it.
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
        3. Include tests for:
           - Page has proper lang attribute
           - Page has descriptive title
           - Heading hierarchy is correct (single H1, proper nesting)
           - All images have alt text
           - No autoplay media
           - Landmark regions exist (banner, nav, main, footer)
           - Skip navigation link exists and works
           - Focus indicators are visible
           - Touch targets meet minimum size requirements
        4. Use Playwright's accessibility testing features
        5. Include helpful comments explaining each test

        Output the complete test file that can be saved and run.
        Use the Playwright MCP server tools if you need to verify any page details.
        """;

  Console.WriteLine("\nGenerating accessibility tests...\n");
  await session.SendAsync(new MessageOptions { Prompt = testGenerationPrompt });
  await done.Task;

  Console.WriteLine("\n\n=== Tests Generated ===");
}
