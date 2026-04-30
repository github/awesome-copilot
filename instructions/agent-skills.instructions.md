---
description: 'Guidelines for creating high-quality Agent Skills for GitHub Copilot'
applyTo: '**/skills/**/SKILL.md'
---

# Agent Skills File Guidelines

Instructions for creating effective and portable Agent Skills that enhance GitHub Copilot with specialized capabilities, workflows, and bundled resources.

## What Are Agent Skills?

Agent Skills are self-contained folders with instructions and bundled resources that teach AI agents specialized capabilities. Unlike custom instructions (which define coding standards), skills enable task-specific workflows that can include scripts, examples, templates, and reference data.

Key characteristics:
- **Portable**: Works across VS Code, Copilot CLI, and Copilot coding agent
- **Progressive loading**: Only loaded when relevant to the user's request
- **Resource-bundled**: Can include scripts, templates, examples alongside instructions
- **On-demand**: Activated automatically based on prompt relevance

## Directory Structure

Skills are stored in specific locations:

| Location | Scope | Recommendation |
|----------|-------|----------------|
| `.github/skills/<skill-name>/` | Project/repository | Recommended for project skills |
| `.claude/skills/<skill-name>/` | Project/repository | Legacy, for backward compatibility |
| `~/.github/skills/<skill-name>/` | Personal (user-wide) | Recommended for personal skills |
| `~/.claude/skills/<skill-name>/` | Personal (user-wide) | Legacy, for backward compatibility |

Each skill **must** have its own subdirectory containing at minimum a `SKILL.md` file.

## Required SKILL.md Format

### Frontmatter (Required)

```yaml
---
name: webapp-testing
description: 'Toolkit for testing local web applications using Playwright. Use when asked to verify frontend functionality, debug UI behavior, capture browser screenshots, check for visual regressions, or view browser console logs. Supports Chrome, Firefox, and WebKit browsers.'
license: Complete terms in LICENSE.txt
---
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Lowercase, hyphens for spaces, max 64 characters (e.g., `webapp-testing`) |
| `description` | Yes | 10–1024 characters, clear capabilities AND use cases, wrapped in single quotes |
| `license` | No | Reference to LICENSE.txt (e.g., `Complete terms in LICENSE.txt`) or SPDX identifier |

### Description Best Practices

**CRITICAL**: The `description` field is the PRIMARY mechanism for automatic skill discovery. Copilot reads ONLY the `name` and `description` to decide whether to load a skill. If your description is vague, the skill will never be activated.

**What to include in description:**
1. **WHAT** the skill does (capabilities)
2. **WHEN** to use it (specific triggers, scenarios, file types, or user requests)
3. **Keywords** that users might mention in their prompts

**Good description:**
```yaml
description: 'Toolkit for testing local web applications using Playwright. Use when asked to verify frontend functionality, debug UI behavior, capture browser screenshots, check for visual regressions, or view browser console logs. Supports Chrome, Firefox, and WebKit browsers.'
```

**Poor description:**
```yaml
description: 'Web testing helpers'
```

The poor description fails because:
- No specific triggers (when should Copilot load this?)
- No keywords (what user prompts would match?)
- No capabilities (what can it actually do?)

### Body Content

The body contains detailed instructions that Copilot loads AFTER the skill is activated. Recommended sections:

| Section | Purpose |
|---------|---------|
| `# Title` | Brief overview of what this skill enables |
| `## When to Use This Skill` | List of scenarios (reinforces description triggers) |
| `## Prerequisites` | Required tools, dependencies, environment setup (if applicable) |
| `## Step-by-Step Workflows` | Numbered steps for repeatable procedures (build, deploy, setup) |
| `## Gotchas` | Proactive warnings about non-obvious behavior ("never do X because Y") |
| `## Troubleshooting` | Reactive fixes for known issues ("if you see X, try Y") |
| `## References` | Links to bundled docs or external resources |

Not every skill needs every section. Skip `## Prerequisites` if there are no external dependencies. Skip `## Step-by-Step Workflows` if the skill is purely advisory. Include `## Gotchas` whenever the skill involves external tools, APIs, or platform-specific behavior.

For content quality principles (what to include and what to leave out), see [Writing High-Impact Skills](#writing-high-impact-skills) below.

### Writing Each Section

**`# Title`** — One sentence stating what the skill enables. Avoid generic phrasing; be specific about the domain.

**`## When to Use This Skill`** — A bullet list of concrete scenarios that reinforce the description triggers. This helps Copilot confirm it loaded the right skill.

```markdown
## When to Use This Skill

- User asks to test a web application in a browser
- User needs to capture screenshots for visual regression testing
- User wants to debug frontend behavior with browser console logs
```

**`## Prerequisites`** — Only include if the skill requires tools, services, or configuration that Copilot cannot assume are available. List exact install commands.

```markdown
## Prerequisites

- [Playwright](https://playwright.dev/) installed: `npm install -D @playwright/test`
- At least one browser engine installed: `npx playwright install chromium`
```

**`## Step-by-Step Workflows`** — Numbered steps for repeatable procedures where sequence matters (build, deploy, environment setup). Describe WHAT to accomplish at each stage, not hardcoded file paths or line numbers — steps should be adaptable to different project structures. For complex workflows (>5 steps), split into `references/` files and link to them.

```markdown
## Step-by-Step Workflows

### Deploy to Staging

1. Build the project: `npm run build`
2. Run pre-deploy validation: `npm run validate`
3. Deploy to staging: `npm run deploy -- --env staging`
4. Verify the health endpoint returns 200
```

**`## Gotchas`** — Proactive warnings that prevent mistakes. Document non-obvious defaults, API quirks, version-specific behavior, and common traps. Bold the key constraint, then explain why.

```markdown
## Gotchas

- **Never** call `billing.charge()` without checking `user.hasPaymentMethod` first —
  the SDK throws an unrecoverable error instead of returning a failure.
- The `currency` field expects ISO 4217 codes, not display names.
  Copilot often writes "dollars" instead of "USD".
```

**`## Troubleshooting`** — Reactive fixes for known issues, presented as a table of symptom → solution pairs. Each row should be self-contained and actionable.

```markdown
## Troubleshooting

| Issue | Solution |
|-------|----------|
| Plugin won't connect | Check servers are running (`npm run start:all`) |
| Browser blocks localhost | Allow local network access, or try a different browser |
| Tool execution times out | Ensure the plugin UI is open and shows "Connected" |
```

**`## References`** — Links to bundled docs in `references/`, external documentation, or related skills. Use relative paths for bundled files.

## Bundling Resources

Skills can include additional files that Copilot accesses on-demand:

### Supported Resource Types

| Folder | Purpose | Loaded into Context? | Example Files |
|--------|---------|---------------------|---------------|
| `scripts/` | Executable automation that performs specific operations | When executed | `helper.py`, `validate.sh`, `build.ts` |
| `references/` | Documentation the AI agent reads to inform decisions | Yes, when referenced | `api_reference.md`, `schema.md`, `workflow_guide.md` |
| `assets/` | **Static files used AS-IS** in output (not modified by the AI agent) | No | `logo.png`, `brand-template.pptx`, `custom-font.ttf` |
| `templates/` | **Starter code/scaffolds that the AI agent MODIFIES** and builds upon | Yes, when referenced | `viewer.html` (insert algorithm), `hello-world/` (extend) |

### Directory Structure Example

```
.github/skills/my-skill/
├── SKILL.md              # Required: Main instructions
├── LICENSE.txt           # Recommended: License terms (Apache 2.0 typical)
├── scripts/              # Optional: Executable automation
│   ├── helper.py         # Python script
│   └── helper.ps1        # PowerShell script
├── references/           # Optional: Documentation loaded into context
│   ├── api_reference.md
│   ├── workflow-setup.md     # Detailed workflow (>5 steps)
│   └── workflow-deployment.md
├── assets/               # Optional: Static files used AS-IS in output
│   ├── baseline.png      # Reference image for comparison
│   └── report-template.html
└── templates/            # Optional: Starter code the AI agent modifies
    ├── scaffold.py       # Code scaffold the AI agent customizes
    └── config.template   # Config template the AI agent fills in
```

> **LICENSE.txt**: When creating a skill, download the Apache 2.0 license text from https://www.apache.org/licenses/LICENSE-2.0.txt and save as `LICENSE.txt`. Update the copyright year and owner in the appendix section.

### Assets vs Templates: Key Distinction

**Assets** are static resources **consumed unchanged** in the output:
- A `logo.png` that gets embedded into a generated document
- A `report-template.html` copied as output format
- A `custom-font.ttf` applied to text rendering

**Templates** are starter code/scaffolds that **the AI agent actively modifies**:
- A `scaffold.py` where the AI agent inserts logic
- A `config.template` where the AI agent fills in values based on user requirements
- A `hello-world/` project directory that the AI agent extends with new features

**Rule of thumb**: If the AI agent reads and builds upon the file content → `templates/`. If the file is used as-is in output → `assets/`.

### Referencing Resources in SKILL.md

Use relative paths to reference files within the skill directory:

```markdown
## Available Scripts

Run the [helper script](./scripts/helper.py) to automate common tasks.

See [API reference](./references/api_reference.md) for detailed documentation.

Use the [scaffold](./templates/scaffold.py) as a starting point.
```

## Progressive Loading Architecture

Skills use three-level loading for efficiency:

| Level | What Loads | When |
|-------|------------|------|
| 1. Discovery | `name` and `description` only | Always (lightweight metadata) |
| 2. Instructions | Full `SKILL.md` body | When request matches description |
| 3. Resources | Scripts, examples, docs | Only when Copilot references them |

This means:
- Install many skills without consuming context
- Only relevant content loads per task
- Resources don't load until explicitly needed

## Content Guidelines

### Writing Style

- Use imperative mood: "Run", "Create", "Configure" (not "You should run")
- Be specific and actionable
- Include exact commands with parameters
- Show expected outputs where helpful
- Keep sections focused and scannable

### Script Requirements

When including scripts, prefer cross-platform languages:

| Language | Use Case |
|----------|----------|
| Python | Complex automation, data processing |
| pwsh | PowerShell Core scripting |
| Node.js | JavaScript-based tooling |
| Bash/Shell | Simple automation tasks |

Best practices:
- Include help/usage documentation (`--help` flag)
- Handle errors gracefully with clear messages
- Avoid storing credentials or secrets
- Use relative paths where possible

### When to Bundle Scripts

Include scripts in your skill when:
- The same code would be rewritten repeatedly by the agent
- Deterministic reliability is critical (e.g., file manipulation, API calls)
- Complex logic benefits from being pre-tested rather than generated each time
- The operation has a self-contained purpose that can evolve independently
- Testability matters — scripts can be unit tested and validated
- Predictable behavior is preferred over dynamic generation

Scripts enable evolution: even simple operations benefit from being implemented as scripts when they may grow in complexity, need consistent behavior across invocations, or require future extensibility.

### Security Considerations

- Scripts rely on existing credential helpers (no credential storage)
- Include `--force` flags only for destructive operations
- Warn users before irreversible actions
- Document any network operations or external calls

## Writing High-Impact Skills

### Focus on What Copilot Doesn't Know

Do not include information Copilot already knows from its training data — standard language syntax, common library usage, or well-documented API behavior. Every line in a skill should teach something Copilot would otherwise get wrong or miss entirely. If the information is on the first page of official docs, leave it out. Focus on internal conventions, non-obvious defaults, version-specific quirks, and domain-specific workflows that change Copilot's behavior.

### Context Budget Awareness

All skill descriptions share a limited portion of the available context window during discovery. Your description competes with every other installed skill for Copilot's attention. Keep descriptions concise and keyword-dense — aim for the shortest text that still communicates WHAT, WHEN, and relevant KEYWORDS. Verbose descriptions don't just waste your own budget; they reduce visibility for every other skill in the system.

### Gotchas Are Your Highest-Signal Content

The `## Gotchas` section is consistently the most valuable part of any skill — proactive warnings that prevent mistakes before they happen. This is distinct from `## Troubleshooting`, which provides reactive fixes after something goes wrong. Treat gotchas as a living section: every time Copilot produces a wrong result, add a gotcha. Bold the key constraint, then explain why (e.g., "**Never** call `X()` without checking `Y` first — the SDK throws an unrecoverable error").

### Prefer Flexible Guidelines Over Rigid Steps

Use numbered steps only for concrete, repeatable procedures (build, deploy, environment setup) where the sequence genuinely matters. For open-ended tasks (debugging, refactoring, code review), provide decision criteria and reference information instead — Copilot needs flexibility to adapt to the user's specific situation.

```markdown
# ❌ Too rigid
1. Open the file at src/api/handlers.ts
2. Find the function named processOrder
3. Add a try-catch block around lines 45-60

# ✅ Flexible
When fixing error handling in API handlers:
- Ensure all database operations have proper error handling
- Use the project's ErrorHandler utility (see ./references/error-handling.md)
- Log errors with enough context to debug in production
```

### Use Progressive Disclosure for Large Skills

If your SKILL.md exceeds ~200 lines, consider splitting detailed content into subdirectories. This reduces context consumption — Copilot loads only the core instructions initially and pulls reference material on demand.

```markdown
## Reference Files

- `references/api.md` — complete function signatures and return types
- `references/error-codes.md` — every error code this service can return
- `scripts/validate.sh` — run this after making changes to verify correctness

Read these files as needed for your current task. Do not read them all upfront.
```

## Common Patterns

### Parameter Table Pattern

Document parameters clearly:

```markdown
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--input` | Yes | - | Input file or URL to process |
| `--action` | Yes | - | Action to perform |
| `--verbose` | No | `false` | Enable verbose output |
```

### Workflow Execution Pattern

When executing multi-step workflows, create a TODO list where each step references the relevant documentation:

```markdown
## TODO
- [ ] Step 1: Configure environment - see [workflow-setup.md](./references/workflow-setup.md#environment)
- [ ] Step 2: Build project - see [workflow-setup.md](./references/workflow-setup.md#build)
- [ ] Step 3: Deploy to staging - see [workflow-deployment.md](./references/workflow-deployment.md#staging)
- [ ] Step 4: Run validation - see [workflow-deployment.md](./references/workflow-deployment.md#validation)
- [ ] Step 5: Deploy to production - see [workflow-deployment.md](./references/workflow-deployment.md#production)
```

This ensures traceability and allows resuming workflows if interrupted.

## Validation Checklist

Before publishing a skill:

- [ ] `SKILL.md` has valid frontmatter with `name` and `description`
- [ ] `name` is lowercase with hyphens, ≤64 characters
- [ ] `description` clearly states **WHAT** it does, **WHEN** to use it, and relevant **KEYWORDS**
- [ ] `description` is concise and keyword-dense (respects context budget)
- [ ] Body focuses on information Copilot wouldn't know from training data
- [ ] Body includes when to use, prerequisites (if applicable), and core instructions
- [ ] `## Gotchas` section present if skill involves non-obvious behavior, API quirks, or common traps
- [ ] SKILL.md body under 500 lines (consider splitting into `references/` at ~200 lines; 500 is the hard maximum)
- [ ] Large workflows (>5 steps) split into `references/` folder with clear links from SKILL.md
- [ ] Scripts include help documentation and error handling
- [ ] Relative paths used for all resource references
- [ ] No hardcoded credentials or secrets

## Related Resources

- [Agent Skills Specification](https://agentskills.io/)
- [VS Code Agent Skills Documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Reference Skills Repository](https://github.com/anthropics/skills)
- [Awesome Copilot Skills](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md)
