# Migration Hazard Catalog

A generic, **stack-agnostic** catalog of migration hazards that are *predictable
per ecosystem* but are routinely missed in a first-draft modernization plan.
Every phase plan should be **red-teamed against this list before it is
implemented** (see Modernization mode's pre-implementation red-team step).

Each hazard is written as: **Trigger** (when it applies) → **Risk** (what breaks)
→ **Detection probe** (a concrete check you can run now) → **Plan action** (what
to add to the phase) → **Examples** (per-ecosystem, illustrative only).

> These are *hazard classes*, not a fixed checklist for one stack. The examples
> (Java/Spring/Mongo/Docker etc.) are illustrations drawn from real runs — map
> each class onto whatever ecosystem you're actually migrating. If a hazard
> doesn't apply, say so explicitly rather than silently skipping it.

---

## How to use this catalog

Before implementing **any** phase:

1. Walk every hazard below and ask "does this phase trigger it?"
2. For each triggered hazard, run the **detection probe** against the real repo.
3. Fold the **plan action** into the phase's tasks and exit criteria *before*
   writing code — a hazard caught in planning is a task; caught in review it's
   rework; caught in prod it's an incident.
4. Record hazards you checked and cleared, not just the ones that fired — a
   silent skip is indistinguishable from a miss.

Empirically (the PiggyMetrics run, phases 0–6) an independent critic caught a
**blocking plan gap in every single phase**, and each gap was an instance of one
of the classes below. Running this catalog *is* that critic, institutionalized.

---

## H1 — Incomplete quarantine / removal set

**Trigger:** You are removing, quarantining, or cutting over an entire dependency
family (a dead framework, a removed runtime API, an EOL library set) and only
some modules are being touched.

**Risk:** A module you *didn't* list still transitively depends on the removed
artifact, so the default build/test target fails after the cutover — often in a
module the plan never mentioned.

**Detection probe:** Grep the dead artifact/coordinate across **all** manifests,
not just the ones you're editing (`pom.xml`/`build.gradle`, `package.json`,
`*.csproj`, `requirements*.txt`/`pyproject.toml`, `go.mod`, etc.). Every hit is a
module that must move or be quarantined in the same phase.

**Plan action:** Enumerate the **full transitive set** of dead-artifact
dependents up front and list every one in the phase's reactor/quarantine
decision. State the post-cutover build target explicitly (which modules are in,
which are quarantined).

**Examples:**
- *JVM:* Spring Cloud 2023 removes Netflix Hystrix/Turbine; `monitoring` and
  `turbine-stream-service` still pulled `netflix-hystrix-dashboard` /
  `netflix-turbine-stream` and broke `mvn verify` even though the plan only
  quarantined `gateway` + `auth-service`.
- *JS:* dropping `request` — grep for every `require('request')` / `from
  'request'`, not just the one service you remembered.
- *Python:* removing a C-extension lib — check every `import` site + extras.

---

## H2 — Framework-major mechanical codemods (namespace / API / test-engine)

**Trigger:** A **major** version bump of a framework, language, or platform
(not a patch/minor). Major bumps carry *mechanical* breaking changes independent
of your own logic.

**Risk:** The plan treats "bump the version" as one task and misses the
whole-tree mechanical migrations the bump forces — namespace renames, removed
deprecated APIs, changed test runner/engine, changed config keys — so the build
won't even compile.

**Detection probe:** Read the target version's **migration/upgrade guide** and
identify the known breaking-change recipes. Grep the tree for the old namespace /
API surface to size the change. Check whether an **ecosystem codemod/recipe tool**
exists.

**Plan action:** Enumerate each mechanical migration as its **own explicit task**,
and prefer the ecosystem's automated recipe tool over hand-editing where it's
reliable. Decide tool-vs-manual deliberately (small trees may be safer by hand;
large trees need the tool). Include test-framework migration in the list — it is
routinely forgotten.

**Examples:**
- *Spring Boot 2→3:* `javax.* → jakarta.*` namespace migration **and** JUnit 4→5
  (add `junit-vintage-engine` to keep JUnit 4 tests running, migrate
  `OutputCapture`-style Jupiter-only cases). Tool: **OpenRewrite**.
- *JS:* CommonJS→ESM, or React class→hooks. Tools: **jscodeshift**, `react-codemod`.
- *Python:* `2to3`/`pyupgrade`; `async` API renames.
- *.NET:* `Newtonsoft`→`System.Text.Json`, `HttpClient` patterns.

---

## H3 — Runtime bump not in lockstep with deployment artifacts

**Trigger:** You bump the **language/runtime major** (JDK, Node, Python, Ruby,
Go) used to *build* the app.

**Risk:** The build now emits artifacts for the new runtime, but the
**deployment/runtime surface** still pins the old one — base images, CI runner
version, buildpacks, `engines` fields, lambda runtimes — so the app builds green
and then fails to *run* (bytecode/ABI/syntax mismatch), often only in a
smoke/e2e step, or silently in prod.

**Detection probe:** Inventory every place the runtime version is pinned:
`Dockerfile`/`Containerfile` base images, `docker-compose*` build contexts, CI
workflow `setup-*`/runner images, `.tool-versions`/`.nvmrc`/`runtime.txt`,
`engines` in `package.json`, serverless runtime keys. Cross-check each against
the new target.

**Plan action:** Add an explicit task to move **every** deployment/runtime pin in
the same phase as the build bump. Never let build-runtime and run-runtime drift
across a phase boundary. Verify the smoke path actually builds/runs the new
artifacts (and doesn't build quarantined modules).

**Examples:**
- *JVM:* source-built services emit JDK 21 bytecode but every `Dockerfile` still
  `FROM java:8-jre` → containers won't start; dev-compose still *built* the
  quarantined `auth-service`.
- *Node:* CI bumped to Node 22 but Docker image still `node:14-alpine`.
- *Python:* venv on 3.12 but the container base is `python:3.7`.

---

## H4 — Traffic-flow / route-class enumeration gap (edge & auth rewrites)

**Trigger:** Rewriting an edge/gateway, an auth/identity layer, or any
request-routing/security boundary.

**Risk:** The plan pins the obvious authenticated happy path and silently drops
one or more *other* traffic classes — anonymous flows (signup, password reset,
public assets, health/metrics scrape), service-to-service calls, webhooks — so
those break at cutover.

**Detection probe:** Enumerate **every route class** the boundary must serve:
(1) anonymous/public, (2) end-user authenticated, (3) service-to-service
(machine tokens/scopes), (4) infra/observability (health, readiness, metrics
scrape), (5) webhooks/callbacks. For each, confirm the new config has an explicit
rule.

**Plan action:** Make the route-class enumeration an explicit artifact of the
phase (a table of route class → new rule → scope). Call out that
scanners/security expect infra endpoints (e.g. metrics scrape) to remain
reachable. Decide token/scope granularity for s2s calls (narrow scope, not a
generic "server" grant).

**Examples:**
- *BFF/OAuth2:* SCG BFF + TokenRelay covered login but missed the **anonymous
  registration POST + signup assets**, and `/uaa/users` was `permitAll` instead
  of requiring a narrow `user.write` service scope.
- *Metrics:* resource-server security must keep `/actuator/prometheus` open or
  scraping silently breaks.

---

## H5 — Stateful data-store major upgrade treated as an image/version bump

**Trigger:** Bumping the **major version** of a stateful backing service
(database, cache, broker, search index) that has **persisted data/volumes**.

**Risk:** Engine majors frequently can't start on prior-major on-disk data
without a sequential/FCV upgrade path. A naive image bump either fails to start,
appears flaky depending on local volume state, or corrupts data.

**Detection probe:** Check whether the store has persisted volumes/data
directories, and read the engine's supported upgrade path (sequential majors?
feature-compatibility-version steps? dump/restore only?). Determine whether the
data is production/durable or ephemeral/demo.

**Plan action:** Choose and document **one** path: (a) sequential/FCV migration
with steps + rollback, or (b) an **explicit destructive reset** (drop volumes,
re-seed) when the data is ephemeral/demo — stated as a decision, not an accident.
Put this in the migration safety net with a rollback plan.

**Examples:**
- *MongoDB 3→7:* direct image bump over an existing anonymous `/data/db` volume
  is unsafe; for a demo, the blessed path was `docker compose down -v` +
  re-seed via native `initdb.d`, with the old `mongo:3` image retained for
  rollback.
- *Postgres major:* needs `pg_upgrade` or dump/restore, not just a tag change.

---

## H6 — Transitional-insecure state trips scanners & reviewers repeatedly

**Trigger:** A phase intentionally introduces a temporary, deliberately-weak
state to keep the system runnable mid-migration — permit-all security shims,
CSRF disabled, an open endpoint, a hard-coded secret placeholder, a disabled
check.

**Risk:** Every code scanner (CodeQL, Dependabot, SAST) and every automated
reviewer flags it **each review**, generating recurring noise and re-litigation,
and — worse — a shim that was meant to be temporary silently ships because
nobody tracked its closing phase.

**Detection probe:** For each transitional weakening, ask: which scanner will
flag this, and which later phase closes it? Is the weakening *minimally* scoped
(e.g. permit-all chains should still explicitly disable form-login/HTTP-Basic so
the surface is exactly what's intended)?

**Plan action:** Maintain a **transitional-insecure-state register**: each shim
with (a) why it's needed, (b) the phase that closes it, (c) the residual risk,
(d) a note to reviewers that it's by-design-until-phase-N. Scope each weakening
as tightly as possible. Pre-declaring it converts review churn into a resolved,
tracked decision.

**Examples:**
- Phase-5 permit-all `SecurityConfig` shims flagged CodeQL "CSRF disabled" on
  every service, every review; the fix was to explicitly disable form-login/basic
  and annotate "stateless permit-all shim, closed in Phase N."

---

## H7 — Stacked-PR trap & trunk split-brain (phased governance)

**Trigger:** A multi-phase migration where each phase depends on the previous,
developed branch-per-phase.

**Risk:** If phase N+1 is branched off phase N's branch (instead of trunk) and
phase N is never merged to trunk, PRs get merged **into each other**, the trunk
silently stalls several phases behind, and later phases are forced to stack —
producing the exact bind where the "no stacked PRs" rule has to be overridden.
A parallel failure: a repo with **two default-ish branches** (`master` +
`main`) where phase work targets the wrong one.

**Detection probe:** Before starting a phase, verify the previous phase's PR is
**merged to trunk** and the new branch is cut **from trunk** (`git log
origin/<trunk>..HEAD` should be empty at branch creation). Confirm the repo's
real trunk name and that no legacy default branch is being targeted.

**Plan action:** Mandate **merge each phase PR to trunk before starting the next
phase**. Never base a phase branch/PR on a sibling phase branch. If genuinely
blocked and controlled stacking is unavoidable, require a **reconciliation PR**
that lands the stack onto trunk and an explicit **residual-risk note**. Pin the
trunk name and mark any legacy default branch "history only — do not target."

**Examples:**
- PiggyMetrics phases 3 & 4 were merged into each other; `main` stuck at Phase 2;
  `master`/`main` split-brain — reconciled only by a dedicated PR #6, after
  Phase 5 had to break the no-stacking rule.

---

## H8 — Living-doc drift (topology changes outrun the docs)

**Trigger:** A phase changes system **topology** — module/reactor membership,
removed services, renamed branches, changed commands, new/removed endpoints.

**Risk:** Only the plan's status markers get updated; the **executable/onboarding
docs** (`.github/copilot-instructions.md`, `README`, module lists, command
tables) go stale and start actively misleading the next agent/human — e.g. a
"quarantined module" list that no longer matches the reactor.

**Detection probe:** After any topology change, diff the change against every doc
that *describes* topology: agent-instructions file, README, architecture doc's
module/command tables, compose/service inventories.

**Plan action:** Extend the **living-plan discipline** beyond the plan file:
any phase that changes topology must update `copilot-instructions.md`, the
README, and any module/topology list **in the same PR**. Treat these docs as
part of the phase's Definition of Done, not a follow-up.

**Examples:**
- `copilot-instructions.md` quarantine text stayed stale after `gateway` moved
  into the reactor and `monitoring`/`turbine` were removed; README hard-coded a
  `master` branch link that 404'd after the trunk became `main`; actuator
  exposure omitted `refresh`, breaking the `@RefreshScope` workflow.

---

## Quick pre-flight checklist (per phase)

- [ ] **H1** Grepped the dead artifact across *all* manifests; full quarantine set listed?
- [ ] **H2** Enumerated the major-bump codemods (namespace, removed APIs, test engine); recipe tool chosen?
- [ ] **H3** Every runtime pin (base images, CI runners, engines) moved in lockstep with the build bump?
- [ ] **H4** Every route class enumerated (anon, authed, s2s, scrape, webhook) with an explicit rule?
- [ ] **H5** Stateful-store major has a migration path *or* an explicit destructive-reset decision + rollback?
- [ ] **H6** Every transitional-insecure state registered with its closing phase + scoped tightly?
- [ ] **H7** Previous phase merged to trunk; new branch cut from trunk; trunk name confirmed?
- [ ] **H8** Topology change reflected in copilot-instructions.md + README + module lists in the same PR?
