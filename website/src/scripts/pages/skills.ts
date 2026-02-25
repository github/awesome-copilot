/**
 * Skills page functionality
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

interface SkillFile {
  name: string;
  path: string;
}

interface Skill extends SearchItem {
  id: string;
  path: string;
  skillFile: string;
  category: string;
  hasAssets: boolean;
  assetCount: number;
  files: SkillFile[];
  lastUpdated?: string | null;
}

interface SkillsData {
  items: Skill[];
  filters: {
    categories: string[];
  };
}

type SortOption = 'title' | 'lastUpdated';

const resourceType = "skill";
let allItems: Skill[] = [];
let search = new FuzzySearch<Skill>();
let categorySelect: Choices;
let currentFilters = {
  categories: [] as string[],
  hasAssets: false,
};
let currentSort: SortOption = 'title';

function sortItems(items: Skill[]): Skill[] {
  return [...items].sort((a, b) => {
    if (currentSort === 'lastUpdated') {
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

  if (currentFilters.categories.length > 0) {
    results = results.filter((item) =>
      currentFilters.categories.includes(item.category)
    );
  }
  if (currentFilters.hasAssets) {
    results = results.filter((item) => item.hasAssets);
  }

  results = sortItems(results);

  renderItems(results, query);
  const activeFilters: string[] = [];
  if (currentFilters.categories.length > 0)
    activeFilters.push(
      `${currentFilters.categories.length} categor${
        currentFilters.categories.length > 1 ? "ies" : "y"
      }`
    );
  if (currentFilters.hasAssets) activeFilters.push("has assets");
  let countText = `${results.length} of ${allItems.length} skills`;
  if (activeFilters.length > 0) {
    countText += ` (filtered by ${activeFilters.join(", ")})`;
  }
  if (countEl) countEl.textContent = countText;
}

function renderItems(items: Skill[], query = ""): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><h3>No skills found</h3><p>Try a different search term or adjust filters</p></div>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
    <div class="resource-item" data-path="${escapeHtml(
      item.skillFile
    )}" data-skill-id="${escapeHtml(item.id)}">
      <div class="resource-info">
        <div class="resource-title">${
          query ? search.highlight(item.title, query) : escapeHtml(item.title)
        }</div>
        <div class="resource-description">${escapeHtml(
          item.description || "No description"
        )}</div>
        <div class="resource-meta">
          <span class="resource-tag tag-category">${escapeHtml(
            item.category
          )}</span>
          ${
            item.hasAssets
              ? `<span class="resource-tag tag-assets">${
                  item.assetCount
                } asset${item.assetCount === 1 ? "" : "s"}</span>`
              : ""
          }
          <span class="resource-tag">${item.files.length} file${
        item.files.length === 1 ? "" : "s"
      }</span>
          ${getLastUpdatedHtml(item.lastUpdated)}
        </div>
      </div>
      <div class="resource-actions">
        <button class="btn btn-primary download-skill-btn" data-skill-id="${escapeHtml(
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
      // Don't trigger modal if clicking download button or github link
      if ((e.target as HTMLElement).closest(".resource-actions")) return;
      const path = (el as HTMLElement).dataset.path;
      if (path) openFileModal(path, resourceType);
    });
  });

  // Add download handlers
  list.querySelectorAll(".download-skill-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const skillId = (btn as HTMLElement).dataset.skillId;
      if (skillId) downloadSkill(skillId, btn as HTMLButtonElement);
    });
  });
}

async function downloadSkill(
  skillId: string,
  btn: HTMLButtonElement
): Promise<void> {
  const skill = allItems.find((item) => item.id === skillId);
  if (!skill || !skill.files || skill.files.length === 0) {
    showToast("No files found for this skill.", "error");
    return;
  }

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<svg class="spinner" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 8 1.5V0z"/></svg> Preparing...';

  try {
    const zip = new JSZip();
    const folder = zip.folder(skill.id);

    const fetchPromises = skill.files.map(async (file) => {
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
    link.download = `${skill.id}.zip`;
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
    const message = error instanceof Error ? error.message : "Download failed.";
    showToast(message, "error");
    btn.innerHTML =
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg> Failed';
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

export async function initSkillsPage(): Promise<void> {
  const list = document.getElementById("resource-list");
  const searchInput = document.getElementById(
    "search-input"
  ) as HTMLInputElement;
  const hasAssetsCheckbox = document.getElementById(
    "filter-has-assets"
  ) as HTMLInputElement;
  const clearFiltersBtn = document.getElementById("clear-filters");
  const sortSelect = document.getElementById("sort-select") as HTMLSelectElement;

  const data = await fetchData<SkillsData>("skills.json");
  if (!data || !data.items) {
    if (list)
      list.innerHTML =
        '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  search.setItems(allItems);

  categorySelect = createChoices("#filter-category", {
    placeholderValue: "All Categories",
  });
  categorySelect.setChoices(
    data.filters.categories.map((c) => ({ value: c, label: c })),
    "value",
    "label",
    true
  );
  document.getElementById("filter-category")?.addEventListener("change", () => {
    currentFilters.categories = getChoicesValues(categorySelect);
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

  hasAssetsCheckbox?.addEventListener("change", () => {
    currentFilters.hasAssets = hasAssetsCheckbox.checked;
    applyFiltersAndRender();
  });

  clearFiltersBtn?.addEventListener("click", () => {
    currentFilters = { categories: [], hasAssets: false };
    currentSort = 'title';
    categorySelect.removeActiveItems();
    if (hasAssetsCheckbox) hasAssetsCheckbox.checked = false;
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "title";
    applyFiltersAndRender();
  });

  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initSkillsPage);
