# Inventory — mapping a codebase into a tool manifest

## Detect (Phase 0 details)

Establish, in this order:

1. **Secure verification origin (hard gate)**: read only enough startup config to
   boot the app, then open the candidate origin in headed Chrome and evaluate
   `window.isSecureContext`. Record `app.verificationOrigin` and
   `app.secureContext`. HTTPS and loopback origins can qualify; plain HTTP on a
   named/non-loopback host does not, and `WebMCPTesting` does not waive the rule.
   A false result blocks entry into INVENTORY.
2. **Backend/CORS assumptions**: record every hardcoded/configured absolute backend
   origin in `app.backendOrigins`, the exact development allow-list in
   `app.corsAllowlist`, and choose an origin satisfying both. If the page never
   finishes booting, capture console errors and failed requests before touching
   tool code; `ERR_CONNECTION_REFUSED` or an exact-port CORS rejection is an
   environment diagnosis.
3. **Coverage target + policy**: require `curated` or `parity`; never silently
   default. Persist the normalized gate vocabulary, revision and fingerprint in
   `pipeline.inventoryPolicy` before any area can be inventoried.
4. **Stack**: `package.json` deps (react/vue/@angular/next/astro/eleventy…) or the
   absence of one (static HTML). Record `app.stack` and `app.typescript`.
5. **Start command + base URL**: record the actual command and observed URL. Ports
   may be reassigned on shared hosts, so do not infer or pin a framework default.
6. **Auth model**: none / session / role-based — plus **how a test session signs
   in**, recorded per role under `app.authFixtures`: `obtain` (the exact steps —
   seed command, login route), `account`, and `env` (the env var **names** the
   fixture needs — never secret values in the manifest). The verify phase runs
   from this. Role-based apps need role-scoped registration (`integrate.md`
   §Auth) and a per-role verify pass.
7. **Git baseline**: `pipeline.baselineSha` = HEAD, `pipeline.baselineDirty` =
   `git status --porcelain` paths. Dirty files are untouchable for the whole run.

## Building the area map

The area map is the unit of loop iteration. Sources, in order of preference:
router config (React Router, Next `app/`/`pages/`, Vue Router, Angular routes) →
navigation UI (static/SSG) → feature folders (`src/features/*`). Keep areas
coarse: 5–30 for a big SaaS, 1–3 for a landing page. Split an area that turns out
too big; merge trivial ones.

## What counts as a candidate tool

Walk each area's UI code and list **user actions**, not functions:

| UI pattern | Candidate tool | `mutating` | `readOnlyHint` | `consequentialHint` |
|---|---|---|---|---|
| Search/filter form or input | `search_<noun>` | false | true | false |
| Data list/detail currently rendered | `list_<noun>` / `get_<noun>` | false | true | false |
| Create/edit form with submit → API call | `create_<noun>` / `update_<noun>` | "server" | — | classify by effect |
| Button triggering a server state change | `<verb>_<noun>` | "server" | — | classify by effect |
| Preference/theme/localStorage toggle | `<verb>_<noun>` | "client" | — | false |
| Multi-step flow (wizard, checkout) | `start_<noun>_flow` (initiation) | false* | **never** | false* |
| Contact/booking form (static sites) | declarative form annotation | "server" | — | true |

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

`consequentialHint` is a separate risk dimension, not a synonym for `mutating`.
Set it only when execution has a significant real-world or non-reversible effect
(for example sending, publishing, booking, payment, permission change, or deletion).
An initiation tool that only opens the application's real confirmation UI remains
`false`; the final action stays outside the tool. The hint does not enforce safety.

**Policy gates — use these exact classes.** Exclude auth/login/session/password/
MFA/SSO; signup/registration/payment/billing/subscription; any tool that returns a
credential, token, key, JWT, signed URL or cookie; and irreversible deletion except
for a tool that opens the app's existing confirmation UI for the user. Everything
else is a product action and remains eligible, including creation of projects,
records, invitations, memberships and other ordinary domain objects. Pure navigation
an agent can already perform may still be omitted in `curated`, but it must be mapped
or reasoned about under `parity`.

## Coverage target, tool budget, overlap, and priority

`curated` selects high-value actions and may defer lower-value interaction classes,
but still emits an enumerated route→tool map with written omission reasons.
`parity` requires a route census: every interactive element on every authenticated
route maps to a tool or a written policy/technical reason. A count is never proof of
parity. Census deletes, drag/drop ordering, bulk/multi-select, table sorting, column
configuration, pagination, saved filters, invitations, memberships/permissions,
settings toggles, and canvas/viewer controls explicitly; these are the classes a
curated pass most often misses.

No public source or measured client run establishes a universal safe number of tools
per page. Route-scoped registration reduces active tools, but the target client must
still enumerate and select them successfully; do not turn an arithmetic estimate into
a compatibility promise.

Agents degrade when many similar tools compete. Enforce while drafting:

- **Curated budget**: aim for ≤15 tools active in any app state (app-wide + current view).
  If an area yields more candidates, keep the highest-value ones as `priority: 1`
  and mark the rest `priority: 2/3` — the gate decides which waves ship.
- **Parity capacity**: do not drop interactions to meet the curated budget. Partition
  genuinely route-bound tools by route, record the active count, and verify the real
  target client's enumeration/selection. A client-capacity failure is a named blocker,
  not permission to claim 100% from a smaller count.
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
- Consequential tools get `consequentialHint: true` and retain every existing
  application-side confirmation, authorization, idempotency, and replay guard.

## Choosing `kind`

- `declarative` — any standard `<form>` whose fields map 1:1 to the action's
  inputs: plain HTML, SSG-emitted, server-rendered, *and* framework-rendered forms
  (uncontrolled inputs), including fetch-submitted forms (they bridge results via
  `respondWith` — see `integrate.md`).
- `imperative` — non-form actions (buttons, drag/drop, selections), actions whose
  inputs come from app state rather than form fields, and React/Vue **controlled**
  forms (agent-driven fill would bypass the framework's state).

## Writing manifest entries

Fill EVERY field of the v4 schema:

- `route` + `auth` (array of roles keying into `app.authFixtures`; verify runs
  once per role).
- `annotations` — `readOnlyHint`/`untrustedContentHint`/`consequentialHint` per the candidate table;
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

For every area, persist the current `policyFingerprint` plus every policy exclusion
as `{ gate, reason }`; a zero-tool verdict without this provenance is invalid. If a
gate changes, apply SKILL.md's mechanical invalidation before resuming.

Populate `routeCoverage` in both modes. The completeness pass starts the app, walks
each route under every recorded role, and diffs visible interactions against that
map. Under `parity` this is an element census; under `curated` it proves what was
selected and why the rest was deferred.
