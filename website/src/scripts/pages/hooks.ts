/**
 * Hooks page functionality
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
  showToast,
  downloadZipBundle,
  updateQueryParams,
} from "../utils";
import { setupModal, openFileModal } from "../modal";
import {
  renderHooksHtml,
  sortHooks,
  type HookSortOption,
  type RenderableHook,
} from "./hooks-render";

interface Hook extends SearchItem, RenderableHook {}

interface HooksData {
  items: Hook[];
  filters: {
    hooks: string[];
    tags: string[];
  };
}

const resourceType = "hook";
let allItems: Hook[] = [];
let search = new FuzzySearch<Hook>();
let hookSelect: Choices;
let tagSelect: Choices;
let currentFilters = {
  hooks: [] as string[],
  tags: [] as string[],
};
let currentSort: HookSortOption = "title";
let resourceListHandlersReady = false;

function sortItems(items: Hook[]): Hook[] {
  return sortHooks(items, currentSort);
}

function applyFiltersAndRender(): void {
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const countEl = document.getElementById("results-count");
  const query = searchInput?.value || "";

  let results = query ? search.search(query) : [...allItems];

  if (currentFilters.hooks.length > 0) {
    results = results.filter((item) =>
      item.hooks.some((h) => currentFilters.hooks.includes(h))
    );
  }
  if (currentFilters.tags.length > 0) {
    results = results.filter((item) =>
      item.tags.some((t) => currentFilters.tags.includes(t))
    );
  }

  results = sortItems(results);

  renderItems(results, query);
  const activeFilters: string[] = [];
  if (currentFilters.hooks.length > 0)
    activeFilters.push(
      `${currentFilters.hooks.length} hook event${
        currentFilters.hooks.length > 1 ? "s" : ""
      }`
    );
  if (currentFilters.tags.length > 0)
    activeFilters.push(
      `${currentFilters.tags.length} tag${
        currentFilters.tags.length > 1 ? "s" : ""
      }`
    );
  let countText = `${results.length} of ${allItems.length} hooks`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(", ")})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Hook[], query = ""): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  list.innerHTML = renderHooksHtml(items, {
    query,
    highlightTitle: (title, highlightQuery) =>
      search.highlight(title, highlightQuery),
  });
}

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const downloadButton = target.closest(
      ".download-hook-btn"
    ) as HTMLButtonElement | null;
    if (downloadButton) {
      event.stopPropagation();
      const hookId = downloadButton.dataset.hookId;
      if (hookId) downloadHook(hookId, downloadButton);
      return;
    }

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
    hook: currentFilters.hooks,
    tag: currentFilters.tags,
    sort: currentSort === "title" ? "" : currentSort,
  });
}

async function downloadHook(
  hookId: string,
  btn: HTMLButtonElement
): Promise<void> {
  const hook = allItems.find((item) => item.id === hookId);
  if (!hook) {
    showToast("Hook not found.", "error");
    return;
  }

  // Build file list: README.md + all assets
  const files = [
    { name: "README.md", path: hook.readmeFile },
    ...hook.assets.map((a) => ({
      name: a,
      path: `${hook.path}/${a}`,
    })),
  ];

  if (files.length === 0) {
    showToast("No files found for this hook.", "error");
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<svg class="spinner" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 8 1.5V0z"/></svg> Preparing...';

  try {
    await downloadZipBundle(hook.id, files);

    btn.innerHTML =
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg> Downloaded!';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download failed.";
    showToast(message, "error");
    btn.innerHTML =
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg> Failed';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

export async function initHooksPage(): Promise<void> {
  const list = document.getElementById("resource-list");
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const clearFiltersBtn = document.getElementById("clear-filters");
  const sortSelect = document.getElementById(
    "sort-select"
  ) as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<HooksData>("hooks.json");
  if (!data || !data.items) {
    if (list)
      list.innerHTML =
        '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  // Setup hook event filter
  hookSelect = createChoices("#filter-hook", {
    placeholderValue: "All Events",
  });
  hookSelect.setChoices(
    data.filters.hooks.map((h) => ({ value: h, label: h })),
    "value",
    "label",
    true
  );

  const initialQuery = getQueryParam("q");
  const initialHooks = getQueryParamValues("hook").filter((hook) =>
    data.filters.hooks.includes(hook)
  );
  const initialTags = getQueryParamValues("tag").filter((tag) =>
    data.filters.tags.includes(tag)
  );
  const initialSort = getQueryParam("sort");

  if (searchInput) searchInput.value = initialQuery;
  if (initialHooks.length > 0) {
    currentFilters.hooks = initialHooks;
    setChoicesValues(hookSelect, initialHooks);
  }

  document.getElementById("filter-hook")?.addEventListener("change", () => {
    currentFilters.hooks = getChoicesValues(hookSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  // Setup tag filter
  tagSelect = createChoices("#filter-tag", {
    placeholderValue: "All Tags",
  });
  tagSelect.setChoices(
    data.filters.tags.map((t) => ({ value: t, label: t })),
    "value",
    "label",
    true
  );
  if (initialTags.length > 0) {
    currentFilters.tags = initialTags;
    setChoicesValues(tagSelect, initialTags);
  }
  document.getElementById("filter-tag")?.addEventListener("change", () => {
    currentFilters.tags = getChoicesValues(tagSelect);
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  if (initialSort === "lastUpdated") {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }
  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as HookSortOption;
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  applyFiltersAndRender();
  searchInput?.addEventListener(
    "input",
    debounce(() => {
      applyFiltersAndRender();
      syncUrlState(searchInput);
    }, 200)
  );

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { hooks: [], tags: [] };
    currentSort = "title";
    hookSelect.removeActiveItems();
    tagSelect.removeActiveItems();
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
    syncUrlState(searchInput);
  });

  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initHooksPage);
