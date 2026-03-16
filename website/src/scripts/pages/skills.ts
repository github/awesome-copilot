/**
 * Skills page functionality
 */
import { createChoices, getChoicesValues, type Choices } from "../choices";
import { FuzzySearch, type SearchItem } from "../search";
import {
  fetchData,
  debounce,
  showToast,
  downloadZipBundle,
} from "../utils";
import { setupModal, openFileModal } from "../modal";
import {
  renderSkillsHtml,
  sortSkills,
  type RenderableSkill,
  type SkillSortOption,
} from "./skills-render";

interface SkillFile {
  name: string;
  path: string;
}

interface Skill extends SearchItem, Omit<RenderableSkill, "files"> {
  files: SkillFile[];
}

interface SkillsData {
  items: Skill[];
  filters: {
    categories: string[];
  };
}

const resourceType = "skill";
let allItems: Skill[] = [];
let search = new FuzzySearch<Skill>();
let categorySelect: Choices;
let currentFilters = {
  categories: [] as string[],
  hasAssets: false,
};
let currentSort: SkillSortOption = 'title';
let resourceListHandlersReady = false;

function sortItems(items: Skill[]): Skill[] {
  return sortSkills(items, currentSort);
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

  list.innerHTML = renderSkillsHtml(items, {
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
      ".download-skill-btn"
    ) as HTMLButtonElement | null;
    if (downloadButton) {
      event.stopPropagation();
      const skillId = downloadButton.dataset.skillId;
      if (skillId) downloadSkill(skillId, downloadButton);
      return;
    }

    if (target.closest(".resource-actions")) return;

    const item = target.closest(".resource-item") as HTMLElement | null;
    const path = item?.dataset.path;
    if (path) openFileModal(path, resourceType);
  });

  resourceListHandlersReady = true;
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
    await downloadZipBundle(skill.id, skill.files);

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

  setupResourceListHandlers(list as HTMLElement | null);

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
    currentSort = sortSelect.value as SkillSortOption;
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
