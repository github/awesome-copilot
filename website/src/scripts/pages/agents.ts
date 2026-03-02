/**
 * Agents page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, getGitHubUrl, getInstallDropdownHtml, setupDropdownCloseHandlers, getActionButtonsHtml, setupActionHandlers, getLastUpdatedHtml } from '../utils';
import { setupModal, openFileModal } from '../modal';

interface Agent extends SearchItem {
  path: string;
  model?: string;
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

type SortOption = 'title' | 'lastUpdated';

const resourceType = 'agent';
let allItems: Agent[] = [];
let search = new FuzzySearch<Agent>();
let modelSelect: Choices;
let toolSelect: Choices;
let currentSort: SortOption = 'title';

let currentFilters = {
  models: [] as string[],
  tools: [] as string[],
  hasHandoffs: false,
};

function sortItems(items: Agent[]): Agent[] {
  return [...items].sort((a, b) => {
    if (currentSort === 'lastUpdated') {
      // Sort by last updated (newest first), with null/undefined at end
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }
    // Default: sort by title
    return a.title.localeCompare(b.title);
  });
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
      return item.model && currentFilters.models.includes(item.model);
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

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No agents found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="resource-item" data-path="${escapeHtml(item.path)}">
      <div class="resource-info">
        <div class="resource-title">${query ? search.highlight(item.title, query) : escapeHtml(item.title)}</div>
        <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
        <div class="resource-meta">
          ${item.model ? `<span class="resource-tag tag-model">${escapeHtml(item.model)}</span>` : ''}
          ${item.tools?.slice(0, 3).map(t => `<span class="resource-tag">${escapeHtml(t)}</span>`).join('') || ''}
          ${item.tools && item.tools.length > 3 ? `<span class="resource-tag">+${item.tools.length - 3} more</span>` : ''}
          ${item.hasHandoffs ? `<span class="resource-tag tag-handoffs">handoffs</span>` : ''}
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

export async function initAgentsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const handoffsCheckbox = document.getElementById('filter-handoffs') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

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
  document.getElementById('filter-model')?.addEventListener('change', () => {
    currentFilters.models = getChoicesValues(modelSelect);
    applyFiltersAndRender();
  });

  // Initialize Choices.js for tool filter
  toolSelect = createChoices('#filter-tool', { placeholderValue: 'All Tools' });
  toolSelect.setChoices(data.filters.tools.map(t => ({ value: t, label: t })), 'value', 'label', true);
  document.getElementById('filter-tool')?.addEventListener('change', () => {
    currentFilters.tools = getChoicesValues(toolSelect);
    applyFiltersAndRender();
  });

  // Initialize sort select
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as SortOption;
    applyFiltersAndRender();
  });

  applyFiltersAndRender();

  searchInput?.addEventListener('input', debounce(() => applyFiltersAndRender(), 200));

  handoffsCheckbox?.addEventListener('change', () => {
    currentFilters.hasHandoffs = handoffsCheckbox.checked;
    applyFiltersAndRender();
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
  });

  setupModal();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAgentsPage);
