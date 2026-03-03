---
title: 'Copilot Configuration Basics'
description: 'Learn how to configure GitHub Copilot at user, workspace, and repository levels to optimize your AI-assisted development experience.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2025-11-28'
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
