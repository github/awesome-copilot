import {
  escapeHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from '../utils';
import { renderEmptyStateHtml, renderSharedCardHtml } from './card-render';

export interface RenderableInstruction {
  id: string;
  title: string;
  description?: string;
  path: string;
  applyTo?: string | string[] | null;
  extensions?: string[];
  lastUpdated?: string | null;
}

export type InstructionSortOption = 'title' | 'lastUpdated';

/**
 * Build the URL of an instruction's dedicated detail page.
 */
export function getInstructionDetailUrl(id: string): string {
  return `/instruction/${id}/`;
}

export function sortInstructions<T extends RenderableInstruction>(
  items: T[],
  sort: InstructionSortOption
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

export function renderInstructionsHtml(
  items: RenderableInstruction[]
): string {
  if (items.length === 0) {
    return renderEmptyStateHtml('No instructions found', 'Try adjusting the selected filters.');
  }

  return items
    .map((item) => {
      const applyToText = Array.isArray(item.applyTo)
        ? item.applyTo.join(', ')
        : item.applyTo;

      const metaHtml = `
        ${applyToText ? `<span class="resource-tag">applies to: ${escapeHtml(applyToText)}</span>` : ''}
        ${item.extensions?.slice(0, 4).map((extension) => `<span class="resource-tag tag-extension">${escapeHtml(extension)}</span>`).join('') || ''}
        ${item.extensions && item.extensions.length > 4 ? `<span class="resource-tag">+${item.extensions.length - 4} more</span>` : ''}
        ${getLastUpdatedHtml(item.lastUpdated)}
      `;

      const actionsHtml = `
        ${getInstallDropdownHtml('instructions', item.path, true)}
        <button class="btn btn-secondary btn-small action-download" data-path="${escapeHtml(
          item.path
        )}" title="Download file">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/>
          </svg>
        </button>
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
          GitHub
        </a>
      `;

      return renderSharedCardHtml({
        title: item.title,
        description: item.description || 'No description',
        href: getInstructionDetailUrl(item.id),
        articleAttributes: {
          'data-path': item.path,
        },
        metaHtml,
        actionsHtml,
      });
    })
    .join('');
}
