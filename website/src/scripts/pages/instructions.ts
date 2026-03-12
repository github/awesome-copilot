/**
 * Instructions page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, setupDropdownCloseHandlers, setupActionHandlers } from '../utils';
import { setupModal, openFileModal } from '../modal';
import {
  renderInstructionsHtml,
  sortInstructions,
  type InstructionSortOption,
  type RenderableInstruction,
} from './instructions-render';

interface Instruction extends SearchItem, RenderableInstruction {
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
let search = new FuzzySearch<Instruction>();
let extensionSelect: Choices;
let currentFilters = { extensions: [] as string[] };
let currentSort: InstructionSortOption = 'title';
let resourceListHandlersReady = false;

function sortItems(items: Instruction[]): Instruction[] {
  return sortInstructions(items, currentSort);
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.extensions.length > 0) {
    results = results.filter(item => {
      if (currentFilters.extensions.includes('(none)') && (!item.extensions || item.extensions.length === 0)) {
        return true;
      }
      return item.extensions?.some(ext => currentFilters.extensions.includes(ext));
    });
  }

  results = sortItems(results);

  renderItems(results, query);
  let countText = `${results.length} of ${allItems.length} instructions`;
  if (currentFilters.extensions.length > 0) {
    countText += ` (filtered by ${currentFilters.extensions.length} extension${currentFilters.extensions.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Instruction[], query = ''): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderInstructionsHtml(items, {
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

export async function initInstructionsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<InstructionsData>('instructions.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  extensionSelect = createChoices('#filter-extension', { placeholderValue: 'All Extensions' });
  extensionSelect.setChoices(data.filters.extensions.map(e => ({ value: e, label: e })), 'value', 'label', true);
  document.getElementById('filter-extension')?.addEventListener('change', () => {
    currentFilters.extensions = getChoicesValues(extensionSelect);
    applyFiltersAndRender();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as InstructionSortOption;
    applyFiltersAndRender();
  });

  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.textContent = `${allItems.length} of ${allItems.length} instructions`;
  }

  searchInput?.addEventListener('input', debounce(() => applyFiltersAndRender(), 200));

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { extensions: [] };
    currentSort = 'title';
    extensionSelect.removeActiveItems();
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
  });

  setupModal();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initInstructionsPage);
