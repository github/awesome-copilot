import { escapeHtml, safeHref } from '../escape.mjs'

function statusLabel(workStatus) {
  if (!workStatus || typeof workStatus !== 'object') return ''
  if (workStatus.phase === 'working' || workStatus.phase === 'queued') return '⏳ working…'
  if (workStatus.phase === 'done') {
    // Numbers move into clickable links (statusLinks); keep the label a plain badge.
    return 'created ✓'
  }
  if (workStatus.phase === 'handed-off') {
    const sessionPart = workStatus.sessionName ? `🧵 ${workStatus.sessionName}` : '🧵 session started'
    return `${sessionPart} ↗`
  }
  if (workStatus.phase === 'skipped') return '🔒 already being worked on'
  if (workStatus.phase === 'tracked') return '👀 Tracked'
  if (workStatus.phase === 'error') return `⚠️ ${workStatus.error || 'work failed'}`
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

export function Card({ key, summary, plainEnglish, reason, events, users, url, workStatus, plainEnglishView, availableModels = [] }) {
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
    events != null ? `${Number(events).toLocaleString()} events` : null,
    users != null ? `${Number(users).toLocaleString()} users` : null
  ].filter(Boolean).join(' · ')

  // Per-card model override. Empty value means "use the toolbar/batch default".
  const cardModelOptions = ['<option value="">Default</option>']
    .concat(
      (Array.isArray(availableModels) ? availableModels : [])
        .filter((model) => model && model.id)
        .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`)
    )
    .join('')

  return `<div class="card" data-key="${safeKey}">
    <label class="card-checkbox" title="Select this issue">
      <input type="checkbox" class="issue-check" data-key="${safeKey}" aria-label="Select issue ${safeKey}" />
    </label>
    <div class="card-link">
      <div class="card-header">
        <a href="${href}" target="_blank" rel="noopener noreferrer" class="card-key">${safeKey}</a>
        <span class="card-summary">${escapeHtml(title)}</span>
      </div>
      <span class="card-reason">${escapeHtml(reason)}</span>
      ${meta ? `<span class="card-meta">${meta}</span>` : ''}
      <span class="card-work-status ${statusClass}" data-key="${safeKey}" ${status ? '' : 'style="display:none;"'}>
        ${escapeHtml(status)}
        ${links ? `<span class="card-work-links">${links}</span>` : ''}
      </span>
    </div>
    <label class="card-model-wrap" data-key="${safeKey}" style="display:none;" title="Model for this issue's fix session — Default uses the model chosen above the list">
      <span class="card-model-label">Model</span>
      <select class="card-model" data-key="${safeKey}">${cardModelOptions}</select>
    </label>
  </div>`
}
