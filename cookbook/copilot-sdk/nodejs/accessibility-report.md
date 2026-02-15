# Generating Accessibility Reports

Build a CLI tool that analyzes web page accessibility using the Playwright MCP server and generates detailed WCAG-compliant reports with optional test generation.

> **Runnable example:** [recipe/accessibility-report.ts](recipe/accessibility-report.ts)
>
> ```bash
> cd recipe && npm install
> npx tsx accessibility-report.ts
> # or: npm run accessibility-report
> ```

## Example scenario

You want to audit a website's accessibility compliance. This tool navigates to a URL using Playwright, captures an accessibility snapshot, and produces a structured report covering WCAG criteria like landmarks, heading hierarchy, focus management, and touch targets. It can also generate Playwright test files to automate future accessibility checks.

## Prerequisites

```bash
npm install @github/copilot-sdk
npm install -D typescript tsx @types/node
```

You also need `npx` available (Node.js installed) for the Playwright MCP server.

## Usage

```bash
npx tsx accessibility-report.ts
# Enter a URL when prompted
```

## Full example: accessibility-report.ts

```typescript
#!/usr/bin/env npx tsx

import { CopilotClient } from "@github/copilot-sdk";
import * as readline from "node:readline";

// ============================================================================
// Main Application
// ============================================================================

async function main() {
    console.log("=== Accessibility Report Generator ===\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query: string): Promise<string> =>
        new Promise((resolve) => rl.question(query, (answer) => resolve(answer.trim())));

    let url = await askQuestion("Enter URL to analyze: ");

    if (!url) {
        console.log("No URL provided. Exiting.");
        rl.close();
        return;
    }

    // Ensure URL has a scheme
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    console.log(`\nAnalyzing: ${url}`);
    console.log("Please wait...\n");

    // Create Copilot client with Playwright MCP server
    const client = new CopilotClient();

    const session = await client.createSession({
        model: "claude-opus-4.6",
        streaming: true,
        mcpServers: {
            playwright: {
                type: "local",
                command: "npx",
                args: ["@playwright/mcp@latest"],
                tools: ["*"],
            },
        },
    });

    // Set up streaming event handling
    let idleResolve: (() => void) | null = null;

    session.on((event) => {
        if (event.type === "assistant.message.delta") {
            process.stdout.write(event.data.deltaContent ?? "");
        } else if (event.type === "session.idle") {
            idleResolve?.();
        } else if (event.type === "session.error") {
            console.error(`\nError: ${event.data.message}`);
            idleResolve?.();
        }
    });

    const waitForIdle = (): Promise<void> =>
        new Promise((resolve) => {
            idleResolve = resolve;
        });

    const prompt = `
    Use the Playwright MCP server to analyze the accessibility of this webpage: ${url}
    
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
    `;

    let idle = waitForIdle();
    await session.send({ prompt });
    await idle;

    console.log("\n\n=== Report Complete ===\n");

    // Prompt user for test generation
    const generateTests = await askQuestion(
        "Would you like to generate Playwright accessibility tests? (y/n): "
    );

    if (generateTests.toLowerCase() === "y" || generateTests.toLowerCase() === "yes") {
        const detectLanguagePrompt = `
        Analyze the current working directory to detect the primary programming language.
        Respond with ONLY the detected language name and a brief explanation.
        If no project is detected, suggest "TypeScript" as the default.
        `;

        console.log("\nDetecting project language...\n");
        idle = waitForIdle();
        await session.send({ prompt: detectLanguagePrompt });
        await idle;

        let language = await askQuestion("\n\nConfirm language for tests (or enter a different one): ");
        if (!language) language = "TypeScript";

        const testGenerationPrompt = `
        Based on the accessibility report you just generated for ${url},
        create Playwright accessibility tests in ${language}.
        
        Include tests for: lang attribute, title, heading hierarchy, alt text,
        landmarks, skip navigation, focus indicators, and touch targets.
        Use Playwright's accessibility testing features with helpful comments.
        Output the complete test file.
        `;

        console.log("\nGenerating accessibility tests...\n");
        idle = waitForIdle();
        await session.send({ prompt: testGenerationPrompt });
        await idle;

        console.log("\n\n=== Tests Generated ===");
    }

    rl.close();
    await session.destroy();
    await client.stop();
}

main().catch(console.error);
```

## How it works

1. **Playwright MCP server**: Configures a local MCP server running `@playwright/mcp` to provide browser automation tools
2. **Streaming output**: Uses `streaming: true` and `assistant.message.delta` events for real-time token-by-token output
3. **Accessibility snapshot**: Playwright's `browser_snapshot` tool captures the full accessibility tree of the page
4. **Structured report**: The prompt engineers a consistent WCAG-aligned report format with emoji severity indicators
5. **Test generation**: Optionally detects the project language and generates Playwright accessibility tests

## Key concepts

### MCP server configuration

The recipe configures a local MCP server that runs alongside the session:

```typescript
const session = await client.createSession({
    mcpServers: {
        playwright: {
            type: "local",
            command: "npx",
            args: ["@playwright/mcp@latest"],
            tools: ["*"],
        },
    },
});
```

This gives the model access to Playwright browser tools like `browser_navigate`, `browser_snapshot`, and `browser_click`.

### Streaming with events

Unlike `sendAndWait`, this recipe uses streaming for real-time output:

```typescript
session.on((event) => {
    if (event.type === "assistant.message.delta") {
        process.stdout.write(event.data.deltaContent ?? "");
    } else if (event.type === "session.idle") {
        idleResolve?.();
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
