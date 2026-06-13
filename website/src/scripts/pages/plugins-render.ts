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

function getStableAccent(item: RenderablePlugin): string {
  const accents = ['purple', 'blue', 'green', 'yellow'];
  let hash = 0;
  for (const char of item.path || item.name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return accents[hash % accents.length];
}

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
    return plugin.source.path && plugin.source.path !== '/' ? `${base}/tree/main/${plugin.source.path}` : base;
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
        ? '<span>External</span>'
        : `<span>${item.itemCount} items</span>`;
      const authorTag =
        isExternal && item.author?.name
          ? `<span>by ${escapeHtml(item.author.name)}</span>`
          : '';
      const githubHref = isExternal
        ? escapeHtml(getExternalPluginUrl(item))
        : getGitHubUrl(item.path);
      return `
        <article class="resource-item resource-card resource-card--${getStableAccent(item)}${isExternal ? ' resource-item-external' : ''}" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-card__preview resource-preview">
            <div class="resource-card__topline">
              <span class="badge badge--yellow">${isExternal ? 'external plugin' : 'plugin'}</span>
            </div>
            <div class="resource-card__body">
              <h2 class="resource-card__title">${escapeHtml(item.name)}</h2>
              <p class="resource-card__description">${escapeHtml(item.description || 'No description')}</p>
              <div class="resource-card__tags resource-meta">
                ${metaTag}
                ${authorTag}
                ${item.tags?.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('') || ''}
                ${item.tags && item.tags.length > 4 ? `<span>+${item.tags.length - 4} more</span>` : ''}
              </div>
            </div>
          </button>
          <div class="resource-card__footer resource-actions">
            <a href="${githubHref}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="${isExternal ? 'View repository' : 'View on GitHub'}">${isExternal ? 'Repository' : 'GitHub'}</a>
          </div>
        </article>
      `;
    })
    .join('');
}
