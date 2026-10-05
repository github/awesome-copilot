---
name: doc-and-modernize
description: >-
  Two related workflows for a locally-cloned codebase, in one skill.
  Documentation mode produces a single, comprehensive, verifiable architecture
  document primarily by reading files on disk (local-first) — use it whenever the user wants to
  understand, map, document, research, or onboard onto a codebase ("research
  this repo", "write up the architecture", "do an architecture deep dive",
  "document how this codebase works", "map the system design", "create an
  onboarding doc"). Modernization mode generates a
  phased plan to modernize, migrate, upgrade, or rewrite a legacy system
  ("modernize this", "plan the migration", "how would we rewrite this", "how do
  we get off this legacy stack"); if no architecture document exists yet it
  first runs Documentation mode, then continues straight through to the plan. It
  assumes the legacy stack may be dead, runs a time-boxed feasibility spike, and
  picks the highest achievable rung on a safety ladder instead of demanding a
  fully-green legacy CI gate up front.
---

# Documentation & Modernization

Two complementary workflows for a repository the user already has checked out
locally, bundled as one skill:

- **Documentation mode** — produce one definitive, cited architecture document
  from the code on disk. Ideal for onboarding, system-design maps, or as the
  evidence base for a modernization effort.
- **Modernization mode** — turn that architecture into a phased, safety-laddered
  plan to upgrade, migrate, or rewrite a legacy system.

## Mode selection

- If the user wants to **understand, document, map, research, or onboard onto** a
  codebase, run **Documentation mode**.
- If the user wants to **modernize, migrate, upgrade, or rewrite** a system, run
  **Modernization mode**. Modernization mode is self-sufficient: if no
  architecture document exists yet, it runs the **Documentation mode** workflow
  first (in the same pass), then continues straight through to the plan.

When in doubt, produce the architecture document first — it is the audited
evidence base both modes rely on.

## Documentation mode

Generate one definitive, cited architecture document for a repository the user
already has checked out locally. The goal is a writeup someone could hand to a
new engineer as their onboarding reference — broad enough to cover the whole
system, deep enough on the hard parts to be useful, and trustworthy because
every claim traces back to a file on disk.

### Why local-first

Reading from the local checkout (not the GitHub API or the web) is the deliberate
**default**. It is faster, free, avoids rate limits, and — most importantly — it
describes *the exact code in front of you* rather than whatever `main` happens
to look like remotely. The one tradeoff is that remote-only facts (star counts,
full CI run history, sibling repos) aren't visible. That's fine: state those as
out-of-scope or mark them `[UNVERIFIED]` rather than guessing.

Local-first is not local-*never*-remote: a web/API lookup is a deliberate
**last-resort fallback**, reserved for a fact that genuinely cannot be determined
from disk and that materially matters to the document. When you do reach for it,
flag the result clearly (e.g. `[UNVERIFIED]` / sourced-remotely) so the reader
knows it didn't come from the checkout, and never let it become the easy path
that displaces reading the code on disk.

### Workflow

1. **Establish identity first.** Run `git remote -v`, `git branch --show-current`,
   and `git log -1` so the document is anchored to a specific remote, branch, and
   commit. A reader must be able to tell which snapshot this describes. Remote
   URLs can contain embedded credentials (e.g. `https://<token>@github.com/...`)
   — **redact any credentials/tokens** from the URL before recording it in the
   document.
2. **Detect, don't assume.** Read the real manifests (`go.mod`, `package.json`,
   `Cargo.toml`, `pyproject.toml`, `pom.xml`, etc.), the `Makefile`/task runner,
   CI config, and any repo-specific agent or contributor docs (`AGENTS.md`,
   `CONTRIBUTING`, `README`, `docs/`). These are the source of truth for the tech
   stack and commands — prefer them over your prior knowledge of the framework.
3. **Map breadth, then drill into depth.** First build the whole-repo map (the
   three lenses below), then pick the 2-3 hardest subsystems and go deep on them.
4. **Verify as you go.** Open the files you cite. If you reference a line number,
   you should have actually read that line. Unsupported claims are worse than
   omissions here — the whole value of this document is that it can be trusted.

### Output structure

Produce a **single Markdown file** with the sections below, in this order. Adapt
the headings to the actual project (a CLI tool has no "frontend" lens — fold that
slot into whatever matters for that repo), but keep the three-lens shape and the
verification discipline.

#### Part 1 — Whole-repo technical deep-dive
- What the repository is (one paragraph, cited to README).
- Tech-stack detection table: layer | technology | evidence (file+line).
- Entry points (backend, frontend, CLI — whatever applies).
- **Commands & Verification Inventory** — a table of the canonical project
  commands (`command | purpose | evidence`), verified against the task runner /
  manifests / CI config, not guessed. Cover build, run/serve, test (and how to
  run a single test), lint, format, and — where they exist — typecheck,
  end-to-end/smoke, contract, and any other gate commands, plus the CI
  workflow(s) that run them and on what trigger. **Also record whether CI is
  *enforced*** — i.e. whether any workflow is a **required status check /
  branch-protection rule** that actually blocks merges, versus one that merely
  runs — since that distinction is a manual, human-configured setting that
  Modernization mode must surface, not assume. Enforcement usually cannot be
  determined from the local checkout alone: ask the user, or mark it
  `[UNVERIFIED]` unless confirmed from an authoritative source (any remote
  lookup is a flagged last resort, per the local-first rule above). This
  inventory is the source of
  truth that downstream planning (Modernization mode) cites so its exit
  criteria are runnable, not aspirational. Detect these per-ecosystem (npm/yarn/
  pnpm, `make`, `just`, `cargo`, `go`, `poetry`/`tox`/`nox`, `gradle`/`maven`,
  etc.) — do not assume a stack. Mark any command you could not verify
  `[UNVERIFIED]`.
- Directory layout for each major area, with a one-line purpose per directory.
- **Deployment & Runtime Surface** — a table of every place the language/runtime
  and backing-service versions are pinned *for running* the system (not just
  building it): container base images (`Dockerfile`/`Containerfile`,
  `docker-compose*` build contexts), CI runner images / `setup-*` versions,
  `engines`/`.nvmrc`/`.tool-versions`/`runtime.txt`, serverless/lambda runtimes,
  and stateful data-store image tags (DB/cache/broker/search). Cite each with
  file+line. This surface is what a later platform/runtime bump must move in
  lockstep — flag any drift between build-runtime and run-runtime here so it's
  visible before a modernization plan is written.
- **EOL / dead-dependency scan** — call out frameworks, runtimes, base images,
  and libraries that are end-of-life, unmaintained, or removed in a likely target
  major (e.g. a framework whose next major renames namespaces or drops a
  component family). Mark each `[INFERRED]`/`[UNVERIFIED]` as appropriate. This is
  the raw material Modernization mode's feasibility spike and hazard red-team
  build on.
- Data/storage layers, APIs, plugins/extensions, background jobs, CI/CD, testing.

#### Part 2 — Context & ecosystem
- Local checkout identity table (remote, branch, HEAD commit, version, license).
- Repo-specific agent/contributor docs present, and what rules they encode.
- Developer gotchas (test watch-mode defaults, slow builds, codegen-must-commit,
  pre-commit hooks) — each cited.
- How this project relates to its broader ecosystem or sibling services, *as
  visible from disk* (build tags, optional linked repos, separately-deployable
  components). Don't import remote ecosystem trivia.

#### Part 3 — Architectural blueprint
- Tech-stack summary (can reference the Part 1 table).
- C4-style diagrams as Mermaid: Level 1 system context, Level 2 containers,
  Level 3 a representative request/component lifecycle.
- Layering and dependency rules (what may depend on what, and what enforces it).
- Cross-cutting concerns table: auth, config, logging, metrics/tracing, secrets,
  error handling, feature flags — each with its location and evidence.
- Inferred Architectural Decision Records (reconstructed from code + docs).
- Governance & enforcement mechanisms (CI gates, codegen verification,
  CODEOWNERS, review gates, compatibility rules).
- "How to add a feature" guide plus common pitfalls.

#### Subsystem deep-dives
Identify the 2-3 most complex or architecturally significant subsystems — the
parts a new engineer would most struggle with, such as an evaluation/scheduling
engine, a plugin loader pipeline, a state machine, or a rendering/migration
framework. For each, add a dedicated subsection covering its internal structure,
lifecycle or state machine, key types, and data flow, with local file+line
citations and a small Mermaid diagram where it clarifies the flow. This is what
separates a useful onboarding doc from a directory listing — spend real effort
here.

#### Confidence assessment
A table of the major claim areas rated **High / Inferred / Unverified**, so a
reader knows exactly which parts to trust outright and which to double-check.

#### Footnotes — local file citations
A list of the key local files the document relies on, each with a one-line note
on what it establishes.

### Conventions that make the document trustworthy

These are the habits that distinguish this skill's output from a generic
overview. They matter because the document's entire value is that a reader can
rely on it without re-deriving everything.

- **Cite every non-obvious claim** to a local path, with a line number where it
  pins something specific (`pkg/server/server.go#L39-L41`). Relative paths from
  the repo root keep links clickable.
- **Mark uncertainty honestly.** Use `[INFERRED]` for something you reasoned to
  but didn't see stated, and `[UNVERIFIED]` for something you're repeating but
  didn't confirm (e.g. a build-timing claim from a doc you didn't re-measure).
  Honest gaps are more useful than false confidence.
- **Resolve contradictions, don't restate them.** If two sources disagree (say a
  version literal in code vs. the manifest), go read the code, decide the real
  answer, and label it `[Resolved contradiction]` with the explanation. Leaving
  a reader to puzzle over a conflict is a failure mode.
- **Note compatibility and deploy-cadence rules** the repo enforces — separate
  FE/BE PRs, bidirectional storage compatibility, additive-only protobuf changes
  — because these are the rules a newcomer most easily breaks.
- **Prefer precise counts over vague ones.** "73 service packages", "89 workflow
  files" (from a directory listing) reads as verified; "many services" reads as a
  guess.

### Scope control

Keep the document grounded in the checkout. It's easy to drift outward into the
project's wider ecosystem (related products, README marketing, satellite repos)
— resist that unless it's visible on disk, and clearly label anything that comes
from outside the local tree. The reader asked for *this codebase*, documented
faithfully.

## Modernization mode

Generate a complete, actionable modernization plan for a legacy codebase. This
skill focuses on the forward-looking work — what to modernize, why, in what
order, and how — but it is **self-sufficient**: it ensures an architecture
document exists first, producing one via Documentation mode when needed.

**Assume dead-by-default.** People reach for modernization precisely because the
old stack is hard or impossible to upgrade — EOL runtimes, uncompilable native
modules, retired package mirrors, abandoned frameworks. So this skill does **not**
assume you can resurrect the legacy toolchain and stand up a fully-green CI gate
before touching anything. That "freeze-then-lift" approach is the *lucky* case,
not the default. Instead the skill runs a **time-boxed feasibility spike**, then
picks a migration strategy and a **safety strategy** matched to how alive the
system actually is. On a truly dead app, building a green legacy gate *is itself
a modernization project* — a circular trap this skill is designed to avoid.

Three ideas drive the whole plan and are introduced below: the **Testability
Milestone** (when — per component — the system can actually build, run, and pass
a test again), the **safety ladder** (the highest rung of regression safety
you can actually reach, with a downgrade treated as a blessed outcome, not a
failure), and the **CI Milestone** (which phase first stands up CI — and the
reminder that *enforcing* CI as a required check is a manual human step, not
something the agent can do).

### Prerequisites

This skill needs an understanding of the system's architecture before it can
plan. Resolve that as follows:

1. If an architecture document already exists — produced by **Documentation mode**
   above, or a README / ARCHITECTURE.md the user points to, or enough
   prior conversation context — use it and skip to the workflow below.
2. **If none exists, run the Documentation mode workflow above first** to
   generate a cited architecture document, then continue **straight through**
   to Phase 1 below in the same pass. Do not stop to ask the user to run it
   separately, and do not pause for review between the two documents.

The result is two artifacts: the architecture document (the audited evidence
base) and this modernization plan (the forward-looking action set).

**Before planning, confirm a Commands & Verification Inventory exists.** Exit
criteria are only worth anything if they are *runnable*, so the plan must be able
to cite the project's canonical build / run / test / lint / typecheck / e2e /
contract commands and CI gate(s). Documentation mode produces this
inventory in Part 1; if you're working from a README or prior context that lacks
it, detect and record those commands yourself (per-ecosystem — npm/yarn/pnpm,
`make`, `just`, `cargo`, `go`, `poetry`/`tox`/`nox`, `gradle`/`mvn`, etc.) before
writing exit criteria. Never invent a command you haven't verified against the
task runner / manifests / CI config.

### Output Structure

Produce a primary Markdown file named `MODERNIZATION_PLAN.md` with:

1. Executive summary (one paragraph: what, why, rough scope)
2. Current state assessment (from architecture doc)
3. **Feasibility spike result & strategy** — per component: spike findings, the
   A/B migration strategy, the located **Testability Milestone**, the target
   **safety-ladder rung**, and a **residual-risk register** for anything below L4;
   plus the plan-wide **CI Milestone** (which phase stands up CI) with a note that
   *enforcing* it is a manual human step
4. Target architecture with ADRs
5. Per-feature migration analysis (with testability status + safety rung)
6. Phased implementation plan — first phase establishes the highest *achievable*
   safety rung (not a fixed green legacy gate); every phase is labeled
   pre/post-testability and carries regime-appropriate, gated exit criteria; the
   **CI Milestone phase is named explicitly** and lists "enable branch protection
   / required status checks" as a manual user action
7. Execution governance (branch-per-phase, regime-aware gate, living-plan status)
8. Migration safety net (oracle & seam contracts, flags, rollback, observability)
9. Open questions / decisions needed from stakeholders — including any manual
   platform-configuration handoffs the agent cannot perform (e.g. enabling
   required status checks / branch protection to make CI an enforced gate)

Also emit a companion **`.github/copilot-instructions.md`** (the path GitHub
Copilot auto-loads; create `.github/` if absent) from
`references/copilot-instructions.template.md`, populated with the project's
canonical commands and phase-gating / branch rules, for whoever executes the
plan to edit and adopt. Never overwrite an existing
`.github/copilot-instructions.md` — merge into it or write a sibling
`.github/copilot-instructions.modernization.md` and flag it for the user.

### Conventions

- **Cite the architecture doc** when referencing current state rather than
  restating everything. Keep this document forward-looking.
- **Be opinionated.** Make concrete recommendations, not "you could do A or B."
  State what you'd pick and why. The user can override.
- **Scope realistically.** A modernization plan that tries to change everything at
  once is fiction. Identify what's phase 1 vs. "future consideration."
- **Resolve every in-phase decision during planning.** A phase plan must carry
  all the sub-decisions its implementation depends on, already decided and
  documented (the "Decisions made" block), so the phase can be executed without
  going back to the user. State **"dropped" vs "deferred"** explicitly for
  anything cut — they are not the same. Reserve `[DECISION NEEDED]` for genuine
  *stakeholder/business* choices (budget, team size, product direction, timeline
  pressure) that block a phase; drive those to resolution with the user during
  planning rather than leaving them open in an implementable phase.
- **Don't gold-plate.** If a component works fine on the old stack and has no
  maintenance burden, "leave it alone" is a valid recommendation.
- **Assume dead-by-default; make safety adaptive.** Don't demand a fully-green
  legacy CI gate up front. Run the feasibility spike, pick the highest achievable
  safety-ladder rung, and treat a **downgrade as a blessed outcome** with residual
  risk named — never a failure.
- **Locate testability in time.** Every plan must name its **Testability
  Milestone** per component and never require a component's automated test gate
  before that component crosses its own testability line.
- **Name the CI Milestone, hand enforcement to a human.** State which phase
  stands up CI (the first lit phase), and make explicit that turning CI into an
  *enforced* required check / branch-protection rule is a manual platform step
  the agent cannot do — surface it as a user action item, not a done task.
- **Net the seams, not the corpse.** Anchor safety at externally observable
  contracts (protocols, schemas, wire/file formats, endpoints) with a ranked
  oracle (running instance → recorded I/O → code-as-spec → **self-frozen golden
  master** when no external reference exists or is permitted). Don't sink sprints
  resurrecting a dead toolchain just to run a test that gets deleted at rewrite.
- **Keep it generic.** Express commands and gates in terms of *the project's*
  package manager / test runner / CI — never assume a specific stack.
- **Red-team every phase before implementing (H1–H8).** Walk each phase plan
  against `references/migration-hazards.md` and fold the fixes into tasks/exit
  criteria first — a hazard caught in planning is a task; in review, rework; in
  prod, an incident. These tactical hazards (incomplete quarantine, framework
  codemods, runtime/base-image lockstep, route-class enumeration, data-store
  upgrade paths, transitional-insecure-state noise, stacked-PR/trunk drift,
  living-doc drift) are what strategic scaffolding alone keeps missing.

## Extended guide

These sections are in [`references/extended-guide.md`](references/extended-guide.md); read the relevant one when the task needs it:

- [Modernization mode: Workflow](references/extended-guide.md#workflow)
