/**
 * Workflows page functionality
 */
import {
  createChoices,
  getChoicesValues,
  setChoicesValues,
  type Choices,
} from "../choices";
import {
  fetchData,
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

const resourceType = "workflow";
let allItems: Workflow[] = [];
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
  const countEl = document.getElementById("results-count");
  let results = [...allItems];

  if (currentFilters.triggers.length > 0) {
    results = results.filter((item) =>
      item.triggers.some((trigger) => currentFilters.triggers.includes(trigger))
    );
  }

  results = sortItems(results);

  renderItems(results);
  let countText = `${results.length} workflow${results.length === 1 ? "" : "s"}`;
  if (currentFilters.triggers.length > 0) {
    countText = `${results.length} of ${allItems.length} workflows (filtered by ${currentFilters.triggers.length} trigger${currentFilters.triggers.length > 1 ? "s" : ""})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Workflow[]): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  list.innerHTML = renderWorkflowsHtml(items);
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

function syncUrlState(): void {
  updateQueryParams({
    q: "",
    trigger: currentFilters.triggers,
    sort: currentSort === "title" ? "" : currentSort,
  });
}

export async function initWorkflowsPage(): Promise<void> {
  const list = document.getElementById("resource-list");
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

  triggerSelect = createChoices("#filter-trigger", {
    placeholderValue: "All Triggers",
  });
  triggerSelect.setChoices(
    data.filters.triggers.map((trigger) => ({ value: trigger, label: trigger })),
    "value",
    "label",
    true
  );

  const initialTriggers = getQueryParamValues("trigger").filter((trigger) =>
    data.filters.triggers.includes(trigger)
  );
  const initialSort = getQueryParam("sort");

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
    syncUrlState();
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as WorkflowSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { triggers: [] };
    currentSort = "title";
    triggerSelect.removeActiveItems();
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupModal();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initWorkflowsPage);
