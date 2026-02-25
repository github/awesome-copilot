/**
 * Plugins page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml, getGitHubUrl } from '../utils';
import { setupModal, openFileModal } from '../modal';

interface Plugin extends SearchItem {
  id: string;
  name: string;
  path: string;
  tags?: string[];
  featured?: boolean;
  itemCount: number;
}

interface PluginsData {
  items: Plugin[];
  filters: {
    tags: string[];
  };
}

const resourceType = 'plugin';
let allItems: Plugin[] = [];
let search = new FuzzySearch<Plugin>();
let tagSelect: Choices;
let currentFilters = {
  tags: [] as string[],
  featured: false
};

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.tags.length > 0) {
    results = results.filter(item => item.tags?.some(tag => currentFilters.tags.includes(tag)));
  }
  if (currentFilters.featured) {
    results = results.filter(item => item.featured);
  }

  renderItems(results, query);
  const activeFilters: string[] = [];
  if (currentFilters.tags.length > 0) activeFilters.push(`${currentFilters.tags.length} tag${currentFilters.tags.length > 1 ? 's' : ''}`);
  if (currentFilters.featured) activeFilters.push('featured');
  let countText = `${results.length} of ${allItems.length} plugins`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(', ')})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Plugin[], query = ''): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><h3>No plugins found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="resource-item" data-path="${escapeHtml(item.path)}">
      <div class="resource-info">
        <div class="resource-title">${item.featured ? '⭐ ' : ''}${query ? search.highlight(item.name, query) : escapeHtml(item.name)}</div>
        <div class="resource-description">${escapeHtml(item.description || 'No description')}</div>
        <div class="resource-meta">
          <span class="resource-tag">${item.itemCount} items</span>
          ${item.tags?.slice(0, 4).map(t => `<span class="resource-tag">${escapeHtml(t)}</span>`).join('') || ''}
          ${item.tags && item.tags.length > 4 ? `<span class="resource-tag">+${item.tags.length - 4} more</span>` : ''}
        </div>
      </div>
      <div class="resource-actions">
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
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

export async function initPluginsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const featuredCheckbox = document.getElementById('filter-featured') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');

  const data = await fetchData<PluginsData>('plugins.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  // Map plugin items to search items
  const searchItems = allItems.map(item => ({
    ...item,
    title: item.name,
    searchText: `${item.name} ${item.description} ${item.tags?.join(' ') || ''}`.toLowerCase()
  }));
  search.setItems(searchItems);

  tagSelect = createChoices('#filter-tag', { placeholderValue: 'All Tags' });
  tagSelect.setChoices(data.filters.tags.map(t => ({ value: t, label: t })), 'value', 'label', true);
  document.getElementById('filter-tag')?.addEventListener('change', () => {
    currentFilters.tags = getChoicesValues(tagSelect);
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
  searchInput?.addEventListener('input', debounce(() => applyFiltersAndRender(), 200));

  featuredCheckbox?.addEventListener('change', () => {
    currentFilters.featured = featuredCheckbox.checked;
    applyFiltersAndRender();
  });

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { tags: [], featured: false };
    tagSelect.removeActiveItems();
    if (featuredCheckbox) featuredCheckbox.checked = false;
    if (searchInput) searchInput.value = '';
    applyFiltersAndRender();
  });

  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPluginsPage);
