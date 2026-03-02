---
title: 'Building Custom Agents'
description: 'Learn how to create specialized GitHub Copilot agents with custom personas, tool integrations, and domain expertise.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-26'
estimatedReadingTime: '10 minutes'
tags:
  - agents
  - customization
  - fundamentals
relatedArticles:
  - ./what-are-agents-skills-instructions.md
  - ./creating-effective-skills.md
  - ./understanding-mcp-servers.md
prerequisites:
  - Basic understanding of GitHub Copilot chat
  - Familiarity with agents, skills, and instructions
---

Custom agents are specialized assistants that give GitHub Copilot a focused persona, specific tool access, and domain expertise. Unlike instructions (which apply passively) or skills (which handle individual tasks), agents define a complete working style—they shape how Copilot thinks, what tools it reaches for, and how it communicates throughout an entire session.

This article shows you how to design, structure, and deploy effective agents for your team's workflows.

## What Are Custom Agents?

Custom agents are Markdown files (`*.agent.md`) that configure GitHub Copilot with:

- **A persona**: The expertise, tone, and working style the agent adopts
- **Tool access**: Which built-in tools and MCP servers the agent can use
- **Guardrails**: Boundaries and conventions the agent follows
- **A model preference**: Which AI model powers the agent (optional but recommended)

When a user selects a custom agent in VS Code or assigns it to an issue via the Copilot coding agent, the agent's configuration shapes the entire interaction.

**Key Points**:
- Agents persist across a conversation—they maintain their persona and context
- Agents can invoke tools, run commands, search codebases, and interact with MCP servers
- Multiple agents can coexist in a repository, each serving different workflows
- Agents are stored in `.github/agents/` and are shared with the entire team

### How Agents Differ from Other Customizations

**Agents vs Instructions**:
- Agents are explicitly selected; instructions apply automatically to matching files
- Agents define a complete persona; instructions provide passive background context
- Use agents for interactive workflows; use instructions for coding standards

**Agents vs Skills**:
- Agents are persistent personas; skills are single-task capabilities
- Agents can invoke skills during a conversation
- Use agents for complex multi-step workflows; use skills for focused, repeatable tasks

## Anatomy of an Agent

Every agent file has two parts: YAML frontmatter and Markdown instructions.

### Frontmatter Fields

```yaml
---
name: 'Security Reviewer'
description: 'Expert security auditor that reviews code for OWASP vulnerabilities, authentication flaws, and supply chain risks'
model: Claude Sonnet 4
tools: ['codebase', 'terminal', 'github']
---
```

**name** (recommended): A human-readable display name for the agent.

**description** (required): A clear summary of what the agent does. This is shown in the agent picker and helps users find the right agent.

**model** (recommended): The AI model that powers the agent. Choose based on the complexity of the task—use more capable models for nuanced reasoning.

**tools** (recommended): An array of built-in tools and MCP servers the agent can access. Common tools include:

| Tool | Purpose |
|------|---------|
| `codebase` | Search and analyze code across the repository |
| `terminal` | Run shell commands |
| `github` | Interact with GitHub APIs (issues, PRs, etc.) |
| `fetch` | Make HTTP requests to external APIs |
| `edit` | Modify files in the workspace |

For MCP server tools, reference them by server name (e.g., `postgres`, `docker`). See [Understanding MCP Servers](../understanding-mcp-servers/) for details.

### Agent Instructions

After the frontmatter, write Markdown instructions that define the agent's behavior. Structure these clearly:

````markdown
---
name: 'API Design Reviewer'
description: 'Reviews API designs for consistency, RESTful patterns, and team conventions'
model: Claude Sonnet 4
tools: ['codebase', 'github']
---

# API Design Reviewer

You are an expert API designer who reviews endpoints, schemas, and contracts for consistency and best practices.

## Your Expertise

- RESTful API design patterns
- OpenAPI/Swagger specification
- Versioning strategies
- Error response standards
- Pagination and filtering patterns

## Review Checklist

When reviewing API changes:

1. **Naming**: Verify endpoints use plural nouns, consistent casing
2. **HTTP Methods**: Confirm correct verb usage (GET for reads, POST for creates)
3. **Status Codes**: Check appropriate codes (201 for creation, 404 for not found)
4. **Error Responses**: Ensure structured error objects with codes and messages
5. **Pagination**: Verify cursor-based pagination for list endpoints
6. **Versioning**: Confirm API version is specified in the path or header

## Output Format

Present findings as:
- 🔴 **Breaking**: Changes that break existing clients
- 🟡 **Warning**: Patterns that should be improved
- 🟢 **Good**: Patterns that follow our conventions
````

## Design Patterns

### The Domain Expert

Create agents with deep knowledge of a specific technology:

```markdown
---
name: 'Terraform Expert'
description: 'Infrastructure-as-code specialist for Terraform on Azure with security-first defaults'
model: Claude Sonnet 4
tools: ['codebase', 'terminal']
---

You are an expert in Terraform and Azure infrastructure.

## Principles

- Security-first: always enable encryption, disable public access by default
- Use variables for all configurable values—never hardcode
- Apply consistent tagging strategy across all resources
- Follow Azure naming conventions: {env}-{project}-{resource-type}
- Include diagnostic settings for all resources that support them
```

### The Workflow Automator

Create agents that execute multi-step processes:

```markdown
---
name: 'Release Manager'
description: 'Automates release preparation including changelog generation, version bumping, and tag creation'
model: Claude Sonnet 4
tools: ['codebase', 'terminal', 'github']
---

You are a release manager who automates the release process.

## Workflow

1. Analyze commits since last release using conventional commit format
2. Determine version bump (major/minor/patch) based on commit types
3. Generate changelog from commit messages
4. Update version in package.json / pyproject.toml
5. Create a release summary for the PR description

## Rules

- Never skip the changelog step
- Always verify the test suite passes before proceeding
- Ask for confirmation before creating tags or releases
```

### The Quality Gate

Create agents that enforce standards:

```markdown
---
name: 'Accessibility Auditor'
description: 'Reviews UI components for WCAG 2.1 AA compliance and accessibility best practices'
model: Claude Sonnet 4
tools: ['codebase']
---

You are an accessibility expert who reviews UI components for WCAG compliance.

## Audit Areas

- Semantic HTML structure
- ARIA attributes and roles
- Keyboard navigation support
- Color contrast ratios (minimum 4.5:1 for text)
- Screen reader compatibility
- Focus management in dynamic content

## When Reviewing

- Check every interactive element has an accessible name
- Verify form inputs have associated labels
- Ensure images have meaningful alt text (or empty alt for decorative)
- Test that all functionality is keyboard-accessible
```

## Connecting Agents to MCP Servers

Agents become significantly more powerful when connected to external tools via MCP servers. Reference MCP tools in the `tools` array:

```yaml
---
name: 'Database Administrator'
description: 'Expert DBA for PostgreSQL performance tuning, query optimization, and schema design'
tools: ['codebase', 'terminal', 'postgres-mcp']
---
```

The agent can then query your database, analyze query plans, and suggest optimizations—all within the conversation. For setup details, see [Understanding MCP Servers](../understanding-mcp-servers/).

## Best Practices

### Writing Effective Agent Personas

- **Be specific about expertise**: "Expert in React 18+ with TypeScript" beats "Frontend developer"
- **Define the working style**: Should the agent ask clarifying questions or make assumptions? Should it be concise or thorough?
- **Include guardrails**: What should the agent never do? ("Never modify production configuration files directly")
- **Provide examples**: Show the output format you expect (review comments, code patterns, etc.)

### Choosing the Right Model

| Scenario | Recommended Model |
|----------|-------------------|
| Complex reasoning, security review | Claude Sonnet 4 or higher |
| Code generation, refactoring | GPT-4.1 |
| Quick analysis, simple tasks | Claude Haiku or GPT-4.1-mini |
| Large codebase understanding | Models with larger context windows |

### Organizing Agents in Your Repository

```
.github/
└── agents/
    ├── security-reviewer.agent.md
    ├── api-designer.agent.md
    ├── terraform-expert.agent.md
    └── release-manager.agent.md
```

Keep agents focused—one persona per file. If you find an agent trying to do too many things, split it into multiple agents or extract common tasks into skills that agents can invoke.

## Common Questions

**Q: How do I select a custom agent?**

A: In VS Code, open Copilot Chat and use the agent picker dropdown at the top of the chat panel. Your custom agents appear alongside built-in options. You can also `@mention` an agent by name.

**Q: Can agents use skills?**

A: Yes. Agents can discover and invoke skills during a conversation based on the user's intent. Skills extend what an agent can do without bloating the agent's own instructions.

**Q: How many agents should a repository have?**

A: Start with 2–3 agents for your most common workflows. Add more as patterns emerge. Typical teams have 3–8 agents covering areas like code review, infrastructure, testing, and documentation.

**Q: Can I use an agent with the Copilot coding agent?**

A: Yes. When you assign an issue to Copilot, you can specify which agent should handle it. The agent's persona and tool access apply to the autonomous coding session. See [Using the Copilot Coding Agent](../using-copilot-coding-agent/) for details.

**Q: Should agents include code examples?**

A: Yes, when defining output format or coding patterns. Show what you expect the agent to produce—review formats, code structure, commit message style, etc.

## Common Pitfalls

- ❌ **Too broad**: "You are a software engineer" — no focus or guardrails
  ✅ **Instead**: Define specific expertise, review criteria, and output format

- ❌ **No tools specified**: Agent can't search code or run commands
  ✅ **Instead**: Declare the tools the agent needs in frontmatter

- ❌ **Conflicting with instructions**: Agent says "use tabs" but instructions say "use spaces"
  ✅ **Instead**: Agents should complement instructions, not contradict them

- ❌ **Monolithic agent**: One agent that handles security, testing, docs, and deployment
  ✅ **Instead**: Create focused agents and let them invoke shared skills

## Next Steps

- **Explore Repository Examples**: Browse the [Agents Directory](../../agents/) for production agent definitions
- **Connect External Tools**: [Understanding MCP Servers](../understanding-mcp-servers/) — Give agents access to databases, APIs, and more
- **Automate with Coding Agent**: [Using the Copilot Coding Agent](../using-copilot-coding-agent/) — Run agents autonomously on issues
- **Add Reusable Tasks**: [Creating Effective Skills](../creating-effective-skills/) — Build tasks agents can discover and invoke

---
