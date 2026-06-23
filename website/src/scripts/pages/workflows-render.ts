import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from '../utils';

export interface RenderableWorkflow {
  title: string;
  description?: string;
  path: string;
  triggers: string[];
  lastUpdated?: string | null;
}

export type WorkflowSortOption = 'title' | 'lastUpdated';

function getStableAccent(item: RenderableWorkflow): string {
  const accents = ['purple', 'blue', 'green', 'yellow'];
  let hash = 0;
  for (const char of item.path || item.title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return accents[hash % accents.length];
}

export function sortWorkflows<T extends RenderableWorkflow>(
  items: T[],
  sort: WorkflowSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'lastUpdated') {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.title.localeCompare(b.title);
  });
}

export function renderWorkflowsHtml(
  items: RenderableWorkflow[]
): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No workflows found</h3>
        <p>Try adjusting the selected filters.</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      return `
        <article class="resource-item resource-card resource-card--${getStableAccent(item)}" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-card__preview resource-preview" aria-label="Preview ${escapeHtml(item.title)}">
            <div class="resource-card__topline">
              <span class="badge badge--purple">workflow</span>
            </div>
            <div class="resource-card__body">
              <h2 class="resource-card__title">${escapeHtml(item.title)}</h2>
              <p class="resource-card__description">${escapeHtml(item.description || 'No description')}</p>
              <div class="resource-card__tags resource-meta">
                ${item.triggers.map((trigger) => `<span>${escapeHtml(trigger)}</span>`).join('')}
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-card__footer resource-actions">
            ${getActionButtonsHtml(item.path)}
            <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
          </div>
        </article>
      `;
    })
    .join('');
}
