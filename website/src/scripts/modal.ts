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
let originalDocumentTitle: string | null = null;

// Resource data cache for title lookups
interface ResourceItem {
  title: string;
  path: string;
}

interface ResourceData {
  items: ResourceItem[];
}

const resourceDataCache: Record<string, ResourceData | null> = {};

const RESOURCE_TYPE_TO_JSON: Record<string, string> = {
  agent: "agents.json",
  instruction: "instructions.json",
  skill: "skills.json",
  hook: "hooks.json",
  workflow: "workflows.json",
  plugin: "plugins.json",
};

/**
 * Look up the display title for a resource from its JSON data file
 */
async function resolveResourceTitle(
  filePath: string,
  type: string
): Promise<string> {
  const fallback = filePath.split("/").pop() || filePath;
  const jsonFile = RESOURCE_TYPE_TO_JSON[type];
  if (!jsonFile) return fallback;

  if (!(jsonFile in resourceDataCache)) {
    resourceDataCache[jsonFile] = await fetchData<ResourceData>(jsonFile);
  }

  const data = resourceDataCache[jsonFile];
  if (!data) return fallback;

  // Try exact path match first
  const item = data.items.find((i) => i.path === filePath);
  if (item) return item.title;

  // For skills/hooks, the modal receives the file path (e.g. skills/foo/SKILL.md)
  // but JSON stores the folder path (e.g. skills/foo)
  const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
  if (parentPath) {
    const parentItem = data.items.find((i) => i.path === parentPath);
    if (parentItem) return parentItem.title;
  }

  return fallback;
}

// Plugin data cache
interface PluginItem {
  path: string;
  kind: string;
  usage?: string | null;
}

interface Plugin {
  id: string;
  name: string;
  description?: string;
  path: string;
  items: PluginItem[];
  tags?: string[];
}

interface PluginsData {
  items: Plugin[];
}

let pluginsCache: PluginsData | null = null;

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
 * @param type - Resource type (agent, instruction, etc.)
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
  let modalContent = document.getElementById("modal-content");
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
  const fallbackName = filePath.split("/").pop() || filePath;
  title.textContent = fallbackName;
  modal.classList.remove("hidden");

  // Update document title to reflect the open file
  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title;
  }
  document.title = `${fallbackName} | Awesome GitHub Copilot`;

  // Resolve the proper title from JSON data asynchronously
  resolveResourceTitle(filePath, type).then((resolvedTitle) => {
    if (currentFilePath === filePath) {
      title.textContent = resolvedTitle;
      document.title = `${resolvedTitle} | Awesome GitHub Copilot`;
    }
  });

  // Set focus to close button for accessibility
  setTimeout(() => {
    closeBtn?.focus();
  }, 0);

  // Handle plugins differently - show as item list
  if (type === "plugin") {
    await openPluginModal(
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

  // Restore pre/code structure if it was replaced by plugin view
  if (modalContent.tagName !== 'PRE') {
    const modalBody = modalContent.parentElement;
    if (modalBody) {
      const pre = document.createElement("pre");
      pre.id = "modal-content";
      pre.innerHTML = "<code></code>";
      modalBody.replaceChild(pre, modalContent);
      modalContent = pre;
    }
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
 * Open plugin modal with item list
 */
async function openPluginModal(
  filePath: string,
  title: HTMLElement,
  modalContent: HTMLElement,
  installDropdown: HTMLElement | null,
  copyBtn: HTMLElement | null,
  downloadBtn: HTMLElement | null
): Promise<void> {
  // Hide install dropdown and copy/download for plugins
  if (installDropdown) installDropdown.style.display = "none";
  if (copyBtn) copyBtn.style.display = "none";
  if (downloadBtn) downloadBtn.style.display = "none";

  // Replace <pre> with a <div> so plugin content isn't styled as preformatted text
  const modalBody = modalContent.parentElement;
  if (modalBody) {
    const div = document.createElement("div");
    div.id = "modal-content";
    div.innerHTML = '<div class="collection-loading">Loading plugin...</div>';
    modalBody.replaceChild(div, modalContent);
    modalContent = div;
  } else {
    modalContent.innerHTML = '<div class="collection-loading">Loading plugin...</div>';
  }

  // Load plugins data if not cached
  if (!pluginsCache) {
    pluginsCache = await fetchData<PluginsData>("plugins.json");
  }

  if (!pluginsCache) {
    modalContent.innerHTML =
      '<div class="collection-error">Failed to load plugin data.</div>';
    return;
  }

  // Find the plugin
  const plugin = pluginsCache.items.find((c) => c.path === filePath);
  if (!plugin) {
    modalContent.innerHTML =
      '<div class="collection-error">Plugin not found.</div>';
    return;
  }

  // Update title
  title.textContent = plugin.name;
  document.title = `${plugin.name} | Awesome GitHub Copilot`;

  // Render plugin view
  modalContent.innerHTML = `
    <div class="collection-view">
      <div class="collection-description">${escapeHtml(
        plugin.description || ""
      )}</div>
      ${
        plugin.tags && plugin.tags.length > 0
          ? `
        <div class="collection-tags">
          ${plugin.tags
            .map((t) => `<span class="resource-tag">${escapeHtml(t)}</span>`)
            .join("")}
        </div>
      `
          : ""
      }
      <div class="collection-items-header">
        <strong>${plugin.items.length} items in this plugin</strong>
      </div>
      <div class="collection-items-list">
        ${plugin.items
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

  // Add click handlers to plugin items
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

  // Restore original document title
  if (originalDocumentTitle) {
    document.title = originalDocumentTitle;
    originalDocumentTitle = null;
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
