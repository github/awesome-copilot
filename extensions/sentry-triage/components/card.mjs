import { escapeHtml, safeHref } from '../escape.mjs'

// KEEP IN SYNC with compactNumber in page.mjs's client script.
function compactNumber(value) {
  const n = Number(value) || 0
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'
  if (n >= 1e4) return Math.round(n / 1e3) + 'k'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

function statusLabel(workStatus) {
  if (!workStatus || typeof workStatus !== 'object') return ''
  if (workStatus.phase === 'working' || workStatus.phase === 'queued') {
    return workStatus.copilotFix ? 'Starting Copilot fix…' : 'Filing tracking issue…'
  }
  if (workStatus.phase === 'done') {
    // Numbers move into clickable links (statusLinks); keep the label a plain badge.
    return 'Created'
  }
  if (workStatus.phase === 'handed-off') {
    const sessionPart = workStatus.sessionName ? workStatus.sessionName : 'Session started'
    return `${sessionPart} ↗`
  }
  if (workStatus.phase === 'skipped') return 'Already in progress'
  if (workStatus.phase === 'tracked') return 'Tracked'
  if (workStatus.phase === 'error') return workStatus.error || 'Work failed'
  return ''
}

function stateSuffix(stateStr) {
  const s = typeof stateStr === 'string' ? stateStr.trim().toLowerCase() : ''
  return s ? ` (${s})` : ''
}

function linkOrText(url, label) {
  return url
    ? `<a href="${safeHref(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    : `<span>${escapeHtml(label)}</span>`
}

function statusLinks(workStatus) {
  if (!workStatus || typeof workStatus !== 'object') return ''
  const links = []
  const phase = workStatus.phase
  // Freshly created artifacts (done / handed-off): link the new issue and PR the
  // same way tracked/skipped link their existing ones, so the numbers are clickable.
  if (phase === 'done' || phase === 'handed-off') {
    if (workStatus.issueUrl || workStatus.issueNumber) {
      const base = workStatus.issueNumber ? `issue #${workStatus.issueNumber}` : 'issue created'
      links.push(linkOrText(workStatus.issueUrl, base))
    }
    if ((phase === 'done' || phase === 'handed-off') && (workStatus.prUrl || workStatus.prNumber)) {
      const base = workStatus.prNumber ? `PR #${workStatus.prNumber}` : 'PR opened'
      const label = `${base}${stateSuffix(workStatus.prState)}`
      links.push(linkOrText(workStatus.prUrl, label))
    }
  }
  if (workStatus.existingIssueUrl) {
    const base = workStatus.existingIssueNumber ? `issue #${workStatus.existingIssueNumber}` : 'existing issue'
    const label = `${base}${stateSuffix(workStatus.existingIssueState)}`
    links.push(linkOrText(workStatus.existingIssueUrl, label))
  }
  if (workStatus.existingPrUrl) {
    const base = workStatus.existingPrNumber ? `PR #${workStatus.existingPrNumber}` : 'existing PR'
    const label = `${base}${stateSuffix(workStatus.existingPrState)}`
    links.push(linkOrText(workStatus.existingPrUrl, label))
  }
  return links.join(' · ')
}

// KEEP IN SYNC with sparklineSvg in page.mjs's client script.
function sparklineSvg(trend) {
  const values = (Array.isArray(trend) ? trend : []).map((v) => Number(v) || 0)
  if (values.length < 2) return ''
  const w = 72, h = 24, max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`)
  return `<svg class="card-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Event trend" preserveAspectRatio="none"><polygon class="card-spark-fill" points="0,${h} ${pts.join(' ')} ${w},${h}" /><polyline class="card-spark-line" points="${pts.join(' ')}" /></svg>`
}

function trendAttrs(trend, trendStart, trendStep) {
  const values = (Array.isArray(trend) ? trend : []).map((v) => Number(v) || 0)
  return values.length ? ` data-trend="${values.join(',')}" data-trend-start="${Number(trendStart) || 0}" data-trend-step="${Number(trendStep) || 0}"` : ''
}

export function Card({ key, category, categoryLabel, summary, plainEnglish, reason, events, users, url, workStatus, plainEnglishView, availableModels = [], trend, trendStart, trendStep }) {
  const href = safeHref(url)
  const safeKey = escapeHtml(key)
  const title = plainEnglishView ? (plainEnglish || summary) : summary
  const status = statusLabel(workStatus)
  const links = statusLinks(workStatus)
  const statusClass = workStatus?.phase === 'done'
    ? 'done'
    : workStatus?.phase === 'handed-off'
      ? 'handed-off'
    : workStatus?.phase === 'skipped'
      ? 'skipped'
    : workStatus?.phase === 'tracked'
      ? 'tracked'
    : workStatus?.phase === 'error'
      ? 'error'
      : workStatus?.phase === 'working' || workStatus?.phase === 'queued'
        ? 'working'
        : 'idle'
  const meta = [
    sparklineSvg(trend) || null,
    events != null ? `<span class="metric metric-events" title="${Number(events).toLocaleString()} events"><b>${compactNumber(events)}</b><small>events</small></span>` : null,
    users != null ? `<span class="metric metric-users" title="${Number(users).toLocaleString()} users"><b>${compactNumber(users)}</b><small>users</small></span>` : null
  ].filter(Boolean).join('')

  // Per-card model override. Empty value means "use the toolbar/batch default".
  const cardModelOptions = ['<option value="">Default</option>']
    .concat(
      (Array.isArray(availableModels) ? availableModels : [])
        .filter((model) => model && model.id)
        .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`)
    )
    .join('')

  return `<div class="card" data-key="${safeKey}"${category ? ` data-category="${escapeHtml(category)}"` : ''} data-title="${escapeHtml(summary)}" data-events="${Number(events) || 0}" data-users="${Number(users) || 0}"${trendAttrs(trend, trendStart, trendStep)}>
    <label class="card-checkbox" title="Select this issue">
      <input type="checkbox" class="issue-check" data-key="${safeKey}" aria-label="Select issue ${safeKey}" />
    </label>
    <div class="card-link">
      <button type="button" class="card-summary card-open" data-key="${safeKey}" title="View issue details">${escapeHtml(title)}</button>
      <span class="card-sub">${categoryLabel ? `<span class="card-cat">${escapeHtml(categoryLabel)}</span>` : ''}<a href="${href}" target="_blank" rel="noopener noreferrer" class="card-key" title="Open in Sentry">${safeKey}</a><span class="card-reason">${escapeHtml(reason)}</span></span>
      <span class="card-work-status ${statusClass}" data-key="${safeKey}" ${status ? '' : 'style="display:none;"'}>
        ${escapeHtml(status)}
        ${links ? `<span class="card-work-links">${links}</span>` : ''}
      </span>
    </div>
    ${meta ? `<span class="card-meta">${meta}</span>` : ''}
    <label class="card-model-wrap" data-key="${safeKey}" style="display:none;" title="Model for this issue's fix session — Default uses the model chosen above the list">
      <span class="card-model-label">Model</span>
      <select class="card-model" data-key="${safeKey}">${cardModelOptions}</select>
    </label>
  </div>`
}
