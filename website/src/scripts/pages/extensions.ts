/**
 * Canvas extensions page functionality
 */
import {
  copyToClipboard,
  fetchData,
  getQueryParam,
  showToast,
  updateQueryParams,
} from "../utils";
import {
  renderExtensionsHtml,
  sortExtensions,
  type ExtensionSortOption,
  type RenderableExtension,
} from "./extensions-render";

interface Extension extends RenderableExtension {
  lastUpdated?: string | null;
}

interface ExtensionsData {
  items: Extension[];
}

let allItems: Extension[] = [];
let currentSort: ExtensionSortOption = "title";
let actionHandlersReady = false;

function applySortAndRender(): void {
  const countEl = document.getElementById("results-count");
  const results = sortExtensions(allItems, currentSort);

  renderItems(results);
  if (countEl) {
    countEl.textContent = `${results.length} extension${results.length === 1 ? "" : "s"}`;
  }
}

function renderItems(items: Extension[]): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  list.innerHTML = renderExtensionsHtml(items);
}

function setupActionHandlers(list: HTMLElement | null): void {
  if (!list || actionHandlersReady) return;

  list.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const installButton = target.closest(
      ".copy-install-url-btn"
    ) as HTMLButtonElement | null;

    if (!installButton) return;

    event.stopPropagation();
    const installUrl = installButton.dataset.installUrl || "";
    const success = await copyToClipboard(installUrl);
    showToast(
      success ? "Install URL copied!" : "Failed to copy install URL",
      success ? "success" : "error"
    );
  });

  actionHandlersReady = true;
}

function syncUrlState(): void {
  updateQueryParams({
    sort: currentSort === "title" ? "" : currentSort,
  });
}

export async function initExtensionsPage(): Promise<void> {
  const list = document.getElementById("resource-list");
  const sortSelect = document.getElementById(
    "sort-select"
  ) as HTMLSelectElement;

  setupActionHandlers(list as HTMLElement | null);

  const data = await fetchData<ExtensionsData>("extensions.json");
  if (!data || !data.items) {
    if (list)
      list.innerHTML =
        '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;

  const initialSort = getQueryParam("sort");
  if (initialSort === "lastUpdated") {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as ExtensionSortOption;
    applySortAndRender();
    syncUrlState();
  });

  applySortAndRender();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initExtensionsPage);
