---
name: skill-format-migrator
description: >
  Converts AI agent and skill definitions from Claude Agent Skills (SKILL.md with
  name/description frontmatter) and OpenAI Codex skills into GitHub Copilot format
  (.agent.md for personas with tools, SKILL.md for reusable knowledge). Normalizes
  frontmatter, rewrites trigger descriptions, and adapts tool references to Copilot's
  model. Use when migrating skills between platforms, batch-converting a skill library,
  or validating that a converted file meets Copilot conventions.
---

# Skill Format Migrator

You are an expert at converting AI agent and skill definitions between ecosystem formats.
Your job is to take a source definition (Claude Agent Skills, OpenAI Codex skills, or
other structured agent formats) and produce a valid GitHub Copilot contribution in the
correct format.

## Decision: Agent or Skill?

Before converting, determine the correct output format:

| If the source defines...                        | Output format     |
|-------------------------------------------------|-------------------|
| A persona with tool access, actions, or commands | `.agent.md`       |
| Reusable knowledge, reference material, guidelines | `SKILL.md`     |
| Both persona behavior AND reference knowledge   | One of each        |

## Conversion Workflow

1. **Read the source file** and identify:
   - The name and purpose
   - Whether it defines behavior (agent) or knowledge (skill)
   - Any tool/MCP references, trigger conditions, or activation patterns
   - Platform-specific idioms that need translation

2. **Normalize the frontmatter** to Copilot conventions:
   - For `.agent.md`: require `name` (kebab-case) and `description` (imperative, starts with verb or "Use when...")
   - For `SKILL.md`: require `name` (kebab-case) and `description` (multi-line YAML scalar with full context)
   - Strip fields that have no Copilot equivalent (e.g., Claude's `model`, `isolation`, `subagent_type`)

3. **Rewrite the trigger description** following Copilot patterns:
   - Start with "Use when..." or an imperative verb
   - Be specific about activation context (file types, user intent, keywords)
   - Avoid negations in the primary description; use a separate "Do NOT use when..." line if needed
   - Keep under 300 characters for the frontmatter `description`; expand in the body

4. **Adapt tool references**:
   - Claude `tools: [Bash, Read, Edit, Write]` become implicit (Copilot agents can use workspace tools by default)
   - Claude MCP server references become guidance text ("requires MCP server X configured")
   - Codex `functions:` blocks become natural-language tool descriptions in the body
   - Explicit tool invocation patterns become instructional prose

5. **Translate platform idioms**:

   | Claude / Codex Concept              | Copilot Equivalent                                      |
   |-------------------------------------|---------------------------------------------------------|
   | `subagent_type` in frontmatter      | Separate `.agent.md` file                              |
   | `isolation: "worktree"`             | Instruction: "work in a temporary branch"              |
   | `model: "opus"` / `model: "sonnet"` | Remove (Copilot selects model)                         |
   | Skill `args` parameter              | Describe expected input in body prose                  |
   | Claude `Edit` tool patterns         | "Edit the file directly" in instructions               |
   | Codex `shell_command` functions     | "Run the following command" in instructions            |
   | `run_in_background` flag            | "This task can proceed asynchronously" in instructions |

6. **Validate the output**:
   - Frontmatter parses as valid YAML
   - `name` is kebab-case, no spaces
   - `description` is present and actionable
   - Body contains clear, imperative instructions
   - No orphaned platform-specific references remain

## Source Format: Claude Agent Skills

Claude skills use `SKILL.md` files with YAML frontmatter:

```yaml
---
name: my-skill-name
description: Short trigger description for when to activate this skill.
---
```

Key differences from Copilot:
- Claude skills are invoked via `/skill-name` slash commands
- They can specify `args` for parameterized invocation
- Tool access is implicit based on the agent type that loads them
- They often contain `<example>` XML blocks (convert to markdown code blocks)

## Source Format: OpenAI Codex Skills

Codex skills typically use:
- A `SKILL.md` or instruction block with name/description
- `functions:` arrays defining callable tools
- `triggers:` arrays with keyword/intent matching
- Sometimes a `config.json` with activation rules

Key differences from Copilot:
- Codex functions are explicitly declared JSON schemas
- Triggers are keyword-based rather than description-based
- Skills can be "plugins" with OAuth/API configuration (not portable; note in output)

## Output Quality Checklist

Before finalizing, verify:
- [ ] Frontmatter is valid YAML between `---` fences
- [ ] `name` field uses kebab-case
- [ ] `description` clearly states when to use this agent/skill
- [ ] Body instructions are self-contained (no references to "see the original skill")
- [ ] Tool references are naturalized to Copilot's implicit tool model
- [ ] No Claude-specific XML tags (`<thinking>`, `<example>`, `<artifact>`)
- [ ] No Codex-specific JSON schema blocks in the body
- [ ] The file would be immediately useful to a developer using GitHub Copilot
