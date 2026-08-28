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

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

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
  constructor(message, exitCode = 0, stderr = '') {
    super(message)
    this.name = 'SentryError'
    this.exitCode = exitCode
    this.stderr = stderr
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
let installPromise = null
let loginPromise = null

// One-click install for the missing `sentry` package, driven by the setup
// gate's "Install dependencies" button (see extension.mjs installDependencies /
// server.mjs POST /api/install-dependencies). Runs `npm install` rooted at THIS
// file's own directory — i.e. the extension's actual on-disk location, whatever
// that is (repo source, a user/project extensions folder, or an installed
// plugin's materialized copy) — so it never depends on a user or agent guessing
// the right path (the earlier manual "ask Copilot to install" flow's failure
// mode). Serialized on the same sdkQueue as every other SDK call so it can't run
// concurrently with an in-flight probe. Concurrent install clicks share one
// in-flight install instead of queueing redundant npm installs.
export function installPackage() {
  if (installPromise) return installPromise
  installPromise = runSerial(async () => {
    // Windows can't exec the `npm.cmd` shim directly without a shell, and a raw
    // `new URL('.', import.meta.url).pathname` yields a URL-style path like
    // "/C:/..." rather than a native Windows path — fileURLToPath handles both
    // platforms correctly.
    const cwd = fileURLToPath(new URL('.', import.meta.url))
    // Async execFile (not execFileSync): this module and its loopback HTTP/SSE
    // servers are shared by every canvas instance in the process, so a
    // synchronous, up-to-120s install would freeze all of them. runSerial's
    // queue already prevents this from overlapping with other SDK/install
    // calls, so there's no concurrency downside to awaiting it instead.
    await execFileAsync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
      cwd,
      timeout: 120_000,
      shell: process.platform === 'win32',
    })
    sdkFactory = null
    sdk = null
  }).finally(() => {
    installPromise = null
  })
  return installPromise
}

// Import the optional `sentry` package exactly once. Throws a SentryError tagged
// SENTRY_PACKAGE_MISSING when it can't be resolved, and swaps in the SDK's real
// SentryError class (live ESM binding) when it can.
//
async function loadFactory() {
  if (sdkFactory) return sdkFactory
  let mod
  try {
    mod = await import('sentry')
  } catch (err) {
    if (!(err && err.code === 'ERR_MODULE_NOT_FOUND')) throw err
    // ERR_MODULE_NOT_FOUND is also what Node throws when `sentry` itself
    // resolves fine but one of ITS OWN dependencies is missing (e.g. a
    // corrupt or partial install) — that's a real defect, not a "not
    // installed" state, and must not be masked as package-missing. Only the
    // "Cannot find package/module 'sentry'" message means the bare specifier
    // itself failed to resolve.
    const message = String((err && err.message) || '')
    const sentryItselfMissing = /Cannot find (?:package|module) 'sentry'/.test(message)
    if (!sentryItselfMissing) throw err
    const missing = new SentryError(PACKAGE_MISSING_MESSAGE, 0, '')
    missing.code = 'SENTRY_PACKAGE_MISSING'
    throw missing
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

// One-click sign-in for the "not authenticated" setup gate, driven by the
// gate's "Sign in with Sentry" button (see preflight.mjs authenticate() /
// server.mjs POST /api/auth-login). Runs the SDK's own OAuth device-code
// flow — the exact same flow `npx sentry auth login` drives from a
// terminal — which opens the user's default browser and waits for them to
// approve. Serialized on the same sdkQueue as every other SDK call (this
// module's whole reason for existing single-flights everything): the CLI
// keeps global auth state, so a concurrent whoami()/scan while login() is
// mid-flow would race the same on-disk credential login() is about to write.
// Any caller queued behind this one simply waits for the user to finish
// approving in their browser, same as a real terminal `sentry auth login`
// would block the shell.
//
// A closed tab or an ignored prompt would otherwise wait forever (the SDK
// default timeout is 900s / 15 minutes) and wedge the sdkQueue for every
// other Sentry call behind it — so we bound it here to something the setup
// gate can reasonably ask a user to wait through. On timeout the device code
// is left stale server-side; the caller can just click "Sign in" again to
// mint a fresh one.
//
// NOTE: the SDK's `timeout` is in SECONDS, not milliseconds (see
// AuthLoginParams in the sentry package's type defs) — do not multiply by
// 1000 here.
//
// `force: true` because this button is also how a signed-in-but-invalid
// credential (expired/revoked token) re-authenticates: in this non-TTY
// extension process, auth.login() silently declines to replace an existing
// credential unless forced, which would otherwise leave "Sign in again"
// wired to a no-op. `readOnly: true` requests only the read-only OAuth
// scopes (project:read, org:read, event:read, member:read, team:read) since
// this canvas only ever reads Sentry data — no need for the default
// write/admin scopes.
const LOGIN_TIMEOUT_SECONDS = 120

export function login() {
  if (loginPromise) return loginPromise
  loginPromise = runSerial(async () => {
    // SENTRY_AUTH_TOKEN / SENTRY_TOKEN take precedence over the stored OAuth
    // credential (see the module header). If one is set, auth.login() can
    // still "succeed" and write a fresh OAuth login, but every subsequent
    // call (including the whoami() probe authenticate() runs right after)
    // keeps using the env token instead — so an invalid/expired env token
    // would make this button look like it worked while leaving the gate
    // signed out. Fail fast with actionable guidance instead of running an
    // OAuth flow that can't actually take effect.
    const envToken = process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_TOKEN
    if (envToken) {
      const envVar = process.env.SENTRY_AUTH_TOKEN ? 'SENTRY_AUTH_TOKEN' : 'SENTRY_TOKEN'
      const err = new SentryError(
        `${envVar} is set in this environment and takes precedence over signing in here. Unset it (or replace it with a valid token) and try again.`,
        0,
        ''
      )
      err.code = 'SENTRY_ENV_TOKEN_ACTIVE'
      throw err
    }
    // sentry@0.42.2's login command sets the SHARED extension process's
    // process.exitCode (not just its own in-process return value) when the
    // device flow is denied, cancelled, or expires — a signal meant for a
    // one-shot CLI process exiting non-zero, not for this long-lived host
    // that keeps running other extensions after the call returns. Save and
    // restore it around the call so a failed sign-in here doesn't leave the
    // whole extension host marked to exit unsuccessfully.
    const savedExitCode = process.exitCode
    let result
    try {
      result = await (await getSdk()).auth.login({ timeout: LOGIN_TIMEOUT_SECONDS, force: true, readOnly: true })
    } finally {
      process.exitCode = savedExitCode
    }
    // sentry@0.42.2's login command does not reliably reject when the device
    // flow is denied, cancelled, or expires — it can resolve with an empty/
    // falsy result after only setting its own CLI exit code, which this SDK
    // wrapper doesn't surface. Left unchecked, authenticate() would silently
    // re-probe and the caller (the auth-login route) would report ok:true for
    // what was actually a failed sign-in. Treat an empty result as a failure
    // so the specific "still not signed in" path in the gate is reachable.
    if (!result) {
      const err = new SentryError('Sign-in was not completed (denied, cancelled, or the code expired).', 0, '')
      err.code = 'SENTRY_LOGIN_INCOMPLETE'
      throw err
    }
    return result
  }).finally(() => {
    loginPromise = null
  })
  return loginPromise
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

// Verify a specific project exists / is accessible via the SDK's O(1)
// `project.view`. Returns the raw project object on success; throws SentryError
// when the slug is unknown or forbidden.
//
// This runs on the SAME shared `runSerial` chain as every other SDK call — there
// is deliberately NO separate "fast lane". `sentry@0.42.2` keeps its per-command
// and pagination state in MODULE-GLOBAL SDK state (see the runSerial note above),
// so a second SDK instance would NOT be a concurrency-isolation boundary: it would
// still race the paged list / scan and corrupt that shared state. `project.view`
// is a single, cursor-free call, so funneling it through the one FIFO chain is
// both correct and cheap. Interactive callers trigger it only on an explicit
// commit (not per keystroke), so a real user never floods this queue.
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
