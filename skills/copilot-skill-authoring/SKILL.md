---
name: copilot-skill-authoring
description: >
  Reference guide for authoring GitHub Copilot contributions in .agent.md and SKILL.md
  formats. Covers the frontmatter contract, format selection criteria, trigger-description
  patterns, dos and don'ts, and a mapping table from Claude/Codex concepts to Copilot
  equivalents. Use when creating new Copilot skills or agents, reviewing contributions
  for correctness, or migrating definitions from other AI platforms.
---

# Copilot Skill Authoring Guide

## The Two Formats

GitHub Copilot contributions come in two formats. Choosing the wrong one is the most
common mistake in contributions.

### `.agent.md` - Persona with Tools

Use when the contribution defines **behavior**: a persona that takes actions, uses tools,
follows a workflow, or produces structured output.

```yaml
---
name: kebab-case-agent-name
description: >
  Imperative description of what this agent does and when to invoke it.
  Starts with a verb or "Use when...". Under 300 characters.
---
```

**Examples of agent contributions:**
- A code reviewer that checks PRs against style rules
- A migration assistant that rewrites imports
- A test generator that creates fixtures from types
- A deployment helper that runs CLI commands

**Body structure:**
1. Role statement (who is this agent, what expertise does it have)
2. Workflow steps (numbered, imperative)
3. Tool usage guidance (what tools to use and when)
4. Output format (what the agent produces)
5. Constraints and guardrails

### `SKILL.md` - Reusable Knowledge

Use when the contribution provides **reference material**: facts, conventions, mappings,
or guidelines that inform decisions but don't define a persona or workflow.

```yaml
---
name: kebab-case-skill-name
description: >
  Multi-line description explaining the knowledge domain and when this
  skill should be activated. Can be longer than agent descriptions since
  skills need more context for accurate triggering.
---
```

**Examples of skill contributions:**
- API reference for a specific framework
- Style guide rules for a codebase
- Mapping tables between technologies
- Decision trees for architecture choices

**Body structure:**
1. Context (what domain this covers)
2. Reference content (tables, rules, examples)
3. Decision guidance (when to apply which rule)
4. Common mistakes to avoid

## Frontmatter Contract

### Required Fields

| Field         | Type   | Constraints                                         |
|---------------|--------|-----------------------------------------------------|
| `name`        | string | kebab-case, no spaces, lowercase, 3-50 chars        |
| `description` | string | Actionable trigger text, starts with verb or "Use when..." |

### Formatting Rules

- Use `---` fences (three dashes) for YAML frontmatter boundaries
- Multi-line descriptions use YAML block scalar (`>` for folded, `|` for literal)
- No trailing spaces in frontmatter values
- No quotes around simple string values unless they contain special YAML characters

### What NOT to Include in Frontmatter

- `model` - Copilot selects the model; do not constrain it
- `tools` - tool access is implicit; describe usage in the body
- `triggers` - the `description` field IS the trigger; no separate field
- `args` / `parameters` - describe expected input in prose
- `version` - use git history for versioning
- `author` - use git blame / CONTRIBUTORS file

## Writing Trigger Descriptions

The `description` field is how Copilot decides whether to activate your contribution.
It must be precise, specific, and machine-parseable.

### Patterns That Work

```
"Use when [specific user action or context]"
"[Verb] [object] by [method] when [condition]"
"Use when the user asks to [action] or mentions [keywords]"
```

**Good examples:**
- "Use when generating database migration files or resolving schema conflicts"
- "Review pull requests for security vulnerabilities in authentication code"
- "Use when the user asks about Kubernetes networking, service mesh, or ingress configuration"

### Patterns That Fail

| Anti-pattern                    | Why it fails                                    |
|---------------------------------|-------------------------------------------------|
| "A helpful assistant"           | Too vague; matches everything                   |
| "Does stuff with code"          | No activation signal                            |
| "NOT for Python"                | Negations don't help triggering, only exclusion |
| "General purpose tool"          | Competes with every other contribution          |
| Description > 500 chars         | Loses signal in noise                           |

### Negative Triggers

If your contribution should NOT activate in certain contexts, add a "Do NOT use" line
in the body (not the frontmatter description):

```markdown
Do NOT use when:
- The user is working with Python (use python-linter instead)
- The task is purely about UI styling with no logic
```

## Dos and Don'ts

### Do

- Write instructions in imperative mood ("Check the file", "Run the command")
- Be specific about file types, languages, and tools
- Include concrete examples of input/output in the body
- Test that your description uniquely identifies your contribution's purpose
- Keep the body under 2000 lines; link to external docs for exhaustive references
- Use markdown tables for structured mappings
- Provide a "Quick Start" section for complex agents

### Don't

- Include platform-specific tool schemas (JSON function definitions, MCP tool lists)
- Reference internal tool names (`Read`, `Edit`, `Bash`) - describe actions naturally
- Use XML tags in the body (`<example>`, `<thinking>`, `<artifact>`)
- Assume a specific model or context window size
- Include secrets, API keys, or environment-specific paths
- Write in first person ("I will...") - use imperative ("Check...", "Generate...")
- Duplicate content that belongs in a separate skill (link to it instead)

## Concept Mapping: Claude/Codex to Copilot

Use this table when migrating existing definitions to Copilot format.

| Source Platform | Source Concept                     | Copilot Equivalent                                  |
|-----------------|------------------------------------|-----------------------------------------------------|
| Claude          | `SKILL.md` with behavior           | `.agent.md`                                         |
| Claude          | `SKILL.md` with knowledge          | `SKILL.md` (same name, different conventions)       |
| Claude          | `subagent_type` field              | Separate `.agent.md` file per agent type            |
| Claude          | `isolation: "worktree"`            | Body instruction: "Create a temporary branch"       |
| Claude          | `model: "opus"` / `"sonnet"`       | Remove entirely; Copilot chooses model              |
| Claude          | `tools: [Bash, Read, Edit]`        | Implicit; describe actions in prose                 |
| Claude          | MCP server tool (`mcp__x__y`)      | Body note: "Requires MCP server X"                  |
| Claude          | `<example>` XML blocks             | Markdown code blocks with language tags             |
| Claude          | Skill `args` parameter             | Body section: "Expected input"                      |
| Claude          | `/skill-name` invocation           | Automatic activation via description matching       |
| Claude          | `run_in_background` flag           | Body instruction: "Can proceed asynchronously"      |
| Codex           | `functions:` array                 | Natural-language tool descriptions in body          |
| Codex           | `triggers:` keyword array          | Folded into `description` field                     |
| Codex           | `config.json` activation rules     | `description` field + body "Do NOT use" section     |
| Codex           | OAuth/API plugin configuration     | Not portable; note as prerequisite in body          |
| Codex           | JSON schema for parameters         | Prose description of expected input                 |
| Codex           | `shell_command` function type      | Body instruction: "Run: `command`"                  |
| Both            | Multi-agent orchestration          | Multiple `.agent.md` files + linking in descriptions|
| Both            | Conditional tool selection          | Decision tree in body prose                         |

## File Organization

```
awesome-copilot/
  agents/
    my-agent-name.agent.md        # One file per agent
  skills/
    my-skill-name/
      SKILL.md                    # One SKILL.md per skill directory
```

- Agent files live flat in `agents/`
- Skills get their own directory under `skills/` (allows supporting files)
- Names must match: directory name = `name` field in frontmatter
- Use kebab-case everywhere

## Validation Checklist

Before submitting a contribution:

1. [ ] Frontmatter parses as valid YAML (test with `yq` or similar)
2. [ ] `name` is kebab-case and matches the filename/directory
3. [ ] `description` would let a machine decide when to activate (not just a human)
4. [ ] Body is self-contained - no "see original docs" dangling references
5. [ ] No platform-specific artifacts (XML tags, JSON schemas, tool arrays)
6. [ ] Instructions use imperative mood throughout
7. [ ] Examples use markdown code blocks, not custom markup
8. [ ] File is under 2000 lines
9. [ ] No secrets, absolute paths, or environment-specific values
10. [ ] Contribution does not duplicate an existing one in the repo
