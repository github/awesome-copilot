#!/usr/bin/env python3

import asyncio
from copilot import (
    CopilotClient, SessionConfig, MessageOptions,
    SessionEvent, SessionEventType,
)

# ============================================================================
# Main Application
# ============================================================================

async def main():
    print("=== Accessibility Report Generator ===\n")

    url = input("Enter URL to analyze: ").strip()

    if not url:
        print("No URL provided. Exiting.")
        return

    # Ensure URL has a scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    print(f"\nAnalyzing: {url}")
    print("Please wait...\n")

    # Create Copilot client with Playwright MCP server
    client = CopilotClient()
    await client.start()

    session = await client.create_session(SessionConfig(
        model="claude-opus-4.6",
        streaming=True,
        mcp_servers={
            "playwright": {
                "type": "local",
                "command": "npx",
                "args": ["@playwright/mcp@latest"],
                "tools": ["*"],
            }
        },
    ))

    done = asyncio.Event()

    # Set up streaming event handling
    def handle_event(event: SessionEvent):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            print(event.data.delta_content or "", end="", flush=True)
        elif event.type.value == "session.idle":
            done.set()
        elif event.type.value == "session.error":
            print(f"\nError: {event.data.message}")
            done.set()

    session.on(handle_event)

    prompt = f"""
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
    """

    await session.send(MessageOptions(prompt=prompt))
    await done.wait()

    print("\n\n=== Report Complete ===\n")

    # Prompt user for test generation
    generate_tests = input("Would you like to generate Playwright accessibility tests? (y/n): ").strip().lower()

    if generate_tests in ("y", "yes"):
        done.clear()

        detect_language_prompt = """
        Analyze the current working directory to detect the primary programming language used in this project.
        Look for project files like package.json, *.csproj, pom.xml, requirements.txt, go.mod, etc.
        
        Respond with ONLY the detected language name (e.g., "TypeScript", "JavaScript", "C#", "Python", "Java") 
        and a brief explanation of why you detected it.
        If no project is detected, suggest "TypeScript" as the default for Playwright tests.
        """

        print("\nDetecting project language...\n")
        await session.send(MessageOptions(prompt=detect_language_prompt))
        await done.wait()

        language = input("\n\nConfirm language for tests (or enter a different one): ").strip()
        if not language:
            language = "TypeScript"

        done.clear()

        test_generation_prompt = f"""
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
        """

        print("\nGenerating accessibility tests...\n")
        await session.send(MessageOptions(prompt=test_generation_prompt))
        await done.wait()

        print("\n\n=== Tests Generated ===")

    await session.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
