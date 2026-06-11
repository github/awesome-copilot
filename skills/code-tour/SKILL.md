---
name: code-tour
description: >
  Use this skill to create CodeTour .tour files — persona-targeted, step-by-step walkthroughs
  that link to real files and line numbers. Trigger for: "create a tour", "make a code tour",
  "generate a tour", "onboarding tour", "tour for this PR", "tour for this bug", "RCA tour",
  "architecture tour", "explain how X works", "vibe check", "PR review tour",
  "contributor guide", "help someone ramp up", or any request for a structured walkthrough
  through code. Supports 20 developer personas (new joiner, bug fixer, architect, PR reviewer,
  vibecoder, security reviewer, and more), all CodeTour step types (file/line, selection,
  pattern, uri, commands, view), and tour-level fields (ref, isPrimary, nextTour).
  Works with any repository in any language.
---

# Code Tour Skill

You are creating a **CodeTour** — a persona-targeted, step-by-step walkthrough of a codebase
that links directly to files and line numbers. CodeTour files live in `.tours/` and work with
the [VS Code CodeTour extension](https://github.com/microsoft/codetour).

Two scripts are bundled in `scripts/`:

- **`scripts/validate_tour.py`** — run after writing any tour. Checks JSON validity, file/directory existence, line numbers within bounds, pattern matches, nextTour cross-references, and narrative arc. Run it: `python ~/.agents/skills/code-tour/scripts/validate_tour.py .tours/<name>.tour --repo-root .`
- **`scripts/generate_from_docs.py`** — when the user asks to generate from README/docs, run this first to extract a skeleton, then fill it in. Run it: `python ~/.agents/skills/code-tour/scripts/generate_from_docs.py --persona new-joiner --output .tours/skeleton.tour`

Two reference files are bundled:

- **`references/codetour-schema.json`** — the authoritative JSON schema. Read it to verify any field name or type. Every field you use must conform to it.
- **`references/examples.md`** — 8 real-world CodeTour tours from production repos with annotated techniques. Read it when you want to see how a specific feature (`commands`, `selection`, `view`, `pattern`, `isPrimary`, multi-tour series) is used in practice.

### Real-world `.tour` files on GitHub

These are confirmed production `.tour` files. Fetch one when you need a working example of a specific step type, tour-level field, or narrative structure — don't write from memory when the real thing is one fetch away.

Find more with the GitHub code search: https://github.com/search?q=path%3A**%2F*.tour+&type=code

#### By step type / technique demonstrated

| What to study | File URL |
|---|---|
| `directory` + `file+line` (contributor onboarding) | https://github.com/coder/code-server/blob/main/.tours/contributing.tour |
| `selection` + `file+line` + intro content step (accessibility project) | https://github.com/a11yproject/a11yproject.com/blob/main/.tours/code-tour.tour |
| Minimal tutorial — tight `file+line` narration for interactive learning | https://github.com/lostintangent/rock-paper-scissors/blob/master/main.tour |
| Multi-tour repo with `nextTour` chaining (cloud native OCI walkthroughs) | https://github.com/lucasjellema/cloudnative-on-oci-2021/blob/main/.tours/introduction.tour |
| `isPrimary: true` (marks the onboarding entry point) | https://github.com/nickvdyck/webbundlr/blob/main/.tours/getting-started.tour |
| `pattern` instead of `line` (regex-anchored steps) | https://github.com/nickvdyck/webbundlr/blob/main/.tours/architecture.tour |

**Raw content tip:** Prefix `raw.githubusercontent.com` and drop `/blob/` for raw JSON access.

A great tour is not just annotated files. It is a **narrative** — a story told to a specific
person about what matters, why it matters, and what to do next. Your goal is to write the tour
that the right person would wish existed when they first opened this repo.

**CRITICAL: Only create `.tour` JSON files. Never create, modify, or scaffold any other files.**

---

## Step 1: Discover the repo

Before asking the user anything, explore the codebase:

- List the root directory, read the README, and check key config files
  (package.json, pyproject.toml, go.mod, Cargo.toml, composer.json, etc.)
- Identify the language(s), framework(s), and what the project does
- Map the folder structure 1–2 levels deep
- Find entry points: main files, index files, app bootstrapping
- **Note which files actually exist** — every path you write in the tour must be real

If the repo is sparse or empty, say so and work with what exists.

**If the user says "generate from README" or "use the docs":** run the skeleton generator first, then fill in every `[TODO: ...]` by reading the actual files:

```bash
python skills/code-tour/scripts/generate_from_docs.py \
  --persona new-joiner \
  --output .tours/skeleton.tour
```

### Entry points by language/framework

Don't read everything — start here, then follow imports.

| Stack | Entry points to read first |
|-------|---------------------------|
| **Node.js / TS** | `index.js/ts`, `server.js`, `app.js`, `src/main.ts`, `package.json` (scripts) |
| **Python** | `main.py`, `app.py`, `__main__.py`, `manage.py` (Django), `app/__init__.py` (Flask/FastAPI) |
| **Go** | `main.go`, `cmd/<name>/main.go`, `internal/` |
| **Rust** | `src/main.rs`, `src/lib.rs`, `Cargo.toml` |
| **Java / Kotlin** | `*Application.java`, `src/main/java/.../Main.java`, `build.gradle` |
| **Ruby** | `config/application.rb`, `config/routes.rb`, `app/controllers/application_controller.rb` |
| **PHP** | `index.php`, `public/index.php`, `bootstrap/app.php` (Laravel) |

### Repo type variants — adjust focus accordingly

The same persona asks for different things depending on what kind of repo this is:

| Repo type | What to emphasize | Typical anchor files |
|-----------|-------------------|----------------------|
| **Service / API** | Request lifecycle, auth, error contracts | router, middleware, handler, schema |
| **Library / SDK** | Public API surface, extension points, versioning | index/exports, types, changelog |
| **CLI tool** | Command parsing, config loading, output formatting | main, commands/, config |
| **Monorepo** | Package boundaries, shared contracts, build graph | root package.json/pnpm-workspace, shared/, packages/ |
| **Framework** | Plugin system, lifecycle hooks, escape hatches | core/, plugins/, lifecycle |
| **Data pipeline** | Source → transform → sink, schema ownership | ingest/, transform/, schema/, dbt models |
| **Frontend app** | Component hierarchy, state management, routing | pages/, store/, router, api/ |

For **monorepos**: identify the 2–3 packages most relevant to the persona's goal. Don't try to tour everything — open the tour with a step that explains how to navigate the workspace, then stay focused.

### Large repo strategy

For repos with 100+ files: don't try to read everything.

1. Read entry points and the README first
2. Build a mental model of the top 5–7 modules
3. For the requested persona, identify the **2–3 modules that matter most** and read those deeply
4. For modules you're not covering, mention them in the intro step as "out of scope for this tour"
5. Use `directory` steps for areas you mapped but didn't read — they orient without requiring full knowledge

A focused 10-step tour of the right files beats a scattered 25-step tour of everything.

---

## Step 2: Read the intent — infer everything you can, ask only what you can't

**One message from the user should be enough.** Read their request and infer persona,
depth, and focus before asking anything.

### Intent map

| User says | → Persona | → Depth | → Action |
|-----------|-----------|---------|----------|
| "tour for this PR" / "PR review" / "#123" | pr-reviewer | standard | Add `uri` step for the PR; use `ref` for the branch |
| "why did X break" / "RCA" / "incident" | rca-investigator | standard | Trace the failure causality chain |
| "debug X" / "bug tour" / "find the bug" | bug-fixer | standard | Entry → fault points → tests |
| "onboarding" / "new joiner" / "ramp up" | new-joiner | standard | Directories, setup, business context |
| "quick tour" / "vibe check" / "just the gist" | vibecoder | quick | 5–8 steps, fast path only |
| "explain how X works" / "feature tour" | feature-explainer | standard | UI → API → backend → storage |
| "architecture" / "tech lead" / "system design" | architect | deep | Boundaries, decisions, tradeoffs |
| "security" / "auth review" / "trust boundaries" | security-reviewer | standard | Auth flow, validation, sensitive sinks |
| "refactor" / "safe to extract?" | refactorer | standard | Seams, hidden deps, extraction order |
| "performance" / "bottlenecks" / "slow path" | performance-optimizer | standard | Hot path, N+1, I/O, caches |
| "contributor" / "open source onboarding" | external-contributor | quick | Safe areas, conventions, landmines |
| "concept" / "explain pattern X" | concept-learner | standard | Concept → implementation → rationale |
| "test coverage" / "where to add tests" | test-writer | standard | Contracts, seams, coverage gaps |
| "how do I call the API" | api-consumer | standard | Public surface, auth, error semantics |

**Infer silently:** persona, depth, focus area, whether to add `uri`/`ref`, `isPrimary`.

**Ask only if you genuinely can't infer:**
- "bug tour" but no bug described → ask for the bug description
- "feature tour" but no feature named → ask which feature
- "specific files" explicitly requested → honor them as required stops

Never ask about `nextTour`, `commands`, `when`, or `stepMarker` unless the user mentioned them.

### PR tour recipe

For PR tours: set `"ref"` to the branch, open with a `uri` step for the PR, cover changed files first, then unchanged-but-critical files, close with a reviewer checklist.

### User-provided customization — always honor these

| User says | What to do |
|-----------|-----------|
| "cover `src/auth.ts` and `config/db.yml`" | Those files are required stops |
| "pin to the `v2.3.0` tag" / "this commit: abc123" | Set `"ref": "v2.3.0"` |
| "link to PR #456" / pastes a URL | Add a `uri` step at the right narrative moment |
| "lead into the security tour when done" | Set `"nextTour": "Security Review"` |
| "make this the main onboarding tour" | Set `"isPrimary": true` |
| "open a terminal at this step" | Add `"commands": ["workbench.action.terminal.focus"]` |
| "deep" / "thorough" / "5 steps" / "quick" | Override depth accordingly |

---

## Step 3: Read the actual files — no exceptions

**Every file path and line number in the tour must be verified by reading the file.**
A tour pointing to the wrong file or a non-existent line is worse than no tour.

For every planned step:
1. Read the file
2. Find the exact line of the code you want to highlight
3. Understand it well enough to explain it to the target persona

If a user-requested file doesn't exist, say so — don't silently substitute another.

---

## Step 4: Write the tour

Save to `.tours/<persona>-<focus>.tour`. Read `references/codetour-schema.json` for the
authoritative field list. Every field you use must appear in that schema.

### Tour root

```json
{
  "$schema": "https://aka.ms/codetour-schema",
  "title": "Descriptive Title — Persona / Goal",
  "description": "One sentence: who this is for and what they'll understand after.",
  "ref": "main",
  "isPrimary": false,
  "nextTour": "Title of follow-up tour",
  "steps": []
}
```

Omit any field that doesn't apply to this tour.

**`when`** — conditional display. A JavaScript expression evaluated at runtime. Only show this tour
if the condition is true. Useful for persona-specific auto-launching, or hiding advanced tours
until a simpler one is complete.
```json
{ "when": "workspaceFolders[0].name === 'api'" }
```

**`stepMarker`** — embed step anchors directly in source code comments. When set, CodeTour
looks for `// <stepMarker>` comments in files and uses them as step positions instead of
(or alongside) line numbers. Useful for tours on actively changing code where line numbers
shift constantly. Example: set `"stepMarker": "CT"` and put `// CT` in the source file.
Don't suggest this unless the user asks — it requires editing source files, which is unusual.

---

### Step types — full reference

All step types: **content** (intro/closing, max 2), **directory**, **file+line** (workhorse), **selection** (code block), **pattern** (regex match), **uri** (external link), **view** (focus VS Code panel), **commands** (run VS Code commands).

> **Path rule:** `"file"` and `"directory"` must be relative to repo root. No absolute paths, no leading `./`.

---

### When to use each step type

| Situation | Step type |
|-----------|-----------|
| Tour intro or closing | content |
| "Here's what lives in this folder" | directory |
| One line tells the whole story | file + line |
| A function/class body is the point | selection |
| Line numbers shift, file is volatile | pattern |
| PR / issue / doc gives the "why" | uri |
| Reader should open terminal or explorer | view or commands |

---

### Step count calibration

Match steps to depth and persona. These are targets, not hard limits.

| Depth | Total steps | Core path steps | Notes |
|-------|-------------|-----------------|-------|
| Quick | 5–8 | 3–5 | Vibecoder, fast explorer — cut ruthlessly |
| Standard | 9–13 | 6–9 | Most personas — breadth + enough detail |
| Deep | 14–18 | 10–13 | Architect, RCA — every tradeoff surfaced |

Scale with repo size too. A 3-file CLI doesn't get 15 steps. A 200-file monolith shouldn't be squeezed into 5.

| Repo size | Recommended standard depth |
|-----------|---------------------------|
| Tiny (< 20 files) | 5–8 steps |
| Small (20–80 files) | 8–11 steps |
| Medium (80–300 files) | 10–13 steps |
| Large (300+ files) | 12–15 steps (scoped to relevant subsystem) |

---

### Writing excellent descriptions — the SMIG formula

Every description should answer four questions in order. You don't need four paragraphs — but every description needs all four elements, even briefly.

**S — Situation**: What is the reader looking at? One sentence grounding them in context.
**M — Mechanism**: How does this code work? What pattern, rule, or design is in play?
**I — Implication**: Why does this matter for *this persona's goal specifically*?
**G — Gotcha**: What would a smart person get wrong here? What's non-obvious, fragile, or surprising?

Descriptions should tell the reader something they couldn't learn by reading the file themselves. Name the pattern, explain the design decision, flag failure modes, and cross-reference related context.

---

## Narrative arc — every tour, every persona

1. **Orientation** — **must be a `file` or `directory` step, never content-only.**
   Use `"file": "README.md", "line": 1` or `"directory": "src"` and put your welcome text in the description.
   A content-only first step (no `file`, `directory`, or `uri`) renders as a blank page in VS Code CodeTour — this is a known VS Code extension behaviour, not configurable.

2. **High-level map** (1–3 directory or uri steps) — major modules and how they relate.
   Not every folder — just what this persona needs to know.

3. **Core path** (file/line, selection, pattern, uri steps) — the specific code that matters.
   This is the heart of the tour. Read and narrate. Don't skim.

4. **Closing** (content) — what the reader now understands, what they can do next,
   2–3 suggested follow-up tours. If `nextTour` is set, reference it by name here.

### Closing steps

Don't summarize — the reader just read it. Instead, tell them what they can now *do*, what to avoid, and suggest 2-3 follow-up tours.

---

## The 20 personas

| Persona | Goal | Must cover | Avoid |
|---------|------|------------|-------|
| **Vibecoder** | Get the vibe fast | Entry point, request flow, main modules. Max 8 steps. | Deep dives, edge cases |
| **New joiner** | Structured ramp-up | Directories, setup, business context, service boundaries. | Advanced internals |
| **Bug fixer** | Root cause fast | User action → trigger → fault points. Repro hints + test locations. | Architecture tours |
| **RCA investigator** | Why did it fail | Causality chain, side effects, race conditions, observability. | Happy path |
| **Feature explainer** | One feature end-to-end | UI → API → backend → storage. Feature flags, edge cases. | Unrelated features |
| **PR reviewer** | Review the change correctly | Change story, invariants, risky areas, reviewer checklist. URI step for PR. | Unrelated context |
| **Security reviewer** | Trust boundaries | Auth flow, input validation, secret handling, sensitive sinks. | Unrelated business logic |
| **Refactorer** | Safe restructuring | Seams, hidden deps, coupling hotspots, safe extraction order. | Feature explanations |
| **External contributor** | Contribute without breaking | Safe areas, code style, architecture landmines. | Deep internals |
| **Tech lead / architect** | Shape and rationale | Module boundaries, design tradeoffs, risk hotspots. | Line-by-line walkthroughs |

---

## Designing a tour series

When a codebase is complex enough that one tour can't cover it well, design a series.
The `nextTour` field chains them: when the reader finishes one tour, VS Code offers to
launch the next automatically.

**Plan the series before writing any tour.** A good series has:
- A clear escalation path (broad → narrow, orientation → deep-dive)
- No duplicate steps between tours
- Each tour standalone enough to be useful on its own

Set `nextTour` in each tour to the `title` of the next one (must match exactly). Each tour should be standalone enough to be useful on its own.

---

## What CodeTour cannot do

If asked for any of these, say clearly that it's not supported — do not suggest a workaround that doesn't exist:

| Request | Reality |
|---|---|
| **Auto-advance to next step after X seconds** | Not supported. Navigation is always manual — the reader clicks Next. There is no timer, delay, or autoplay step mechanic in CodeTour. |
| **Embed a video or GIF in a step** | Not supported. Descriptions are Markdown text only. |
| **Run arbitrary shell commands** | Not supported. `commands` only executes VS Code commands (e.g. `workbench.action.terminal.focus`), not shell commands. |
| **Branch / conditional next step** | Not supported. Tours are linear. `when` controls whether a tour is shown, not which step follows which. |
| **Show a step without opening a file** | Partially — content-only steps work, but step 1 must have a `file` or `directory` anchor or VS Code shows a blank page. |

---

## Anti-patterns

| Anti-pattern | Fix |
|---|---|
| **File listing** — visiting files with "this file contains..." | Tell a story; each step should depend on the previous one |
| **Generic descriptions** | Name the specific pattern/gotcha unique to *this* codebase |
| **Line number guessing** | Never write a line number you didn't verify by reading the file |
| **Ignoring the persona** | Cut every step that doesn't serve their specific goal |
| **Hallucinated files** | If a file doesn't exist, skip the step |

---

## Quality checklist — verify before writing the file

- [ ] Every `file` path is **relative to the repo root** (no leading `/` or `./`)
- [ ] Every `file` path read and confirmed to exist
- [ ] Every `line` number verified by reading the file (not guessed)
- [ ] Every `directory` is **relative to the repo root** and confirmed to exist
- [ ] Every `pattern` regex would match a real line in the file
- [ ] Every `uri` is a complete, real URL (https://...)
- [ ] `ref` is a real branch/tag/commit if set
- [ ] `nextTour` exactly matches the `title` of another `.tour` file if set
- [ ] Only `.tour` JSON files created — no source code touched
- [ ] First step has a `file` or `directory` anchor (content-only first step = blank page in VS Code)
- [ ] Tour ends with a closing content step that tells the reader what they can *do* next
- [ ] Every description answers SMIG — Situation, Mechanism, Implication, Gotcha
- [ ] Persona's priorities drive step selection (cut everything that doesn't serve their goal)
- [ ] Step count matches requested depth and repo size (see calibration table)
- [ ] At most 2 content-only steps (intro + closing)
- [ ] All fields conform to `references/codetour-schema.json`

---

## Step 5: Validate the tour

**Always run the validator immediately after writing the tour file. Do not skip this step.**

```bash
python ~/.agents/skills/code-tour/scripts/validate_tour.py .tours/<name>.tour --repo-root .
```

The validator checks:
- JSON validity
- Every `file` path exists and every `line` is within file bounds
- Every `directory` exists
- Every `pattern` regex compiles and matches at least one line in the file
- Every `uri` starts with `https://`
- `nextTour` matches an existing tour title in `.tours/`
- Content-only step count (warns if > 2)
- Narrative arc (warns if no orientation or closing step)

**Fix every error before proceeding.** Re-run until the validator reports ✓ or only warnings. Warnings are advisory — use your judgment. Do not show the user the tour until validation passes.

**Common VS Code issues:** Content-only first step renders blank (anchor to file/directory instead). Absolute or `./`-prefixed paths silently fail. Out-of-bounds line numbers scroll nowhere.

If you can't run scripts, manually verify: step 1 has `file`/`directory`, all paths exist, all line numbers are in bounds, `nextTour` matches exactly.

**Autoplay:** `isPrimary: true` + `.vscode/settings.json` with `{ "codetour.promptForPrimaryTour": true }` prompts on repo open. Omit `ref` for tours that should appear on any branch.

**Share:** For public repos, users can open tours at `https://vscode.dev/github.com/<owner>/<repo>` with no install.

---

## Step 6: Summarize

After writing the tour, tell the user:
- File path (`.tours/<name>.tour`)
- One-paragraph summary of what the tour covers and who it's for
- The `vscode.dev` URL if the repo is public (so they can share it immediately)
- 2–3 suggested follow-up tours (or the next tour in the series if one was planned)
- Any user-requested files that didn't exist (be explicit — don't quietly substitute)

---

## File naming

`<persona>-<focus>.tour` — kebab-case, communicates both:
```
onboarding-new-joiner.tour
bug-fixer-payment-flow.tour
architect-overview.tour
vibecoder-quickstart.tour
pr-review-auth-refactor.tour
security-auth-boundaries.tour
concept-dependency-injection.tour
rca-login-outage.tour
```