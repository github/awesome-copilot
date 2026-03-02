---
title: 'Agentic Workflows'
description: 'Learn what GitHub Agentic Workflows are, how to use community workflows from Awesome Copilot, and how to contribute your own.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-27'
estimatedReadingTime: '7 minutes'
tags:
  - workflows
  - automation
  - github-actions
  - fundamentals
relatedArticles:
  - ./automating-with-hooks.md
  - ./using-copilot-coding-agent.md
prerequisites:
  - Basic understanding of GitHub Actions
  - Basic understanding of GitHub Copilot
---

Agentic Workflows are AI-powered repository automations that run coding agents in GitHub Actions. Written in markdown with natural language instructions, they let you automate tasks like issue triage, daily reports, and compliance checks — triggered by schedules, events, or slash commands.

This article covers what agentic workflows are, how to install and use workflows from the Awesome Copilot community, and how to contribute your own.

## What Are Agentic Workflows?

An agentic workflow is a markdown file that combines YAML frontmatter (triggers, permissions, safe outputs) with natural language instructions that a coding agent follows at runtime. The markdown file is the source: you use the `gh aw` CLI to compile it into a `.lock.yml` workflow file, and GitHub Actions runs that compiled workflow to execute a Copilot coding agent that follows the instructions autonomously.

**Key characteristics**:
- Defined in a single `.md` file — no YAML actions syntax required
- Triggered by schedules, repository events, or slash commands
- Run inside GitHub Actions with the Copilot coding agent
- Use least-privilege permissions and safe outputs for security
- Compiled to `.lock.yml` files via the `gh aw` CLI

### Anatomy of a Workflow File

```markdown
---
name: "Daily Issues Report"
description: "Generates a daily summary of open issues"
on:
  schedule: daily on weekdays
permissions:
  contents: read
  issues: read
safe-outputs:
  create-issue:
    title-prefix: "[daily-report] "
    labels: [report]
---

## Daily Issues Report

Create a daily summary of open issues for the team.

## What to Include

- New issues opened in the last 24 hours
- Issues closed or resolved
- Stale issues that need attention
```

The **frontmatter** declares the workflow's triggers, permissions, and safe outputs. The **body** contains the natural language instructions the agent follows.

### When to Use Agentic Workflows

| Use Case | Example |
|----------|---------|
| Scheduled reports | Daily issue summaries, weekly org health checks |
| Event-driven automation | Triage new issues, check PR relevance |
| Slash commands | `/relevance-check` on an issue or PR |
| Compliance checks | License audits, release readiness reviews |
| Repository maintenance | Identify stale repos, track contributor activity |

Agentic Workflows are ideal when you need **autonomous, event-driven automation** that goes beyond what static GitHub Actions can do — tasks that require reasoning, summarization, or context-aware decisions.

## Using Workflows from Awesome Copilot

The [Awesome Copilot workflows page](../../workflows/) hosts a growing collection of community-contributed workflows. Here's how to install and use them.

### Prerequisites

Install the `gh aw` CLI extension:

```bash
gh extension install github/gh-aw
```

### Installing a Workflow

1. **Browse** the [workflows collection](../../workflows/) and find one that fits your needs
2. **Copy** the workflow `.md` file into your repository's `.github/workflows/` directory
3. **Compile** the workflow to generate the Actions lock file:

```bash
gh aw compile
```

4. **Commit** both the `.md` source and the generated `.lock.yml` file:

```bash
git add .github/workflows/daily-issues-report.md
git add .github/workflows/daily-issues-report.lock.yml
git commit -m "Add daily issues report workflow"
```

### Running a Workflow

Workflows run automatically based on their configured triggers. You can also:

- **Trigger manually**: `gh aw run <workflow>`
- **Monitor runs**: `gh aw status` and `gh aw logs`
- **Validate locally**: `gh aw compile --validate --no-emit <workflow>.md`

### Customizing a Workflow

Since workflows are plain markdown, customizing them is straightforward:

- **Edit the instructions** in the body to adjust what the agent does
- **Change triggers** in the `on:` frontmatter to control when it runs
- **Adjust permissions** to match your repository's needs
- **Modify safe outputs** to control what the agent can create or update

After editing, recompile with `gh aw compile` to regenerate the lock file.

## Contributing Workflows

Sharing your workflows with the community helps others automate their repositories. Here's how to contribute.

### Step 1: Create the Workflow File

Create a new `.md` file in the `workflows/` directory of the [Awesome Copilot repository](https://github.com/github/awesome-copilot). Use a descriptive, lowercase, hyphenated filename:

```
workflows/my-new-workflow.md
```

### Step 2: Add Frontmatter

Include the required frontmatter fields:

```yaml
---
name: "My New Workflow"
description: "A clear description of what this workflow does"
on:
  schedule: daily
permissions:
  contents: read
safe-outputs:
  create-issue:
    title-prefix: "[my-workflow] "
    labels: [automated]
---
```

**Required fields**:
- `name` — human-readable workflow name
- `description` — concise summary of the workflow's purpose

**Workflow fields**:
- `on` — trigger configuration (schedules, events, slash commands)
- `permissions` — GitHub API scopes (use least-privilege)
- `safe-outputs` — guardrails for what the agent can create or modify

### Step 3: Write Clear Instructions

The body of the file contains the natural language instructions the agent follows. Be specific and structured:

```markdown
## Task Overview

Describe the main goal clearly.

## Steps

1. First, gather the relevant data
2. Then, analyze and summarize
3. Finally, create the output (issue, comment, etc.)

## Output Format

Describe the expected format of the result.
```

### Step 4: Validate and Test

```bash
# Validate the workflow compiles correctly
gh aw compile --validate --no-emit workflows/my-new-workflow.md
```

### Step 5: Submit Your Contribution

1. Fork the repository and create a new branch
2. Add your workflow `.md` file to the `workflows/` directory
3. Run `npm run build` to update the README
4. Submit a pull request targeting the `staged` branch

> **Important:** Only submit the `.md` source file. Do not include compiled `.lock.yml` or `.yml` files — CI will block them.

### Workflow Contribution Guidelines

- **Security first** — use least-privilege permissions and safe outputs instead of direct write access
- **Clear instructions** — write specific, unambiguous natural language in the workflow body
- **Descriptive names** — use lowercase filenames with hyphens (e.g., `daily-issues-report.md`)
- **Test locally** — validate with `gh aw compile --validate` before submitting
- **Document the purpose** — the `description` field should make it clear what the workflow does and when to use it

## Learn More

- **Official documentation**: [GitHub Agentic Workflows](https://gh.io/gh-aw) — full specification and reference
- **Browse workflows**: [Awesome Copilot Workflows](../../workflows/) — community-contributed collection
- **Contributing guide**: [CONTRIBUTING.md](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-agentic-workflows) — detailed contribution guidelines
- **Related**: [Automating with Hooks](../automating-with-hooks/) — deterministic automation for Copilot agent sessions
- **Related**: [Using the Copilot Coding Agent](../using-copilot-coding-agent/) — the agent that powers agentic workflows

---
