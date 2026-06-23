/**
 * Plugins page functionality
 */
import {
  copyToClipboard,
  escapeHtml,
  fetchData,
  formatRelativeTime,
  getGitHubUrl,
  getQueryParam,
  getQueryParamValues,
  showToast,
  updateQueryParams,
} from '../utils';
import { openCardDetailsModal, setupModal } from '../modal';
import { clearSelectValues, getSelectValues, setSelectValues } from './select-utils';
import {
  renderPluginsHtml,
  sortPlugins,
  type PluginSortOption,
  type RenderablePlugin,
} from './plugins-render';

interface PluginAuthor {
  name: string;
  url?: string;
}

interface PluginSource {
  source: string;
  repo?: string;
  path?: string;
}

interface PluginItem {
  kind: string;
  path: string;
}

interface Plugin extends RenderablePlugin {
  id: string;
  name: string;
  path: string;
  tags?: string[];
  itemCount: number;
  items?: PluginItem[];
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  author?: PluginAuthor | null;
  license?: string | null;
  source?: PluginSource | null;
}

interface PluginsData {
  items: Plugin[];
  filters: {
    tags: string[];
  };
}

let allItems: Plugin[] = [];
let pluginByPath = new Map<string, Plugin>();
let tagSelectEl: HTMLSelectElement | null = null;
let currentSort: PluginSortOption = 'title';
let currentFilters = {
  tags: [] as string[],
};
let resourceListHandlersReady = false;
let modalReady = false;

function sortItems(items: Plugin[]): Plugin[] {
  return sortPlugins(items, currentSort);
}

function getCountText(resultsCount: number): string {
  if (currentFilters.tags.length === 0) {
    return `${resultsCount} plugin${resultsCount === 1 ? '' : 's'}`;
  }

  return `${resultsCount} of ${allItems.length} plugins (filtered by ${currentFilters.tags.length} tag${currentFilters.tags.length === 1 ? '' : 's'})`;
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  let results = [...allItems];

  if (currentFilters.tags.length > 0) {
    results = results.filter((item) => item.tags?.some((tag) => currentFilters.tags.includes(tag)));
  }

  results = sortItems(results);

  renderItems(results);
  if (countEl) countEl.textContent = getCountText(results.length);
}

function renderItems(items: Plugin[]): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderPluginsHtml(items);
}

function getPluginRepositoryUrl(item: Plugin): string {
  if (item.external && item.repository) return item.repository;
  if (item.homepage) return item.homepage;
  if (item.repository) return item.repository;
  return getGitHubUrl(item.path);
}

function getPluginItemLabel(item: PluginItem): string {
  const normalizedPath = item.path.replace(/^\.\//, '');
  return `${item.kind}: ${normalizedPath}`;
}

function openPluginDetailsModal(path: string, trigger?: HTMLElement): void {
  const item = pluginByPath.get(path);
  if (!item) {
    return;
  }

  const metaParts: string[] = [];
  metaParts.push(
    `<span class="resource-tag">${
      item.external ? 'External plugin' : `${item.itemCount} items`
    }</span>`
  );

  if (item.author?.name) {
    metaParts.push(`<span class="resource-tag">by ${escapeHtml(item.author.name)}</span>`);
  }

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const tagHtml = (item.tags || [])
    .map((tagText) => `<span class="resource-tag">${escapeHtml(tagText)}</span>`)
    .join('');

  const includedItems = item.items || [];
  const includedItemHtml = includedItems
    .slice(0, 24)
    .map(
      (pluginItem) =>
        `<span class="resource-tag tag-plugin-item">${escapeHtml(getPluginItemLabel(pluginItem))}</span>`
    )
    .join('');
  const includedMoreHtml =
    includedItems.length > 24
      ? `<span class="resource-tag">+${includedItems.length - 24} more</span>`
      : '';

  const actions = [
    item.external
      ? ''
      : `<button id="plugin-details-install" class="btn btn-primary" type="button" data-plugin-name="${escapeHtml(
          item.name
        )}">Copy Install</button>`,
    item.external
      ? `<a class="btn btn-secondary" href="${escapeHtml(
          getPluginRepositoryUrl(item)
        )}" target="_blank" rel="noopener noreferrer">Repository</a>`
      : `<button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
          item.path
        )}" data-open-file-type="plugin">Source</button>`,
  ].filter(Boolean);

  openCardDetailsModal({
    title: item.name,
    description: item.description || 'No description',
    previewIcon: '🔌',
    previewText: 'Plugin metadata and install options',
    metaHtml: metaParts.join(''),
    tagsHtml: [tagHtml, includedItemHtml, includedMoreHtml].filter(Boolean).join(''),
    actionsHtml: actions.join(''),
    trigger,
  });
}

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('.resource-actions')) {
      return;
    }

    const item = target.closest('.resource-item') as HTMLElement | null;
    const button = item?.querySelector('.resource-preview') as HTMLElement | undefined;
    const path = item?.dataset.path;
    if (path) {
      openPluginDetailsModal(path, button);
    }
  });

  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const installButton = target.closest(
      '#plugin-details-install'
    ) as HTMLButtonElement | null;
    if (!installButton) return;
    const pluginName = installButton.dataset.pluginName || '';
    if (!pluginName) return;
    const command = `copilot plugin install ${pluginName}@awesome-copilot`;
    const success = await copyToClipboard(command);
    showToast(success ? 'Install command copied!' : 'Failed to copy', success ? 'success' : 'error');
  });

  resourceListHandlersReady = true;
}

function syncUrlState(): void {
  updateQueryParams({
    q: '',
    tag: currentFilters.tags,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initPluginsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<PluginsData>('plugins.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  pluginByPath = new Map(allItems.map((item) => [item.path, item]));

  tagSelectEl = document.getElementById('filter-tag') as HTMLSelectElement | null;
  if (tagSelectEl) {
    tagSelectEl.innerHTML = '';
    data.filters.tags.forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagSelectEl?.appendChild(option);
    });
  }

  const initialTags = getQueryParamValues('tag').filter((tag) => data.filters.tags.includes(tag));
  const initialSort = getQueryParam('sort');

  if (initialTags.length > 0) {
    currentFilters.tags = initialTags;
    setSelectValues(tagSelectEl, initialTags);
  }

  tagSelectEl?.addEventListener('change', () => {
    currentFilters.tags = getSelectValues(tagSelectEl);
    applyFiltersAndRender();
    syncUrlState();
  });

  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as PluginSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { tags: [] };
    currentSort = 'title';
    clearSelectValues(tagSelectEl);
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  syncUrlState();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPluginsPage);
