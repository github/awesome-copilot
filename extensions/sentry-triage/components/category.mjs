import { Card } from './card.mjs'
import { escapeHtml } from '../escape.mjs'

// KEEP IN SYNC with ISSUE_TABS in page.mjs's client script.
export const ISSUE_TABS = [
  { id: 'regressions', label: 'Regressions' },
  { id: 'escalating', label: 'Escalating' },
  { id: 'new-critical', label: 'New' },
]

export function IssueTable({ categories, plainEnglishView, availableModels = [] }) {
  const total = categories.reduce((sum, c) => sum + c.issues.length, 0)
  if (!total) return ''

  const countFor = (id) => categories.filter((c) => c.id === id).reduce((sum, c) => sum + c.issues.length, 0)
  const labelFor = (id) => (ISSUE_TABS.find((t) => t.id === id) || {}).label || id
  const tab = (id, label, count) =>
    `<button type="button" role="tab" class="issue-tab" data-tab="${escapeHtml(id)}" aria-selected="${id === 'all'}"${count ? '' : ' disabled'}>${escapeHtml(label)} <span class="badge">${count}</span></button>`

  const rows = categories.flatMap((c) =>
    c.issues.map((issue) => Card({ ...issue, category: c.id, categoryLabel: labelFor(c.id), plainEnglishView, availableModels }))
  )

  return `<section class="issue-table" data-tab="all">
    <div class="issue-tabs">
      <label class="category-select-all" title="Select all">
        <input type="checkbox" class="category-check" aria-label="Select all visible issues" />
      </label>
      <div class="issue-tablist" role="tablist" aria-label="Filter issues">
        ${tab('all', 'View all', total)}
        ${ISSUE_TABS.map((t) => tab(t.id, t.label, countFor(t.id))).join('')}
      </div>
    </div>
    <div class="card-list" role="tabpanel">
      ${rows.join('')}
    </div>
  </section>`
}
