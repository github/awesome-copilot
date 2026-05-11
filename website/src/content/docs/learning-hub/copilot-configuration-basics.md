---
title: 'Copilot Configuration Basics'
description: 'Learn how to configure GitHub Copilot at user, workspace, and repository levels to optimize your AI-assisted development experience.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-05-11
estimatedReadingTime: '10 minutes'
tags:
  - configuration
  - setup
  - fundamentals
relatedArticles:
  - ./what-are-agents-skills-instructions.md
  - ./understanding-copilot-context.md
prerequisites:
  - Basic familiarity with GitHub Copilot
---

GitHub Copilot offers extensive configuration options that let you tailor its behavior to your personal preferences, project requirements, and team standards. Understanding these configuration layers helps you maximize productivity while maintaining consistency across teams. This article explains the configuration hierarchy, key settings, and how to set up repository-level customizations that benefit your entire team.

## Configuration Levels

GitHub Copilot uses a hierarchical configuration system where settings at different levels can override each other. Understanding this hierarchy helps you apply the right configuration at the right level.

### User Settings

User settings apply globally across all your projects and represent your personal preferences. These are stored in your IDE's user configuration and travel with your IDE profile.

**Common user-level settings**:
- Enable/disable inline suggestions globally
- Commit message style preferences
- Default language preferences

**When to use**: For personal preferences that should apply everywhere you work, like keyboard shortcuts or whether you prefer inline suggestions vs chat.

### Repository Settings

Repository settings live in your codebase (typically in `.github/` although some editors allow customising the paths that Copilot will use) and are shared with everyone working on the project. These provide the highest level of customization and override both user and workspace settings.

**Common repository-level customizations**:
- Custom instructions for coding conventions
- Reusable skills for common tasks
- Specialized agents for project workflows
- Custom agents for domain expertise

**When to use**: For repository-wide standards, project-specific best practices, and reusable customizations that should be version-controlled and shared.

### Organisation Settings (GitHub.com only)

Organisation settings allow administrators to enforce Copilot policies across all repositories within an organization. These settings can include defining custom agents, creating globally applied instructions, enabling or disabling Copilot, managing billing, and setting usage limits. These policies may not be enforced in the IDE, depending on the IDE's support for organization-level settings, but will apply to Copilot usage on GitHub.com.

**When to use**: For enforcing organization-wide policies, ensuring compliance, and providing shared resources across multiple repositories.

### Configuration Precedence

When multiple configuration levels define the same setting, GitHub Copilot applies them in this order (highest precedence first):

1. **Organisation settings** (if applicable)
1. **Repository settings** (`.github/`)
1. **User settings** (IDE global preferences)

**Example**: If your user settings disable Copilot for `.test.ts` files, but repository settings enable custom instructions for test files, the repository settings take precedence and Copilot remains active with the custom instructions applied.

## Key Configuration Options

These settings control GitHub Copilot's core behavior across all IDEs:

### Inline Suggestions

Control whether Copilot automatically suggests code completions as you type.

**VS Code example**:
```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": false
  }
}
```

**Why it matters**: Some developers prefer to invoke Copilot explicitly rather than seeing automatic suggestions. You can also enable it only for specific languages.

### Chat Availability

Control access to GitHub Copilot Chat in your IDE.

**VS Code example**:
```json
{
  "github.copilot.chat.enabled": true
}
```

**Why it matters**: Chat provides a conversational interface for asking questions and getting explanations, complementing inline suggestions.

### Suggestion Trigger Behavior

Configure how and when Copilot generates suggestions.

**VS Code example**:
```json
{
  "editor.inlineSuggest.enabled": true,
  "github.copilot.editor.enableAutoCompletions": true
}
```

**Why it matters**: Control whether suggestions appear automatically or only when explicitly requested, balancing helpfulness with potential distraction.

### Language-Specific Settings

Enable or disable Copilot for specific programming languages.

**VS Code example**:
```json
{
  "github.copilot.enable": {
    "typescript": true,
    "javascript": true,
    "python": true,
    "markdown": false
  }
}
```

**Why it matters**: You may want Copilot active for code files but not for documentation or configuration files.

### Excluded Files and Directories

Prevent Copilot from accessing specific files or directories.

**VS Code example**:
```json
{
  "github.copilot.advanced": {
    "debug.filterLogCategories": [],
    "excludedFiles": [
      "**/secrets/**",
      "**/*.env",
      "**/node_modules/**"
    ]
  }
}
```

**Why it matters**: Exclude sensitive files, generated code, or dependencies from Copilot's context to improve suggestion relevance and protect confidential information.

## Repository-Level Configuration

The `.github/` directory in your repository enables team-wide customizations that are version-controlled and shared across all contributors.

### Directory Structure

A well-organized Copilot configuration directory looks like this:

```
.github/
├── agents/
│   ├── terraform-expert.agent.md
│   └── api-reviewer.agent.md
├── skills/
│   ├── generate-tests/
│   │   └── SKILL.md
│   └── refactor-component/
│       └── SKILL.md
└── instructions/
    ├── typescript-conventions.instructions.md
    └── api-design.instructions.md
```

### Monorepo Support

In monorepos with multiple packages or services, GitHub Copilot CLI discovers customizations at **every directory level** from your working directory up to the git repository root. This means each package or service can have its own `.github/` folder with specialized agents, instructions, skills, and MCP servers, while still inheriting configuration from parent directories.

```
my-monorepo/
├── .github/
│   └── instructions/
│       └── shared-conventions.instructions.md   ← applies everywhere
├── packages/
│   ├── api/
│   │   └── .github/
│   │       └── agents/
│   │           └── api-expert.agent.md           ← applies in packages/api/
│   └── web/
│       └── .github/
│           └── instructions/
│               └── react-conventions.instructions.md  ← applies in packages/web/
```

When you work inside `packages/api/`, Copilot loads configuration from `packages/api/.github/`, then `packages/.github/` (if it exists), then the root `.github/`. This layered discovery ensures the right context is active no matter where in the repository you're working.

### Personal Skills Directory

In addition to repository-level skills, GitHub Copilot CLI supports a **personal skills directory** at `~/.agents/skills/`. Skills you place here are discovered automatically across all your projects, making them ideal for personal workflows and reusable utilities that are not project-specific.

```
~/.agents/
└── skills/
    ├── my-review-style/
    │   └── SKILL.md     ← available in all sessions
    └── cleanup-todos/
        └── SKILL.md
```

This personal directory aligns with the VS Code GitHub Copilot for Azure extension's default skill discovery path, so skills defined here work consistently across tools.

### Custom Agents

Agents are specialized assistants for specific workflows. Place agent definition files in `.github/agents/`.

**Example agent** (`terraform-expert.agent.md`):
```markdown
---
description: 'Terraform infrastructure-as-code specialist'
tools: ['filesystem', 'terminal']
name: 'Terraform Expert'
---

You are an expert in Terraform and cloud infrastructure.
Guide users through creating, reviewing, and deploying infrastructure code.
```

**When to use**: Create agents for domain-specific tasks like infrastructure management, API design, or security reviews.

### Reusable Skills

Skills are self-contained folders that package reusable capabilities. Store them in `.github/skills/`.

**Example skill** (`generate-tests/SKILL.md`):
```markdown
---
name: generate-tests
description: 'Generate comprehensive unit tests for a component, covering happy path, edge cases, and error conditions'
---

# generate-tests

Generate unit tests for the selected code that:
- Cover all public methods and edge cases
- Use our testing conventions from @testing-utils.ts
- Include descriptive test names

See [references/test-patterns.md](references/test-patterns.md) for standard patterns.
```

Skills can also bundle reference files, templates, and scripts in their folder, giving the AI richer context than a single file can provide. Unlike the older prompt format, skills can be discovered and invoked by agents automatically.

**When to use**: For repetitive tasks your team performs regularly, like generating tests, creating documentation, or refactoring patterns.

### Instructions Files

Instructions provide persistent context that applies automatically when working in specific files or directories. Store them in `.github/instructions/`.

**Example instruction** (`typescript-conventions.instructions.md`):
```markdown
---
description: 'TypeScript coding conventions for this project'
applyTo: '**.ts, **.tsx'
---

When writing TypeScript code:
- Use strict type checking
- Prefer interfaces over type aliases for object types
- Always handle null/undefined with optional chaining
- Use async/await instead of raw promises
```

**When to use**: For project-wide coding standards, architectural patterns, or technology-specific conventions that should influence all suggestions.

## Setting Up Team Configuration

Follow these steps to establish effective team-wide Copilot configuration:

### 1. Create the Configuration Structure

Start by creating the `.github/` directory in your repository root:

```bash
mkdir -p .github/{agents,skills,instructions}
```

### 2. Document Your Conventions

Create instructions that capture your team's coding standards:

```markdown
<!-- .github/instructions/team-conventions.instructions.md -->
---
description: 'Team coding conventions and best practices'
applyTo: '**'
---

Our team follows these practices:
- Write self-documenting code with clear names
- Add comments only for complex logic
- Prefer composition over inheritance
- Keep functions small and focused
```

### 3. Build Reusable Skills

Identify repetitive tasks and create skills for them:

```markdown
<!-- .github/skills/add-error-handling/SKILL.md -->
---
name: add-error-handling
description: 'Add comprehensive error handling to existing code following team patterns'
---

# add-error-handling

Add error handling to the selected code:
- Catch and handle potential errors
- Log errors with context
- Provide meaningful error messages
- Follow our error handling patterns from @error-utils.ts
```

### 4. Version Control Best Practices

- **Commit all `.github/` files** to your repository
- **Use descriptive commit messages** when adding or updating customizations
- **Review changes** to ensure they align with team standards
- **Document** each customization with clear descriptions and examples

### 5. Onboard New Team Members

Make Copilot configuration part of your onboarding process:

1. Point new members to your `.github/` directory
2. Explain which agents and skills exist and when to use them
3. Encourage exploration and contributions
4. Include example usage in your project README

## IDE-Specific Configuration

While repository-level customizations work across all IDEs, you may also need IDE-specific settings:

### VS Code

Settings file: `.vscode/settings.json` or global user settings

```json
{
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.chat.enabled": true,
  "editor.inlineSuggest.enabled": true
}
```

### Visual Studio

Settings: Tools → Options → GitHub Copilot

- Configure inline suggestions
- Set keyboard shortcuts
- Manage language-specific enablement

### JetBrains IDEs

Settings: File → Settings → Tools → GitHub Copilot

- Enable/disable for specific file types
- Configure suggestion behavior
- Customize keyboard shortcuts

### GitHub Copilot CLI

Configuration file: `~/.copilot-cli/config.json`

```json
{
  "editor": "vim",
  "suggestions": true
}
```

CLI settings use **camelCase** naming. Key settings added in recent releases:

| Setting | Description |
|---------|-------------|
| `includeCoAuthoredBy` | Include Co-authored-by trailer in commits |
| `effortLevel` | Default reasoning effort level (`low`, `medium`, `high`) |
| `autoUpdatesChannel` | Update channel (`stable`, `preview`) |
| `statusLine` | Show status line in the terminal UI |
| `include_gitignored` | Include gitignored files in `@` file search |
| `extension_mode` | Control extensibility (agent tools and plugins) |
| `continueOnAutoMode` | Automatically switch to the auto model on rate limit instead of pausing |

> **Note**: Older snake_case names (e.g., `include_gitignored`, `auto_updates_channel`) are still accepted for backward compatibility, but camelCase is now the preferred format.

In addition to the main config file, GitHub Copilot CLI reads two optional per-project files for repository-specific overrides:

- `.claude/settings.json` — committed project settings
- `.claude/settings.local.json` — local overrides (add to `.gitignore` for personal adjustments)

These files follow the same format as `config.json` and are loaded after the global config, so they can tailor CLI behaviour—including hook definitions—per repository without touching `.github/`.

> **Important (v1.0.36+)**: Custom agents, skills, and commands placed in `~/.claude/` (the Claude Code user directory) are **no longer loaded** by GitHub Copilot CLI. Only `~/.claude/settings.json` is read for configuration. If you previously stored personal agents or skills in `~/.claude/`, move them to the supported locations: `~/.agents/` for user-level agents, `~/.agents/skills/` for personal skills, or `.github/agents/` and `.github/skills/` in your repositories for project-level customizations.

### Model Picker

The model picker opens in a **full-screen view** with inline reasoning effort adjustment. Use the **← / →** arrow keys to change the reasoning effort level (`low`, `medium`, `high`) directly from the picker without leaving the session. The current reasoning effort level is also displayed in the model header (e.g., `claude-sonnet-4.6 (high)`) so you always know which level is active.

**Auto mode and server-side model routing** (v1.0.43+): When you select **Auto** as your model, the CLI uses server-side model routing for real-time model selection. Instead of locking in a single model at session start, Auto mode evaluates each request and routes it to the most appropriate model dynamically. This means straightforward questions can be handled by a faster model while complex reasoning tasks are automatically escalated — without you needing to switch models manually.

### CLI Session Commands

GitHub Copilot CLI has two commands for managing session state, with distinct behaviours:

| Command | Behaviour |
|---------|-----------|
| `/new [prompt]` | Starts a fresh conversation while keeping the current session backgrounded. You can switch back to backgrounded sessions. |
| `/clear [prompt]` | Abandons the current session entirely and starts a new one. Backgrounded sessions are not affected. MCP servers configured in your project are preserved in the new session. |

Both commands accept an optional prompt argument to seed the new session with an opening message, for example `/new Add error handling to the login flow`.

The `/session rename` command renames the current session. When called **without a name argument**, it automatically generates a session name based on the conversation history:

```
/session rename               # auto-generate a name from conversation history
/session rename "My feature"  # set a specific name
```

Auto-generated names help you find sessions quickly when switching between multiple backgrounded sessions.

You can also name a session at startup with the `--name` flag, and resume it by name later:

```bash
copilot --name "auth-refactor"          # start a session with a given name
copilot --resume="auth-refactor"        # resume that session by name
```

The `/session delete` command removes sessions you no longer need:

```
/session delete              # delete the current session
/session delete <id>         # delete a session by ID
/session delete-all          # delete all sessions
```

You can also press **x** on a highlighted session in the session picker (`--resume`) to delete it directly from the list.

In the session picker, press **`s`** to cycle the sort order: relevance, last used, created, or name. The picker also shows the branch name and idle/in-use status for each session.

The `/rewind` command opens a timeline picker that lets you roll back the conversation to any earlier point in history, reverting both the conversation and any file changes made after that point. You can also trigger it by pressing **double-Esc**:

```
/rewind
```

Use `/rewind` when you want to branch off from a different point in the conversation, rather than just undoing the most recent turn.

The `/undo` command reverts the last turn—including any file changes the agent made—letting you course-correct without manually undoing edits:

```
/undo
```

Use `/undo` when the agent's last response went in an unwanted direction and you want to try a different approach from that point.

The `/fork` command (v1.0.45+) copies the current session into a **new independent session** that starts from the same conversation state. The original session continues unchanged — you can switch back to it at any time. This is useful when you want to explore two different approaches to a problem simultaneously:

```
/fork
```

After forking, the new session is immediately active. Both sessions share the same history up to the fork point but accumulate changes independently from that moment forward. Use `/fork` to experiment with a risky refactor without abandoning your current working session.

The `/cd` command changes the working directory for the current session. Each session maintains its own working directory that persists when you switch between sessions:

```
/cd ~/projects/my-other-repo
```

This is useful when you have multiple backgrounded sessions each focused on a different project directory.

The `/share html` command exports the current session — including conversation history and any research reports — as a **self-contained interactive HTML file**:

```
/share html
```

The exported file contains everything needed to view the session without a network connection and can be shared with teammates or stored for later reference. This complements `/share` (which shares via URL) for cases where an offline or attached format is preferred.

The `/chronicle` command opens an interactive timeline of everything the agent has done in the current session. It shows file changes, tool calls, and conversation turns in chronological order, letting you review the full arc of the session at a glance:

```
/chronicle
```

Chronicle tracks which files were created, modified, or deleted during the session alongside the conversation that led to those changes. Use it to review what happened before a `/rewind`, audit what the agent changed, or share a summary of session activity with teammates.

> **Note**: Session history, file tracking, and the `/chronicle` command were previously experimental features. As of v1.0.40, they are available to all users without enabling experimental mode.

**Keyboard shortcuts for queuing messages**: Use **Ctrl+Q** or **Ctrl+Enter** to queue a message (send it while the agent is still working). **Ctrl+D** no longer queues messages — it now has its default terminal behavior. If you have muscle memory for Ctrl+D queuing, switch to Ctrl+Q.

**Background running tasks**: Press **Ctrl+X → B** to move the current running task or shell command to the background. The task continues executing while you can type a new message or review earlier output. This is useful for long-running commands where you want to interact with the agent while waiting for the result.

The `/ask` command lets you ask a quick question without affecting your conversation history. The current session context is preserved, so you can use it for one-off lookups without derailing an ongoing task. Responses are rendered as full markdown, including tables and formatted links:

```
/ask What does the `retry` utility in src/utils do?
```

The `/env` command shows all loaded environment details — instructions, MCP servers, skills, agents, and plugins — in a single view. Use it to verify that the right resources are active for the current session:

```
/env
```

The `/context` command shows a visualization of the current conversation's context window usage — how many tokens are consumed and how much headroom remains:

```
/context
```

The `/usage` command displays session metrics such as the number of tokens consumed, API calls made, and any quota information for the current session:

```
/usage
```

The `/compact` command summarizes the conversation history to free up context window space while preserving the thread of the conversation. Use it when your context is getting full but you do not want to start a fresh session:

```
/compact
```

> **Note**: Skills remain loaded and effective after `/compact`. You do not need to re-invoke them after compacting.

> **ACP sessions (v1.0.39+)**: The `/compact`, `/context`, `/usage`, and `/env` commands are now available in ACP (Agent Coordination Protocol) sessions, allowing remote ACP clients to surface session details and manage context from within their own automated workflows.

The `/statusline` command (with `/footer` as an alias) lets you control which items appear in the terminal status bar. You can show or hide individual indicators like the working directory, current branch, effort level, context window usage, quota, and **active account username** (v1.0.43+). The **changes** toggle shows a running count of added/removed lines for the session — useful when tracking the scope of an ongoing edit:

```
/statusline             # show the statusline configuration menu
```

Toggle the **username** indicator to display which GitHub account is currently active in the footer — helpful when you work with multiple accounts or switch between personal and organization contexts.

The `/keep-alive` command prevents the system from sleeping while Copilot CLI is active. This is useful during long-running agent sessions on laptops or machines with aggressive sleep settings:

```
/keep-alive             # toggle keep-alive on or off
```

> **Note**: `/keep-alive` was previously an experimental feature. As of v1.0.36, it is available without enabling experimental mode.

The `/allow-all` command (also accessible as `/yolo`) enables autopilot mode, where the agent runs all tools without asking for confirmation. It now supports `on`, `off`, and `show` subcommands:

```
/allow-all on     # enable allow-all mode
/allow-all off    # disable allow-all mode
/allow-all show   # check current allow-all status
```

> **Note**: `/allow-all on` permissions persist after `/clear` starts a new session, so you don't need to re-enable it each time.

> **ACP clients (v1.0.39+)**: ACP clients can also toggle allow-all mode programmatically via session configuration, without issuing a slash command. This is useful for automated pipelines that drive Copilot CLI through the ACP protocol.

The `/autopilot` command (v1.0.45+) is a quick in-session toggle that switches between **interactive mode** (where the agent pauses to ask for confirmation before tool use) and **autopilot mode** (where it runs autonomously). Unlike `/allow-all` which specifically controls whether tool permissions are required, `/autopilot` toggles the overall agent mode:

```
/autopilot        # toggle between interactive and autopilot modes
```

Use `/autopilot` when you want to flip between supervised and unsupervised operation mid-session without typing out the full `/allow-all on` or `/allow-all off` commands.

The `--effort` flag (shorthand for `--reasoning-effort`) controls how much computational reasoning the model applies to a request:

```bash
gh copilot --effort high "Refactor the authentication module"
```

Accepted values are `low`, `medium`, and `high`. You can also set a default via the `effortLevel` config setting.

### CLI Startup Flags

The `-C <directory>` flag changes the working directory before starting, similar to `git -C` (v1.0.42+). This is useful for scripts or aliases that need to start Copilot CLI in a specific project directory without a separate `cd`:

```bash
copilot -C ~/projects/my-repo          # start in a different directory
copilot -C ~/projects/my-repo -p "..."  # combine with prompt mode
```

The `--mode` flag (along with its aliases `--autopilot` and `--plan`) lets you launch the CLI directly in a specific agent mode without waiting for the interactive session to start:

```bash
copilot --mode agent    # start in agent mode (autonomous tool use)
copilot --autopilot     # alias for --mode autopilot (allow-all)
copilot --plan          # start in plan mode (propose without executing)
```

This is useful in scripts or CI pipelines where you want the CLI to immediately begin working in a specific mode without an interactive prompt.

The `--max-autopilot-continues` flag controls how many times Copilot can automatically continue in autopilot mode before pausing for confirmation. The default is 5:

```bash
copilot --autopilot --max-autopilot-continues 10 "Refactor the authentication module"
```

Set it higher for long-running tasks, or lower for tasks where you want more frequent checkpoints. Setting it to `0` disables automatic continuation entirely.

The `--attachment` flag (available in prompt mode, `-p`) lets you attach files — images or native documents — to the initial prompt in non-interactive mode:

```bash
copilot -p "Summarize the architecture shown in these diagrams" \
  --attachment arch-overview.png \
  --attachment data-flow.pdf
```

This is useful in automated pipelines where you want to pass visual or document context (screenshots, design specs, PDF reports) to the model without interactive file selection. Multiple `--attachment` flags can be specified to include several files at once.

The `COPILOT_HOME` environment variable sets the Copilot CLI configuration directory. It is the preferred replacement for the `--config-dir` flag, which is deprecated:

```bash
# Preferred — set via environment variable
export COPILOT_HOME=~/.my-copilot-config
copilot

# Deprecated — use COPILOT_HOME instead
copilot --config-dir ~/.my-copilot-config
```

Set `COPILOT_HOME` in your shell profile to use a custom config directory across all sessions. This is especially useful when running multiple Copilot configurations for different projects or teams.

### Shell Completion

The `copilot completion` subcommand generates a static shell completion script for subcommands, flags, and known option values. Once installed, pressing Tab auto-completes Copilot CLI commands in your terminal.

```bash
# Bash — add to ~/.bashrc
eval "$(copilot completion bash)"

# Zsh — add to ~/.zshrc
eval "$(copilot completion zsh)"

# Fish — add to ~/.config/fish/config.fish
copilot completion fish | source
```

Or write the script to a file and source it from your shell profile:

```bash
copilot completion bash > ~/.copilot-completion.bash
echo 'source ~/.copilot-completion.bash' >> ~/.bashrc
```

> **Tip**: Reload your shell (`source ~/.bashrc` or open a new terminal) after adding the completion script for changes to take effect.

## Common Questions

**Q: How do I disable Copilot for specific files?**

A: Use the `excludedFiles` setting in your IDE configuration or create a workspace setting that disables Copilot for specific patterns:

```json
{
  "github.copilot.advanced": {
    "excludedFiles": [
      "**/secrets/**",
      "**/*.env",
      "**/test/fixtures/**"
    ]
  }
}
```

**Q: Can I have different settings per project?**

A: Yes! Use workspace settings (`.vscode/settings.json`) for project-specific preferences that don't need to be shared, or use repository settings (for example, files in `.github/agents/`, `.github/skills/`, `.github/instructions/`, and `.github/copilot-instructions.md`) for team-wide customizations that should be version-controlled.

**Q: How do team settings override personal settings?**

A: Repository-level Copilot configuration (such as `.github/agents/`, `.github/skills/`, `.github/instructions/`, and `.github/copilot-instructions.md`) has the highest precedence, followed by workspace settings, then user settings. This means team-defined instructions and agents will apply even if your personal settings differ, ensuring consistency across the team.

**Q: Where should I put customizations that apply to all my projects?**

A: Use user-level settings in your IDE for personal preferences that should apply everywhere. For customizations specific to a technology or framework (like React conventions), consider creating a collection in the awesome-copilot-hub repository that you can reference across multiple projects.

## Next Steps

Now that you understand Copilot configuration, explore how to create powerful customizations:

- **[What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/)** - Understand the customization types you can configure
- **[Understanding Copilot Context](../understanding-copilot-context/)** - Learn how configuration affects context usage
- **[Defining Custom Instructions](../defining-custom-instructions/)** - Create persistent context for your projects
- **[Creating Effective Skills](../creating-effective-skills/)** - Build reusable task folders with bundled assets
- **[Building Custom Agents](../building-custom-agents/)** - Develop specialized assistants
