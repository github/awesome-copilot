---
title: '05 · Skills'
description: 'Learn how skills auto-load task instructions, build a beginner-friendly skill, and practice using skills as repeatable workflow playbooks.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: '13 minutes'
tags:
  - copilot-cli
  - beginners
  - course
  - skills
prerequisites:
  - Complete 04 · Agents and Custom Instructions.
relatedArticles:
  - ./index.md
  - ./04-agents-and-custom-instructions.md
  - ./06-mcp-servers.md
---

> **Turn a good prompt into a reusable playbook, let Copilot apply it automatically, and make common tasks more consistent without typing the same checklist every time.**

Skills sit between general prompting and full custom agents. They do not change *who* Copilot is. They change *how a specific task gets carried out* by loading extra instructions when your prompt matches the skill.

> **Hands-on note:** The practice tasks in this chapter assume you are using the companion repo: [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). If you are following along inside this repository, use the top-level `skills/` folder to study real examples and patterns.

## Learning objectives

By the end of this chapter, you should be able to:

- explain what a skill is and why it is different from an agent or instruction file
- recognize prompts that should trigger a skill automatically
- create a simple `SKILL.md` file with a useful `name` and `description`
- manage installed skills with `/skills` commands
- practice turning a repeated checklist into a reusable task playbook

## Real-world analogy: power tools

A drill is already useful, but the right attachment makes it much more effective for a specific job. Skills work the same way. They are task-specific attachments for Copilot.

<img src="/images/learning-hub/copilot-cli-for-beginners/05/power-tools-analogy.png" alt="Power tools analogy showing skills as specialized attachments for Copilot" width="800" />

## *New to Skills?* Start Here!

If skills are new to you, do these three things first:

1. **See what is already available:**
   ```bash
   copilot
   > /skills list
   ```
2. **Read a real skill file:** in this repository, open `skills/noob-mode/SKILL.md`, `skills/make-skill-template/SKILL.md`, or `skills/github-copilot-starter/SKILL.md`.
3. **Remember the core idea:** a skill is a folder with a `SKILL.md` file plus optional helpers such as examples or scripts. Copilot loads it automatically when your prompt matches what the skill describes.

That last point is the big shift from agents: **you usually do not choose a skill manually. You ask naturally, and Copilot decides a skill should help.**

## How skills work

<img src="/images/learning-hub/copilot-cli-for-beginners/05/how-skills-work.png" alt="Illustration showing skills being discovered and applied to a task" width="800" />

A skill is a folder containing instructions, optional examples, and optional helper assets. Copilot reads your prompt, compares it with available skill descriptions, and loads the matching skill behind the scenes.

```bash
copilot

> Check books.py against our quality checklist
> Generate tests for the BookCollection class
> What are the code quality issues in this file?
```

In those examples, Copilot can match words like “quality checklist” or “generate tests” to a skill description and bring in the right guidance automatically.

### Auto-trigger first, direct invocation second

Automatic matching is the normal workflow, but direct skill invocation is also useful when you want to be explicit:

```text
> /code-checklist Check books.py for quality issues
> /security-audit Check the API endpoints for vulnerabilities
```

That is different from agents:

- **Skill:** `/skill-name <prompt>`
- **Agent:** `/agent` or `copilot --agent <name>`

## Skills vs. agents vs. custom instructions

<img src="/images/learning-hub/copilot-cli-for-beginners/05/skills-agents-mcp-comparison.png" alt="Comparison of agents, skills, and MCP in a Copilot workflow" width="800" />

| Tool | What it changes | Best when... |
| --- | --- | --- |
| **Custom instructions** | Background project guidance | You want rules active in every session |
| **Agent** | The specialist helping you | You want broad expertise across many tasks |
| **Skill** | The steps Copilot follows for one kind of task | You want a repeatable checklist or output format |

A useful way to remember it:

- agents change **who is helping**
- skills change **how a task is carried out**
- instructions change **what repo rules stay in memory**

## From manual prompts to automatic expertise

Before skills, you often repeat a long checklist manually:

```text
> Review this code checking for bare except clauses, missing type hints,
> mutable default arguments, missing context managers, and weak error handling
```

That works, but it is slow and easy to forget.

With a matching skill installed, you can ask naturally instead:

```text
> Check the book collection code for quality issues
```

<img src="/images/learning-hub/copilot-cli-for-beginners/05/skill-auto-discovery-flow.png" alt="Four-step flow showing Copilot matching a prompt to the right skill" width="800" />

What happens behind the scenes:

1. Copilot reads the wording in your prompt
2. It compares that wording against available skill descriptions
3. It loads the most relevant skill instructions
4. It applies the checklist without you restating it manually

<details>
<summary>🎬 See it in action!</summary>

![Skill Trigger Demo](/images/learning-hub/copilot-cli-for-beginners/05/skill-trigger-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what is shown here.*
</details>

This is why skills matter: they turn your team's “remember to also check...” knowledge into something reusable.

## Creating custom skills

<img src="/images/learning-hub/copilot-cli-for-beginners/05/creating-managing-skills.png" alt="Illustration of building and arranging reusable skills" width="800" />

In a normal project, skills usually live in one of these locations:

| Location | Scope |
| --- | --- |
| `.github/skills/` | Repo-specific skills shared with the team |
| `~/.copilot/skills/` | Personal skills available across projects |

> **Repo note:** This repository keeps examples in the top-level `skills/` directory because it catalogs shareable resources. In your own repo, prefer `.github/skills/`.

Each skill gets its own folder:

```text
.github/skills/
└── code-checklist/
    ├── SKILL.md
    ├── examples/
    └── scripts/
```

### Your first `SKILL.md`

```markdown
---
name: security-audit
description: Use for security reviews, OWASP checks, and vulnerability scanning
---

# Security Audit

Check for:
- injection vulnerabilities
- missing authentication or authorization checks
- plaintext secrets or sensitive logging
- unsafe shell commands or path traversal issues

Output findings with severity, file location, and a suggested fix.
```

A good beginner habit is to spend extra time on the `description`. It is how Copilot decides when the skill should be used.

### Description-writing rule of thumb

If you might naturally say any of these phrases, they belong in the description:

- “security review”
- “generate tests”
- “code quality checklist”
- “summarize a pull request”

The more your description sounds like real prompts, the easier it is for Copilot to match it.

## Managing and sharing skills

<img src="/images/learning-hub/copilot-cli-for-beginners/05/managing-sharing-skills.png" alt="Discover, use, create, and share workflow for Copilot CLI skills" width="800" />

The `/skills` command helps you inspect or refresh what is installed:

| Command | What it does |
| --- | --- |
| `/skills list` | Shows all installed skills |
| `/skills info <name>` | Displays details for one skill |
| `/skills reload` | Reloads skills after you edit `SKILL.md` |
| `/skills add <name>` | Adds or enables a skill |
| `/skills remove <name>` | Removes or disables a skill |

A typical management loop looks like this:

```bash
copilot

> /skills list
> /skills info security-audit
> /skills reload
```

<details>
<summary>🎬 See it in action!</summary>

![List Skills Demo](/images/learning-hub/copilot-cli-for-beginners/05/list-skills-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what is shown here.*
</details>

### Finding community skills

Two easy places to learn from:

1. browse real examples in this repository's `skills/` folder
2. use plugin discovery commands such as:

```text
> /plugin marketplace
> /plugin install <plugin-name>
```

Always read a skill's `SKILL.md` before you install or copy it. Skills influence how Copilot behaves, so you should understand the instructions you are giving it.

## Practice

## ▶️ Try it yourself

### Inspect two real skills

Open two different skills in this repository and compare them:

- `skills/noob-mode/SKILL.md`
- `skills/make-skill-template/SKILL.md`
- one more skill that matches your interests

Ask yourself:

- what phrases in the description would trigger this skill?
- what output shape is the skill trying to enforce?
- does it include bundled assets or references to helper files?

### Build a tiny skill

Create a scratch skill for a task you repeat often, such as commit messages, PR summaries, or test generation:

```bash
mkdir -p .github/skills/commit-check
```

Then create `SKILL.md` with a simple `name`, a realistic `description`, and 4-6 bullet points for how Copilot should handle the task.

### Reload and test it

In Copilot CLI:

```text
> /skills reload
> Draft a commit message for these staged changes
> What skills did you use for that response?
```

If your wording does not trigger the skill, revise the description so it sounds more like a real prompt.

## 📝 Assignment

### Main challenge: turn a repeated checklist into a reusable skill

Use the companion repo or one of your own projects and create one practical skill that saves you from repeating a long prompt.

1. Choose a repeated task such as security review, test generation, PR review, or commit-message drafting
2. Create a skill folder under `.github/skills/`
3. Write `SKILL.md` with a clear `name` and a description that sounds like real prompts you would type
4. Add the instructions Copilot should follow every time the skill is used
5. Run `/skills reload`
6. Trigger the task naturally in Copilot CLI
7. Ask which skills Copilot used, then refine the description if the wrong skill triggered or none triggered

**Success criteria:** you should finish with one working skill that matches a realistic prompt, loads reliably, and produces a more consistent answer than your manual prompt alone.

<details>
<summary>💡 Hints</summary>

- If a skill never triggers, the description is often too vague.
- If a skill triggers too often, narrow the description to a more specific task.
- Keep the instructions concrete: output format, checklist items, and constraints are all helpful.
</details>

### Bonus challenge: skill or agent?

Take these tasks and decide which tool fits best:

- “Review this repo for accessibility issues”
- “Always remember our team's release checklist”
- “Generate pytest tests with fixtures and edge cases”
- “Summarize this PR using our standard template”

Which should be an agent, which should be a skill, and which belongs in repo instructions instead?

## Key takeaways

1. **Skills** are reusable task playbooks that Copilot usually loads automatically.
2. A skill's **description** is the trigger surface, so write it like a real prompt.
3. **`SKILL.md`** is the contract; examples and scripts are optional helpers around it.
4. Skills work best for repeated, stable tasks where you want the same checklist or output shape every time.
