# Pre-Commit Secret Scanning via GitHub MCP Server

This reference covers how to set up and use the GitHub MCP Server's secret scanning tool to scan code changes for exposed secrets inside an AI coding agent, before committing or opening a pull request.

For more details, see the [GitHub changelog announcement](https://github.blog/changelog/2026-03-17-secret-scanning-in-ai-coding-agents-via-the-github-mcp-server/).

## General Setup

1. Set up the GitHub MCP Server in your developer environment.
2. Ensure GitHub Secret Protection is enabled on the target repository.
3. (Optional) Install the GitHub Advanced Security plugin for a more tailored secret scanning experience.

## GitHub Copilot CLI

1. Install the Advanced Security plugin:
   ```
   /plugin install advanced-security@copilot-plugins
   ```
2. Enable the secret scanning tool:
   ```
   copilot --add-github-mcp-tool run_secret_scanning
   ```
3. Ask your agent to scan your changes, for example:
   > Scan my current changes for exposed secrets and show me the files and lines I should update before I commit.

## Visual Studio Code

1. Install the `advanced-security` agent plugin in VS Code.
2. In Copilot Chat, use `/secret-scanning` followed by your prompt:
   > /secret-scanning Are there any secrets in my staged changes?

## Example Prompts

- "Scan my current changes for exposed secrets and show me the files and lines I should update before I commit."
- "Check this diff for API keys, tokens, or credentials before I push."
- "Are there any secrets in my staged changes?"
