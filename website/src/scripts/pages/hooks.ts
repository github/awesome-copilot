/**
 * Hooks page functionality
 */
import { createChoices, getChoicesValues, type Choices } from "../choices";
import { FuzzySearch, type SearchItem } from "../search";
import {
  fetchData,
  debounce,
  escapeHtml,
  getGitHubUrl,
  getRawGitHubUrl,
  showToast,
  getLastUpdatedHtml,
} from "../utils";
import { setupModal, openFileModal } from "../modal";
import JSZip from "../jszip";

interface Hook extends SearchItem {
  id: string;
  path: string;
  readmeFile: string;
  hooks: string[];
  tags: string[];
  assets: string[];
  lastUpdated?: string | null;
}

interface HooksData {
  items: Hook[];
  filters: {
    hooks: string[];
    tags: string[];
  };
}

type SortOption = "title" | "lastUpdated";

const resourceType = "hook";
let allItems: Hook[] = [];
let search = new FuzzySearch<Hook>();
let hookSelect: Choices;
let tagSelect: Choices;
let currentFilters = {
  hooks: [] as string[],
  tags: [] as string[],
};
let currentSort: SortOption = "title";

function sortItems(items: Hook[]): Hook[] {
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

  if (items.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><h3>No hooks found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <div class="resource-item" data-path="${escapeHtml(
      item.readmeFile
    )}" data-hook-id="${escapeHtml(item.id)}">
      <div class="resource-info">
        <div class="resource-title">${
          query ? search.highlight(item.title, query) : escapeHtml(item.title)
        }</div>
        <div class="resource-description">${escapeHtml(
          item.description || "No description"
        )}</div>
        <div class="resource-meta">
          ${item.hooks
            .map(
              (h) =>
                `<span class="resource-tag tag-hook">${escapeHtml(h)}</span>`
            )
            .join("")}
          ${item.tags
            .map(
              (t) =>
                `<span class="resource-tag tag-tag">${escapeHtml(t)}</span>`
            )
            .join("")}
          ${
            item.assets.length > 0
              ? `<span class="resource-tag tag-assets">${
                  item.assets.length
                } asset${item.assets.length === 1 ? "" : "s"}</span>`
              : ""
          }
          ${getLastUpdatedHtml(item.lastUpdated)}
        </div>
      </div>
      <div class="resource-actions">
        <button class="btn btn-primary download-hook-btn" data-hook-id="${escapeHtml(
          item.id
        )}" title="Download as ZIP">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"/>
          </svg>
          Download
        </button>
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

  // Add download handlers
  list.querySelectorAll(".download-hook-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const hookId = (btn as HTMLElement).dataset.hookId;
      if (hookId) downloadHook(hookId, btn as HTMLButtonElement);
    });
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
    const zip = new JSZip();
    const folder = zip.folder(hook.id);

    const fetchPromises = files.map(async (file) => {
      const url = getRawGitHubUrl(file.path);
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const content = await response.text();
        return { name: file.name, content };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    let addedFiles = 0;
    for (const result of results) {
      if (result && folder) {
        folder.file(result.name, result.content);
        addedFiles++;
      }
    }

    if (addedFiles === 0) throw new Error("Failed to fetch any files");

    const blob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${hook.id}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

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
  document.getElementById("filter-hook")?.addEventListener("change", () => {
    currentFilters.hooks = getChoicesValues(hookSelect);
    applyFiltersAndRender();
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
  document.getElementById("filter-tag")?.addEventListener("change", () => {
    currentFilters.tags = getChoicesValues(tagSelect);
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
    currentFilters = { hooks: [], tags: [] };
    currentSort = "title";
    hookSelect.removeActiveItems();
    tagSelect.removeActiveItems();
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
  });

  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initHooksPage);
