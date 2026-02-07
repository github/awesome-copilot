/**
 * Modal functionality for file viewing
 */

import {
  fetchFileContent,
  fetchData,
  getVSCodeInstallUrl,
  copyToClipboard,
  showToast,
  downloadFile,
  shareFile,
  getResourceType,
  escapeHtml,
  getResourceIcon,
} from "./utils";

// Modal state
let currentFilePath: string | null = null;
let currentFileContent: string | null = null;
let currentFileType: string | null = null;
let triggerElement: HTMLElement | null = null;

// Collection data cache
interface CollectionItem {
  path: string;
  kind: string;
  usage?: string | null;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  path: string;
  items: CollectionItem[];
  tags?: string[];
}

interface CollectionsData {
  items: Collection[];
}

let collectionsCache: CollectionsData | null = null;

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  ).filter((el) => el.offsetParent !== null); // Filter out hidden elements
}

/**
 * Handle keyboard navigation within modal (focus trap)
 */
function handleModalKeydown(e: KeyboardEvent, modal: HTMLElement): void {
  if (e.key === "Tab") {
    const focusableElements = getFocusableElements(modal);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}

/**
 * Setup modal functionality
 */
export function setupModal(): void {
  const modal = document.getElementById("file-modal");
  const closeBtn = document.getElementById("close-modal");
  const copyBtn = document.getElementById("copy-btn");
  const downloadBtn = document.getElementById("download-btn");
  const shareBtn = document.getElementById("share-btn");

  if (!modal) return;

  closeBtn?.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("hidden")) {
      if (e.key === "Escape") {
        closeModal();
      } else {
        handleModalKeydown(e, modal);
      }
    }
  });

  copyBtn?.addEventListener("click", async () => {
    if (currentFileContent) {
      const success = await copyToClipboard(currentFileContent);
      showToast(
        success ? "Copied to clipboard!" : "Failed to copy",
        success ? "success" : "error"
      );
    }
  });

  downloadBtn?.addEventListener("click", async () => {
    if (currentFilePath) {
      const success = await downloadFile(currentFilePath);
      showToast(
        success ? "Download started!" : "Download failed",
        success ? "success" : "error"
      );
    }
  });

  shareBtn?.addEventListener("click", async () => {
    if (currentFilePath) {
      const success = await shareFile(currentFilePath);
      showToast(
        success ? "Link copied to clipboard!" : "Failed to copy link",
        success ? "success" : "error"
      );
    }
  });

  // Setup install dropdown toggle
  setupInstallDropdown("install-dropdown");

  // Handle browser back/forward navigation
  window.addEventListener("hashchange", handleHashChange);

  // Check for deep link on initial load
  handleHashChange();
}

/**
 * Handle hash changes for deep linking
 */
function handleHashChange(): void {
  const hash = window.location.hash;

  if (hash && hash.startsWith("#file=")) {
    const filePath = decodeURIComponent(hash.slice(6));
    if (filePath && filePath !== currentFilePath) {
      const type = getResourceType(filePath);
      openFileModal(filePath, type, false); // Don't update hash since we're responding to it
    }
  } else if (!hash || hash === "#") {
    // No hash or empty hash - close modal if open
    if (currentFilePath) {
      closeModal(false); // Don't update hash since we're responding to it
    }
  }
}

/**
 * Update URL hash for deep linking
 */
function updateHash(filePath: string | null): void {
  if (filePath) {
    const newHash = `#file=${encodeURIComponent(filePath)}`;
    if (window.location.hash !== newHash) {
      history.pushState(null, "", newHash);
    }
  } else {
    if (window.location.hash) {
      history.pushState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }
}

/**
 * Setup install dropdown toggle functionality
 */
export function setupInstallDropdown(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const toggle = container.querySelector<HTMLButtonElement>(
    ".install-btn-toggle"
  );
  const menuItems = container.querySelectorAll<HTMLAnchorElement>(
    ".install-dropdown-menu a"
  );

  toggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = container.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));

    // Focus first menu item when opening
    if (isOpen && menuItems.length > 0) {
      menuItems[0].focus();
    }
  });

  // Keyboard navigation for dropdown
  toggle?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      container.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      if (menuItems.length > 0) {
        menuItems[0].focus();
      }
    }
  });

  // Keyboard navigation within menu
  menuItems.forEach((item, index) => {
    item.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (index < menuItems.length - 1) {
            menuItems[index + 1].focus();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0) {
            menuItems[index - 1].focus();
          } else {
            toggle?.focus();
          }
          break;
        case "Escape":
          e.preventDefault();
          container.classList.remove("open");
          toggle?.setAttribute("aria-expanded", "false");
          toggle?.focus();
          break;
        case "Tab":
          // Close menu on tab out
          container.classList.remove("open");
          toggle?.setAttribute("aria-expanded", "false");
          break;
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target as Node)) {
      container.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });

  // Close dropdown when clicking a menu item
  container.querySelectorAll(".install-dropdown-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      container.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
}

/**
 * Open file viewer modal
 * @param filePath - Path to the file
 * @param type - Resource type (agent, prompt, instruction, etc.)
 * @param updateUrl - Whether to update the URL hash (default: true)
 * @param trigger - The element that triggered the modal (for focus return)
 */
export async function openFileModal(
  filePath: string,
  type: string,
  updateUrl = true,
  trigger?: HTMLElement
): Promise<void> {
  const modal = document.getElementById("file-modal");
  const title = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");
  const contentEl = modalContent?.querySelector("code");
  const installDropdown = document.getElementById("install-dropdown");
  const installBtnMain = document.getElementById(
    "install-btn-main"
  ) as HTMLAnchorElement | null;
  const installVscode = document.getElementById(
    "install-vscode"
  ) as HTMLAnchorElement | null;
  const installInsiders = document.getElementById(
    "install-insiders"
  ) as HTMLAnchorElement | null;
  const copyBtn = document.getElementById("copy-btn");
  const downloadBtn = document.getElementById("download-btn");
  const closeBtn = document.getElementById("close-modal");

  if (!modal || !title || !modalContent) return;

  currentFilePath = filePath;
  currentFileType = type;

  // Track trigger element for focus return
  triggerElement = trigger || (document.activeElement as HTMLElement);

  // Update URL for deep linking
  if (updateUrl) {
    updateHash(filePath);
  }

  // Show modal with loading state
  title.textContent = filePath.split("/").pop() || filePath;
  modal.classList.remove("hidden");

  // Set focus to close button for accessibility
  setTimeout(() => {
    closeBtn?.focus();
  }, 0);

  // Handle collections differently - show as item list
  if (type === "collection") {
    await openCollectionModal(
      filePath,
      title,
      modalContent,
      installDropdown,
      copyBtn,
      downloadBtn
    );
    return;
  }

  // Regular file modal
  if (contentEl) {
    contentEl.textContent = "Loading...";
  }

  // Show copy/download buttons for regular files
  if (copyBtn) copyBtn.style.display = "inline-flex";
  if (downloadBtn) downloadBtn.style.display = "inline-flex";

  // Restore pre/code structure if it was replaced by collection view
  if (!modalContent.querySelector("pre")) {
    modalContent.innerHTML = '<pre id="modal-content"><code></code></pre>';
  }
  const codeEl = modalContent.querySelector("code");

  // Setup install dropdown
  const vscodeUrl = getVSCodeInstallUrl(type, filePath, false);
  const insidersUrl = getVSCodeInstallUrl(type, filePath, true);

  if (vscodeUrl && installDropdown) {
    installDropdown.style.display = "inline-flex";
    installDropdown.classList.remove("open");
    if (installBtnMain) installBtnMain.href = vscodeUrl;
    if (installVscode) installVscode.href = vscodeUrl;
    if (installInsiders) installInsiders.href = insidersUrl || "#";
  } else if (installDropdown) {
    installDropdown.style.display = "none";
  }

  // Fetch and display content
  const fileContent = await fetchFileContent(filePath);
  currentFileContent = fileContent;

  if (fileContent && codeEl) {
    codeEl.textContent = fileContent;
  } else if (codeEl) {
    codeEl.textContent =
      "Failed to load file content. Click the button below to view on GitHub.";
  }
}

/**
 * Open collection modal with item list
 */
async function openCollectionModal(
  filePath: string,
  title: HTMLElement,
  modalContent: HTMLElement,
  installDropdown: HTMLElement | null,
  copyBtn: HTMLElement | null,
  downloadBtn: HTMLElement | null
): Promise<void> {
  // Hide install dropdown and copy/download for collections
  if (installDropdown) installDropdown.style.display = "none";
  if (copyBtn) copyBtn.style.display = "none";
  if (downloadBtn) downloadBtn.style.display = "none";

  // Show loading
  modalContent.innerHTML =
    '<div class="collection-loading">Loading collection...</div>';

  // Load collections data if not cached
  if (!collectionsCache) {
    collectionsCache = await fetchData<CollectionsData>("collections.json");
  }

  if (!collectionsCache) {
    modalContent.innerHTML =
      '<div class="collection-error">Failed to load collection data.</div>';
    return;
  }

  // Find the collection
  const collection = collectionsCache.items.find((c) => c.path === filePath);
  if (!collection) {
    modalContent.innerHTML =
      '<div class="collection-error">Collection not found.</div>';
    return;
  }

  // Update title
  title.textContent = collection.name;

  // Render collection view
  modalContent.innerHTML = `
    <div class="collection-view">
      <div class="collection-description">${escapeHtml(
        collection.description || ""
      )}</div>
      ${
        collection.tags && collection.tags.length > 0
          ? `
        <div class="collection-tags">
          ${collection.tags
            .map((t) => `<span class="resource-tag">${escapeHtml(t)}</span>`)
            .join("")}
        </div>
      `
          : ""
      }
      <div class="collection-items-header">
        <strong>${collection.items.length} items in this collection</strong>
      </div>
      <div class="collection-items-list">
        ${collection.items
          .map(
            (item) => `
          <div class="collection-item" data-path="${escapeHtml(
            item.path
          )}" data-type="${escapeHtml(item.kind)}">
            <span class="collection-item-icon">${getResourceIcon(
              item.kind
            )}</span>
            <div class="collection-item-info">
              <div class="collection-item-name">${escapeHtml(
                item.path.split("/").pop() || item.path
              )}</div>
              ${
                item.usage
                  ? `<div class="collection-item-usage">${escapeHtml(
                      item.usage
                    )}</div>`
                  : ""
              }
            </div>
            <span class="collection-item-type">${escapeHtml(item.kind)}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // Add click handlers to collection items
  modalContent.querySelectorAll(".collection-item").forEach((el) => {
    el.addEventListener("click", () => {
      const path = (el as HTMLElement).dataset.path;
      const itemType = (el as HTMLElement).dataset.type;
      if (path && itemType) {
        openFileModal(path, itemType);
      }
    });
  });
}

/**
 * Close modal
 * @param updateUrl - Whether to update the URL hash (default: true)
 */
export function closeModal(updateUrl = true): void {
  const modal = document.getElementById("file-modal");
  const installDropdown = document.getElementById("install-dropdown");

  if (modal) {
    modal.classList.add("hidden");
  }
  if (installDropdown) {
    installDropdown.classList.remove("open");
  }

  // Update URL for deep linking
  if (updateUrl) {
    updateHash(null);
  }

  // Return focus to trigger element
  if (
    triggerElement &&
    triggerElement.isConnected &&
    typeof triggerElement.focus === "function"
  ) {
    triggerElement.focus();
  }

  currentFilePath = null;
  currentFileContent = null;
  currentFileType = null;
  triggerElement = null;
}

/**
 * Get current file path (for external use)
 */
export function getCurrentFilePath(): string | null {
  return currentFilePath;
}

/**
 * Get current file content (for external use)
 */
export function getCurrentFileContent(): string | null {
  return currentFileContent;
}
