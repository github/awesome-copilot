# cli.local-dev-deploy

## purpose

Local development with `slack run`, production deployment with `slack deploy`, activity monitoring, and the SDK hooks system that powers both workflows.

## rules

1. **`slack run` starts a local development server.** Installs a development version of the app to the workspace, starts the local bot process, and tunnels traffic from Slack to your machine. Code changes trigger automatic rebuilds via file watching.
2. **`slack run` uses Socket Mode under the hood.** The CLI creates a WebSocket tunnel — no public URL or ngrok needed. Your bot receives events over the socket connection and responds locally.
3. **The dev app is separate from the deployed app.** `slack run` creates a development app installation (suffixed with `(dev)` in Slack). It has its own app ID, separate from the production `slack deploy` installation.
4. **`--cleanup` uninstalls the dev app on exit.** By default the dev app persists between sessions. Use `slack run --cleanup` to automatically uninstall when you stop the dev server. Useful for keeping workspaces tidy.
5. **`slack deploy` pushes code to Slack's hosted infrastructure.** Packages your app code, uploads it to Slack's platform, and installs or updates the production app in the target workspace. The app runs on Slack's managed Deno/Node/Python runtime.
6. **Always validate before deploying.** `slack deploy` runs manifest validation automatically, but run `slack manifest validate` separately during development to catch issues early.
7. **`slack activity` streams real-time app logs.** Shows function executions, errors, and system events. Use `--level debug` for verbose output, `--level info` for standard, or `--level error` for errors only. Essential for debugging deployed apps.
8. **Activity log levels control verbosity.** Levels: `debug` (all output including SDK internals), `info` (function starts/completions), `warn` (non-fatal issues), `error` (failures only). Default is `info`.
9. **Hooks power the CLI's lifecycle commands.** The `.slack/cli-config.json` defines hooks (`get-manifest`, `build`, `start`, `deploy`, `validate`) that the CLI calls during `run` and `deploy`. The SDK sets these up — you typically don't edit them.
10. **`slack run` supports `--activity-level`** to control log verbosity during local development. Combines the run server with activity monitoring in one terminal.
11. **Deployment targets the active workspace.** Use `--team` to specify which workspace receives the deployment. Without it, the CLI uses the default authenticated workspace.
12. **`slack deploy` is idempotent for updates.** Running it again re-deploys with the latest code. The app ID stays the same — existing triggers and installations are preserved.

## patterns

### Pattern 1: Local development workflow

```bash
# Start local dev server (creates dev app, watches for changes)
slack run

# With activity level for debugging
slack run --activity-level debug

# Auto-cleanup dev app when stopping (Ctrl+C)
slack run --cleanup

# Target a specific workspace
slack run --team T0123456789

# Typical terminal output:
# ⚡ App is running in development mode
# Connected, awaiting events
#   my-bot (dev) A0123456789  T0123456789
#   SDK: deno-slack-sdk 2.x
#   Visit https://app.slack.com/client/T0123456789 to use your app
```

### Pattern 2: Production deployment

```bash
# Deploy to Slack's hosted platform
slack deploy

# Target a specific workspace
slack deploy --team T0123456789

# Typical deployment output:
# 📦 Packaging my-bot...
# 🔐 Validating manifest...
# ✅ my-bot deployed to workspace MyWorkspace
#    App ID: A0123456789
#    Dashboard: https://api.slack.com/apps/A0123456789

# After deploying, create triggers for users to interact with the app
slack trigger create --trigger-def triggers/greeting_trigger.ts
```

### Pattern 3: Activity monitoring

```bash
# Stream live activity logs for deployed app
slack activity

# Filter by log level
slack activity --level debug     # Everything
slack activity --level info      # Function starts/completions
slack activity --level error     # Errors only

# Target a specific app
slack activity --app A0123456789

# Target a specific workspace
slack activity --team T0123456789

# Tail mode (follows new logs, Ctrl+C to stop)
# This is the default behavior — activity streams continuously
```

### Pattern 4: Hooks system (cli-config.json)

```json
// .slack/cli-config.json — hooks executed by the CLI
{
  "hooks": {
    "get-manifest": "deno run -q --config=deno.jsonc --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --manifest",
    "build": "deno run -q --config=deno.jsonc --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --build",
    "start": "deno run -q --config=deno.jsonc --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --start",
    "deploy": "deno run -q --config=deno.jsonc --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --deploy",
    "validate": "deno run -q --config=deno.jsonc --allow-read --allow-net jsr:@anthropic/slack-cli-hooks/mod.ts --validate"
  }
}
```

```
Hook execution flow:

  slack run:
    1. get-manifest  → reads manifest.ts, returns JSON manifest
    2. build         → compiles/bundles the app code
    3. start         → starts the local dev server
    (file change detected → re-runs build + restart)

  slack deploy:
    1. get-manifest  → reads manifest.ts, returns JSON manifest
    2. validate      → checks manifest against Slack schema
    3. build         → compiles/bundles the app code
    4. deploy        → packages and uploads to Slack platform
```

## pitfalls

- **Forgetting to create triggers after deploy** — `slack deploy` installs the app but users can't interact with it until you create triggers (`slack trigger create`). The dev app from `slack run` may auto-create triggers, but production requires explicit setup.
- **Confusing dev app with deployed app** — `slack run` and `slack deploy` create separate app installations. Triggers, datastores, and configs are independent between them.
- **Running `slack run` without auth** — The CLI needs an active login. Run `slack auth login` first if you see auth errors.
- **Deploying untested code** — Always `slack run` and test locally before `slack deploy`. Deployed apps are immediately live.
- **Ignoring activity logs** — Deployed functions fail silently from the user's perspective. Monitor `slack activity` after deploying to catch runtime errors.
- **Not specifying `--team` with multiple workspaces** — Deploys to the default workspace, which may not be your intended target.
- **Editing hooks manually** — The SDK scaffolding sets up hooks correctly. Manual edits to `.slack/cli-config.json` can break the build/deploy pipeline.
- **Expecting ngrok for local dev** — `slack run` uses Socket Mode (WebSocket), not HTTP tunneling. No public URL is needed or created.

## references

- [slack run reference](https://tools.slack.dev/cli/reference/slack_run/)
- [slack deploy reference](https://tools.slack.dev/cli/reference/slack_deploy/)
- [slack activity reference](https://tools.slack.dev/cli/reference/slack_activity/)
- [Local development guide](https://tools.slack.dev/cli/guides/developing-locally/)
- [Deploying to Slack](https://tools.slack.dev/cli/guides/deploying-to-slack/)
- [Hooks system](https://tools.slack.dev/cli/guides/hooks/)

## instructions

Do a web search for:

- "Slack CLI slack run local development Socket Mode 2025"
- "Slack CLI slack deploy hosted platform production"
- "Slack CLI activity logs monitoring debugging"

Pair with:
- `cli.getting-started.md` — project setup before running or deploying
- `cli.manifest-triggers.md` — triggers must be created after deployment
- `runtime.socket-mode-ts.md` — Socket Mode concepts used by `slack run`
- `cli.app-management.md` — app install/uninstall lifecycle

## research

Deep Research prompt:

"Write a micro expert on Slack CLI local development and deployment. Cover slack run (local dev server, Socket Mode tunnel, file watching, hot reload, --cleanup, --activity-level), slack deploy (packaging, uploading to Slack platform, idempotent updates), slack activity (log streaming, --level debug/info/warn/error), the hooks system in cli-config.json (get-manifest, build, start, deploy, validate), dev app vs deployed app separation, and deployment workflow (validate → build → deploy → create triggers). Include canonical patterns for: local dev workflow, production deployment, activity monitoring, hooks configuration."
