---
title: '05 · Automate Repetitive Tasks'
description: 'Mirror the source chapter on skills that load automatically for repeated GitHub Copilot CLI workflows.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-20
---

![Chapter 05: Skills System](/images/learning-hub/copilot-cli-for-beginners/05/chapter-header.png)

> **What if Copilot could automatically apply your team's best practices without you having to explain them every time?**

In this chapter, you'll learn about Agent Skills: folders of instructions that Copilot automatically loads when relevant to your task. While agents change *how* Copilot thinks, skills teach Copilot *specific ways to complete tasks*. You'll create a security audit skill that Copilot applies whenever you ask about security, build team-standard review criteria that ensure consistent code quality, and learn how skills work across Copilot CLI, VS Code, and the Copilot coding agent.


## 🎯 Learning Objectives

By the end of this chapter, you'll be able to:

- Understand how Agent Skills work and when to use them
- Create custom skills with SKILL.md files
- Use community skills from shared repositories
- Know when to use skills vs agents vs MCP

> ⏱️ **Estimated Time**: ~55 minutes (20 min reading + 35 min hands-on)

---

## 🧩 Real-World Analogy: Power Tools

A general-purpose drill is useful, but specialized attachments make it powerful. 
<img src="/images/learning-hub/copilot-cli-for-beginners/05/power-tools-analogy.png" alt="Power Tools - Skills Extend Copilot's Capabilities" width="800"/>


Skills work the same way. Just like swapping drill bits for different jobs, you can add skills to Copilot for different tasks:

| Skill Attachment | Purpose |
|------------|---------|
| `commit` | Generate consistent commit messages |
| `security-audit` | Check for OWASP vulnerabilities |
| `generate-tests` | Create comprehensive pytest tests |
| `code-checklist` | Apply team code quality standards |



*Skills are specialized attachments that extend what Copilot can do*

---

# How Skills Work

<img src="/images/learning-hub/copilot-cli-for-beginners/05/how-skills-work.png" alt="Glowing RPG-style skill icons connected by light trails on a starfield background representing Copilot skills" width="800"/>

Learn what skills are, why they matter, and how they differ from agents and MCP.

---

## *New to Skills?* Start Here!

1. **See what skills are already available:**
   ```bash
   copilot
   > /skills list
   ```
   This shows all skills Copilot can find in your project and personal folders.

2. **Look at a real skill file:** Check out our provided [code-checklist SKILL.md](https://github.com/github/copilot-cli-for-beginners/blob/main/.github/skills/code-checklist/SKILL.md) to see the pattern. It's just YAML frontmatter plus markdown instructions.

3. **Understand the core concept:** Skills are task-specific instructions that Copilot loads *automatically* when your prompt matches the skill's description. You don't need to activate them, just ask naturally.


## Understanding Skills

Agent Skills are folders containing instructions, scripts, and resources that Copilot **automatically loads when relevant** to your task. Copilot reads your prompt, checks if any skills match, and applies the relevant instructions automatically.

```bash
copilot

> Check books.py against our quality checklist
# Copilot detects this matches your "code-checklist" skill
# and automatically applies its Python quality checklist

> Generate tests for the BookCollection class
# Copilot loads your "pytest-gen" skill
# and applies your preferred test structure

> What are the code quality issues in this file?
# Copilot loads your "code-checklist" skill
# and checks against your team's standards
```

> 💡 **Key Insight**: Skills are **automatically triggered** based on your prompt matching the skill's description. Just ask naturally and Copilot applies relevant skills behind the scenes. You can also invoke skills directly as well which you'll learn about next.

> 🧰 **Ready-to-use templates**: Check out the [.github/skills](https://github.com/github/copilot-cli-for-beginners/tree/main/.github/skills/) folder for simple copy-paste skills you can try out.

### Direct Slash Command Invocation

While auto-triggering is the primary way skills work, you can also **invoke skills directly** using their name as a slash command:

```bash
> /generate-tests Create tests for the user authentication module

> /code-checklist Check books.py for code quality issues

> /security-audit Check the API endpoints for vulnerabilities
```

This gives you explicit control when you want to ensure a specific skill is used.

> 📝 **Skills vs Agents Invocation**: Don't confuse skill invocation with agent invocation:
> - **Skills**: `/skill-name <prompt>`, e.g., `/code-checklist Check this file`
> - **Agents**: `/agent` (select from list) or `copilot --agent <name>` (command line)
>
> If you have both a skill and an agent with the same name (e.g., "code-reviewer"), typing `/code-reviewer` invokes the **skill**, not the agent.

### How Do I Know a Skill Was Used?

You can ask Copilot directly:

```bash
> What skills did you use for that response?

> What skills do you have available for security reviews?
```

### Skills vs Agents vs MCP

Skills are just one piece of GitHub Copilot's extensibility model. Here's how they compare to agents and MCP servers.

> *Don't worry about MCP quite yet. We'll cover it in [Chapter 06](../06-mcp-servers/). It's included here so you can see how skills fit into the overall picture.*

<img src="/images/learning-hub/copilot-cli-for-beginners/05/skills-agents-mcp-comparison.png" alt="Comparison diagram showing the differences between Agents, Skills, and MCP Servers and how they combine into your workflow" width="800"/>

| Feature | What It Does | When to Use |
|---------|--------------|-------------|
| **Agents** | Changes how AI thinks | Need specialized expertise across many tasks |
| **Skills** | Provides task-specific instructions | Specific, repeatable tasks with detailed steps |
| **MCP** | Connects external services | Need live data from APIs |

Use agents for broad expertise, skills for specific task instructions, and MCP for external data. An agent can use one or more skills during a conversation. For example, when you ask an agent to check your code, it might apply both a `security-audit` skill and a `code-checklist` skill automatically.

> 📚 **Learn More**: See the official [About Agent Skills](https://docs.github.com/copilot/concepts/agents/about-agent-skills) documentation for the complete reference on skill formats and best practices.

---

## From Manual Prompts to Automatic Expertise

Before diving into how to create skills, let's see *why* they're worth learning. Once you see the consistency gains, the "how" will make more sense.

### Before Skills: Inconsistent Reviews

Every code review, you might forget something:

```bash
copilot

> Review this code for issues
# Generic review - might miss your team's specific concerns
```

Or you write a long prompt every time:

```bash
> Review this code checking for bare except clauses, missing type hints,
> mutable default arguments, missing context managers for file I/O,
> functions over 50 lines, print statements in production code...
```

Time: **30+ seconds** to type. Consistency: **varies by memory**.

### After Skills: Automatic Best Practices

With a `code-checklist` skill installed, just ask naturally:

```bash
copilot

> Check the book collection code for quality issues
```

**What happens behind the scenes**:
1. Copilot sees "code quality" and "issues" in your prompt
2. Checks skill descriptions, finds your `code-checklist` skill matches
3. Automatically loads your team's quality checklist
4. Applies all checks without you listing them

<img src="/images/learning-hub/copilot-cli-for-beginners/05/skill-auto-discovery-flow.png" alt="How Skills Auto-Trigger - 4-step flow showing how Copilot automatically matches your prompt to the right skill" width="800"/>

*Just ask naturally. Copilot matches your prompt to the right skill and applies it automatically.*

**Output**:
```
## Code Checklist: books.py

### Code Quality
- [PASS] All functions have type hints
- [PASS] No bare except clauses
- [PASS] No mutable default arguments
- [PASS] Context managers used for file I/O
- [PASS] Functions are under 50 lines
- [PASS] Variable and function names follow PEP 8

### Input Validation
- [FAIL] User input is not validated - add_book() accepts any year value
- [FAIL] Edge cases not fully handled - empty strings accepted for title/author
- [PASS] Error messages are clear and helpful

### Testing
- [FAIL] No corresponding pytest tests found

### Summary
3 items need attention before merge
```

**The difference**: Your team's standards are applied automatically, every time, without typing them out.

---

<details>
<summary>🎬 See it in action!</summary>

![Skill Trigger Demo](/images/learning-hub/copilot-cli-for-beginners/05/skill-trigger-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

## Consistency at Scale: Team PR Review Skill

Imagine your team has a 10-point PR checklist. Without a skill, every developer must remember all 10 points, and someone always forgets one of them. With a `pr-review` skill, the entire team gets consistent reviews:

```bash
copilot

> Can you review this PR?
```

Copilot automatically loads your team's `pr-review` skill and checks all 10 points:

```
PR Review: feature/user-auth

## Security ✅
- No hardcoded secrets
- Input validation present
- No bare except clauses

## Code Quality ⚠️
- [WARN] print statement on line 45 - remove before merge
- [WARN] TODO on line 78 missing issue reference
- [WARN] Missing type hints on public functions

## Testing ✅
- New tests added
- Edge cases covered

## Documentation ❌
- [FAIL] Breaking change not documented in CHANGELOG
- [FAIL] API changes need OpenAPI spec update
```

**The power**: Every team member applies the same standards automatically. New hires don't need to memorize the checklist because the skill handles it.

---

# Creating Custom Skills

<img src="/images/learning-hub/copilot-cli-for-beginners/05/creating-managing-skills.png" alt="Human and robotic hands building a wall of glowing LEGO-like blocks representing skill creation and management" width="800"/>

Build your own skills from SKILL.md files.

---

## Skill Locations

Skills are stored in `.github/skills/` (project-specific) or `~/.copilot/skills/` (user level).

### How Copilot Finds Skills

Copilot automatically scans these locations for skills:

| Location | Scope |
|----------|-------|
| `.github/skills/` | Project-specific (shared with team via git) |
| `~/.copilot/skills/` | User-specific (your personal skills) |

### Skill Structure

Each skill lives in its own folder with a `SKILL.md` file. You can optionally include scripts, examples, or other resources:

```
.github/skills/
└── my-skill/
    ├── SKILL.md           # Required: Skill definition and instructions
    ├── examples/          # Optional: Example files Copilot can reference
    │   └── sample.py
    └── scripts/           # Optional: Scripts the skill can use
        └── validate.sh
```

> 💡 **Tip**: The directory name should match the `name` in your SKILL.md frontmatter (lowercase with hyphens).

### SKILL.md Format

Skills use a simple markdown format with YAML frontmatter:

```markdown
---
name: code-checklist
description: Comprehensive code quality checklist with security, performance, and maintainability checks
license: MIT
---

# Code Checklist

When checking code, look for:

## Security
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure

## Performance
- N+1 query problems (running one query per item instead of one query for all items)
- Unnecessary loops or computations
- Memory leaks
- Blocking operations

## Maintainability
- Function length (flag functions > 50 lines)
- Code duplication
- Missing error handling
- Unclear naming

## Output Format
Provide issues as a numbered list with severity:
- [CRITICAL] - Must fix before merge
- [HIGH] - Should fix before merge
- [MEDIUM] - Should address soon
- [LOW] - Nice to have
```

**YAML Properties:**

| Property | Required | Description |
|----------|----------|-------------|
| `name` | **Yes** | Unique identifier (lowercase, hyphens for spaces) |
| `description` | **Yes** | What the skill does and when Copilot should use it |
| `license` | No | License that applies to this skill |

> 📖 **Official docs**: [About Agent Skills](https://docs.github.com/copilot/concepts/agents/about-agent-skills)

### Creating Your First Skill

Let's build a security audit skill that checks for OWASP Top 10 vulnerabilities:

```bash
# Create skill directory
mkdir -p .github/skills/security-audit

# Create the SKILL.md file
cat > .github/skills/security-audit/SKILL.md << 'EOF'
---
name: security-audit
description: Security-focused code review checking OWASP (Open Web Application Security Project) Top 10 vulnerabilities
---

# Security Audit

Perform a security audit checking for:

## Injection Vulnerabilities
- SQL injection (string concatenation in queries)
- Command injection (unsanitized shell commands)
- LDAP injection
- XPath injection

## Authentication Issues
- Hardcoded credentials
- Weak password requirements
- Missing rate limiting
- Session management flaws

## Sensitive Data
- Plaintext passwords
- API keys in code
- Logging sensitive information
- Missing encryption

## Access Control
- Missing authorization checks
- Insecure direct object references
- Path traversal vulnerabilities

## Output
For each issue found, provide:
1. File and line number
2. Vulnerability type
3. Severity (CRITICAL/HIGH/MEDIUM/LOW)
4. Recommended fix
EOF

# Test your skill (skills load automatically based on your prompt)
copilot

> @samples/book-app-project/ Check this code for security vulnerabilities
# Copilot detects "security vulnerabilities" matches your skill
# and automatically applies its OWASP checklist
```

**Expected output** (your results will vary):

```
Security Audit: book-app-project

[HIGH] Hardcoded file path (book_app.py, line 12)
  File path is hardcoded rather than configurable
  Fix: Use environment variable or config file

[MEDIUM] No input validation (book_app.py, line 34)
  User input passed directly to function without sanitization
  Fix: Add input validation before processing

✅ No SQL injection found
✅ No hardcoded credentials found
```

---

## Writing Good Skill Descriptions

The `description` field in your SKILL.md is crucial! It's how Copilot decides whether to load your skill:

```markdown
---
name: security-audit
description: Use for security reviews, vulnerability scanning,
  checking for SQL injection, XSS, authentication issues,
  OWASP Top 10 vulnerabilities, and security best practices
---
```

> 💡 **Tip**: Include keywords that match how you naturally ask questions. If you say "security review," include "security review" in the description.

### Combining Skills with Agents

Skills and agents work together. The agent provides expertise, the skill provides specific instructions:

```bash
# Start with a code-reviewer agent
copilot --agent code-reviewer

> Check the book app for quality issues
# code-reviewer agent's expertise combines
# with your code-checklist skill's checklist
```

---

# Managing and Sharing Skills

Discover installed skills, find community skills, and share your own.

<img src="/images/learning-hub/copilot-cli-for-beginners/05/managing-sharing-skills.png" alt="Managing and Sharing Skills - showing the discover, use, create, and share cycle for CLI skills" width="800" />

---

## Managing Skills with the `/skills` Command

Use the `/skills` command to manage your installed skills:

| Command | What It Does |
|---------|--------------|
| `/skills list` | Show all installed skills |
| `/skills info <name>` | Get details about a specific skill |
| `/skills add <name>` | Enable a skill (from a repository or marketplace) |
| `/skills remove <name>` | Disable or uninstall a skill |
| `/skills reload` | Reload skills after editing SKILL.md files |

> 💡 **Remember**: You don't need to "activate" skills for each prompt. Once installed, skills are **automatically triggered** when your prompt matches their description. These commands are for managing which skills are available, not for using them.

### Example: View Your Skills

```bash
copilot

> /skills list

Available skills:
- security-audit: Security-focused code review checking OWASP Top 10
- generate-tests: Generate comprehensive unit tests with edge cases
- code-checklist: Team code quality checklist
...

> /skills info security-audit

Skill: security-audit
Source: Project
Location: .github/skills/security-audit/SKILL.md
Description: Security-focused code review checking OWASP Top 10 vulnerabilities
```

---

<details>
<summary>See it in action!</summary>

![List Skills Demo](/images/learning-hub/copilot-cli-for-beginners/05/list-skills-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### When to Use `/skills reload`

After creating or editing a skill's SKILL.md file, run `/skills reload` to pick up the changes without restarting Copilot:

```bash
# Edit your skill file
# Then in Copilot:
> /skills reload
Skills reloaded successfully.
```

> 💡 **Good to know**: Skills remain effective even after using `/compact` to summarize your conversation history. No need to reload after compacting.

---

## Finding and Using Community Skills

### Using Plugins to Install Skills

> 💡 **What are plugins?** Plugins are installable packages that can bundle skills, agents, and MCP server configurations together. Think of them as "app store" extensions for Copilot CLI.

The `/plugin` command lets you browse and install these packages:

```bash
copilot

> /plugin list
# Shows installed plugins

> /plugin marketplace
# Browse available plugins

> /plugin install <plugin-name>
# Install a plugin from the marketplace
```

Plugins can bundle multiple capabilities together - a single plugin might include related skills, agents, and MCP server configurations that work together.

### Community Skill Repositories

Pre-made skills are also available from community repositories:

- **[Awesome Copilot](https://github.com/github/awesome-copilot)** - Official GitHub Copilot resources including skills documentation and examples

### Installing a Community Skill Manually

If you find a skill in a GitHub repository, copy its folder into your skills directory:

```bash
# Clone the awesome-copilot repository
git clone https://github.com/github/awesome-copilot.git /tmp/awesome-copilot

# Copy a specific skill to your project
cp -r /tmp/awesome-copilot/skills/code-checklist .github/skills/

# Or for personal use across all projects
cp -r /tmp/awesome-copilot/skills/code-checklist ~/.copilot/skills/
```

> ⚠️ **Review before installing**: Always read a skill's `SKILL.md` before copying it into your project. Skills control what Copilot does, and a malicious skill could instruct it to run harmful commands or modify code in unexpected ways.

---

# Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/05/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800"/>

Apply what you've learned by building and testing your own skills.

---

## ▶️ Try It Yourself

### Build More Skills

Here are two more skills showing different patterns. Follow the same `mkdir` + `cat` workflow from "Creating Your First Skill" above or copy and paste the skills into the proper location. More examples are available in [.github/skills](https://github.com/github/copilot-cli-for-beginners/tree/main/.github/skills).

### pytest Test Generation Skill

A skill that ensures consistent pytest structure across your codebase:

```bash
mkdir -p .github/skills/pytest-gen

cat > .github/skills/pytest-gen/SKILL.md << 'EOF'
---
name: pytest-gen
description: Generate comprehensive pytest tests with fixtures and edge cases
---

# pytest Test Generation

Generate pytest tests that include:

## Test Structure
- Use pytest conventions (test_ prefix)
- One assertion per test when possible
- Clear test names describing expected behavior
- Use fixtures for setup/teardown

## Coverage
- Happy path scenarios
- Edge cases: None, empty strings, empty lists
- Boundary values
- Error scenarios with pytest.raises()

## Fixtures
- Use @pytest.fixture for reusable test data
- Use tmpdir/tmp_path for file operations
- Mock external dependencies with pytest-mock

## Output
Provide complete, runnable test file with proper imports.
EOF
```

### Team PR Review Skill

A skill that enforces consistent PR review standards across your team:

```bash
mkdir -p .github/skills/pr-review

cat > .github/skills/pr-review/SKILL.md << 'EOF'
---
name: pr-review
description: Team-standard PR review checklist
---

# PR Review

Review code changes against team standards:

## Security Checklist
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user data
- [ ] No bare except clauses
- [ ] No sensitive data in logs

## Code Quality
- [ ] Functions under 50 lines
- [ ] No print statements in production code
- [ ] Type hints on public functions
- [ ] Context managers for file I/O
- [ ] No TODOs without issue references

## Testing
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] No skipped tests without explanation

## Documentation
- [ ] API changes documented
- [ ] Breaking changes noted
- [ ] README updated if needed

## Output Format
Provide results as:
- ✅ PASS: Items that look good
- ⚠️ WARN: Items that could be improved
- ❌ FAIL: Items that must be fixed before merge
EOF
```

### Go Further

1. **Skill Creation Challenge**: Create a `quick-review` skill that does a 3-point checklist:
   - Bare except clauses
   - Missing type hints
   - Unclear variable names

   Test it by asking: "Do a quick review of books.py"

2. **Skill Comparison**: Time yourself writing a detailed security review prompt manually. Then just ask "Check for security issues in this file" and let your security-audit skill load automatically. How much time did the skill save?

3. **Team Skill Challenge**: Think about your team's code review checklist. Could you encode it as a skill? Write down 3 things the skill should always check.

**Self-Check**: You understand skills when you can explain why the `description` field matters (it's how Copilot decides whether to load your skill).

---

## 📝 Assignment

### Main Challenge: Build a Book Summary Skill

The examples above created `pytest-gen` and `pr-review` skills. Now practice creating a completely different kind of skill: one for generating formatted output from data.

1. List your current skills: Run Copilot and pass it `/skills list`. You can also use `ls .github/skills/` to see project skills or `ls ~/.copilot/skills/` for personal skills.
2. Create a `book-summary` skill at `.github/skills/book-summary/SKILL.md` that generates a formatted markdown summary of the book collection
3. Your skill should have:
   - Clear name and description (description is crucial for matching!)
   - Specific formatting rules (e.g., markdown table with title, author, year, read status)
   - Output conventions (e.g., use ✅/❌ for read status, sort by year)
4. Test the skill: `@samples/book-app-project/data.json Summarize the books in this collection`
5. Verify the skill auto-triggers by checking `/skills list`
6. Try invoking it directly with `/book-summary Summarize the books in this collection`

**Success criteria**: You have a working `book-summary` skill that Copilot automatically applies when you ask about the book collection.

<details>
<summary>💡 Hints (click to expand)</summary>

**Starter template**: Create `.github/skills/book-summary/SKILL.md`:

```markdown
---
name: book-summary
description: Generate a formatted markdown summary of a book collection
---

# Book Summary Generator

Generate a summary of the book collection following these rules:

1. Output a markdown table with columns: Title, Author, Year, Status
2. Use ✅ for read books and ❌ for unread books
3. Sort by year (oldest first)
4. Include a total count at the bottom
5. Flag any data issues (missing authors, invalid years)

Example:
| Title | Author | Year | Status |
|-------|--------|------|--------|
| 1984 | George Orwell | 1949 | ✅ |
| Dune | Frank Herbert | 1965 | ❌ |

**Total: 2 books (1 read, 1 unread)**
```

**Test it:**
```bash
copilot
> @samples/book-app-project/data.json Summarize the books in this collection
# The skill should auto-trigger based on the description match
```

**If it doesn't trigger:** Try `/skills reload` then ask again.

</details>

### Bonus Challenge: Commit Message Skill

1. Create a `commit-message` skill that generates conventional commit messages with a consistent format
2. Test it by staging a change and asking: "Generate a commit message for my staged changes"
3. Document your skill and share it on GitHub with the `copilot-skill` topic

---

<details>
<summary>🔧 <strong>Common Mistakes & Troubleshooting</strong> (click to expand)</summary>

### Common Mistakes

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Naming the file something other than `SKILL.md` | Skill won't be recognized | The file must be named exactly `SKILL.md` |
| Vague `description` field | Skill never gets loaded automatically | Description is the PRIMARY discovery mechanism. Use specific trigger words |
| Missing `name` or `description` in frontmatter | Skill fails to load | Add both fields in YAML frontmatter |
| Wrong folder location | Skill not found | Use `.github/skills/skill-name/` (project) or `~/.copilot/skills/skill-name/` (personal) |

### Troubleshooting

**Skill not being used** - If Copilot isn't using your skill when expected:

1. **Check the description**: Does it match how you're asking?
   ```markdown
   # Bad: Too vague
   description: Reviews code

   # Good: Includes trigger words
   description: Use for code reviews, checking code quality,
     finding bugs, security issues, and best practice violations
   ```

2. **Verify the file location**:
   ```bash
   # Project skills
   ls .github/skills/

   # User skills
   ls ~/.copilot/skills/
   ```

3. **Check SKILL.md format**: Frontmatter is required:
   ```markdown
   ---
   name: skill-name
   description: What the skill does and when to use it
   ---

   # Instructions here
   ```

**Skill not appearing** - Verify the folder structure:
```
.github/skills/
└── my-skill/           # Folder name
    └── SKILL.md        # Must be exactly SKILL.md (case-sensitive)
```

Run `/skills reload` after creating or editing skills to ensure changes are picked up.

**Testing if a skill loads** - Ask Copilot directly:
```bash
> What skills do you have available for checking code quality?
# Copilot will describe relevant skills it found
```

**How do I know my skill is actually working?**

1. **Check the output format**: If your skill specifies an output format (like `[CRITICAL]` tags), look for that in the response
2. **Ask directly**: After getting a response, ask "Did you use any skills for that?"
3. **Compare with/without**: Try the same prompt with `--no-custom-instructions` to see the difference:
   ```bash
   # With skills
   copilot --allow-all -p "Review @file.py for security issues"

   # Without skills (baseline comparison)
   copilot --allow-all -p "Review @file.py for security issues" --no-custom-instructions
   ```
4. **Check for specific checks**: If your skill includes specific checks (like "functions over 50 lines"), see if those appear in the output

</details>

---

# Summary

## 🔑 Key Takeaways

1. **Skills are automatic**: Copilot loads them when your prompt matches the skill's description
2. **Direct invocation**: You can also invoke skills directly with `/skill-name` as a slash command
3. **SKILL.md format**: YAML frontmatter (name, description, optional license) plus markdown instructions
4. **Location matters**: `.github/skills/` for project/team sharing, `~/.copilot/skills/` for personal use
5. **Description is key**: Write descriptions that match how you naturally ask questions

> 📋 **Quick Reference**: See the [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) for a complete list of commands and shortcuts.

---

## ➡️ What's Next

Skills extend what Copilot can do with auto-loaded instructions. But what about connecting to external services? That's where MCP comes in.

In **[Chapter 06: MCP Servers](../06-mcp-servers/)**, you'll learn:

- What MCP (Model Context Protocol) is
- Connecting to GitHub, filesystem, and documentation services
- Configuring MCP servers
- Multi-server workflows

---
