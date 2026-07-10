/**
 * Workflows page functionality
 */
import {
  fetchData,
  getQueryParam,
  getQueryParamValues,
  setupActionHandlers,
  updateQueryParams,
} from '../utils';
import { clearSelectValues, getSelectValues, setSelectValues } from './select-utils';
import {
  renderWorkflowsHtml,
  sortWorkflows,
  type RenderableWorkflow,
  type WorkflowSortOption,
} from './workflows-render';

interface Workflow extends RenderableWorkflow {
  id: string;
  path: string;
  triggers: string[];
  lastUpdated?: string | null;
}

interface WorkflowsData {
  items: Workflow[];
  filters: {
    triggers: string[];
  };
}

let allItems: Workflow[] = [];
let triggerSelectEl: HTMLSelectElement | null = null;
let currentFilters = {
  triggers: [] as string[],
};
let currentSort: WorkflowSortOption = 'title';

function sortItems(items: Workflow[]): Workflow[] {
  return sortWorkflows(items, currentSort);
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  let results = [...allItems];

  if (currentFilters.triggers.length > 0) {
    results = results.filter((item) => item.triggers.some((trigger) => currentFilters.triggers.includes(trigger)));
  }

  results = sortItems(results);

  renderItems(results);
  let countText = `${results.length} workflow${results.length === 1 ? '' : 's'}`;
  if (currentFilters.triggers.length > 0) {
    countText = `${results.length} of ${allItems.length} workflows (filtered by ${currentFilters.triggers.length} trigger${currentFilters.triggers.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Workflow[]): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderWorkflowsHtml(items);
}

function syncUrlState(): void {
  updateQueryParams({
    q: '',
    trigger: currentFilters.triggers,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initWorkflowsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;

  const data = await fetchData<WorkflowsData>('workflows.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  triggerSelectEl = document.getElementById('filter-trigger') as HTMLSelectElement | null;
  if (triggerSelectEl) {
    triggerSelectEl.innerHTML = '';
    data.filters.triggers.forEach((trigger) => {
      const option = document.createElement('option');
      option.value = trigger;
      option.textContent = trigger;
      triggerSelectEl?.appendChild(option);
    });
  }

  const initialTriggers = getQueryParamValues('trigger').filter((trigger) => data.filters.triggers.includes(trigger));
  const initialSort = getQueryParam('sort');

  if (initialTriggers.length > 0) {
    currentFilters.triggers = initialTriggers;
    setSelectValues(triggerSelectEl, initialTriggers);
  }
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  triggerSelectEl?.addEventListener('change', () => {
    currentFilters.triggers = getSelectValues(triggerSelectEl);
    applyFiltersAndRender();
    syncUrlState();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as WorkflowSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { triggers: [] };
    currentSort = 'title';
    clearSelectValues(triggerSelectEl);
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initWorkflowsPage);
