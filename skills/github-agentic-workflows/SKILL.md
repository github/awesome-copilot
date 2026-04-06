---
name: github-agentic-workflows
description: 'Create, update, debug, upgrade, and manage GitHub Agentic Workflows (gh-aw). Covers workflow creation with YAML frontmatter and markdown prompts, trigger configuration, safe-outputs, MCP server integration, shared components, security best practices, and compilation. WHEN: create agentic workflow, gh-aw, update workflow, debug workflow, upgrade workflow, compile workflow, safe outputs, workflow triggers, MCP server workflow, shared workflow component, label command, slash command, agentic automation, GitHub Actions AI agent.'
---

# GitHub Agentic Workflows

Create, update, debug, upgrade, and manage GitHub Agentic Workflows (gh-aw) — AI-powered automation that runs as GitHub Actions jobs.

## Prerequisites

### Install gh-aw CLI

Check if `gh aw` is installed:

```bash
gh aw version
```

If not installed:

```bash
curl -sL https://raw.githubusercontent.com/github/gh-aw/main/install-gh-aw.sh | bash
```

To upgrade:

```bash
gh extension upgrade aw
```

### Quick Reference Commands

```bash
gh aw new <workflow-name>        # Create a new workflow
gh aw compile [workflow-name]    # Compile workflows
gh aw compile --strict           # Compile with strict mode validation
gh aw compile --purge            # Remove stale lock files
gh aw logs [workflow-name]       # Download and analyze logs
gh aw audit <run-id>             # Investigate a specific run
gh aw status                     # Show status of workflows
gh aw fix --write                # Apply automatic codemods
gh aw upgrade                    # Upgrade to latest version
gh aw mcp inspect                # Inspect MCP server configuration
```

## Workflow File Structure

Agentic workflows are single markdown files at `.github/workflows/<workflow-id>.md`.

Each file has two parts:

1. **YAML frontmatter** (between `---` markers) — configuration; requires recompilation when changed
2. **Markdown body** (after frontmatter) — agent instructions; can be edited WITHOUT recompilation

### Minimal Example

```markdown
---
description: Automatically label issues based on their content
on:
  issues:
    types: [opened, edited]
roles: all
permissions:
  contents: read
  issues: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  add-comment:
    max: 1
  missing-tool:
    create-issue: true
---

# Issue Classifier

You are an AI agent that classifies and labels GitHub issues.

## Your Task

Analyze the issue content and apply appropriate labels.

## Guidelines

- Read the issue title and body carefully
- Apply at most 3 labels
- If nothing to do, call the `noop` safe output
```

## Key Concepts

### Triggers (`on:`)

```yaml
# Issue automation
on:
  issues:
    types: [opened, edited]

# PR automation
on:
  pull_request:
    types: [opened, synchronize]

# Scheduled (fuzzy — preferred, auto-adds workflow_dispatch)
on:
  schedule: daily on weekdays

# On-demand slash command
on:
  slash_command: deploy

# On-demand label command
on:
  label_command: deploy

# Combined command triggers
on:
  slash_command: deploy
  label_command:
    name: deploy
    events: [pull_request]

# CI failure monitoring
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

# External deployment monitoring
on:
  deployment_status:
```

**Scheduling best practices:**
- Prefer `daily on weekdays` to avoid "Monday backlog"
- Use fuzzy schedules (`daily`, `weekly`) — the compiler scatters execution times automatically
- Avoid fixed times like `cron: "0 0 * * *"` which concentrate load

### Permissions

**Agent job must stay read-only.** All write operations go through `safe-outputs`.

```yaml
permissions:
  contents: read
  issues: read
```

Never add `write` permissions to the agent job — use safe-outputs instead.

### Tools

`bash` and `edit` are enabled by default (sandboxed). Only declare tools you need beyond defaults.

```yaml
tools:
  github:
    toolsets: [default]    # Required for GitHub API reads
  web-fetch:               # For fetching web pages
  playwright:              # For browser automation
  cache-memory: true       # For persistent state across runs
  agentic-workflows:       # For gh aw commands inside workflows
```

**Important:**
- Always use `toolsets:` for GitHub tools, never list individual tools
- Engines cannot access `api.github.com` directly — must use GitHub MCP via `tools: github:`
- Never recommend GitHub mutation tools (`create_issue`, `add_issue_comment`, etc.) — use `safe-outputs` instead

### Safe Outputs

All GitHub write operations must use safe-outputs:

```yaml
safe-outputs:
  create-issue:
    labels: [automated]
    max: 3
  add-comment:
    max: 5
  create-pull-request:
    max: 1
  update-issue:
    max: 5
  close-issue:
    max: 5
  noop:                    # Signal completion with no action needed
  dispatch-workflow:
    max: 1
  missing-tool:
    create-issue: true     # Auto-track missing tools as issues
```

**Daily workflows tips:**
- Reporting workflows: add `close-older-issues: true` or `close-older-discussions: true`
- Improver workflows (creates PRs): add `skip-if-match:` to avoid duplicate PRs

### Network Access

```yaml
network:
  allowed:
    - defaults             # Basic infrastructure
    - node                 # npm registry
    - python               # PyPI
    - dotnet               # NuGet
    - go                   # Go proxy
    - java                 # Maven/Gradle
    - ruby                 # RubyGems
    - rust                 # Cargo
    - example.com          # Custom domain
```

**Infer network ecosystem from repository files** — never use `network: defaults` alone for code workflows.

### MCP Servers

```yaml
mcp-servers:
  notion:
    container: "mcp/notion"
    version: "v1.2.0"
    env:
      NOTION_TOKEN: "${{ secrets.NOTION_TOKEN }}"
    allowed:
      - search_pages
      - read_page

  deepwiki:
    url: "https://mcp.deepwiki.com/sse"
    allowed: ["read_wiki_structure", "read_wiki_contents", "ask_question"]
```

### Multi-Repository Operations

For cross-repo operations, use authentication with safe-outputs:

```yaml
tools:
  github:
    toolsets: [repos, issues, pull_requests]
safe-outputs:
  github-token: ${{ secrets.GH_AW_CROSS_REPO_PAT }}
  create-issue:
    max: 5
  add-comment:
    max: 10
```

Use `target-repo: "org/repo"` in safe output calls to create resources in external repos.

### Pre-step Data Fetching

Use deterministic `steps:` to prepare data before the agent runs:

```yaml
permissions:
  contents: read
  actions: read
steps:
  - name: Fetch CI logs
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      RUN_ID: ${{ github.event.workflow_run.id }}
    run: |
      mkdir -p /tmp/gh-aw/agent
      gh run view "$RUN_ID" --log > /tmp/gh-aw/agent/ci-logs.txt 2>&1 || true
      tail -500 /tmp/gh-aw/agent/ci-logs.txt > /tmp/gh-aw/agent/ci-logs-trimmed.txt
```

Always set `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on every step that calls `gh`.

### Cache-Memory

Enable persistent state across workflow runs:

```yaml
tools:
  cache-memory: true
```

The agent reads/writes `/tmp/gh-aw/cache-memory/`. Use filesystem-safe timestamps: `YYYY-MM-DD-HH-MM-SS` (no colons, no `T`, no `Z`).

## Workflow Operations

### Creating a Workflow

1. Determine triggers, tools, safe-outputs, network, and permissions
2. Create `.github/workflows/<workflow-id>.md` with frontmatter + markdown body
3. Compile: `gh aw compile <workflow-id>`
4. Verify: check that `.github/workflows/<workflow-id>.lock.yml` was generated
5. Ensure `.gitattributes` contains: `.github/workflows/*.lock.yml linguist-generated=true merge=ours`
6. Commit both `.md` and `.lock.yml` files

### Updating a Workflow

- **Agent behavior changes** (markdown body): edit directly, no recompilation needed
- **Configuration changes** (YAML frontmatter): edit, then run `gh aw compile <workflow-id>`
- Make small, incremental changes — don't rewrite entire frontmatter

### Debugging a Workflow

```bash
gh aw logs <workflow-name> --json    # Analyze existing logs
gh aw audit <run-id> --json          # Investigate a specific run
gh aw status                         # Check workflow status
```

Common issues: missing tools, permission errors, tool name mismatches, network blocks, prompt quality.

### Upgrading Workflows

```bash
gh aw upgrade                        # Recommended: all-in-one upgrade
gh aw upgrade --push                 # Auto-commit and push
gh aw fix --write                    # Apply codemods only
gh aw compile --validate             # Validate after upgrade
```

## Shared Components

Reusable components stored in `.github/workflows/shared/`:

```yaml
---
mcp-servers:
  notion:
    container: "mcp/notion"
    version: "v1.2.0"
    env:
      NOTION_TOKEN: "${{ secrets.NOTION_TOKEN }}"
    allowed:
      - search_pages
      - read_page
---
<!--
Notion MCP Server - Read-only access to Notion workspace.
Required secrets: NOTION_TOKEN
-->
Instructions for using the Notion integration.
```

Import in workflows:

```yaml
imports:
  - shared/notion-mcp.md
```

## Defaults to Omit

Do NOT include fields with sensible defaults:
- `engine: copilot` — Copilot is default; only specify for Claude/Codex/Custom
- `tools: bash:` — enabled by default with all commands
- `tools: edit:` — enabled by default
- `timeout-minutes:` — has sensible defaults

## Security Best Practices

- Agent permissions must be **read-only** — all writes through `safe-outputs`
- Use `permissions: read-all` and expand only if necessary
- Constrain `network:` to minimum required domains/ecosystems
- Use sanitized expressions: `${{ steps.sanitized.outputs.text }}`
- Use `gh aw compile --strict` for production workflows
- **Never auto-merge PRs** — this is a security anti-pattern
- For cross-repo: scope PATs minimally, prefer GitHub Apps, store tokens as secrets
- For dependency updates: create PRs + require CI + require human review

## Architectural Constraints

Agentic workflows execute as a **single GitHub Actions job**:

- **CAN**: Run AI agent once per trigger, read APIs, create GitHub resources via safe-outputs, execute bash, store state in cache-memory, use MCP servers
- **CANNOT**: Cross-job state management, wait for external events, multi-stage orchestration, built-in retry/rollback, job dependencies/matrices

When a request exceeds these constraints, recommend traditional GitHub Actions with job dependencies instead.

## Guard Policies

Fine-grained access control for the GitHub MCP server:

```yaml
tools:
  github:
    toolsets: [default]
    allowed-repos: "all"
    min-integrity: approved    # Only content from trusted collaborators
```

Options for `allowed-repos`: `"all"`, `"public"`, or array of patterns (`["myorg/*"]`).
Options for `min-integrity`: `approved`, `unapproved`, `none`.

## Documentation & References

- Main documentation: https://github.github.com/gh-aw/
- Setup guide: https://github.github.com/gh-aw/setup/quick-start/
- Safe Outputs reference: https://github.github.com/gh-aw/reference/safe-outputs/
- GitHub Tools: https://github.github.com/gh-aw/reference/github-tools/
- Command Triggers: https://github.github.com/gh-aw/reference/command-triggers/
- Multi-Repo Operations: https://github.github.com/gh-aw/patterns/multi-repo-ops/
- LabelOps: https://github.github.com/gh-aw/patterns/label-ops/
- Comprehensive reference (local): `.github/aw/github-agentic-workflows.md`
- Campaign patterns (local): `.github/aw/campaign.md`
