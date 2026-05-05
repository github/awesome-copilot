import {
  escapeHtml,
  getGitHubUrl,
  sanitizeUrl,
} from '../utils';

interface PluginAuthor {
  name: string;
  url?: string;
}

interface PluginSource {
  source: string;
  repo?: string;
  path?: string;
}

export interface RenderablePlugin {
  name: string;
  description?: string;
  path: string;
  tags?: string[];
  itemCount: number;
  lastUpdated?: string | null;
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  author?: PluginAuthor | null;
  source?: PluginSource | null;
}

export type PluginSortOption = 'title' | 'lastUpdated';

export function sortPlugins<T extends RenderablePlugin>(
  items: T[],
  sort: PluginSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'lastUpdated') {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.name.localeCompare(b.name);
  });
}

function getExternalPluginUrl(plugin: RenderablePlugin): string {
  if (plugin.source?.source === 'github' && plugin.source.repo) {
    const base = `https://github.com/${plugin.source.repo}`;
    return plugin.source.path ? `${base}/tree/main/${plugin.source.path}` : base;
  }

  return sanitizeUrl(plugin.repository || plugin.homepage);
}

export function renderPluginsHtml(items: RenderablePlugin[]): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No plugins found</h3>
        <p>Try different tags or clear the current filters</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      const isExternal = item.external === true;
      const metaTag = isExternal
        ? '<span class="resource-tag resource-tag-external">🔗 External</span>'
        : `<span class="resource-tag">${item.itemCount} items</span>`;
      const authorTag =
        isExternal && item.author?.name
          ? `<span class="resource-tag">by ${escapeHtml(item.author.name)}</span>`
          : '';
      const githubHref = isExternal
        ? escapeHtml(getExternalPluginUrl(item))
        : getGitHubUrl(item.path);
      return `
        <article class="resource-item${isExternal ? ' resource-item-external' : ''}" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${escapeHtml(item.name)}</div>
              <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
              <div class="resource-meta">
                ${metaTag}
                ${authorTag}
                ${item.tags?.slice(0, 4).map((tag) => `<span class="resource-tag">${escapeHtml(tag)}</span>`).join('') || ''}
                ${item.tags && item.tags.length > 4 ? `<span class="resource-tag">+${item.tags.length - 4} more</span>` : ''}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            <a href="${githubHref}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="${isExternal ? 'View repository' : 'View on GitHub'}">${isExternal ? 'Repository' : 'GitHub'}</a>
          </div>
        </article>
      `;
    })
    .join('');
}
