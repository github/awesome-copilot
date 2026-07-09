---
name: document
description: >-
  Produce a single, comprehensive, verifiable architecture document for a
  locally-cloned repository by reading files on disk only. Use this skill
  whenever the user wants to understand, document, map, or onboard onto a
  codebase — e.g. "research this repo", "write up the architecture", "do an
  architecture deep dive", "document how this codebase works", "give me an
  overview of this project", "map the system design", "how is this app
  structured", or "create an onboarding doc". Strongly prefer this skill over an
  ad-hoc exploration whenever the user points at a checked-out repo and wants a
  written architectural overview, even if they don't say the word
  "architecture". It deliberately works from the local checkout to stay cheap
  (no remote API calls), cites every claim to a local file+line, flags
  unverified facts, resolves contradictions, and deep-dives the most complex
  subsystems.
---

# Architecture Research

Generate one definitive, cited architecture document for a repository the user
already has checked out locally. The goal is a writeup someone could hand to a
new engineer as their onboarding reference — broad enough to cover the whole
system, deep enough on the hard parts to be useful, and trustworthy because
every claim traces back to a file on disk.

## Why local-only

Reading from the local checkout (not the GitHub API or the web) is a deliberate
choice. It is faster, free, avoids rate limits, and — most importantly — it
describes *the exact code in front of you* rather than whatever `main` happens
to look like remotely. The one tradeoff is that remote-only facts (star counts,
full CI run history, sibling repos) aren't visible. That's fine: state those as
out-of-scope or mark them `[UNVERIFIED]` rather than guessing.

Only reach for a web/API lookup when a fact genuinely cannot be determined from
disk, and flag it clearly when you do.

## Workflow

1. **Establish identity first.** Run `git remote -v`, `git branch --show-current`,
   and `git log -1` so the document is anchored to a specific remote, branch, and
   commit. A reader must be able to tell which snapshot this describes.
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

## Output structure

Produce a **single Markdown file** with the sections below, in this order. Adapt
the headings to the actual project (a CLI tool has no "frontend" lens — fold that
slot into whatever matters for that repo), but keep the three-lens shape and the
verification discipline.

### Part 1 — Whole-repo technical deep-dive
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
  runs — since that distinction is a manual, human-configured setting the
  `modernize` skill must surface, not assume. This inventory is the source of
  truth that downstream planning (the `modernize` skill) cites so its exit
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
  the raw material the `modernize` skill's feasibility spike and hazard red-team
  build on.
- Data/storage layers, APIs, plugins/extensions, background jobs, CI/CD, testing.

### Part 2 — Context & ecosystem
- Local checkout identity table (remote, branch, HEAD commit, version, license).
- Repo-specific agent/contributor docs present, and what rules they encode.
- Developer gotchas (test watch-mode defaults, slow builds, codegen-must-commit,
  pre-commit hooks) — each cited.
- How this project relates to its broader ecosystem or sibling services, *as
  visible from disk* (build tags, optional linked repos, separately-deployable
  components). Don't import remote ecosystem trivia.

### Part 3 — Architectural blueprint
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

### Subsystem deep-dives
Identify the 2-3 most complex or architecturally significant subsystems — the
parts a new engineer would most struggle with, such as an evaluation/scheduling
engine, a plugin loader pipeline, a state machine, or a rendering/migration
framework. For each, add a dedicated subsection covering its internal structure,
lifecycle or state machine, key types, and data flow, with local file+line
citations and a small Mermaid diagram where it clarifies the flow. This is what
separates a useful onboarding doc from a directory listing — spend real effort
here.

### Confidence assessment
A table of the major claim areas rated **High / Inferred / Unverified**, so a
reader knows exactly which parts to trust outright and which to double-check.

### Footnotes — local file citations
A list of the key local files the document relies on, each with a one-line note
on what it establishes.

## Conventions that make the document trustworthy

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

## Scope control

Keep the document grounded in the checkout. It's easy to drift outward into the
project's wider ecosystem (related products, README marketing, satellite repos)
— resist that unless it's visible on disk, and clearly label anything that comes
from outside the local tree. The reader asked for *this codebase*, documented
faithfully.
