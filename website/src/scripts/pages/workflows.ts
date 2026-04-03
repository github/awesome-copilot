/**
 * Workflows page functionality
 */
import {
  createChoices,
  getChoicesValues,
  setChoicesValues,
  type Choices,
} from "../choices";
import { FuzzySearch, type SearchItem } from "../search";
import {
  fetchData,
  debounce,
  getQueryParam,
  getQueryParamValues,
  setupActionHandlers,
  updateQueryParams,
} from "../utils";
import { setupModal, openFileModal } from "../modal";
import {
  renderWorkflowsHtml,
  sortWorkflows,
  type RenderableWorkflow,
  type WorkflowSortOption,
} from "./workflows-render";

interface Workflow extends SearchItem, RenderableWorkflow {
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

const resourceType = "workflow";
let allItems: Workflow[] = [];
let search = new FuzzySearch<Workflow>();
let triggerSelect: Choices;
let currentFilters = {
  triggers: [] as string[],
};
let currentSort: WorkflowSortOption = "title";
let resourceListHandlersReady = false;

function sortItems(items: Workflow[]): Workflow[] {
  return sortWorkflows(items, currentSort);
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const countEl = document.getElementById("results-count");
  const query = searchInput?.value || "";

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.triggers.length > 0) {
    results = results.filter((item) =>
      item.triggers.some((t) => currentFilters.triggers.includes(t))
    );
  }

  results = sortItems(results);

  renderItems(results, query);
  const activeFilters: string[] = [];
  if (currentFilters.triggers.length > 0)
    activeFilters.push(
      `${currentFilters.triggers.length} trigger${
        currentFilters.triggers.length > 1 ? "s" : ""
      }`
    );
  let countText = `${results.length} of ${allItems.length} workflows`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(", ")})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Workflow[], query = ""): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  list.innerHTML = renderWorkflowsHtml(items, {
    query,
    highlightTitle: (title, highlightQuery) =>
      search.highlight(title, highlightQuery),
  });
}

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".resource-actions")) {
      return;
    }

    const item = target.closest(".resource-item") as HTMLElement | null;
    const path = item?.dataset.path;
    if (path) {
      openFileModal(path, resourceType);
    }
  });

  resourceListHandlersReady = true;
}

function syncUrlState(searchInput: HTMLInputElement | null): void {
  updateQueryParams({
    q: searchInput?.value ?? "",
    trigger: currentFilters.triggers,
    sort: currentSort === "title" ? "" : currentSort,
  });
}

export async function initWorkflowsPage(): Promise<void> {
  const list = document.getElementById("resource-list");
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const clearFiltersBtn = document.getElementById("clear-filters");
  const sortSelect = document.getElementById(
    "sort-select"
  ) as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<WorkflowsData>("workflows.json");
  if (!data || !data.items) {
    if (list)
      list.innerHTML =
        '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  // Setup trigger filter
  triggerSelect = createChoices("#filter-trigger", {
    placeholderValue: "All Triggers",
  });
  triggerSelect.setChoices(
    data.filters.triggers.map((t) => ({ value: t, label: t })),
    "value",
    "label",
    true
  );

  const initialQuery = getQueryParam("q");
  const initialTriggers = getQueryParamValues("trigger").filter((trigger) =>
    data.filters.triggers.includes(trigger)
  );
  const initialSort = getQueryParam("sort");

  if (searchInput) searchInput.value = initialQuery;
  if (initialTriggers.length > 0) {
    currentFilters.triggers = initialTriggers;
    setChoicesValues(triggerSelect, initialTriggers);
  }
  if (initialSort === "lastUpdated") {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  document.getElementById("filter-trigger")?.addEventListener("change", () => {
    currentFilters.triggers = getChoicesValues(triggerSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as WorkflowSortOption;
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  const countEl = document.getElementById("results-count");
  if (countEl) {
    countEl.textContent = `${allItems.length} of ${allItems.length} workflows`;
  }

  searchInput?.addEventListener(
    "input",
    debounce(() => {
      applyFiltersAndRender();
      syncUrlState(searchInput);
    }, 200)
  );

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { triggers: [] };
    currentSort = "title";
    triggerSelect.removeActiveItems();
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  applyFiltersAndRender();
  setupModal();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initWorkflowsPage);
