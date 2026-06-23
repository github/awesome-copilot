/**
 * Workflows page functionality
 */
import {
  copyToClipboard,
  escapeHtml,
  fetchData,
  formatRelativeTime,
  getQueryParam,
  getQueryParamValues,
  showToast,
  setupActionHandlers,
  updateQueryParams,
} from '../utils';
import { openCardDetailsModal, setupModal } from '../modal';
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
let workflowByPath = new Map<string, Workflow>();
let triggerSelectEl: HTMLSelectElement | null = null;
let currentFilters = {
  triggers: [] as string[],
};
let currentSort: WorkflowSortOption = 'title';
let resourceListHandlersReady = false;
let modalReady = false;

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

function openWorkflowDetailsModal(path: string, trigger?: HTMLElement): void {
  const item = workflowByPath.get(path);
  if (!item) {
    return;
  }

  const metaParts: string[] = [];
  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const triggerTags = item.triggers
    .map((triggerName) => `<span class="resource-tag tag-trigger">${escapeHtml(triggerName)}</span>`)
    .join('');
  const actionsHtml = `
    <button id="workflow-details-copy-path" class="btn btn-secondary" type="button" data-workflow-path="${escapeHtml(
      item.path
    )}">Copy Path</button>
    <button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
      item.path
    )}" data-open-file-type="workflow">Source</button>
  `;

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '⚡',
    previewText: 'Workflow trigger details and source',
    metaHtml: metaParts.join(''),
    tagsHtml: triggerTags,
    actionsHtml,
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
      openWorkflowDetailsModal(path, button);
    }
  });

  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const copyPathButton = target.closest(
      '#workflow-details-copy-path'
    ) as HTMLButtonElement | null;
    if (!copyPathButton) return;
    const workflowPath = copyPathButton.dataset.workflowPath || '';
    if (!workflowPath) return;
    const success = await copyToClipboard(workflowPath);
    showToast(success ? 'Path copied!' : 'Failed to copy path', success ? 'success' : 'error');
  });

  resourceListHandlersReady = true;
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

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<WorkflowsData>('workflows.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  workflowByPath = new Map(allItems.map((item) => [item.path, item]));

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
