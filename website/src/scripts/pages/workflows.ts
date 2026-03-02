/**
 * Workflows page functionality
 */
import { createChoices, getChoicesValues, type Choices } from "../choices";
import { FuzzySearch, type SearchItem } from "../search";
import {
  fetchData,
  debounce,
  escapeHtml,
  getGitHubUrl,
  getActionButtonsHtml,
  setupActionHandlers,
  getLastUpdatedHtml,
} from "../utils";
import { setupModal, openFileModal } from "../modal";

interface Workflow extends SearchItem {
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

type SortOption = "title" | "lastUpdated";

const resourceType = "workflow";
let allItems: Workflow[] = [];
let search = new FuzzySearch<Workflow>();
let triggerSelect: Choices;
let currentFilters = {
  triggers: [] as string[],
};
let currentSort: SortOption = "title";

function sortItems(items: Workflow[]): Workflow[] {
  return [...items].sort((a, b) => {
    if (currentSort === "lastUpdated") {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }
    return a.title.localeCompare(b.title);
  });
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

  if (items.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><h3>No workflows found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <div class="resource-item" data-path="${escapeHtml(item.path)}">
      <div class="resource-info">
        <div class="resource-title">${
          query ? search.highlight(item.title, query) : escapeHtml(item.title)
        }</div>
        <div class="resource-description">${escapeHtml(
          item.description || "No description"
        )}</div>
        <div class="resource-meta">
          ${item.triggers
            .map(
              (t) =>
                `<span class="resource-tag tag-trigger">${escapeHtml(t)}</span>`
            )
            .join("")}
          ${getLastUpdatedHtml(item.lastUpdated)}
        </div>
      </div>
      <div class="resource-actions">
        ${getActionButtonsHtml(item.path)}
        <a href="${getGitHubUrl(
          item.path
        )}" class="btn btn-secondary" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
      </div>
    </div>
  `
    )
    .join("");

  // Add click handlers for opening modal
  list.querySelectorAll(".resource-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".resource-actions")) return;
      const path = (el as HTMLElement).dataset.path;
      if (path) openFileModal(path, resourceType);
    });
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
  document.getElementById("filter-trigger")?.addEventListener("change", () => {
    currentFilters.triggers = getChoicesValues(triggerSelect);
    applyFiltersAndRender();
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as SortOption;
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
  searchInput?.addEventListener(
    "input",
    debounce(() => applyFiltersAndRender(), 200)
  );

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { triggers: [] };
    currentSort = "title";
    triggerSelect.removeActiveItems();
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
  });

  setupModal();
  setupActionHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initWorkflowsPage);
