/**
 * Contributors page functionality
 */
import { createChoices, getChoicesValues, type Choices } from '../choices';
import { FuzzySearch, type SearchItem } from '../search';
import { fetchData, debounce, escapeHtml } from '../utils';

interface ContributionSymbol {
  type: string;
  symbol: string;
  description: string;
}

interface Contributor extends SearchItem {
  login: string;
  name: string;
  avatar_url: string;
  profile: string;
  contributions: string[];
  contributionSymbols: ContributionSymbol[];
}

interface ContributorsData {
  items: Contributor[];
  filters: {
    contributions: string[];
  };
}

let allItems: Contributor[] = [];
let search = new FuzzySearch<Contributor>();
let contributionSelect: Choices;
let currentFilters = { contributions: [] as string[] };

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const countEl = document.getElementById('results-count');
  const query = searchInput?.value || '';

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.contributions.length > 0) {
    results = results.filter(item =>
      item.contributions.some(c => currentFilters.contributions.includes(c))
    );
  }

  // Sort alphabetically by name
  results = results.sort((a, b) => a.name.localeCompare(b.name));

  renderItems(results, query);

  let countText = `${results.length} of ${allItems.length} contributors`;
  if (currentFilters.contributions.length > 0) {
    countText += ` (filtered by ${currentFilters.contributions.length} contribution type${currentFilters.contributions.length > 1 ? 's' : ''})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Contributor[], query = ''): void {
  const list = document.getElementById('contributor-grid');
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state"><h3>No contributors found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <a class="contributor-card" href="${escapeHtml(item.profile)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.name)}">
      <img class="contributor-avatar" src="${escapeHtml(item.avatar_url)}" alt="${escapeHtml(item.name)}" loading="lazy" width="80" height="80" />
      <div class="contributor-name">${query ? search.highlight(item.name, query) : escapeHtml(item.name)}</div>
      <div class="contributor-login">@${escapeHtml(item.login)}</div>
      <div class="contributor-contributions">
        ${item.contributionSymbols.map(cs =>
          `<span class="contributor-symbol" title="${escapeHtml(cs.description)}">${escapeHtml(cs.symbol)}</span>`
        ).join('')}
      </div>
    </a>
  `
    )
    .join('');
}

export async function initContributorsPage(): Promise<void> {
  const list = document.getElementById('contributor-grid');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearFiltersBtn = document.getElementById('clear-filters');

  const data = await fetchData<ContributorsData>('contributors.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  // Setup contribution type filter
  contributionSelect = createChoices('#filter-contribution', {
    placeholderValue: 'All Contribution Types',
  });
  contributionSelect.setChoices(
    data.filters.contributions.map(c => ({ value: c, label: c })),
    'value',
    'label',
    true
  );
  document.getElementById('filter-contribution')?.addEventListener('change', () => {
    currentFilters.contributions = getChoicesValues(contributionSelect);
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
  searchInput?.addEventListener(
    'input',
    debounce(() => applyFiltersAndRender(), 200)
  );

  clearFiltersBtn?.addEventListener('click', () => {
    currentFilters = { contributions: [] };
    contributionSelect.removeActiveItems();
    if (searchInput) searchInput.value = '';
    applyFiltersAndRender();
  });
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initContributorsPage);
