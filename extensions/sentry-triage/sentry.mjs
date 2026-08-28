// Deterministic Sentry data layer for the triage canvas.
//
// Everything that decides WHICH issues exist, their counts, and how they are
// categorized lives here in code — driven straight off the Sentry CLI SDK. The
// model is never asked "what are the issues"; it is only (optionally, and
// elsewhere) asked to rephrase a title into plain English. That is what stops the
// canvas from ever showing remembered / stale data.
//
// The SDK returns parsed JSON (typed IssueListResult / project / org objects), so
// there is no markdown to parse: we adapt those JSON shapes into the canvas's
// internal issue model. The adapters + categorizer are pure functions; only
// listOrgs / listProjects / findProject / scanIssues touch the network (via
// ./sentryClient.mjs), and they surface SentryError as a user-facing message.

import {
  orgList,
  projectView,
  issueList,
  projectListRaw,
  runSerial,
  SentryError,
} from './sentryClient.mjs'

// Surface only genuinely high-impact ongoing issues in "escalating" when Sentry
// itself has not tagged them is:escalating. Kept as named constants so the
// selection rule is explicit rather than a magic number buried in a condition.
const HIGH_IMPACT_USERS = 40
const HIGH_IMPACT_EVENTS = 100
// "New" = first seen within roughly the on-call window.
const NEW_MAX_AGE_HOURS = 24
const NEW_MIN_USERS = 2

// Human label for the selected window, e.g. "24h" -> "last 24 hours".
export function windowLabel(period) {
  const m = String(period || '').match(/^(\d+)\s*([hdw])$/i)
  if (!m) return 'selected window'
  const n = parseInt(m[1], 10)
  const u = m[2].toLowerCase()
  const unit = u === 'h' ? 'hour' : u === 'd' ? 'day' : 'week'
  return `last ${n} ${unit}${n === 1 ? '' : 's'}`
}

function toInt(value) {
  if (value == null) return 0
  const n = parseInt(String(value).replace(/[,\s]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

// Age in hours from an ISO 8601 timestamp. The SDK returns real first/last-seen
// timestamps (unlike the old MCP markdown, which clamped first-seen to the
// window edge), so this is a true age. Missing / unparsable -> Infinity so the
// issue never counts as "new".
export function ageHoursFromIso(iso, now = Date.now()) {
  if (!iso) return Infinity
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return Infinity
  return (now - t) / 3_600_000
}

// Render an ISO timestamp as a short relative phrase ("just now", "20 hours ago",
// "5 days ago") for the human-facing reason text. Empty / unparsable -> ''.
export function humanizeSince(iso, now = Date.now()) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const mins = Math.max(0, Math.round((now - t) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.round(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

// Adapt one raw SDK IssueListResult into the canvas's internal issue shape.
// `now` is injectable for deterministic tests. firstSeen/lastSeen are humanized
// for display; ageHours is the true numeric age used by the categorizer.
export function mapIssue(raw, now = Date.now()) {
  if (!raw || !raw.shortId) return null
  const firstSeenIso = raw.firstSeen || ''
  return {
    key: String(raw.shortId),
    url: raw.permalink || '',
    title: raw.title ? String(raw.title).replace(/\s+/g, ' ').trim() : String(raw.shortId),
    users: toInt(raw.userCount),
    events: toInt(raw.count),
    firstSeen: humanizeSince(firstSeenIso, now),
    lastSeen: humanizeSince(raw.lastSeen || '', now),
    firstSeenIso,
    ageHours: ageHoursFromIso(firstSeenIso, now),
  }
}

// Adapt a list of raw SDK issues, dropping anything without a short id.
export function mapIssues(list, now = Date.now()) {
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const issue = mapIssue(raw, now)
    if (issue) out.push(issue)
  }
  return out
}

// Adapt raw SDK org objects into slugs (deduped, order preserved).
export function mapOrgs(list) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    const slug = String(raw?.slug || '').trim()
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      out.push(slug)
    }
  }
  return out
}

// Adapt raw SDK project objects into slugs (deduped, order preserved).
export function mapProjects(list) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    const slug = String(raw?.slug || '').trim()
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      out.push(slug)
    }
  }
  return out
}

// List the org slugs this Sentry connection can access. Fast and reliable, so
// it's safe to call on canvas open. Never throws — returns [] on any error
// (including "not authenticated") so the setup form still renders and the auth
// gate is what tells the user to sign in.
export async function listOrgs() {
  try {
    return mapOrgs(await orgList())
  } catch (err) {
    console.error('[sentry-triage] listOrgs failed:', err instanceof Error ? err.message : err)
    return []
  }
}

function reasonFor(id, issue, ctx) {
  if (id === 'regressions') {
    return `Sentry flagged this as regressed`
  }
  if (id === 'escalating') {
    if (issue.sentryEscalating) return `Sentry flagged this as escalating`
    return `Active within the ${ctx.windowLabel}`
  }
  // new-critical: the SDK gives a true first-seen timestamp, so we can report it
  // honestly whenever we have one.
  if (Number.isFinite(issue.ageHours) && issue.firstSeen) {
    return `First seen ${issue.firstSeen}`
  }
  return `Active within the ${ctx.windowLabel}`
}

// Pure categorizer. Takes the parsed main issue list plus the sets of issue keys
// Sentry itself classifies as regressed / escalating, and returns the canvas
// category structure (plainEnglish is filled in later by the caller). `period`
// is the selected board window, used to phrase window-relative reasons honestly.
export function categorize({ issues = [], regressed = new Set(), escalating = new Set(), period = '24h' } = {}) {
  const byUrgency = (a, b) => b.users - a.users || b.events - a.events
  const regressions = []
  const escalatingOut = []
  const newCritical = []

  for (const issue of issues) {
    if (regressed.has(issue.key)) {
      regressions.push(issue)
    } else if (
      escalating.has(issue.key) ||
      (issue.ageHours >= NEW_MAX_AGE_HOURS &&
        (issue.users >= HIGH_IMPACT_USERS || issue.events >= HIGH_IMPACT_EVENTS))
    ) {
      escalatingOut.push({ ...issue, sentryEscalating: escalating.has(issue.key) })
    } else if (issue.ageHours < NEW_MAX_AGE_HOURS && issue.users >= NEW_MIN_USERS) {
      // New Critical is strictly `<` the boundary; the escalation branch above
      // owns exactly-at-boundary issues via `>=`. Together they leave no gap: at
      // a 24h scan Sentry clamps an older issue's first-seen to exactly 24h, and
      // that boundary case belongs with old/ongoing (escalating if high-impact),
      // never "New Critical". A boundary issue that isn't high-impact simply
      // isn't urgent enough for any bucket.
      newCritical.push(issue)
    }
  }

  regressions.sort(byUrgency)
  escalatingOut.sort(byUrgency)
  newCritical.sort(byUrgency)

  const ctx = { windowLabel: windowLabel(period) }
  const make = (id, name, arr) => ({
    id,
    name,
    issues: arr.map((issue) => ({
      key: issue.key,
      summary: issue.title,
      plainEnglish: '',
      reason: reasonFor(id, issue, ctx),
      events: issue.events,
      users: issue.users,
      url: issue.url,
    })),
  })

  const categories = []
  if (regressions.length) categories.push(make('regressions', '🔄 Regressions', regressions))
  if (escalatingOut.length) categories.push(make('escalating', '📈 Escalating', escalatingOut))
  if (newCritical.length) categories.push(make('new-critical', '🆕 New Critical', newCritical))
  return categories
}

// All project slugs in an org. Pages through the list (the API caps each page at
// 100) so orgs with many projects are fully represented in the dropdown. The
// loop is bounded and stops as soon as a page adds no new slugs, so it stays
// safe even if the underlying cursor doesn't advance. Throws SentryError on an
// auth/permission failure.
//
// `onPage(slugsSoFar)` — if provided, called after each page with a snapshot of
// everything collected so far. This lets callers stream results to the UI: the
// first ~100 projects land in ~1s and the rest fill in over the following
// seconds, instead of the caller waiting for the whole (potentially large) list.
export async function listProjects(org, onPage) {
  // Run the ENTIRE paged traversal as one atomic SDK operation. The CLI resolves
  // the symbolic "next" cursor through global per-command state, so pages must not
  // interleave with each other or with any other SDK call (a concurrent issue
  // scan, another instance's discovery, a second traversal of this same org).
  // runSerial holds the module-wide queue for the whole loop, which guarantees
  // that. Inside the task we use projectListRaw (un-queued) to avoid re-entering
  // the queue we already hold.
  return runSerial(() => listProjectsPaged(org, onPage))
}

async function listProjectsPaged(org, onPage) {
  const seen = new Set()
  const out = []
  const PAGE = 100
  const MAX_PAGES = 20
  // Wall-clock budget: mega-orgs (e.g. "github" has thousands of projects) can
  // take minutes to fully page through, leaving the autocomplete spinning. Stop
  // once we've spent this long and return what we have — the client filters the
  // collected slugs, and a few hundred is plenty to type against. With streaming
  // (onPage) the first page is usable almost immediately regardless.
  const BUDGET_MS = 8000
  const started = Date.now()
  let cursor
  for (let page = 0; page < MAX_PAGES; page++) {
    let raw
    try {
      raw = await projectListRaw(org, PAGE, cursor)
    } catch (err) {
      // A transient page failure (network blip / rate limit) mid-pagination must
      // not discard the projects we already collected. Surface the error only
      // when we have nothing at all (e.g. page 0 failed => likely auth/bad org).
      if (out.length) break
      throw err
    }
    let added = 0
    for (const slug of mapProjects(raw)) {
      if (seen.has(slug)) continue
      seen.add(slug)
      out.push(slug)
      added++
    }
    if (added && typeof onPage === 'function') {
      try { onPage(out.slice()) } catch { /* streaming is best-effort */ }
    }
    if (raw.length < PAGE || added === 0) break
    if (Date.now() - started > BUDGET_MS) break
    cursor = 'next'
  }
  return out
}

// Verify a specific project slug exists / is accessible. The org's project list
// is capped, so a valid slug may not appear in it; project view resolves any
// slug directly. Returns the canonical slug on success, or '' ONLY when the
// project is confirmed not to exist. A transient/permission failure (network,
// rate limit, 403, 5xx) is NOT a "not found": it re-throws so the caller can
// report "couldn't check" instead of a false "no such project" that would train
// the user to distrust a correct slug. Runs on the shared serial SDK chain
// (projectView); interactive callers invoke it only on an explicit commit, so it
// never floods that queue.
export async function findProject(org, slug) {
  const wanted = String(slug || '').trim()
  if (!wanted) return ''
  try {
    const project = await projectView(org, wanted)
    const resolved = String(project?.slug || '').trim()
    return resolved || wanted
  } catch (err) {
    if (err instanceof SentryError && isProjectNotFound(err)) return ''
    throw err
  }
}

// Decide whether a failed project.view means the project genuinely does not
// exist (a confirmed 404 / "not found"), as opposed to a failure that merely
// prevented the check. A definite non-404 HTTP status (403/429/5xx) is never a
// not-found; only an explicit 404 or an unambiguous not-found message counts.
function isProjectNotFound(err) {
  const info = sentryErrorInfo(err)
  if (info && info.code) return info.code === 404
  const t = `${err?.message || ''}\n${err?.stderr || ''}`
  if (/permission|forbidden|not authorized|unauthorized/i.test(t)) return false
  return /\bnot found\b|no such project|does(?:n't| not) exist|unknown project/i.test(t)
}

// Per-query issue search. `limit` bounds a single call; the SDK auto-pages up to
// the SDK max (1000) to satisfy it. The primary board search and the targeted
// regression/escalation searches all pass an explicit bounded cap so an org with
// far more than 100 open/priority issues doesn't silently lose the remainder.
async function searchIssueList(orgProject, query, period, limit = 100) {
  return mapIssues(await issueList({ orgProject, query, sort: 'date', limit, period }))
}

// Bounded safety cap for the primary `is:unresolved` board search. 100 (one API
// page) let a high-impact issue outside the 100 most-recently-seen fall off the
// board entirely; we page up to the SDK max so the "thousands of unresolved
// errors" the canvas promises are actually considered, while still bounding work.
const PRIMARY_LIMIT = 1000

// Upper bound for the targeted priority searches (regressed / escalating). These
// are the buckets we can't afford to truncate, so we ask for the SDK's max.
const PRIORITY_LIMIT = 1000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Run a targeted priority search with one retry. A bare `catch {}` here would
// turn a transient/rate-limited failure into a silent "no regressions", so a
// real regression could be dropped or misbucketed while the scan still reports
// success. A permanent "unsupported filter" (400) means Sentry rejected this
// priority query, which is indistinguishable from a legitimately empty bucket —
// but these are the exact high-priority buckets the canvas must not silently
// drop, so record a warning (don't retry) rather than reporting a clean empty.
// On a persistent transport failure, log and record a warning too so the
// incompleteness isn't swallowed.
async function searchPriority(orgProject, query, period, warnings, label) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await searchIssueList(orgProject, query, period, PRIORITY_LIMIT)
    } catch (err) {
      const info = sentryErrorInfo(err)
      if (info && info.code === 400) {
        warnings.push(label)
        console.error(`[sentry-triage] priority search rejected (400) (${label}):`, err instanceof Error ? err.message : err)
        return []
      }
      if (attempt === 0) {
        await delay(250)
        continue
      }
      warnings.push(label)
      console.error(`[sentry-triage] priority search failed (${label}):`, err instanceof Error ? err.message : err)
      return []
    }
  }
  return []
}

// Merge several issue lists into one, de-duplicating by key and keeping the
// first record seen (the primary list wins). Used so priority issues fetched by
// targeted searches still appear even when they fall outside the main list.
function mergeIssues(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const issue of list) {
      if (!issue || !issue.key || seen.has(issue.key)) continue
      seen.add(issue.key)
      out.push(issue)
    }
  }
  return out
}

// Extract an HTTP-ish status code from a thrown SentryError so a permission/API
// failure isn't silently rendered as "0 issues" (an empty, all-clear board). The
// SDK carries the API message in `.message` / `.stderr`; a scoped read failure
// shows up as "(403)" / "403 Forbidden". Returns { code } or null.
export function sentryErrorInfo(err) {
  if (!err) return null
  const t = `${err.message || ''}\n${err.stderr || ''}`
  const m = t.match(/\b(?:API error|HTTP)?\s*\(?(40\d|41\d|42\d|50\d)\)?\b/i)
  if (m) return { code: Number(m[1]) }
  if (/permission|forbidden|not authorized|unauthorized/i.test(t)) return { code: 403 }
  return null
}

// Turn a detected Sentry error into a short, plain-English message for the board.
// A scoped 403 is the common case: the account can search the org but not that
// specific project.
export function describeScanError(info, project) {
  const where = project ? `project "${project}"` : 'this organization'
  if (info && info.code === 403) {
    return project
      ? `Your Sentry account doesn't have access to project "${project}" (403). Try a project you have access to, or check your Sentry login.`
      : `Your Sentry account doesn't have permission to read issues here (403). Check your Sentry login.`
  }
  if (info && info.code) return `Sentry returned an error (${info.code}) while reading ${where}. Try again shortly.`
  return `Sentry returned an error while reading ${where}. Try again shortly.`
}

// Fetch + categorize live from Sentry over the requested time window (default
// 24h). The user can widen the window from the issues list, so we honor the
// chosen period exactly rather than silently auto-widening. Sentry's own
// is:regressed / is:escalating sets drive those buckets so they reflect real
// Sentry state rather than a heuristic guess.
//
// The primary `is:unresolved` search is paged up to a bounded cap (PRIMARY_LIMIT)
// and sorted by last-seen; a plain 100-item page could drop a high-impact issue
// that hasn't been seen recently. We additionally fetch the regressed /
// escalating sets and merge them in before categorizing — those two priority
// buckets are exactly the ones we can't afford to miss.
//
// Returns { categories, error, scanned, capped, older, olderCapped, warnings }:
// error is a user-facing string when Sentry refused the primary request (e.g. a
// scoped 403); scanned is the number of distinct open issues we examined; capped
// is true when the primary search hit PRIMARY_LIMIT (so more open issues likely
// exist beyond what we scanned); warnings is a (usually empty) list of
// non-fatal priority-bucket labels that failed to load, so a partially-complete
// scan isn't silently reported as all-clear; older counts unresolved issues that
// exist OUTSIDE the window (only computed when the window came back empty) so the
// empty state can point the user at a wider range.
export async function scanIssues(org, project, period = '24h') {
  const win = typeof period === 'string' && period ? period : '24h'
  // The Sentry CLI treats a bare slug as a *project*, so an org-wide scan must
  // pass the `<org>/` form; a scoped scan keeps the `<org>/<project>` form.
  const orgProject = project ? `${org}/${project}` : `${String(org || '').replace(/\/+$/, '')}/`

  // A tool error on the primary search means we can't trust anything below it —
  // surface it instead of falling through to an empty board.
  let issues
  try {
    issues = await searchIssueList(orgProject, 'is:unresolved', win, PRIMARY_LIMIT)
  } catch (err) {
    return { categories: [], error: describeScanError(sentryErrorInfo(err), project), scanned: 0, capped: false, warnings: [] }
  }
  const capped = issues.length >= PRIMARY_LIMIT

  const warnings = []
  const regressedIssues = await searchPriority(orgProject, 'is:unresolved is:regressed', win, warnings, 'regressed issues')
  const escalatingIssues = await searchPriority(orgProject, 'is:unresolved is:escalating', win, warnings, 'escalating issues')

  const regressed = new Set(regressedIssues.map((i) => i.key))
  const escalating = new Set(escalatingIssues.map((i) => i.key))
  // Union the priority issues in so an important regression/escalation outside
  // the 100-most-recent primary list still gets surfaced. Main list first so its
  // records win on dedup; categorize re-sorts each bucket by impact anyway.
  const merged = mergeIssues(issues, regressedIssues, escalatingIssues)

  // When the chosen window is empty, the project may still have unresolved
  // issues that are simply older than the window (a common source of "but I know
  // there are issues here!" confusion). Do one wider look-back so the empty state
  // can say how many exist outside the window and nudge the user to widen it.
  // Only when the window itself came back empty (so anything the wide search
  // finds is genuinely outside it) and only when a wider window exists.
  let older = 0
  let olderCapped = false
  if (merged.length === 0 && win !== '90d') {
    try {
      const wide = await searchIssueList(orgProject, 'is:unresolved', '90d', PRIMARY_LIMIT)
      older = wide.length
      olderCapped = wide.length >= PRIMARY_LIMIT
    } catch {
      /* best-effort — leave older at 0 */
    }
  }

  return {
    categories: categorize({ issues: merged, regressed, escalating, period: win }),
    error: null,
    scanned: merged.length,
    capped,
    older,
    olderCapped,
    warnings,
  }
}
