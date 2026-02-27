---
title: 'Creating Effective Skills'
description: 'Master the art of writing reusable, shareable skill folders that deliver consistent results across your team.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-26'
estimatedReadingTime: '9 minutes'
tags:
  - skills
  - customization
  - fundamentals
relatedArticles:
  - ./what-are-agents-skills-instructions.md
  - ./defining-custom-instructions.md
prerequisites:
  - Basic understanding of GitHub Copilot chat
---

Skills are self-contained folders that package reusable capabilities—instructions, reference files, templates, and scripts—into a single unit that agents can discover automatically and users can invoke via slash commands. They enable teams to standardize common workflows like generating tests, reviewing code, or creating documentation, ensuring consistent, high-quality results across all team members.

This article shows you how to design, structure, and optimize skills that solve real development challenges.

## What Are Skills?

Skills are folders containing a `SKILL.md` file and optional bundled assets. The `SKILL.md` defines:

- **Name**: A kebab-case identifier that doubles as the `/command` users invoke (e.g., `/generate-tests`)
- **Description**: What the skill accomplishes and when it should be triggered
- **Instructions**: The detailed workflow Copilot executes
- **Asset references**: Links to bundled templates, scripts, schemas, and reference documents

**Key advantages over the older prompt file format**:
- Skills support extended frontmatter for **agent discovery**—agents can find and invoke skills automatically, while prompts required manual slash-command invocation
- Skills can **bundle additional files** (reference docs, templates, scripts) alongside their instructions, giving the AI richer context
- Skills are **more normalised across coding agent systems** via the open [Agent Skills specification](https://agentskills.io/home)
- Skills still support **slash-command invocation** just like prompts did

### How Skills Differ from Other Customizations

**Skills vs Instructions**:
- Skills are invoked explicitly (by agents or users); instructions apply automatically
- Skills drive specific tasks with bundled resources; instructions provide ongoing context
- Use skills for workflows you trigger on demand; use instructions for standards that always apply

**Skills vs Agents**:
- Skills are task-focused capabilities; agents are specialized personas
- Skills work with standard Copilot tools and bundle their own assets; agents may require MCP servers or custom integrations
- Use skills for repeatable tasks; use agents for complex multi-step workflows that need persistent state

## Anatomy of a Skill

Every effective skill has two parts: a `SKILL.md` file with frontmatter and instructions, plus optional bundled assets.

### SKILL.md Structure

**Example - Simple Skill** (`skills/generate-tests/SKILL.md`):

```markdown
---
name: generate-tests
description: 'Generate comprehensive unit tests for the selected code, covering happy path, edge cases, and error conditions'
---

# generate-tests

Generate comprehensive unit tests for the selected code.

## When to Use This Skill

Use this skill when you need to create or expand test coverage for existing code.

## Requirements

- Cover happy path, edge cases, and error conditions
- Use the testing framework already present in the codebase
- Follow existing test file naming conventions
- Include descriptive test names explaining what is being tested
- Add assertions for all expected behaviors
```

**Why This Works**:
- Clear `name` field provides the slash-command identifier
- Rich `description` tells agents when to invoke this skill
- Structured instructions provide specific, actionable guidance
- Generic enough to work across different projects

### Adding Bundled Assets

Skills can include reference files, templates, and scripts that enrich the AI's context:

```
skills/
└── generate-tests/
    ├── SKILL.md
    ├── references/
    │   └── testing-patterns.md      # Common testing patterns
    ├── templates/
    │   └── test-template.ts         # Starter test file
    └── scripts/
        └── setup-test-env.sh        # Environment setup
```

Reference these assets in your SKILL.md instructions:

```markdown
## Testing Patterns

Follow the patterns documented in [references/testing-patterns.md](references/testing-patterns.md).

Use [templates/test-template.ts](templates/test-template.ts) as a starting structure.
```

## Frontmatter Configuration

The YAML frontmatter controls how Copilot discovers and executes your skill.

### Required Fields

**name**: Kebab-case identifier matching the folder name
```yaml
name: generate-tests
```

**description**: Brief summary of what the skill does and when to use it (10–1024 characters, wrapped in single quotes)
```yaml
description: 'Generate comprehensive unit tests for a component, covering happy path, edge cases, and error conditions'
```

### Description Best Practices

The `description` field is critical for agent discovery. Write it so that agents understand **when** to invoke the skill:

✅ **Good**: `'Generate conventional commit messages by analyzing staged git changes and applying the Conventional Commits specification'`

❌ **Poor**: `'Commit helper'`

Include trigger keywords and contextual cues that help agents match the skill to user intent.

## Real Examples from the Repository

The awesome-copilot repository includes skill folders demonstrating production patterns.

### Conventional Commits

See [`skills/conventional-commit/SKILL.md`](https://github.com/github/awesome-copilot/tree/main/skills/conventional-commit) for automating commit messages:

```markdown
---
name: conventional-commit
description: 'Generate conventional commit messages from staged changes following the Conventional Commits specification'
---

# conventional-commit

## Workflow

Follow these steps:

1. Run `git status` to review changed files
2. Run `git diff --cached` to inspect changes
3. Construct commit message using Conventional Commits format
4. Execute commit command automatically

## Commit Message Structure

<type>(scope): description

Types: feat|fix|docs|style|refactor|perf|test|build|ci|chore

## Examples

- feat(parser): add ability to parse arrays
- fix(ui): correct button alignment
- docs: update README with usage instructions
```

This skill automates a repetitive task (writing commit messages) with a proven template that agents can discover and invoke automatically.

### Diagram Generation with Bundled Assets

See [`skills/excalidraw-diagram-generator/`](https://github.com/github/awesome-copilot/tree/main/skills/excalidraw-diagram-generator) for a skill with rich bundled resources:

```
excalidraw-diagram-generator/
├── SKILL.md
├── references/
│   ├── excalidraw-schema.md
│   └── element-types.md
├── templates/
│   ├── flowchart-template.json
│   └── relationship-template.json
└── scripts/
    └── split-excalidraw-library.py
```

This skill packages schema documentation, starter templates, and utility scripts so the AI has everything it needs to generate valid diagrams without hallucinating the format.

## Writing Effective Skill Instructions

### Structure Your Skills

**1. Start with clear objectives**:
```markdown
# skill-name

Your goal is to [specific task] for [specific target].
```

**2. Add "When to Use" guidance** (helps agent discovery):
```markdown
## When to Use This Skill

Use this skill when:
- A user asks to [trigger phrase 1]
- You need to [trigger phrase 2]
- Keywords: [keyword1], [keyword2], [keyword3]
```

**3. Define requirements explicitly**:
```markdown
## Requirements

- Must follow [standard/pattern]
- Should include [specific element]
- Avoid [anti-pattern]
```

**4. Reference bundled assets**:
```markdown
## References

- Follow patterns in [references/patterns.md](references/patterns.md)
- Use template from [templates/starter.json](templates/starter.json)
```

**5. Provide examples**:
```markdown
### Good Example
[Show desired output]

### What to Avoid
[Show problematic patterns]
```

## Best Practices

- **One purpose per skill**: Focus on a single task or workflow
- **Write for discovery**: Craft descriptions with trigger keywords so agents find the right skill
- **Bundle what matters**: Include templates, schemas, and reference docs that reduce hallucination
- **Make it generic**: Write skills that work across different projects
- **Be explicit**: Avoid ambiguous language; specify exact requirements
- **Name descriptively**: Use clear, action-oriented names: `generate-tests`, not `helper`
- **Keep assets lean**: Bundled files should be under 5 MB each
- **Test thoroughly**: Verify skills work with different inputs and codebases

### Writing Style Guidelines

**Use imperative mood**:
- ✅ "Generate unit tests for the selected function"
- ❌ "You should generate some tests"

**Be specific about requirements**:
- ✅ "Use Jest with React Testing Library"
- ❌ "Use whatever testing framework"

**Provide guardrails**:
- ✅ "Do not modify existing test files; create new ones"
- ❌ "Update tests as needed"

**Structure complex skills**:
```markdown
## Step 1: Analysis
[Analyze requirements]

## Step 2: Generation
[Generate code]

## Step 3: Validation
[Check output]
```

## Common Patterns

### Multi-Step Workflow with References

```markdown
---
name: scaffold-feature
description: 'Scaffold a new feature with implementation, tests, and documentation following project conventions'
---

# scaffold-feature

Create a complete feature implementation:

1. **Analyze**: Review existing patterns in codebase
2. **Generate**: Create implementation files following project structure
3. **Test**: Generate comprehensive test coverage using [references/test-patterns.md](references/test-patterns.md)
4. **Document**: Add inline comments and update relevant docs
5. **Validate**: Check for common issues and anti-patterns

Use the existing code style and conventions found in the codebase.
```

### Quick Analysis Skill

```markdown
---
name: explain-architecture
description: 'Analyze and explain code architecture, design patterns, and data flow for selected code'
---

# explain-architecture

Analyze the selected code and explain:

1. Overall architecture and design patterns used
2. Key components and their responsibilities
3. Data flow and dependencies
4. Potential improvements or concerns

Keep explanations concise and developer-focused.
```

### Skill with Script Assets

```markdown
---
name: run-test-suite
description: 'Execute the project test suite, parse failures, and suggest fixes for failing tests'
---

# run-test-suite

Execute the project's test suite:

1. Identify the test command from package.json or build files
2. Run tests in the integrated terminal
3. Parse test output for failures
4. Summarize failed tests with relevant file locations
5. Suggest potential fixes based on error messages

Use [scripts/parse-test-output.sh](scripts/parse-test-output.sh) to extract structured failure data.
```

## Common Questions

**Q: How do I invoke a skill?**

A: Skills can be invoked in two ways. Users can type the skill name as a `/command` in VS Code Chat (e.g., `/generate-tests`). Agents can also discover and invoke skills automatically based on the skill's description and the user's intent.

**Q: How are skills different from prompts?**

A: Skills replace the older prompt file (`*.prompt.md`) format. Skills offer agent discovery (prompts were manual-only), bundled assets (prompts were single files), and cross-platform portability via the Agent Skills specification. If you have existing prompts, consider migrating them to skills.

**Q: Can skills include multiple files?**

A: Yes! Skills are folders, not single files. You can bundle reference documents, templates, scripts, and any other resources the AI needs. Keep individual assets under 5 MB.

**Q: How do I share skills with my team?**

A: Store skill folders in your repository's `.github/skills/` directory. They're automatically available to all team members with Copilot access when working in that repository.

**Q: Can agents chain multiple skills?**

A: Agents can discover and invoke multiple skills during a conversation based on user intent. Each skill invocation is independent, but agents maintain conversation context across invocations.

**Q: Should skills include code examples?**

A: Yes, for clarity. Show examples of desired output format, patterns to follow, or anti-patterns to avoid. For complex schemas or formats, consider bundling them as reference files rather than inline examples.

## Common Pitfalls to Avoid

- ❌ **Vague description**: "Code helper" doesn't help agents discover the skill
  ✅ **Instead**: Write descriptions with trigger keywords: "Generate comprehensive unit tests covering happy path, edge cases, and error conditions"

- ❌ **Missing bundled resources**: Expecting the AI to know your test patterns or schemas
  ✅ **Instead**: Bundle reference docs and templates in the skill folder

- ❌ **Too many responsibilities**: A skill that generates, tests, documents, and deploys
  ✅ **Instead**: Create focused skills for each concern

- ❌ **Hardcoded paths**: Referencing specific project file paths in skill instructions
  ✅ **Instead**: Write generic instructions that work across projects

- ❌ **No examples**: Abstract requirements without concrete guidance
  ✅ **Instead**: Include "Good Example" and "What to Avoid" sections, or bundle templates

## Next Steps

Now that you understand effective skills, you can:

- **Explore Repository Examples**: Browse the [Skills Directory](../../skills/) for production skills covering diverse workflows
- **Learn About Agents**: [Building Custom Agents](../building-custom-agents/) — When to upgrade from skills to full agents
- **Understand Instructions**: [Defining Custom Instructions](../defining-custom-instructions/) — Complement skills with automatic context
- **Decision Framework**: Choosing the Right Customization _(coming soon)_ — When to use skills vs other types

**Suggested Reading Order**:
1. This article (creating effective skills)
2. [Building Custom Agents](../building-custom-agents/) — More sophisticated workflows
3. Choosing the Right Customization _(coming soon)_ — Decision guidance

---
