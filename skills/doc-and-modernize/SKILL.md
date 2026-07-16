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

### Workflow

#### Phase 1: Assess Current State (from existing docs)

Read the architecture document and extract:

1. **Tech stack inventory** — languages, frameworks, runtimes, dependencies with
   versions where visible
2. **Feature/domain map** — the major functional areas of the system
3. **Pain points already identified** — tech debt, concerns, deprecated deps,
   architectural violations noted in the existing docs
4. **Deployment and infrastructure** — how it runs today

Do NOT re-read every source file. Trust the architecture doc. Only open specific
files if a modernization question requires verifying a detail (e.g., "is this
dependency actually used or just declared?").

#### Phase 2: Feasibility Spike, Strategy Fork & Safety Ladder

This is the pivot of the whole plan. **Do it before recommending a target
architecture or writing any phases.** Its job is to answer, quickly and honestly:
*how alive is this system, what migration shape fits, and how much regression
safety can we actually achieve?*

##### 2a. Run a time-boxed feasibility spike

Put a **hard time box** on it (e.g. one day). The spike's question is **NOT "can
we make CI green?"** — it is **"can we get this to run even *once* to capture its
behavior?"** Probe, per component / deployable unit:

- Does it **install** its dependencies today (ideally **from a committed
  lockfile without hand-patching**)?
- Do **native/build steps** succeed on a **currently supported** toolchain?
- Does it **boot / start**?
- Can the **test runner execute at all**, and does **≥1 meaningful test pass**?

Record what you actually observed — including partial success (common in
monorepos: one service installs and tests green while another can't compile). Do
**not** sink two sprints resurrecting a corpse to discover it's unresurrectable.
When the time box expires, decide with the evidence you have.

##### 2b. Locate the Testability Milestone (per component)

**"Testable" is not a precondition you can satisfy on a dead app — for a dead app
it is an *output* of modernization, not an input.** So every plan must name, up
front, its **Testability Milestone**: the specific phase at which the system
(or a given component) first satisfies **all four** conditions at once:

1. Runs on a **supported** (non-EOL) runtime.
2. Dependencies install **from a lockfile without hand-patching**.
3. Native / build steps **succeed on the current toolchain**.
4. The **test runner executes and ≥1 meaningful test passes in CI**.

Assess this **per component** — as the reference Nylas run showed, a near-modern
cloud service can cross the line immediately while a legacy Electron client
doesn't cross it until several phases later. **This milestone is the single most
important marker in the plan.** State where it lands for each component, out loud.

##### 2c. Label every phase pre- or post-testability

The Testability Milestone splits the effort into two regimes with **different
safety rules**:

- **Pre-testability ("dark") regime:** the component can't be trusted to run.
  Safety comes from **non-test** sources (see the safety ladder below).
  **Requiring a CI test gate here is a category error** — you're demanding green
  tests from something that isn't alive yet.
- **Post-testability ("lit") regime:** it builds and runs on a live, supported
  stack. *Now* real CI, characterization, and e2e are achievable and worth the
  investment. The classic green-gate belongs **here**.

**Rule: never require an automated test gate on a component before that component
crosses its own testability line.**

##### 2d. Choose the migration strategy — the A/B fork

The spike decides which of two shapes fits (this is a per-component call in a
monorepo):

- **(A) Freeze-then-lift.** Net the old app *as-is*, then upgrade under the net.
  Requires the old app to be **resurrectable at acceptable cost** — i.e. it
  *almost* runs. This is the traditional "characterization tests before you
  change anything" path. **Opt-in, not the default.**
- **(B) Beachhead-then-expand (walking skeleton).** Don't net the corpse. Drive
  the **thinnest possible end-to-end slice onto the modern stack** until it
  builds, boots, and tests; then strangle the rest in, writing tests **on the new
  stack** as you go. **This is the default for dead apps.** In strategy B, the
  first phase is *"reach the Testability Milestone with the smallest slice,"* not
  *"freeze the whole legacy toolchain."*

If a component **can't be built or run at all**, characterization tests on the
*old* stack are impossible by definition — invert the approach: **stop trying to
net the corpse and build the net on the *target* stack incrementally**, using the
old code/output as the reference oracle.

##### 2e. Pick the highest achievable rung on the safety ladder

Regression safety is a ladder, not a binary. Choose the **highest rung you can
actually reach** per component; **a downgrade to a lower rung is a blessed,
first-class outcome — not a failure — provided the residual risk is named.**

- **L4 — Full automated gate:** green lint + unit + characterization + e2e in CI.
- **L3 — Partial gate:** some suites green + lockfile + CI on the achievable
  subset; the rest **quarantined** with a named list.
- **L2 — Characterization / golden-master only:** can't run in CI, but capture
  I/O snapshots / behavioral diffs (manual is acceptable).
- **L1 — Reversibility-based:** no runnable tests; safety comes from small
  reversible steps, strangler / parallel-run, a smoke checklist, and review.
- **L0 — No net possible:** treat as a spec-driven rewrite (old code = the spec)
  or archive.

**Safety is not only tests.** There are at least five sources, and on dead apps
2–4 often outweigh 1:

1. **Tests** (characterization / unit / e2e) — strongest, often unachievable on
   dead apps.
2. **Reversibility** — tiny commits, branch-per-change, trivial rollback.
3. **Isolation** — feature flags, strangler-fig, run old + new in parallel and
   **diff outputs**.
4. **The running old system as an oracle** — record/replay real I/O to
   characterize behavior without a test harness.
5. **Human review + domain knowledge.**

**Anchor safety at the behavioral *seams*, not the unit.** The durable,
stack-agnostic contracts of any app are its externally observable behaviors:
HTTP endpoints, DB schema/queries, file/wire formats, CLI output, protocols. Pin
*those* as golden-master / approval snapshots — **they survive the rewrite; unit
tests on dead legacy code get deleted the moment you replace the module.** Get an
**oracle**, ranked by what's available:

- **Best — it runs *somewhere*** (prod, a VM, an old container, even read-only),
  **and you're allowed to use it**: record real I/O and replay it against the new
  code. One successful capture beats a permanent green legacy CI. *(Do not assume
  this rung is always available — a faithful third-party reimplementation or a
  resurrected legacy binary may be off-limits by policy, licensing, or an
  explicit decision to build "with only what we have." If so, skip to the
  self-frozen rung.)*
- **Fallback — it doesn't run at all:** the old **source is the spec**;
  supplement with prod logs, DB dumps, docs, tickets, and accept that
  characterization tests get written **against the new implementation** to lock
  it once verified correct.
- **Self-frozen golden master — no external reference exists or is permitted:**
  when nothing trustworthy runs *and* you may not borrow an external oracle, the
  **modernized component records its *own* golden master the moment it first runs**
  (at its Testability Milestone), and every later phase diffs against that frozen
  snapshot. This is a real, usable rung — but **name its residual risk out loud**:
  it guarantees the *self-consistency of later refactors*, **not** the correctness
  of the first boot (the snapshot is only as correct as the run that produced it).
  Pair it with human review / spec cross-checks to bless that first run.

##### 2f. Feed an economic/oracle triage into the choice

Weigh **regression cost** when picking a rung: Is the app **in production**? Does
it have **real users**? Is the **old system still runnable** as a reference? An
abandoned app with zero users has near-zero regression cost — an expensive gate
there is **over-engineering**. A production system with users justifies a higher
rung and a real oracle.

##### 2g. Locate the CI Milestone (name the phase that stands up CI)

Just as the Testability Milestone names *when a component can first run and be
tested*, the **CI Milestone** names *when continuous integration is first stood
up* — and it must be **stated out loud in the roadmap, not buried in a phase
body.** A common failure of modernization plans is leaving the reader unable to
tell which phase introduces CI; name it explicitly.

**Rule: CI is stood up in the *first lit phase* — at or immediately after the
component crosses its Testability Milestone — never before.** CI cannot be green
on a component that cannot yet build/run, so wiring a CI *gate* during the dark
regime is the same category error as demanding a test gate there. (Trivial
scaffolding — a lint-only or build-only workflow — may appear earlier, but the
authoritative test gate lands at the CI Milestone.)

**CI is two distinct steps, and the second is human-only** — call both out:
1. **Author the CI workflow file** (e.g. `.github/workflows/*.yml`, `.gitlab-ci.yml`,
   Azure Pipelines) that runs the gate. **An agent can do this.**
2. **Make that workflow an *enforced* gate** — a **required status check /
   branch-protection rule / merge-request approval rule**. This is a manual
   platform-UI / admin step (GitHub → Settings → Branches; GitLab protected
   branches + MR settings; etc.) that **an agent cannot perform.** Until a human
   configures it, CI *runs* on PRs but does **not** *block* merges.

Because step 2 is outside the agent's reach, **every plan that stands up CI must
emit it as an explicit user action item** (in the phase's exit criteria and in
§9 Open questions / decisions needed from stakeholders), so the reader knows the
gate is not self-enforcing until they turn it on.

**Output of Phase 2:** for each component — the spike result, the chosen strategy
(A or B), the located Testability Milestone, the pre/post label, and the target
safety-ladder rung with any residual risk named — **plus the plan-wide CI
Milestone** (which phase stands up CI) and the reminder that enforcing it is a
manual human step. Everything downstream depends on these.

#### Phase 2.5: Red-team every phase against the hazard catalog (mandatory)

The strategic scaffolding above (testability, safety ladder, CI milestone) is
necessary but **not sufficient**. Modernization plans also fail on *tactical,
ecosystem-predictable* hazards — an incomplete quarantine set, a forgotten
namespace codemod, a runtime bump that leaves the base images behind, a stateful
data-store major treated as an image bump, an edge rewrite that drops the
anonymous route class. These are so recurring that they have their own catalog:
**`references/migration-hazards.md`** (H1–H8).

**Rule: before any phase is implemented, red-team its plan against every hazard
in `references/migration-hazards.md`.** For each hazard, ask "does this phase
trigger it?", run the hazard's detection probe against the real repo, and fold
its plan action into the phase's tasks/exit criteria **before** writing code. A
hazard caught in planning is a task; caught in review it's rework; caught in prod
it's an incident. Record hazards you checked and **cleared**, not just the ones
that fired — a silent skip is indistinguishable from a miss.

This is the institutionalized form of an independent-critic pass. Do it yourself
by walking the catalog, and — where an independent second opinion is available
(e.g. a rubber-duck / critique agent) — use it: on the reference PiggyMetrics run
such a pass caught a **blocking plan gap in every single phase**, and each gap
was an instance of an H1–H8 class. Bake the outcome into each phase's
"Decisions made" and exit criteria so the executing agent inherits the cleared
checklist rather than re-discovering the hazard.

#### Phase 3: Recommend Target Architecture

**Decision framework — always evaluate in this order:**

For each component/dependency, work through these levels from least-disruptive to
most-disruptive. Stop at the first level that solves the problem:

1. **Upgrade in place** — Can you bump the major version and fix breakages?
   (e.g., Node 14→22, Python 2→3, React 16→19, Rails 5→7). This is the default
   answer. Only reject it if the upgrade path is officially unsupported, the
   breaking changes are so extensive they exceed rewrite cost, or the framework
   itself is abandoned/EOL.

2. **Swap the dependency** — If the specific library is dead but the pattern is
   fine, can you swap to a maintained alternative with the same interface shape?
   (e.g., Moment.js → date-fns, Request → got/fetch, CoffeeScript → TypeScript
   with decaffeinate). Prefer drop-in or mechanical migration tools when they
   exist.

3. **Wrap/adapt (Strangler Fig)** — If the component's interface is sound but
   internals are unmaintainable, can you put a clean interface in front and
   incrementally replace internals behind it? This works when coupling is
   manageable and the system can run with old and new coexisting.

4. **Rewrite** — Only when: the framework is abandoned with no upgrade path, the
   architecture fundamentally cannot support required new capabilities (e.g.,
   synchronous-only design that must become real-time), or honest estimation shows
   upgrade cost exceeds rewrite cost. Require explicit justification for every
   rewrite recommendation — "it's old" is not sufficient.

5. **Remove** — Dead code, features with zero usage, deprecated capabilities
   superseded by other systems. Verify usage claims before recommending removal.

**Bias toward conservatism.** The cheapest migration is the one you don't do.
Every level of disruption adds risk, timeline, and cost. A working system on an
older framework is better than a half-finished rewrite on a new one.

**Mechanical-migration riders (apply whenever a recommendation is an upgrade,
swap, or removal).** These are the parts of a target-architecture decision that
first-draft plans routinely drop; each maps to a hazard class in
`references/migration-hazards.md`:

- **Transitive-quarantine completeness (H1).** When removing/cutting over a whole
  dependency family, grep the dead artifact across **all** manifests and list the
  *full* set of dependents that must move or be quarantined — not the subset you
  first thought of. State the post-cutover build target explicitly.
- **Framework-major codemods (H2).** A **major** bump carries mechanical breaking
  changes independent of your logic — namespace renames, removed deprecated APIs,
  a changed **test engine**, changed config keys. Enumerate each as its own task
  and prefer the ecosystem's automated **recipe/codemod tool** (OpenRewrite,
  jscodeshift/react-codemod, `2to3`/`pyupgrade`, etc.) over hand-editing on large
  trees. Don't forget the test-framework migration — it is the most-forgotten one.
- **Runtime↔deployment lockstep (H3).** If a recommendation bumps the
  language/runtime **major**, every place the runtime is pinned for *running* the
  app — base images, `docker-compose` build contexts, CI runner images,
  `engines`/`.nvmrc`/`.tool-versions`, serverless runtimes — must move in the
  **same phase**. Build-runtime and run-runtime must never drift across a phase
  boundary, or the app builds green and then fails to run.

Produce a **Target Architecture** section that includes:

- **Recommended tech stack** with rationale for each choice (framework, language,
  runtime, database, infrastructure)
- **Architectural pattern** recommendation (monolith → modular monolith →
  services, event-driven, serverless, etc.) with justification
- **What stays vs. what goes** — explicitly categorize each major component using
  the decision framework above:
  - ✅ Keep as-is (still modern/adequate)
  - ⬆️ Upgrade in place (bump version, fix breakages)
  - 🔀 Swap dependency (replace dead library with maintained equivalent)
  - 🔄 Wrap/adapt (add an interface layer, incrementally replace internals)
  - 🔁 Rewrite (fundamentally incompatible — justification required)
  - 🗑️ Remove (dead code, deprecated features, superseded)

For each recommendation, write an inline ADR:

```markdown
#### ADR: [Decision Title]
- **Context:** [Why this decision is needed]
- **Decision:** [What we chose and which decision framework level it falls under]
- **Alternatives considered:** [What else was evaluated and why it lost]
- **Consequences:** [Tradeoffs accepted]
```

#### Phase 4: Per-Feature Migration Analysis

For each major feature/domain identified in the architecture doc, produce a
section covering:

1. **Current implementation** — one paragraph summary with file references
2. **Migration strategy** — the A/B choice from Phase 2 for this component
   (Freeze-then-lift vs. Beachhead/walking-skeleton), plus the tactic: Strangler
   Fig, Big Bang rewrite, Lift & Shift, Incremental Refactor, or Leave In Place
3. **Testability status** — where this component's **Testability Milestone**
   lands, and its **safety-ladder rung** (L0–L4) with residual risk named
4. **Dependencies and coupling** — what else breaks or must move with it
5. **Effort estimate** — T-shirt size (XS/S/M/L/XL) with justification
6. **Risk assessment** — what can go wrong, data migration concerns, user impact
7. **Acceptance criteria** — how you know the migration succeeded (expressed
   against the chosen oracle/seam contracts, not against a not-yet-alive test
   suite)

#### Phase 5: Phased Implementation Plan

Produce an ordered, phased plan. Each phase should be independently deployable
(no half-migrated states that can't run in production).

**Phase gating is regime-aware (applies to every phase).** State this rule at the
top of the phased plan and honor it in every phase's exit criteria. A phase is
**not complete** until its Verification & Exit Criteria pass. Those criteria must
be (a) **objectively verifiable**; (b) **actually executed and recorded** before
the next phase starts; and (c) **gated** — do not advance to phase N+1 until
phase N's criteria are demonstrably met. **But which criteria are valid depends
on the component's regime (Phase 2c):**

- **Post-testability ("lit") phases:** exit criteria are runnable commands / green
  CI — **green CI on the phase's branch/PR is the authoritative signal.**
- **Pre-testability ("dark") phases:** the component isn't alive yet, so a green
  CI test gate is a **category error**. Exit criteria come from the achievable
  safety-ladder rung instead — captured seam/oracle snapshots, reversibility
  scaffolding proven present, a passed smoke checklist, recorded review. Do **not**
  block a dark-regime phase on a test suite that can't run yet.

Report to the user any phase whose pass/fail is unknown rather than assuming it
passed.

**The first phase establishes maximum *achievable* safety — not a fixed "green
legacy gate."** Do not hard-code "resurrect everything and make CI green." Shape
the first phase from the Phase 2 outputs, per component:

- **Strategy A (Freeze-then-lift), component is resurrectable:** the first phase
  *is* the classic Safety Net & Baseline — purely additive, no behavior change:
  - **Characterization / golden / contract tests** at the **seams** that pin
    current observable behavior (protocol traces, API snapshots, output goldens).
  - **CI + lint + formatter** wired up and green (an authoritative gate for later
    lit-regime phases).
  - **Pinned dependencies / committed lockfile** and a recorded known-good
    baseline (versions, toolchain, how it builds and runs today).
  - **"Net proven to fail."** Deliberately mutate the code (e.g., change one
    protocol code or return value), confirm the new tests go **red**, then
    revert. A safety net that never fails is proof of nothing — prove it has
    teeth.
- **Strategy B (Beachhead/walking-skeleton), component is dead:** the first phase
  is **"reach the Testability Milestone with the smallest slice"** — drive the
  thinnest end-to-end path onto the modern stack until it builds, boots, and runs
  ≥1 real test green, capturing seam/oracle contracts from the old system to
  validate against. **Do not try to net the corpse.** Its exit criterion is the
  achievable safety-ladder rung with residual risk named — a **blessed downgrade
  is not a failure.**

Only after the first phase's criteria are met (at whatever rung) do the
subsequent infrastructure and feature phases begin.

Structure each phase as:

```markdown
### Phase N: [Name] (T-shirt size: M)

**Goal:** [One sentence]
**Regime:** [pre-testability ("dark") | post-testability ("lit")] — per component
**Safety rung:** [L0–L4, with residual risk named if below L4]
**Prerequisites:** [Which phases must complete first]
**Duration estimate:** [Relative, not calendar — e.g., "2-4 sprints"]

#### Tasks
| ID | Task | Component | Blocked by |
|----|------|-----------|------------|
| N.1 | ... | ... | — |
| N.2 | ... | ... | N.1 |

#### Risks & Mitigations
- **Risk:** ... → **Mitigation:** ...

#### Decisions made
- [Every sub-decision this phase depends on, resolved and documented here so the
  phase can be implemented without further user input. State "dropped" vs
  "deferred" explicitly for anything cut.]

#### Verification & Exit Criteria (Definition of Done)
- [ ] [Regime-appropriate criterion. For LIT phases: a runnable command / green
      CI check, citing the actual command from the Commands & Verification
      Inventory. For DARK phases: the achievable safety-ladder rung's evidence —
      captured seam/oracle snapshots, reversibility proven, smoke checklist
      passed — NOT a green test suite the component can't yet run.]
- [ ] [Include a parity/characterization check against the chosen oracle whenever
      the change is meant to preserve behavior.]
- [ ] [If purely additive, assert it: "no behavior/dependency/logic changed."]
- [ ] [If exiting below L4, state the residual risk and which later phase closes
      it (e.g., "client test gate deferred to the client-migration phase").]
```

**Ordering principles:**
- **Locate the Testability Milestone first**, per component — schedule the
  smallest slice that reaches it early rather than deferring "testable" to the end
  while demanding a gate at the start.
- **Never require a component's automated test gate before it crosses its own
  testability line.**
- **Name the CI Milestone in the roadmap.** State explicitly which phase stands
  up CI (the first *lit* phase, at/after the Testability Milestone) so the reader
  never has to guess when CI arrives — and flag that *enforcing* it (required
  status check / branch protection) is a manual human step, not an agent task.
- **First-phase safety before behavior change** — establish the highest
  achievable rung (not necessarily a full green gate) before modifying behavior.
- Infrastructure and cross-cutting concerns next (auth, config, logging, CI/CD)
- Highest-risk or highest-value features next (prove the pattern early)
- Low-risk, low-coupling features last (easy wins to parallelize)
- Data migrations get their own phase with rollback plans

#### Phase 6: Execution Governance

Modernization plans fail in execution, not on paper. Bake in the governance that
keeps each phase honest and reversible (generic across any ecosystem):

- **Branch per phase.** Never commit phase work to the default branch. Open one
  PR per phase; let CI on the PR be the authoritative green signal before merge
  **for lit-regime phases**. For dark-regime phases, the PR still carries the
  rung's evidence (captured contracts, smoke results, reversibility scaffolding).
- **Merge to trunk before the next phase; never stack (H7).** Each phase branch
  is cut **from trunk**, and its PR is **merged to trunk before the next phase
  starts**. Never base a phase branch or its PR on a *sibling* phase branch — that
  is how PRs get merged into each other, the trunk silently stalls several phases
  behind, and later phases are forced into the exact bind where the no-stacking
  rule has to be broken. Before starting a phase, verify the previous phase is
  merged to trunk and `git log origin/<trunk>..HEAD` is empty at branch creation.
  **If controlled stacking is genuinely unavoidable, it is allowed only with a
  required reconciliation PR** that lands the stack onto trunk **and an explicit
  residual-risk note** — never as a silent default.
- **Confirm the trunk name; retire legacy defaults.** Pin the repo's real trunk
  (e.g. `main`) and, if a second default-ish branch exists (`master`), mark it
  "history only — do not target" so phase work never lands on the wrong branch.
- **The gate matches the regime.** Lit phases advance on green CI; dark phases
  advance on the achievable safety-ladder rung with residual risk named — not on
  a "looks done" judgement, and not on a test suite that can't run yet.
- **Stand up CI at the CI Milestone, and hand off enforcement to a human.**
  Name the phase that introduces CI (the first lit phase). Distinguish the two
  steps: authoring the workflow file is agent-doable; making it an **enforced
  required status check / branch-protection (or MR-approval) rule is a manual
  platform-UI step the agent cannot perform.** Until a human configures it, CI
  *runs* but does not *block* merges — so record "enable branch protection /
  required checks" as an explicit user action item (in the CI phase's exit
  criteria and in §9 stakeholder decisions), never as a completed agent task.
- **Interface-preserving & independently deployable.** Each phase leaves the
  system runnable, so rollback = redeploy the previous version. Prefer
  interface-preserving rewrites (wrap internals behind a stable interface) and
  prove equivalence with the seam/oracle contracts (golden/characterization
  tests where they exist).
- **Living plan.** Update `MODERNIZATION_PLAN.md` status markers as each phase's
  exit criteria are met — ✅ complete / ⏭️ descoped / 🗑️ dropped — record the
  decisions made during implementation, and **update the safety-ladder rung /
  residual-risk register** as components cross their testability lines.
- **Keep the executable docs alive too (H8).** The living-plan discipline is not
  only the plan file. Any phase that changes **topology** — module/reactor
  membership, removed services, renamed branches, changed commands, new/removed
  endpoints — must update `.github/copilot-instructions.md`, the `README`, and any
  module/topology list **in the same PR**. Treat those doc updates as part of the
  phase's Definition of Done, not a follow-up — a stale "quarantined module" list
  or a hard-coded old-branch link actively misleads the next agent/human.
- **Red-team each phase before implementing it (Phase 2.5).** Walk the phase plan
  against `references/migration-hazards.md` (H1–H8) and fold the fixes into tasks
  and exit criteria before writing code. Record the cleared checklist in the
  phase's "Decisions made".
- **Emit editable instructions.** Produce a `.github/copilot-instructions.md`
  (create the `.github/` directory if needed) from the template at
  `references/copilot-instructions.template.md` — a commands table plus the
  regime-aware phase-gate and branch/PR rules — so the executing agent/human has
  the canonical commands and gates in the location GitHub Copilot auto-loads. The
  user edits it to their own gates. If a `.github/copilot-instructions.md` already
  exists, do not overwrite it — merge the commands/gating/branch sections in, or
  write the generated file alongside as
  `.github/copilot-instructions.modernization.md` and tell the user to merge.

#### Phase 7: Migration Safety Net

Document the operational guardrails needed:

- **Feature flags** — what gets flagged and how old/new coexist
- **Data migration strategy** — schema changes, backfills, dual-write periods.
  For a **stateful data-store major upgrade** with persisted volumes (H5), an
  engine image/tag bump is **not** a migration: pick and document one path —
  a sequential/feature-compatibility-version upgrade with steps + rollback, **or**
  an explicit **destructive reset** (drop volumes, re-seed) when the data is
  ephemeral/demo — stated as a deliberate decision, with the prior-major image
  retained for rollback. (e.g. Mongo 3→7 over an existing `/data/db` volume needs
  `down -v` + re-seed for a demo, or a staged FCV upgrade for real data.)
- **Rollback plan** — per phase, how to revert if something fails
- **Transitional-insecure-state register (H6)** — every deliberately-weak state
  introduced to keep the system runnable mid-migration (permit-all shims, CSRF
  disabled, an open endpoint, a placeholder secret) listed with: why it's needed,
  the phase that **closes** it, the residual risk, and a by-design-until-phase-N
  note for reviewers. Scope each weakening as tightly as possible (e.g. a
  permit-all chain should still explicitly disable form-login/HTTP-Basic).
  Pre-declaring these converts recurring scanner/reviewer churn into a tracked
  decision.
- **Oracle & seam contracts** — which running instance / recorded I/O / golden
  snapshots (or a **self-frozen golden master**, when no external reference is
  available or permitted) serve as the behavioral reference, and how new work is
  diffed against them
- **Testing strategy** — what new test coverage is needed (built on the *target*
  stack as components cross their testability line), and what stays quarantined
- **Observability** — metrics/alerts that prove the new system matches the old

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
