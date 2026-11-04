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
// ONE queue here — nothing else in the codebase touches the SDK directly.
//
// `runSerial(task)` runs `task` only once the task in flight has settled, so at
// most one SDK operation is ever in flight process-wide. It is the single choke
// point; the public functions below are thin queued wrappers. Each task should be
// a SINGLE SDK call: a multi-call traversal that holds the queue for its whole
// run starves every interactive lookup behind it (see projectListPage, which
// pages via an explicit cursor so each page queues independently).
//
// Waiting tasks run highest `priority` first and FIFO within a priority, so a
// user opening an issue doesn't wait behind a background scan. Every existing
// caller uses the default priority and keeps strict FIFO ordering. The returned
// promise exposes `promote(priority)` so a queued prefetch can be bumped when
// the user actually opens that issue.
export const PRIORITY = Object.freeze({ background: 0, prefetch: 1, interactive: 2 })
const sdkQueue = []
let sdkBusy = false

function enqueueTask(entry) {
  const at = sdkQueue.findIndex((queued) => queued.priority < entry.priority)
  sdkQueue.splice(at === -1 ? sdkQueue.length : at, 0, entry)
}

function pumpQueue() {
  if (sdkBusy) return
  const next = sdkQueue.shift()
  if (!next) return
  sdkBusy = true
  next.started = true
  // A failed task never wedges the queue for everyone behind it; each caller
  // still awaits its own promise for the real result/error.
  Promise.resolve()
    .then(next.task)
    .then(next.resolve, next.reject)
    .finally(() => {
      sdkBusy = false
      pumpQueue()
    })
}

export function runSerial(task, { priority = PRIORITY.background } = {}) {
  let entry
  const run = new Promise((resolve, reject) => {
    entry = { task, priority, resolve, reject, started: false }
  })
  run.promote = (nextPriority) => {
    if (entry.started || !(nextPriority > entry.priority)) return
    sdkQueue.splice(sdkQueue.indexOf(entry), 1)
    entry.priority = nextPriority
    enqueueTask(entry)
  }
  enqueueTask(entry)
  pumpQueue()
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

// Single page of an org's project list, fetched as its OWN queued task and
// returning an explicit `nextCursor` so the caller can resume without holding
// the queue between pages.
//
// This is what keeps a mega-org's multi-page traversal from starving the rest of
// the UI. The symbolic "next" cursor resolves through the SDK's module-global
// per-command state, so a traversal that used it had to hold the whole sdkQueue
// for every page (otherwise an interleaved call would clobber that state) —
// which meant a slow `github`-sized list blocked the O(1) project.view lookup
// behind it for minutes and left "Checking Sentry…" spinning. The envelope's
// `nextCursor` is a self-contained opaque token, so each page can be an
// independent runSerial task and interactive lookups can slot in between them.
//
// The CLI's positional org/project value treats a BARE slug as a *project*, so
// listing every project in an org requires the trailing `<org>/` form — we
// normalize to exactly one trailing slash here.
//
// Returns { projects, nextCursor, hasMore }. `hasMore` is the SDK envelope's own
// "there are further pages" signal (defaults to false when the envelope omits
// it); `nextCursor` is '' unless the SDK handed back a usable opaque token. The
// two are reported separately so the caller can tell "genuinely done" (hasMore
// false) apart from "more pages exist but we have no cursor to fetch them" — the
// latter is an incomplete traversal, not a terminal one, and must stay retryable.
export async function projectListPage(org, limit = 100, cursor) {
  const orgProject = `${String(org || '').replace(/\/+$/, '')}/`
  const res = await runSerial(async () => (await getSdk()).project.list({ orgProject, limit, ...(cursor ? { cursor } : {}) }))
  const projects = asArray(res)
  // Only trust an explicit opaque cursor. A truthy `hasMore` without a usable
  // `nextCursor` would otherwise tempt us back onto the symbolic "next" token
  // and reintroduce the global-state coupling this function exists to avoid.
  const next = res && typeof res === 'object' && typeof res.nextCursor === 'string' ? res.nextCursor.trim() : ''
  const hasMore = res && typeof res === 'object' ? res.hasMore === true : false
  return { projects, nextCursor: hasMore ? next : '', hasMore }
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

// Issue detail for the canvas drill-in view, in two parts so the panel can paint
// progressively:
//   'core' — `issue.view` alone: header, stack trace, breadcrumbs and trace.
//   'full' — core plus the group (event stats, releases, activity) and the tag
//            breakdown. The group payload already embeds activity, so there is
//            no separate activities call.
// Each SDK call queues independently on runSerial and is cached briefly, with
// in-flight requests shared, so a hover prefetch, the core request and the full
// request for the same issue never repeat work. Only `issue.view` is required;
// the group and tags are best-effort enrichments.
const DETAIL_TTL_MS = 60_000
const DETAIL_CACHE_MAX = 150
const detailCache = new Map()

function cachedCall(id, priority, task) {
  const now = Date.now()
  const hit = detailCache.get(id)
  if (hit && now - hit.at < DETAIL_TTL_MS) {
    hit.promise.promote(priority)
    return hit.promise
  }
  const promise = runSerial(task, { priority })
  detailCache.delete(id)
  detailCache.set(id, { at: now, promise })
  promise.catch(() => {
    if (detailCache.get(id)?.promise === promise) detailCache.delete(id)
  })
  while (detailCache.size > DETAIL_CACHE_MAX) detailCache.delete(detailCache.keys().next().value)
  return promise
}

export async function issueDetail(org, key, { part = 'full', priority = PRIORITY.interactive } = {}) {
  const view = await cachedCall(`view:${org}:${key}`, priority, async () => (await getSdk()).issue.view({ issue: key, spans: 8 }))
  if (part === 'core') return { ...shapeIssueDetail(view, null, null), partial: true }
  const groupId = view && view.id
  const safeOrg = encodeURIComponent(org)
  const [group, tags] = groupId
    ? await Promise.all([
        cachedCall(`group:${org}:${groupId}`, priority, async () => (await getSdk()).api({ endpoint: `organizations/${safeOrg}/issues/${groupId}/` })).catch(() => null),
        cachedCall(`tags:${org}:${groupId}`, priority, async () => (await getSdk()).api({
          endpoint: `organizations/${safeOrg}/issues/${groupId}/tags/?key=release&key=environment&key=os&key=os_version&key=device&limit=4`,
        })).catch(() => null),
      ])
    : [null, null]
  return shapeIssueDetail(view, group, tags)
}

function shapeIssueDetail(view, group, tags) {
  let event = view && view.event
  if (typeof event === 'string') {
    try { event = JSON.parse(event) } catch { event = null }
  }
  event = event && typeof event === 'object' ? event : {}
  const entries = Array.isArray(event.entries) ? event.entries : []
  const exEntry = entries.find((e) => e && e.type === 'exception')
  const exceptions = (exEntry && exEntry.data && Array.isArray(exEntry.data.values) ? exEntry.data.values : [])
    .slice(0, 4)
    .map((v) => ({
      type: v.type || '',
      value: v.value || '',
      frames: (v.stacktrace && Array.isArray(v.stacktrace.frames) ? v.stacktrace.frames : [])
        .slice(-20)
        .reverse()
        .map((f) => ({
          file: f.filename || f.absPath || f.module || '',
          line: f.lineNo ?? null,
          fn: f.function || '',
          inApp: !!f.inApp,
        })),
    }))
  const crumbEntry = entries.find((e) => e && e.type === 'breadcrumbs')
  const breadcrumbs = (crumbEntry && crumbEntry.data && Array.isArray(crumbEntry.data.values) ? crumbEntry.data.values : [])
    .slice(-15)
    .reverse()
    .map((b) => ({
      ts: b.timestamp || '',
      category: b.category || b.type || '',
      level: b.level || '',
      message: String(b.message || (b.data ? JSON.stringify(b.data) : '')).slice(0, 300),
    }))
  const traceCtx = (event.contexts && event.contexts.trace) || {}
  const spans = (view && view.trace && Array.isArray(view.trace.spans) ? view.trace.spans : []).slice(0, 25).map((s) => ({
    id: s.span_id || '',
    description: s.description || s.transaction || '',
    shortId: s.short_id || '',
    project: s.project_slug || '',
    eventType: s.event_type || '',
    level: s.level || '',
    start: s.start_timestamp ?? null,
    end: s.timestamp ?? s.end_timestamp ?? null,
  }))
  const tagList = Array.isArray(tags) ? tags : Array.isArray(group && group.tags) ? group.tags : []
  const tagBreakdown = tagList
    .filter((t) => t && Array.isArray(t.topValues) && t.topValues.length)
    .map((t) => {
      const total = Number(t.totalValues) || t.topValues.reduce((n, v) => n + (Number(v.count) || 0), 0) || 1
      return {
        key: t.key,
        name: t.name || t.key,
        values: t.topValues.slice(0, 4).map((v) => ({
          value: String(v.value ?? v.name ?? ''),
          pct: Math.round(((Number(v.count) || 0) / total) * 100),
        })),
      }
    })
  const stats = (group && group.stats) || {}
  const toSeries = (arr) => (Array.isArray(arr) ? arr.map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]) : [])
  const activities = (Array.isArray(group && group.activity) ? group.activity : [])
    .slice(0, 12)
    .map((a) => ({
      type: a.type || '',
      date: a.dateCreated || '',
      user: (a.user && (a.user.name || a.user.username)) || '',
    }))
  const v = view || {}
  return {
    key: v.shortId || '',
    title: v.title || '',
    culprit: v.culprit || '',
    type: (v.metadata && v.metadata.type) || '',
    value: (v.metadata && v.metadata.value) || '',
    level: v.level || '',
    status: v.status || '',
    substatus: v.substatus || '',
    priority: v.priority || '',
    platform: v.platform || event.platform || '',
    project: (v.project && v.project.slug) || '',
    permalink: v.permalink || '',
    count: Number(v.count) || 0,
    userCount: Number(v.userCount) || 0,
    firstSeen: v.firstSeen || '',
    lastSeen: v.lastSeen || '',
    isUnhandled: !!v.isUnhandled,
    firstRelease: (group && group.firstRelease && (group.firstRelease.shortVersion || group.firstRelease.version)) || '',
    lastRelease: (group && group.lastRelease && (group.lastRelease.shortVersion || group.lastRelease.version)) || '',
    stats: { '24h': toSeries(stats['24h']), '30d': toSeries(stats['30d']) },
    tagBreakdown,
    exceptions,
    breadcrumbs,
    eventTags: (Array.isArray(event.tags) ? event.tags : []).slice(0, 40).map((t) => ({ key: t.key, value: String(t.value ?? '') })),
    release: (event.release && (event.release.shortVersion || event.release.version)) || '',
    eventDate: event.dateCreated || '',
    trace: { id: traceCtx.trace_id || (v.trace && v.trace.traceId) || '', status: traceCtx.status || '', spans },
    activity: activities,
  }
}

// Search issues. `orgProject` is "org/project" (or the trailing-slash "org/" form
// for all projects in the org — a bare slug would be read as a project). Mirrors the previous MCP search: date sort, 100 cap, windowed by
// `period`. Returns an array of raw IssueListResult objects; throws SentryError
// on an API/permission failure so the caller can surface it instead of rendering
// an empty (all-clear) board.
//
// Pages manually with the envelope's opaque `nextCursor`, one 100-item page per
// queued task. Asking the SDK for limit:1000 auto-pages internally inside ONE
// task (~35-50s on a large org), which held the sdkQueue and made the detail
// view wait that long; explicit pages are also far faster overall.
const ISSUE_PAGE_SIZE = 100

export async function issueList({ orgProject, query, sort = 'date', limit = 100, period } = {}) {
  const out = []
  let cursor
  while (out.length < limit) {
    const pageLimit = Math.min(ISSUE_PAGE_SIZE, limit - out.length)
    const res = await runSerial(async () =>
      (await getSdk()).issue.list({
        ...(orgProject ? { orgProject } : {}),
        ...(query ? { query } : {}),
        ...(period ? { period } : {}),
        ...(cursor ? { cursor } : {}),
        sort,
        limit: pageLimit,
      })
    )
    const page = asArray(res)
    out.push(...page)
    const next = res && typeof res === 'object' && res.hasMore === true && typeof res.nextCursor === 'string' ? res.nextCursor.trim() : ''
    if (!next || page.length === 0) break
    cursor = next
  }
  return out
}
