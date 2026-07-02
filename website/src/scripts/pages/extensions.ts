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
  escapeHtml,
  copyToClipboard,
  fetchData,
  formatRelativeTime,
  getGitHubHandle,
  getGitHubUrl,
  getQueryParam,
  getQueryParamValues,
  sanitizeUrl,
  showToast,
  updateQueryParams,
} from "../utils";
import { openCardDetailsModal, setupModal } from "../modal";
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

interface ExtensionScreenshot {
  path?: string | null;
  type?: string | null;
}

let allItems: Extension[] = [];
let extensionById = new Map<string, Extension>();
let currentSort: ExtensionSortOption = "title";
let keywordSelect: Choices;
let currentFilters = {
  keywords: [] as string[],
};
let actionHandlersReady = false;
let modalReady = false;

function normalizeScreenshotEntries(value: unknown): ExtensionScreenshot[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is ExtensionScreenshot => Boolean(entry));
  }
  if (typeof value === "object") {
    return [value as ExtensionScreenshot];
  }
  return [];
}

function getInstallUrl(item: Extension): string {
  return (
    item.installUrl ||
    (item.path && item.ref
      ? `https://github.com/github/awesome-copilot/tree/${item.ref}/${item.path.replace(
          /\\/g,
          "/"
        )}`
      : "")
  );
}

function getInstallCommand(item: Extension): string {
  return (
    item.installCommand ||
    (item.pluginName ? `copilot plugin install ${item.pluginName}@awesome-copilot` : "")
  );
}

function getSourceUrl(item: Extension): string {
  return item.sourceUrl || (item.path ? getGitHubUrl(item.path) : "");
}

function toRawAssetUrl(item: Extension, assetPath: string | null | undefined): string {
  if (!assetPath || !item.ref) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return `https://raw.githubusercontent.com/github/awesome-copilot/${item.ref}/${assetPath.replace(
    /\\/g,
    "/"
  )}`;
}

function getGalleryImages(item: Extension): string[] {
  const images: string[] = [];

  if (item.imageUrl) {
    images.push(item.imageUrl);
  }

  const iconPath = item.screenshots?.icon?.path;
  if (iconPath) {
    const url = toRawAssetUrl(item, iconPath);
    if (url) images.push(url);
  }

  const galleryPaths = normalizeScreenshotEntries(item.screenshots?.gallery);
  for (const entry of galleryPaths) {
    const url = toRawAssetUrl(item, entry.path);
    if (url) images.push(url);
  }

  return Array.from(new Set(images));
}

function renderGalleryThumbnails(images: string[], selectedUrl: string): void {
  const gallery = document.getElementById("extension-details-gallery");
  if (!gallery) return;

  gallery.innerHTML = "";

  images.forEach((url, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "extension-details-thumbnail-btn";
    button.dataset.galleryImageUrl = url;
    button.setAttribute("aria-label", `Show image ${index + 1}`);
    button.setAttribute("role", "listitem");
    if (url === selectedUrl) {
      button.classList.add("active");
      button.setAttribute("aria-current", "true");
    }

    const image = document.createElement("img");
    image.src = url;
    image.alt = `Gallery image ${index + 1}`;
    image.className = "extension-details-thumbnail";
    image.loading = "lazy";

    button.appendChild(image);
    gallery.appendChild(button);
  });
}

function setSelectedGalleryImage(url: string, extensionName: string): void {
  const image = document.getElementById(
    "extension-details-image"
  ) as HTMLImageElement | null;
  const gallery = document.getElementById("extension-details-gallery");
  if (!image) return;

  image.src = url;
  image.alt = `${extensionName} screenshot`;

  gallery?.querySelectorAll<HTMLButtonElement>(".extension-details-thumbnail-btn").forEach((button) => {
    const isActive = button.dataset.galleryImageUrl === url;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function openDetailsModal(
  extensionId: string,
  preferredImageUrl?: string,
  trigger?: HTMLElement
): void {
  const item = extensionById.get(extensionId);
  if (!item) {
    return;
  }

  const keywordHtml = (item.keywords || [])
    .map((keyword) => `<span class="keyword-tag">${escapeHtml(keyword)}</span>`)
    .join("");
  const metaParts: string[] = [];
  if (item.external) {
    metaParts.push('<span class="resource-tag">External</span>');
  }
  if (item.author?.name) {
    const authorName = item.author.name;
    const authorUrl = item.author.url;
    const authorHandle = authorUrl
      ? getGitHubHandle(authorUrl, authorName)
      : authorName;
    metaParts.push(
      authorUrl
        ? `<span class="resource-author">by <a href="${escapeHtml(
            sanitizeUrl(authorUrl)
          )}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(
            authorName
          )}">${escapeHtml(authorHandle)}</a></span>`
        : `<span class="resource-author">by ${escapeHtml(
            authorName
          )}</span>`
    );
  }
  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const installUrl = getInstallUrl(item);
  const installCommand = getInstallCommand(item);
  const sourceUrl = getSourceUrl(item);
  const detailsHtml = `
    <div class="extension-details-body">
      <div class="extension-details-main">
        <img id="extension-details-image" class="extension-preview-image extension-details-image" src="" alt="" />
        <div id="extension-details-gallery" class="extension-details-gallery" role="list"></div>
      </div>
      <div class="extension-details-content">
        <p id="extension-details-description" class="extension-details-description">${escapeHtml(
          item.description || "Canvas extension"
        )}</p>
        <div id="extension-details-keywords" class="resource-keywords extension-details-keywords">${keywordHtml}</div>
        <div id="extension-details-meta" class="resource-meta extension-details-meta">${metaParts.join(
          ""
        )}</div>
        <div class="resource-actions extension-details-actions">
          <button id="extension-details-install" class="btn btn-primary btn-small" type="button" data-install-command="${escapeHtml(
            installCommand
          )}" ${installCommand ? "" : "disabled"}>Copy Install</button>
          <button id="extension-details-copy-url" class="btn btn-secondary btn-small" type="button" data-install-url="${escapeHtml(
            installUrl
          )}" ${installUrl ? "" : "disabled"}>Copy URL</button>
          ${sourceUrl
      ? `<a id="extension-details-source" class="btn btn-secondary btn-small" href="${escapeHtml(
        sourceUrl
      )}" target="_blank" rel="noopener noreferrer">Source</a>`
      : ""
    }
        </div>
      </div>
    </div>
  `;

  openCardDetailsModal({
    title: item.name,
    description: item.description || "Canvas extension",
    detailsHtml,
    contentClassName: "modal-card-details modal-card-details-extension",
    trigger,
  });

  const galleryImages = getGalleryImages(item);
  const initialImage = preferredImageUrl || galleryImages[0] || "";
  renderGalleryThumbnails(galleryImages, initialImage);
  if (initialImage) {
    setSelectedGalleryImage(initialImage, item.name);
  }
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

    const installButton = target.closest(
      ".copy-install-url-btn"
    ) as HTMLButtonElement | null;

    if (!installButton) return;

    event.stopPropagation();
    const installCommand = installButton.dataset.installCommand || "";
    const installUrl = installButton.dataset.installUrl || "";
    const contentToCopy = installCommand || installUrl;
    if (!contentToCopy) {
      showToast("No install target available for this extension", "error");
      return;
    }
    const success = await copyToClipboard(contentToCopy);
    showToast(
      success
        ? installCommand
          ? "Install command copied!"
          : "Extension URL copied!"
        : "Failed to copy install target",
      success ? "success" : "error"
    );
    return;
  });

  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const thumbnailButton = target.closest(
      ".resource-thumbnail-btn"
    ) as HTMLElement | null;
    if (thumbnailButton) {
      event.preventDefault();
      event.stopPropagation();
      const extensionId = thumbnailButton.dataset.extensionId;
      if (!extensionId) return;
      const previewButton = thumbnailButton.closest(".resource-preview") as HTMLElement | null;
      openDetailsModal(extensionId, undefined, previewButton || undefined);
      return;
    }

    if (
      target.closest(".resource-actions") ||
      target.closest(".extension-details-thumbnail-btn")
    ) {
      return;
    }

    const card = target.closest(".resource-item") as HTMLElement | null;
    const previewButton = card?.querySelector(".resource-preview") as HTMLElement | null;
    const extensionId = card?.dataset.extensionId;
    if (extensionId) {
      openDetailsModal(extensionId, undefined, previewButton || undefined);
    }
  });

  list.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement;
    const card = target.closest(".resource-item") as HTMLElement | null;
    if (!card) return;

    if (target.closest("a, button, select, input, textarea")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const extensionId = card.dataset.extensionId;
      const previewButton = card.querySelector(".resource-preview") as HTMLElement | null;
      if (extensionId) {
        openDetailsModal(extensionId, undefined, previewButton || undefined);
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const detailsInstallButton = target.closest(
      "#extension-details-install"
    ) as HTMLButtonElement | null;
    if (detailsInstallButton) {
      const installCommand = detailsInstallButton.dataset.installCommand || "";
      if (!installCommand) {
        showToast("No plugin install command available for this extension", "error");
        return;
      }

      const success = await copyToClipboard(installCommand);
      showToast(
        success ? "Install command copied!" : "Failed to copy install command",
        success ? "success" : "error"
      );
      return;
    }

    const detailsCopyUrlButton = target.closest(
      "#extension-details-copy-url"
    ) as HTMLButtonElement | null;
    if (detailsCopyUrlButton) {
      const installUrl = detailsCopyUrlButton.dataset.installUrl || "";
      if (!installUrl) {
        showToast("No install URL available for this extension", "error");
        return;
      }

      const success = await copyToClipboard(installUrl);
      showToast(
        success ? "Install URL copied!" : "Failed to copy install URL",
        success ? "success" : "error"
      );
      return;
    }

    const button = target.closest(
      ".extension-details-thumbnail-btn"
    ) as HTMLButtonElement | null;
    if (!button) return;

    const imageUrl = button.dataset.galleryImageUrl;
    const titleText = document.getElementById("modal-title")?.textContent;
    if (!imageUrl || !titleText) return;
    setSelectedGalleryImage(imageUrl, titleText);
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

  if (!modalReady) {
    setupModal();
    modalReady = true;
  }

  setupActionHandlers(list as HTMLElement | null);

  const data = await fetchData<ExtensionsData>("extensions.json");
  if (!data || !data.items) {
    if (list)
      list.innerHTML =
        '<div class="empty-state"><h3>Failed to load data</h3></div>';
    return;
  }

  allItems = data.items;
  extensionById = new Map(allItems.map((item) => [item.id, item]));

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
