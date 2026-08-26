// Per-instance triage state. Each canvas instance gets its own server, and each
// server gets its own state object via createState(), so opening two triage
// canvases never cross-broadcasts one instance's org / results into the other.

import { getDefaultOrg, saveDefaultOrg } from './prefs.mjs'

// Sentry search windows we expose, in order. Values are the exact `period`
// strings the Sentry SDK's issue.list accepts (see sentryClient.mjs); labels
// drive the dropdown.
export const PERIODS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]
const PERIOD_VALUES = new Set(PERIODS.map((p) => p.value))

// Keys that, if written into a plain object, would mutate its prototype chain
// instead of adding an own property. Work-status keys can come from untrusted
// agent/Sentry data, so any of these must never be used to index workByIssueKey.
const UNSAFE_STATUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
function isUnsafeStatusKey(key) {
  return UNSAFE_STATUS_KEYS.has(key)
}

export function createState() {
  const categories = []
  let scanError = ''
  let scannedTotal = 0
  let scannedCapped = false
  let scannedOlder = 0
  let scannedOlderCapped = false
  let org = ''
  let orgOptions = []
  // Monotonic scope generation. Bumped whenever the user switches org/project
  // (the only callers of clearWorkStatuses). In-flight work hand-offs capture the
  // generation at start; a late result or PR callback that resolves after a scope
  // switch is rejected instead of repopulating the new scope's board (where a
  // colliding short key could show links from the previous org).
  let scopeGen = 0
  // The user's explicitly-saved default org (persisted to disk via prefs.mjs), or
  // '' if they never set one. Read once at startup so a saved choice survives
  // canvas reopens. It takes precedence over the runtime-derived default below.
  let savedDefaultOrg = getDefaultOrg()
  // The slug the setup screen prefills. Seeds from the saved default; otherwise
  // filled in by setOrgOptions once orgs are discovered.
  let orgDefault = savedDefaultOrg
  let project = ''
  let projects = []
  // The org the current `projects` list belongs to, so clients can attribute an
  // SSE project broadcast to the right org (setup screen switches org before any
  // scan, so the panel's own org isn't a reliable signal).
  let projectsOrg = ''
  // Sentry search window. Defaults to the last day; the user can widen it from
  // the issues list to look further back. Only Sentry's supported periods are
  // accepted (see PERIODS below).
  let period = '24h'
  // Connection preflight status for the MCP servers this canvas depends on.
  // Starts optimistic (checked:false) so the UI never flashes a setup gate
  // before an actual check has run.
  let connections = {
    checked: false,
    sentry: { configured: false, reachable: false, transient: false, error: '' },
  }
  let prSettingsOpen = false
  // Whether card titles show the model's plain-English summary instead of the raw
  // Sentry error. Canvas-wide, defaults to the raw error so on-call sees exactly
  // what Sentry reported first; the user can flip to plain English from the header.
  let plainEnglishView = false
  let selectedTracker = 'github'
  const workByIssueKey = {}
  // The issue trackers the "Work on selected" hand-off can file into. The agent
  // does the actual filing with its own MCP access, so every tracker here is
  // selectable; if the chosen one isn't connected the hand-off returns an error
  // the user sees on the card. GitHub is always first/default.
  const issueTrackers = [
    { id: 'github', label: 'GitHub Issues', connected: true },
    { id: 'linear', label: 'Linear', connected: true },
    { id: 'atlassian', label: 'Jira (Atlassian)', connected: true },
  ]
  // Models the spawned remediation session can run under. The empty id means
  // "let the session pick its default model"; every other id must match a value
  // the host create_session tool accepts, or the hand-off would fail.
  const availableModels = [
    { id: '', label: 'Auto (session default)' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'claude-opus-4.8', label: 'Claude Opus 4.8' },
    { id: 'gpt-5.5', label: 'GPT-5.5' },
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.3-codex', label: 'GPT-5.3-Codex' },
  ]
  const MODEL_IDS = new Set(availableModels.map((model) => model.id))
  const prTargets = {
    mode: 'local',
    model: '',
    local: { path: '', baseBranch: '' },
    cloud: { repo: '', baseBranch: '' },
  }

  function normalizePrTargets(input) {
    const src = input && typeof input === 'object' ? input : {}
    const local = src.local && typeof src.local === 'object' ? src.local : {}
    const cloud = src.cloud && typeof src.cloud === 'object' ? src.cloud : {}
    const str = (value) => (typeof value === 'string' ? value.trim() : '')
    return {
      mode: src.mode === 'cloud' ? 'cloud' : 'local',
      model: MODEL_IDS.has(str(src.model)) ? str(src.model) : '',
      local: {
        path: str(local.path),
        baseBranch: str(local.baseBranch),
      },
      cloud: {
        repo: str(cloud.repo),
        baseBranch: str(cloud.baseBranch),
      },
    }
  }

  function normalizeIssueTrackers(list) {
    if (!Array.isArray(list)) return [{ id: 'github', label: 'GitHub Issues', connected: true }]
    const seen = new Set()
    const out = []
    for (const tracker of list) {
      if (!tracker || typeof tracker !== 'object') continue
      const id = typeof tracker.id === 'string' ? tracker.id.trim() : ''
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push({
        id,
        label: typeof tracker.label === 'string' && tracker.label.trim() ? tracker.label.trim() : id,
        connected: tracker.connected !== false,
      })
    }
    if (!seen.has('github')) out.unshift({ id: 'github', label: 'GitHub Issues', connected: true })
    return out.length ? out : [{ id: 'github', label: 'GitHub Issues', connected: true }]
  }

  return {
    getCategories() {
      return categories
    },

    getScanError() {
      return scanError
    },

    setScanError(msg) {
      scanError = typeof msg === 'string' ? msg : ''
      return scanError
    },

    getScannedTotal() {
      return scannedTotal
    },

    getScannedCapped() {
      return scannedCapped
    },

    getScannedOlder() {
      return scannedOlder
    },

    getScannedOlderCapped() {
      return scannedOlderCapped
    },

    // How many distinct open issues the last scan examined, and whether the
    // primary search hit its configured cap (so more may exist). Drives the
    // "prioritized from N open" subtitle and the empty-state count. `older` is
    // how many unresolved issues exist OUTSIDE the current window (only set when
    // the window itself was empty) so the empty state can nudge widening.
    setScannedInfo({ total = 0, capped = false, older = 0, olderCapped = false } = {}) {
      scannedTotal = Number.isFinite(total) && total >= 0 ? total : 0
      scannedCapped = Boolean(capped)
      scannedOlder = Number.isFinite(older) && older >= 0 ? older : 0
      scannedOlderCapped = Boolean(olderCapped)
      return { total: scannedTotal, capped: scannedCapped, older: scannedOlder, olderCapped: scannedOlderCapped }
    },

    getOrg() {
      return org
    },

    getOrgOptions() {
      return orgOptions
    },

    getOrgDefault() {
      return orgDefault
    },

    // The org the user has explicitly saved as their default (or '' if none).
    // Distinct from getOrgDefault(), which may be a runtime-derived best guess.
    getSavedDefaultOrg() {
      return savedDefaultOrg
    },

    // Cache the org slugs discovered from the Sentry connection so the setup
    // form can prefill / offer a dropdown. `def` is the slug to preselect. A
    // user-saved default wins over the runtime-derived guess, but ONLY when it
    // is actually one of the discovered orgs — otherwise it's stale (e.g. left
    // over from a different Sentry account) and we fall back to the runtime pick
    // so the setup form still auto-detects a valid org.
    setOrgOptions(list, def) {
      orgOptions = Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s) : []
      const inOptions = (s) => orgOptions.some((o) => o.toLowerCase() === String(s || '').toLowerCase())
      if (savedDefaultOrg && inOptions(savedDefaultOrg)) orgDefault = savedDefaultOrg
      else if (typeof def === 'string' && def) orgDefault = def
      else if (orgOptions.length) orgDefault = orgOptions[0]
      return orgOptions
    },

    // Persist (or, with an empty slug, clear) the user's default org. Only ever
    // called from an explicit user action in the UI. Updates the prefilled
    // orgDefault to match so the setup screen reflects the change immediately.
    setSavedDefaultOrg(slug) {
      savedDefaultOrg = saveDefaultOrg(slug)
      if (savedDefaultOrg) orgDefault = savedDefaultOrg
      else if (orgOptions.length) orgDefault = orgOptions[0]
      return savedDefaultOrg
    },

    getProject() {
      return project
    },

    getPeriod() {
      return period
    },

    // Set the Sentry search window. Ignores unknown values so a bad client
    // payload can never send an invalid period to the Sentry API.
    setPeriod(next) {
      if (typeof next === 'string' && PERIOD_VALUES.has(next)) period = next
      return period
    },

    getProjects() {
      return projects
    },

    getProjectsOrg() {
      return projectsOrg
    },

    getConnections() {
      return connections
    },

    setConnections(next) {
      if (next && typeof next === 'object') connections = next
      return connections
    },

    getPrTargets() {
      return prTargets
    },
    getAvailableModels() {
      return availableModels
    },

    getIssueTrackers() {
      return issueTrackers
    },

    getSelectedTracker() {
      return selectedTracker
    },

    getPrSettingsOpen() {
      return prSettingsOpen
    },

    getWorkByIssueKey() {
      return workByIssueKey
    },

    getWorkStatus(key) {
      return workByIssueKey[key]
    },

    setOrg(slug) {
      org = typeof slug === 'string' ? slug.trim().toLowerCase() : ''
    },

    setProject(slug) {
      project = typeof slug === 'string' ? slug.trim() : ''
    },

    setProjects(list, org) {
      const seen = new Set()
      const out = []
      for (const item of Array.isArray(list) ? list : []) {
        const slug = typeof item === 'string' ? item.trim() : ''
        if (!slug || seen.has(slug)) continue
        seen.add(slug)
        out.push(slug)
      }
      projects = out
      if (typeof org === 'string') projectsOrg = org.trim().toLowerCase()
      return projects
    },

    setPrTargets(targets) {
      const normalized = normalizePrTargets(targets)
      prTargets.mode = normalized.mode
      prTargets.model = normalized.model
      prTargets.local.path = normalized.local.path
      prTargets.local.baseBranch = normalized.local.baseBranch
      prTargets.cloud.repo = normalized.cloud.repo
      prTargets.cloud.baseBranch = normalized.cloud.baseBranch
      return prTargets
    },

    setIssueTrackers(trackers) {
      const normalized = normalizeIssueTrackers(trackers)
      issueTrackers.length = 0
      issueTrackers.push(...normalized)
      if (!issueTrackers.some((tracker) => tracker.id === selectedTracker)) {
        selectedTracker = issueTrackers[0]?.id || 'github'
      }
      return issueTrackers
    },

    setSelectedTracker(trackerId) {
      if (typeof trackerId !== 'string') return selectedTracker
      if (issueTrackers.some((tracker) => tracker.id === trackerId)) {
        selectedTracker = trackerId
      }
      return selectedTracker
    },

    togglePrSettingsOpen() {
      prSettingsOpen = !prSettingsOpen
      return prSettingsOpen
    },

    setPrSettingsOpen(open) {
      prSettingsOpen = Boolean(open)
      return prSettingsOpen
    },

    getPlainEnglishView() {
      return plainEnglishView
    },

    togglePlainEnglishView() {
      plainEnglishView = !plainEnglishView
      return plainEnglishView
    },

    setPlainEnglishView(on) {
      plainEnglishView = Boolean(on)
      return plainEnglishView
    },

    setCategories(cats) {
      categories.length = 0
      categories.push(...cats)
      return categories
    },

    removeIssues(categoryId, issueKeys) {
      const category = categories.find((c) => c.id === categoryId)
      if (!category) return
      // issueKeys arrives straight from a request body, so it may be any JSON
      // type. Coerce to an array before `new Set(...)` — a non-iterable value
      // (e.g. a number) would otherwise throw inside an unhandled promise and
      // could take down the extension process.
      const keys = Array.isArray(issueKeys) ? issueKeys : []
      const keysToRemove = new Set(keys)
      category.issues = category.issues.filter((i) => !keysToRemove.has(i.key))
    },

    setWorkStatus(key, status) {
      if (!key || !status || typeof status !== 'object') return null
      // `key` can originate from the agent's submit_tracking map, whose keys are
      // derived from the untrusted Sentry issue list. Writing a special key like
      // "__proto__" (or "constructor"/"prototype") into this plain object would
      // invoke the prototype setter and poison every subsequent lookup for an
      // untracked issue, mislabeling the whole board. Reject those keys outright.
      if (isUnsafeStatusKey(key)) return null
      workByIssueKey[key] = {
        ...(workByIssueKey[key] || {}),
        ...status,
      }
      return workByIssueKey[key]
    },

    // Start a fresh work attempt for a key, discarding any terminal artifacts from
    // a prior run. setWorkStatus shallow-merges, so retrying a tracked/done/
    // skipped/error card would otherwise carry its old issue/PR/session links (and
    // the `existing*` tracking fields) into the new run, and the status renderer
    // could show duplicate or stale links beside the new result. Replacing the
    // entry outright guarantees the queued state is clean.
    startWorkAttempt(key) {
      if (!key || isUnsafeStatusKey(key)) return null
      workByIssueKey[key] = { phase: 'queued' }
      return workByIssueKey[key]
    },

    setSkippedWorkStatus(key, existing = {}) {
      return this.setWorkStatus(key, {
        phase: 'skipped',
        existingIssueNumber: Number.isFinite(Number(existing.issueNumber)) ? Number(existing.issueNumber) : undefined,
        existingIssueUrl: typeof existing.issueUrl === 'string' ? existing.issueUrl : undefined,
        existingPrNumber: Number.isFinite(Number(existing.prNumber)) ? Number(existing.prNumber) : undefined,
        existingPrUrl: typeof existing.prUrl === 'string' ? existing.prUrl : undefined,
        existingPrState: typeof existing.prState === 'string' ? existing.prState.trim().toLowerCase() : undefined,
      })
    },

    // Mark an issue as already tracked by a pre-existing GitHub issue/PR that was
    // filed via the canvas convention (sentry-triage label + key in title). Unlike
    // setSkippedWorkStatus this is detected proactively during a scan, so it must
    // never clobber an active canvas-initiated status (working/done/handed-off).
    setTrackedWorkStatus(key, tracking = {}) {
      const current = workByIssueKey[key]
      const activePhase = current && ['working', 'queued', 'done', 'handed-off', 'skipped'].includes(current.phase)
      if (activePhase) return current
      const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined)
      const str = (v) => (typeof v === 'string' && v ? v : undefined)
      // The tracking ISSUE is the source of truth for "being worked on". As long as
      // it is open, the work is still tracked — even if a PR attempt was closed or a
      // PR merged without closing it yet. Only a closed tracking issue means the work
      // is resolved/abandoned, so drop it (and any stale entry) back to the board.
      // The tracking ISSUE is the primary source of truth, but a still-active PR
      // (open/draft) is the AUTHORITATIVE work signal used by the work-start
      // duplicate guard. So a closed tracking issue only drops back to the board
      // when its linked PR is NOT still active — otherwise the board would offer
      // work that the guard would immediately skip.
      const issueState = (str(tracking.issueState) || '').toLowerCase()
      const prState = (str(tracking.prState) || '').toLowerCase()
      const prActive = prState === 'open' || prState === 'draft'
      if (issueState === 'closed' && !prActive) {
        if (current && current.phase === 'tracked') delete workByIssueKey[key]
        return null
      }
      return this.setWorkStatus(key, {
        phase: 'tracked',
        existingIssueNumber: num(tracking.issueNumber),
        existingIssueUrl: str(tracking.issueUrl),
        existingIssueState: str(tracking.issueState),
        existingPrNumber: num(tracking.prNumber),
        existingPrUrl: str(tracking.prUrl),
        existingPrState: str(tracking.prState),
      })
    },

    // Drop only the proactively-detected 'tracked' entries before a fresh scan
    // re-detects them, so stale tracking (e.g. a closed issue) doesn't linger,
    // while canvas-initiated statuses are preserved.
    clearTrackedWorkStatuses() {
      for (const key of Object.keys(workByIssueKey)) {
        if (workByIssueKey[key] && workByIssueKey[key].phase === 'tracked') {
          delete workByIssueKey[key]
        }
      }
      return workByIssueKey
    },


    // Strip the "possibly related" hints off every issue. These are searched in
    // the currently selected repo, so a repo change makes them stale; drop them
    // immediately rather than waiting for the next scan to rebuild fresh objects.
    clearRelatedIncidents() {
      for (const category of categories) {
        for (const issue of category.issues || []) {
          if (issue && issue.relatedIncidents) delete issue.relatedIncidents
        }
      }
      return categories
    },

    // Advance the scope generation. Any in-flight operation that captured an
    // older generation (a multi-item onWorkSelected loop, a pending PR callback)
    // will fail its scopeCurrent() check and stop/reject rather than writing onto
    // a scope that is no longer active.
    advanceScopeGen() {
      scopeGen += 1
      return scopeGen
    },

    clearWorkStatuses() {
      // A scope switch invalidates every in-flight operation bound to the old
      // scope; bump the generation so their late callbacks are rejected.
      scopeGen += 1
      for (const key of Object.keys(workByIssueKey)) {
        delete workByIssueKey[key]
      }
      return workByIssueKey
    },

    getScopeGen() {
      return scopeGen
    },

    applyRepoDefaults({ repo = '', baseBranch = '', localPath = '' } = {}) {
      if (!prTargets.cloud.repo && repo) prTargets.cloud.repo = repo
      if (!prTargets.cloud.baseBranch && baseBranch) prTargets.cloud.baseBranch = baseBranch
      if (!prTargets.local.path && localPath) prTargets.local.path = localPath
      if (!prTargets.local.baseBranch && baseBranch) prTargets.local.baseBranch = baseBranch
      return prTargets
    },
  }
}
