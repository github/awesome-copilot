import { styles } from '../styles.mjs'
import { Category } from './category.mjs'
import { escapeHtml, jsonForScript } from '../escape.mjs'

// Subtitle + empty-state copy shared by the server render below. The inline
// client script keeps byte-identical wording (search "KEEP IN SYNC") so the
// first paint and every SSE re-render read the same. `total` is how many open
// issues the scan examined; `capped` means the scan hit its configured cap
// so we render "N+" to signal there may be more.
function scannedLabel(total, capped) {
  return capped ? String(total) + '+' : String(total)
}
function subtitleText(shown, total, capped) {
  if (total > shown) {
    return 'Top ' + shown + ' of ' + scannedLabel(total, capped) + ' open issues, prioritized by impact'
  }
  return shown + ' open issue' + (shown === 1 ? '' : 's') + ' to triage'
}
function emptyText(total, capped, project, older = 0, olderCapped = false) {
  const where = project ? ' for ' + project : ''
  if (total > 0) {
    return '✓ Scanned ' + scannedLabel(total, capped) + ' open issue' + (total === 1 ? '' : 's') + where +
      ' — none are urgent enough to surface right now.'
  }
  if (older > 0) {
    const one = older === 1 && !olderCapped
    return '✓ No open issues' + where + ' in this window — Sentry has ' + scannedLabel(older, olderCapped) +
      ' unresolved issue' + (one ? '' : 's') + ' in the last 90 days.'
  }
  return '✓ No open issues' + where + ' in this window.'
}

export function Page({
  categories,
  scanError = '',
  scannedTotal = 0,
  scannedCapped = false,
  scannedOlder = 0,
  scannedOlderCapped = false,
  org,
  orgOptions = [],
  orgDefault = '',
  savedDefaultOrg = '',
  project,
  period = '24h',
  periods = [],
  connections,
  prTargets,
  prSettingsOpen,
  plainEnglishView = false,
  projects = [],
  availableModels = [],
  issueTrackers,
  selectedTracker,
  workByIssueKey,
  csrfToken = '',
}) {
  const conn = connections && typeof connections === 'object'
    ? connections
    : { checked: false, sentry: { reachable: false, error: '' } }
  const checked = Boolean(conn.checked)
  // Optimistic before the first preflight so we never flash a gate spuriously.
  const sentryReady = !checked || Boolean(conn.sentry && conn.sentry.reachable)
  // The humanized preflight failure (unsupported host, dropped connection, sign-in
  // required, …). Shown in the gate so users see the real reason instead of a
  // generic "connect" message for problems reconnecting won't fix.
  const gateError = (conn.sentry && conn.sentry.error) || ''
  // A dedicated setup reason (currently only the optional `sentry` package being
  // absent) that takes precedence over the auth/connectivity gate variants, so the
  // install prompt is never shown beneath contradictory "sign in" guidance.
  const packageMissing = (conn.sentry && conn.sentry.setup) === 'package-missing'
  // Distinguish "not signed in" (needs `sentry auth login`) from a transient
  // connectivity failure where a credential likely exists. probeSentry() reports
  // configured:false only for auth failures, so a gated-but-configured state means
  // Sentry was simply unreachable — the gate then shows connectivity guidance
  // instead of wrongly telling an already-authenticated user to re-run login.
  const signedOut = !(conn.sentry && conn.sentry.configured)
  // Among configured-but-unreachable failures, only a transient network blip is
  // worth promising recovery for. An unknown, settled failure (classifySentryError
  // marks transient:false) gets neutral guidance instead of a false "it should
  // recover on the next check" — the humanized error carries the real reason.
  const transientConn = Boolean(conn.sentry && conn.sentry.transient)

  const categoriesWithStatus = categories.map((category) => ({
    ...category,
    issues: category.issues.map((issue) => ({
      ...issue,
      workStatus: workByIssueKey[issue.key],
    })),
  }))
  const totalIssues = categoriesWithStatus.reduce((sum, c) => sum + c.issues.length, 0)
  const hasOrg = Boolean(org)
  // Whether the currently-prefilled setup org is the one the user explicitly
  // saved as their default. Drives the ⭐ control's active state on first paint.
  const isSavedDefault = Boolean(savedDefaultOrg) && orgDefault === savedDefaultOrg

  // Setup-form org control. find_organizations reliably enumerates the orgs this
  // Sentry connection can access, so we prefill the slug input with the best match
  // (orgDefault) and, when there's more than one org, add a native <select> that
  // mirrors its choice into the input. Native selects repaint reliably in the app
  // webview (a <datalist> does not), so this is the safe dropdown primitive.
  const orgSlugs = Array.isArray(orgOptions) ? orgOptions.filter(Boolean) : []
  const orgSelect = orgSlugs.length >= 2
    ? `<select id="org-select" class="org-input org-select" title="Sentry organizations you can access">` +
      orgSlugs
        .map((slug) => `<option value="${escapeHtml(slug)}"${slug === orgDefault ? ' selected' : ''}>${escapeHtml(slug)}</option>`)
        .join('') +
      `</select>`
    : ''

  // Project autocomplete source. The Sentry CLI SDK returns the org's full
  // project list, so the project field is a combobox (a text input + a filtered
  // suggestion menu) rather than a typed slug box — scalable to orgs with many
  // projects. Empty value = all projects. Rendered client-side; the server just
  // seeds the input value and an empty menu container.
  const projectSlugs = Array.isArray(projects) ? projects.filter(Boolean) : []

  // A text input + suggestion menu wrapper. Shared shape for the setup screen and
  // the header so the autocomplete JS can attach to either by id.
  const projectComboInput = (id, cls, extraAttrs = '') =>
    `<span class="project-ac">` +
    `<input id="${id}" class="${cls}" role="combobox" aria-autocomplete="list" aria-expanded="false" ` +
    `aria-controls="${id}-listbox" ` +
    `placeholder="all projects — type to search" autocomplete="off" autocapitalize="none" autocorrect="off" ` +
    `spellcheck="false" value="${escapeHtml(project)}"${extraAttrs} />` +
    `<div id="${id}-listbox" class="project-ac-menu" role="listbox" hidden></div></span>`

  // Header org control. Mirrors the project switcher so the org can be changed
  // without returning to the setup screen. Renders as a dropdown when the
  // connection exposes 2+ orgs (matching the setup screen), else a text input.
  const headerOrgSlugs = !org || orgSlugs.includes(org) ? orgSlugs : [org, ...orgSlugs]
  const orgSwitcherControl = headerOrgSlugs.length >= 2
    ? `<select id="org-switcher" class="project-select org-switcher-select" title="Sentry organizations you can access">` +
      headerOrgSlugs
        .map((slug) => `<option value="${escapeHtml(slug)}"${slug === org ? ' selected' : ''}>${escapeHtml(slug)}</option>`)
        .join('') +
      `</select>`
    : `<input id="org-switcher" class="project-select" placeholder="org slug" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" value="${escapeHtml(org)}" />`
  const orgSwitcher = hasOrg
    ? `<label class="project-switcher"><span class="project-switcher-label">Org</span>` + orgSwitcherControl + `</label>`
    : ''

  // Header project switcher: an autocomplete combobox + an explicit Fetch button.
  // Picking a suggestion re-scans that project immediately; a typed value applies
  // on Enter or Fetch (empty = all projects).
  const projectSwitcher = hasOrg
    ? `<label class="project-switcher"><span class="project-switcher-label">Project</span>` +
      projectComboInput('project-switcher', 'project-select') +
      `<button id="project-fetch" class="project-fetch-btn" type="button" title="Fetch tickets for this project">Fetch</button></label>`
    : ''

  // Time-window switcher. Defaults to the last 24h; changing it re-scans over the
  // wider window so the user can look further back from the issues list.
  const periodList = Array.isArray(periods) ? periods : []
  const periodSwitcher = hasOrg
    ? `<label class="period-switcher"><span class="period-switcher-label">Time range</span>` +
      `<select id="period-select" class="period-select" title="How far back to search Sentry">` +
      periodList
        .map((p) => `<option value="${escapeHtml(p.value)}"${p.value === period ? ' selected' : ''}>${escapeHtml(p.label)}</option>`)
        .join('') +
      `</select></label>`
    : ''

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${styles()}</style>
  </head>
  <body class="${sentryReady ? '' : 'sentry-gated'}">
    <header class="page-header">
      <h1><svg class="sentry-logo" viewBox="11.05 11 49.95 44.04" role="img" aria-label="Sentry" focusable="false"><path d="M29,2.26a4.67,4.67,0,0,0-8,0L14.42,13.53A32.21,32.21,0,0,1,32.17,40.19H27.55A27.68,27.68,0,0,0,12.09,17.47L6,28a15.92,15.92,0,0,1,9.23,12.17H4.62A.76.76,0,0,1,4,39.06l2.94-5a10.74,10.74,0,0,0-3.36-1.9l-2.91,5a4.54,4.54,0,0,0,1.69,6.24A4.66,4.66,0,0,0,4.62,44H19.15a19.4,19.4,0,0,0-8-17.31l2.31-4A23.87,23.87,0,0,1,23.76,44H36.07a35.88,35.88,0,0,0-16.41-31.8l4.67-8a.77.77,0,0,1,1.05-.27c.53.29,20.29,34.77,20.66,35.17a.76.76,0,0,1-.68,1.13H40.6q.09,1.91,0,3.81h4.78A4.59,4.59,0,0,0,50,39.43a4.49,4.49,0,0,0-.62-2.28Z" transform="translate(11 11)" fill="currentColor"/></svg><span>Sentry Triage</span></h1>
      ${hasOrg ? `<div class="header-controls"><span class="scope-switchers">${orgSwitcher}${projectSwitcher}</span><span class="control-divider" aria-hidden="true"></span>${periodSwitcher}<span class="control-divider" aria-hidden="true"></span><button id="refresh" class="refresh-btn" title="Re-scan errors"><span class="refresh-icon">↻</span> Re-scan</button></div>` : ''}
    </header>

    <section class="sentry-gate" role="alert">
      <div class="gate-card">
        <div class="gate-icon">⚠️</div>
        <h2 id="gate-title">${packageMissing ? 'Set up the Sentry CLI' : (signedOut ? 'Connect Sentry to start triaging' : 'Can’t reach Sentry right now')}</h2>
        <div class="gate-body gate-body-setup" id="gate-body-setup"${packageMissing ? '' : ' style="display:none;"'}>
          <p class="gate-lead">This canvas reads your live Sentry issues through the Sentry CLI, but its <code>sentry</code> package isn’t installed for this extension yet.</p>
          <p class="gate-steps">Click below to install it. You'll then be prompted to sign in with Sentry.</p>
          <button id="install-deps-btn" class="gate-action-btn" type="button">📦 Install dependencies</button>
          <p class="gate-install-status" id="gate-install-status" role="status" aria-live="polite" style="display:none;"></p>
        </div>
        <div class="gate-body gate-body-auth" id="gate-body-auth"${signedOut && !packageMissing ? '' : ' style="display:none;"'}>
          <p class="gate-lead">This canvas reads your live Sentry issues through the Sentry CLI, but it isn't signed in yet.</p>
          <p class="gate-steps">Sign in with Sentry — this opens your browser to approve access, then returns here automatically.</p>
          <button id="auth-login-btn" class="gate-action-btn" type="button">🔑 Sign in with Sentry</button>
          <p class="gate-install-status" id="gate-auth-status" role="status" aria-live="polite" style="display:none;"></p>
        </div>
        <div class="gate-body gate-body-conn" id="gate-body-conn"${signedOut || !transientConn || packageMissing ? ' style="display:none;"' : ''}>
          <p class="gate-lead">You’re signed in, but this canvas couldn’t reach Sentry — usually a temporary network blip.</p>
          <p class="gate-steps">It should recover on the next check. If it persists, check your network or VPN, then re-open this canvas.</p>
        </div>
        <div class="gate-body gate-body-unknown" id="gate-body-unknown"${signedOut || transientConn || packageMissing ? ' style="display:none;"' : ''}>
          <p class="gate-lead">You’re signed in, but this canvas couldn’t reach Sentry.</p>
          <p class="gate-steps">See the details below, then re-open this canvas to try again.</p>
        </div>
        <p class="gate-error" id="gate-error" ${sentryReady || !gateError || packageMissing || signedOut ? 'style="display:none;"' : ''}>${escapeHtml(gateError || '')}</p>
      </div>
    </section>

    ${!hasOrg ? `
    <div id="setup-instructions" class="setup-instructions">
      <h2>Triage your live Sentry errors</h2>
      <p>Surfaces the issues that need attention <em>right now</em>. Set your org, project, and repo, then scan.</p>
      <ol>
        <li><strong>Org &amp; project</strong> — scope the scan.</li>
        <li><strong>Repo</strong> — lets us flag issues already being worked on (👀 Tracked).</li>
        <li><strong>Scan</strong> — then open a tracking issue, or start a Copilot fix session with a draft PR.</li>
      </ol>
    </div>
    <div class="org-picker">
      <form id="org-form" class="org-form">
        <label class="org-field">
          <span class="org-field-label">Organization</span>
          ${orgSelect
            ? orgSelect
            : `<input type="text" id="org-input" class="org-input" placeholder="org slug (e.g. my-org)" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" value="${escapeHtml(orgDefault)}"${orgDefault ? '' : ' autofocus'} />`}
        </label>
        <label class="org-field">
          <span class="org-field-label">Project <span class="org-field-optional">(optional)</span></span>
          ${projectComboInput('project-input', 'org-input', orgDefault ? ' autofocus' : '')}
        </label>
      </form>
      <div class="org-default" id="org-default-row">
        <button id="set-default-org" class="set-default-btn" type="button" aria-pressed="${isSavedDefault ? 'true' : 'false'}" title="Remember this org and prefill it the next time you open the canvas">
          <span class="set-default-star" aria-hidden="true">${isSavedDefault ? '★' : '☆'}</span>
          <span class="set-default-text">${isSavedDefault ? 'Saved as your default org' : 'Set as default org'}</span>
        </button>
        <span class="set-default-hint">Saved on this machine to <code>~/.copilot/sentry-triage/preferences.json</code></span>
      </div>
    </div>
    ` : `
    <p id="triage-desc" class="page-description">On-call error triage for <strong>${escapeHtml(org)}</strong>${project ? ` / <strong>${escapeHtml(project)}</strong>` : ''} — issues grouped by why they need your attention right now.</p>
    <p class="page-subtitle">${escapeHtml(subtitleText(totalIssues, scannedTotal, scannedCapped))}${project ? '' : ' · all projects'}</p>
    `}

    <div id="work-toolbar" class="work-toolbar" style="${hasOrg && totalIssues > 0 ? '' : 'display:none;'}">
      <div class="work-toolbar-row">
        <div class="work-actions">
          <button id="work-selected" class="work-selected-btn" disabled title="File or link a GitHub tracking issue only — no code, branch, or session.">📝 Create issue (0)</button>
          <span class="action-or">or</span>
          <button id="fix-with-copilot" class="fix-copilot-btn" disabled title="One-click: create or reuse the tracking issue, then start a Copilot fix session — respecting your Settings and model.">🔧 Fix with Copilot (0)</button>
          <label class="toolbar-model" title="Model used by “Fix with Copilot”. Each selected card can override it.">
            <span class="toolbar-model-label">Model</span>
            <select id="toolbar-model" class="settings-select" disabled></select>
          </label>
        </div>
        <button id="toggle-pr-settings" class="settings-toggle" title="Configure open issue and draft PR targets">⚙️ Settings</button>
      </div>
      <div class="work-summary-callout">
        <span class="work-summary-title">Summary of the actions above</span>
        <span id="work-target-summary" class="work-target-summary"></span>
      </div>
    </div>

    <div id="work-settings" class="work-settings" style="${!hasOrg ? '' : (prSettingsOpen ? '' : 'display:none;')}">
        <section class="settings-section">
          <h3>Repo</h3>
          <label class="settings-label">
            Repo (owner/repo)
            <input id="cloud-repo" class="settings-input" type="text" placeholder="owner/repo" autocapitalize="none" autocorrect="off" spellcheck="false" />
          </label>
          <p class="settings-hint">Where we check whether an issue already has a tracking issue or draft PR (shown as 👀 Tracked), and the default repo for cloud draft PRs. Recommended whenever you set a project.</p>
        </section>
        <section class="settings-section">
          <h3>Open issue</h3>
          <label class="settings-label">
            Tracker
            <select id="tracker-select" class="settings-select"></select>
          </label>
        </section>
        <section class="settings-section">
          <h3>Draft PR</h3>
          <label class="settings-label">
            Mode
            <select id="pr-mode" class="settings-select">
              <option value="local">Local — run on this machine</option>
              <option value="cloud">Cloud — GitHub-hosted agent</option>
            </select>
          </label>
          <p id="mode-hint" class="settings-hint"></p>
          <div id="local-group" class="settings-subgroup${prTargets && prTargets.mode === 'cloud' ? ' dimmed' : ''}">
            <span class="settings-group-title">Local target</span>
            <p class="settings-hint">Runs in the <strong>current project</strong> (this checkout). For a different repo, use Cloud mode.</p>
            <div class="settings-row">
              <label class="settings-label">
                Local path
                <input id="local-path" class="settings-input" type="text" />
              </label>
              <label class="settings-label">
                Local base branch
                <input id="local-branch" class="settings-input" type="text" />
              </label>
            </div>
          </div>
          <div id="cloud-group" class="settings-subgroup${prTargets && prTargets.mode === 'cloud' ? '' : ' dimmed'}">
            <span class="settings-group-title">Cloud target</span>
            <p class="settings-hint">Runs in the <strong>Repo</strong> above.</p>
            <label class="settings-label">
              Cloud base branch
              <input id="cloud-branch" class="settings-input" type="text" />
            </label>
          </div>
          <button id="save-pr-config" class="save-settings-btn">Save draft PR config</button>
        </section>
    </div>

    <div id="setup-scan" class="setup-scan" style="${hasOrg ? 'display:none;' : ''}">
      <button id="scan-btn" class="org-submit" type="button"${orgDefault ? '' : ' disabled'}>Scan</button>
    </div>

    <div id="title-mode-bar" class="title-mode-bar" style="${hasOrg && totalIssues > 0 ? '' : 'display:none;'}">
      <label class="switch-label" for="title-mode-switch" title="Switch every card title between the raw Sentry error and a plain-English summary">
        <span class="switch">
          <input type="checkbox" id="title-mode-switch" class="switch-input"${plainEnglishView ? ' checked' : ''} />
          <span class="switch-slider" aria-hidden="true"></span>
        </span>
        <span class="switch-text">Plain-English titles</span>
      </label>
      <span class="title-mode-hint">Showing <strong id="title-mode-state">${plainEnglishView ? 'plain-English summaries' : 'raw errors'}</strong></span>
    </div>

    <main id="categories">
      ${categoriesWithStatus.map((cat) => Category({ ...cat, plainEnglishView, availableModels })).join('')}
    </main>

    <div id="empty-state" class="empty-state" style="display: none;">
      <span id="empty-msg">${escapeHtml(emptyText(scannedTotal, scannedCapped, project, scannedOlder, scannedOlderCapped))}</span>
      <p id="empty-tips" class="empty-tips">Nothing needs urgent attention in this window. Try widening the time range or switching projects.</p>
      <button id="rescan" class="link-btn">Refresh to re-scan</button>
    </div>

    <div id="toast" class="toast" role="status" aria-live="polite" style="display: none;"></div>

    <div id="scan-overlay" class="scan-overlay" style="display: none;" aria-live="polite" aria-busy="true">
      <div class="scan-overlay-box">
        <div class="scan-spinner"></div>
        <div id="scan-overlay-text" class="scan-overlay-text">Scanning…</div>
      </div>
    </div>

    <script>
      // Per-instance capability token (embedded server-side, never broadcast over
      // SSE). Attach it to every same-origin /api/ mutation so the server can tell
      // a real canvas request from a cross-origin/DNS-rebinding forgery. Wrapping
      // fetch once covers all mutation call sites — current and future — in one
      // place instead of threading a header through each one.
      const CSRF_TOKEN = ${jsonForScript(csrfToken || '')};
      (function installCsrfFetch() {
        const original = window.fetch.bind(window);
        window.fetch = function (input, init) {
          const rawUrl = typeof input === "string" ? input : (input && input.url) || "";
          let path = rawUrl;
          try { path = new URL(rawUrl, window.location.origin).pathname; } catch (e) { /* keep raw */ }
          const method = String(
            (init && init.method) || (typeof input === "object" && input && input.method) || "GET"
          ).toUpperCase();
          if (method === "POST" && path.indexOf("/api/") === 0) {
            const opts = { ...(init || {}) };
            const headers = new Headers(
              (init && init.headers) || (typeof input === "object" && input && input.headers) || {}
            );
            headers.set("x-sentry-triage-csrf", CSRF_TOKEN);
            opts.headers = headers;
            return original(input, opts);
          }
          return original(input, init);
        };
      })();
      const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      function escapeHtml(value) {
        if (value == null) return "";
        return String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
      }
      function safeHref(value) {
        if (value == null) return "#";
        const raw = String(value).trim();
        try {
          const url = new URL(raw);
          if (url.protocol === "http:" || url.protocol === "https:") return escapeHtml(url.href);
        } catch (e) { /* not absolute */ }
        return "#";
      }

      // Declared up here (before the setup-form init below calls syncScanButtonState
      // -> refreshDefaultBtn) so it isn't read in its temporal dead zone, which
      // would throw and kill the whole inline script. Same reason as wasGatedPrev.
      let currentSavedDefaultOrg = ${jsonForScript(savedDefaultOrg || '')};

      // Per-org cache of discovered project lists, so re-selecting an org we've
      // already loaded shows its projects instantly instead of waiting on the
      // network again. Declared early because the setup-form init below can call
      // requestProjectsForOrg while seeding the org select. Seeded at init.
      const projectsByOrg = {};

      // Cache of exact-slug resolutions (org "/" slug -> "checking" | "found" |
      // "missing" | "error", plus the canonical slug when found). The paged
      // project list can't reach every project in a mega-org, so a valid typed
      // slug may show "No matching projects"; a live project.view lookup (via
      // /api/resolve-project) confirms it exists and lets the user select it.
      const projectResolveCache = {};
      // Callbacks waiting on an in-flight lookup, keyed the same way. When a check
      // is already running for a slug, later callers (e.g. the Scan/Fetch gate)
      // queue here and are flushed when it settles, instead of being dropped.
      const projectResolveWaiters = {};
      function projectResolveKey(org, slug) {
        return String(org || "").trim().toLowerCase() + "/" + String(slug || "").trim().toLowerCase();
      }


      function submitScan() {
        const input = document.getElementById("org-input");
        const projectInput = document.getElementById("project-input");
        const repoInput = document.getElementById("cloud-repo");
        const orgSelect = document.getElementById("org-select");
        // Prefer the typed slug, but fall back to the multi-org dropdown's current
        // value so scanning works even if its selection was never mirrored into
        // the input (e.g. the user re-picked the already-shown first org, which
        // fires no change event).
        let org = input ? input.value.trim() : "";
        if (!org && orgSelect) org = orgSelect.value.trim();
        const project = projectInput ? projectInput.value.trim() : "";
        const repo = repoInput ? repoInput.value.trim() : "";
        if (!org) { if (input) input.focus(); return; }
        // Gate: a typed project must be verified against Sentry before the scan
        // starts, so clicking Scan (or submitting the form) can't start a scan on
        // an unverified slug the way Enter in the autocomplete already prevents.
        // An empty project scans all projects and needs no lookup.
        verifyProjectForScan(org, project).then((v) => {
          if (!v.ok) {
            showToast(v.reason === "missing"
              ? "No project \u201C" + project + "\u201D in " + org + " — check the slug."
              : "Couldn't verify that project with Sentry — try again.");
            if (projectInput) projectInput.focus();
            return;
          }
          const proj = v.slug;
          if (projectInput && proj !== project) projectInput.value = proj;
          if (input) { input.value = org; input.disabled = true; }
          if (projectInput) projectInput.disabled = true;
          const scanBtn = document.getElementById("scan-btn");
          if (scanBtn) { scanBtn.disabled = true; scanBtn.textContent = "Scanning…"; }
          showScanOverlay(proj ? "Scanning " + proj + "…" : "Scanning all projects…");
          fetch("/api/set-org", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ org, project: proj, repo })
          }).then((res) => {
            if (!res.ok) throw new Error("set-org " + res.status);
          }).catch(() => {
            // The loopback POST failed (server stopped, rejected, or a transport
            // blip). Without this, the overlay would linger until its 250s safety
            // timer while the form stayed disabled — a dead end with no retry path
            // short of reopening the canvas. Restore the controls and tell the user
            // so they can try again.
            hideScanOverlay();
            if (input) input.disabled = false;
            if (projectInput) projectInput.disabled = false;
            if (scanBtn) { scanBtn.disabled = false; scanBtn.textContent = "Scan"; }
            syncScanButtonState();
            window.alert("Couldn't start the scan — the triage server may have stopped responding. Please try again.");
          });
        });
      }

      const orgForm = document.getElementById("org-form");
      if (orgForm) {
        orgForm.addEventListener("submit", (e) => {
          e.preventDefault();
          submitScan();
        });
      }
      const scanBtnEl = document.getElementById("scan-btn");
      if (scanBtnEl) scanBtnEl.addEventListener("click", submitScan);

      // Keep the Scan button disabled until an org slug is present so it never
      // looks clickable while it can't actually scan.
      function syncScanButtonState() {
        const input = document.getElementById("org-input");
        const orgSelect = document.getElementById("org-select");
        const btn = document.getElementById("scan-btn");
        if (btn) {
          const hasOrg = (input && input.value.trim()) || (orgSelect && orgSelect.value.trim());
          btn.disabled = !hasOrg;
        }
        refreshDefaultBtn();
      }
      const orgInputForSync = document.getElementById("org-input");
      if (orgInputForSync) orgInputForSync.addEventListener("input", syncScanButtonState);
      syncScanButtonState();

      const orgSelectEl = document.getElementById("org-select");
      const orgSelectMirror = orgSelectEl ? wireOrgSelect(orgSelectEl) : null;

      // (Re)wire an org <select>'s change handler and, when it's freshly
      // created (post-signin discovery — see the orgOptions SSE handler
      // below), seed the input/state from its current value the same way the
      // initial server-render path does just below. Pulled out to a function
      // so both paths share one implementation instead of drifting.
      function wireOrgSelect(sel) {
        const orgInputEl = document.getElementById("org-input");
        const mirrorOrgSelect = (clearProject = true) => {
          if (orgInputEl) orgInputEl.value = sel.value;
          // Clear any project slug carried over from the previously-selected org —
          // it won't exist under the new org's project list.
          const projInput = document.getElementById("project-input");
          if (clearProject && projInput) projInput.value = "";
          syncScanButtonState();
          // Load the new org's projects into the autocomplete: instant from cache
          // when we've seen it before, otherwise a "loading projects…" hint until
          // the fetched list arrives over SSE.
          requestProjectsForOrg(sel.value);
        };
        sel.addEventListener("change", () => mirrorOrgSelect());
        return mirrorOrgSelect;
      }
      if (orgSelectEl) {
        const orgInputEl = document.getElementById("org-input");
        // The <select> shows its first option as selected by default, but the
        // input starts empty when there's no detected default — so Scan looks
        // disabled and re-picking the already-shown org fires no change event.
        // Seed the input from the select's current value on load so the visible
        // selection is the effective one and Scan is enabled.
        if (orgInputEl && !orgInputEl.value.trim() && orgSelectEl.value) orgSelectMirror(false);
      }

      // Rebuild the setup screen's org control as a <select> once 2+ orgs are
      // known (whether at initial render, or discovered later via SSE after a
      // post-load sign-in — see the orgOptions handler below). A single-org
      // account keeps the plain text input. No-ops if a <select> already
      // reflects the same options, so it's safe to call on every SSE update.
      function renderSetupOrgSelect() {
        const orgField = document.getElementById("org-input");
        if (!orgField) return; // already a <select>, or the setup screen isn't showing
        const orgSlugs = Array.isArray(currentOrgOptions) ? currentOrgOptions.filter(Boolean) : [];
        if (orgSlugs.length < 2) return;
        const current = orgField.value.trim();
        // Don't clobber an in-progress edit: if the user has typed something
        // that isn't (yet) one of the discovered orgs, replaceWith() below
        // would silently discard it and default to the first option. Defer
        // the rebuild — it'll retry on the next SSE update, and by then the
        // user will likely have finished typing or the org will be known.
        if (current && !orgSlugs.includes(current)) return;
        const sel = document.createElement("select");
        sel.id = "org-select";
        sel.className = "org-input org-select";
        sel.title = "Sentry organizations you can access";
        orgSlugs.forEach((slug) => {
          const opt = document.createElement("option");
          opt.value = slug;
          opt.textContent = slug;
          if (slug === current) opt.selected = true;
          sel.appendChild(opt);
        });
        const wasFocused = document.activeElement === orgField;
        orgField.replaceWith(sel);
        const mirror = wireOrgSelect(sel);
        mirror(false);
        // orgField may have had keyboard focus (e.g. the empty org input's
        // autofocus on first load) — replaceWith() detaches it from the
        // document without moving focus anywhere, silently dropping the
        // keyboard user's position. Move focus onto its replacement.
        if (wasFocused) sel.focus();
      }

      // The org slug currently chosen on the setup screen (typed input wins, else
      // the multi-org dropdown's value). Lowercased to match how the server
      // normalizes + stores the default.
      function readSetupOrg() {
        const input = document.getElementById("org-input");
        const orgSelect = document.getElementById("org-select");
        let org = input ? input.value.trim() : "";
        if (!org && orgSelect) org = orgSelect.value.trim();
        return org.toLowerCase();
      }

      // Repaint the ⭐ control to reflect whether the currently-chosen org is the
      // saved default. Disabled when no org is chosen (nothing to save).
      function refreshDefaultBtn() {
        const btn = document.getElementById("set-default-org");
        if (!btn) return;
        const org = readSetupOrg();
        const isDefault = Boolean(org) && org === currentSavedDefaultOrg;
        btn.disabled = !org;
        btn.setAttribute("aria-pressed", isDefault ? "true" : "false");
        const star = btn.querySelector(".set-default-star");
        const text = btn.querySelector(".set-default-text");
        if (star) star.textContent = isDefault ? "★" : "☆";
        if (text) text.textContent = isDefault ? "Saved as your default org" : "Set as default org";
      }

      // Explicit user action: save the chosen org as the default, or clear it when
      // it's already the default (the ⭐ toggles). Persisted server-side to a
      // local prefs file; we surface exactly where so the write isn't hidden.
      const setDefaultBtn = document.getElementById("set-default-org");
      if (setDefaultBtn) {
        setDefaultBtn.addEventListener("click", () => {
          const org = readSetupOrg();
          if (!org) return;
          const clearing = org === currentSavedDefaultOrg;
          const next = clearing ? "" : org;
          const prevSavedDefault = currentSavedDefaultOrg;
          // Optimistic: update local state + button so it feels instant; the SSE
          // snapshot will confirm.
          currentSavedDefaultOrg = next;
          refreshDefaultBtn();
          fetch("/api/set-default-org", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ org: next })
          })
            .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
            .then(({ ok, data }) => {
              if (!ok || !data || data.ok === false) {
                // The write failed server-side — undo the optimistic update so the
                // button doesn't imply a preference that never persisted.
                currentSavedDefaultOrg = prevSavedDefault;
                refreshDefaultBtn();
                showToast("⚠️ " + ((data && data.error) || "Couldn't save your default org"));
                return;
              }
              const path = (data && data.path) || "~/.copilot/sentry-triage/preferences.json";
              if (clearing) showToast("☆ Cleared your default org");
              else showToast("★ Saved " + org + " as your default — " + path);
            })
            .catch(() => {
              currentSavedDefaultOrg = prevSavedDefault;
              refreshDefaultBtn();
              showToast("⚠️ Couldn't save your default org — try again");
            });
        });
      }
      refreshDefaultBtn();

      // Sentry may connect (or finish enumerating orgs) after the setup form has
      // already rendered empty. When that snapshot arrives over SSE, drop the
      // detected default into the still-empty slug input so the user doesn't have
      // to type it. Never clobber a value the user has started editing.
      function applyOrgDefault(def) {
        if (!def) return false;
        const input = document.getElementById("org-input");
        if (input && !input.value) {
          input.value = def;
          syncScanButtonState();
          return true;
        }
        return false;
      }

      const source = new EventSource("/api/events");
      const selectedKeys = new Set();
      const workByIssue = {};
      // Per-card model overrides (issueKey -> model id). Empty/absent means the
      // card uses the toolbar's batch default model.
      const modelByKey = {};

      // Mirror the server's non-startable filter (onWorkSelected): a card whose
      // work is already queued/working/handed-off is NOT restarted, and the
      // server emits no status event for those keys. Optimistically stamping them
      // "queued" here would make a live card look stuck with no correction coming
      // back, so we exclude them from both the local mutation and the POST.
      const ACTIVE_WORK_PHASES = new Set(["queued", "working", "handed-off"]);
      const startableSelectedKeys = () =>
        Array.from(selectedKeys).filter((key) => !ACTIVE_WORK_PHASES.has(workByIssue[key] && workByIssue[key].phase));

      // Every per-card client-side set is keyed only by the Sentry SHORT ID, which
      // can collide across orgs/projects. When the scope changes, a leftover entry
      // would make the new scope's same-keyed card appear selected, and a stale
      // selection could be submitted against the new incident. Wipe all of it
      // before the new board renders. (workByIssue is also re-synced
      // authoritatively from the server, but clearing it here avoids a flash.)
      function resetPerCardState() {
        selectedKeys.clear();
        for (const k of Object.keys(workByIssue)) delete workByIssue[k];
        for (const k of Object.keys(modelByKey)) delete modelByKey[k];
      }

      let currentCategories = ${jsonForScript(categories)};
      let currentPrTargets = ${jsonForScript(prTargets)};
      let currentIssueTrackers = ${jsonForScript(issueTrackers)};
      let currentSelectedTracker = ${jsonForScript(selectedTracker)};
      let currentPrSettingsOpen = ${jsonForScript(prSettingsOpen)};
      let currentOrg = ${jsonForScript(org)};
      let currentProject = ${jsonForScript(project)};
      let currentPeriod = ${jsonForScript(period)};
      let currentPeriods = ${jsonForScript(periodList)};
      // Sentry project slugs for the current org (SDK-discovered). Drives the
      // project autocomplete; empty = fall back to a typed slug box.
      let currentSentryProjects = ${jsonForScript(projectSlugs)};
      let currentOrgOptions = ${jsonForScript(orgSlugs)};
      // Dedupe guard for the setup screen's auto project-fetch-on-org-discovery
      // (see the orgDefault SSE handler below): discoverProjects's own
      // notifyClients() re-broadcasts the same orgDefault on every streamed
      // project page, so without this a single org discovery would recursively
      // re-request its own project list forever instead of settling once.
      let lastAutoFetchedOrgDefault = "";
      let currentAvailableModels = ${jsonForScript(Array.isArray(availableModels) ? availableModels : [])};
      let currentPlainEnglishView = ${jsonForScript(plainEnglishView)};
      let currentScanError = ${jsonForScript(scanError || '')};
      let currentScannedTotal = ${jsonForScript(scannedTotal)};
      let currentScannedCapped = ${jsonForScript(scannedCapped)};
      let currentScannedOlder = ${jsonForScript(scannedOlder)};
      let currentScannedOlderCapped = ${jsonForScript(scannedOlderCapped)};
      // Declared up here (not next to applyConnectionState) because that function
      // runs during init below — declaring it there with let would put it in the
      // temporal dead zone and throw, killing the whole inline script.
      let wasGatedPrev = null;
      let currentConnections = ${jsonForScript(conn)};

      Object.assign(workByIssue, ${jsonForScript(workByIssueKey)});

      syncSettingsFromState();
      updateBulkToolbar();
      updateToolbarVisibility(Boolean(${jsonForScript(org)}) && hasRenderableIssues());
      applyConnectionState();
      // Seed the per-org project cache with the org already loaded at render time
      // so switching away and back to it is instant.
      if (currentOrg && Array.isArray(currentSentryProjects) && currentSentryProjects.length) {
        projectsByOrg[currentOrg.trim().toLowerCase()] = currentSentryProjects;
      }
      if (currentOrg) renderProjectSwitcher();
      else renderSetupProjectField();
      // Single-org accounts render no #org-select, so the project-fetch trigger
      // inside the org-select change handler never runs. When there's a prefilled
      // org on the setup screen but no committed org yet and no project list
      // loaded, kick off discovery directly so the autocomplete has projects
      // without the user retyping the org. (Runs here, after currentOrg is
      // initialized, to avoid a temporal-dead-zone reference.)
      if (!currentOrg && !document.getElementById("org-select")) {
        const soloOrgInput = document.getElementById("org-input");
        const soloOrg = soloOrgInput ? soloOrgInput.value.trim() : "";
        if (soloOrg && !(Array.isArray(currentSentryProjects) && currentSentryProjects.length)) {
          requestProjectsForOrg(soloOrg);
        }
      }
      if (currentOrg) renderPeriodSwitcher();
      syncTitleSwitch();

      function statusText(status) {
        if (!status || typeof status !== "object") return "";
        if (status.phase === "queued" || status.phase === "working") return "⏳ working…";
        if (status.phase === "skipped") return "🔒 already being worked on";
        if (status.phase === "tracked") return "👀 Tracked";
        if (status.phase === "done") {
          return "created ✓";
        }
        if (status.phase === "handed-off") {
          const sessionPart = status.sessionName ? ("🧵 " + status.sessionName) : "🧵 session started";
          return sessionPart + " ↗";
        }
        if (status.phase === "error") return "⚠️ " + (status.error || "work failed");
        return "";
      }

      function statusClass(status) {
        if (!status || typeof status !== "object") return "idle";
        if (status.phase === "done") return "done";
        if (status.phase === "handed-off") return "handed-off";
        if (status.phase === "skipped") return "skipped";
        if (status.phase === "tracked") return "tracked";
        if (status.phase === "error") return "error";
        if (status.phase === "queued" || status.phase === "working") return "working";
        return "idle";
      }

      function statusLinksHtml(status) {
        if (!status || typeof status !== "object") return "";
        const stateSuffix = function (s) {
          const v = typeof s === "string" ? s.trim().toLowerCase() : "";
          return v ? (" (" + v + ")") : "";
        };
        const linkOrText = function (url, label) {
          return url
            ? ('<a href="' + safeHref(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>')
            : ('<span>' + escapeHtml(label) + '</span>');
        };
        const links = [];
        const phase = status.phase;
        // Freshly created artifacts (done / handed-off): link the new issue and PR
        // so the numbers are clickable, mirroring the existing tracked/skipped links.
        if (phase === "done" || phase === "handed-off") {
          if (status.issueUrl || status.issueNumber) {
            const base = status.issueNumber ? ("issue #" + status.issueNumber) : "issue created";
            links.push(linkOrText(status.issueUrl, base));
          }
          if ((phase === "done" || phase === "handed-off") && (status.prUrl || status.prNumber)) {
            const base = status.prNumber ? ("PR #" + status.prNumber) : "PR opened";
            const label = base + stateSuffix(status.prState);
            links.push(linkOrText(status.prUrl, label));
          }
        }
        if (status.existingIssueUrl) {
          const base = status.existingIssueNumber ? ("issue #" + status.existingIssueNumber) : "existing issue";
          const label = base + stateSuffix(status.existingIssueState);
          links.push(linkOrText(status.existingIssueUrl, label));
        }
        if (status.existingPrUrl) {
          const base = status.existingPrNumber ? ("PR #" + status.existingPrNumber) : "existing PR";
          const label = base + stateSuffix(status.existingPrState);
          links.push(linkOrText(status.existingPrUrl, label));
        }
        return links.join(" · ");
      }

      function workStatusHtml(status) {
        const text = statusText(status);
        if (!text) return "";
        const links = statusLinksHtml(status);
        return escapeHtml(text) + (links ? ('<span class="card-work-links">' + links + '</span>') : "");
      }

      function relatedHintHtml(issue) {
        const list = issue && Array.isArray(issue.relatedIncidents) ? issue.relatedIncidents : [];
        if (!list.length) return "";
        const links = list.map(function (r) {
          const label = r.number ? ("#" + r.number) : "issue";
          const state = typeof r.state === "string" && r.state ? (" (" + r.state.toLowerCase() + ")") : "";
          const title = typeof r.title === "string" && r.title ? r.title : ("issue " + label);
          if (r.url) {
            return '<a href="' + safeHref(r.url) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(title) + '">' + escapeHtml(label + state) + '</a>';
          }
          return '<span title="' + escapeHtml(title) + '">' + escapeHtml(label + state) + '</span>';
        }).join(", ");
        return '<span class="card-related" title="Same error text as an existing issue that isn\\'t a canvas tracking issue — verify before acting.">⚠️ Possibly related: ' + links + '</span>';
      }

      function applyWorkStates() {
        document.querySelectorAll(".card-work-status").forEach((node) => {
          const key = node.dataset.key;
          const status = workByIssue[key];
          const html = workStatusHtml(status);
          node.classList.remove("working", "done", "handed-off", "skipped", "tracked", "error", "idle");
          node.classList.add(statusClass(status));
          if (html) {
            node.style.display = "";
            node.innerHTML = html;
          } else {
            node.style.display = "none";
            node.textContent = "";
          }
        });
      }

      function applySelections() {
        const checkboxes = Array.from(document.querySelectorAll(".issue-check"));
        const visibleKeys = new Set(checkboxes.map((box) => box.dataset.key));
        for (const key of Array.from(selectedKeys)) {
          if (!visibleKeys.has(key)) selectedKeys.delete(key);
        }
        for (const key of Object.keys(modelByKey)) {
          if (!visibleKeys.has(key)) delete modelByKey[key];
        }
        checkboxes.forEach((box) => {
          box.checked = selectedKeys.has(box.dataset.key);
        });
        syncCardModels();
        updateCategorySelectAllState();
        updateBulkToolbar();
      }

      // Show the per-card model override for any selected card. A model is always
      // relevant because "Fix with Copilot" (and "Create issue" with Assign Copilot
      // on) can start a session at any time. Reflect stored overrides so they
      // survive re-renders (SSE rebuilds cards).
      function syncCardModels() {
        Array.from(document.querySelectorAll(".card")).forEach((card) => {
          const key = card.dataset.key;
          const wrap = card.querySelector(".card-model-wrap");
          const select = card.querySelector(".card-model");
          const show = selectedKeys.has(key);
          if (wrap) wrap.style.display = show ? "" : "none";
          if (select) select.value = modelByKey[key] || "";
        });
      }

      // The toolbar model picker feeds "Fix with Copilot", so keep it visible
      // whenever the toolbar shows and reflect per-card overrides.
      function syncModelControls() {
        const modelWrap = document.querySelector(".toolbar-model");
        if (modelWrap) modelWrap.style.display = "";
        syncCardModels();
        renderTargetSummary();
      }

      function updateCategorySelectAllState() {
        document.querySelectorAll(".category").forEach((section) => {
          const categoryToggle = section.querySelector(".category-check");
          const boxes = Array.from(section.querySelectorAll(".issue-check"));
          if (!categoryToggle || boxes.length === 0) return;
          const checked = boxes.filter((box) => box.checked).length;
          categoryToggle.indeterminate = checked > 0 && checked < boxes.length;
          categoryToggle.checked = checked === boxes.length;
        });
      }

      function updateBulkToolbar() {
        const button = document.getElementById("work-selected");
        const fixButton = document.getElementById("fix-with-copilot");
        // Count only STARTABLE selections. A card that is already queued/working/
        // handed-off stays selectable, but both click handlers filter it out via
        // startableSelectedKeys(); counting it here would enable the buttons with
        // "(1)" while clicking silently does nothing. Disabled state must match.
        const count = startableSelectedKeys().length;
        if (button) {
          button.disabled = count === 0;
          button.textContent = "📝 Create issue (" + count + ")";
        }
        if (fixButton) {
          fixButton.disabled = count === 0;
          fixButton.textContent = "🔧 Fix with Copilot (" + count + ")";
        }
        const modelSelect = document.getElementById("toolbar-model");
        if (modelSelect) modelSelect.disabled = count === 0;
        renderTargetSummary();
      }

      function renderTargetSummary() {
        const node = document.getElementById("work-target-summary");
        if (!node) return;
        const trackers = Array.isArray(currentIssueTrackers) ? currentIssueTrackers : [];
        const selected = trackers.find((tracker) => tracker.id === currentSelectedTracker) || trackers[0] || { label: "GitHub Issues", id: "github" };
        const issueRepo = (currentPrTargets && currentPrTargets.cloud && currentPrTargets.cloud.repo) || "current repo";
        const openIssue = selected.id === "github"
          ? (selected.label + " in " + issueRepo)
          : selected.label;
        const draftMode = currentPrTargets?.mode === "cloud" ? "cloud" : "local";
        let draftTarget;
        if (draftMode === "cloud") {
          draftTarget = (currentPrTargets?.cloud?.repo || "current repo") + " @ " + (currentPrTargets?.cloud?.baseBranch || "default");
        } else {
          const localBase = currentPrTargets?.local?.baseBranch || "default";
          draftTarget = (currentPrTargets?.local?.path || "current project") + " @ " + localBase;
        }
        const modelId = currentPrTargets?.model || "";
        const models = Array.isArray(currentAvailableModels) ? currentAvailableModels : [];
        const modelLabel = (models.find((m) => m.id === modelId) || {}).label || "Auto";
        let overrideCount = 0;
        selectedKeys.forEach((key) => { if (modelByKey[key]) overrideCount++; });
        const modelPart = overrideCount > 0
          ? modelLabel + " (" + overrideCount + " overridden)"
          : modelLabel;
        node.innerHTML = "";
        const line1 = document.createElement("div");
        line1.className = "summary-line";
        line1.textContent = "📝 Create issue → tracking only in " + openIssue;
        const line2 = document.createElement("div");
        line2.className = "summary-line";
        line2.textContent = "🔧 Fix with Copilot → opens issue in " + openIssue + " + Draft PR " + draftMode + " (" + draftTarget + ") · Model: " + modelPart;
        node.appendChild(line1);
        node.appendChild(line2);
      }

      function updateModeHint() {
        const mode = document.getElementById("pr-mode");
        const hint = document.getElementById("mode-hint");
        const localGroup = document.getElementById("local-group");
        const cloudGroup = document.getElementById("cloud-group");
        const isCloud = mode && mode.value === "cloud";
        if (hint) {
          hint.textContent = isCloud
            ? "Cloud: hands the fix to a GitHub-hosted Copilot coding agent that creates the branch and draft PR remotely in the repo below. Nothing runs on your machine."
            : "Local: opens the draft PR in a git worktree on this machine, using the local path and base branch below.";
        }
        if (localGroup) localGroup.classList.toggle("dimmed", !!isCloud);
        if (cloudGroup) cloudGroup.classList.toggle("dimmed", !isCloud);
      }

      function syncSettingsFromState() {
        const trackerSelect = document.getElementById("tracker-select");
        if (trackerSelect) {
          trackerSelect.innerHTML = "";
          const trackers = Array.isArray(currentIssueTrackers) ? currentIssueTrackers : [];
          trackers.forEach((tracker) => {
            const option = document.createElement("option");
            option.value = tracker.id;
            option.textContent = tracker.connected === false
              ? (tracker.label + " (not connected)")
              : tracker.label;
            option.disabled = tracker.connected === false;
            option.selected = tracker.id === currentSelectedTracker;
            trackerSelect.appendChild(option);
          });
        }

        const mode = document.getElementById("pr-mode");
        if (mode) mode.value = currentPrTargets?.mode === "cloud" ? "cloud" : "local";
        updateModeHint();

        const modelSelect = document.getElementById("toolbar-model");
        if (modelSelect) {
          const selectedModel = currentPrTargets?.model || "";
          const models = Array.isArray(currentAvailableModels) ? currentAvailableModels : [];
          modelSelect.innerHTML = "";
          const list = models.length ? models : [{ id: "", label: "Auto (session default)" }];
          list.forEach((model) => {
            const option = document.createElement("option");
            option.value = model.id;
            option.textContent = model.label;
            option.selected = model.id === selectedModel;
            modelSelect.appendChild(option);
          });
          modelSelect.value = selectedModel;
        }
        syncCardModels();
        syncModelControls();

        const localPath = document.getElementById("local-path");
        if (localPath) localPath.value = currentPrTargets?.local?.path || "";
        const localBranch = document.getElementById("local-branch");
        if (localBranch) localBranch.value = currentPrTargets?.local?.baseBranch || "";
        const cloudRepo = document.getElementById("cloud-repo");
        if (cloudRepo) cloudRepo.value = currentPrTargets?.cloud?.repo || "";
        const cloudBranch = document.getElementById("cloud-branch");
        if (cloudBranch) cloudBranch.value = currentPrTargets?.cloud?.baseBranch || "";

        const panel = document.getElementById("work-settings");
        if (panel) panel.style.display = (!currentOrg || currentPrSettingsOpen) ? "" : "none";
        renderTargetSummary();
      }

      source.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.flash) {
          const icon = msg.flash.kind === "warn" ? "⚠️ " : "";
          showToast(icon + msg.flash.message);
          return;
        }

        if (typeof msg.scanning === "boolean") {
          if (msg.scanning) showScanOverlay(currentProject ? "Scanning " + currentProject + "…" : "Scanning all projects…");
          else hideScanOverlay();
          return;
        }

        if (msg.work && msg.work.key) {
          const next = { ...msg.work };
          delete next.key;
          workByIssue[msg.work.key] = next;
          applyWorkStates();
          return;
        }

        if (msg.connections) {
          currentConnections = msg.connections;
          applyConnectionState();
        }

        if (msg.org) {
          if (msg.org !== currentOrg) resetPerCardState();
          currentOrg = msg.org;
          enterTriageChrome(msg.org);
          updateToolbarVisibility(hasRenderableIssues());
        } else if (typeof msg.orgDefault === "string") {
          // Org discovery can complete AFTER the setup screen already rendered
          // (e.g. the user signs in post-load) — there's no #org-select to bind a
          // change handler to yet, so nothing else would kick off a project fetch
          // for this org. Only fire when this call actually just populated the
          // (previously empty) org field, and dedupe per-org: discoverProjects's
          // own notifyClients() re-broadcasts this same orgDefault on every
          // streamed page, so firing unconditionally here would recursively
          // re-request the project list on every page and never settle.
          // Also skip it when this same snapshot is about to render a
          // multi-org <select> below (msg.orgOptions has 2+ entries) — that
          // selector's own mirror() already requests projects for the
          // selected org, so firing here too would kick off a duplicate,
          // serialized (and possibly slow, up to the paging budget) traversal.
          const willRenderOrgSelect = Array.isArray(msg.orgOptions) && msg.orgOptions.filter(Boolean).length >= 2;
          const justFilled = applyOrgDefault(msg.orgDefault);
          if (justFilled && !willRenderOrgSelect && !document.getElementById("org-select") && lastAutoFetchedOrgDefault !== msg.orgDefault) {
            lastAutoFetchedOrgDefault = msg.orgDefault;
            requestProjectsForOrg(msg.orgDefault);
          }
        }
        if ("project" in msg) {
          const nextProject = msg.project || "";
          if (nextProject !== currentProject) resetPerCardState();
          currentProject = nextProject;
          const sel = document.getElementById("project-switcher");
          if (sel) sel.value = currentProject;
          updateTriageDesc();
        }
        if (typeof msg.period === "string") {
          currentPeriod = msg.period;
          const psel = document.getElementById("period-select");
          if (psel && psel.value !== msg.period) psel.value = msg.period;
        }
        if (Array.isArray(msg.periods)) currentPeriods = msg.periods;
        if (Array.isArray(msg.projects)) {
          const forOrg = typeof msg.projectsOrg === "string" ? msg.projectsOrg.trim().toLowerCase() : "";
          // Always cache under the org this list belongs to so re-selecting it is
          // instant next time.
          if (forOrg) projectsByOrg[forOrg] = msg.projects;
          // Only paint the on-screen field if this broadcast matches the org the
          // user currently has selected — a background refresh for a previous org
          // must not clobber the current list.
          const sel = selectedOrgSlug();
          if (!forOrg || !sel || forOrg === sel) {
            currentSentryProjects = msg.projects;
            setProjectLoading(false);
            // Repaint whichever project field is on screen with the new options.
            if (currentOrg) renderProjectSwitcher();
            else renderSetupProjectField();
            // If the user is actively typing in the project box while more
            // projects stream in (large orgs page in over a few seconds),
            // refresh the open suggestion menu live so new matches appear
            // without needing another keystroke.
            const activeInp = activeProjectInput();
            if (activeInp && document.activeElement === activeInp) {
              const wrap = activeInp.closest(".project-ac");
              const menu = wrap && wrap.querySelector(".project-ac-menu");
              if (menu && !menu.hidden) activeInp.dispatchEvent(new Event("input"));
            }
          }
        }
        if (Array.isArray(msg.orgOptions)) {
          currentOrgOptions = msg.orgOptions;
          // Post-load org discovery (e.g. signing in without reloading) can
          // reveal 2+ orgs after the setup screen already rendered a plain
          // text input. Rebuild it as a <select> now so the multi-org flow
          // works without a reload. No-ops once already a <select>, and
          // no-ops off the setup screen (no #org-input present there).
          renderSetupOrgSelect();
        }
        if (typeof msg.savedDefaultOrg === "string" && msg.savedDefaultOrg !== currentSavedDefaultOrg) {
          currentSavedDefaultOrg = msg.savedDefaultOrg;
          refreshDefaultBtn();
        }
        if (Array.isArray(msg.availableModels)) currentAvailableModels = msg.availableModels;
        if (typeof msg.plainEnglishView === "boolean" && msg.plainEnglishView !== currentPlainEnglishView) {
          currentPlainEnglishView = msg.plainEnglishView;
          syncTitleSwitch();
        }
        if (msg.prTargets) currentPrTargets = msg.prTargets;
        if (msg.issueTrackers) currentIssueTrackers = msg.issueTrackers;
        if (msg.selectedTracker) currentSelectedTracker = msg.selectedTracker;
        if (typeof msg.prSettingsOpen === "boolean") currentPrSettingsOpen = msg.prSettingsOpen;
        if (msg.workByIssueKey && typeof msg.workByIssueKey === "object") {
          for (const key of Object.keys(workByIssue)) delete workByIssue[key];
          Object.assign(workByIssue, msg.workByIssueKey);
        }
        syncSettingsFromState();

        if (typeof msg.scanError === "string") currentScanError = msg.scanError;
        if (typeof msg.scannedTotal === "number") currentScannedTotal = msg.scannedTotal;
        if (typeof msg.scannedCapped === "boolean") currentScannedCapped = msg.scannedCapped;
        if (typeof msg.scannedOlder === "number") currentScannedOlder = msg.scannedOlder;
        if (typeof msg.scannedOlderCapped === "boolean") currentScannedOlderCapped = msg.scannedOlderCapped;
        if (msg.categories === undefined) return;
        currentCategories = Array.isArray(msg.categories) ? msg.categories : [];
        renderCategories(currentCategories);
      };

      function updateToolbarVisibility(show) {
        const toolbar = document.getElementById("work-toolbar");
        if (toolbar) toolbar.style.display = show ? "" : "none";
        const titleBar = document.getElementById("title-mode-bar");
        if (titleBar) titleBar.style.display = show ? "" : "none";
      }

      // The Plain-English toggle and "Work on selected" bar only make sense when
      // there's at least one triage-worthy issue on the board, so their visibility
      // tracks the rendered issue count (not just whether an org is chosen).
      function hasRenderableIssues() {
        return Array.isArray(currentCategories)
          && currentCategories.reduce((s, c) => s + (c && Array.isArray(c.issues) ? c.issues.length : 0), 0) > 0;
      }

      // Toggle the setup gate (Sentry) from the latest preflight result.
      // Optimistic before the first check so nothing flashes in prematurely.
      // Tracks whether Sentry was gated on the previous apply so that when the
      // gate clears (the preflight re-runs each time the canvas is reopened) we
      // can announce why the board appeared.
      function applyConnectionState() {
        const c = currentConnections || {};
        const checked = Boolean(c.checked);
        const sentryReady = !checked || (c.sentry && c.sentry.reachable);
        const gatedNow = checked && !sentryReady;
        document.body.classList.toggle("sentry-gated", gatedNow);

        // Auth vs connectivity vs unknown: only auth failures set configured:false,
        // so a gated-but-configured state means Sentry was simply unreachable. Among
        // those, transient marks a retryable network blip; a settled/unknown failure
        // gets neutral guidance instead of a false "it should recover" promise. Swap
        // the gate title/body so we never tell an already-signed-in user to run the
        // sentry auth login command, nor promise recovery for what won't self-heal.
        const signedOut = !(c.sentry && c.sentry.configured);
        const transientConn = Boolean(c.sentry && c.sentry.transient);
        const packageMissing = (c.sentry && c.sentry.setup) === "package-missing";
        const gateTitleEl = document.getElementById("gate-title");
        if (gateTitleEl) {
          gateTitleEl.textContent = packageMissing
            ? "Set up the Sentry CLI"
            : signedOut
            ? "Connect Sentry to start triaging"
            : "Can’t reach Sentry right now";
        }
        const setupBody = document.getElementById("gate-body-setup");
        const authBody = document.getElementById("gate-body-auth");
        const connBody = document.getElementById("gate-body-conn");
        const unknownBody = document.getElementById("gate-body-unknown");
        if (setupBody) setupBody.style.display = packageMissing ? "" : "none";
        if (authBody) authBody.style.display = signedOut && !packageMissing ? "" : "none";
        if (connBody) connBody.style.display = !signedOut && !packageMissing && transientConn ? "" : "none";
        if (unknownBody) unknownBody.style.display = !signedOut && !packageMissing && !transientConn ? "" : "none";

        // Surface the specific preflight failure in the gate (or hide it when the
        // error clears / there's nothing actionable beyond the sign-in steps).
        const gateErrEl = document.getElementById("gate-error");
        if (gateErrEl) {
          const err = (c.sentry && c.sentry.error) || "";
          if (gatedNow && err && !packageMissing && !signedOut) {
            gateErrEl.textContent = err;
            gateErrEl.style.display = "";
          } else {
            gateErrEl.textContent = "";
            gateErrEl.style.display = "none";
          }
        }

        if (wasGatedPrev === true && !gatedNow) {
          // Just healed — the preflight re-ran (on reopen or re-check) and Sentry
          // is now reachable. Tell the user why the board appeared.
          showToast("✅ Sentry connected — loading your issues");
        }
        wasGatedPrev = gatedNow;
      }

      function focusConnectionGateLead(sentryConn) {
        const panelId = sentryConn && sentryConn.transient ? "gate-body-conn" : "gate-body-unknown";
        const connLead = document.querySelector("#" + panelId + " .gate-lead");
        if (connLead) { connLead.setAttribute("tabindex", "-1"); connLead.focus(); }
      }

      function focusActiveOrgControl() {
        const orgInput = document.getElementById("org-input");
        const orgSelect = document.getElementById("org-select");
        const orgSwitcher = document.getElementById("org-switcher");
        const focusTarget = orgInput || orgSelect || orgSwitcher;
        if (focusTarget) focusTarget.focus();
      }

      function enterTriageChrome(org) {
        const picker = document.querySelector(".org-picker");
        if (picker) picker.style.display = "none";
        const setupInstructions = document.getElementById("setup-instructions");
        if (setupInstructions) setupInstructions.style.display = "none";
        const setupScan = document.getElementById("setup-scan");
        if (setupScan) setupScan.style.display = "none";
        if (!document.getElementById("triage-desc")) {
          const header = document.querySelector(".page-header");
          const p = document.createElement("p");
          p.id = "triage-desc";
          p.className = "page-description";
          header.after(p);
          if (!document.querySelector(".header-controls")) {
            const controls = document.createElement("div");
            controls.className = "header-controls";
            header.appendChild(controls);
          }
          if (!document.getElementById("refresh")) {
            const controls = document.querySelector(".header-controls");
            const divider = document.createElement("span");
            divider.className = "control-divider";
            divider.setAttribute("aria-hidden", "true");
            const btn = document.createElement("button");
            btn.id = "refresh";
            btn.className = "refresh-btn";
            btn.title = "Re-scan errors";
            btn.innerHTML = '<span class="refresh-icon">↻</span> Re-scan';
            controls.appendChild(divider);
            controls.appendChild(btn);
          }
        }
        updateTriageDesc();
        renderProjectSwitcher();
        renderPeriodSwitcher();
        syncTitleSwitch();
      }

      // Rebuild the triage description line with the current org + project scope.
      function updateTriageDesc() {
        const desc = document.getElementById("triage-desc");
        if (!desc || !currentOrg) return;
        let html = 'On-call error triage for <strong>' + escapeHtml(currentOrg) + '</strong>';
        if (currentProject) html += ' / <strong>' + escapeHtml(currentProject) + '</strong>';
        html += ' — issues grouped by why they need your attention right now.';
        desc.innerHTML = html;
      }

      // Sentry project slugs to offer in the autocomplete, always including the
      // current project so an explicitly-set slug is never dropped.
      function sentryProjectChoices() {
        const list = Array.isArray(currentSentryProjects) ? currentSentryProjects.filter(Boolean) : [];
        return currentProject && !list.includes(currentProject) ? [currentProject, ...list] : list;
      }

      // The project slugs known to belong to a specific org. Always read from the
      // org-keyed cache (populated by the initial seed and every SSE broadcast under
      // the list's own org), never from the painted currentSentryProjects list: on a
      // free-text header org switch, fetchScoped() sets currentOrg to the new org
      // before its project-list broadcast arrives, so the painted list still holds
      // the previous org's slugs. Trusting currentOrg === slug there would treat
      // those stale slugs as local and let Enter bypass the exact-slug resolver. The
      // cache only ever holds each org's own list, so an org with no entry yet
      // returns [] and every typed slug is verified — the safe direction.
      function localProjectChoicesForOrg(org) {
        const slug = String(org || "").trim().toLowerCase();
        if (!slug) return [];
        const cached = projectsByOrg[slug];
        return Array.isArray(cached) ? cached.filter(Boolean) : [];
      }

      // The project input on screen — the header switcher in triage chrome, else
      // the setup-screen field.
      function activeProjectInput() {
        return document.getElementById("project-switcher") || document.getElementById("project-input");
      }

      // The org the UI is currently targeting, lowercased. In triage chrome that's
      // the header org switcher (or the scanned org); on the setup screen it's the
      // org select / typed slug. Used to ignore stale project broadcasts from a
      // previously-selected org (a background refresh can land after the user has
      // already switched away).
      function selectedOrgSlug() {
        const sw = document.getElementById("org-switcher");
        if (sw && sw.value.trim()) return sw.value.trim().toLowerCase();
        const sel = document.getElementById("org-select");
        if (sel && sel.value.trim()) return sel.value.trim().toLowerCase();
        const inp = document.getElementById("org-input");
        if (inp && inp.value.trim()) return inp.value.trim().toLowerCase();
        return (currentOrg || "").trim().toLowerCase();
      }

      // Show/clear a "loading projects…" hint on the project field so switching
      // org gives instant feedback while the new list is fetched over the network.
      function setProjectLoading(on) {
        const el = activeProjectInput();
        if (!el) return;
        if (on) {
          el.classList.add("project-ac-loading");
          el.setAttribute("placeholder", "loading projects…");
        } else {
          el.classList.remove("project-ac-loading");
          el.setAttribute("placeholder", "all projects — type to search");
        }
      }

      // Load the project list for an org into the autocomplete. Uses the per-org
      // cache for an instant result when we've seen the org before; otherwise
      // shows the loading hint until the SSE broadcast arrives. Always kicks off a
      // background refresh so the cached list stays current.
      function requestProjectsForOrg(org) {
        const slug = String(org || "").trim().toLowerCase();
        if (!slug) { currentSentryProjects = []; return; }
        const cached = projectsByOrg[slug];
        if (Array.isArray(cached)) {
          currentSentryProjects = cached;
          setProjectLoading(false);
        } else {
          currentSentryProjects = [];
          setProjectLoading(true);
        }
        fetch("/api/list-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org: slug })
        }).catch(() => setProjectLoading(false));
      }

      // Resolve one exact typed slug against Sentry (project.view) and cache the
      // outcome. Called ONLY from an explicit commit (Enter), never on keystroke,
      // so at most one lookup per committed slug is ever issued — no per-prefix
      // queue of stale lookups. onDone runs after the cache is updated
      // (found/missing/error) so the caller can commit the canonical slug or
      // repaint an open menu. In-flight and settled lookups are not repeated; a
      // prior "error" is cleared by the caller before an explicit retry.
      function resolveProjectSlug(org, slug, onDone) {
        const o = String(org || "").trim().toLowerCase();
        const s = String(slug || "").trim();
        if (!o || !s) return;
        const key = projectResolveKey(o, s);
        const cached = projectResolveCache[key];
        // A settled entry (found/missing/error) fires immediately. A check that's
        // already in flight can't fire yet, so queue this callback to be flushed
        // when it settles — otherwise a second caller during "checking" is dropped.
        if (cached) {
          if (cached.status === "checking") {
            if (onDone) (projectResolveWaiters[key] || (projectResolveWaiters[key] = [])).push(onDone);
          } else if (onDone) {
            onDone(cached);
          }
          return;
        }
        projectResolveCache[key] = { status: "checking", slug: "" };
        // Record the settled entry, notify this caller, then flush anyone who
        // queued while the request was in flight.
        const settle = (entry) => {
          projectResolveCache[key] = entry;
          if (onDone) onDone(entry);
          const waiters = projectResolveWaiters[key];
          if (waiters) {
            delete projectResolveWaiters[key];
            for (const fn of waiters) { try { fn(entry); } catch (_) {} }
          }
        };
        fetch("/api/resolve-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org: o, slug: s })
        })
          .then((r) => r.json())
          .then((d) => {
            if (!d || d.ok === false) settle({ status: "error", slug: "" });
            else if (d.found) settle({ status: "found", slug: String(d.slug || s) });
            else settle({ status: "missing", slug: "" });
          })
          .catch(() => {
            settle({ status: "error", slug: "" });
          });
      }

      // Ensure a typed project is a real project in the org before any scan starts,
      // so the "scans never run against an unverified project" invariant holds for
      // pointer users too — the setup Scan button/form and the header Fetch button,
      // not just Enter in the autocomplete. Resolves to the canonical slug. An empty
      // project is an all-projects scan (always allowed); a locally-known project
      // needs no lookup; anything else is verified via the shared resolver, reusing
      // its cache and in-flight de-duplication.
      function verifyProjectForScan(org, project) {
        return new Promise((resolve) => {
          const o = String(org || "").trim().toLowerCase();
          const raw = String(project || "").trim();
          if (!raw) { resolve({ ok: true, slug: "" }); return; }
          if (!o) { resolve({ ok: true, slug: raw }); return; }
          const p = raw.toLowerCase();
          if (localProjectChoicesForOrg(o).some((s) => s.toLowerCase() === p)) {
            resolve({ ok: true, slug: raw });
            return;
          }
          const key = projectResolveKey(o, p);
          const rc = projectResolveCache[key];
          if (rc && rc.status === "found") { resolve({ ok: true, slug: rc.slug || raw }); return; }
          if (rc && rc.status === "missing") { resolve({ ok: false, reason: "missing", slug: raw }); return; }
          if (rc && rc.status === "error") delete projectResolveCache[key];
          resolveProjectSlug(o, p, (res) => {
            if (res && res.status === "found") resolve({ ok: true, slug: res.slug || raw });
            else resolve({ ok: false, reason: (res && res.status) || "error", slug: raw });
          });
        });
      }


      // (A <select> is unwieldy for orgs with many projects, and a <datalist>
      // does not repaint in this webview.) onCommit(value) runs when the user
      // picks a suggestion; an empty value means "all projects". The project list
      // is read live on each open, so newly-discovered projects appear without a
      // rebuild. Idempotent per input.
      function attachProjectAutocomplete(input, onCommit, onVerifiedCommit) {
        if (!input || input.dataset.acWired) return;
        input.dataset.acWired = "1";
        // Ensure the input sits in a positioned wrapper with a menu container.
        let wrap = input.closest(".project-ac");
        if (!wrap) {
          wrap = document.createElement("span");
          wrap.className = "project-ac";
          input.parentNode.insertBefore(wrap, input);
          wrap.appendChild(input);
        }
        let menu = wrap.querySelector(".project-ac-menu");
        if (!menu) {
          menu = document.createElement("div");
          menu.className = "project-ac-menu";
          menu.setAttribute("role", "listbox");
          menu.hidden = true;
          wrap.appendChild(menu);
        }
        // Programmatically associate the combobox with its listbox so screen
        // readers announce the popup and can follow the active option.
        if (!menu.id) menu.id = (input.id ? input.id : "project-ac") + "-listbox";
        input.setAttribute("aria-controls", menu.id);
        // A visually-hidden live region announces exact-slug resolution state
        // (checking / verified / not found / couldn't check) to screen readers,
        // because the listbox itself is not a live region and its contents are
        // replaced silently. Associated with the combobox via aria-describedby.
        let statusEl = wrap.querySelector(".project-ac-status");
        if (!statusEl) {
          statusEl = document.createElement("div");
          statusEl.className = "project-ac-status";
          statusEl.setAttribute("aria-live", "polite");
          statusEl.setAttribute("role", "status");
          statusEl.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";
          wrap.appendChild(statusEl);
        }
        if (!statusEl.id) statusEl.id = menu.id + "-status";
        const describedBy = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (!describedBy.includes(statusEl.id)) { describedBy.push(statusEl.id); input.setAttribute("aria-describedby", describedBy.join(" ")); }
        const optionId = (i) => menu.id + "-opt-" + i;
        function syncActiveDescendant() {
          if (active >= 0 && items[active]) input.setAttribute("aria-activedescendant", optionId(active));
          else input.removeAttribute("aria-activedescendant");
        }
        let items = [];
        let active = -1;
        const CAP = 50;
        function render() {
          const q = input.value.trim().toLowerCase();
          const org = selectedOrgSlug();
          const source = localProjectChoicesForOrg(org);
          let matches = q ? source.filter((s) => s.toLowerCase().includes(q)) : source.slice();
          const truncated = matches.length > CAP;
          matches = matches.slice(0, CAP);
          items = [];
          // Offer an explicit "all projects" reset only when the box is empty.
          if (!q) items.push({ value: "", label: "All projects", all: true });
          matches.forEach((s) => items.push({ value: s, label: s }));

          // Exact-slug resolution: when the user has typed something with no
          // exact local match, an explicit commit (Enter) asks Sentry directly
          // whether that project exists (the paged list can't reach every project
          // in a mega-org). This turns a misleading "No matching projects" into a
          // selectable verified option — or an honest "not found" — without paging
          // thousands of projects.
          let resolveHint = "";
          let statusText = "";
          const hasExactLocal = source.some((s) => s.toLowerCase() === q);
          if (q && org && !hasExactLocal) {
            const key = projectResolveKey(org, q);
            const rc = projectResolveCache[key];
            // Resolution is triggered ONLY on an explicit commit (Enter / click),
            // never as a side effect of typing. So render() just REFLECTS whatever
            // the cache already holds: it neither schedules a lookup nor cancels
            // one. That removes the per-prefix queue of stale lookups AND the
            // completion-repaint retry loop the earlier keystroke-debounced version
            // could spin during an outage.
            if (!rc) {
              resolveHint = "prompt"; // offer an explicit check on Enter
            } else if (rc.status === "checking") {
              resolveHint = "checking";
              statusText = "Checking Sentry for \u201C" + q + "\u201D\u2026";
            } else if (rc.status === "found") {
              // Surface the canonical slug as a verified, selectable option at the
              // top — deduped against any local match with the same slug.
              const canon = rc.slug || q;
              const dup = items.some((it) => it.value && it.value.toLowerCase() === canon.toLowerCase());
              if (!dup) items.unshift({ value: canon, label: canon, verified: true });
              statusText = "Verified project \u201C" + canon + "\u201D in " + org;
            } else if (rc.status === "missing") {
              resolveHint = "missing";
              statusText = "No project \u201C" + q + "\u201D in " + org;
            } else if (rc.status === "error") {
              resolveHint = "error";
              statusText = "Couldn't check Sentry for \u201C" + q + "\u201D";
            }
          }
          if (statusEl && statusEl.textContent !== statusText) statusEl.textContent = statusText;

          if (!items.length) {
            const empty =
              resolveHint === "checking" ? "Checking Sentry…"
              : resolveHint === "prompt" ? "Press Enter to check Sentry for \u201C" + escapeHtml(q) + "\u201D"
              : resolveHint === "missing" ? "No project \u201C" + escapeHtml(q) + "\u201D in " + escapeHtml(org)
              : resolveHint === "error" ? "Couldn't check Sentry — press Enter to retry"
              : "No matching projects";
            menu.innerHTML = '<div class="project-ac-empty">' + empty + '</div>';
            syncActiveDescendant();
            return;
          }
          if (active >= items.length) active = items.length - 1;
          menu.innerHTML =
            items
              .map((it, i) =>
                '<div id="' + optionId(i) + '" class="project-ac-item' + (i === active ? ' active' : '') + '" role="option" aria-selected="' + (i === active) + '" data-idx="' + i + '">' +
                (it.all ? '<span class="project-ac-all">' + escapeHtml(it.label) + '</span>' : escapeHtml(it.label)) +
                (it.verified ? '<span class="project-ac-verified" title="Verified in Sentry">\u2713</span>' : '') +
                '</div>')
              .join('') +
            (resolveHint === "checking" ? '<div class="project-ac-more">Checking Sentry…</div>'
              : resolveHint === "prompt" ? '<div class="project-ac-more">Press Enter to check Sentry for \u201C' + escapeHtml(q) + '\u201D</div>'
              : resolveHint === "error" ? "<div class='project-ac-more'>Couldn't check Sentry — press Enter to retry</div>"
              : resolveHint === "missing" ? '<div class="project-ac-more">No project \u201C' + escapeHtml(q) + '\u201D in ' + escapeHtml(org) + '</div>'
              : truncated ? '<div class="project-ac-more">Keep typing to narrow…</div>' : '');
          syncActiveDescendant();
        }
        function open() { render(); menu.hidden = false; input.setAttribute("aria-expanded", "true"); }
        function close() { menu.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
        function commit(value, opts) {
          input.value = value;
          close();
          // Committing the exact-slug *verified* option (an off-list project Sentry
          // confirmed) uses onVerifiedCommit when provided, so the setup field can
          // start the scan on it even though its onCommit is null (plain local list
          // picks there just fill the box). Every other commit uses onCommit. On the
          // header both callbacks are the same fetchScoped, so behavior is unchanged.
          const cb = (opts && opts.verified && onVerifiedCommit) ? onVerifiedCommit : onCommit;
          if (cb) cb(value);
        }
        input.addEventListener("focus", open);
        input.addEventListener("input", () => {
          active = -1;
          // Editing the query clears a stale transient-failure marker for exactly
          // this slug, so the menu drops back to the "Press Enter to check" prompt
          // instead of showing a leftover error. The actual (re)check happens only
          // when the user presses Enter — never as a side effect of typing.
          const q = input.value.trim().toLowerCase();
          const org = selectedOrgSlug();
          if (q && org) {
            const key = projectResolveKey(org, q);
            const rc = projectResolveCache[key];
            if (rc && rc.status === "error") delete projectResolveCache[key];
          }
          open();
        });
        input.addEventListener("keydown", (e) => {
          if (menu.hidden) {
            if (e.key === "ArrowDown") { e.preventDefault(); open(); return; }
            // Enter still needs the exact-slug lookup below even when the menu is
            // closed (e.g. after Escape); otherwise a typed slug bubbles to the scan
            // handler and is sent to /api/set-org unverified. Short-circuit the rest.
            if (e.key !== "Enter") return;
          }
          if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
          else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
          else if (e.key === "Enter") {
            // A highlighted suggestion commits directly.
            if (active >= 0 && items[active]) { e.preventDefault(); e.stopPropagation(); commit(items[active].value, { verified: !!items[active].verified }); return; }
            // Otherwise, if the user typed a slug with no exact local match, Enter is
            // the EXPLICIT commit that triggers exact-slug resolution — we never look
            // up as they type. Verify it once, then commit the canonical slug on
            // success, or surface an honest "not found" / "couldn't check" in place.
            const q = input.value.trim().toLowerCase();
            const org = selectedOrgSlug();
            if (q && org && !localProjectChoicesForOrg(org).some((s) => s.toLowerCase() === q)) {
              e.preventDefault(); e.stopPropagation();
              const key = projectResolveKey(org, q);
              const rc = projectResolveCache[key];
              if (rc && rc.status === "found") { commit(rc.slug || q, { verified: true }); return; }
              if (rc && rc.status === "checking") { open(); return; }
              // Fresh check, or an explicit retry after a prior transient error.
              if (rc && rc.status === "error") delete projectResolveCache[key];
              resolveProjectSlug(org, q, (res) => {
                // Ignore a stale completion if the box has since moved on — either
                // the project text changed, or the org was edited while the lookup
                // was pending (a result verified for the old org must not commit and
                // let fetchScoped() scan a different, unverified org).
                if (input.value.trim().toLowerCase() !== q || selectedOrgSlug() !== org) return;
                // Render the resolved state before acting so the aria-live region
                // publishes the completion (found/missing/error) to screen readers.
                // commit() closes the menu without rendering, so a "found" result
                // would otherwise leave the live region stuck at "Checking Sentry…";
                // render() first sets it to "Verified project …", then commit closes.
                render();
                if (res && res.status === "found") commit(res.slug || q, { verified: true });
              });
              // open() (not render()) so the "Checking Sentry…" hint is visible even
              // when this commit came from a closed menu (e.g. Enter after Escape).
              open();
              return;
            }
            // Exact local match or empty box: let Enter bubble to the header handler
            // that applies the typed value.
          } else if (e.key === "Escape") { e.stopPropagation(); close(); }
        });
        // mousedown (not click) so the selection beats the input's blur.
        menu.addEventListener("mousedown", (e) => {
          const el = e.target.closest(".project-ac-item");
          if (!el) return;
          e.preventDefault();
          const idx = Number(el.dataset.idx);
          if (items[idx]) commit(items[idx].value, { verified: !!items[idx].verified });
        });
        input.addEventListener("blur", () => { setTimeout(close, 120); });
      }

      // Ensure the setup-screen project field behaves as an autocomplete. The
      // suggestion list is read live on each open, so no rebuild is needed when
      // the org's projects arrive. Picking a local suggestion just fills the box
      // (the Scan button reads #project-input on submit) — but committing a
      // Sentry-verified off-list slug starts the scan directly, so keyboard-only
      // users aren't trapped re-verifying a project that never joins the local
      // list. submitScan re-reads #project-input, so the committed slug is used.
      function renderSetupProjectField() {
        const el = document.getElementById("project-input");
        if (el) attachProjectAutocomplete(el, null, () => submitScan());
      }

      // Ensure the project control exists in the header and reflects the current
      // project. Renders as an autocomplete combobox (a text input + filtered
      // suggestion menu); picking a suggestion re-scans that project, and a typed
      // value applies via the Fetch button or Enter. Injected client-side when
      // the page first rendered from the org picker (no header controls yet).
      function renderProjectSwitcher() {
        if (!currentOrg) return;
        let controls = document.querySelector(".header-controls");
        if (!controls) {
          const header = document.querySelector(".page-header");
          if (!header) return;
          controls = document.createElement("div");
          controls.className = "header-controls";
          header.appendChild(controls);
        }
        // Org + Project live together in a tight scope cluster, set apart from the
        // time range / re-scan controls.
        let scope = controls.querySelector(".scope-switchers");
        if (!scope) {
          scope = document.createElement("span");
          scope.className = "scope-switchers";
          controls.insertBefore(scope, controls.firstChild);
        }
        let input = document.getElementById("project-switcher");
        if (!input) {
          const label = document.createElement("label");
          label.className = "project-switcher";
          const span = document.createElement("span");
          span.className = "project-switcher-label";
          span.textContent = "Project";
          const wrap = document.createElement("span");
          wrap.className = "project-ac";
          input = document.createElement("input");
          input.id = "project-switcher";
          input.className = "project-select";
          input.setAttribute("role", "combobox");
          input.setAttribute("aria-autocomplete", "list");
          input.setAttribute("aria-expanded", "false");
          input.setAttribute("placeholder", "all projects — type to search");
          input.setAttribute("autocomplete", "off");
          input.setAttribute("autocapitalize", "none");
          input.setAttribute("autocorrect", "off");
          input.setAttribute("spellcheck", "false");
          wrap.appendChild(input);
          const fetchBtn = document.createElement("button");
          fetchBtn.id = "project-fetch";
          fetchBtn.className = "project-fetch-btn";
          fetchBtn.type = "button";
          fetchBtn.title = "Fetch tickets for this project";
          fetchBtn.textContent = "Fetch";
          label.appendChild(span);
          label.appendChild(wrap);
          label.appendChild(fetchBtn);
          scope.insertBefore(label, scope.firstChild);
        }
        // Reflect the current project, but never while the user is editing this
        // field: a streamed project page repaints the switcher (renderProjectSwitcher
        // runs per SSE page), and clobbering the value mid-type would erase an
        // in-progress slug — and with it the query captured for exact-slug
        // resolution, so the first Enter's lookup would be silently dropped by the
        // stale-completion guard. Only sync when the field isn't focused.
        if (document.activeElement !== input) input.value = currentProject || "";
        attachProjectAutocomplete(input, () => fetchScoped());

        // Org control, injected before the project switcher so the header reads
        // Org · Project · Fetch. Shares the project's Fetch button. Renders as a
        // dropdown when 2+ orgs are available (matching the setup screen), else a
        // text input.
        let orgInput = document.getElementById("org-switcher");
        if (!orgInput) {
          const orgLabel = document.createElement("label");
          orgLabel.className = "project-switcher";
          const orgSpan = document.createElement("span");
          orgSpan.className = "project-switcher-label";
          orgSpan.textContent = "Org";
          const orgSlugs = Array.isArray(currentOrgOptions) ? currentOrgOptions.filter(Boolean) : [];
          const slugs = (!currentOrg || orgSlugs.includes(currentOrg)) ? orgSlugs : [currentOrg, ...orgSlugs];
          if (slugs.length >= 2) {
            orgInput = document.createElement("select");
            orgInput.id = "org-switcher";
            orgInput.className = "project-select org-switcher-select";
            orgInput.title = "Sentry organizations you can access";
            slugs.forEach((slug) => {
              const opt = document.createElement("option");
              opt.value = slug;
              opt.textContent = slug;
              if (slug === currentOrg) opt.selected = true;
              orgInput.appendChild(opt);
            });
          } else {
            orgInput = document.createElement("input");
            orgInput.id = "org-switcher";
            orgInput.className = "project-select";
            orgInput.setAttribute("placeholder", "org slug");
            orgInput.setAttribute("autocomplete", "off");
            orgInput.setAttribute("autocapitalize", "none");
            orgInput.setAttribute("autocorrect", "off");
            orgInput.setAttribute("spellcheck", "false");
          }
          orgLabel.appendChild(orgSpan);
          orgLabel.appendChild(orgInput);
          const projectLabel = scope.querySelector(".project-switcher");
          scope.insertBefore(orgLabel, projectLabel || scope.firstChild);
        }
        orgInput.value = currentOrg || "";
      }

      // Ensure the time-window <select> exists in the header (injected client-side
      // when the page first rendered from the org picker) and reflects the current
      // window. Inserted right after the project switcher so the header reads
      // Project · Window · Re-scan.
      function renderPeriodSwitcher() {
        if (!currentOrg) return;
        const controls = document.querySelector(".header-controls");
        if (!controls) return;
        let sel = document.getElementById("period-select");
        if (!sel) {
          const label = document.createElement("label");
          label.className = "period-switcher";
          const span = document.createElement("span");
          span.className = "period-switcher-label";
          span.textContent = "Time range";
          sel = document.createElement("select");
          sel.id = "period-select";
          sel.className = "period-select";
          sel.title = "How far back to search Sentry";
          const list = Array.isArray(currentPeriods) ? currentPeriods : [];
          list.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.value;
            opt.textContent = p.label;
            if (p.value === currentPeriod) opt.selected = true;
            sel.appendChild(opt);
          });
          label.appendChild(span);
          label.appendChild(sel);
          // Anchor after the scope cluster (Org · Project · Fetch) so the header
          // reads scope · Time range · Re-scan.
          const scope = controls.querySelector(".scope-switchers");
          if (scope) {
            const divider = document.createElement("span");
            divider.className = "control-divider";
            divider.setAttribute("aria-hidden", "true");
            controls.insertBefore(divider, scope.nextSibling);
            controls.insertBefore(label, divider.nextSibling);
          } else {
            controls.insertBefore(label, controls.firstChild);
          }
        }
        sel.value = currentPeriod;
      }

      // Canvas-wide raw/plain title toggle. A literal switch that lives above the
      // issue list; this keeps the toggle in sync with state (checkbox + hint).
      function syncTitleSwitch() {
        const box = document.getElementById("title-mode-switch");
        if (box) box.checked = currentPlainEnglishView;
        const state = document.getElementById("title-mode-state");
        if (state) state.textContent = currentPlainEnglishView ? "plain-English summaries" : "raw errors";
      }

      // Flip the whole canvas between raw error and plain-English titles. Optimistic:
      // update locally and re-render every card immediately, then persist so the
      // choice survives re-scans and reloads. Display-only — no re-scan.
      document.addEventListener("change", (e) => {
        const box = e.target.closest("#title-mode-switch");
        if (!box) return;
        currentPlainEnglishView = box.checked;
        syncTitleSwitch();
        renderCategories(currentCategories);
        fetch("/api/toggle-title-mode", { method: "POST" });
      });

      // Re-scan for the current org + project entered in the header. Empty project
      // = all projects; empty org is not allowed (org is required to scan). Shows
      // optimistic scanning state; the server validates unknown slugs. Only ever
      // called from an explicit user action (Fetch button or Enter) — never on
      // blur/typing, so we don't scan until the user asks.
      function fetchScoped() {
        const orgInput = document.getElementById("org-switcher");
        const projectInput = document.getElementById("project-switcher");
        const org = orgInput ? orgInput.value.trim() : currentOrg;
        const project = projectInput ? projectInput.value.trim() : "";
        if (!org) { if (orgInput) orgInput.focus(); return; }
        // Gate: verify a typed project against Sentry before any optimistic update
        // or scan, so the Fetch button and header-Enter can't scan an unverified
        // slug. (The autocomplete's own Enter resolves before committing; this
        // covers the pointer path and Enter on the raw org/project inputs.) An
        // empty project scans all projects and needs no lookup.
        verifyProjectForScan(org, project).then((v) => {
          if (!v.ok) {
            showToast(v.reason === "missing"
              ? "No project \u201C" + project + "\u201D in " + org + " — check the slug."
              : "Couldn't verify that project with Sentry — try again.");
            if (projectInput) projectInput.focus();
            return;
          }
          const proj = v.slug;
          if (projectInput && proj !== project) projectInput.value = proj;
          if (org !== currentOrg || proj !== currentProject) resetPerCardState();
          // Snapshot the last-scanned scope BEFORE the optimistic update so a failed
          // rescan can roll back. Without this, a network/server failure leaves the
          // switchers showing the new org/project while the still-rendered cards
          // belong to the old scope — stale data under a selection we never scanned.
          const prevOrg = currentOrg;
          const prevProject = currentProject;
          const subtitle = document.querySelector(".page-subtitle");
          const prevSubtitle = subtitle ? subtitle.textContent : "";
          currentOrg = org;
          currentProject = proj;
          updateTriageDesc();
          if (subtitle) subtitle.textContent = "Scanning " + (proj || "all projects") + "...";
          showScanOverlay("Scanning " + (proj || "all projects") + "…");
          fetch("/api/set-org", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ org, project: proj })
          }).then((res) => {
            if (!res.ok) throw new Error("set-org " + res.status);
          }).catch(() => {
            // Loopback POST failed (server stopped/rejected, or a transport blip).
            // Roll the optimistic selection back to the last-scanned scope so the
            // switchers stay consistent with the cards still on screen, clear the
            // overlay (which would otherwise linger until its safety timer), and
            // tell the user so they can retry.
            hideScanOverlay();
            currentOrg = prevOrg;
            currentProject = prevProject;
            if (orgInput) orgInput.value = prevOrg;
            if (projectInput) projectInput.value = prevProject;
            updateTriageDesc();
            if (subtitle) subtitle.textContent = prevSubtitle;
            window.alert("Couldn't start the scan — the triage server may have stopped responding. Please try again.");
          });
        });
      }

      // Enter in the org or project input triggers the same fetch as clicking
      // Fetch, so there's still a keyboard path — but nothing fetches on blur or
      // typing.
      document.addEventListener("keydown", (e) => {
        const input = e.target.closest("#project-switcher, #org-switcher");
        if (!input) return;
        if (e.key === "Enter") { e.preventDefault(); fetchScoped(); }
      });

      // Explicit "Fetch" button: the only pointer affordance for re-scanning the
      // entered org + project.
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("#project-fetch");
        if (!btn) return;
        fetchScoped();
      });

      // The header org control is a <select> when 2+ orgs exist; a selection is an
      // explicit action, so re-scan immediately. (The project control is an
      // autocomplete input — it re-scans via its own commit handler, not here.)
      document.addEventListener("change", (e) => {
        const orgSel = e.target.closest("#org-switcher");
        if (orgSel && orgSel.tagName === "SELECT") {
          // A new org invalidates the old project. Clear the project input to all
          // projects and re-scan; also refresh the autocomplete list for the new
          // org (instant from cache, else a loading hint) so it's ready by the time
          // the scan lands. Leave currentProject alone here — fetchScoped commits it
          // from the (now empty) input and snapshots the prior value for rollback,
          // so a failed rescan restores the old project rather than clearing it.
          const projInput = document.getElementById("project-switcher");
          if (projInput) projInput.value = "";
          requestProjectsForOrg(orgSel.value);
          fetchScoped();
        }
      });

      // Changing the time window re-scans over the new period. Native <select>
      // change fires on selection; show the scan overlay optimistically.
      document.addEventListener("change", (e) => {
        const sel = e.target.closest("#period-select");
        if (!sel) return;
        // Snapshot the prior period before the optimistic update so a failed
        // rescan can roll the <select> and state back, keeping the control aligned
        // with the cards still on screen (which belong to the old period).
        const prevPeriod = currentPeriod;
        const subtitle = document.querySelector(".page-subtitle");
        const prevSubtitle = subtitle ? subtitle.textContent : "";
        currentPeriod = sel.value;
        showScanOverlay(currentProject ? "Scanning " + currentProject + "…" : "Scanning all projects…");
        fetch("/api/set-period", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ period: sel.value })
        }).then((res) => {
          if (!res.ok) throw new Error("set-period " + res.status);
        }).catch(() => {
          hideScanOverlay();
          currentPeriod = prevPeriod;
          sel.value = prevPeriod;
          if (subtitle) subtitle.textContent = prevSubtitle;
          window.alert("Couldn't change the time range — the triage server may have stopped responding. Please try again.");
        });
      });

      document.addEventListener("click", (e) => {
        const installBtn = e.target.closest("#install-deps-btn");
        if (installBtn) {
          const statusEl = document.getElementById("gate-install-status");
          installBtn.disabled = true;
          installBtn.textContent = "Installing…";
          if (statusEl) {
            statusEl.style.display = "";
            statusEl.textContent = "Running npm install — this can take a moment…";
          }
          fetch("/api/install-dependencies", { method: "POST" })
            .then((res) => {
              if (!res.ok) throw new Error("install-dependencies " + res.status);
              return res.json();
            })
            .then((data) => {
              if (data && data.connections) {
                currentConnections = data.connections;
                applyConnectionState();
              }
              const stillMissing = data && data.connections && data.connections.sentry && data.connections.sentry.setup === "package-missing";
              if (stillMissing) {
                if (statusEl) {
                  statusEl.textContent = "Install didn't finish — check that npm is available, then try again.";
                }
                installBtn.disabled = false;
                installBtn.textContent = "📦 Install dependencies";
              } else if (statusEl) {
                // applyConnectionState() above already repainted the gate for
                // the fresh connection state — a successful install doesn't
                // always land on the sign-in panel: an existing stored
                // credential can make it immediately reachable (clearing the
                // gate entirely), or the re-probe can hit a transient network
                // blip (landing on the connectivity panel) instead. Announce
                // and focus based on what's actually visible now rather than
                // assuming sign-in is next.
                const sentryConn = (data.connections && data.connections.sentry) || {};
                if (sentryConn.reachable) {
                  showToast("✅ Sentry connected — loading your issues");
                  focusActiveOrgControl();
                } else if (sentryConn.configured) {
                  // configured (has/had a credential) but not reachable and
                  // not package-missing: connectivity panel is now showing.
                  statusEl.textContent = "Installed, but couldn't reach Sentry just now — see details below.";
                  focusConnectionGateLead(sentryConn);
                } else {
                  statusEl.textContent = "Installed. Click below to sign in with Sentry.";
                  // The install panel (and this now-hidden live region) was
                  // just swapped for the sign-in panel, so focus is left on
                  // the now-hidden, disabled install button — silent for a
                  // screen reader user. Move focus to the sign-in button so
                  // they're notified of the next actionable step.
                  const nextBtn = document.getElementById("auth-login-btn");
                  if (nextBtn) nextBtn.focus();
                }
              }
            })
            .catch(() => {
              if (statusEl) statusEl.textContent = "Install failed — the extension server may be unreachable. Please try again.";
              installBtn.disabled = false;
              installBtn.textContent = "📦 Install dependencies";
            });
          return;
        }
        const authBtn = e.target.closest("#auth-login-btn");
        if (authBtn) {
          const statusEl = document.getElementById("gate-auth-status");
          authBtn.disabled = true;
          authBtn.textContent = "Waiting for sign-in…";
          if (statusEl) {
            statusEl.style.display = "";
            statusEl.textContent = "Opening your browser to sign in with Sentry — approve access there, then this will continue automatically.";
          }
          fetch("/api/auth-login", { method: "POST" })
            .then((res) => res.json().then((data) => ({ res, data })))
            .then(({ res, data }) => {
              if (data && data.connections) {
                currentConnections = data.connections;
                applyConnectionState();
              }
              if (!res.ok || (data && data.ok === false)) {
                if (statusEl) {
                  statusEl.textContent = (data && data.error) || "Sign-in didn't complete — please try again.";
                }
                authBtn.disabled = false;
                authBtn.textContent = "🔑 Sign in with Sentry";
                return;
              }
              const stillSignedOut = data && data.connections && data.connections.sentry && !data.connections.sentry.configured;
              if (stillSignedOut) {
                if (statusEl) statusEl.textContent = "Still not signed in — please try again.";
                authBtn.disabled = false;
                authBtn.textContent = "🔑 Sign in with Sentry";
              } else {
                // applyConnectionState() above just hid the entire auth gate
                // (signed in now) — this live region's own node may no longer
                // be in the accessibility tree, and focus is left on the
                // now-hidden, disabled sign-in button. Announce via the
                // always-visible toast instead, and move focus into whatever
                // view is now actually showing (reachable: the org picker;
                // otherwise: the connectivity gate that's left, if any).
                const sentryConn = (data.connections && data.connections.sentry) || {};
                if (sentryConn.reachable) {
                  showToast("✅ Signed in — loading your issues");
                  focusActiveOrgControl();
                } else {
                  showToast("✅ Signed in — checking Sentry connectivity");
                  focusConnectionGateLead(sentryConn);
                }
              }
            })
            .catch(() => {
              if (statusEl) statusEl.textContent = "Sign-in failed — the extension server may be unreachable. Please try again.";
              authBtn.disabled = false;
              authBtn.textContent = "🔑 Sign in with Sentry";
            });
          return;
        }
        const btn = e.target.closest("#refresh, #rescan");
        if (!btn) return;
        const subtitle = document.querySelector(".page-subtitle");
        const prevSubtitle = subtitle ? subtitle.textContent : "";
        if (subtitle) subtitle.textContent = "Scanning Sentry...";
        showScanOverlay(currentProject ? "Scanning " + currentProject + "…" : "Scanning all projects…");
        // Like the org/period rescans, verify the POST was accepted and roll the
        // optimistic overlay back on failure. Fire-and-forget would otherwise leave
        // the blocking overlay up (no SSE update ever arrives to clear it) until the
        // long fallback timer expires when the loopback server is unreachable.
        fetch("/api/refresh", { method: "POST" })
          .then((res) => {
            if (!res.ok) throw new Error("refresh " + res.status);
          })
          .catch(() => {
            hideScanOverlay();
            if (subtitle) subtitle.textContent = prevSubtitle;
            window.alert("Couldn't start a rescan — the triage server may have stopped responding. Please try again.");
          });
      });

      // Both "Create issue" and "Fix with Copilot" optimistically paint their
      // cards as "queued" before the server confirms. If the POST is rejected
      // (loopback server down) or returns non-2xx, no SSE update will ever
      // arrive to correct them, so the cards would sit as "working…" forever.
      // Flip any card still in the optimistic "queued" state to a retryable
      // error; leave cards an SSE update already advanced (working/handed-off/…).
      function failQueuedWork(keys, message) {
        let changed = false;
        keys.forEach((key) => {
          const cur = workByIssue[key];
          if (cur && cur.phase === "queued") {
            workByIssue[key] = { phase: "error", error: message };
            changed = true;
          }
        });
        if (changed) applyWorkStates();
        showToast("⚠️ " + message);
      }

      function postWorkSelected(keys, payload) {
        fetch("/api/work-selected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then((res) => {
          if (!res || !res.ok) {
            const code = res && typeof res.status === "number" ? res.status : "?";
            failQueuedWork(keys, "Couldn't start work (server returned " + code + "). Retry.");
          }
        }).catch(() => {
          failQueuedWork(keys, "Couldn't reach the local canvas server. Retry.");
        });
      }

      document.addEventListener("click", (e) => {
        const btn = e.target.closest("#work-selected");
        if (!btn || selectedKeys.size === 0) return;
        const keys = startableSelectedKeys();
        if (keys.length === 0) return;
        keys.forEach((key) => {
          workByIssue[key] = { phase: "queued" };
          selectedKeys.delete(key);
        });
        applySelections();
        applyWorkStates();
        showToast("📝 Filing tracking issues for " + keys.length + " issues…");
        postWorkSelected(keys, { keys, modelByKey: {}, assignCopilot: false });
      });

      document.addEventListener("click", (e) => {
        const btn = e.target.closest("#fix-with-copilot");
        if (!btn || selectedKeys.size === 0) return;
        const keys = startableSelectedKeys();
        if (keys.length === 0) return;
        const models = {};
        keys.forEach((key) => {
          if (modelByKey[key]) models[key] = modelByKey[key];
          workByIssue[key] = { phase: "queued" };
          selectedKeys.delete(key);
        });
        applySelections();
        applyWorkStates();
        showToast("🔧 Creating/reusing issues and starting Copilot for " + keys.length + " issues…");
        postWorkSelected(keys, { keys, modelByKey: models, assignCopilot: true });
      });

      document.addEventListener("click", (e) => {
        const btn = e.target.closest("#toggle-pr-settings");
        if (!btn) return;
        fetch("/api/toggle-pr-settings", { method: "POST" });
      });

      document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "pr-mode") updateModeHint();
      });

      document.addEventListener("click", (e) => {
        const btn = e.target.closest("#save-pr-config");
        if (!btn) return;
        const payload = {
          mode: document.getElementById("pr-mode")?.value || "local",
          model: document.getElementById("toolbar-model")?.value || "",
          localPath: document.getElementById("local-path")?.value || "",
          localBranch: document.getElementById("local-branch")?.value || "",
          cloudRepo: document.getElementById("cloud-repo")?.value || "",
          cloudBranch: document.getElementById("cloud-branch")?.value || "",
        };
        const workBtn = document.getElementById("work-selected");
        const fixBtn = document.getElementById("fix-with-copilot");
        // Block the save button + both work actions until the write settles, so a
        // user can't click "Fix with Copilot" and start work against the previous
        // repo/path/branch while this POST is still in flight.
        btn.disabled = true;
        if (workBtn) workBtn.disabled = true;
        if (fixBtn) fixBtn.disabled = true;
        fetch("/api/set-pr-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            showToast("Saved draft PR config");
          })
          .catch(() => { showToast("Couldn't save draft PR config — check your targets and try again"); })
          .finally(() => {
            btn.disabled = false;
            // Restore the work actions from the live selection (not a pre-save
            // snapshot) so any selection change during the save is reflected.
            updateBulkToolbar();
          });
      });

      document.addEventListener("change", (e) => {
        const issueCheck = e.target.closest(".issue-check");
        if (issueCheck) {
          const key = issueCheck.dataset.key;
          if (!key) return;
          if (issueCheck.checked) selectedKeys.add(key);
          else selectedKeys.delete(key);
          syncCardModels();
          updateCategorySelectAllState();
          updateBulkToolbar();
          return;
        }

        const cardModel = e.target.closest(".card-model");
        if (cardModel) {
          const key = cardModel.dataset.key;
          if (!key) return;
          if (cardModel.value) modelByKey[key] = cardModel.value;
          else delete modelByKey[key];
          renderTargetSummary();
          return;
        }

        if (e.target && e.target.id === "toolbar-model") {
          const value = e.target.value || "";
          if (currentPrTargets) currentPrTargets.model = value;
          renderTargetSummary();
          fetch("/api/set-pr-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: value })
          });
          return;
        }

        const categoryCheck = e.target.closest(".category-check");
        if (categoryCheck) {
          const categoryId = categoryCheck.dataset.category;
          if (!categoryId) return;
          const section = document.querySelector('.category[data-category="' + categoryId + '"]');
          if (!section) return;
          section.querySelectorAll(".issue-check").forEach((box) => {
            box.checked = categoryCheck.checked;
            if (categoryCheck.checked) selectedKeys.add(box.dataset.key);
            else selectedKeys.delete(box.dataset.key);
          });
          syncCardModels();
          updateCategorySelectAllState();
          updateBulkToolbar();
          return;
        }

        const trackerSelect = e.target.closest("#tracker-select");
        if (trackerSelect) {
          fetch("/api/select-tracker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tracker: trackerSelect.value })
          });
          return;
        }
      });

      function showToast(msg) {
        const toast = document.getElementById("toast");
        // Make the polite live region visible first, then set its text, so the
        // text change happens while the region is present and screen readers
        // announce it. Clear any prior hide timer so a rapid second toast still
        // announces and stays up its full duration.
        toast.style.display = "block";
        toast.textContent = msg;
        if (toast._hideTimer) clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => { toast.style.display = "none"; }, 3000);
      }

      let scanOverlayTimer = null;
      function showScanOverlay(label) {
        const overlay = document.getElementById("scan-overlay");
        if (!overlay) return;
        const text = document.getElementById("scan-overlay-text");
        if (text) text.textContent = label || "Scanning…";
        overlay.style.display = "flex";
        // Safety valve: never trap the user behind the overlay if a stop signal
        // is somehow missed. Slightly longer than the scan's server-side timeout.
        if (scanOverlayTimer) clearTimeout(scanOverlayTimer);
        scanOverlayTimer = setTimeout(hideScanOverlay, 250000);
      }
      function hideScanOverlay() {
        const overlay = document.getElementById("scan-overlay");
        if (overlay) overlay.style.display = "none";
        if (scanOverlayTimer) { clearTimeout(scanOverlayTimer); scanOverlayTimer = null; }
      }

      function getOrCreateSubtitle() {
        let subtitle = document.querySelector(".page-subtitle");
        if (!subtitle) {
          subtitle = document.createElement("p");
          subtitle.className = "page-subtitle";
          const desc = document.getElementById("triage-desc") || document.querySelector(".page-description");
          if (desc) desc.after(subtitle);
          else document.querySelector(".page-header").after(subtitle);
        }
        return subtitle;
      }

      // KEEP IN SYNC with scannedLabel/subtitleText/emptyText in page.mjs (server
      // render). Same wording so the first paint and SSE re-renders never disagree.
      function scannedLabelClient(total, capped) {
        return capped ? String(total) + "+" : String(total);
      }
      function subtitleTextClient(shown) {
        const total = currentScannedTotal;
        if (total > shown) {
          return "Top " + shown + " of " + scannedLabelClient(total, currentScannedCapped) +
            " open issues, prioritized by impact";
        }
        return shown + " open issue" + (shown === 1 ? "" : "s") + " to triage";
      }
      function emptyTextClient() {
        const total = currentScannedTotal;
        const where = currentProject ? " for " + currentProject : "";
        if (total > 0) {
          return "✓ Scanned " + scannedLabelClient(total, currentScannedCapped) + " open issue" +
            (total === 1 ? "" : "s") + where + " — none are urgent enough to surface right now.";
        }
        const older = currentScannedOlder;
        if (older > 0) {
          const one = older === 1 && !currentScannedOlderCapped;
          return "✓ No open issues" + where + " in this window — Sentry has " +
            scannedLabelClient(older, currentScannedOlderCapped) + " unresolved issue" +
            (one ? "" : "s") + " in the last 90 days.";
        }
        return "✓ No open issues" + where + " in this window.";
      }

      function renderCategories(categories) {
        const main = document.getElementById("categories");
        const total = categories.reduce((s, c) => s + c.issues.length, 0);

        // On the setup screen (no org chosen yet) an empty scan result is not a
        // real "all clear" — it's just the pre-scan snapshot. Keep the empty
        // state hidden so it never competes with the setup instructions.
        if (!currentOrg) {
          const emptyState = document.getElementById("empty-state");
          if (emptyState) emptyState.style.display = "none";
          if (main) main.innerHTML = "";
          updateToolbarVisibility(false);
          return;
        }

        if (total === 0) {
          main.innerHTML = "";
          getOrCreateSubtitle().style.display = "none";
          updateToolbarVisibility(false);
          const emptyState = document.getElementById("empty-state");
          const emptyMsg = document.getElementById("empty-msg");
          const emptyTips = document.getElementById("empty-tips");
          if (emptyMsg) {
            if (currentScanError) {
              emptyMsg.textContent = "⚠️ " + currentScanError;
              emptyState.classList.add("empty-state-error");
              if (emptyTips) emptyTips.style.display = "none";
            } else {
              emptyMsg.textContent = emptyTextClient();
              emptyState.classList.remove("empty-state-error");
              if (emptyTips) emptyTips.style.display = "";
            }
          }
          emptyState.style.display = "flex";
          applySelections();
          return;
        }

        const subtitle = getOrCreateSubtitle();
        subtitle.textContent = subtitleTextClient(total) + (currentProject ? "" : " · all projects");
        subtitle.style.display = "";
        document.getElementById("empty-state").style.display = "none";
        updateToolbarVisibility(true);

        main.innerHTML = categories
          .filter((c) => c.issues.length > 0)
          .map((c) => categoryHTML(c))
          .join("");

        applySelections();
        applyWorkStates();
      }

      const CATEGORY_DESCRIPTIONS = {
        "regressions": "Issues that previously existed, were resolved, and have resurfaced — likely tied to a recent release.",
        "escalating": "Issues Sentry flagged as escalating, plus older high-impact issues affecting many users or generating many events.",
        "new-critical": "Brand new issues that have already hit multiple users within hours of first appearing."
      };

      function categoryHTML(cat) {
        const desc = CATEGORY_DESCRIPTIONS[cat.id] || "";
        return '<section class="category" data-category="' + escapeHtml(cat.id) + '">'
          + '<div class="category-header"><h2>' + escapeHtml(cat.name) + ' <span class="badge">' + cat.issues.length + '</span></h2>'
          + '<label class="category-select-all"><input type="checkbox" class="category-check" data-category="' + escapeHtml(cat.id) + '" /> Select all</label>'
          + (desc ? '<p class="category-description">' + desc + '</p>' : '')
          + '</div>'
          + '<div class="card-list">' + cat.issues.map(cardHTML).join("") + '</div>'
          + '</section>';
      }

      function cardModelOptionsHtml(selected) {
        const models = Array.isArray(currentAvailableModels) ? currentAvailableModels : [];
        const nonDefault = models.filter((model) => model.id);
        const chosen = selected || "";
        const opts = ['<option value=""' + (chosen ? '' : ' selected') + '>Default</option>'];
        nonDefault.forEach((model) => {
          opts.push('<option value="' + escapeHtml(model.id) + '"' + (model.id === chosen ? ' selected' : '') + '>' + escapeHtml(model.label) + '</option>');
        });
        return opts.join("");
      }

      function cardHTML(issue) {
        const href = safeHref(issue.url);
        const key = escapeHtml(issue.key);
        const meta = [
          issue.events != null ? Number(issue.events).toLocaleString() + " events" : null,
          issue.users != null ? Number(issue.users).toLocaleString() + " users" : null
        ].filter(Boolean).join(" · ");

        const workStatus = workByIssue[issue.key];
        const workText = workStatusHtml(workStatus);
        const workClass = statusClass(workStatus);
        const modelSelected = modelByKey[issue.key] || "";

        return '<div class="card" data-key="' + key + '">'
          + '<label class="card-checkbox" title="Select this issue"><input type="checkbox" class="issue-check" data-key="' + key + '" aria-label="Select issue ' + key + '" /></label>'
          + '<div class="card-link">'
          + '<div class="card-header">'
          + '<a href="' + href + '" target="_blank" rel="noopener noreferrer" class="card-key">' + key + '</a>'
          + '<span class="card-summary">' + escapeHtml(currentPlainEnglishView ? (issue.plainEnglish || issue.summary) : issue.summary) + '</span>'
          + '</div>'
          + '<span class="card-reason">' + escapeHtml(issue.reason) + '</span>'
          + (meta ? '<span class="card-meta">' + meta + '</span>' : '')
          + '<span class="card-work-status ' + workClass + '" data-key="' + key + '"' + (workText ? '' : ' style="display:none;"') + '>' + workText + '</span>'
          + relatedHintHtml(issue)
          + '</div>'
          + '<label class="card-model-wrap" data-key="' + key + '" style="display:none;" title="Model for this issue&#39;s fix session — Default uses the model chosen above the list">'
          + '<span class="card-model-label">Model</span>'
          + '<select class="card-model" data-key="' + key + '">' + cardModelOptionsHtml(modelSelected) + '</select>'
          + '</label>'
          + '</div>';
      }
    </script>
  </body>
</html>`
}
