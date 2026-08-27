// Thin wrapper around the Sentry CLI's in-process SDK (the `sentry` npm package,
// a.k.a. getsentry/cli "library usage"). This is the ONLY place the canvas talks
// to Sentry: every issue / project / org read goes through the typed SDK, which
// spawns the bundled CLI and returns parsed JSON (or throws SentryError).
//
// Auth is resolved by the SDK/CLI itself, in this order: the `token` option ->
// SENTRY_AUTH_TOKEN -> SENTRY_TOKEN -> the OAuth credential stored by a one-time
// `sentry auth login` (in ~/.sentry). We deliberately pass NO token here so the
// stored login is used and the canvas never handles a raw secret. Because the
// extension process runs as the same user, it reads the same stored credential.
//
// Everything below returns raw SDK JSON (or throws SentryError). Shaping into the
// canvas's internal issue model lives in sentry.mjs so this file stays a thin,
// swappable transport.

// The heavyweight `sentry` CLI package is an OPTIONAL, lazily-loaded dependency.
// awesome-copilot ships extension *source* only (no node_modules), so an installed
// plugin may not have it. A top-level `import ... from 'sentry'` would throw
// `Cannot find package 'sentry'` at module load and take the whole canvas down
// before any UI renders. Instead we import it dynamically on first use and, when
// it's absent, throw a clear SentryError (tagged SENTRY_PACKAGE_MISSING) that the
// setup gate turns into actionable guidance — Copilot can install it for you.

// A stand-in SentryError so callers can `import { SentryError }` at load time and
// `instanceof`-check even when the package never loads. When the real package IS
// present we replace this binding (a live ESM export) with the SDK's own
// SentryError class, so existing `instanceof` + `.exitCode` checks keep matching
// the errors the SDK actually throws.
let SentryError = class SentryError extends Error {
  constructor(message, opts = {}) {
    super(message)
    this.name = 'SentryError'
    if (opts.code) this.code = opts.code
  }
}

export { SentryError }

// Fallback message when the optional `sentry` package can't be resolved. The
// setup gate (preflight.mjs) rewrites this into fuller guidance; this is what
// surfaces anywhere the raw error is shown.
const PACKAGE_MISSING_MESSAGE =
  'The Sentry CLI (the `sentry` npm package) is not installed for this extension. ' +
  'Ask Copilot to set it up, or run `npm install` in the extension folder.'

let sdk = null
let sdkFactory = null

// Import the optional `sentry` package exactly once. Throws a SentryError tagged
// SENTRY_PACKAGE_MISSING when it can't be resolved, and swaps in the SDK's real
// SentryError class (live ESM binding) when it can.
async function loadFactory() {
  if (sdkFactory) return sdkFactory
  let mod
  try {
    mod = await import('sentry')
  } catch (err) {
    // Only translate "the `sentry` package itself isn't installed" into the setup
    // gate. Node reports that as ERR_MODULE_NOT_FOUND naming the `sentry` package.
    // Any OTHER failure — a missing TRANSITIVE dependency, or the package's own
    // entrypoint throwing at import — is a real defect we must surface, not mask
    // behind a misleading "reinstall sentry" message. Rethrow those unchanged.
    const message = String((err && err.message) || '')
    const sentryPackageMissing =
      err && err.code === 'ERR_MODULE_NOT_FOUND' && /Cannot find (?:package|module) 'sentry'/.test(message)
    if (!sentryPackageMissing) throw err
    throw new SentryError(PACKAGE_MISSING_MESSAGE, { code: 'SENTRY_PACKAGE_MISSING' })
  }
  if (mod.SentryError) SentryError = mod.SentryError
  sdkFactory = mod.default
  return sdkFactory
}

// Lazily construct the SDK once. cwd affects the CLI's project-root / DSN
// detection; we anchor it to the extension's cwd for determinism.
async function getSdk() {
  if (!sdk) {
    const create = await loadFactory()
    sdk = create({ cwd: process.cwd() })
  }
  return sdk
}

// Module-wide serialization of ALL SDK work.
//
// `sentry@0.42.2` explicitly does not support concurrent library calls: the
// bundled CLI SDK keeps global per-command and pagination ("next" cursor) state,
// so two in-flight calls corrupt each other's results. This module's `sdk` is a
// process singleton shared across BOTH fan-out within one canvas (e.g. refreshAll
// kicks off project discovery without awaiting it, then immediately scans issues)
// AND every canvas instance in this extension process. A per-org or per-command
// queue can't see the whole picture, so we funnel every SDK invocation through
// ONE FIFO chain here — nothing else in the codebase touches the SDK directly.
//
// `runSerial(task)` runs `task` only once all previously enqueued work has
// settled, so at most one SDK operation is ever in flight process-wide. It is the
// single choke point; the public functions below are thin queued wrappers, and
// multi-call traversals (see projectListRaw) run as ONE task so their paging
// can't interleave with anything.
let sdkQueue = Promise.resolve()

export function runSerial(task) {
  // Chain onto the tail whether the previous task fulfilled or rejected, so one
  // failed call never wedges the queue for everyone behind it. Each caller still
  // awaits `run` for its own result/error.
  const run = sdkQueue.then(task, task)
  // Keep the internal chain from emitting unhandled-rejection warnings; callers
  // own the real settlement via `run`.
  sdkQueue = run.then(() => {}, () => {})
  return run
}

// Coerce the SDK's list results into a plain array. `sentry@0.42.2`'s typed
// resources (issue.list, project.list, org.list) return a paginated envelope
// whose records live under `data` — verified against the installed SDK:
//   project.list -> { data: [...], hasMore, nextCursor, hasPrev }
//   issue.list   -> { data: [...], hasMore, hasPrev }
// so `data` is the real key we depend on. The other keys (issues/projects/…,
// including `items`) are belt-and-suspenders for a future CLI shape change so a
// mismatch fails soft (empty board) rather than throwing.
function asArray(res) {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    for (const key of ['data', 'items', 'issues', 'projects', 'organizations', 'orgs', 'results']) {
      if (Array.isArray(res[key])) return res[key]
    }
  }
  return []
}

// Authentication probe. Resolves with the current user/token identity when a
// credential is present and valid; throws SentryError ("Not authenticated…")
// otherwise. Used by preflight to gate the board.
export async function whoami() {
  return runSerial(async () => (await getSdk()).auth.whoami())
}

// All organizations the stored credential can see. Raw org objects (each has a
// `slug`).
export async function orgList(limit = 100) {
  return runSerial(async () => asArray(await (await getSdk()).org.list({ limit })))
}

// Single-page project fetch within an org. Deliberately NOT wrapped in
// runSerial on its own: the CLI's positional org/project value treats a BARE
// slug as a *project*, so listing every project in an org requires the trailing
// `<org>/` form — we normalize to exactly one trailing slash here. Raw project
// objects (each has a `slug`). `cursor` navigates pages ("next"/"prev"/raw
// cursor). Callers that page through the full list must instead run
// projectListRaw inside a single runSerial task so the whole traversal is atomic
// (see listProjects in sentry.mjs).
export async function projectListRaw(org, limit = 100, cursor) {
  const orgProject = `${String(org || '').replace(/\/+$/, '')}/`
  return asArray(await (await getSdk()).project.list({ orgProject, limit, ...(cursor ? { cursor } : {}) }))
}

// Verify a specific project exists / is accessible. Returns the raw project
// object on success; throws SentryError when the slug is unknown or forbidden.
export async function projectView(org, slug) {
  return runSerial(async () => (await getSdk()).project.view({ orgProject: `${org}/${slug}` }))
}

// Search issues. `orgProject` is "org/project" (or the trailing-slash "org/" form
// for all projects in the org — a bare slug would be read as a project). Mirrors the previous MCP search: date sort, 100 cap, windowed by
// `period`. Returns an array of raw IssueListResult objects; throws SentryError
// on an API/permission failure so the caller can surface it instead of rendering
// an empty (all-clear) board.
export async function issueList({ orgProject, query, sort = 'date', limit = 100, period } = {}) {
  return runSerial(async () =>
    asArray(
      await (await getSdk()).issue.list({
        ...(orgProject ? { orgProject } : {}),
        ...(query ? { query } : {}),
        ...(period ? { period } : {}),
        sort,
        limit,
      })
    )
  )
}
