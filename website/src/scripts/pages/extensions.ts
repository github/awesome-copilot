/**
 * Canvas extensions page functionality
 */
import {
  copyToClipboard,
  escapeHtml,
  formatRelativeTime,
  getGitHubHandle,
  sanitizeUrl,
  showToast,
} from "../utils";
import { openCardDetailsModal } from "../modal";
import { initListingPage } from "./listing-controller";
import {
  extensionSearchText,
  extensionSource,
  getExtensionInstallUrl,
  getExtensionSourceUrl,
  renderExtensionsHtml,
  sortExtensions,
  type ExtensionSortOption,
  type RenderableExtension,
} from "./extensions-render";

interface Extension extends RenderableExtension {}

interface ExtensionScreenshot {
  path?: string | null;
  type?: string | null;
}

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

function toRawAssetUrl(
  item: Extension,
  assetPath: string | null | undefined
): string {
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

  gallery
    ?.querySelectorAll<HTMLButtonElement>(".extension-details-thumbnail-btn")
    .forEach((button) => {
      const isActive = button.dataset.galleryImageUrl === url;
      button.classList.toggle("active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
}

function openExtensionDetailsModal(item: Extension, trigger?: HTMLElement): void {
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
        : `<span class="resource-author">by ${escapeHtml(authorName)}</span>`
    );
  }
  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const installUrl = getExtensionInstallUrl(item);
  const sourceUrl = getExtensionSourceUrl(item);
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
          <button id="extension-details-install" class="btn btn-primary btn-small" type="button" data-install-url="${escapeHtml(
            installUrl
          )}" ${installUrl ? "" : "disabled"}>Copy URL</button>
          ${
            sourceUrl
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
  const initialImage = galleryImages[0] || "";
  renderGalleryThumbnails(galleryImages, initialImage);
  if (initialImage) {
    setSelectedGalleryImage(initialImage, item.name);
  }
}

/** Delegated handlers for the bespoke copy-URL buttons + gallery switching. */
function setupExtensionActionHandlers(): void {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;

    const copyButton = target.closest(
      ".copy-install-url-btn, #extension-details-install"
    ) as HTMLButtonElement | null;
    if (copyButton) {
      event.stopPropagation();
      const installUrl = copyButton.dataset.installUrl || "";
      if (!installUrl) {
        showToast("No install URL available for this extension", "error");
        return;
      }
      const success = await copyToClipboard(installUrl);
      showToast(
        success ? "Extension URL copied!" : "Failed to copy extension URL",
        success ? "success" : "error"
      );
      return;
    }

    const thumbnailButton = target.closest(
      ".extension-details-thumbnail-btn"
    ) as HTMLButtonElement | null;
    if (thumbnailButton) {
      const imageUrl = thumbnailButton.dataset.galleryImageUrl;
      const titleText = document.getElementById("modal-title")?.textContent;
      if (imageUrl && titleText) {
        setSelectedGalleryImage(imageUrl, titleText);
      }
    }
  });
}

setupExtensionActionHandlers();

initListingPage<Extension>({
  dataFile: "extensions.json",
  keyOf: (item) => item.id,
  search: extensionSearchText,
  facetValues: (item) => ({ source: extensionSource(item) }),
  sort: (items, sort) => sortExtensions(items, sort as ExtensionSortOption),
  render: renderExtensionsHtml,
  noun: "extension",
  openModal: openExtensionDetailsModal,
});
