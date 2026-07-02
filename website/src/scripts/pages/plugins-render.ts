import {
  escapeHtml,
  getGitHubUrl,
  sanitizeUrl,
} from '../utils';
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from './resource-card';

const CLIPBOARD_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M5.75 1a.75.75 0 0 0-.75.75V3h6V1.75a.75.75 0 0 0-.75-.75h-4.5ZM11 3v-.75A.75.75 0 0 1 11.75 1.5h.5A1.75 1.75 0 0 1 14 3.25v10A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-10A1.75 1.75 0 0 1 3.75 1.5h.5A.75.75 0 0 1 5 2.25V3H3.75a.25.25 0 0 0-.25.25v10c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-10a.25.25 0 0 0-.25-.25H11Z"/></svg>`;

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

/** Source facet value: "external" for third-party plugins, else "local". */
export function pluginSource(item: RenderablePlugin): string[] {
  return [item.external === true ? 'external' : 'local'];
}

export function pluginSearchText(item: RenderablePlugin): string {
  return [
    item.name,
    item.description ?? '',
    item.author?.name ?? '',
    (item.tags ?? []).join(' '),
  ].join(' ');
}

export function getExternalPluginUrl(plugin: RenderablePlugin): string {
  if (plugin.source?.source === 'github' && plugin.source.repo) {
    const base = `https://github.com/${plugin.source.repo}`;
    return plugin.source.path && plugin.source.path !== '/'
      ? `${base}/tree/main/${plugin.source.path}`
      : base;
  }

  return sanitizeUrl(plugin.repository || plugin.homepage);
}

export function renderPluginsHtml(items: RenderablePlugin[]): string {
  const models: RCardModel[] = items.map((item) => {
    const isExternal = item.external === true;
    const safeName = escapeHtml(item.name);

    const badge = isExternal
      ? { text: 'External', title: 'Third-party plugin' }
      : null;

    const facts: RCardFact[] = [];
    if (!isExternal) {
      facts.push({
        icon: FACT_ICONS.items,
        label: `${item.itemCount} item${item.itemCount === 1 ? '' : 's'}`,
      });
    } else if (item.author?.name) {
      facts.push({ icon: FACT_ICONS.author, label: `by ${item.author.name}` });
    }

    const tagCount = item.tags?.length ?? 0;
    if (tagCount > 0) {
      facts.push({
        icon: FACT_ICONS.tag,
        label: `${tagCount} tag${tagCount === 1 ? '' : 's'}`,
      });
    }

    const actionsHtml = isExternal
      ? `
        <a href="${escapeHtml(
          getExternalPluginUrl(item)
        )}" class="btn btn-primary btn-small" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="View repository" aria-label="View ${safeName} repository">
          Repository
        </a>
      `
      : `
        <button type="button" class="btn btn-primary btn-small copy-plugin-install-btn" data-plugin-name="${safeName}" title="Copy install command" aria-label="Copy install command for ${safeName}">
          ${CLIPBOARD_SVG}<span>Copy install</span>
        </button>
        <a href="${getGitHubUrl(
          item.path
        )}" class="btn btn-secondary btn-small action-github rcard-lead" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="View on GitHub" aria-label="View ${safeName} on GitHub">
          ${GITHUB_MARK}
        </a>
      `;

    return {
      accent: 'extension',
      icon: TYPE_ICONS.plug,
      title: item.name,
      description: item.description || 'No description',
      path: item.path,
      articleClassName: isExternal ? 'resource-item-external' : '',
      badge,
      facts,
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    'No plugins match your filters',
    'Try a different search term or clear the active filters.'
  );
}
