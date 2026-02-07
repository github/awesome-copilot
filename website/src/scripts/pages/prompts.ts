/**
 * Prompts page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, getGitHubUrl, getInstallDropdownHtml, setupDropdownCloseHandlers, getActionButtonsHtml, setupActionHandlers, getLastUpdatedHtml } from '../utils';
import { setupModal, openFileModal } from '../modal';

interface Prompt extends SearchItem {
  path: string;
  tools?: string[];
  lastUpdated?: string | null;
}

interface PromptsData {
  items: Prompt[];
  filters: {
    tools: string[];
  };
}

type SortOption = 'title' | 'lastUpdated';

const resourceType = 'prompt';
let allItems: Prompt[] = [];
let search = new FuzzySearch<Prompt>();
let toolSelect: Choices;
let currentFilters = { tools: [] as string[] };
let currentSort: SortOption = 'title';

function sortItems(items: Prompt[]): Prompt[] {
  return [...items].sort((a, b) => {
    if (currentSort === 'lastUpdated') {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }
    return a.title.localeCompare(b.title);
  });
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.tools.length > 0) {
    results = results.filter(item =>
      item.tools?.some(tool => currentFilters.tools.includes(tool))
    );
  }

  results = sortItems(results);

  renderItems(results, query);
  let countText = `${results.length} of ${allItems.length} prompts`;
  if (currentFilters.tools.length > 0) {
    countText += ` (filtered by ${currentFilters.tools.length} tool${currentFilters.tools.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Prompt[], query = ''): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><h3>No prompts found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="resource-item" data-path="${escapeHtml(item.path)}">
      <div class="resource-info">
        <div class="resource-title">${query ? search.highlight(item.title, query) : escapeHtml(item.title)}</div>
        <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
        <div class="resource-meta">
          ${item.tools?.slice(0, 4).map(t => `<span class="resource-tag">${escapeHtml(t)}</span>`).join('') || ''}
          ${item.tools && item.tools.length > 4 ? `<span class="resource-tag">+${item.tools.length - 4} more</span>` : ''}
          ${getLastUpdatedHtml(item.lastUpdated)}
        </div>
      </div>
      <div class="resource-actions">
        ${getInstallDropdownHtml(resourceType, item.path, true)}
        ${getActionButtonsHtml(item.path, true)}
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
          GitHub
        </a>
      </div>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.resource-item').forEach(el => {
    el.addEventListener('click', () => {
      const path = (el as HTMLElement).dataset.path;
      if (path) openFileModal(path, resourceType);
    });
  });
}

export async function initPromptsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  const data = await fetchData<PromptsData>('prompts.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  toolSelect = createChoices('#filter-tool', { placeholderValue: 'All Tools' });
  toolSelect.setChoices(data.filters.tools.map(t => ({ value: t, label: t })), 'value', 'label', true);
  document.getElementById('filter-tool')?.addEventListener('change', () => {
    currentFilters.tools = getChoicesValues(toolSelect);
    applyFiltersAndRender();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as SortOption;
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
  searchInput?.addEventListener('input', debounce(() => applyFiltersAndRender(), 200));

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { tools: [] };
    currentSort = 'title';
    toolSelect.removeActiveItems();
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'title';
    applyFiltersAndRender();
  });

  setupModal();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPromptsPage);
