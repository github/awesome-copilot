///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Accessibility Report Generator — analyzes web pages using the Playwright MCP server
 * and generates WCAG-compliant accessibility reports.
 *
 * Usage:
 *   jbang AccessibilityReport.java
 */
public class AccessibilityReport {
    public static void main(String[] args) throws Exception {
        System.out.println("=== Accessibility Report Generator ===\n");

        var reader = new BufferedReader(new InputStreamReader(System.in));

        System.out.print("Enter URL to analyze: ");
        String urlLine = reader.readLine();
        if (urlLine == null) {
            System.out.println("No URL provided. Exiting.");
            return;
        }
        String url = urlLine.trim();
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
            String generateTestsLine = reader.readLine();
            String generateTests = generateTestsLine == null ? "" : generateTestsLine.trim();

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
