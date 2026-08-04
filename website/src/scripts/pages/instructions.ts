/**
 * Instructions page functionality
 */
import {
  fetchData,
  getQueryParam,
  getQueryParamValues,
  setupActionHandlers,
  setupDropdownCloseHandlers,
  updateQueryParams,
} from '../utils';
import { clearSelectValues, getSelectValues, setSelectValues } from './select-utils';
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

let allItems: Instruction[] = [];
let extensionSelectEl: HTMLSelectElement | null = null;
let currentFilters = { extensions: [] as string[] };
let currentSort: InstructionSortOption = 'title';

function sortItems(items: Instruction[]): Instruction[] {
  return sortInstructions(items, currentSort);
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  let results = [...allItems];

  if (currentFilters.extensions.length > 0) {
    results = results.filter((item) => {
      if (
        currentFilters.extensions.includes('(none)') &&
        (!item.extensions || item.extensions.length === 0)
      ) {
        return true;
      }
      return item.extensions?.some((ext) => currentFilters.extensions.includes(ext));
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
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;

  const data = await fetchData<InstructionsData>('instructions.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  extensionSelectEl = document.getElementById('filter-extension') as HTMLSelectElement | null;
  if (extensionSelectEl) {
    extensionSelectEl.innerHTML = '';
    data.filters.extensions.forEach((ext) => {
      const option = document.createElement('option');
      option.value = ext;
      option.textContent = ext;
      extensionSelectEl?.appendChild(option);
    });
  }

  const initialExtensions = getQueryParamValues('extension').filter((extension) => data.filters.extensions.includes(extension));
  const initialSort = getQueryParam('sort');

  if (initialExtensions.length > 0) {
    currentFilters.extensions = initialExtensions;
    setSelectValues(extensionSelectEl, initialExtensions);
  }
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  extensionSelectEl?.addEventListener('change', () => {
    currentFilters.extensions = getSelectValues(extensionSelectEl);
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
    clearSelectValues(extensionSelectEl);
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initInstructionsPage);
