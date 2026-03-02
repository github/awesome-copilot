# Contributing to Awesome GitHub Copilot

Thank you for your interest in contributing to the Awesome GitHub Copilot repository! We welcome contributions from the community to help expand our collection of custom instructions and skills.

## Table of Contents

- [How to Contribute](#how-to-contribute)
  - [Adding Instructions](#adding-instructions)
  - [Adding Prompts](#adding-prompts)
  - [Adding Agents](#adding-agents)
  - [Adding Skills](#adding-skills)
  - [Adding Plugins](#adding-plugins)
  - [Adding Hooks](#adding-hooks)
  - [Adding Agentic Workflows](#adding-agentic-workflows)
- [Submitting Your Contribution](#submitting-your-contribution)
- [What We Accept](#what-we-accept)
- [What We Don't Accept](#what-we-dont-accept)
- [Quality Guidelines](#quality-guidelines)
- [Contributor Recognition](#contributor-recognition)
  - [Contribution Types](#contribution-types)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## How to Contribute

### Adding Instructions

Instructions help customize GitHub Copilot's behavior for specific technologies, coding practices, or domains.

1. **Create your instruction file**: Add a new `.md` file in the `instructions/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens (e.g., `python-django.instructions.md`)
3. **Structure your content**: Start with a clear heading and organize your instructions logically
4. **Test your instructions**: Make sure your instructions work well with GitHub Copilot

#### Example instruction format

```markdown
---
description: 'Instructions for customizing GitHub Copilot behavior for specific technologies and practices'
---

# Your Technology/Framework Name

## Instructions

- Provide clear, specific guidance for GitHub Copilot
- Include best practices and conventions
- Use bullet points for easy reading

## Additional Guidelines

- Any additional context or examples
```

### Adding an Agent

Agents are specialized configurations that transform GitHub Copilot Chat into domain-specific assistants or personas for particular development scenarios.

1. **Create your agent file**: Add a new `.agent.md` file in the `agents/` directory
2. **Follow the naming convention**: Use descriptive, lowercase filenames with hyphens and the `.agent.md` extension (e.g., `react-performance-expert.agent.md`)
3. **Include frontmatter**: Add metadata at the top of your file with required fields
4. **Define the persona**: Create a clear identity and expertise area for the agent
5. **Test your agent**: Ensure the agent provides helpful, accurate responses in its domain

#### Example agent format

```markdown
---
description: 'Brief description of the agent and its purpose'
model: 'gpt-5'
tools: ['codebase', 'terminalCommand']
name: 'My Agent Name'
---

You are an expert [domain/role] with deep knowledge in [specific areas].

## Your Expertise

- [Specific skill 1]
- [Specific skill 2]
- [Specific skill 3]

## Your Approach

- [How you help users]
- [Your communication style]
- [What you prioritize]

## Guidelines

- [Specific instructions for responses]
- [Constraints or limitations]
- [Best practices to follow]
```

### Adding Skills

Skills are self-contained folders in the `skills/` directory that include a `SKILL.md` file (with front matter) and optional bundled assets.

1. **Create a new skill folder**: Run `npm run skill:create -- --name <skill-name> --description "<skill description>"`
2. **Edit `SKILL.md`**: Ensure the `name` matches the folder name (lowercase with hyphens) and the `description` is clear and non-empty
3. **Add optional assets**: Keep bundled assets reasonably sized (under 5MB each) and reference them from `SKILL.md`
4. **Validate and update docs**: Run `npm run skill:validate` and then `npm run build` to update the generated README tables

### Adding Plugins

Plugins group related agents, commands, and skills around specific themes or workflows, making it easy for users to install comprehensive toolkits via GitHub Copilot CLI.

1. **Create your plugin**: Run `npm run plugin:create` to scaffold a new plugin
2. **Follow the naming convention**: Use descriptive, lowercase folder names with hyphens (e.g., `python-web-development`)
3. **Define your content**: List agents, commands, and skills in `plugin.json` using the Claude Code spec fields
4. **Test your plugin**: Run `npm run plugin:validate` to verify your plugin structure

#### Creating a plugin

```bash
npm run plugin:create -- --name my-plugin-id
```

#### Plugin structure

```
plugins/my-plugin-id/
├── .github/plugin/plugin.json  # Plugin metadata (Claude Code spec format)
└── README.md                   # Plugin documentation
```

> **Note:** Plugin content is defined declaratively in plugin.json using Claude Code spec fields (`agents`, `commands`, `skills`). Source files live in top-level directories and are materialized into plugins by CI.

#### plugin.json example

```json
{
  "name": "my-plugin-id",
  "description": "Plugin description",
  "version": "1.0.0",
  "keywords": [],
  "author": { "name": "Awesome Copilot Community" },
  "repository": "https://github.com/github/awesome-copilot",
  "license": "MIT",
  "agents": ["./agents/my-agent.md"],
  "commands": ["./commands/my-command.md"],
  "skills": ["./skills/my-skill/"]
}
```

#### Plugin Guidelines

- **Declarative content**: Plugin content is specified via `agents`, `commands`, and `skills` arrays in plugin.json — source files live in top-level directories and are materialized into plugins by CI
- **Valid references**: All paths referenced in plugin.json must point to existing source files in the repository
- **Instructions excluded**: Instructions are standalone resources and are not part of plugins
- **Clear purpose**: The plugin should solve a specific problem or workflow
- **Validate before submitting**: Run `npm run plugin:validate` to ensure your plugin is valid

### Adding Hooks

Hooks enable automated workflows triggered by specific events during GitHub Copilot coding agent sessions, such as session start, session end, user prompts, and tool usage.

1. **Create a new hook folder**: Add a new folder in the `hooks/` directory with a descriptive, lowercase name using hyphens (e.g., `session-logger`)
2. **Create `README.md`**: Add a `README.md` file with frontmatter including `name`, `description`, and optionally `tags`
3. **Create `hooks.json`**: Add a `hooks.json` file with hook configuration following the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
4. **Add bundled scripts**: Include any scripts or assets the hook needs, and make them executable (`chmod +x script.sh`)
5. **Update the README**: Run `npm run build` to update the generated README tables

#### Example hook structure

```
hooks/my-hook/
├── README.md       # Hook documentation with frontmatter
├── hooks.json      # Hook event configuration
└── my-script.sh    # Bundled script(s)
```

#### Example README.md frontmatter

```markdown
---
name: 'My Hook Name'
description: 'Brief description of what this hook does'
tags: ['logging', 'automation']
---

# My Hook Name

Detailed documentation about the hook...
```

#### Hook Guidelines

- **Event configuration**: Define hook events in `hooks.json` — supported events include session start, session end, user prompts, and tool usage
- **Executable scripts**: Ensure all bundled scripts are executable and referenced in both `README.md` and `hooks.json`
- **Privacy aware**: Be mindful of what data your hook collects or logs
- **Clear documentation**: Explain installation steps, configuration options, and what the hook does
- Follow the [GitHub Copilot hooks specification](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

### Adding Agentic Workflows

[Agentic Workflows](https://github.github.com/gh-aw) are AI-powered repository automations that run coding agents in GitHub Actions. Defined in markdown with natural language instructions, they enable scheduled and event-triggered automation with built-in guardrails.

1. **Create your workflow file** with a new `.md` file in the `workflows/` directory (e.g., [`daily-issues-report.md`](./workflows/daily-issues-report.md))
2. **Include frontmatter** with `name` and `description`, followed by agentic workflow frontmatter (`on`, `permissions`, `safe-outputs`) and natural language instructions
3. **Test locally** with `gh aw compile --validate --no-emit daily-issues-report.md` to verify it's valid
4. **Update the README** with `npm run build` to update the generated README tables

> **Note:** Only `.md` files are accepted — do not include compiled `.lock.yml` or `.yml` files. CI will block them.

#### Workflow file example

```markdown
---
name: "Daily Issues Report"
description: "Generates a daily summary of open issues and recent activity as a GitHub issue"
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

#### Workflow Guidelines

- **Security first**: Use least-privilege permissions and safe outputs instead of direct write access
- **Clear instructions**: Write clear natural language instructions in the workflow body
- **Descriptive names**: Use lowercase filenames with hyphens (e.g., `daily-issues-report.md`)
- **Test locally**: Use `gh aw compile --validate` to verify your workflow compiles
- **No compiled files**: Only submit the `.md` source — `.lock.yml` and `.yml` files are not accepted
- Learn more at the [Agentic Workflows documentation](https://github.github.com/gh-aw)

## Submitting Your Contribution

1. **Fork this repository**
2. **Create a new branch** for your contribution
3. **Add your instruction, skills, agents, workflow, or plugin** following the guidelines above
4. **Run the update script**: `npm start` to update the README with your new file (make sure you run `npm install` first if you haven't already)
   - A GitHub Actions workflow will verify that this step was performed correctly
   - If the README.md would be modified by running the script, the PR check will fail with a comment showing the required changes
5. **Submit a pull request** targeting the `staged` branch with:
   - A clear title describing your contribution
   - A brief description of what your instruction/skill/agent does
   - Any relevant context or usage notes

> [!IMPORTANT]
> All pull requests should target the **`staged`** branch, not `main`.

> [!NOTE] 
> We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize all types of contributions to the project. Jump to [Contributors Recognition](#contributor-recognition) to learn more!

## What We Accept

We welcome contributions covering any technology, framework, or development practice that helps developers work more effectively with GitHub Copilot. This includes:

- Programming languages and frameworks
- Development methodologies and best practices
- Architecture patterns and design principles
- Testing strategies and quality assurance
- DevOps and deployment practices
- Accessibility and inclusive design
- Performance optimization techniques

## What We Don't Accept

To maintain a safe, responsible, and constructive community, we will **not accept** contributions that:

- **Violate Responsible AI Principles**: Content that attempts to circumvent Microsoft/GitHub's Responsible AI guidelines or promotes harmful AI usage
- **Compromise Security**: Instructions designed to bypass security policies, exploit vulnerabilities, or weaken system security
- **Enable Malicious Activities**: Content intended to harm other systems, users, or organizations
- **Exploit Weaknesses**: Instructions that take advantage of vulnerabilities in other platforms or services
- **Promote Harmful Content**: Guidance that could lead to the creation of harmful, discriminatory, or inappropriate content
- **Circumvent Platform Policies**: Attempts to work around GitHub, Microsoft, or other platform terms of service

## Quality Guidelines

- **Be specific**: Generic instructions are less helpful than specific, actionable guidance
- **Test your content**: Ensure your instructions or skills work well with GitHub Copilot
- **Follow conventions**: Use consistent formatting and naming
- **Keep it focused**: Each file should address a specific technology, framework, or use case
- **Write clearly**: Use simple, direct language
- **Promote best practices**: Encourage secure, maintainable, and ethical development practices

## Contributor Recognition

We use [all-contributors](https://github.com/all-contributors/all-contributors) to recognize **all types of contributions** to this project.

To add yourself, leave a comment on a relevant issue or pull request using your GitHub username and the appropriate contribution type(s):

```markdown
@all-contributors add @username for contributionType1, contributionType2
```

The contributors list is updated automatically every Sunday at **3:00 AM UTC**. When the next run completes, your name will appear in the [README Contributors](./README.md#contributors-) section.

### Contribution Types

We welcome many kinds of contributions, including the custom categories below:

| Category | Description | Emoji |
| --- | --- | :---: |
| **Instructions** | Custom instruction sets that guide GitHub Copilot behavior | 🧭 |
| **Agents** | Defined GitHub Copilot roles or personalities | 🎭 |
| **Skills** | Specialized knowledge of a task for GitHub Copilot | 🧰 |
| **Workflows** | Agentic Workflows for AI-powered repository automation | ⚡ |
| **Plugins** | Installable packages of related prompts, agents, or skills | 🎁 |

In addition, all standard contribution types supported by [All Contributors](https://allcontributors.org/emoji-key/) are recognized.

> Every contribution matters. Thanks for helping improve this resource for the GitHub Copilot community.


## Code of Conduct

Please note that this project is maintained with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

By contributing to this repository, you agree that your contributions will be licensed under the MIT License.
