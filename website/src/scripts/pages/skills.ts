/**
 * Skills page functionality
 */
import {
  fetchData,
  getQueryParam,
  showToast,
  downloadZipBundle,
  updateQueryParams,
  copyToClipboard,
  REPO_IDENTIFIER,
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

interface Skill extends Omit<RenderableSkill, "files"> {
  files: SkillFile[];
}

interface SkillsData {
  items: Skill[];
}

const resourceType = "skill";
let allItems: Skill[] = [];
let currentSort: SkillSortOption = "title";
let resourceListHandlersReady = false;

function applyFiltersAndRender(): void {
  const countEl = document.getElementById("results-count");
  const results = sortSkills(allItems, currentSort);

  renderItems(results);
  if (countEl) {
    countEl.textContent = `${results.length} skill${results.length === 1 ? "" : "s"}`;
  }
}

function renderItems(items: Skill[]): void {
  const list = document.getElementById("resource-list");
  if (!list) return;

  list.innerHTML = renderSkillsHtml(items);
}

function setupResourceListHandlers(list: HTMLElement | null): void {
  if (!list || resourceListHandlersReady) return;

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const copyInstallButton = target.closest(
      ".copy-install-btn"
    ) as HTMLButtonElement | null;
    if (copyInstallButton) {
      event.stopPropagation();
      const skillId = copyInstallButton.dataset.skillId;
      if (skillId) copyInstallCommand(skillId, copyInstallButton);
      return;
    }

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

function syncUrlState(): void {
  updateQueryParams({
    q: "",
    category: [],
    hasAssets: false,
    sort: currentSort === "title" ? "" : currentSort,
  });
}

async function copyInstallCommand(
  skillId: string,
  btn: HTMLButtonElement
): Promise<void> {
  const command = `gh skills install ${REPO_IDENTIFIER} ${skillId}`;
  const originalContent = btn.innerHTML;
  const success = await copyToClipboard(command);
  showToast(
    success ? "Install command copied!" : "Failed to copy",
    success ? "success" : "error"
  );
  if (success) {
    btn.innerHTML =
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg> Copied!';
    setTimeout(() => {
      btn.innerHTML = originalContent;
    }, 2000);
  }
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
  const sortSelect = document.getElementById(
    "sort-select"
  ) as HTMLSelectElement;

  setupResourceListHandlers(list as HTMLElement | null);

  const data = await fetchData<SkillsData>("skills.json");
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
    currentSort = sortSelect.value as SkillSortOption;
    applyFiltersAndRender();
    syncUrlState();
  });

  applyFiltersAndRender();
  setupModal();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initSkillsPage);
