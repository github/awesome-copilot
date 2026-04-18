/**
 * Plugins page functionality
 */
import {
  createChoices,
  getChoicesValues,
  setChoicesValues,
  type Choices,
} from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import {
  fetchData,
  debounce,
  getQueryParam,
  getQueryParamValues,
  updateQueryParams,
} from '../utils';
import { setupModal, openFileModal } from '../modal';
import { renderPluginsHtml, type RenderablePlugin } from './plugins-render';

interface PluginAuthor {
  name: string;
  url?: string;
}

interface PluginSource {
  source: string;
  repo?: string;
  path?: string;
}

interface Plugin extends SearchItem, RenderablePlugin {
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
let search = new FuzzySearch<Plugin>();
let tagSelect: Choices;
let currentFilters = {
  tags: [] as string[],
};
let resourceListHandlersReady = false;

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.tags.length > 0) {
    results = results.filter(item => item.tags?.some(tag => currentFilters.tags.includes(tag)));
  }

  renderItems(results, query);
  const activeFilters: string[] = [];
  if (currentFilters.tags.length > 0) activeFilters.push(`${currentFilters.tags.length} tag${currentFilters.tags.length > 1 ? 's' : ''}`);
  let countText = `${results.length} of ${allItems.length} plugins`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(', ')})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Plugin[], query = ''): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderPluginsHtml(items, {
    query,
    highlightTitle: (title, highlightQuery) => search.highlight(title, highlightQuery),
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
    const path = item?.dataset.path;
    if (path) {
      openFileModal(path, resourceType);
    }
  });

  resourceListHandlersReady = true;
}

function syncUrlState(searchInput: HTMLInputElement | null): void {
  updateQueryParams({
    q: searchInput?.value ?? '',
    tag: currentFilters.tags,
  });
}

export async function initPluginsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<PluginsData>('plugins.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  // Map plugin items to search items
  const searchItems = allItems.map(item => ({
    ...item,
    title: item.name,
    searchText: `${item.name} ${item.description} ${item.tags?.join(' ') || ''}`.toLowerCase()
  }));
  search.setItems(searchItems);

  tagSelect = createChoices('#filter-tag', { placeholderValue: 'All Tags' });
  tagSelect.setChoices(data.filters.tags.map(t => ({ value: t, label: t })), 'value', 'label', true);

  const initialQuery = getQueryParam('q');
  const initialTags = getQueryParamValues('tag').filter(tag => data.filters.tags.includes(tag));

  if (searchInput) searchInput.value = initialQuery;
  if (initialTags.length > 0) {
    currentFilters.tags = initialTags;
    setChoicesValues(tagSelect, initialTags);
  }

  document.getElementById('filter-tag')?.addEventListener('change', () => {
    currentFilters.tags = getChoicesValues(tagSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = `${allItems.length} of ${allItems.length} plugins`;
  }

  searchInput?.addEventListener('input', debounce(() => {
    applyFiltersAndRender();
    syncUrlState(searchInput);
  }, 200));

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { tags: [] };
    tagSelect.removeActiveItems();
    if (searchInput) searchInput.value = '';
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  applyFiltersAndRender();
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPluginsPage);
