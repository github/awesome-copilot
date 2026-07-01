import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from '../utils';
import { renderEmptyStateHtml, renderSharedCardHtml } from './card-render';

export interface RenderableWorkflow {
  title: string;
  description?: string;
  path: string;
  triggers: string[];
  lastUpdated?: string | null;
}

export type WorkflowSortOption = 'title' | 'lastUpdated';

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
    return renderEmptyStateHtml('No workflows found', 'Try adjusting the selected filters.');
  }

  return items
    .map((item) => {
      const metaHtml = `
        ${item.triggers
          .map((trigger) => `<span class="resource-tag tag-trigger">${escapeHtml(trigger)}</span>`)
          .join('')}
        ${getLastUpdatedHtml(item.lastUpdated)}
      `;

      const actionsHtml = `
        ${getActionButtonsHtml(item.path)}
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
      `;

      return renderSharedCardHtml({
        title: item.title,
        description: item.description || 'No description',
        articleAttributes: {
          'data-path': item.path,
        },
        metaHtml,
        actionsHtml,
      });
    })
    .join('');
}
