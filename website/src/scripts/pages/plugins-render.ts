import { escapeHtml, getGitHubUrl, sanitizeUrl } from '../utils';

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
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  author?: PluginAuthor | null;
  source?: PluginSource | null;
}

function getExternalPluginUrl(plugin: RenderablePlugin): string {
  if (plugin.source?.source === 'github' && plugin.source.repo) {
    const base = `https://github.com/${plugin.source.repo}`;
    return plugin.source.path ? `${base}/tree/main/${plugin.source.path}` : base;
  }

  return sanitizeUrl(plugin.repository || plugin.homepage);
}

export function renderPluginsHtml(
  items: RenderablePlugin[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = '', highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No plugins found</h3>
        <p>Try a different search term or adjust filters</p>
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
      const titleHtml =
        query && highlightTitle
          ? highlightTitle(item.name, query)
          : escapeHtml(item.name);

      return `
        <article class="resource-item${isExternal ? ' resource-item-external' : ''}" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${titleHtml}</div>
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
