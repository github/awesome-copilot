/**
 * Agents page functionality
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
  getQueryParamFlag,
  getQueryParamValues,
  setupDropdownCloseHandlers,
  setupActionHandlers,
  updateQueryParams,
} from '../utils';
import { setupModal, openFileModal } from '../modal';
import { renderAgentsHtml, sortAgents, type AgentSortOption, type RenderableAgent } from './agents-render';

interface Agent extends SearchItem, RenderableAgent {
  model?: string | string[];
  tools?: string[];
  hasHandoffs?: boolean;
  lastUpdated?: string | null;
}

interface AgentsData {
  items: Agent[];
  filters: {
    models: string[];
    tools: string[];
  };
}

let allItems: Agent[] = [];
let search = new FuzzySearch<Agent>();
let modelSelect: Choices;
let toolSelect: Choices;
let currentSort: AgentSortOption = 'title';
let resourceListHandlersReady = false;

let currentFilters = {
  models: [] as string[],
  tools: [] as string[],
  hasHandoffs: false,
};

function sortItems(items: Agent[]): Agent[] {
  return sortAgents(items, currentSort);
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.models.length > 0) {
    results = results.filter(item => {
      if (currentFilters.models.includes('(none)') && !item.model) {
        return true;
      }
      return item.model && (Array.isArray(item.model) ? item.model.some(m => currentFilters.models.includes(m)) : currentFilters.models.includes(item.model));
    });
  }

  if (currentFilters.tools.length > 0) {
    results = results.filter(item =>
      item.tools?.some(tool => currentFilters.tools.includes(tool))
    );
  }

  if (currentFilters.hasHandoffs) {
    results = results.filter(item => item.hasHandoffs);
  }

  // Apply sorting
  results = sortItems(results);

  renderItems(results, query);

  const activeFilters: string[] = [];
  if (currentFilters.models.length > 0) activeFilters.push(`models: ${currentFilters.models.length}`);
  if (currentFilters.tools.length > 0) activeFilters.push(`tools: ${currentFilters.tools.length}`);
  if (currentFilters.hasHandoffs) activeFilters.push('has handoffs');

  let countText = `${results.length} of ${allItems.length} agents`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(', ')})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Agent[], query = ''): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderAgentsHtml(items, {
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
      openFileModal(path, 'agent');
    }
  });

  resourceListHandlersReady = true;
}

function syncUrlState(searchInput: HTMLInputElement | null): void {
  updateQueryParams({
    q: searchInput?.value ?? '',
    model: currentFilters.models,
    tool: currentFilters.tools,
    handoffs: currentFilters.hasHandoffs,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initAgentsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const handoffsCheckbox = document.getElementById('filter-handoffs') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<AgentsData>('agents.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  // Initialize Choices.js for model filter
  modelSelect = createChoices('#filter-model', { placeholderValue: 'All Models' });
  modelSelect.setChoices(data.filters.models.map(m => ({ value: m, label: m })), 'value', 'label', true);

  const initialQuery = getQueryParam('q');
  const initialModels = getQueryParamValues('model').filter(model => data.filters.models.includes(model));
  const initialTools = getQueryParamValues('tool').filter(tool => data.filters.tools.includes(tool));
  const initialSort = getQueryParam('sort');

  if (searchInput) searchInput.value = initialQuery;
  if (initialModels.length > 0) {
    currentFilters.models = initialModels;
    setChoicesValues(modelSelect, initialModels);
  }

  document.getElementById('filter-model')?.addEventListener('change', () => {
    currentFilters.models = getChoicesValues(modelSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  // Initialize Choices.js for tool filter
  toolSelect = createChoices('#filter-tool', { placeholderValue: 'All Tools' });
  toolSelect.setChoices(data.filters.tools.map(t => ({ value: t, label: t })), 'value', 'label', true);
  if (initialTools.length > 0) {
    currentFilters.tools = initialTools;
    setChoicesValues(toolSelect, initialTools);
  }
  document.getElementById('filter-tool')?.addEventListener('change', () => {
    currentFilters.tools = getChoicesValues(toolSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  // Initialize sort select
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as AgentSortOption;
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = `${allItems.length} of ${allItems.length} agents`;
  }

  searchInput?.addEventListener('input', debounce(() => {
    applyFiltersAndRender();
    syncUrlState(searchInput);
  }, 200));

  if (getQueryParamFlag('handoffs')) {
    currentFilters.hasHandoffs = true;
    if (handoffsCheckbox) handoffsCheckbox.checked = true;
  }

  handoffsCheckbox?.addEventListener('change', () => {
    currentFilters.hasHandoffs = handoffsCheckbox.checked;
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { models: [], tools: [], hasHandoffs: false };
    currentSort = 'title';
    modelSelect.removeActiveItems();
    toolSelect.removeActiveItems();
    if (handoffsCheckbox) handoffsCheckbox.checked = false;
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  applyFiltersAndRender();
  setupModal();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAgentsPage);
