#!/usr/bin/env tsx

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
        Analyze the current working directory to detect the primary programming language used in this project.
        Look for project files like package.json, *.csproj, pom.xml, requirements.txt, go.mod, etc.
        
        Respond with ONLY the detected language name (e.g., "TypeScript", "JavaScript", "C#", "Python", "Java") 
        and a brief explanation of why you detected it.
        If no project is detected, suggest "TypeScript" as the default for Playwright tests.
        `;

        console.log("\nDetecting project language...\n");
        idle = waitForIdle();
        await session.send({ prompt: detectLanguagePrompt });
        await idle;

        let language = await askQuestion("\n\nConfirm language for tests (or enter a different one): ");
        if (!language) {
            language = "TypeScript";
        }

        const testGenerationPrompt = `
        Based on the accessibility report you just generated for ${url}, create Playwright accessibility tests in ${language}.
        
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
