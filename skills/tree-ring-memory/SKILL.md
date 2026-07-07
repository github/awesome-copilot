---
name: tree-ring-memory
description: 'Use Tree Ring Memory as a local-first memory lifecycle layer for coding agents. Helps GitHub Copilot recall project decisions, store evidence-backed lessons, audit memory, forget unsafe data, and keep agent memory from becoming raw transcript storage.'
---

# Tree Ring Memory

Use this skill when the user wants GitHub Copilot to add, use, or reason about
durable project memory with Tree Ring Memory.

Tree Ring Memory is a framework-agnostic, local-first memory lifecycle layer for
AI agents. It stores useful decisions, warnings, preferences, lessons, and
evidence in a project-scoped SQLite/FTS memory root instead of treating raw
conversation transcripts as memory.

Repository: https://github.com/TerminallyLazy/Tree-Ring-Memory

## When To Use

Use this skill when the user asks to:

- remember project decisions, warnings, or workflow lessons
- recall previous project context before changing code
- add local-first memory to a coding-agent workflow
- audit, consolidate, redact, supersede, or forget stored memory
- capture evidence-backed outcomes from tests, evaluations, incidents, or PRs
- sync concise guidance from DOX `AGENTS.md` files or Revolve records
- explain Tree Ring Memory setup or generated `.tree-ring` awareness files

Do not use this skill to store raw chat logs, secrets, credentials, private keys,
tokens, private personal data, or unverified claims as durable truth.

## Install Or Locate Tree Ring

First check whether the project already has Tree Ring Memory configured:

```bash
test -f .tree-ring/SKILL.md && test -f .tree-ring/CLI.md
```

If those files exist, read them before suggesting commands. They are the
project-local source of truth for the installed version.

For a global user install:

```bash
curl -fsSLO https://raw.githubusercontent.com/TerminallyLazy/Tree-Ring-Memory/main/install.sh
less install.sh
sh install.sh
```

For macOS ARM64 with Homebrew:

```bash
brew tap TerminallyLazy/tree-ring
brew install tree-ring
```

For project-local setup with first-run initialization:

```bash
curl -fsSLO https://raw.githubusercontent.com/TerminallyLazy/Tree-Ring-Memory/main/install.sh
less install.sh
sh install.sh --project --init
```

If Tree Ring was installed project-locally, prefer:

```bash
.tree-ring/bin/tree-ring --root .tree-ring --help
```

## Core Workflow

Initialize a memory root:

```bash
tree-ring init
```

Recall before risky or context-dependent work:

```bash
tree-ring recall "release behavior"
tree-ring recall "project startup warnings" --project example-service
```

Remember durable project lessons:

```bash
tree-ring remember "Use project-scoped recall before risky release changes." \
  --event-type lesson \
  --scope project \
  --project example-service \
  --tag release
```

Capture evaluated outcomes with evidence:

```bash
tree-ring evidence "The new workflow fixed stale recall." \
  --outcome promoted \
  --evidence-ref evals/recall/run-042 \
  --project example-service \
  --score 0.91
```

Audit and maintain memory:

```bash
tree-ring audit --audit-type sensitive
tree-ring consolidate --period-type manual --dry-run
tree-ring maintain
tree-ring maintain --apply-expired --repair-fts
```

Forget or remove unsafe memory:

```bash
tree-ring forget mem_example --mode redact --reason "remove sensitive detail"
tree-ring forget mem_example --mode delete --reason "wrong or unsafe memory"
```

## Ring Model

Choose rings deliberately:

- `cambium`: fresh active context
- `outer`: recent decisions and task lessons
- `inner`: older compressed project knowledge
- `heartwood`: durable, high-confidence truths and user preferences
- `scar`: important failures, regressions, rejected approaches, and warnings
- `seed`: unresolved ideas, hypotheses, follow-ups, and future work

Do not promote weak claims to `heartwood`. Prefer `outer` or `seed` unless the
user confirms durability or the evidence is strong.

## Source Adapters

Use source adapters when the repository already contains structured guidance or
evaluated outcomes. Always inspect dry-run output before writing:

```bash
tree-ring dox sync --source-root . --dry-run
tree-ring revolve sync --source-root revolve --dry-run
tree-ring integrations scan --source-root .
```

Imported memory should be concise and source-linked. It never replaces the
authoritative source file, PR, issue, evaluation, or test artifact.

## Privacy And Safety Rules

- Store the lesson, decision, warning, or evidence reference, not the transcript.
- Keep memory project-scoped unless the user explicitly asks for broader scope.
- Redact sensitive details before writing memory.
- Delete or supersede memory that is wrong, stale, unsafe, or replaced by a
  newer decision.
- Do not run sync commands without `--dry-run` first.
- Do not assume a global Tree Ring setup applies when a project-local `.tree-ring`
  root exists.

## Closeout Habit

At the end of meaningful work, ask what should survive:

- What did we decide?
- What did we learn?
- What should future agents avoid repeating?
- What evidence proved the outcome?
- Is anything sensitive and better left unstored?

Only write memory that is durable, useful, privacy-safe, and grounded in user
instruction or source evidence.
