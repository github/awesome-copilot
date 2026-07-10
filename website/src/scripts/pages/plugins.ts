/**
 * Plugins page functionality
 */
import {
  fetchData,
  getQueryParam,
  getQueryParamValues,
  updateQueryParams,
} from '../utils';
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
let tagSelectEl: HTMLSelectElement | null = null;
let currentSort: PluginSortOption = 'title';
let currentFilters = {
  tags: [] as string[],
};

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

  const data = await fetchData<PluginsData>('plugins.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

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
