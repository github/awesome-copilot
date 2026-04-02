---
title: '04 · Create Specialized AI Assistants'
description: 'Mirror the source chapter on custom agents and custom instructions for GitHub Copilot CLI.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-20
---

![Chapter 04: Agents and Custom Instructions](/images/learning-hub/copilot-cli-for-beginners/04/chapter-header.png)

> **What if you could hire a Python code reviewer, testing expert, and security reviewer... all in one tool?**

In Chapter 03, you mastered the essential workflows: code review, refactoring, debugging, test generation, and git integration. Those make you highly productive with GitHub Copilot CLI. Now, let's take it further.

So far, you've been using Copilot CLI as a general-purpose assistant. Agents let you give it a specific persona with built-in standards, like a code reviewer that enforces type hints and PEP 8, or a testing helper that writes pytest cases. You'll see how the same prompt gets noticeably better results when handled by an agent with targeted instructions.

## 🎯 Learning Objectives

By the end of this chapter, you'll be able to:

- Use built-in agents: Plan (`/plan`), Code-review (`/review`), and understand automatic agents (Explore, Task)
- Create specialized agents using agent files (`.agent.md`)
- Use agents for domain-specific tasks
- Switch between agents using `/agent` and `--agent`
- Write custom instruction files for project-specific standards

> ⏱️ **Estimated Time**: ~55 minutes (20 min reading + 35 min hands-on)

---

## 🧩 Real-World Analogy: Hiring Specialists

When you need help with your house, you don't call one "general helper." You call specialists:

| Problem | Specialist | Why |
|---------|------------|-----|
| Leaky pipe | Plumber | Knows plumbing codes, has specialized tools |
| Rewiring | Electrician | Understands safety requirements, up to code |
| New roof | Roofer | Knows materials, local weather considerations |

Agents work the same way. Instead of a generic AI, use agents that focus on specific tasks and know the right process to follow. Set up the instructions once, then reuse them whenever you need that specialty: code review, testing, security, documentation.

<img src="/images/learning-hub/copilot-cli-for-beginners/04/hiring-specialists-analogy.png" alt="Hiring Specialists Analogy - Just as you call specialized tradespeople for house repairs, AI agents are specialized for specific tasks like code review, testing, security, and documentation" width="800" />

---

# Using Agents

Get started with built-in and custom agents right away.

---

## *New to Agents?* Start Here!
Never used or made an agent? Here's all you need to know to get started for this course.

1. **Try a *built-in* agent right now:**
   ```bash
   copilot
   > /plan Add input validation for book year in the book app
   ```
   This invokes the Plan agent to create a step-by-step implementation plan.

2. **See one of our custom agent examples:** It's simple to define an agent's instructions, look at our provided [python-reviewer.agent.md](https://github.com/github/copilot-cli-for-beginners/blob/main/.github/agents/python-reviewer.agent.md) file to see the pattern.

3. **Understand the core concept:** Agents are like consulting a specialist instead of a generalist. A "frontend agent" will focus on accessibility and component patterns automatically, you don't have to remind it because it is already specified in the agent's instructions.


## Built-in Agents

**You've already used some built-in agents in Chapter 03 Development Workflow!**
<br>`/plan` and `/review` are actually built-in agents. Now you know what's happening under the hood. Here's the full list:

| Agent | How to Invoke | What It Does |
|-------|---------------|--------------|
| **Plan** | `/plan` or `Shift+Tab` (cycle modes) | Creates step-by-step implementation plans before coding |
| **Code-review** | `/review` | Reviews staged/unstaged changes with focused, actionable feedback |
| **Init** | `/init` | Generates project configuration files (instructions, agents) |
| **Explore** | *Automatic* | Used internally when you ask Copilot to explore or analyze the codebase |
| **Task** | *Automatic* | Executes commands like tests, builds, lints, and dependency installs |

<br>

**Built-in agents in action** - Examples of invoking Plan, Code-review, Explore, and Task

```bash
copilot

# Invoke the Plan agent to create an implementation plan
> /plan Add input validation for book year in the book app

# Invoke the Code-review agent on your changes
> /review

# Explore and Task agents are invoked automatically when relevant:
> Run the test suite        # Uses Task agent

> Explore how book data is loaded    # Uses Explore agent
```

What about the Task Agent? It works behind the scenes to manage and track what is going on and to report back in a clean and clear format:

| Outcome | What You See |
|---------|--------------|
| ✅ **Success** | Brief summary (e.g., "All 247 tests passed", "Build succeeded") |
| ❌ **Failure** | Full output with stack traces, compiler errors, and detailed logs |


> 📚 **Official Documentation**: [GitHub Copilot CLI Agents](https://docs.github.com/copilot/how-tos/use-copilot-agents/use-copilot-cli#use-custom-agents)

---

# Adding Agents to Copilot CLI

You can simply define your own agents to be part of your workflow! Define once, then direct!

<img src="/images/learning-hub/copilot-cli-for-beginners/04/using-agents.png" alt="Four colorful AI robots standing together, each with different tools representing specialized agent capabilities" width="800"/>

## 🗂️ Add your agents 

Agent files are markdown files with a `.agent.md` extension. They have two parts: YAML frontmatter (metadata) and markdown instructions.

> 💡 **New to YAML frontmatter?** It's a small block of settings at the top of the file, surrounded by `---` markers. YAML is just `key: value` pairs. The rest of the file is regular markdown.

Here's a minimal agent:

```markdown
---
name: my-reviewer
description: Code reviewer focused on bugs and security issues
---

# Code Reviewer

You are a code reviewer focused on finding bugs and security issues.

When reviewing code, always check for:
- SQL injection vulnerabilities
- Missing error handling
- Hardcoded secrets
```

> 💡 **Required vs Optional**: The `description` field is required. Other fields like `name`, `tools`, and `model` are optional.

## Where to put agent files

| Location | Scope | Best For |
|----------|-------|----------|
| `.github/agents/` | Project-specific | Team-shared agents with project conventions |
| `~/.copilot/agents/` | Global (all projects) | Personal agents you use everywhere |

**This project includes sample agent files in the [.github/agents/](https://github.com/github/copilot-cli-for-beginners/tree/main/.github/agents/) folder**. You can write your own, or customize the ones already provided.

<details>
<summary>📂 See the sample agents in this course</summary>

| File | Description |
|------|-------------|
| `hello-world.agent.md` | Minimal example - start here |
| `python-reviewer.agent.md` | Python code quality reviewer |
| `pytest-helper.agent.md` | Pytest testing specialist |

```bash
# Or copy one to your personal agents folder (available in every project)
cp .github/agents/python-reviewer.agent.md ~/.copilot/agents/
```

For more community agents, see [github/awesome-copilot](https://github.com/github/awesome-copilot)

</details>


## 🚀 Two ways to use custom agents

### Interactive mode
Inside interactive mode, list agents using `/agent` and select the agent to start working with. 
Select an agent to continue your conversation with.

```bash
copilot
> /agent
```

To change to a different agent, or to return to default mode, use the `/agent` command again.

### Programmatic mode

Launch straight into a new session with an agent.

```bash
copilot --agent python-reviewer
> Review @samples/book-app-project/books.py
```

> 💡 **Switching agents**: You can switch to a different agent at any time by using `/agent` or `--agent` again. To return to the standard Copilot CLI experience, use `/agent` and select **no agent**.

---

# Going Deeper with Agents

<img src="/images/learning-hub/copilot-cli-for-beginners/04/creating-custom-agents.png" alt="Robot being assembled on a workbench surrounded by components and tools representing custom agent creation" width="800"/>

> 💡 **This section is optional.** The built-in agents (`/plan`, `/review`) are powerful enough for most workflows. Create custom agents when you need specialized expertise that's consistently applied across your work.

Each topic below is self-contained. **Pick what interests you - you don't need to read them all at once.**

| I want to... | Jump to |
|---|---|
| See why agents beat generic prompts | [Specialist vs Generic](#specialist-vs-generic-see-the-difference) |
| Combine agents on a feature | [Working with Multiple Agents](#working-with-multiple-agents) |
| Organize, name, and share agents | [Organizing & Sharing Agents](#organizing--sharing-agents) |
| Set up always-on project context | [Configuring Your Project for Copilot](#configuring-your-project-for-copilot) |
| Look up YAML properties and tools | [Agent File Reference](#agent-file-reference) |

Select a scenario below to expand it.

---

<a id="specialist-vs-generic-see-the-difference"></a>
<details>
<summary><strong>Specialist vs Generic: See the Difference</strong> - Why agents produce better output than generic prompts</summary>

## Specialist vs Generic: See the Difference

This is where agents prove their value. Watch the difference:

### Without an Agent (Generic Copilot)

```bash
copilot

> Add a function to search books by year range in the book app
```

**Generic output**:
```python
def search_by_year_range(books, start_year, end_year):
    results = []
    for book in books:
        if book['year'] >= start_year and book['year'] <= end_year:
            results.append(book)
    return results
```

Basic. Works. But missing a lot.

---

### With the Python Reviewer Agent

```bash
copilot

> /agent
# Select "python-reviewer"

> Add a function to search books by year range in the book app
```

**Specialist output**:
```python
from typing import List, Dict, Any

def search_by_year_range(
    books: List[Dict[str, Any]],
    start_year: int,
    end_year: int
) -> List[Dict[str, Any]]:
    """
    Search for books within a specified year range.

    Args:
        books: List of book dictionaries
        start_year: Starting year (inclusive)
        end_year: Ending year (inclusive)

    Returns:
        List of books published within the year range

    Raises:
        ValueError: If start_year is greater than end_year
        TypeError: If year values are not integers
    """
    if not isinstance(start_year, int) or not isinstance(end_year, int):
        raise TypeError("Year values must be integers")

    if start_year > end_year:
        raise ValueError(f"Start year ({start_year}) cannot be greater than end year ({end_year})")

    return [
        book for book in books
        if isinstance(book.get('year'), int)
        and start_year <= book['year'] <= end_year
    ]
```

**What the python-reviewer agent automatically includes**:
- ✅ Type hints on all parameters and return values
- ✅ Comprehensive docstring with Args/Returns/Raises
- ✅ Input validation with proper error handling
- ✅ List comprehension for better performance
- ✅ Edge case handling (missing/invalid year values)
- ✅ PEP 8 compliant formatting
- ✅ Defensive programming practices

**The difference**: Same prompt, dramatically better output. The agent brings expertise you'd forget to ask for.

</details>

---

<a id="working-with-multiple-agents"></a>
<details>
<summary><strong>Working with Multiple Agents</strong> - Combine specialists, switch mid-session, agent-as-tools</summary>

## Working with Multiple Agents

The real power comes when specialists work together on a feature.

### Example: Building a Simple Feature

```bash
copilot

> I want to add a "search by year range" feature to the book app

# Use python-reviewer for design
> /agent
# Select "python-reviewer"

> @samples/book-app-project/books.py Design a find_by_year_range method. What's the best approach?

# Switch to pytest-helper for test design
> /agent
# Select "pytest-helper"

> @samples/book-app-project/tests/test_books.py Design test cases for a find_by_year_range method.
> What edge cases should we cover?

# Synthesize both designs
> Create an implementation plan that includes the method implementation and comprehensive tests.
```

**The key insight**: You're the architect directing specialists. They handle the details, you handle the vision.

<details>
<summary>🎬 See it in action!</summary>

![Python Reviewer Demo](/images/learning-hub/copilot-cli-for-beginners/04/python-reviewer-demo.gif)

*Demo output varies - your model, tools, and responses will differ from what's shown here.*

</details>

### Agent as Tools

When agents are configured, Copilot can also call them as tools during complex tasks. If you ask for a full-stack feature, Copilot may automatically delegate parts to the appropriate specialist agents.

</details>

---

<a id="organizing--sharing-agents"></a>
<details>
<summary><strong>Organizing & Sharing Agents</strong> - Naming, file placement, instruction files, and team sharing</summary>

## Organizing & Sharing Agents

### Naming Your Agents

When you create agent files, the name matters. It's what you'll type after `/agent` or `--agent`, and what your teammates will see in the agent list.

| ✅ Good Names | ❌ Avoid |
|--------------|----------|
| `frontend` | `my-agent` |
| `backend-api` | `agent1` |
| `security-reviewer` | `helper` |
| `react-specialist` | `code` |
| `python-backend` | `assistant` |

**Naming conventions:**
- Use lowercase with hyphens: `my-agent-name.agent.md`
- Include the domain: `frontend`, `backend`, `devops`, `security`
- Be specific when needed: `react-typescript` vs just `frontend`

---

### Sharing with Your Team

Place agent files in `.github/agents/` and they're version controlled. Push to your repo and every team member gets them automatically. But agents are just one type of file Copilot reads from your project. It also supports **instruction files** that apply automatically to every session, without anyone needing to run `/agent`.

Think of it this way: agents are specialists you call on, and instruction files are team rules that are always active.

### Where to Put Your Files

You already know the two main locations (see [Where to put agent files](#where-to-put-agent-files) above). Use this decision tree to choose:

<img src="/images/learning-hub/copilot-cli-for-beginners/04/agent-file-placement-decision-tree.png" alt="Decision tree for where to put agent files: experimenting → current folder, team use → .github/agents/, everywhere → ~/.copilot/agents/" width="800"/>

**Start simple:** Create a single `*.agent.md` file in your project folder. Move it to a permanent location once you're happy with it.

Beyond agent files, Copilot also reads **project-level instruction files** automatically, no `/agent` needed. See [Configuring Your Project for Copilot](#configuring-your-project-for-copilot) below for `AGENTS.md`, `.instructions.md`, and `/init`.

</details>

---

<a id="configuring-your-project-for-copilot"></a>
<details>
<summary><strong>Configuring Your Project for Copilot</strong> - AGENTS.md, instruction files, and /init setup</summary>

## Configuring Your Project for Copilot

Agents are specialists you invoke on demand. **Project configuration files** are different: Copilot reads them automatically in every session to understand your project's conventions, tech stack, and rules. No one needs to run `/agent`; the context is always active for everyone working in the repo.

### Quick Setup with /init

The fastest way to get started is to let Copilot generate configuration files for you:

```bash
copilot
> /init
```

Copilot will scan your project and create tailored instruction files. You can edit them afterwards.

### Instruction File Formats

| File | Scope | Notes |
|------|-------|-------|
| `AGENTS.md` | Project root or nested | **Cross-platform standard** - works with Copilot and other AI assistants |
| `.github/copilot-instructions.md` | Project | GitHub Copilot specific |
| `.github/instructions/*.instructions.md` | Project | Granular, topic-specific instructions |
| `CLAUDE.md`, `GEMINI.md` | Project root | Supported for compatibility |

> 🎯 **Just getting started?** Use `AGENTS.md` for project instructions. You can explore the other formats later as needed.

### AGENTS.md

`AGENTS.md` is the recommended format. It's an [open standard](https://agents.md/) that works across Copilot and other AI coding tools. Place it in your repository root and Copilot reads it automatically. This project's own [AGENTS.md](https://github.com/github/copilot-cli-for-beginners/blob/main/AGENTS.md) is a working example.

A typical `AGENTS.md` describes your project context, code style, security requirements, and testing standards. Use `/init` to generate one, or write your own following the pattern in our example file.

### Custom Instruction Files (.instructions.md)

For teams that want more granular control, split instructions into topic-specific files. Each file covers one concern and applies automatically:

```
.github/
└── instructions/
    ├── python-standards.instructions.md
    ├── security-checklist.instructions.md
    └── api-design.instructions.md
```

> 💡 **Note**: Instruction files work with any language. This example uses Python to match our course project, but you can create similar files for TypeScript, Go, Rust, or any technology your team uses.

**Finding community instruction files**: Browse [github/awesome-copilot](https://github.com/github/awesome-copilot) for pre-made instruction files covering .NET, Angular, Azure, Python, Docker, and many more technologies.

### Disabling Custom Instructions

If you need Copilot to ignore all project-specific configurations (useful for debugging or comparing behavior):

```bash
copilot --no-custom-instructions
```

</details>

---

<a id="agent-file-reference"></a>
<details>
<summary><strong>Agent File Reference</strong> - YAML properties, tool aliases, and complete examples</summary>

## Agent File Reference

### A More Complete Example

You've seen the [minimal agent format](#-add-your-agents) above. Here's a more comprehensive agent that uses the `tools` property. Create `~/.copilot/agents/python-reviewer.agent.md`:

```markdown
---
name: python-reviewer
description: Python code quality specialist for reviewing Python projects
tools: ["read", "edit", "search", "execute"]
---

# Python Code Reviewer

You are a Python specialist focused on code quality and best practices.

**Your focus areas:**
- Code quality (PEP 8, type hints, docstrings)
- Performance optimization (list comprehensions, generators)
- Error handling (proper exception handling)
- Maintainability (DRY principles, clear naming)

**Code style requirements:**
- Use Python 3.10+ features (dataclasses, type hints, pattern matching)
- Follow PEP 8 naming conventions
- Use context managers for file I/O
- All functions must have type hints and docstrings

**When reviewing code, always check:**
- Missing type hints on function signatures
- Mutable default arguments
- Proper error handling (no bare except)
- Input validation completeness
```

### YAML Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | No | Display name (defaults to filename) |
| `description` | **Yes** | What the agent does - helps Copilot understand when to suggest it |
| `tools` | No | List of allowed tools (omit = all tools available). See tool aliases below. |
| `target` | No | Limit to `vscode` or `github-copilot` only |

### Tool Aliases

Use these names in the `tools` list:
- `read` - Read file contents
- `edit` - Edit files
- `search` - Search files (grep/glob)
- `execute` - Run shell commands (also: `shell`, `Bash`)
- `agent` - Invoke other custom agents

> 📖 **Official docs**: [Custom agents configuration](https://docs.github.com/copilot/reference/custom-agents-configuration)
>
> ⚠️ **VS Code Only**: The `model` property (for selecting AI models) works in VS Code but is not supported in GitHub Copilot CLI. You can safely include it for cross-platform agent files. GitHub Copilot CLI will ignore it.

### More Agent Templates

> 💡 **Note for beginners**: The examples below are templates. **Replace the specific technologies with whatever your project uses.** The important thing is the *structure* of the agent, not the specific technologies mentioned.

This project includes working examples in the [.github/agents/](https://github.com/github/copilot-cli-for-beginners/tree/main/.github/agents/) folder:
- [hello-world.agent.md](https://github.com/github/copilot-cli-for-beginners/blob/main/.github/agents/hello-world.agent.md) - Minimal example, start here
- [python-reviewer.agent.md](https://github.com/github/copilot-cli-for-beginners/blob/main/.github/agents/python-reviewer.agent.md) - Python code quality reviewer
- [pytest-helper.agent.md](https://github.com/github/copilot-cli-for-beginners/blob/main/.github/agents/pytest-helper.agent.md) - Pytest testing specialist

For community agents, see [github/awesome-copilot](https://github.com/github/awesome-copilot).

</details>

---

# Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/04/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800"/>

Create your own agents and see them in action.

---

## ▶️ Try It Yourself

```bash

# Create the agents directory (if it doesn't exist)
mkdir -p .github/agents

# Create a code reviewer agent
cat > .github/agents/reviewer.agent.md << 'EOF'
---
name: reviewer
description: Senior code reviewer focused on security and best practices
---

# Code Reviewer Agent

You are a senior code reviewer focused on code quality.

**Review priorities:**
1. Security vulnerabilities
2. Performance issues
3. Maintainability concerns
4. Best practice violations

**Output format:**
Provide issues as a numbered list with severity tags:
[CRITICAL], [HIGH], [MEDIUM], [LOW]
EOF

# Create a documentation agent
cat > .github/agents/documentor.agent.md << 'EOF'
---
name: documentor
description: Technical writer for clear and complete documentation
---

# Documentation Agent

You are a technical writer who creates clear documentation.

**Documentation standards:**
- Start with a one-sentence summary
- Include usage examples
- Document parameters and return values
- Note any gotchas or limitations
EOF

# Now use them
copilot --agent reviewer
> Review @samples/book-app-project/books.py

# Or switch agents
copilot
> /agent
# Select "documentor"
> Document @samples/book-app-project/books.py
```

---

## 📝 Assignment

### Main Challenge: Build a Specialized Agent Team

The hands-on example created `reviewer` and `documentor` agents. Now practice creating and using agents for a different task - improving data validation in the book app:

1. Create 3 agent files (`.agent.md`) tailored to the book app, one per agent, placed in `.github/agents/`
2. Your agents:
   - **data-validator**: checks `data.json` for missing or malformed data (empty authors, year=0, missing fields)
   - **error-handler**: reviews Python code for inconsistent error handling and suggests a unified approach
   - **doc-writer**: generates or updates docstrings and README content
3. Use each agent on the book app:
   - `data-validator` → audit `@samples/book-app-project/data.json`
   - `error-handler` → review `@samples/book-app-project/books.py` and `@samples/book-app-project/utils.py`
   - `doc-writer` → add docstrings to `@samples/book-app-project/books.py`
4. Collaborate: use `error-handler` to identify error-handling gaps, then `doc-writer` to document the improved approach

**Success criteria**: You have 3 working agents that produce consistent, high-quality output and you can switch between them with `/agent`.

<details>
<summary>💡 Hints (click to expand)</summary>

**Starter templates**: create one file per agent in `.github/agents/`:

`data-validator.agent.md`:
```markdown
---
description: Analyzes JSON data files for missing or malformed entries
---

You analyze JSON data files for missing or malformed entries.

**Focus areas:**
- Empty or missing author fields
- Invalid years (year=0, future years, negative years)
- Missing required fields (title, author, year, read)
- Duplicate entries
```

`error-handler.agent.md`:
```markdown
---
description: Reviews Python code for error handling consistency
---

You review Python code for error handling consistency.

**Standards:**
- No bare except clauses
- Use custom exceptions where appropriate
- All file operations use context managers
- Consistent return types for success/failure
```

`doc-writer.agent.md`:
```markdown
---
description: Technical writer for clear Python documentation
---

You are a technical writer who creates clear Python documentation.

**Standards:**
- Google-style docstrings
- Include parameter types and return values
- Add usage examples for public methods
- Note any exceptions raised
```

**Testing your agents:**

> 💡 **Note:** You should already have `samples/book-app-project/data.json` in your local copy of this repo. If it is missing, download the original version from the source repo:
> [data.json](https://github.com/github/copilot-cli-for-beginners/blob/main/samples/book-app-project/data.json)

```bash
copilot
> /agent
# Select "data-validator" from the list
> @samples/book-app-project/data.json Check for books with empty author fields or invalid years
```

**Tip:** The `description` field in the YAML frontmatter is required for agents to work.

</details>

### Bonus Challenge: Instruction Library

You've built agents you invoke on demand. Now try the other side: **instruction files** that Copilot reads automatically in every session, no `/agent` needed.

Create a `.github/instructions/` folder with at least 3 instruction files:
- `python-style.instructions.md` for enforcing PEP 8 and type hint conventions
- `test-standards.instructions.md` for enforcing pytest conventions in test files
- `data-quality.instructions.md` for validating JSON data entries

Test each instruction file on the book app code.

---

<details>
<summary>🔧 <strong>Common Mistakes & Troubleshooting</strong> (click to expand)</summary>

### Common Mistakes

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Missing `description` in agent frontmatter | Agent won't load or won't be discoverable | Always include `description:` in YAML frontmatter |
| Wrong file location for agents | Agent not found when you try to use it | Place in `~/.copilot/agents/` (personal) or `.github/agents/` (project) |
| Using `.md` instead of `.agent.md` | File may not be recognized as an agent | Name files like `python-reviewer.agent.md` |
| Overly long agent prompts | May hit the 30,000 character limit | Keep agent definitions focused; use skills for detailed instructions |

### Troubleshooting

**Agent not found** - Check that the agent file exists in one of these locations:
- `~/.copilot/agents/`
- `.github/agents/`

List available agents:

```bash
copilot
> /agent
# Shows all available agents
```

**Agent not following instructions** - Be explicit in your prompts and add more detail to agent definitions:
- Specific frameworks/libraries with versions
- Team conventions
- Example code patterns

**Custom instructions not loading** - Run `/init` in your project to set up project-specific instructions:

```bash
copilot
> /init
```

Or check if they're disabled:
```bash
# Don't use --no-custom-instructions if you want them loaded
copilot  # This loads custom instructions by default
```

</details>

---

# Summary

## 🔑 Key Takeaways

1. **Built-in agents**: `/plan` and `/review` are directly invoked; Explore and Task work automatically
2. **Custom agents** are specialists defined in `.agent.md` files
3. **Good agents** have clear expertise, standards, and output formats
4. **Multi-agent collaboration** solves complex problems by combining expertise
5. **Instruction files** (`.instructions.md`) encode team standards for automatic application
6. **Consistent output** comes from well-defined agent instructions

> 📋 **Quick Reference**: See the [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) for a complete list of commands and shortcuts.

---

## ➡️ What's Next

Agents change *how Copilot approaches and takes targeted actions* in your code. Next, you'll learn about **skills** - which change *what steps* it follows. Wondering how agents and skills differ? Chapter 05 covers that head-on.

In **[Chapter 05: Skills System](../05-skills/)**, you'll learn:

- How skills auto-trigger from your prompts (no slash command needed)
- Installing community skills
- Creating custom skills with SKILL.md files
- The difference between agents, skills, and MCP
- When to use each one

---
