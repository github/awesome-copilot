/**
 * Tools page functionality
 */
import {
  fetchData,
  getQueryParam,
  updateQueryParams,
} from "../utils";
import {
  renderToolsHtml,
  sortTools,
  type ToolSortOption,
} from "./tools-render";

export interface Tool {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  requirements: string[];
  features: string[];
  links: {
    blog?: string;
    vscode?: string;
    "vscode-insiders"?: string;
    "visual-studio"?: string;
    github?: string;
    documentation?: string;
    marketplace?: string;
    npm?: string;
    pypi?: string;
  };
  configuration?: {
    type: string;
    content: string;
  };
  tags: string[];
}

interface ToolsData {
  items: Tool[];
  filters: {
    categories: string[];
    tags: string[];
  };
}

let allItems: Tool[] = [];
let currentFilters = {
  categories: [] as string[],
};
let currentSort: ToolSortOption = "featured";
let copyHandlersReady = false;
let initialized = false;

function sortItems(items: Tool[]): Tool[] {
  return sortTools(items, currentSort);
}

function getCountText(resultsCount: number): string {
  if (currentFilters.categories.length === 0) {
    return `${resultsCount} tool${resultsCount === 1 ? "" : "s"}`;
  }

  return `${resultsCount} of ${allItems.length} tools (filtered by ${currentFilters.categories.length} categor${currentFilters.categories.length === 1 ? "y" : "ies"})`;
}

function applyFiltersAndRender(): void {
  const countEl = document.getElementById("results-count");
  let results = [...allItems];

  if (currentFilters.categories.length > 0) {
    results = results.filter((item) =>
      currentFilters.categories.includes(item.category)
    );
  }

  results = sortItems(results);

  renderTools(results);
  if (countEl) countEl.textContent = getCountText(results.length);
}

function renderTools(tools: Tool[]): void {
  const container = document.getElementById("tools-list");
  if (!container) return;
  container.innerHTML = renderToolsHtml(tools);
}

function syncUrlState(): void {
  updateQueryParams({
    q: "",
    category: currentFilters.categories,
    sort: currentSort === "featured" ? "" : currentSort,
  });
}

function setupCopyConfigHandlers(): void {
  if (copyHandlersReady) return;

  document.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest(
      ".copy-config-btn"
    ) as HTMLButtonElement | null;
    if (!button) return;

    event.stopPropagation();
    const config = decodeURIComponent(button.dataset.config || "");
    try {
      await navigator.clipboard.writeText(config);
      button.classList.add("copied");
      const originalHtml = button.innerHTML;
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = originalHtml;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });

  copyHandlersReady = true;
}

export async function initToolsPage(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const categoryFilter = document.getElementById(
    "filter-category"
  ) as HTMLSelectElement;
  const clearFiltersBtn = document.getElementById("clear-filters");
  const sortSelect = document.getElementById("sort-select") as HTMLSelectElement;

  const data = await fetchData<ToolsData>("tools.json");
  if (!data || !data.items) {
    const container = document.getElementById("tools-list");
    if (container)
      container.innerHTML =
        '<div class="empty-state"><h3>Failed to load tools</h3></div>';
    return;
  }

  // Map items to include title for FuzzySearch
  allItems = data.items.map((item) => ({
    ...item,
    title: item.name, // FuzzySearch uses title
  }));

  // Populate category filter
  if (categoryFilter && data.filters.categories) {
    categoryFilter.innerHTML =
      '<option value="">All Categories</option>' +
      data.filters.categories
        .map(
          (c) => `<option value="${c}">${c}</option>`
        )
        .join("");

    const initialCategory = getQueryParam("category");
    if (initialCategory && data.filters.categories.includes(initialCategory)) {
      currentFilters.categories = [initialCategory];
      categoryFilter.value = initialCategory;
    }

    categoryFilter.addEventListener("change", () => {
      currentFilters.categories = categoryFilter.value
        ? [categoryFilter.value]
        : [];
      applyFiltersAndRender();
      syncUrlState();
    });
  }

  const initialSort = getQueryParam("sort");
  if (initialSort === "title") {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }
  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as ToolSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  syncUrlState();

  // Clear filters
  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { categories: [] };
    currentSort = "featured";
    if (categoryFilter) categoryFilter.value = "";
    if (sortSelect) sortSelect.value = "featured";
    applyFiltersAndRender();
    syncUrlState();
  });

  setupCopyConfigHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initToolsPage);
