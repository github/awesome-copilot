# cli.getting-started

## purpose

Slack CLI installation, authentication, project scaffolding, system diagnostics, and the `.slack/` configuration directory.

## rules

1. **Install the Slack CLI from the official release.** On macOS use Homebrew (`brew install slack-cli`), on Windows use the PowerShell installer, on Linux download the tarball from GitHub releases. Verify with `slack version`.
2. **`slack auth login` authenticates via browser OAuth.** Opens a browser to the Slack OAuth consent screen. After approval, the CLI stores tokens locally in `~/.slack/`. You can authenticate with multiple workspaces.
3. **`slack auth list` shows authenticated workspaces.** Lists all logged-in accounts with workspace names and team IDs. The active workspace is marked. Use `--team` flag on any command to target a specific workspace.
4. **`slack create` scaffolds a new project from a template.** Alias for `slack project create`. Launches an interactive wizard to pick a template (blank, AI agent, sample app). Supports `--template <url>` for custom templates and Deno, Node.js, or Python runtimes.
5. **`slack project init` initializes an existing directory.** Links an existing codebase to the Slack platform by creating `.slack/` config files. Use when you already have app code.
6. **`slack project samples` lists available templates.** Shows the full catalog of sample templates from the Slack sample repository. Use `slack create <name> --template <url>` to clone one.
7. **`slack doctor` diagnoses system setup.** Checks installed runtimes (Deno, Node, Python), CLI version, authentication status, and project configuration. Run this first when debugging setup issues.
8. **The `.slack/` directory holds project config.** Created at the project root. Contains `project.json` (app IDs, team IDs, runtime info) and `cli-config.json` (SDK hooks). This directory is auto-generated — don't manually create it.
9. **`project.json` maps environments to app IDs.** Each workspace gets its own app registration. The CLI manages this mapping automatically when you `run` or `deploy` to different workspaces.
10. **`cli-config.json` defines SDK hooks.** Hooks are shell commands the CLI executes for lifecycle events: `get-manifest`, `build`, `start`, `deploy`, `validate`. The SDK scaffolding sets these up — you rarely edit them directly.
11. **System-level config lives in `~/.slack/`.** Contains `apps.json` (auth tokens), `global-config.json` (user preferences like trust settings), and `system-id` (unique machine identifier for telemetry).
12. **`slack upgrade` updates the CLI to the latest version.** The CLI also checks for updates in the background on every run. Suppress with `SLACK_SKIP_UPDATE=1` or `--skip-update`.
13. **Global flags apply to all commands.** Key flags: `--token` (pre-provide auth token), `--team` (target workspace), `--app` (target app ID), `--no-color` (disable colors), `--debug` (verbose logging), `--force` (bypass confirmations).

## patterns

### Pattern 1: First-time setup workflow

```bash
# Step 1: Install the CLI
# macOS:
brew install slack-cli
# Windows (PowerShell as admin):
# irm https://downloads.slack-edge.com/slack-cli/install-windows.ps1 | iex
# Linux:
# curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash

# Step 2: Verify installation
slack version

# Step 3: Authenticate with your workspace
slack auth login
# → Opens browser → Approve OAuth → Done

# Step 4: Verify authentication
slack auth list
# Shows: workspace name, team ID, user

# Step 5: Check system health
slack doctor
# Verifies: CLI version, auth, runtimes (Deno/Node/Python)
```

### Pattern 2: Create a new project

```bash
# Interactive wizard — pick template and runtime
slack create my-bot

# From a specific template URL
slack create my-bot --template https://github.com/slack-samples/deno-hello-world

# Create an AI agent app
slack project create agent my-agent

# Initialize existing code as a Slack project
cd existing-app/
slack project init

# List available sample templates
slack project samples
```

### Pattern 3: Project directory structure after scaffolding

```
my-bot/
├── .slack/
│   ├── project.json        # App IDs, team IDs, runtime config
│   └── cli-config.json     # SDK hook definitions
├── manifest.ts              # App manifest (Deno) or slack.json (Node/Python)
├── functions/               # Custom function definitions
├── workflows/               # Workflow definitions
├── triggers/                # Trigger definitions
├── datastores/              # Datastore schemas
├── deno.jsonc / package.json / requirements.txt  # Runtime deps
└── README.md
```

```json
// .slack/project.json — auto-managed by the CLI
{
  "app_id": "A0123456789",
  "team_id": "T0123456789",
  "runtime": "deno"
}
```

```json
// .slack/cli-config.json — SDK hooks
{
  "hooks": {
    "get-manifest": "deno run -q --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --manifest",
    "build": "deno run -q --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --build",
    "start": "deno run -q --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --start",
    "deploy": "deno run -q --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --deploy"
  }
}
```

## pitfalls

- **Skipping `slack doctor` when setup fails** — It catches missing runtimes, stale auth, and config issues. Always run it first.
- **Manually creating `.slack/` files** — The CLI generates and manages these. Manual edits can corrupt the project state. Use CLI commands instead.
- **Forgetting `--team` with multiple workspaces** — Without `--team`, the CLI uses the default workspace. When working with multiple, always specify the target.
- **Using `slack login` instead of `slack auth login`** — `login` is an alias that works, but be aware the full command is `auth login` when reading docs.
- **Running `slack create` inside an existing project** — Creates a nested project. Run it in the parent directory or use `slack project init` for existing code.
- **Stale auth tokens** — Tokens expire. If commands fail with auth errors, run `slack auth login` again. Use `slack auth list` to check status.
- **Corporate proxy blocking OAuth flow** — The browser-based login requires HTTPS access to `slack.com`. If blocked, use `slack auth login --token xoxp-...` with a manually obtained token.
- **CI/CD without browser access** — Use ticket-based login: `slack auth login --no-prompt --ticket <T> --challenge <C>` for headless environments.

## references

- [Slack CLI quickstart](https://tools.slack.dev/cli/getting-started/)
- [Install the Slack CLI](https://tools.slack.dev/cli/install/)
- [Authentication](https://tools.slack.dev/cli/authorization/)
- [slack create reference](https://tools.slack.dev/cli/reference/slack_create/)
- [Project configuration](https://tools.slack.dev/cli/guides/project-structure/)
- [Slack CLI GitHub repo](https://github.com/slackapi/slack-cli)

## instructions

Do a web search for:

- "Slack CLI install auth login quickstart 2025"
- "slack create project template Deno Node Python"
- "Slack CLI .slack project.json cli-config.json hooks"

Pair with:
- `cli.local-dev-deploy.md` — local development and deployment after project creation
- `cli.manifest-triggers.md` — manifest configuration for the scaffolded project
- `runtime.bolt-foundations-ts.md` — Bolt SDK patterns used within CLI-managed projects
- `runtime.socket-mode-ts.md` — Socket Mode setup for local development

## research

Deep Research prompt:

"Write a micro expert on Slack CLI getting started (installation, authentication, project scaffolding). Cover CLI installation methods (Homebrew, PowerShell, tarball), slack auth login/logout/list, slack create and project create/init/samples, slack doctor diagnostics, .slack/ config directory (project.json, cli-config.json), SDK hooks system, global flags (--token, --team, --app, --debug), system-level config (~/.slack/), and slack upgrade. Include canonical patterns for: first-time setup workflow, project creation variants, scaffolded directory structure."
