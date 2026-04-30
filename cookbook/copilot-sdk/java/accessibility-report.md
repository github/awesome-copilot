# Generating Accessibility Reports

Build a CLI tool that analyzes web page accessibility using the Playwright MCP server and generates detailed WCAG-compliant reports with optional test generation.

> **Runnable example:** [recipe/AccessibilityReport.java](recipe/AccessibilityReport.java)
>
> ```bash
> jbang recipe/AccessibilityReport.java
> ```

## Example scenario

You want to audit a website's accessibility compliance. This tool navigates to a URL using Playwright, captures an accessibility snapshot, and produces a structured report covering WCAG criteria like landmarks, heading hierarchy, focus management, and touch targets. It can also generate Playwright test files to automate future accessibility checks.

## Prerequisites

Install [JBang](https://www.jbang.dev/) and ensure `npx` is available (Node.js installed) for the Playwright MCP server:

```bash
# macOS (using Homebrew)
brew install jbangdev/tap/jbang

# Verify npx is available (needed for Playwright MCP)
npx --version
```

## Usage

```bash
jbang recipe/AccessibilityReport.java
# Enter a URL when prompted
```

## Full example: AccessibilityReport.java

```java
///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class AccessibilityReport {
    public static void main(String[] args) throws Exception {
        System.out.println("=== Accessibility Report Generator ===\n");

        var reader = new BufferedReader(new InputStreamReader(System.in));

        System.out.print("Enter URL to analyze: ");
        String url = reader.readLine().trim();
        if (url.isEmpty()) {
            System.out.println("No URL provided. Exiting.");
            return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        System.out.printf("%nAnalyzing: %s%n", url);
        System.out.println("Please wait...\n");

        try (var client = new CopilotClient()) {
            client.start().get();

            // Configure Playwright MCP server for browser automation
            Map<String, Object> mcpConfig = Map.of(
                "type", "local",
                "command", "npx",
                "args", List.of("@playwright/mcp@latest"),
                "tools", List.of("*")
            );

            var session = client.createSession(
                new SessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setModel("claude-opus-4.6")
                    .setStreaming(true)
                    .setMcpServers(Map.of("playwright", mcpConfig))
            ).get();

            // Stream output token-by-token
            var idleLatch = new CountDownLatch(1);

            session.on(AssistantMessageDeltaEvent.class,
                ev -> System.out.print(ev.getData().deltaContent()));

            session.on(SessionIdleEvent.class,
                ev -> idleLatch.countDown());

            session.on(SessionErrorEvent.class, ev -> {
                System.err.printf("%nError: %s%n", ev.getData().message());
                idleLatch.countDown();
            });

            String prompt = """
                Use the Playwright MCP server to analyze the accessibility of this webpage: %s

                Please:
                1. Navigate to the URL using playwright-browser_navigate
                2. Take an accessibility snapshot using playwright-browser_snapshot
                3. Analyze the snapshot and provide a detailed accessibility report

                Format the report with emoji indicators:
                - 📊 Accessibility Report header
                - ✅ What's Working Well (table with Category, Status, Details)
                - ⚠️ Issues Found (table with Severity, Issue, WCAG Criterion, Recommendation)
                - 📋 Stats Summary (links, headings, focusable elements, landmarks)
                - ⚙️ Priority Recommendations

                Use ✅ for pass, 🔴 for high severity issues, 🟡 for medium severity, ❌ for missing items.
                Include actual findings from the page analysis.
                """.formatted(url);

            session.send(new MessageOptions().setPrompt(prompt));
            idleLatch.await();

            System.out.println("\n\n=== Report Complete ===\n");

            // Prompt user for test generation
            System.out.print("Would you like to generate Playwright accessibility tests? (y/n): ");
            String generateTests = reader.readLine().trim();

            if (generateTests.equalsIgnoreCase("y") || generateTests.equalsIgnoreCase("yes")) {
                var testLatch = new CountDownLatch(1);

                session.on(SessionIdleEvent.class,
                    ev -> testLatch.countDown());

                String testPrompt = """
                    Based on the accessibility report you just generated for %s,
                    create Playwright accessibility tests in Java.

                    Include tests for: lang attribute, title, heading hierarchy, alt text,
                    landmarks, skip navigation, focus indicators, and touch targets.
                    Use Playwright's accessibility testing features with helpful comments.
                    Output the complete test file.
                    """.formatted(url);

                System.out.println("\nGenerating accessibility tests...\n");
                session.send(new MessageOptions().setPrompt(testPrompt));
                testLatch.await();

                System.out.println("\n\n=== Tests Generated ===");
            }

            session.close();
        }
    }
}
```

## How it works

1. **Playwright MCP server**: Configures a local MCP server running `@playwright/mcp` to provide browser automation tools
2. **Streaming output**: Uses `streaming: true` and `AssistantMessageDeltaEvent` for real-time token-by-token output
3. **Accessibility snapshot**: Playwright's `browser_snapshot` tool captures the full accessibility tree of the page
4. **Structured report**: The prompt engineers a consistent WCAG-aligned report format with emoji severity indicators
5. **Test generation**: Optionally generates Playwright accessibility tests based on the analysis

## Key concepts

### MCP server configuration

The recipe configures a local MCP server that runs alongside the session:

```java
Map<String, Object> mcpConfig = Map.of(
    "type", "local",
    "command", "npx",
    "args", List.of("@playwright/mcp@latest"),
    "tools", List.of("*")
);

var session = client.createSession(
    new SessionConfig()
        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
        .setMcpServers(Map.of("playwright", mcpConfig))
).get();
```

This gives the model access to Playwright browser tools like `browser_navigate`, `browser_snapshot`, and `browser_click`.

### Streaming with events

Unlike `sendAndWait`, this recipe uses streaming for real-time output:

```java
session.on(AssistantMessageDeltaEvent.class,
    ev -> System.out.print(ev.getData().deltaContent()));

session.on(SessionIdleEvent.class,
    ev -> idleLatch.countDown());
```

A `CountDownLatch` synchronizes the main thread with the async event stream — when the session becomes idle, the latch releases and the program continues.

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

Generating accessibility tests...
[Generated test file output...]

=== Tests Generated ===
```
