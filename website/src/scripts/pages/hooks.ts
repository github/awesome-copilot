/**
 * Hooks page functionality
 */
import {
  escapeHtml,
  fetchData,
  formatRelativeTime,
  getQueryParam,
  getQueryParamValues,
  showToast,
  downloadZipBundle,
  updateQueryParams,
} from '../utils';
import { openCardDetailsModal, setupModal } from '../modal';
import { clearSelectValues, getSelectValues, setSelectValues } from './select-utils';
import {
  renderHooksHtml,
  sortHooks,
  type HookSortOption,
  type RenderableHook,
} from './hooks-render';

interface Hook extends RenderableHook {}

interface HooksData {
  items: Hook[];
  filters: {
    tags: string[];
  };
}

let allItems: Hook[] = [];
let hookById = new Map<string, Hook>();
let tagSelectEl: HTMLSelectElement | null = null;
let currentFilters = {
  tags: [] as string[],
};
let currentSort: HookSortOption = 'title';
let resourceListHandlersReady = false;
let modalReady = false;

function sortItems(items: Hook[]): Hook[] {
  return sortHooks(items, currentSort);
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  let results = [...allItems];

  if (currentFilters.tags.length > 0) {
    results = results.filter((item) => item.tags.some((tag) => currentFilters.tags.includes(tag)));
  }

  results = sortItems(results);

  renderItems(results);
  let countText = `${results.length} hook${results.length === 1 ? '' : 's'}`;
  if (currentFilters.tags.length > 0) {
    countText = `${results.length} of ${allItems.length} hooks (filtered by ${currentFilters.tags.length} tag${currentFilters.tags.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Hook[]): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderHooksHtml(items);
}

async function downloadHook(hookId: string, btn: HTMLButtonElement): Promise<void> {
  const hook = allItems.find((item) => item.id === hookId);
  if (!hook) {
    showToast('Hook not found.', 'error');
    return;
  }

  const files = [
    { name: 'README.md', path: hook.readmeFile },
    ...hook.assets.map((asset) => ({
      name: asset,
      path: `${hook.path}/${asset}`,
    })),
  ];

  if (files.length === 0) {
    showToast('No files found for this hook.', 'error');
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg class="spinner" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 8 1.5V0z"/></svg> Preparing...';

  try {
    await downloadZipBundle(hook.id, files);

    btn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg> Downloaded!';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    showToast(message, 'error');
    btn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg> Failed';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

function openHookDetailsModal(hookId: string, trigger?: HTMLElement): void {
  const item = hookById.get(hookId);
  if (!item) {
    return;
  }

  const metaParts = item.hooks.map(
    (hookName) => `<span class="resource-tag tag-hook">${escapeHtml(hookName)}</span>`
  );

  if (item.assets.length > 0) {
    metaParts.push(
      `<span class="resource-tag tag-assets">${item.assets.length} asset${
        item.assets.length === 1 ? '' : 's'
      }</span>`
    );
  }

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const tagHtml = item.tags
    .map((tagText) => `<span class="resource-tag tag-tag">${escapeHtml(tagText)}</span>`)
    .join('');

  const actionsHtml = `
    <button id="hook-details-download" class="btn btn-primary" type="button" data-hook-id="${escapeHtml(
      item.id
    )}">Download</button>
    <button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
      item.readmeFile
    )}" data-open-file-type="hook">Source</button>
  `;

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '🪝',
    previewText: 'Hook events and download options',
    metaHtml: metaParts.join(''),
    tagsHtml: tagHtml,
    actionsHtml,
    trigger,
  });
}

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const downloadButton = target.closest('.download-hook-btn') as HTMLButtonElement | null;
    if (downloadButton) {
      event.stopPropagation();
      const hookId = downloadButton.dataset.hookId;
      if (hookId) downloadHook(hookId, downloadButton);
      return;
    }

    if (target.closest('.resource-actions')) {
      return;
    }

    const item = target.closest('.resource-item') as HTMLElement | null;
    const button = item?.querySelector('.resource-preview') as HTMLElement | undefined;
    const hookId = item?.dataset.hookId;
    if (hookId) {
      openHookDetailsModal(hookId, button);
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const modalDownloadButton = target.closest(
      '#hook-details-download'
    ) as HTMLButtonElement | null;
    if (!modalDownloadButton) return;
    const hookId = modalDownloadButton.dataset.hookId;
    if (hookId) downloadHook(hookId, modalDownloadButton);
  });

  resourceListHandlersReady = true;
}

function syncUrlState(): void {
  updateQueryParams({
    q: '',
    hook: [],
    tag: currentFilters.tags,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initHooksPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<HooksData>('hooks.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  hookById = new Map(allItems.map((item) => [item.id, item]));

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
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  tagSelectEl?.addEventListener('change', () => {
    currentFilters.tags = getSelectValues(tagSelectEl);
    applyFiltersAndRender();
    syncUrlState();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as HookSortOption;
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
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initHooksPage);
