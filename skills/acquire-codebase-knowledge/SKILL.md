---
name: acquire-codebase-knowledge
description: 'Use this skill when the user explicitly asks to map, document, or onboard into an existing codebase. Trigger for prompts like "map this codebase", "document this architecture", "onboard me to this repo", or "create codebase docs". Do not trigger for routine feature implementation, bug fixes, or narrow code edits unless the user asks for repository-level discovery.'
license: MIT
compatibility: 'Cross-platform. Preferred: run scripts/scan.sh with Bash. On Windows without Bash, run equivalent PowerShell discovery commands and keep the same output contract. Requires git and standard shell tooling.'
metadata:
  version: "1.2"
argument-hint: 'Optional: specific area to focus on, e.g. "architecture only", "testing and concerns"'
---

# Acquire Codebase Knowledge

Produces seven populated documents in `docs/codebase/` covering everything needed to work effectively on the project. Only document what is verifiable from files or terminal output — never infer or assume.

## Output Contract (Required)

Before finishing, all of the following must be true:

1. Exactly these files exist in `docs/codebase/`: `STACK.md`, `STRUCTURE.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`, `TESTING.md`, `CONCERNS.md`.
2. Every claim is traceable to source files, config, or terminal output.
3. Unknowns are marked as `[TODO]`; intent-dependent decisions are marked `[ASK USER]`.
4. Every document includes a short "evidence" list with concrete file paths.
5. Final response includes numbered `[ASK USER]` questions and intent-vs-reality divergences.

## Workflow

Copy and track this checklist:

```
- [ ] Phase 1: Run scan, read intent documents
- [ ] Phase 2: Investigate each documentation area
- [ ] Phase 3: Populate all seven docs in docs/codebase/
- [ ] Phase 4: Validate docs, present findings, resolve all [ASK USER] items
```

## Focus Area Mode

If the user supplies a focus area (for example: "architecture only" or "testing and concerns"):

1. Always run Phase 1 in full.
2. Fully complete focus-area documents first.
3. For non-focus documents not yet analyzed, keep required sections present and mark unknowns as `[TODO]`.
4. Still run the Phase 4 validation loop on all seven documents before final output.

### Phase 1: Scan and Read Intent

1. Set `SKILL_ROOT` to the absolute path of the skill folder (the directory containing this `SKILL.md`), then run the bundled script from the **target project root**:
   ```bash
   export SKILL_ROOT="/absolute/path/to/skills/acquire-codebase-knowledge"
   bash "$SKILL_ROOT/scripts/scan.sh" --output docs/codebase/.codebase-scan.txt
   ```
   Keep your working directory as the target repository root so the scan covers that codebase, not the skill folder itself.

   **Windows fallback (limited — use only if Bash is unavailable):** The following produces a file listing only and does **not** include manifest previews, git churn, TODO/FIXME counts, or environment variable templates. Downstream phases will have reduced context.
   ```powershell
   New-Item -ItemType Directory -Force -Path docs/codebase | Out-Null
   Get-ChildItem -Recurse -File | Select-Object -First 200 FullName | Out-File docs/codebase/.codebase-scan.txt
   ```
2. Search for `PRD`, `TRD`, `README`, `ROADMAP`, `SPEC`, `DESIGN` files and read them.
3. Summarise the stated project intent before reading any source code.

### Phase 2: Investigate

Use the scan output to answer questions for each of the seven templates. Load [`references/inquiry-checkpoints.md`](references/inquiry-checkpoints.md) for the full per-template question list.

If the stack is ambiguous (multiple manifest files, unfamiliar file types, no `package.json`), load [`references/stack-detection.md`](references/stack-detection.md).

### Phase 3: Populate Templates

Copy each template from `assets/templates/` into `docs/codebase/`. Fill in this order:

1. [STACK.md](assets/templates/STACK.md) — language, runtime, frameworks, all dependencies
2. [STRUCTURE.md](assets/templates/STRUCTURE.md) — directory layout, entry points, key files
3. [ARCHITECTURE.md](assets/templates/ARCHITECTURE.md) — layers, patterns, data flow
4. [CONVENTIONS.md](assets/templates/CONVENTIONS.md) — naming, formatting, error handling, imports
5. [INTEGRATIONS.md](assets/templates/INTEGRATIONS.md) — external APIs, databases, auth, monitoring
6. [TESTING.md](assets/templates/TESTING.md) — frameworks, file organization, mocking strategy
7. [CONCERNS.md](assets/templates/CONCERNS.md) — tech debt, bugs, security risks, perf bottlenecks

Use `[TODO]` for anything that cannot be determined from code. Use `[ASK USER]` where the right answer requires team intent.

### Phase 4: Validate, Repair, Verify

Run this mandatory validation loop before finalizing:

1. Validate each doc against `references/inquiry-checkpoints.md`.
2. For each non-trivial claim, confirm at least one evidence reference exists.
3. If any required section is missing or unsupported:
  - Fix the document.
  - Re-run validation.
4. Repeat until all seven docs pass.

Then present a summary of all seven documents, list every `[ASK USER]` item as a numbered question, and highlight any Intent vs. Reality divergences from Phase 1.

Validation pass criteria:

- No unsupported claims.
- No empty required sections.
- Unknowns use `[TODO]` rather than assumptions.
- Team-intent gaps are explicitly marked `[ASK USER]`.

---

## Gotchas

**Monorepos:** Root `package.json` may have no source — check for `workspaces`, `packages/`, or `apps/` directories. Each workspace may have independent dependencies and conventions. Map each sub-package separately.

**Outdated README:** README often describes intended architecture, not the current one. Cross-reference with actual file structure before treating any README claim as fact.

**TypeScript path aliases:** `tsconfig.json` `paths` config means imports like `@/foo` don't map directly to the filesystem. Map aliases to real paths before documenting structure.

**Generated/compiled output:** Never document patterns from `dist/`, `build/`, `generated/`, `.next/`, `out/`, or `__pycache__/`. These are artefacts — document source conventions only.

**`.env.example` reveals required config:** Secrets are never committed. Read `.env.example`, `.env.template`, or `.env.sample` to discover required environment variables.

**`devDependencies` ≠ production stack:** Only `dependencies` (or equivalent, e.g. `[tool.poetry.dependencies]`) runs in production. Document linters, formatters, and test frameworks separately as dev tooling.

**Test TODOs ≠ production debt:** TODOs inside `test/`, `tests/`, `__tests__/`, or `spec/` are coverage gaps, not production technical debt. Separate them in `CONCERNS.md`.

**High-churn files = fragile areas:** Files appearing most in recent git history have the highest modification rate and likely hidden complexity. Always note them in `CONCERNS.md`.

---

## Anti-Patterns

| ❌ Don't | ✅ Do instead |
|---------|--------------|
| "Uses Clean Architecture with Domain/Data layers." (when no such directories exist) | State only what directory structure actually shows. |
| "This is a Next.js project." (without checking `package.json`) | Check `dependencies` first. State what's actually there. |
| Guess the database from a variable name like `dbUrl` | Check manifest for `pg`, `mysql2`, `mongoose`, `prisma`, etc. |
| Document `dist/` or `build/` naming patterns as conventions | Source files only. |

---

## Bundled Assets

| Asset | When to load |
|-------|-------------|
| [`scripts/scan.sh`](scripts/scan.sh) | Phase 1 — run first, before reading any code |
| [`references/inquiry-checkpoints.md`](references/inquiry-checkpoints.md) | Phase 2 — load for per-template investigation questions |
| [`references/stack-detection.md`](references/stack-detection.md) | Phase 2 — only if stack is ambiguous |
| [`assets/templates/STACK.md`](assets/templates/STACK.md) | Phase 3 step 1 |
| [`assets/templates/STRUCTURE.md`](assets/templates/STRUCTURE.md) | Phase 3 step 2 |
| [`assets/templates/ARCHITECTURE.md`](assets/templates/ARCHITECTURE.md) | Phase 3 step 3 |
| [`assets/templates/CONVENTIONS.md`](assets/templates/CONVENTIONS.md) | Phase 3 step 4 |
| [`assets/templates/INTEGRATIONS.md`](assets/templates/INTEGRATIONS.md) | Phase 3 step 5 |
| [`assets/templates/TESTING.md`](assets/templates/TESTING.md) | Phase 3 step 6 |
| [`assets/templates/CONCERNS.md`](assets/templates/CONCERNS.md) | Phase 3 step 7 |

Template usage mode:

- Default mode: complete only the "Core Sections (Required)" in each template.
- Extended mode: add optional sections only when the repo complexity justifies them.
