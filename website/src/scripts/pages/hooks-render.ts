import { escapeHtml, getGitHubUrl, getLastUpdatedHtml } from '../utils';
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from './resource-card';

export interface RenderableHook {
  id: string;
  title: string;
  description?: string;
  path: string;
  readmeFile: string;
  hooks: string[];
  tags: string[];
  assets: string[];
  lastUpdated?: string | null;
}

export type HookSortOption = "title" | "lastUpdated";

export function sortHooks<T extends RenderableHook>(
  items: T[],
  sort: HookSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === "lastUpdated") {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.title.localeCompare(b.title);
  });
}

/** Lifecycle events a hook binds to (facet values). */
export function hookEvents(item: RenderableHook): string[] {
  return item.hooks ?? [];
}

export function hookSearchText(item: RenderableHook): string {
  return [
    item.title,
    item.description ?? '',
    (item.hooks ?? []).join(' '),
    (item.tags ?? []).join(' '),
  ].join(' ');
}

const DOWNLOAD_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/></svg>`;

export function renderHooksHtml(items: RenderableHook[]): string {
  const models: RCardModel[] = items.map((item) => {
    const facts: RCardFact[] = [];
    if (item.assets.length) {
      facts.push({
        icon: FACT_ICONS.asset,
        label: `${item.assets.length} asset${item.assets.length === 1 ? '' : 's'}`,
      });
    }

    const safeTitle = escapeHtml(item.title);
    const actionsHtml = `
      <button type="button" class="download-hook-btn rcard-icon-btn rcard-lead" data-hook-id="${escapeHtml(
        item.id
      )}" title="Download as ZIP" aria-label="Download ${safeTitle} as ZIP">
        ${DOWNLOAD_SVG}
      </button>
      <a href="${getGitHubUrl(item.path)}" class="action-github" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="View on GitHub" aria-label="View ${safeTitle} on GitHub">
        ${GITHUB_MARK}
      </a>
    `;

    return {
      accent: 'automation',
      icon: TYPE_ICONS.hook,
      title: item.title,
      description: item.description || 'No description',
      path: item.readmeFile,
      attributes: { 'data-hook-id': item.id },
      badge: item.hooks[0] ? { text: item.hooks[0], mono: true, moreCount: Math.max(0, item.hooks.length - 1) } : null,
      facts,
      lastUpdatedHtml: getLastUpdatedHtml(item.lastUpdated),
      actionsHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    'No hooks match your filters',
    'Try a different search term or clear the active filters.'
  );
}
