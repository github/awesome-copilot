---
name: acreadiness-generate-instructions
description: 'Generate tailored AI agent instruction files via AgentRC instructions command. Produces .github/copilot-instructions.md (default, recommended for Copilot in VS Code) plus optional per-area .instructions.md files with applyTo globs for monorepos. Use after running /acreadiness-assess to close gaps in the AI Tooling pillar.'
argument-hint: "[--output .github/copilot-instructions.md|AGENTS.md] [--strategy flat|nested] [--areas | --area <name>] [--apply-to <glob>] [--claude-md] [--dry-run]"
---

# /acreadiness-generate-instructions — write AI agent instructions

Use this skill whenever the user wants to **create**, **regenerate**, or **refresh** their custom instructions for AI coding agents (Copilot, Claude, etc.). This is the *Generate* step in AgentRC's **Measure → Generate → Maintain** loop and the single highest-leverage action for the **AI Tooling** pillar.

## Output options

VS Code recognises several instruction file types — AgentRC generates the most common ones:

| File | Scope | When to use |
|---|---|---|
| `.github/copilot-instructions.md` | Always-on, whole workspace | **Default** — VS Code Copilot's native instruction file |
| `AGENTS.md` | Always-on, whole workspace | Multi-agent repos (Copilot + Claude + others) |
| `.github/instructions/*.instructions.md` | Scoped by `applyTo` glob | Per-area / per-language rules in monorepos |
| `CLAUDE.md` | Claude-specific | Add via `--claude-md` (nested only) |

## Strategies

- **`flat`** *(default)* — single `.github/copilot-instructions.md` at the chosen path. Simple, easy to review.
- **`nested`** — hub at `.github/copilot-instructions.md` + per-topic detail files at `.github/instructions/<topic>.instructions.md`, each with an `applyTo` glob so VS Code only loads the topic when it's relevant. Better for large or multi-stack repos.

> **Why `.github/instructions/` and not `.agents/`?** AgentRC's default nested layout writes to `.agents/`, which is the right home for *agent-agnostic* repos (Copilot + Claude + Cursor reading `AGENTS.md`). For VS Code Copilot specifically, the native location is `.github/instructions/` with `applyTo` frontmatter — that's what Copilot auto-discovers. This skill rewrites AgentRC's nested output to the VS Code-native location whenever the main output is `.github/copilot-instructions.md`. If you instead chose `--output AGENTS.md`, nested keeps AgentRC's default `.agents/` layout.

For monorepos, generate **area-scoped** instructions with `--areas`, `--area <name>`, or `--areas-only`. Areas are defined in `agentrc.config.json`. Per-area output is written as VS Code `.instructions.md` files with an `applyTo` glob (see below).

### Topic vs area `.instructions.md` files

Both end up in `.github/instructions/` but they answer different questions:

| Kind | Filename example | `applyTo` example | Where it comes from |
|---|---|---|---|
| **Topic** (nested) | `testing.instructions.md` | `**/*.{test,spec}.{ts,tsx,js}` | AgentRC `--strategy nested` topic split |
| **Area** (monorepo) | `frontend.instructions.md` | `apps/frontend/**` | `agentrc.config.json` areas + `--areas` |

You can have both at once: a nested set of topic files plus per-area files for a monorepo.

## Per-area files with `applyTo`

When the user opts into areas, emit one VS Code-native `.instructions.md` file per area at `.github/instructions/<area>.instructions.md`. Each file MUST start with frontmatter declaring the glob the rules apply to:

```markdown
---
applyTo: "apps/frontend/**"
---

# Frontend area instructions

…AgentRC-generated content for this area…
```

Workflow:

1. **Read `agentrc.config.json`** to discover declared areas and their `paths` / globs. If `paths` is missing, ask the user for the glob (e.g. `src/api/**`).
2. **Run `agentrc instructions --areas`** (or `--area <name>`) to produce the per-area body content.
3. **Wrap each area's content** in `.github/instructions/<area>.instructions.md` with the `applyTo` frontmatter taken from the area's `paths`. If the user passed `--apply-to <glob>` on a single-area call, use that glob verbatim.
4. **Leave the main file alone** — the root `.github/copilot-instructions.md` stays as the always-on instructions; `.instructions.md` files only kick in for matching paths.

Naming: lowercase, kebab-case area name. Examples: `.github/instructions/frontend.instructions.md`, `.github/instructions/api.instructions.md`, `.github/instructions/infra.instructions.md`.

## Steps

1. **Pick the target file**. **Default to `.github/copilot-instructions.md`.** Switch to `AGENTS.md` only if the user mentions multi-agent / Claude / Cursor support.
2. **Always ask which strategy to use** — `flat` or `nested` — unless the user already specified one in their message or via `--strategy`. Present the trade-off briefly:
   - **Flat** *(default)* — one `.github/copilot-instructions.md`. Simple, easy to review in a single PR. Best for small/medium repos with one stack.
   - **Nested** — hub `.github/copilot-instructions.md` + per-topic `.github/instructions/<topic>.instructions.md` files (each with an `applyTo` glob so VS Code only loads them when relevant). Best for large or multi-stack repos. Add `--claude-md` to also emit `CLAUDE.md`.
   Recommend `nested` proactively when the repo has > 5 top-level directories, multiple stacks, or already uses a monorepo tool (turbo/nx/pnpm workspaces).
3. **Detect monorepo areas** by reading `agentrc.config.json`. If areas exist, ask the user whether they want **per-area `.instructions.md` files with `applyTo`** in addition to the root file. Default to "yes" when `agentrc.config.json` declares areas.
4. **Run dry-run first** so the user can preview:
   ```bash
   npx -y github:microsoft/agentrc instructions --output <file> --strategy <flat|nested> [--areas|--area <name>] [--claude-md] --dry-run
   ```
5. **Show a short summary** of what would change — files that would be created or overwritten, area count + their `applyTo` globs, model used (default `claude-sonnet-4.6`).
6. **On confirmation, run the same command without `--dry-run`** (and optionally `--force` if files already exist).
7. **Post-process layout for Copilot output**:
   - **If `--output` ends in `copilot-instructions.md` and strategy is `nested`**: move/rewrite AgentRC's `.agents/<topic>.md` files to `.github/instructions/<topic>.instructions.md`. Add frontmatter to each file with an appropriate `applyTo` glob (see "Topic applyTo defaults" below). Delete the now-empty `.agents/` directory.
   - **If `--areas` was used**: also write `.github/instructions/<area>.instructions.md` for every area, using each area's `paths` from `agentrc.config.json` as the `applyTo` glob (override with `--apply-to` for single-area calls).
   - **If `--output AGENTS.md`** was chosen: keep AgentRC's native `.agents/` layout for nested — agent-agnostic readers expect it there.
   Create the `.github/instructions/` directory if missing.

### Topic `applyTo` defaults

When promoting AgentRC's nested topic files to `.instructions.md`, use these defaults unless the user specifies otherwise:

| Topic | Default `applyTo` |
|---|---|
| `testing` | `**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}` |
| `style` / `code-quality` / `formatting` | `**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,java,kt,cs}` |
| `build` / `ci` | `**/{package.json,turbo.json,nx.json,.github/workflows/**}` |
| `docs` | `**/*.md` |
| `security` | `**` |
| anything else / hub-level | `**` |
8. **Verify** by reading the generated file(s) back and showing the user a 1-paragraph synopsis: stack detected, conventions captured, length, list of `.instructions.md` files with their globs.
9. **Suggest next steps**:
   - Re-run the `assess` skill to confirm the AI Tooling pillar score improved.
   - If the user already has both `copilot-instructions.md` and `AGENTS.md`, recommend consolidating to a single source of truth (AgentRC flags this at maturity Level 2+).

## Notes

- AgentRC reads your **actual code** — no templates. Output reflects detected languages, frameworks, and conventions.
- `--claude-md` (nested strategy only) also emits `CLAUDE.md`.
- VS Code applies `.instructions.md` files automatically when the active file matches `applyTo`. The root `.github/copilot-instructions.md` always loads.
- Never run this skill non-interactively in CI; instructions are part of the repo and should land via PR.
