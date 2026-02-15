# Generating Accessibility Reports

Build a CLI tool that analyzes web page accessibility using the Playwright MCP server and generates detailed WCAG-compliant reports with optional test generation.

> **Runnable example:** [recipe/accessibility-report.go](recipe/accessibility-report.go)
>
> ```bash
> go run recipe/accessibility-report.go
> ```

## Example scenario

You want to audit a website's accessibility compliance. This tool navigates to a URL using Playwright, captures an accessibility snapshot, and produces a structured report covering WCAG criteria like landmarks, heading hierarchy, focus management, and touch targets. It can also generate Playwright test files to automate future accessibility checks.

## Prerequisites

```bash
go get github.com/github/copilot-sdk/go
```

You also need `npx` available (Node.js installed) for the Playwright MCP server.

## Usage

```bash
go run accessibility-report.go
# Enter a URL when prompted
```

## Full example: accessibility-report.go

```go
package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	copilot "github.com/github/copilot-sdk/go"
)

func main() {
	ctx := context.Background()
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("=== Accessibility Report Generator ===")
	fmt.Println()

	fmt.Print("Enter URL to analyze: ")
	url, _ := reader.ReadString('\n')
	url = strings.TrimSpace(url)

	if url == "" {
		fmt.Println("No URL provided. Exiting.")
		return
	}

	// Ensure URL has a scheme
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}

	fmt.Printf("\nAnalyzing: %s\n", url)
	fmt.Println("Please wait...\n")

	// Create Copilot client with Playwright MCP server
	client := copilot.NewClient(nil)

	if err := client.Start(ctx); err != nil {
		log.Fatal(err)
	}
	defer client.Stop()

	streaming := true
	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		Model:     "claude-opus-4.6",
		Streaming: &streaming,
		McpServers: map[string]interface{}{
			"playwright": map[string]interface{}{
				"type":    "local",
				"command": "npx",
				"args":    []string{"@playwright/mcp@latest"},
				"tools":   []string{"*"},
			},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer session.Destroy()

	// Set up streaming event handling
	done := make(chan struct{}, 1)

	session.On(func(event copilot.SessionEvent) {
		switch event.Type {
		case "assistant.message.delta":
			if event.Data.DeltaContent != nil {
				fmt.Print(*event.Data.DeltaContent)
			}
		case "session.idle":
			select {
			case done <- struct{}{}:
			default:
			}
		case "session.error":
			if event.Data.Message != nil {
				fmt.Printf("\nError: %s\n", *event.Data.Message)
			}
			select {
			case done <- struct{}{}:
			default:
			}
		}
	})

	prompt := fmt.Sprintf(`
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
    `, url)

	if _, err := session.Send(ctx, copilot.MessageOptions{Prompt: prompt}); err != nil {
		log.Fatal(err)
	}
	<-done

	fmt.Println("\n\n=== Report Complete ===\n")

	// Prompt user for test generation
	fmt.Print("Would you like to generate Playwright accessibility tests? (y/n): ")
	generateTests, _ := reader.ReadString('\n')
	generateTests = strings.TrimSpace(strings.ToLower(generateTests))

	if generateTests == "y" || generateTests == "yes" {
		detectLanguagePrompt := `
        Analyze the current working directory to detect the primary programming language.
        Respond with ONLY the detected language name and a brief explanation.
        If no project is detected, suggest "TypeScript" as the default.
        `

		fmt.Println("\nDetecting project language...\n")
		select {
		case <-done:
		default:
		}
		if _, err := session.Send(ctx, copilot.MessageOptions{Prompt: detectLanguagePrompt}); err != nil {
			log.Fatal(err)
		}
		<-done

		fmt.Print("\n\nConfirm language for tests (or enter a different one): ")
		language, _ := reader.ReadString('\n')
		language = strings.TrimSpace(language)
		if language == "" {
			language = "TypeScript"
		}

		testGenerationPrompt := fmt.Sprintf(`
        Based on the accessibility report you just generated for %s,
        create Playwright accessibility tests in %s.
        
        Include tests for: lang attribute, title, heading hierarchy, alt text,
        landmarks, skip navigation, focus indicators, and touch targets.
        Use Playwright's accessibility testing features with helpful comments.
        Output the complete test file.
        `, url, language)

		fmt.Println("\nGenerating accessibility tests...\n")
		select {
		case <-done:
		default:
		}
		if _, err := session.Send(ctx, copilot.MessageOptions{Prompt: testGenerationPrompt}); err != nil {
			log.Fatal(err)
		}
		<-done

		fmt.Println("\n\n=== Tests Generated ===")
	}
}
```

## How it works

1. **Playwright MCP server**: Configures a local MCP server running `@playwright/mcp` to provide browser automation tools
2. **Streaming output**: Uses `Streaming: &streaming` and `assistant.message.delta` events for real-time token-by-token output
3. **Accessibility snapshot**: Playwright's `browser_snapshot` tool captures the full accessibility tree of the page
4. **Structured report**: The prompt engineers a consistent WCAG-aligned report format with emoji severity indicators
5. **Test generation**: Optionally detects the project language and generates Playwright accessibility tests

## Key concepts

### MCP server configuration

The recipe configures a local MCP server that runs alongside the session:

```go
session, err := client.CreateSession(ctx, &copilot.SessionConfig{
    McpServers: map[string]interface{}{
        "playwright": map[string]interface{}{
            "type":    "local",
            "command": "npx",
            "args":    []string{"@playwright/mcp@latest"},
            "tools":   []string{"*"},
        },
    },
})
```

This gives the model access to Playwright browser tools like `browser_navigate`, `browser_snapshot`, and `browser_click`.

### Streaming with events

Unlike `SendAndWait`, this recipe uses streaming for real-time output:

```go
session.On(func(event copilot.SessionEvent) {
    switch event.Type {
    case "assistant.message.delta":
        if event.Data.DeltaContent != nil {
            fmt.Print(*event.Data.DeltaContent)
        }
    case "session.idle":
        done <- struct{}{}
    }
})
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
