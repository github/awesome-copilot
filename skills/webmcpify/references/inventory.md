# Inventory — mapping a codebase into a tool manifest

## Detect (Phase 0 details)

Establish, in this order:

1. **Stack**: `package.json` deps (react/vue/@angular/next/astro/eleventy…) or the
   absence of one (static HTML). Record `app.stack` and `app.typescript`.
2. **Start command + base URL**: `dev`/`start` scripts, framework defaults
   (`vite` → 5173, `next` → 3000, static → any file server). Verification needs a
   working local run — if the app can't be started, append the blocker to
   `pipeline.blockers` and surface it at the gate; don't silently proceed to a
   verify phase that cannot run.
3. **Auth model**: none / session / role-based — plus **how a test session signs
   in**, recorded per role under `app.authFixtures`: `obtain` (the exact steps —
   seed command, login route), `account`, and `env` (the env var **names** the
   fixture needs — never secret values in the manifest). The verify phase runs
   from this. Role-based apps need role-scoped registration (`integrate.md`
   §Auth) and a per-role verify pass.
4. **Git baseline**: `pipeline.baselineSha` = HEAD, `pipeline.baselineDirty` =
   `git status --porcelain` paths. Dirty files are untouchable for the whole run.

## Building the area map

The area map is the unit of loop iteration. Sources, in order of preference:
router config (React Router, Next `app/`/`pages/`, Vue Router, Angular routes) →
navigation UI (static/SSG) → feature folders (`src/features/*`). Keep areas
coarse: 5–30 for a big SaaS, 1–3 for a landing page. Split an area that turns out
too big; merge trivial ones.

## What counts as a candidate tool

Walk each area's UI code and list **user actions**, not functions:

| UI pattern | Candidate tool | `mutating` | `readOnlyHint` |
|---|---|---|---|
| Search/filter form or input | `search_<noun>` | false | true |
| Data list/detail currently rendered | `list_<noun>` / `get_<noun>` | false | true |
| Create/edit form with submit → API call | `create_<noun>` / `update_<noun>` | "server" | — |
| Button triggering a server state change | `<verb>_<noun>` | "server" | — |
| Preference/theme/localStorage toggle | `<verb>_<noun>` | "client" | — |
| Multi-step flow (wizard, checkout) | `start_<noun>_flow` (initiation) | false* | **never** |
| Contact/booking form (static sites) | declarative form annotation | "server" | — |

*Initiation tools only navigate/open the flow — the human completes it. They are
classified non-mutating (no data changes) **but must NOT carry `readOnlyHint`**:
they change UI state, and agents skip confirmations for hinted-read-only tools.
`readOnlyHint: true` is reserved for genuinely pure data reads.

`mutating` is tri-state: `false` | `"client"` (browser-local only: prefs, theme,
localStorage — nothing leaves the browser) | `"server"` (data leaves the browser).
`"server"` gets the full ceremony — per-tool approval, required `cleanup`,
dev/test-data-only verification; `"client"` may be batch-approved at the gate
(`cleanup` recommended). `toolautosubmit` is banned for **both** mutation classes
(ground rule 5).

**Skip** (do not inventory): login/logout/auth flows, payment execution, account
deletion, user management, anything irreversible, file uploads (v1), and pure
navigation agents can do anyway.

## Tool budget, overlap, and priority (what keeps SaaS toolsets usable)

Agents degrade when many similar tools compete. Enforce while drafting:

- **Budget**: aim for ≤15 tools active in any app state (app-wide + current view).
  If an area yields more candidates, keep the highest-value ones as `priority: 1`
  and mark the rest `priority: 2/3` — the gate decides which waves ship.
- **Overlap rule**: no two tools whose descriptions could plausibly match the same
  user request. Merge them (one tool, richer schema) or sharpen both descriptions
  until they are disjoint.
- **Role/tenant coverage**: for role-scoped apps, note per tool which roles can use
  it (`auth: ["role:<name>", ...]`); the toolset a given session sees must stay
  within budget too.

## Naming and schema conventions (Google's, condensed)

- **Verb-first, execution vs initiation honest**: `create_event` acts immediately;
  `start_event_creation_process` merely opens a form. The name must never lie.
- Name ≤30 chars, `[a-zA-Z0-9_.-]`; prefix with the app name if tools may coexist
  with other origins' tools in testing (`myapp_search_tickets`).
- Description ≤500 chars, positive capability statement, no marketing. Param
  descriptions ≤150 chars. The description must say exactly what `execute()` does —
  agents make consent decisions from it.
- **Raw user input rule**: schemas accept what the user would say ("11:00 to
  15:00"), never ask the agent to compute or transform. Semantic enum values
  (`"High"`, not `priority_id: 3`).
- Tools returning user-generated or external content get
  `untrustedContentHint: true`.

## Choosing `kind`

- `declarative` — any standard `<form>` whose fields map 1:1 to the action's
  inputs: plain HTML, SSG-emitted, server-rendered, *and* framework-rendered forms
  (uncontrolled inputs), including fetch-submitted forms (they bridge results via
  `respondWith` — see `integrate.md`).
- `imperative` — non-form actions (buttons, drag/drop, selections), actions whose
  inputs come from app state rather than form fields, and React/Vue **controlled**
  forms (agent-driven fill would bypass the framework's state).

## Writing manifest entries

Fill EVERY field of the v3 schema:

- `route` + `auth` (array of roles keying into `app.authFixtures`; verify runs
  once per role).
- `annotations` — `readOnlyHint`/`untrustedContentHint` per the candidate table;
  verify asserts them on the enumerated tool.
- `examples` — one valid + one invalid. `invalid: null` is allowed ONLY for
  readOnly tools with no/empty params (verify then asserts dual-outcome); the
  convention for a non-null invalid on zero-param tools is `{"unexpected": true}`.
- `expect` — exactly ONE of `result` (substring of the resolved string) or
  `navigation` (destination URL/pattern when `executeTool` resolves `null`),
  plus `ui` (a UI assertion a test can check).
- `cleanup` — required for `mutating: "server"`, recommended for `"client"`.

The verify phase must be able to run from the manifest alone, without re-reading
the codebase — that is what makes runs resumable by a different agent.

The completeness pass at the end of Phase 1: start the app (or read the rendered
nav), enumerate what a user can *do* per screen, and diff against the manifest.
