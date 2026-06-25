/**
 * Agents page functionality
 */
import {
  escapeHtml,
  fetchData,
  formatRelativeTime,
  getQueryParam,
  getVSCodeInstallUrl,
  setupActionHandlers,
  setupDropdownCloseHandlers,
  updateQueryParams,
} from '../utils';
import { openCardDetailsModal, setupModal } from '../modal';
import {
  renderAgentsHtml,
  sortAgents,
  type AgentSortOption,
  type RenderableAgent,
} from './agents-render';

interface Agent extends RenderableAgent {
  id?: string;
  lastUpdated?: string | null;
}

interface AgentsData {
  items: Agent[];
}

let allItems: Agent[] = [];
let agentByPath = new Map<string, Agent>();
let currentSort: AgentSortOption = 'title';
let resourceListHandlersReady = false;
let modalReady = false;

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

function openAgentDetailsModal(path: string, trigger?: HTMLElement): void {
  const item = agentByPath.get(path);
  if (!item) {
    return;
  }

  const metaParts: string[] = [];
  if (item.model) {
    metaParts.push(
      `<span class="resource-tag tag-model">${escapeHtml(
        Array.isArray(item.model) ? item.model.join(', ') : item.model
      )}</span>`
    );
  }

  if (item.hasHandoffs) {
    metaParts.push('<span class="resource-tag tag-handoffs">handoffs</span>');
  }

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const toolItems = item.tools || [];
  const displayTools = toolItems.slice(0, 24);
  const tagParts = displayTools.map(
    (tool) => `<span class="resource-tag">${escapeHtml(tool)}</span>`
  );
  if (toolItems.length > displayTools.length) {
    tagParts.push(
      `<span class="resource-tag">+${toolItems.length - displayTools.length} more</span>`
    );
  }

  const vscodeUrl = getVSCodeInstallUrl('agent', path, false);
  const insidersUrl = getVSCodeInstallUrl('agent', path, true);
  const actions = [
    vscodeUrl
      ? `<a class="btn btn-primary btn-small" href="${escapeHtml(vscodeUrl)}" target="_blank" rel="noopener noreferrer">Install (VS Code)</a>`
      : '',
    insidersUrl
      ? `<a class="btn btn-secondary btn-small" href="${escapeHtml(insidersUrl)}" target="_blank" rel="noopener noreferrer">Install (Insiders)</a>`
      : '',
    `<button class="btn btn-secondary btn-small" type="button" data-open-file-path="${escapeHtml(
      path
    )}" data-open-file-type="agent">Source</button>`,
  ].filter(Boolean);

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '🤖',
    previewText: 'Agent metadata and install options',
    metaHtml: metaParts.join(''),
    tagsHtml: tagParts.join(''),
    actionsHtml: actions.join(''),
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
      openAgentDetailsModal(path, button);
    }
  });

  resourceListHandlersReady = true;
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

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<AgentsData>('agents.json');
  if (!data || !data.items) {
    if (list) list.innerHTML = '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  agentByPath = new Map(allItems.map((item) => [item.path, item]));

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
