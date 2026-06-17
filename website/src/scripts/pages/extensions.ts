/**
 * Canvas extensions page functionality
 */
import {
  createChoices,
  getChoicesValues,
  setChoicesValues,
  type Choices,
} from "../choices";
import {
  copyToClipboard,
  fetchData,
  getQueryParam,
  getQueryParamValues,
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
  keywords?: string[];
}

interface ExtensionsData {
  items: Extension[];
  filters?: {
    keywords?: string[];
  };
}

let allItems: Extension[] = [];
let currentSort: ExtensionSortOption = "title";
let keywordSelect: Choices;
let currentFilters = {
  keywords: [] as string[],
};
let actionHandlersReady = false;

function openPreviewModal(url: string, alt: string): void {
  const modal = document.getElementById("extension-preview-modal");
  const image = document.getElementById("extension-preview-image") as HTMLImageElement | null;
  const title = document.getElementById("extension-preview-title");

  if (!modal || !image || !title) return;

  image.src = url;
  image.alt = alt;
  title.textContent = alt.replace(/ preview$/i, "");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closePreviewModal(): void {
  const modal = document.getElementById("extension-preview-modal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function sortItems(items: Extension[]): Extension[] {
  return sortExtensions(items, currentSort);
}

function getCountText(resultsCount: number): string {
  if (currentFilters.keywords.length === 0) {
    return `${resultsCount} extension${resultsCount === 1 ? "" : "s"}`;
  }

  return `${resultsCount} of ${allItems.length} extensions (filtered by ${currentFilters.keywords.length} keyword${currentFilters.keywords.length === 1 ? "" : "s"})`;
}

function applySortAndRender(): void {
  const countEl = document.getElementById("results-count");
  let results = [...allItems];

  if (currentFilters.keywords.length > 0) {
    results = results.filter((item) =>
      item.keywords?.some((keyword) => currentFilters.keywords.includes(keyword))
    );
  }

  results = sortItems(results);

  renderItems(results);
  if (countEl) {
    countEl.textContent = getCountText(results.length);
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
    const thumbnailButton = target.closest(
      ".resource-thumbnail-btn"
    ) as HTMLButtonElement | null;

    if (thumbnailButton) {
      event.preventDefault();
      event.stopPropagation();
      openPreviewModal(
        thumbnailButton.dataset.previewUrl || "",
        thumbnailButton.dataset.previewAlt || "Extension preview"
      );
      return;
    }

    const installButton = target.closest(
      ".copy-install-url-btn"
    ) as HTMLButtonElement | null;

    if (!installButton) return;

    event.stopPropagation();
    const installUrl = installButton.dataset.installUrl || "";
    if (!installUrl) {
      showToast("No install URL available for this extension", "error");
      return;
    }
    const success = await copyToClipboard(installUrl);
    showToast(
      success ? "Install URL copied!" : "Failed to copy install URL",
      success ? "success" : "error"
    );
  });

  const modal = document.getElementById("extension-preview-modal");
  const closeButton = document.getElementById("extension-preview-close");

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closePreviewModal();
      }
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closePreviewModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePreviewModal();
    }
  });

  actionHandlersReady = true;
}

function syncUrlState(): void {
  updateQueryParams({
    q: "",
    keyword: currentFilters.keywords,
    sort: currentSort === "title" ? "" : currentSort,
  });
}

export async function initExtensionsPage(): Promise<void> {
  const list = document.getElementById("resource-list");
  const clearFiltersBtn = document.getElementById("clear-filters");
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

  const availableKeywords = (
    data.filters?.keywords ||
    Array.from(
      new Set(
        data.items.flatMap((item) =>
          Array.isArray(item.keywords) ? item.keywords : []
        )
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  keywordSelect = createChoices("#filter-keyword", {
    placeholderValue: "All Keywords",
  });
  keywordSelect.setChoices(
    availableKeywords.map((keyword) => ({ value: keyword, label: keyword })),
    "value",
    "label",
    true
  );

  const initialKeywords = getQueryParamValues("keyword").filter((keyword) =>
    availableKeywords.includes(keyword)
  );
  const initialSort = getQueryParam("sort");
  if (initialKeywords.length > 0) {
    currentFilters.keywords = initialKeywords;
    setChoicesValues(keywordSelect, initialKeywords);
  }
  if (initialSort === "lastUpdated") {
    currentSort = initialSort;
    if (sortSelect) sortSelect.value = initialSort;
  }

  document.getElementById("filter-keyword")?.addEventListener("change", () => {
    currentFilters.keywords = getChoicesValues(keywordSelect);
    applySortAndRender();
    syncUrlState();
  });

  sortSelect?.addEventListener("change", () => {
    currentSort = sortSelect.value as ExtensionSortOption;
    applySortAndRender();
    syncUrlState();
  });

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { keywords: [] };
    currentSort = "title";
    keywordSelect.removeActiveItems();
    if (sortSelect) sortSelect.value = "title";
    applySortAndRender();
    syncUrlState();
  });

  applySortAndRender();
  syncUrlState();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initExtensionsPage);
