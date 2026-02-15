# Generating Accessibility Reports

Build a CLI tool that analyzes web page accessibility using the Playwright MCP server and generates detailed WCAG-compliant reports with optional test generation.

> **Runnable example:** [recipe/accessibility_report.py](recipe/accessibility_report.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> python accessibility_report.py
> ```

## Example scenario

You want to audit a website's accessibility compliance. This tool navigates to a URL using Playwright, captures an accessibility snapshot, and produces a structured report covering WCAG criteria like landmarks, heading hierarchy, focus management, and touch targets. It can also generate Playwright test files to automate future accessibility checks.

## Prerequisites

```bash
pip install github-copilot-sdk
```

You also need `npx` available (Node.js installed) for the Playwright MCP server.

## Usage

```bash
python accessibility_report.py
# Enter a URL when prompted
```

## Full example: accessibility_report.py

```python
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
    
    Format the report with emoji indicators:
    - 📊 Accessibility Report header
    - ✅ What's Working Well (table with Category, Status, Details)
    - ⚠️ Issues Found (table with Severity, Issue, WCAG Criterion, Recommendation)
    - 📋 Stats Summary (links, headings, focusable elements, landmarks)
    - ⚙️ Priority Recommendations

    Use ✅ for pass, 🔴 for high severity issues, 🟡 for medium severity, ❌ for missing items.
    Include actual findings from the page analysis.
    """

    await session.send(MessageOptions(prompt=prompt))
    await done.wait()

    print("\n\n=== Report Complete ===\n")

    # Prompt user for test generation
    generate_tests = input(
        "Would you like to generate Playwright accessibility tests? (y/n): "
    ).strip().lower()

    if generate_tests in ("y", "yes"):
        done.clear()

        detect_language_prompt = """
        Analyze the current working directory to detect the primary programming language.
        Respond with ONLY the detected language name and a brief explanation.
        If no project is detected, suggest "TypeScript" as the default.
        """

        print("\nDetecting project language...\n")
        await session.send(MessageOptions(prompt=detect_language_prompt))
        await done.wait()

        language = input(
            "\n\nConfirm language for tests (or enter a different one): "
        ).strip()
        if not language:
            language = "TypeScript"

        done.clear()

        test_generation_prompt = f"""
        Based on the accessibility report you just generated for {url},
        create Playwright accessibility tests in {language}.
        
        Include tests for: lang attribute, title, heading hierarchy, alt text,
        landmarks, skip navigation, focus indicators, and touch targets.
        Use Playwright's accessibility testing features with helpful comments.
        Output the complete test file.
        """

        print("\nGenerating accessibility tests...\n")
        await session.send(MessageOptions(prompt=test_generation_prompt))
        await done.wait()

        print("\n\n=== Tests Generated ===")

    await session.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## How it works

1. **Playwright MCP server**: Configures a local MCP server running `@playwright/mcp` to provide browser automation tools
2. **Streaming output**: Uses `streaming=True` and `ASSISTANT_MESSAGE_DELTA` events for real-time token-by-token output
3. **Accessibility snapshot**: Playwright's `browser_snapshot` tool captures the full accessibility tree of the page
4. **Structured report**: The prompt engineers a consistent WCAG-aligned report format with emoji severity indicators
5. **Test generation**: Optionally detects the project language and generates Playwright accessibility tests

## Key concepts

### MCP server configuration

The recipe configures a local MCP server that runs alongside the session:

```python
session = await client.create_session(SessionConfig(
    mcp_servers={
        "playwright": {
            "type": "local",
            "command": "npx",
            "args": ["@playwright/mcp@latest"],
            "tools": ["*"],
        }
    },
))
```

This gives the model access to Playwright browser tools like `browser_navigate`, `browser_snapshot`, and `browser_click`.

### Streaming with events

Unlike `send_and_wait`, this recipe uses streaming for real-time output:

```python
def handle_event(event: SessionEvent):
    if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
        print(event.data.delta_content or "", end="", flush=True)
    elif event.type.value == "session.idle":
        done.set()

session.on(handle_event)
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
