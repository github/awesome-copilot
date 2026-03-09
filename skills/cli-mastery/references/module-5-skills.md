# Module 5: Skills System

## What are skills?

- Specialized capability packages the AI can invoke
- Think of them as "expert modes" with domain-specific knowledge
- Managed via `/skills` command

## Skill locations

| Level | Location |
|-------|----------|
| User | `~/.copilot/skills/<name>/SKILL.md` |
| Repo | `.github/skills/<name>/SKILL.md` |
| Org | Shared via org-level config |

## Creating a custom skill

1. Create the directory: `mkdir -p ~/.copilot/skills/my-skill/`
2. Create `SKILL.md` with YAML frontmatter (`name`, `description`, optional `tools`)
3. Write detailed instructions for the AI's behavior
4. Verify with `/skills`

## Skill design best practices

- **Clear description** — helps the AI match tasks to your skill automatically
- **Focused scope** — each skill should do ONE thing well
- **Include instructions** — specify exactly how the skill should operate
- **Test thoroughly** — use `/skills` to verify, then invoke and check results

## Auto-matching

When you describe a task, the AI checks if any skill matches and suggests using it.
