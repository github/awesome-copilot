import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { createState, PERIODS } from './state.mjs'
import { PREFS_DISPLAY_PATH } from './prefs.mjs'
import { Page } from './components/page.mjs'

// Cap the buffered request body for the loopback mutation API. Even though every
// mutation is Host-checked and capability-token gated, an attacker-reachable page
// shouldn't be able to grow this process's memory without bound. On overflow we
// answer 413, destroy the request, and resolve null so the caller bails out.
const MAX_BODY_BYTES = 1 << 20 // 1 MiB

function readBody(req, res) {
  return new Promise((resolve) => {
    let body = ''
    let size = 0
    let aborted = false
    req.on('data', (chunk) => {
      if (aborted) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        aborted = true
        if (res && !res.headersSent) {
          res.writeHead(413, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Request body too large' }))
        }
        req.destroy()
        resolve(null)
        return
      }
      body += chunk
    })
    req.on('end', () => { if (!aborted) resolve(body) })
    req.on('error', () => { if (!aborted) resolve(null) })
    // 'end' never fires if the client aborts mid-stream; 'close' always does, so
    // resolve here too (idempotent — a prior 'end' resolve wins) to avoid a hung
    // handler promise.
    req.on('close', () => { if (!aborted) resolve(null) })
  })
}

function parseJson(body) {
  try {
    return body ? JSON.parse(body) : {}
  } catch {
    return {}
  }
}

// Localhost trust model for this per-instance, unauthenticated API.
//
// Two distinct browser attacks reach a localhost port:
//   1. Plain cross-origin POST — a page on attacker.com POSTs a CORS-safelisted
//      body to 127.0.0.1:PORT. The browser sends `Origin: https://attacker.com`
//      and `Host: 127.0.0.1:PORT` (the real target), so Origin != Host.
//   2. DNS rebinding — attacker.com is re-resolved to 127.0.0.1, so the page's
//      own origin now points AT this server. Here Origin == Host (both read
//      attacker.com), so an Origin==Host check passes and the attack succeeds.
//
// Defenses (both required, applied to every request):
//   * Host allow-list — the loopback server only ever answers on the exact
//     `127.0.0.1:PORT` it bound. A rebinding page still sends `Host: attacker.com`
//     (the name the browser navigated to), so requiring Host to equal the bound
//     loopback authority rejects rebinding while the legitimate canvas — loaded
//     from http://127.0.0.1:PORT/ — matches.
//   * Per-instance capability token — a random secret minted at startup, embedded
//     only in the served page and required as a header on every mutation. A
//     cross-origin/rebinding page cannot read the page body cross-origin, so it
//     cannot learn the token; same-origin canvas fetches replay it and pass.
function hostMatches(req, boundHost) {
  return typeof req.headers.host === 'string' && req.headers.host === boundHost
}

function hasValidToken(req, token) {
  const header = req.headers['x-sentry-triage-csrf']
  const value = Array.isArray(header) ? header[0] : header
  return value === token
}

export function startServer({ port = 0, onRefresh, onAction, onWorkSelected, onRecheck, onInstallDependencies, onAuthenticate, onListProjects, onResolveProject, onInvalidateEnrichment, defaults } = {}) {
  // Per-instance state + SSE clients — never shared across canvas instances.
  const state = createState()
  state.applyRepoDefaults(defaults)
  const sseClients = new Set()
  // Per-instance capability token (see hostMatches/hasValidToken). Minted before
  // the server binds; embedded in the served page and required on mutations.
  const csrfToken = randomUUID()
  // The exact `127.0.0.1:PORT` authority this server binds. Set in the listen
  // callback (the port may be ephemeral) and used to reject DNS-rebinding hosts.
  let boundHost = null

  // Single source of truth for the full state snapshot pushed to clients (SSE
  // initial payload, page render props, and every notifyClients broadcast).
  function snapshot() {
    return {
      categories: state.getCategories(),
      scanError: state.getScanError(),
      scannedTotal: state.getScannedTotal(),
      scannedCapped: state.getScannedCapped(),
      scannedOlder: state.getScannedOlder(),
      scannedOlderCapped: state.getScannedOlderCapped(),
      org: state.getOrg(),
      orgOptions: state.getOrgOptions(),
      orgDefault: state.getOrgDefault(),
      savedDefaultOrg: state.getSavedDefaultOrg(),
      project: state.getProject(),
      period: state.getPeriod(),
      periods: PERIODS,
      projects: state.getProjects(),
      projectsOrg: state.getProjectsOrg(),
      connections: state.getConnections(),
      prTargets: state.getPrTargets(),
      availableModels: state.getAvailableModels(),
      prSettingsOpen: state.getPrSettingsOpen(),
      plainEnglishView: state.getPlainEnglishView(),
      issueTrackers: state.getIssueTrackers(),
      selectedTracker: state.getSelectedTracker(),
      workByIssueKey: state.getWorkByIssueKey(),
    }
  }

  function notifyClients() {
    const data = JSON.stringify(snapshot())
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`)
    }
  }

  function notifyWork(key, patch) {
    const status = state.setWorkStatus(key, patch)
    if (!status) return
    const data = JSON.stringify({ work: { key, ...status } })
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`)
    }
  }

  // Broadcast a transient toast message (e.g. "no project found") without
  // touching state — the client shows it and moves on.
  function notifyFlash(message, kind = 'info') {
    const data = JSON.stringify({ flash: { message: String(message || ''), kind } })
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`)
    }
  }

  // Broadcast scan start/stop so the client can show a blocking overlay while a
  // (slow, agent-driven) re-scan is in flight and hide it exactly when done.
  function notifyScanning(isScanning) {
    const data = JSON.stringify({ scanning: Boolean(isScanning) })
    for (const res of sseClients) {
      res.write(`data: ${data}\n\n`)
    }
  }

  function handleRequest(req, res) {
    // Reject DNS-rebinding hosts on EVERY request (see the trust-model comment):
    // a rebinding page still carries its own hostname in `Host`, so anything but
    // the exact bound loopback authority is untrusted — this also keeps the page
    // and its embedded token from being served to a rebinding origin. boundHost
    // is set before the server accepts connections, so it is always populated.
    if (boundHost && !hostMatches(req, boundHost)) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'untrusted host rejected' }))
      return
    }

    // Every state-changing endpoint is a POST, so gating POST with the per-
    // instance capability token covers all mutations in one place. GET (the page
    // + SSE reads) is exempt so the page can load and hand the token to its own
    // same-origin fetches.
    if (req.method === 'POST' && !hasValidToken(req, csrfToken)) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'missing or invalid request token' }))
      return
    }

    // SSE endpoint
    if (req.url === '/api/events') {

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`)
      sseClients.add(res)
      req.on('close', () => sseClients.delete(res))
      return
    }

    // Bulk action endpoint
    if (req.method === 'POST' && req.url === '/api/action') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { categoryId, issueKeys } = parseJson(body)
        state.removeIssues(categoryId, issueKeys)
        notifyClients()
        if (onAction) onAction(categoryId, issueKeys)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    // Refresh endpoint
    if (req.method === 'POST' && req.url === '/api/refresh') {
      if (onRefresh) onRefresh()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    // Re-run the MCP connection preflight (Sentry). Used by the setup
    // gate / warning banner "Re-check" button after the user connects a server.
    if (req.method === 'POST' && req.url === '/api/recheck-connections') {
      Promise.resolve(onRecheck ? onRecheck() : null)
        .then((connections) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, connections: connections || state.getConnections() }))
        })
        .catch((err) => {
          console.error('[sentry-triage] recheck failed:', err instanceof Error ? err.message : err)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, connections: state.getConnections() }))
        })
      return
    }

    // One-click install for the "package-missing" setup gate. Runs `npm install`
    // in the extension's own directory (via onInstallDependencies) and returns
    // the freshly re-probed connection state, so the gate updates without
    // requiring the canvas to be reopened.
    if (req.method === 'POST' && req.url === '/api/install-dependencies') {
      Promise.resolve(onInstallDependencies ? onInstallDependencies() : null)
        .then((connections) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, connections: connections || state.getConnections() }))
        })
        .catch((err) => {
          console.error('[sentry-triage] install-dependencies failed:', err instanceof Error ? err.message : err)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, connections: state.getConnections() }))
        })
      return
    }

    // One-click sign-in for the "not authenticated" setup gate (only shown once
    // the package is installed — see components/page.mjs). Runs the SDK's own
    // OAuth device-code login, which opens the user's browser directly, and
    // returns the freshly re-probed connection state. Unlike install, a failed
    // login (denied consent, expired code, closed tab) is reported back as
    // `ok:false` with a message instead of silently falling back to the stale
    // connection state — the specific reason is worth surfacing in the gate.
    if (req.method === 'POST' && req.url === '/api/auth-login') {
      Promise.resolve(onAuthenticate ? onAuthenticate() : null)
        .then((connections) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, connections: connections || state.getConnections() }))
        })
        .catch((err) => {
          console.error('[sentry-triage] auth-login failed:', err instanceof Error ? err.message : err)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            connections: state.getConnections(),
          }))
        })
      return
    }

    // Fetch the Sentry project list for an org so the project field can render
    // as a dropdown. Fire-and-forget from the client's perspective: the fetched
    // list is broadcast to all clients over SSE by the handler. Used when the
    // user changes the org on the setup screen (before committing to a scan).
    if (req.method === 'POST' && req.url === '/api/list-projects') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { org } = parseJson(body)
        Promise.resolve(onListProjects ? onListProjects(typeof org === 'string' ? org : '') : null)
          .catch((err) => console.error('[sentry-triage] list-projects failed:', err instanceof Error ? err.message : err))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    // Resolve a single exact "org/slug" via the SDK's project.view — an O(1)
    // lookup that confirms a project the paged list may never reach. For a
    // mega-org (e.g. "github" has thousands of projects) list discovery is
    // budget-capped, so a valid slug the user types can be absent from the
    // autocomplete; this endpoint tells the client "yes, that project exists"
    // (with its canonical slug) without paging. Distinguishes three outcomes so
    // the UI never shows a false negative: found, genuinely-missing, and
    // could-not-check (network/permission) — the latter returns ok:false.
    if (req.method === 'POST' && req.url === '/api/resolve-project') {
      readBody(req, res).then(async (body) => {
        if (body === null) return
        const { org, slug } = parseJson(body)
        const wantedOrg = typeof org === 'string' ? org : ''
        const wantedSlug = typeof slug === 'string' ? slug.trim() : ''
        let result = { ok: true, found: false, slug: '' }
        try {
          if (onResolveProject && wantedSlug) {
            const r = await onResolveProject(wantedOrg, wantedSlug)
            const resolved = r && typeof r.slug === 'string' ? r.slug : ''
            result = { ok: true, found: !!(r && r.found && resolved), slug: resolved }
          }
        } catch (err) {
          // A lookup failure (transient network / rate limit / permission) must
          // NOT be reported as "project doesn't exist" — that would train the
          // user to distrust a correct slug. Signal indeterminate with ok:false.
          console.error('[sentry-triage] resolve-project failed:', err instanceof Error ? err.message : err)
          result = { ok: false, found: false, slug: '' }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      })
      return
    }

    // Set org endpoint
    if (req.method === 'POST' && req.url === '/api/set-org') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { org, project, repo } = parseJson(body)
        // Normalize the incoming scope with the same rules the setters apply, so
        // we can tell whether the org/project actually changed. Clicking Fetch on
        // an unchanged scope must NOT clear work badges or bump the scope
        // generation — doing so would abort an in-flight work batch and discard
        // its later PR callback.
        const nextOrg = typeof org === 'string' ? org.trim().toLowerCase() : ''
        const nextProject = typeof project === 'string' ? project.trim() : ''
        const scopeChanged = nextOrg !== state.getOrg() || nextProject !== state.getProject()
        state.setOrg(org)
        state.setProject(project)
        if (typeof repo === 'string') {
          const current = state.getPrTargets()
          state.setPrTargets({
            ...current,
            cloud: { ...current.cloud, repo: repo.trim() },
          })
        }
        if (scopeChanged) state.clearWorkStatuses()
        if (onRefresh) onRefresh()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    // Persist (or clear) the user's default org. Explicit user action only — the
    // setup screen's ⭐ control POSTs here. Broadcasts so the control reflects the
    // saved state immediately. Returns the display path so the UI can show the
    // user exactly where the preference was written.
    if (req.method === 'POST' && req.url === '/api/set-default-org') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { org } = parseJson(body)
        try {
          const saved = state.setSavedDefaultOrg(typeof org === 'string' ? org : '')
          notifyClients()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, savedDefaultOrg: saved, path: PREFS_DISPLAY_PATH }))
        } catch (err) {
          console.error('[sentry-triage] set-default-org failed:', err instanceof Error ? err.message : err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Could not save your default org — the preferences file could not be written.' }))
        }
      })
      return
    }

    // Switch project endpoint — re-scans the same org scoped to the new project.
    if (req.method === 'POST' && req.url === '/api/set-project') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { project } = parseJson(body)
        state.setProject(project)
        state.clearWorkStatuses()
        // Broadcast the new selection immediately so the dropdown + label update
        // while the (slower) re-scan runs in the background.
        notifyClients()
        if (onRefresh) onRefresh()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    // Change the Sentry search window — re-scans the same org/project over the
    // new period. Work statuses are kept: a wider window is a superset of the
    // same issues, so their in-flight/handed-off state still applies.
    if (req.method === 'POST' && req.url === '/api/set-period') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { period } = parseJson(body)
        state.setPeriod(period)
        // Broadcast the new selection immediately so the dropdown updates while
        // the (slower) re-scan runs in the background.
        notifyClients()
        if (onRefresh) onRefresh()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/work-selected') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const parsed = parseJson(body)
        const keys = parsed.keys
        const issueKeys = Array.isArray(keys) ? keys.filter((key) => typeof key === 'string' && key) : []
        const modelByKey = parsed.modelByKey && typeof parsed.modelByKey === 'object' ? parsed.modelByKey : {}
        const assignCopilot = parsed.assignCopilot === true
        if (onWorkSelected && issueKeys.length > 0) onWorkSelected(issueKeys, modelByKey, assignCopilot)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, queued: issueKeys.length }))
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/select-tracker') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const { tracker } = parseJson(body)
        state.setSelectedTracker(tracker)
        notifyClients()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/set-pr-config') {
      readBody(req, res).then((body) => {
        if (body === null) return
        const payload = parseJson(body)
        const current = state.getPrTargets()
        const pick = (value, fallback) => (typeof value === 'string' ? value : fallback)
        // The local fix-session hand-off always runs in the CURRENT project (the
        // canvas's own checkout, host-trusted from its git remote), so there is no
        // model-relayed project selection to bind here. Cross-repo work uses Cloud
        // mode, whose repo the user types directly in Settings (also trusted). Only
        // the local path/branch and cloud repo/branch are accepted from the payload.
        const next = {
          mode: pick(payload.mode, current.mode),
          model: pick(payload.model, current.model),
          local: {
            path: pick(payload.localPath, current.local.path),
            baseBranch: pick(payload.localBranch, current.local.baseBranch),
          },
          cloud: {
            repo: pick(payload.cloudRepo, current.cloud.repo),
            baseBranch: pick(payload.cloudBranch, current.cloud.baseBranch),
          },
        }
        // Proactively-detected tracking badges and "possibly related" hints are
        // derived from the CURRENTLY selected repo. If the target repo identity
        // changes, every such annotation on the board is now stale — and an
        // enrichment turn still in flight from the previous repo could otherwise
        // reapply the old links right after this save. So on a repo change: drop
        // the stale annotations now, invalidate any pending enrichment, and
        // re-derive against the new repo. Model/base-branch-only edits keep them.
        const repoId = (t) =>
          [t.mode, t.cloud.repo, t.local.path]
            .map((v) => (v || '').trim())
            .join('\u0000')
        const repoChanged = repoId(next) !== repoId(current)
        state.setPrTargets(next)
        if (repoChanged) {
          state.clearTrackedWorkStatuses()
          state.clearRelatedIncidents()
          if (onInvalidateEnrichment) onInvalidateEnrichment()
        }
        notifyClients()
        if (repoChanged && onRefresh) onRefresh()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/toggle-pr-settings') {
      state.togglePrSettingsOpen()
      notifyClients()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (req.method === 'POST' && req.url === '/api/toggle-title-mode') {
      const plainEnglishView = state.togglePlainEnglishView()
      notifyClients()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, plainEnglishView }))
      return
    }

    // Default: serve the page. The capability token is embedded here (and ONLY
    // here — never in snapshot()/SSE broadcasts) so it reaches same-origin page
    // scripts without being exposed on any readable data channel.
    //
    // Anti-clickjacking: the token defends reads, but a third-party page could
    // still FRAME this loopback origin and trick the user into clicking the real
    // controls — whose own same-origin script would attach the valid token to the
    // state-changing request (create issue, start fix session). The Copilot host
    // loads this canvas as a TOP-LEVEL webview (verified: window.top === window
    // and no ancestor origins), never inside an iframe, so denying all framing
    // costs the legitimate canvas nothing while blocking that attack outright.
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'")
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(Page({ ...snapshot(), csrfToken }))
  }

  const server = createServer(handleRequest)

  // Gracefully shut down: an open EventSource keeps a socket alive, and
  // server.close() only waits for idle connections. End every SSE response and
  // force-drop any lingering sockets so onClose can't hang indefinitely.
  function close() {
    for (const res of sseClients) {
      try { res.end() } catch { /* already gone */ }
    }
    sseClients.clear()
    return new Promise((resolve) => {
      server.close(() => resolve())
      // Node >=18.2: terminate connections still open after close() is issued.
      server.closeAllConnections?.()
    })
  }

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const actualPort = typeof address === 'object' && address ? address.port : 0
      // Lock the Host allow-list to the exact loopback authority we bound before
      // handling any request (see hostMatches / DNS-rebinding defense).
      boundHost = `127.0.0.1:${actualPort}`
      resolve({
        server,
        url: `http://127.0.0.1:${actualPort}/`,
        state,
        notifyClients,
        notifyWork,
        notifyFlash,
        notifyScanning,
        close,
      })
    })
  })
}
