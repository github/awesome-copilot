import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from '../utils';
import { renderEmptyStateHtml, renderSharedCardHtml } from './card-render';

export interface RenderableInstruction {
  title: string;
  description?: string;
  path: string;
  applyTo?: string | string[] | null;
  extensions?: string[];
  lastUpdated?: string | null;
}

export type InstructionSortOption = 'title' | 'lastUpdated';

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
        ${getActionButtonsHtml(item.path, true)}
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
          GitHub
        </a>
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
