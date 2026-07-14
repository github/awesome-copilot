/**
 * Agents page functionality
 */
import {
  fetchData,
  getQueryParam,
  setupActionHandlers,
  setupDropdownCloseHandlers,
  updateQueryParams,
} from '../utils';
import {
  renderAgentsHtml,
  sortAgents,
  type AgentSortOption,
  type RenderableAgent,
} from './agents-render';

interface Agent extends RenderableAgent {
  lastUpdated?: string | null;
}

interface AgentsData {
  items: Agent[];
}

let allItems: Agent[] = [];
let currentSort: AgentSortOption = 'title';

function applyFiltersAndRender(): void {
  const countEl = document.getElementById('results-count');
  const results = sortAgents(allItems, currentSort);

  renderItems(results);
  if (countEl) {
    countEl.textContent = `${results.length} agent${results.length === 1 ? '' : 's'}`;
  }
}

function renderItems(items: Agent[]): void {
  const list = document.getElementById('resource-list');
  if (!list) return;

  list.innerHTML = renderAgentsHtml(items);
}

function syncUrlState(): void {
  updateQueryParams({
    q: '',
    model: [],
    tool: [],
    handoffs: false,
    sort: currentSort === 'title' ? '' : currentSort,
  });
}

export async function initAgentsPage(): Promise<void> {
  const list = document.getElementById('resource-list');
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;

  const data = await fetchData<AgentsData>('agents.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  const initialSort = getQueryParam('sort');
  if (initialSort === 'lastUpdated') {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value as AgentSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupDropdownCloseHandlers();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAgentsPage);
