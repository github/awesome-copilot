#!/usr/bin/env tsx

import { CopilotClient } from "@github/copilot-sdk";
import { execSync } from "node:child_process";
import * as readline from "node:readline";

// ============================================================================
// Git & GitHub Detection
// ============================================================================

function isGitRepo(): boolean {
    try {
        execSync("git rev-parse --git-dir", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function getGitHubRemote(): string | null {
    try {
        const remoteUrl = execSync("git remote get-url origin", {
            encoding: "utf-8",
        }).trim();

        // Handle SSH: git@github.com:owner/repo.git
        const sshMatch = remoteUrl.match(/git@github\.com:(.+\/.+?)(?:\.git)?$/);
        if (sshMatch) return sshMatch[1];

        // Handle HTTPS: https://github.com/owner/repo.git
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/(.+\/.+?)(?:\.git)?$/);
        if (httpsMatch) return httpsMatch[1];

        return null;
    } catch {
        return null;
    }
}

function parseArgs(): { repo?: string } {
    const args = process.argv.slice(2);
    const repoIndex = args.indexOf("--repo");
    if (repoIndex !== -1 && args[repoIndex + 1]) {
        return { repo: args[repoIndex + 1] };
    }
    return {};
}

async function promptForRepo(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question("Enter GitHub repo (owner/repo): ", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// ============================================================================
// Main Application
// ============================================================================

async function main() {
    console.log("🔍 PR Age Chart Generator\n");

    // Determine the repository
    const args = parseArgs();
    let repo: string;

    if (args.repo) {
        repo = args.repo;
        console.log(`📦 Using specified repo: ${repo}`);
    } else if (isGitRepo()) {
        const detected = getGitHubRemote();
        if (detected) {
            repo = detected;
            console.log(`📦 Detected GitHub repo: ${repo}`);
        } else {
            console.log("⚠️  Git repo found but no GitHub remote detected.");
            repo = await promptForRepo();
        }
    } else {
        console.log("📁 Not in a git repository.");
        repo = await promptForRepo();
    }

    if (!repo || !repo.includes("/")) {
        console.error("❌ Invalid repo format. Expected: owner/repo");
        process.exit(1);
    }

    const [owner, repoName] = repo.split("/");

    // Create Copilot client - no custom tools needed!
    const client = new CopilotClient({ logLevel: "error" });

    const session = await client.createSession({
        model: "gpt-5",
        systemMessage: {
            content: `
<context>
You are analyzing pull requests for the GitHub repository: ${owner}/${repoName}
The current working directory is: ${process.cwd()}
</context>

<instructions>
- Use the GitHub MCP Server tools to fetch PR data
- Use your file and code execution tools to generate charts
- Save any generated images to the current working directory
- Be concise in your responses
</instructions>
`,
        },
    });

    // Set up event handling
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    session.on((event) => {
        if (event.type === "assistant.message") {
            console.log(`\n🤖 ${event.data.content}\n`);
        } else if (event.type === "tool.execution_start") {
            console.log(`  ⚙️  ${event.data.toolName}`);
        }
    });

    // Initial prompt - let Copilot figure out the details
    console.log("\n📊 Starting analysis...\n");

    await session.sendAndWait({
        prompt: `
      Fetch the open pull requests for ${owner}/${repoName} from the last week.
      Calculate the age of each PR in days.
      Then generate a bar chart image showing the distribution of PR ages
      (group them into sensible buckets like <1 day, 1-3 days, etc.).
      Save the chart as "pr-age-chart.png" in the current directory.
      Finally, summarize the PR health - average age, oldest PR, and how many might be considered stale.
    `,
    });

    // Interactive loop
    const askQuestion = () => {
        rl.question("You: ", async (input) => {
            const trimmed = input.trim();

            if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
                console.log("👋 Goodbye!");
                rl.close();
                await session.destroy();
                await client.stop();
                process.exit(0);
            }

            if (trimmed) {
                await session.sendAndWait({ prompt: trimmed });
            }

            askQuestion();
        });
    };

    console.log('💡 Ask follow-up questions or type "exit" to quit.\n');
    console.log("Examples:");
    console.log('  - "Expand to the last month"');
    console.log('  - "Show me the 5 oldest PRs"');
    console.log('  - "Generate a pie chart instead"');
    console.log('  - "Group by author instead of age"');
    console.log("");

    askQuestion();
}

main().catch(console.error);
