/**
 * Tools page functionality
 */
import { FuzzySearch, type SearchableItem } from "../search";
import { fetchData, debounce } from "../utils";
import { renderToolsHtml } from "./tools-render";

export interface Tool extends SearchableItem {
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
let search = new FuzzySearch<Tool>();
let currentFilters = {
  categories: [] as string[],
  query: "",
};
let copyHandlersReady = false;
let initialized = false;

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const countEl = document.getElementById("results-count");
  const query = searchInput?.value || "";
  currentFilters.query = query;

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.categories.length > 0) {
    results = results.filter((item) =>
      currentFilters.categories.includes(item.category)
    );
  }

  renderTools(results, query);

  let countText = `${results.length} of ${allItems.length} tools`;
  if (currentFilters.categories.length > 0) {
    countText += ` (filtered by ${currentFilters.categories.length} categories)`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderTools(tools: Tool[], query = ""): void {
  const container = document.getElementById("tools-list");
  if (!container) return;
  container.innerHTML = renderToolsHtml(tools, {
    query,
    highlightTitle: (title, highlightQuery) =>
      search.highlight(title, highlightQuery),
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

  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const categoryFilter = document.getElementById(
    "filter-category"
  ) as HTMLSelectElement;
  const clearFiltersBtn = document.getElementById("clear-filters");

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

  search = new FuzzySearch<Tool>();
  search.setItems(allItems);

  // Populate category filter
  if (categoryFilter && data.filters.categories) {
    categoryFilter.innerHTML =
      '<option value="">All Categories</option>' +
      data.filters.categories
        .map(
          (c) => `<option value="${c}">${c}</option>`
        )
        .join("");

    categoryFilter.addEventListener("change", () => {
      currentFilters.categories = categoryFilter.value
        ? [categoryFilter.value]
        : [];
      applyFiltersAndRender();
    });
  }

  // Search input handler
  searchInput?.addEventListener(
    "input",
    debounce(() => applyFiltersAndRender(), 200)
  );

  // Clear filters
  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { categories: [], query: "" };
    if (categoryFilter) categoryFilter.value = "";
    if (searchInput) searchInput.value = "";
    applyFiltersAndRender();
  });

  setupCopyConfigHandlers();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initToolsPage);
