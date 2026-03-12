import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from '../utils';

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
  items: RenderableInstruction[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = '', highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No instructions found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      const applyToText = Array.isArray(item.applyTo)
        ? item.applyTo.join(', ')
        : item.applyTo;
      const titleHtml =
        query && highlightTitle
          ? highlightTitle(item.title, query)
          : escapeHtml(item.title);

      return `
        <article class="resource-item" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${titleHtml}</div>
              <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
              <div class="resource-meta">
                ${applyToText ? `<span class="resource-tag">applies to: ${escapeHtml(applyToText)}</span>` : ''}
                ${item.extensions?.slice(0, 4).map((extension) => `<span class="resource-tag tag-extension">${escapeHtml(extension)}</span>`).join('') || ''}
                ${item.extensions && item.extensions.length > 4 ? `<span class="resource-tag">+${item.extensions.length - 4} more</span>` : ''}
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            ${getInstallDropdownHtml('instructions', item.path, true)}
            ${getActionButtonsHtml(item.path, true)}
            <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
              GitHub
            </a>
          </div>
        </article>
      `;
    })
    .join('');
}
