/**
 * Instructions page functionality
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
  setupDropdownCloseHandlers,
  setupActionHandlers,
  updateQueryParams,
} from '../utils';
import { setupModal, openFileModal } from '../modal';
import {
  renderInstructionsHtml,
  sortInstructions,
  type InstructionSortOption,
  type RenderableInstruction,
} from './instructions-render';

interface Instruction extends RenderableInstruction {
  path: string;
  applyTo?: string | string[];
  extensions?: string[];
  lastUpdated?: string | null;
}

interface InstructionsData {
  items: Instruction[];
  filters: {
    extensions: string[];
  };
}

const resourceType = 'instruction';
let allItems: Instruction[] = [];
let extensionSelect: Choices;
let currentFilters = { extensions: [] as string[] };
let currentSort: InstructionSortOption = 'title';
let resourceListHandlersReady = false;

function sortItems(items: Instruction[]): Instruction[] {
  return sortInstructions(items, currentSort);
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  let results = [...allItems];

  if (currentFilters.extensions.length > 0) {
    results = results.filter(item => {
      if (currentFilters.extensions.includes('(none)') && (!item.extensions || item.extensions.length === 0)) {
        return true;
      }
      return item.extensions?.some(ext => currentFilters.extensions.includes(ext));
    });
  }

  results = sortItems(results);

  renderItems(results);
  let countText = `${results.length} instruction${results.length === 1 ? '' : 's'}`;
  if (currentFilters.extensions.length > 0) {
    countText = `${results.length} of ${allItems.length} instructions (filtered by ${currentFilters.extensions.length} extension${currentFilters.extensions.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Instruction[]): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderInstructionsHtml(items);
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
    extension: currentFilters.extensions,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initInstructionsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<InstructionsData>('instructions.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  extensionSelect = createChoices('#filter-extension', { placeholderValue: 'All Extensions' });
  extensionSelect.setChoices(data.filters.extensions.map(e => ({ value: e, label: e })), 'value', 'label', true);

  const initialExtensions = getQueryParamValues('extension').filter(extension => data.filters.extensions.includes(extension));
  const initialSort = getQueryParam('sort');

  if (initialExtensions.length > 0) {
    currentFilters.extensions = initialExtensions;
    setChoicesValues(extensionSelect, initialExtensions);
  }
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  document.getElementById('filter-extension')?.addEventListener('change', () => {
    currentFilters.extensions = getChoicesValues(extensionSelect);
    applyFiltersAndRender();
    syncUrlState();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as InstructionSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { extensions: [] };
    currentSort = 'title';
    extensionSelect.removeActiveItems();
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupModal();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initInstructionsPage);
