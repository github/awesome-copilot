import {
  escapeHtml,
  getGitHubUrl,
} from '../utils';
import { externalRepoUrl } from '../../lib/external-source';
import { renderEmptyStateHtml, renderSharedCardHtml } from './card-render';

interface PluginAuthor {
  name: string;
  url?: string;
}

interface PluginSource {
  source: string;
  repo?: string;
  path?: string;
  ref?: string;
  sha?: string;
}

export interface RenderablePlugin {
  id: string;
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

export function getPluginDetailUrl(id: string): string {
  return `/plugin/${id}/`;
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
  return externalRepoUrl(plugin.source, [plugin.repository, plugin.homepage]);
}

export function renderPluginsHtml(items: RenderablePlugin[]): string {
  if (items.length === 0) {
    return renderEmptyStateHtml('No plugins found', 'Try different tags or clear the current filters');
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
      const metaHtml = `
        ${metaTag}
        ${authorTag}
        ${item.tags?.slice(0, 4).map((tag) => `<span class="resource-tag">${escapeHtml(tag)}</span>`).join('') || ''}
        ${item.tags && item.tags.length > 4 ? `<span class="resource-tag">+${item.tags.length - 4} more</span>` : ''}
      `;

      const actionsHtml = `
        <a href="${githubHref}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="${isExternal ? 'View repository' : 'View on GitHub'}">${isExternal ? 'Repository' : 'GitHub'}</a>
      `;

      return renderSharedCardHtml({
        title: item.name,
        description: item.description || 'No description',
        href: getPluginDetailUrl(item.id),
        articleClassName: isExternal ? 'resource-item-external' : '',
        articleAttributes: {
          'data-path': item.path,
        },
        metaHtml,
        actionsHtml,
      });
    })
    .join('');
}
