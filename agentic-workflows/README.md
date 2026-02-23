# GitHub Agentic Workflows

> AI-powered automation for GitHub — write workflows in natural language, not YAML.

## What Are Agentic Workflows?

GitHub Agentic Workflows are a new way to build CI/CD automation. Instead of writing complex YAML with shell scripts, you describe what you want in **Markdown** and an AI agent (GitHub Copilot) interprets and executes your instructions using GitHub APIs.

Each workflow is a `.md` file with two parts:

1. **YAML frontmatter** — triggers, permissions, tools, and guardrails
2. **Markdown body** — natural language instructions the AI follows

```markdown
---
on:
  schedule:
    - cron: "0 10 1 * *"       # When to run
  workflow_dispatch:             # Allow manual trigger

permissions:
  contents: read
  issues: write

engine: copilot                  # AI engine

tools:
  github:
    toolsets: [repos, issues]    # Which GitHub APIs are available
  bash: true                     # Shell access for date math, etc.

safe-outputs:
  create-issue:
    max: 1                       # Guardrail: create at most 1 issue per run
    title-prefix: "[Report] "

timeout-minutes: 30
---

## Step 1: Gather Data

List all public, non-archived repositories in the organization.
For each repo, count open issues and pull requests.

## Step 2: Generate Report

Create a markdown table summarizing repo activity.
Create a GitHub issue with the report.
```

## How It Differs from Traditional GitHub Actions

| | Traditional Actions | Agentic Workflows |
|---|---|---|
| **Format** | YAML + shell scripts | Markdown + natural language |
| **Logic** | You write every step explicitly | AI interprets your intent |
| **API calls** | Manual REST/GraphQL calls | AI handles API calls, pagination, error handling |
| **Customization** | Edit YAML/scripts | Edit plain English instructions |
| **Guardrails** | None built-in | `safe-outputs` limits write operations per run |

## Prerequisites

- **GitHub CLI** (`gh`) — [install guide](https://cli.github.com/)
- **Agentic Workflows extension** — `gh extension install githubnext/gh-aw`
- **GitHub Copilot** access on your repository

## Quick Start

1. **Copy** a workflow `.md` file into your repo's `.github/workflows/` directory
2. **Customize** the instructions (edit the Markdown — it's plain English)
3. **Compile** to generate the Actions lock file:
   ```bash
   gh aw compile workflow-name
   ```
4. **Commit both files** — the `.md` source and the generated `.lock.yml`
5. **Push** — the workflow runs on the triggers you defined

## Safe-Outputs: Built-in Guardrails

Every agentic workflow declares `safe-outputs` in its frontmatter. These are hard limits on what the AI can do per run:

```yaml
safe-outputs:
  create-issue:
    max: 1                    # Create at most 1 issue
    title-prefix: "[Report] " # Must start with this prefix
  create-pull-request:
    max: 3
  add-comment:
    max: 5
  add-labels:
    max: 10
```

If the AI attempts to exceed these limits, the operation is blocked. This prevents runaway automation.

## Available Workflow Categories

| Category | Description |
|---|---|
| **[OSPO](ospo/)** | Open Source Program Office — org health, contributor metrics, compliance, repo hygiene |

> More categories coming soon: DevRel, Security, InnerSource, DevOps

## Learn More

- [GitHub Agentic Workflows Documentation](https://githubnext.github.io/gh-aw/)
- [GitHub Next — Agentic Workflows](https://githubnext.com/projects/agentic-workflows)
