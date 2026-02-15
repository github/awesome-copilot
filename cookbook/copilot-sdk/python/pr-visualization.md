# Generating PR Age Charts

Build an interactive CLI tool that visualizes pull request age distribution for a GitHub repository using Copilot's built-in capabilities.

> **Runnable example:** [recipe/pr_visualization.py](recipe/pr_visualization.py)
>
> ```bash
> cd recipe && pip install -r requirements.txt
> # Auto-detect from current git repo
> python pr_visualization.py
>
> # Specify a repo explicitly
> python pr_visualization.py --repo github/copilot-sdk
> ```

## Example scenario

You want to understand how long PRs have been open in a repository. This tool detects the current Git repo or accepts a repo as input, then lets Copilot fetch PR data via the GitHub MCP Server and generate a chart image.

## Prerequisites

```bash
pip install github-copilot-sdk
```

## Usage

```bash
# Auto-detect from current git repo
python pr_visualization.py

# Specify a repo explicitly
python pr_visualization.py --repo github/copilot-sdk
```

## Full example: pr_visualization.py

```python
#!/usr/bin/env python3

import asyncio
import subprocess
import sys
import os
import re
from copilot import (
    CopilotClient, SessionConfig, MessageOptions,
    SessionEvent, SessionEventType,
)

# ============================================================================
# Git & GitHub Detection
# ============================================================================

def is_git_repo():
    try:
        subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            check=True,
            capture_output=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_github_remote():
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            check=True,
            capture_output=True,
            text=True
        )
        remote_url = result.stdout.strip()

        # Handle SSH: git@github.com:owner/repo.git
        ssh_match = re.search(r"git@github\.com:(.+/.+?)(?:\.git)?$", remote_url)
        if ssh_match:
            return ssh_match.group(1)

        # Handle HTTPS: https://github.com/owner/repo.git
        https_match = re.search(r"https://github\.com/(.+/.+?)(?:\.git)?$", remote_url)
        if https_match:
            return https_match.group(1)

        return None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def parse_args():
    args = sys.argv[1:]
    if "--repo" in args:
        idx = args.index("--repo")
        if idx + 1 < len(args):
            return {"repo": args[idx + 1]}
    return {}

def prompt_for_repo():
    return input("Enter GitHub repo (owner/repo): ").strip()

# ============================================================================
# Main Application
# ============================================================================

async def main():
    print("🔍 PR Age Chart Generator\n")

    # Determine the repository
    args = parse_args()
    repo = None

    if "repo" in args:
        repo = args["repo"]
        print(f"📦 Using specified repo: {repo}")
    elif is_git_repo():
        detected = get_github_remote()
        if detected:
            repo = detected
            print(f"📦 Detected GitHub repo: {repo}")
        else:
            print("⚠️  Git repo found but no GitHub remote detected.")
            repo = prompt_for_repo()
    else:
        print("📁 Not in a git repository.")
        repo = prompt_for_repo()

    if not repo or "/" not in repo:
        print("❌ Invalid repo format. Expected: owner/repo")
        sys.exit(1)

    owner, repo_name = repo.split("/", 1)

    # Create Copilot client
    client = CopilotClient()
    await client.start()

    session = await client.create_session(SessionConfig(
        model="gpt-5",
        system_message={
            "content": f"""
<context>
You are analyzing pull requests for the GitHub repository: {owner}/{repo_name}
The current working directory is: {os.getcwd()}
</context>

<instructions>
- Use the GitHub MCP Server tools to fetch PR data
- Use your file and code execution tools to generate charts
- Save any generated images to the current working directory
- Be concise in your responses
</instructions>
"""
        }
    ))

    done = asyncio.Event()

    # Set up event handling
    def handle_event(event: SessionEvent):
        if event.type == SessionEventType.ASSISTANT_MESSAGE:
            print(f"\n🤖 {event.data.content}\n")
        elif event.type == SessionEventType.TOOL_EXECUTION_START:
            print(f"  ⚙️  {event.data.tool_name}")
        elif event.type.value == "session.idle":
            done.set()

    session.on(handle_event)

    # Initial prompt - let Copilot figure out the details
    print("\n📊 Starting analysis...\n")

    await session.send(MessageOptions(prompt=f"""
      Fetch the open pull requests for {owner}/{repo_name} from the last week.
      Calculate the age of each PR in days.
      Then generate a bar chart image showing the distribution of PR ages
      (group them into sensible buckets like <1 day, 1-3 days, etc.).
      Save the chart as "pr-age-chart.png" in the current directory.
      Finally, summarize the PR health - average age, oldest PR, and how many might be considered stale.
    """))

    await done.wait()

    # Interactive loop
    print("\n💡 Ask follow-up questions or type \"exit\" to quit.\n")
    print("Examples:")
    print("  - \"Expand to the last month\"")
    print("  - \"Show me the 5 oldest PRs\"")
    print("  - \"Generate a pie chart instead\"")
    print("  - \"Group by author instead of age\"")
    print()

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ["exit", "quit"]:
            print("👋 Goodbye!")
            break

        if user_input:
            done.clear()
            await session.send(MessageOptions(prompt=user_input))
            await done.wait()

    await session.destroy()
    await client.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

## How it works

1. **Repository detection**: Checks `--repo` flag → git remote → prompts user
2. **No custom tools**: Relies entirely on Copilot CLI's built-in capabilities:
   - **GitHub MCP Server** - Fetches PR data from GitHub
   - **File tools** - Saves generated chart images
   - **Code execution** - Generates charts using Python/matplotlib or other methods
3. **Interactive session**: After initial analysis, user can ask for adjustments

## Why this approach?

| Aspect          | Custom Tools      | Built-in Copilot                  |
| --------------- | ----------------- | --------------------------------- |
| Code complexity | High              | **Minimal**                       |
| Maintenance     | You maintain      | **Copilot maintains**             |
| Flexibility     | Fixed logic       | **AI decides best approach**      |
| Chart types     | What you coded    | **Any type Copilot can generate** |
| Data grouping   | Hardcoded buckets | **Intelligent grouping**          |
