---
title: 'Getting Started with the GitHub Copilot app'
description: 'Learn about the GitHub Copilot app, a desktop experience built for agent-native development. Understand its key features and who it''s for.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-06-17
estimatedReadingTime: '8 minutes'
tags:
  - copilot-app
  - desktop
  - agents
  - parallel-work
relatedArticles:
  - ./using-automations-in-copilot-app.md
  - ./using-copilot-coding-agent.md
  - ./agentic-workflows.md
  - ./what-are-agents-skills-instructions.md
prerequisites:
  - Understanding of GitHub Copilot agents
  - Copilot Pro, Pro+, Business, or Enterprise plan
---

The GitHub Copilot app is a desktop experience built from the ground up for agent-native development. As agents become a central part of your development workflow, you need a place where you can see multiple agents working in parallel, inspect their progress, and take control when needed, all without context-switching between windows or losing track of what's running.

This guide covers what the Copilot app is, its key features, and how to get started.

## What Is the GitHub Copilot app?

The Copilot app is a standalone desktop application that serves as a control center for agentic development. Instead of managing agents through GitHub.com pull requests, issues, and CLI windows, the Copilot app brings everything into one unified interface.

Think of it as a command center where you can:
- See all your active work at a glance
- Spin up multiple agents working on different tasks simultaneously
- Inspect what each agent is doing in real time
- Redirect agents mid-task or approve their changes
- Let agents handle automation (like merging PRs) while you focus elsewhere

The key difference from existing Copilot experiences is that the app is purpose-built for parallel agent work. It handles the complexity of managing multiple isolated environments, branches, and worktrees automatically, so you don't have to.

## Key Features

### My Work View

The central hub of the Copilot app is the **My Work** view. This dashboard shows:

- **Active sessions**: Each agent working on a task gets its own isolated session
- **Issues and PRs**: Your inbox of work items from connected repositories
- **Background automations**: Tasks running in the background, like Agent Merge handling your pull requests
- **Overall status**: A quick overview of what's in progress, what's done, and what's blocked

Instead of checking GitHub, your CLI, and VS Code for updates, everything is in one place.

### Automations

The Copilot app includes built-in automations that can run scheduled tasks for you using the same agentic technology. You can use templates out of the box or create your own.

Automations run in the context of a repository, so they can access issues, pull requests, and code. You can also choose whether they run as a plan, an interactive session, or on autopilot.

### Isolated Worktrees for Parallel Work

Each session the Copilot app creates runs in its own **git worktree**—a real, isolated copy of your branch. This is critical for parallel agent work:

- Multiple agents can work on different tasks simultaneously without stepping on each other
- Each agent has its own branch, its own environment, and its own changes
- No manual branch juggling or cleanup required—the app handles it all
- You can pick up a session from any device, on any worktree

This makes it easy to dispatch multiple agents and trust they won't interfere with each other.

### Canvases

**Canvases** are interactive work surfaces where you and agents collaborate. Instead of long chat threads, a canvas shows the actual work:

- A canvas might display a plan, a pull request diff, a terminal output, or a live browser session
- Agents update the canvas as they work, and you can edit, approve, or redirect changes on the same surface
- This makes it easy to see exactly what an agent is doing and step in when needed

For a hands-on guide to building canvases with `/create-canvas`, see [Working with Canvas Extensions](../working-with-canvas-extensions/).

### Agent Merge

**Agent Merge** is a feature that can carry your pull requests through the entire workflow:

- Monitors CI/CD pipelines and waits for checks to pass
- Addresses failing tests or linting errors
- Tracks required reviewers and waits for approval
- Can automatically merge when all conditions are met

You control the automation level—decide whether Agent Merge should just run CI, address feedback, or go all the way to merging. It's a way to let Copilot handle the tedious parts of the review and merge process.

## Who is the Copilot app for?

The Copilot app isn't a replacement for existing Copilot experiences—it's another tool in the toolbox. Here's who it serves best:

### Developers Who Want to Direct Multiple Agents

If you're using agents regularly and need to manage parallel work, the Copilot app gives you a dedicated control center. Instead of checking multiple windows, you see everything in one place.

### Team Members in Non-Developer Roles

The Copilot app has a more accessible, desktop-first interface compared to developer-centric experiences like VS Code or the CLI. This makes it appealing to business analysts, product managers, and other technical team members who want to work with agents but find traditional developer tools overwhelming.

### Teams Leveraging Parallel Agent Work

The app's worktree architecture makes it natural to dispatch multiple agents on different tasks without coordination. If your team frequently has agents working on multiple initiatives simultaneously, the app is built for this workflow.

### Developers Who Prefer a Graphical Interface

While the CLI is powerful, some developers prefer a visual interface for common tasks. The Copilot app provides a GUI-first experience while still surfacing all the power of agents, hooks, skills, and custom instructions.

### Comparison with Other Copilot Experiences

| Experience | Best For | Strength |
|------------|----------|----------|
| **Copilot CLI** | Developers in the terminal | Raw power, scriptable, always available in your shell |
| **VS Code extension** | Coding and real-time AI assistance | Integrated with your editor, instant feedback |
| **GitHub.com** | Code review and PR management | Central hub for collaboration, always accessible on web |
| **Copilot App** | Directing parallel agents, visual workflow | Control center for agentic development, multi-agent management |

The Copilot app complements these experiences—you'll still use VS Code for coding, the CLI for automation, and GitHub.com for collaboration. The Copilot app fills a specific gap: managing multiple agents in parallel with a unified interface.

## Getting Started

### Requirements

To use the GitHub Copilot app, you need:

- A **GitHub Copilot Pro, Pro+, Business, or Enterprise plan**
- A compatible operating system (macOS, Windows, or Linux)
- Connected GitHub repositories

### Installation

1. Visit [GitHub Copilot app](https://github.com/features/ai/github-app) and download the installer for your platform
2. Install and launch the app
3. Authenticate with your GitHub account
4. Connect your repositories

### Creating Your First Session

Once installed, you can create a session by:

1. **From an issue**: Assign a GitHub issue to Copilot, and the app will create a session to work on it
2. **From a prompt**: Open the Copilot app and describe what you want done (e.g., "Fix the login bug" or "Add dark mode support")
3. **From your inbox**: The app syncs your GitHub inbox—click an issue and start a session for it

Each session runs in its own worktree with its own isolated environment. You can run multiple sessions in parallel.

### Launching Sessions from the Terminal with Deep Links

The GitHub Copilot app supports URL deep links. This is useful when you want to open the app or start a session directly from your terminal workflow.

Supported schemes:

- `ghapp://` (canonical)
- `github-app://`
- `gh://`

In examples below, replace `owner/repo` with your repository.

#### Open a new session

Use the `session/new` route:

```bash
# Basic new session
open "ghapp://session/new?repo=owner/repo"

# Start from a branch
open "ghapp://session/new?repo=owner/repo&branch=main"

# Start from a pull request
open "ghapp://session/new?repo=owner/repo&pr=1234"

# Start with a kickoff prompt
open "ghapp://session/new?repo=owner/repo&prompt=fix%20the%20flaky%20test"

# Set the initial session mode
open "ghapp://session/new?repo=owner/repo&mode=plan"
```

`session/new` supports:

- `repo` (**required**, format `owner/repo`)
- `pr` (integer, mutually exclusive with `branch`)
- `branch` (mutually exclusive with `pr`)
- `prompt` (URL-encoded text)
- `mode` (`plan`, `interactive`, or `autopilot`)

#### Other useful deep links

- `ghapp://repo/owner/repo` - Open (or clone) a repo into projects
- `ghapp://clone/owner/repo` - Clone a repo
- `ghapp://sessions/<sessionId>` - Open an existing session
- `ghapp://chats` - Open chats
- `ghapp://mywork` - Open the My Work view
- `ghapp://recent` - Open recent workspaces
- `ghapp://workflows` - Open automations
- `ghapp://owner/repo/issues/123` - Open an issue
- `ghapp://owner/repo/pull/456` - Open a pull request

#### Important limitations

- Deep links are **repo-centric** and expect `owner/repo`.
- There is no deep link that directly opens an arbitrary local folder.
- For local folders, use the app's **Add local folder** flow; if the folder is already a Git repository with a `github.com` remote, resolve that remote to `owner/repo` and use `session/new`.

### Understanding Session Workflow

Here's what happens when you create a session:

```
1. You describe the work or assign an issue
          ↓
2. Copilot app creates an isolated worktree
          ↓
3. The agent reads your issue, instructions, and codebase
          ↓
4. It plans and implements a solution
          ↓
5. You can monitor progress in the My Work view
          ↓
6. You can redirect the agent or let it finish
          ↓
7. Changes are ready for review (either a PR or approval)
```

### Connecting Repositories

To give Copilot access to your repositories:

1. In the Copilot app, open **Settings** → **Connected Repositories**
2. Click **Add Repository** and select repositories from your GitHub account
3. Grant the necessary permissions
4. The app now has access to your code, issues, and pull requests

## Using the Copilot App with Your Custom Configuration

The Copilot app respects all your existing GitHub Copilot customizations:

- **Custom agents** (`.agent.md` files in `.github/agents/`)
- **Skills** (specialized task guidance in `.github/skills/`)
- **Instructions** (coding standards in `.github/instructions/`)
- **Hooks** (automated checks and formatting in `.github/hooks/`)
- **Setup steps** (`.github/copilot-setup-steps.yml`)

If you haven't set up custom agents, skills, or instructions yet, see [Copilot Configuration Basics](../copilot-configuration-basics/) to get started.

## Common Workflows

### Parallel Bug Fixes

Create multiple sessions to fix different bugs simultaneously:

1. Open the Copilot app
2. Create a session for "Fix login timeout issue"
3. While that's running, create another session for "Fix dark mode button styling"
4. Monitor both in the My Work view
5. Review and merge each PR independently

### Parallel Feature Development

Assign multiple features to agents on different sprints:

1. Connect your issue tracker
2. Let Copilot pull features from your backlog
3. Create a session for each feature
4. Each agent works independently in its own worktree
5. PRs land without interfering with each other

### Automated PR Merge with Agent Merge

Enable Agent Merge to automate routine PR workflows:

1. Configure Agent Merge in the Copilot app settings
2. Specify what automations to enable (run CI, address feedback, merge)
3. Create a session to implement a feature
4. When the PR is created, Agent Merge monitors it
5. It runs CI, waits for reviews, addresses feedback, and merges when ready

## Next Steps

- **Set Up Your Repository**: [Copilot Configuration Basics](../copilot-configuration-basics/) — Add custom agents, skills, and instructions
- **Understand Agent Skills**: [Creating Effective Skills](../creating-effective-skills/) — Build reusable task guidance
- **Automate with Hooks**: [Automating with Hooks](../automating-with-hooks/) — Add guardrails to autonomous work

---
