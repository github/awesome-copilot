/**
 * Instructions page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, getGitHubUrl, getInstallDropdownHtml, setupDropdownCloseHandlers, getActionButtonsHtml, setupActionHandlers, getLastUpdatedHtml } from '../utils';
import { setupModal, openFileModal } from '../modal';

interface Instruction extends SearchItem {
  path: string;
  applyTo?: string;
  extensions?: string[];
  lastUpdated?: string | null;
}

interface InstructionsData {
  items: Instruction[];
  filters: {
    extensions: string[];
  };
}

type SortOption = 'title' | 'lastUpdated';

const resourceType = 'instruction';
let allItems: Instruction[] = [];
let search = new FuzzySearch<Instruction>();
let extensionSelect: Choices;
let currentFilters = { extensions: [] as string[] };
let currentSort: SortOption = 'title';

function sortItems(items: Instruction[]): Instruction[] {
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

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><h3>No instructions found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="resource-item" data-path="${escapeHtml(item.path)}">
      <div class="resource-info">
        <div class="resource-title">${query ? search.highlight(item.title, query) : escapeHtml(item.title)}</div>
        <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
        <div class="resource-meta">
          ${item.applyTo ? `<span class="resource-tag">applies to: ${escapeHtml(item.applyTo)}</span>` : ''}
          ${item.extensions?.slice(0, 4).map(e => `<span class="resource-tag tag-extension">${escapeHtml(e)}</span>`).join('') || ''}
          ${item.extensions && item.extensions.length > 4 ? `<span class="resource-tag">+${item.extensions.length - 4} more</span>` : ''}
          ${getLastUpdatedHtml(item.lastUpdated)}
        </div>
      </div>
      <div class="resource-actions">
        ${getInstallDropdownHtml('instructions', item.path, true)}
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

export async function initInstructionsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

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
    currentSort = sortSelect.value as SortOption;
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
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
