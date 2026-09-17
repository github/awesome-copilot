import { Card } from './card.mjs'
import { escapeHtml } from '../escape.mjs'

const CATEGORY_DESCRIPTIONS = {
  'regressions': 'Issues that previously existed, were resolved, and have resurfaced — likely tied to a recent release.',
  'escalating': 'Issues Sentry flagged as escalating, plus older high-impact issues affecting many users or generating many events.',
  'new-critical': 'Brand new issues that have already hit multiple users within hours of first appearing.'
}

export function Category({ id, name, issues, plainEnglishView, availableModels = [] }) {
  if (!issues.length) return ''

  const description = CATEGORY_DESCRIPTIONS[id] || ''
  const safeId = escapeHtml(id)

  return `<section class="category" data-category="${safeId}">
    <div class="category-header">
      <h2>${escapeHtml(name)} <span class="badge">${issues.length}</span></h2>
      <label class="category-select-all">
        <input type="checkbox" class="category-check" data-category="${safeId}" />
        Select all
      </label>
      ${description ? `<p class="category-description">${description}</p>` : ''}
    </div>
    <div class="card-list">
      ${issues.map((issue) => Card({ ...issue, plainEnglishView, availableModels })).join('')}
    </div>
  </section>`
}
