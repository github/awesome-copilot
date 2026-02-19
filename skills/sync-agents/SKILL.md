---
name: sync-agents
description: 'Synchronize GitHub Copilot instructions, custom agents, and skills into detected AI coding agent configurations in this repository. Use when asked to mirror .github/copilot-instructions.md, .github/instructions, .github/agents, or .github/skills into Claude, Codex, Cursor, Gemini, Windsurf, and related tooling.'
---

# Sync Agent Instructions, Agents, and Skills

Mirror all GitHub Copilot customizations — instructions, custom agents, and agent skills —
into every detected AI coding agent configuration found in this repository.

This instruction supports **12 agent ecosystems**. Rather than creating files for every
agent unconditionally, it **detects which agents are already configured** in the repo and
syncs only those.

**Source locations (Copilot / source of truth):**

- `.github/copilot-instructions.md` — global instructions
- `.github/instructions/*.instructions.md` — path-scoped instructions
- `.github/agents/*.agent.md` — custom agent profiles
- `.github/skills/<name>/SKILL.md` — agent skills (open standard)

## Your Task

Execute the following steps **in order**, creating or overwriting files as needed.
Never delete `.github/copilot-instructions.md` or anything inside `.github/`.

---

### Step 1 — Read the source of truth

Read `.github/copilot-instructions.md` and store its full content.

If the file does not exist, stop and tell the user:

> "No `.github/copilot-instructions.md` found. Please create this file first — it is the source of truth for all AI agent instructions."

Also scan and store the contents of:

- **`.github/instructions/`** — any `*.instructions.md` files. For each, record the filename, `applyTo` frontmatter glob (if present), and body content.
- **`.github/agents/`** — any `*.agent.md` files. For each, record the full filename, the complete YAML frontmatter block (`name`, `description`, `model`, `tools`, `handoffs`, etc.), and the body prompt.
- **`.github/skills/`** — any subdirectory containing a `SKILL.md` file. For each skill, record the directory name, the complete `SKILL.md` frontmatter (`name`, `description`, `user-invokable`, `disable-model-invocation`, etc.), the body content, and note any additional bundled asset files (scripts, examples, references) present in that directory.

---

### Step 2 — Detect active agents

Scan the repository root for the presence of the following files and directories.
For each one found, mark that agent as **active** and include it in subsequent sync steps.
**Do not create** directories or files for agents that are not already present.

| Agent               | Detection Signal(s)                                  | Category          |
| ------------------- | ---------------------------------------------------- | ----------------- |
| **Claude Code**     | `CLAUDE.md` at repo root **or** `.claude/` directory | Full sync         |
| **Gemini CLI**      | `GEMINI.md` at repo root **or** `.gemini/` directory | Full sync         |
| **OpenAI Codex**    | `AGENTS.md` at repo root **or** `.agents/` directory | Full sync         |
| **OpenCode**        | `.opencode/` directory **or** `.opencode.json`       | Full sync         |
| **Cursor**          | `.cursor/` directory **or** `.cursorrules` file      | Full sync         |
| **Windsurf**        | `.windsurf/` directory **or** `.windsurfrules` file  | Full sync         |
| **Cline**           | `.clinerules` file **or** `.clinerules/` directory   | Full sync         |
| **Roo Code**        | `.roo/` directory **or** `.roorules` file            | Full sync         |
| **Kilo Code**       | `.kilocode/` directory                               | Full sync         |
| **JetBrains Junie** | `.junie/` directory                                  | Full sync         |
| **Zed**             | `.rules` file at repo root                           | Instructions only |
| **Augment Code**    | `.augment/` directory                                | Full sync         |

If **no agents are detected**, tell the user:

> "No agent configuration directories or files were detected in this repository. To enable syncing, initialize at least one agent's configuration (e.g., create a `CLAUDE.md` file, a `.cursor/` directory, etc.) and re-run this command."

List the detected agents before proceeding:

```
🔍 Detected agents: <comma-separated list of detected agent names>
   Skipping (not detected): <comma-separated list of undetected agent names>
```

---

### Step 3 — Sync instructions to detected agents

For each agent marked as **active** in Step 2, sync the global instructions and any
path-scoped instructions using the agent-specific format described below.

Every synced file must include a **sync header** (as a comment appropriate to the format)
indicating:

- The file is auto-synced and should not be edited directly
- The source of truth path (`.github/copilot-instructions.md` or the specific instructions file)
- How to re-sync (`/sync-agents`)

---

#### 3A — Claude Code

**Global instructions → `CLAUDE.md`**

Create or overwrite `CLAUDE.md` at the repo root:

```markdown
<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  AUTO-SYNCED — DO NOT EDIT THIS FILE DIRECTLY               ║
  ║  Source of truth: .github/copilot-instructions.md           ║
  ║  To update: run /sync-agents                                ║
  ╚══════════════════════════════════════════════════════════════╝
-->

# Claude Code Instructions

> **Source of truth:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
>
> This file is automatically generated by the `/sync-agents` command.
> To propagate changes, update `.github/copilot-instructions.md` and re-run that command.

---

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.claude/instructions/`**

If path-specific `.github/instructions/*.instructions.md` files exist, create matching
files in `.claude/instructions/` with a sync header comment. Strip the `applyTo` frontmatter
(Claude Code does not use it) but preserve it as a markdown comment for context.

---

#### 3B — Gemini CLI

**Global instructions → `GEMINI.md`**

Gemini CLI supports `@path/to/file.md` import syntax for dynamic loading at runtime.

```markdown
<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  SOURCE OF TRUTH: .github/copilot-instructions.md           ║
  ║  This file uses Gemini CLI's native @import syntax so it    ║
  ║  always loads the latest copilot instructions at runtime.   ║
  ║  Run /sync-agents to update path-specific files.            ║
  ╚══════════════════════════════════════════════════════════════╝
-->

# Gemini CLI Instructions

> **Source of truth:** `.github/copilot-instructions.md`
> This file dynamically imports from Copilot's instruction file using Gemini's
> `@file` syntax. Any edits to `.github/copilot-instructions.md` are reflected
> here automatically — no manual sync required.

@.github/copilot-instructions.md
```

**Path-scoped instructions:** Append additional `@` imports, one per line. If any have
`applyTo` targeting a subdirectory, create matching `GEMINI.md` files in those directories
using the same `@` import syntax pointing back to `.github/instructions/`.

---

#### 3C — OpenAI Codex

**Global instructions → `AGENTS.md`**

```markdown
<!--
  ╔══════════════════════════════════════════════════════════════╗
  ║  AUTO-SYNCED — DO NOT EDIT THIS FILE DIRECTLY               ║
  ║  Source of truth: .github/copilot-instructions.md           ║
  ║  To update: run /sync-agents                                ║
  ╚══════════════════════════════════════════════════════════════╝
-->

# Codex Agent Instructions

> **Source of truth:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
>
> This file is automatically generated by the `/sync-agents` command.
> To propagate changes, update `.github/copilot-instructions.md` and re-run that command.

---

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions:** For each `.github/instructions/*.instructions.md` with an
`applyTo` targeting a subdirectory, create a corresponding `AGENTS.md` inside that subdirectory.
Codex reads one `AGENTS.md` per directory level and merges top-down.

---

#### 3D — OpenCode

OpenCode **reuses `AGENTS.md`** at the repo root (same as Codex). If `AGENTS.md` was already
written in Step 3C, OpenCode will automatically pick it up — no additional file needed.

If OpenCode is detected but Codex is NOT, write `AGENTS.md` using the same format as Step 3C.

**Custom commands:** If `.github/skills/` contains skills, optionally create matching
`.opencode/commands/<skill-name>.md` files containing the skill's body content as a
reusable prompt. Prepend each with a sync header comment.

---

#### 3E — Cursor

**Global instructions → `.cursor/rules/global-instructions.mdc`**

Cursor uses `.mdc` files (Markdown with YAML frontmatter) in `.cursor/rules/`.

```markdown
---
# AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly
# Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents
description: "Global project instructions synced from GitHub Copilot"
alwaysApply: true
---

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.cursor/rules/<name>.mdc`**

For each `.github/instructions/<name>.instructions.md`, create `.cursor/rules/<name>.mdc`:

- Set `description` from the filename or first heading
- Set `globs` from the `applyTo` frontmatter value (if present)
- Set `alwaysApply: false` (the glob handles activation)
- Write the body content after the frontmatter

---

#### 3F — Windsurf

**Global instructions → `.windsurf/rules/global-instructions.md`**

Windsurf uses plain Markdown files in `.windsurf/rules/`.

```markdown
<!-- AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly -->
<!-- Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents -->

# Global Project Instructions

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.windsurf/rules/<name>.md`**

For each `.github/instructions/<name>.instructions.md`, create a matching `.md` file
with sync header and body content.

---

#### 3G — Cline

**Global instructions → `.clinerules/global-instructions.md`**

Cline reads Markdown files from the `.clinerules/` directory. If only a `.clinerules` file
(not directory) exists, convert it to a directory first by moving the existing file to
`.clinerules/_original.md`, then proceed.

```markdown
<!-- AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly -->
<!-- Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents -->

# Global Project Instructions

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.clinerules/<name>.md`**

For each `.github/instructions/<name>.instructions.md`, create a matching `.md` file.

---

#### 3H — Roo Code

**Global instructions → `.roo/rules/global-instructions.md`**

Roo Code reads `.md` files recursively from `.roo/rules/` in alphabetical order.

```markdown
<!-- AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly -->
<!-- Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents -->

# Global Project Instructions

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.roo/rules/<name>.md`**

For each `.github/instructions/<name>.instructions.md`, create a matching `.md` file.

---

#### 3I — Kilo Code

**Global instructions → `.kilocode/rules/global-instructions.md`**

Kilo Code reads Markdown files from `.kilocode/rules/`.

```markdown
<!-- AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly -->
<!-- Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents -->

# Global Project Instructions

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.kilocode/rules/<name>.md`**

For each `.github/instructions/<name>.instructions.md`, create a matching `.md` file.

---

#### 3J — JetBrains Junie

**All instructions → `.junie/guidelines.md`**

Junie uses a single `guidelines.md` file. Concatenate all instructions into one file.

```markdown
<!-- AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly -->
<!-- Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents -->

# Project Guidelines

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]

---

<!-- Path-scoped instructions follow (if any) -->

[FOR EACH .github/instructions/*.instructions.md, INSERT:]

## [filename context / applyTo info]

[body content]
```

Since Junie only reads a single file, all path-scoped instructions are appended to the
same file with clear section headers.

---

#### 3K — Zed

**Global instructions → `.rules`**

Zed reads a `.rules` file at the project root. It is plain text (no frontmatter).

```
# AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly
# Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

Zed also auto-detects `.cursorrules`, `.windsurfrules`, `AGENTS.md`, `CLAUDE.md`, and
`GEMINI.md` — so if those files were written by earlier steps, Zed gets additional coverage
automatically.

Path-scoped instructions are **not supported** by Zed's `.rules` format. If path-scoped
instructions exist, append a note:

```
# NOTE: Path-scoped instructions exist in .github/instructions/ but cannot be
# represented in Zed's .rules format. See those files for directory-specific guidance.
```

---

#### 3L — Augment Code

**Global instructions → `.augment/rules/global-instructions.md`**

Augment Code uses Markdown files with optional YAML frontmatter in `.augment/rules/`.

```markdown
---
# AUTO-SYNCED from .github/copilot-instructions.md — do not edit directly
# Source of truth: .github/copilot-instructions.md | Re-sync: /sync-agents
always_apply: true
---

# Global Project Instructions

[INSERT FULL CONTENT OF .github/copilot-instructions.md HERE]
```

**Path-scoped instructions → `.augment/rules/<name>.md`**

For each `.github/instructions/<name>.instructions.md`, create `.augment/rules/<name>.md`:

- Set `always_apply: false` and `agent_requested: true` in the YAML frontmatter
- Include a `description` derived from the filename or `applyTo` value
- Write the body content after the frontmatter

---

### Step 4 — Sync custom agents (where supported)

Custom agent profiles (`.github/agents/*.agent.md`) can only be synced to agents
that support sub-agent profiles. Currently, only **Claude Code** supports this.

**If Claude Code is active:**

For each `.github/agents/<name>.agent.md`:

1. Create `.claude/agents/<name>.md` (drop the `.agent` infix)
2. Write the full YAML frontmatter block verbatim, adding these YAML comments after `---`:
   ```
   # AUTO-SYNCED from .github/agents/<name>.agent.md — do not edit directly
  # Source of truth: .github/agents/ | Re-sync: /sync-agents
   ```
3. Write the body prompt verbatim after the closing `---`

**All other agents:** No sub-agent profile concept exists. Skip agent syncing.

---

### Step 5 — Sync agent skills (where supported)

Agent Skills use an open standard (`SKILL.md` with YAML frontmatter). The format is
identical across Copilot, Claude Code, and Codex — only the storage path differs.

| Tool                    | Skills path                      | Supported?           |
| ----------------------- | -------------------------------- | -------------------- |
| GitHub Copilot (source) | `.github/skills/<name>/SKILL.md` | ✅ Source            |
| Claude Code             | `.claude/skills/<name>/SKILL.md` | ✅ If detected       |
| OpenAI Codex / OpenCode | `.agents/skills/<name>/SKILL.md` | ✅ If detected       |
| All others              | —                                | ❌ No skills concept |

For each `.github/skills/<skill-name>/` directory:

**If Claude Code is active:**

1. Create `.claude/skills/<skill-name>/` directory
2. Write `SKILL.md` verbatim with a YAML sync comment
3. Copy any bundled asset files as-is

**If Codex or OpenCode is active:**

1. Create `.agents/skills/<skill-name>/` directory
2. Write `SKILL.md` verbatim with a YAML sync comment
3. Copy any bundled asset files as-is

**Important — `name` field constraint:** The `name` field in SKILL.md frontmatter must
exactly match the parent directory name. Do not rename directories or alter the field.

**Gemini CLI (if active):** Append a note to `GEMINI.md`:

```markdown
<!-- NOTE: Agent Skills are not supported by Gemini CLI. -->
<!-- Skills available in this repo: <comma-separated skill names> -->
<!-- See .github/skills/ for skill definitions usable by Copilot, Claude, and Codex. -->
```

**All others:** No skills concept. Skip.

---

### Step 6 — Verify and report

After writing all files, list every file created or updated, grouped by agent:

```
✅ Sync complete.

🔍 Detected agents: <list>
📁 Source of truth: .github/ (copilot-instructions.md, agents/, skills/, instructions/)

Files written:

  [Agent Name]
    - <file path>                              (<description>)
    ...

  [Agent Name]
    - <file path>                              (<description>)
    ...

  SKIPPED (not detected in repo):
    - <agent name>: <detection signal not found>
    ...

To keep all agents in sync, run /sync-agents after any .github/ update.
```

---

## Sync Coverage Reference

### Instructions

| Agent           | Primary File                      | Format                 | Sync Method         |
| --------------- | --------------------------------- | ---------------------- | ------------------- |
| GitHub Copilot  | `.github/copilot-instructions.md` | Markdown               | **Source of truth** |
| Claude Code     | `CLAUDE.md`                       | Markdown               | Full copy           |
| Gemini CLI      | `GEMINI.md`                       | Markdown + `@imports`  | Live import         |
| OpenAI Codex    | `AGENTS.md`                       | Markdown               | Full copy           |
| OpenCode        | `AGENTS.md` (shared w/ Codex)     | Markdown               | Full copy           |
| Cursor          | `.cursor/rules/*.mdc`             | MDC (Markdown + YAML)  | Translated          |
| Windsurf        | `.windsurf/rules/*.md`            | Markdown               | Full copy           |
| Cline           | `.clinerules/*.md`                | Markdown               | Full copy           |
| Roo Code        | `.roo/rules/*.md`                 | Markdown               | Full copy           |
| Kilo Code       | `.kilocode/rules/*.md`            | Markdown               | Full copy           |
| JetBrains Junie | `.junie/guidelines.md`            | Markdown (single file) | Concatenated        |
| Zed             | `.rules`                          | Plain text             | Full copy           |
| Augment Code    | `.augment/rules/*.md`             | Markdown + YAML        | Translated          |

### Custom Agents

| Agent          | Path                        | Notes                             |
| -------------- | --------------------------- | --------------------------------- |
| GitHub Copilot | `.github/agents/*.agent.md` | **Source of truth**               |
| Claude Code    | `.claude/agents/*.md`       | Copied at sync; format-compatible |
| All others     | ❌ Not supported            | No sub-agent profile concept      |

### Skills (Open Standard)

| Agent                   | Path                          | Notes               |
| ----------------------- | ----------------------------- | ------------------- |
| GitHub Copilot          | `.github/skills/<n>/SKILL.md` | **Source of truth** |
| Claude Code             | `.claude/skills/<n>/SKILL.md` | Verbatim copy       |
| OpenAI Codex / OpenCode | `.agents/skills/<n>/SKILL.md` | Verbatim copy       |
| All others              | ❌ Not supported              | No skills concept   |

---

## Docs references

- **GitHub Copilot** custom instructions: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- **GitHub Copilot** custom agents: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents
- **GitHub Copilot** agent skills: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills
- **Claude Code** memory/instructions: https://docs.anthropic.com/en/docs/claude-code/memory
- **Claude Code** sub-agents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- **Gemini CLI** GEMINI.md + `@import`: https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html
- **OpenAI Codex** AGENTS.md: https://developers.openai.com/codex/guides/agents-md/
- **OpenAI Codex** skills: https://developers.openai.com/codex/skills/
- **OpenCode** AGENTS.md + commands: https://opencode.ai/docs/customization
- **Cursor** rules: https://docs.cursor.com/context/rules-for-ai
- **Windsurf** rules: https://docs.windsurf.com/windsurf/customize#rules
- **Cline** custom instructions: https://docs.cline.bot/improving-your-workflow/cline-rules
- **Roo Code** custom instructions: https://docs.roocode.com/features/custom-instructions
- **Kilo Code** custom rules: https://kilo.ai/docs/features/custom-rules
- **JetBrains Junie** guidelines: https://www.jetbrains.com/help/junie/guidelines.html
- **Zed** rules: https://zed.dev/docs/ai/rules
- **Augment Code** rules: https://docs.augmentcode.com/using-augment/augment-rules
- **VS Code** custom agents (cross-tool format compatibility): https://code.visualstudio.com/docs/copilot/customization/custom-agents
