# Pre-Commit Secret Scanning via GitHub MCP Server

Reference guide for setting up and using the GitHub MCP Server's secret scanning tool in AI coding agents. This allows you to scan code changes for exposed secrets **before** committing or opening a pull request.

For more information, see the [GitHub changelog announcement](https://github.blog/changelog/2026-03-17-secret-scanning-in-ai-coding-agents-via-the-github-mcp-server/).

## Prerequisites

- GitHub Secret Protection must be enabled on the target repository (requires GitHub Team or Enterprise Cloud)
- GitHub MCP Server must be configured in your IDE or agent environment

## Setup by Environment

### GitHub Copilot CLI

1. Install the Advanced Security plugin:
   ```
   /plugin install advanced-security@copilot-plugins
   ```
2. Enable the secret scanning tool:
   ```
   copilot --add-github-mcp-tool run_secret_scanning
   ```

### Visual Studio Code

1. Install the `advanced-security` agent plugin from the VS Code marketplace or Extensions panel
2. In Copilot Chat, use the `/secret-scanning` slash command followed by your prompt:
   ```
   /secret-scanning Scan my current changes for exposed secrets before I commit.
   ```

### General (Any MCP-Compatible Environment)

1. Set up the GitHub MCP Server in your developer environment by following the [GitHub MCP Server documentation](https://github.com/github/github-mcp-server)
2. Ensure GitHub Secret Protection is enabled on the target repository
3. Ask your agent to scan for secrets using natural language — the `secret_scanning` tool will be available automatically once the MCP Server is connected

## Example Prompts

Once set up, use prompts like these to trigger a pre-commit scan:

- "Scan my current changes for exposed secrets and show me the files and lines I should update before I commit."
- "Check this diff for API keys, tokens, or credentials before I push."
- "Are there any secrets in my staged changes?"

## What Gets Returned

When secrets are detected, the tool returns structured results including:

- **File path** — which file contains the exposed secret
- **Line number** — exact location within the file
- **Secret type** — e.g., GitHub personal access token, AWS access key, generic API key

## Troubleshooting

| Issue | Resolution |
|---|---|
| `secret_scanning` tool not found | Verify the GitHub MCP Server is running and connected to your agent environment |
| No results returned | Confirm GitHub Secret Protection is enabled on the repository |
| Plugin install fails | Ensure you are using a supported version of GitHub Copilot CLI |
