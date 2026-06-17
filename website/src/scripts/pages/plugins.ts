/**
 * Plugins page functionality
 */
import {
  createChoices,
  getChoicesValues,
  setChoicesValues,
  type Choices,
} from '../choices';
import {
  fetchData,
  getQueryParam,
  getQueryParamValues,
  updateQueryParams,
} from '../utils';
import { setupModal, openFileModal } from '../modal';
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

interface Plugin extends RenderablePlugin {
  id: string;
  name: string;
  path: string;
  tags?: string[];
  itemCount: number;
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

const resourceType = 'plugin';
let allItems: Plugin[] = [];
let tagSelect: Choices;
let currentSort: PluginSortOption = 'title';
let currentFilters = {
  tags: [] as string[],
};
let resourceListHandlersReady = false;

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
    results = results.filter(item => item.tags?.some(tag => currentFilters.tags.includes(tag)));
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

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('.resource-actions')) {
      return;
    }

    const item = target.closest('.resource-item') as HTMLElement | null;
    const path = item?.dataset.path;
    if (path) {
      openFileModal(path, resourceType);
    }
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
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<PluginsData>('plugins.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  tagSelect = createChoices('#filter-tag', { placeholderValue: 'All Tags' });
  tagSelect.setChoices(data.filters.tags.map(t => ({ value: t, label: t })), 'value', 'label', true);

  const initialTags = getQueryParamValues('tag').filter(tag => data.filters.tags.includes(tag));
  const initialSort = getQueryParam('sort');

  if (initialTags.length > 0) {
    currentFilters.tags = initialTags;
    setChoicesValues(tagSelect, initialTags);
  }

  document.getElementById('filter-tag')?.addEventListener('change', () => {
    currentFilters.tags = getChoicesValues(tagSelect);
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
    tagSelect.removeActiveItems();
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  syncUrlState();
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPluginsPage);
