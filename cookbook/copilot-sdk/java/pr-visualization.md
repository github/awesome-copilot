# Generating PR Age Charts

> **Demo permissions:** These examples use `PermissionHandler.APPROVE_ALL` only
> for isolated, trusted demonstrations. Replace it with a restrictive permission
> handler before using untrusted prompts or workspaces.

Build an interactive CLI tool that visualizes pull request age distribution for a GitHub repository using Copilot's built-in capabilities.

> **Runnable example:** [recipe/PRVisualization.java](recipe/PRVisualization.java)
>
> ```bash
> jbang recipe/PRVisualization.java
> ```

## Example scenario

You want to understand how long PRs have been open in a repository. This tool detects the current Git repo or accepts a repo as input, then lets Copilot fetch PR data via the GitHub MCP Server and generate a chart image.

## Usage

```bash
# Auto-detect from current git repo
jbang recipe/PRVisualization.java

# Specify a repo explicitly
jbang recipe/PRVisualization.java github/copilot-sdk
```

## Full example: PRVisualization.java

```java
//DEPS com.github:copilot-sdk-java:1.0.21
import com.github.copilot.CopilotClient;
import com.github.copilot.generated.AssistantMessageEvent;
import com.github.copilot.generated.ToolExecutionStartEvent;
import com.github.copilot.rpc.MessageOptions;
import com.github.copilot.rpc.PermissionHandler;
import com.github.copilot.rpc.SessionConfig;
import com.github.copilot.rpc.SystemMessageConfig;
import com.github.copilot.rpc.ToolSearchConfig;
import java.io.BufferedReader;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.regex.Pattern;

public class PRVisualization {

    public static void main(String[] args) throws Exception {
        System.out.println("🔍 PR Age Chart Generator\n");

        // Determine the repository
        String repo;
        if (args.length > 0) {
            repo = args[0];
            System.out.println("📦 Using specified repo: " + repo);
        } else if (isGitRepo()) {
            String detected = getGitHubRemote();
            if (detected != null && !detected.isEmpty()) {
                repo = detected;
                System.out.println("📦 Detected GitHub repo: " + repo);
            } else {
                System.out.println("⚠️  Git repo found but no GitHub remote detected.");
                repo = promptForRepo();
            }
        } else {
            System.out.println("📁 Not in a git repository.");
            repo = promptForRepo();
        }

        if (repo == null || !repo.contains("/")) {
            System.err.println("❌ Invalid repo format. Expected: owner/repo");
            System.exit(1);
        }

        String[] parts = repo.split("/", 2);
        String owner = parts[0];
        String repoName = parts[1];

        // Create Copilot client
        try (var client = new CopilotClient()) {
            client.start().get();

            String cwd = System.getProperty("user.dir");
            var systemMessage = String.format("""
                <context>
                You are analyzing pull requests for the GitHub repository: %s/%s
                The current working directory is: %s
                </context>

                <instructions>
                - Use the GitHub MCP Server tools to fetch PR data
                - Use your file and code execution tools to generate charts
                - Save any generated images to the current working directory
                - Be concise in your responses
                </instructions>
                """, owner, repoName, cwd);

            var session = client.createSession(
                new SessionConfig().setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setModel("gpt-5")
                    .setToolSearch(new ToolSearchConfig().setEnabled(true).setDeferThreshold(20))
                    .setSystemMessage(new SystemMessageConfig().setContent(systemMessage))
            ).get();

            // Set up event handling
            session.on(AssistantMessageEvent.class, msg -> 
                System.out.println("\n🤖 " + msg.getData().content() + "\n")
            );

            session.on(ToolExecutionStartEvent.class, evt -> 
                System.out.println("  ⚙️  " + evt.getData().toolName())
            );

            // Initial prompt - let Copilot figure out the details
            System.out.println("\n📊 Starting analysis...\n");

            String prompt = String.format("""
                Fetch the open pull requests for %s/%s from the last week.
                Calculate the age of each PR in days.
                Then generate a bar chart image showing the distribution of PR ages
                (group them into sensible buckets like <1 day, 1-3 days, etc.).
                Save the chart as "pr-age-chart.png" in the current directory.
                Finally, summarize the PR health - average age, oldest PR, and how many might be considered stale.
                """, owner, repoName);

            session.sendAndWait(new MessageOptions().setPrompt(prompt)).get();

            // Interactive loop
            System.out.println("\n💡 Ask follow-up questions or type \"exit\" to quit.\n");
            System.out.println("Examples:");
            System.out.println("  - \"Expand to the last month\"");
            System.out.println("  - \"Show me the 5 oldest PRs\"");
            System.out.println("  - \"Generate a pie chart instead\"");
            System.out.println("  - \"Group by author instead of age\"");
            System.out.println();

            try (var reader = new BufferedReader(new InputStreamReader(System.in))) {
                while (true) {
                    System.out.print("You: ");
                    String input = reader.readLine();
                    if (input == null) break;
                    input = input.trim();

                    if (input.isEmpty()) continue;
                    if (input.equalsIgnoreCase("exit") || input.equalsIgnoreCase("quit")) {
                        System.out.println("👋 Goodbye!");
                        break;
                    }

                    session.sendAndWait(new MessageOptions().setPrompt(input)).get();
                }
            }

            session.close();
        }
    }

    // ============================================================================
    // Git & GitHub Detection
    // ============================================================================

    private static boolean isGitRepo() {
        try {
            Process proc = Runtime.getRuntime().exec(new String[]{"git", "rev-parse", "--git-dir"});
            return proc.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static String getGitHubRemote() {
        try {
            Process proc = Runtime.getRuntime().exec(new String[]{"git", "remote", "get-url", "origin"});
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(proc.getInputStream()))) {
                String remoteURL = reader.readLine();
                if (remoteURL == null) return null;
                remoteURL = remoteURL.trim();

                // Handle SSH: git@github.com:owner/repo.git
                var sshPattern = Pattern.compile("git@github\\.com:(.+/.+?)(?:\\.git)?$");
                var sshMatcher = sshPattern.matcher(remoteURL);
                if (sshMatcher.find()) {
                    return sshMatcher.group(1);
                }

                // Handle HTTPS: https://github.com/owner/repo.git
                var httpsPattern = Pattern.compile("https://github\\.com/(.+/.+?)(?:\\.git)?$");
                var httpsMatcher = httpsPattern.matcher(remoteURL);
                if (httpsMatcher.find()) {
                    return httpsMatcher.group(1);
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }

    private static String promptForRepo() throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        System.out.print("Enter GitHub repo (owner/repo): ");
        String line = reader.readLine();
        if (line == null) {
            throw new EOFException("End of input while reading repository name");
        }
        return line.trim();
    }
}
```

## How it works

1. **Repository detection**: Checks command-line argument → git remote → prompts user
2. **No custom tools**: Relies entirely on Copilot CLI's built-in capabilities:
   - **GitHub MCP Server** — Fetches PR data from GitHub
   - **File tools** — Saves generated chart images
   - **Code execution** — Generates charts using Python/matplotlib or other methods
3. **Interactive session**: After initial analysis, user can ask for adjustments

## Why this approach?

| Aspect          | Custom Tools      | Built-in Copilot                  |
| --------------- | ----------------- | --------------------------------- |
| Code complexity | High              | **Minimal**                       |
| Maintenance     | You maintain      | **Copilot maintains**             |
| Flexibility     | Fixed logic       | **AI decides best approach**      |
| Chart types     | What you coded    | **Any type Copilot can generate** |
| Data grouping   | Hardcoded buckets | **Intelligent grouping**          |

## Deferring tools with tool search

The GitHub MCP Server can expose many tools alongside file and code-execution
tools. Configure `SessionConfig.setToolSearch(...)` to defer eligible MCP and
SDK-defined external tools by category and runtime policy, then discover them
through metadata-based search. Deferral does not track tool usage frequency:

```java
import com.github.copilot.rpc.ToolSearchConfig;

var session = client.createSession(new SessionConfig()
    .setModel("auto")
    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
    .setToolSearch(new ToolSearchConfig()
        .setEnabled(true)
        .setDeferThreshold(20))
).get();
```

- `setEnabled(true)` requests tool search explicitly. Leaving it unset delegates
  to runtime-controlled automatic enablement, which depends on model capabilities,
  transport, runtime settings, kill switches, and experiments. Setting it to `false`
  disables search deferral, not independent tool filters, policy, or availability.
- `setDeferThreshold(20)` considers deferral only when the effective tool catalog
  **strictly exceeds 20** tools after tool-set and agent filtering. The count
  includes built-ins, MCP tools, and SDK-defined tools, before adding the search
  tool or hosted search mechanism.
- Crossing the threshold defers eligible MCP and SDK-defined external tools,
  not all tools or just those beyond the first 20. Ordinary built-ins and exempt
  tools remain eager, so there is no fixed number left directly visible.
  Exemptions include tools marked `defer: "never"`, the search tool itself,
  GitHub MCP `web_search`, Bluebird MCP tools, and explicitly selected agent
  tools unless that agent opts into deferred loading.
- Leaving `enabled` or `deferThreshold` unset delegates to the selected runtime.
  The runtime packaged with SDK 1.0.21 uses a threshold of 30; explicitly setting
  these values avoids relying on version-specific defaults. An explicit threshold
  takes effect only when the runtime resolves tool search as enabled.

Configuration is session-scoped, including on resume. Subagents need their own
override if they should differ from their runtime default. Tool search is resolved
per turn against the current catalog; a stable result may be reused, but changes
to the model, transport, configuration, runtime gates, or experiments can trigger
re-resolution. Search ranks metadata, prioritizing names over descriptions and
parameter metadata, with namespace/server metadata used by some search paths.

## Best practices

1. **Start with auto-detection**: Let the tool detect the repository from the git remote before prompting the user
2. **Use system messages**: Provide context about the repo and working directory so Copilot can act autonomously
3. **Restrict tool permissions**: Keep `PermissionHandler.APPROVE_ALL` limited to isolated, trusted demonstrations. Use a restrictive handler for untrusted prompts or workspaces, including GitHub MCP and chart-generation tools.
4. **Interactive follow-ups**: Let users refine the analysis conversationally instead of requiring restarts
5. **Save artifacts locally**: Direct Copilot to save generated charts to the current directory for easy access
