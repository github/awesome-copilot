# Module 8: Configuration

## Key files

| File | Purpose |
|------|---------|
| `~/.copilot/config.json` | Main settings (model, theme, logging, experimental flags) |
| `~/.copilot/mcp-config.json` | MCP servers |
| `~/.copilot/lsp-config.json` | Language servers (user-level) |
| `.github/lsp.json` | Language servers (repo-level) |
| `~/.copilot/copilot-instructions.md` | Global custom instructions |
| `.github/copilot-instructions.md` | Repo-level custom instructions |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `EDITOR` | Text editor for `Ctrl+G` (edit prompt in external editor) |
| `COPILOT_LOG_LEVEL` | Logging verbosity (error/warn/info/debug/trace) |
| `GH_TOKEN` / `GITHUB_TOKEN` | GitHub authentication token (checked in order) |
| `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` | Additional directories for custom instructions |

## Permissions model

- Default: confirmation required for edits, creates, shell commands
- `/allow-all` or `--yolo`: skip all confirmations for the session
- `/reset-allowed-tools`: re-enable confirmations
- Directory allowlists, tool approval gates, MCP server trust

## Logging levels

error, warn, info, debug, trace (`COPILOT_LOG_LEVEL=debug copilot`)

Use debug/trace for: MCP connection issues, tool failures, unexpected behavior, bug reports
