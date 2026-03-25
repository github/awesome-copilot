/**
 * Modal functionality for file viewing
 */

import { marked } from "marked";
import {
  fetchFileContent,
  fetchData,
  getVSCodeInstallUrl,
  copyToClipboard,
  showToast,
  downloadFile,
  downloadZipBundle,
  shareFile,
  getResourceType,
  escapeHtml,
  getResourceIconSvg,
  sanitizeUrl,
} from "./utils";
import fm from "front-matter";

type ModalViewMode = "rendered" | "raw";

// Modal state
let currentFilePath: string | null = null;
let currentFileContent: string | null = null;
let currentFileType: string | null = null;
let currentViewMode: ModalViewMode = "raw";
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

interface SkillFile {
  name: string;
  path: string;
}

interface SkillItem extends ResourceItem {
  id: string;
  skillFile: string;
  files: SkillFile[];
}

interface SkillsData {
  items: SkillItem[];
}

let skillsCache: SkillsData | null | undefined;

function getSkillDownloadName(skill: SkillItem): string {
  return skill.id || skill.path.split("/").pop() || "skill";
}

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

  // For skills/hooks, bundled files live under the resource folder while
  // JSON stores the folder path itself (for example, skills/foo).
  const collectionRootPath =
    type === "skill"
      ? getCollectionRootPath(filePath, "skills")
      : type === "hook"
        ? getCollectionRootPath(filePath, "hooks")
        : filePath.substring(0, filePath.lastIndexOf("/"));

  if (collectionRootPath) {
    const parentItem = data.items.find((i) => i.path === collectionRootPath);
    if (parentItem) return parentItem.title;
  }

  return fallback;
}

function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(filePath);
}

function getCollectionRootPath(filePath: string, collectionName: string): string | null {
  const segments = filePath.split("/");
  const collectionIndex = segments.indexOf(collectionName);
  if (collectionIndex === -1 || segments.length <= collectionIndex + 1) {
    return null;
  }
  return segments.slice(0, collectionIndex + 2).join("/");
}

function getSkillRootPath(filePath: string): string | null {
  return getCollectionRootPath(filePath, "skills");
}

async function getSkillsData(): Promise<SkillsData | null> {
  if (skillsCache === undefined) {
    skillsCache = await fetchData<SkillsData>("skills.json");
  }

  return skillsCache;
}

async function getSkillItemByFilePath(filePath: string): Promise<SkillItem | null> {
  if (getResourceType(filePath) !== "skill") return null;

  const skillsData = await getSkillsData();
  if (!skillsData) return null;

  const rootPath = getSkillRootPath(filePath);
  if (!rootPath) return null;

  return (
    skillsData.items.find(
      (item) =>
        item.path === rootPath ||
        item.skillFile === filePath ||
        item.files.some((file) => file.path === filePath)
    ) || null
  );
}

function updateModalTitle(titleText: string, filePath: string): void {
  const title = document.getElementById("modal-title");
  if (title) {
    title.textContent = titleText;
  }

  const fileName = getFileName(filePath);
  document.title =
    titleText === fileName
      ? `${titleText} | Awesome GitHub Copilot`
      : `${titleText} · ${fileName} | Awesome GitHub Copilot`;
}

function getModalBody(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".modal-body");
}

function getModalContent(): HTMLElement | null {
  return document.getElementById("modal-content");
}

function ensurePreContent(): HTMLPreElement | null {
  let modalContent = getModalContent();
  if (!modalContent) return null;

  if (modalContent.tagName === "PRE") {
    modalContent.className = "";
    if (!modalContent.querySelector("code")) {
      modalContent.innerHTML = "<code></code>";
    }
    return modalContent as HTMLPreElement;
  }

  const modalBody = getModalBody();
  if (!modalBody) return null;

  const pre = document.createElement("pre");
  pre.id = "modal-content";
  pre.innerHTML = "<code></code>";
  modalBody.replaceChild(pre, modalContent);
  return pre;
}

function ensureDivContent(className: string): HTMLDivElement | null {
  let modalContent = getModalContent();
  if (!modalContent) return null;

  if (modalContent.tagName === "DIV") {
    modalContent.className = className;
    return modalContent as HTMLDivElement;
  }

  const modalBody = getModalBody();
  if (!modalBody) return null;

  const div = document.createElement("div");
  div.id = "modal-content";
  div.className = className;
  modalBody.replaceChild(div, modalContent);
  return div;
}

function renderPlainText(content: string): void {
  const pre = ensurePreContent();
  const codeEl = pre?.querySelector("code");
  if (codeEl) {
    codeEl.textContent = content;
  }
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  bicep: "bicep",
  cjs: "javascript",
  css: "css",
  cs: "csharp",
  go: "go",
  html: "html",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  md: "md",
  markdown: "md",
  mdx: "mdx",
  mjs: "javascript",
  ps1: "powershell",
  psm1: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  txt: "text",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const FILE_NAME_LANGUAGE_MAP: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
};

function getLanguageForFile(filePath: string): string {
  const fileName = getFileName(filePath);
  const lowerFileName = fileName.toLowerCase();

  if (FILE_NAME_LANGUAGE_MAP[lowerFileName]) {
    return FILE_NAME_LANGUAGE_MAP[lowerFileName];
  }

  const extension = lowerFileName.includes(".")
    ? lowerFileName.split(".").pop()
    : "";

  if (extension && EXTENSION_LANGUAGE_MAP[extension]) {
    return EXTENSION_LANGUAGE_MAP[extension];
  }

  return "text";
}

async function renderHighlightedCode(content: string, filePath: string): Promise<void> {
  try {
    const { codeToHtml } = await import("shiki");
    const container = ensureDivContent("modal-code-content");
    if (!container) return;

    container.innerHTML = await codeToHtml(content, {
      lang: getLanguageForFile(filePath),
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    });
  } catch {
    renderPlainText(content);
  }
}

function updateViewButtons(): void {
  const renderBtn = document.getElementById("render-btn");
  const rawBtn = document.getElementById("raw-btn");
  const markdownFile = currentFilePath ? isMarkdownFile(currentFilePath) : false;

  if (!renderBtn || !rawBtn) return;

  if (!markdownFile) {
    renderBtn.classList.add("hidden");
    rawBtn.classList.add("hidden");
    return;
  }

  if (currentViewMode === "rendered") {
    renderBtn.classList.add("hidden");
    rawBtn.classList.remove("hidden");
    return;
  }

  rawBtn.classList.add("hidden");
  renderBtn.classList.remove("hidden");
}

async function renderCurrentFileContent(): Promise<void> {
  if (!currentFilePath) return;

  updateViewButtons();

  if (!currentFileContent) {
    renderPlainText(
      "Failed to load file content. Click the button below to view on GitHub."
    );
    return;
  }

  if (isMarkdownFile(currentFilePath) && currentViewMode === "rendered") {
    const container = ensureDivContent("modal-rendered-content");
    if (!container) return;

    const { body: markdownBody } = fm(currentFileContent);
    container.innerHTML = marked(markdownBody, { async: false });
  } else {
    await renderHighlightedCode(currentFileContent, currentFilePath);
  }

  const modalBody = getModalBody();
  if (modalBody) {
    modalBody.scrollTop = 0;
  }
}

async function configureSkillFileSwitcher(filePath: string): Promise<void> {
  const switcher = document.getElementById("modal-file-switcher");
  const fileButtonLabel = document.getElementById("modal-file-button-label");
  const menu = document.getElementById("modal-file-menu");

  if (!switcher || !fileButtonLabel || !menu) return;

  const skillItem = await getSkillItemByFilePath(filePath);
  if (currentFilePath !== filePath) return;

  if (!skillItem || skillItem.files.length <= 1) {
    switcher.classList.add("hidden");
    fileButtonLabel.textContent = "";
    menu.innerHTML = "";
    return;
  }

  fileButtonLabel.textContent = getFileName(filePath);
  menu.innerHTML = skillItem.files
    .map(
      (file) =>
        `<button type="button" class="modal-file-menu-item${
          file.path === filePath ? " active" : ""
        }" data-path="${escapeHtml(file.path)}" role="menuitemradio" aria-checked="${
          file.path === filePath ? "true" : "false"
        }">${escapeHtml(file.name)}</button>`
    )
    .join("");
  switcher.classList.remove("hidden");
}

function hideSkillFileSwitcher(): void {
  const switcher = document.getElementById("modal-file-switcher");
  const fileButtonLabel = document.getElementById("modal-file-button-label");
  const menu = document.getElementById("modal-file-menu");
  const dropdown = document.getElementById("modal-file-dropdown");
  const fileButton = document.getElementById("modal-file-button");
  const fileToggle = document.getElementById("modal-file-toggle");

  switcher?.classList.add("hidden");
  dropdown?.classList.remove("open");
  fileButton?.setAttribute("aria-expanded", "false");
  fileToggle?.setAttribute("aria-expanded", "false");
  if (fileButtonLabel) fileButtonLabel.textContent = "";
  if (menu) menu.innerHTML = "";
}

// Plugin data cache
interface PluginItem {
  path: string;
  kind: string;
  usage?: string | null;
}

interface PluginAuthor {
  name: string;
  url?: string;
}

interface PluginSource {
  source: string;
  repo?: string;
  path?: string;
}

interface Plugin {
  id: string;
  name: string;
  description?: string;
  path: string;
  items: PluginItem[];
  tags?: string[];
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  author?: PluginAuthor | null;
  license?: string | null;
  source?: PluginSource | null;
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

  // Move modal to body level to escape ancestor stacking contexts
  // This fixes the issue where modal appears below header/theme-toggle
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById("close-modal");
  const copyBtn = document.getElementById("copy-btn");
  const downloadBtn = document.getElementById("download-btn");
  const shareBtn = document.getElementById("share-btn");
  const renderBtn = document.getElementById("render-btn");
  const rawBtn = document.getElementById("raw-btn");
  const fileDropdown = document.getElementById("modal-file-dropdown");
  const fileButton = document.getElementById("modal-file-button");
  const fileToggle = document.getElementById("modal-file-toggle");
  const fileMenu = document.getElementById("modal-file-menu");

  if (!modal) return;

  closeBtn?.addEventListener("click", () => closeModal());

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
      if (currentFileType === "skill") {
        const skill = await getSkillItemByFilePath(currentFilePath);
        if (!skill || skill.files.length === 0) {
          showToast("No files found for this skill.", "error");
          return;
        }

        try {
          await downloadZipBundle(getSkillDownloadName(skill), skill.files);
          showToast("Download started!", "success");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Download failed";
          showToast(message, "error");
        }
        return;
      }

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

  renderBtn?.addEventListener("click", async () => {
    currentViewMode = "rendered";
    await renderCurrentFileContent();
  });

  rawBtn?.addEventListener("click", async () => {
    currentViewMode = "raw";
    await renderCurrentFileContent();
  });

  const setFileMenuOpen = (isOpen: boolean): void => {
    if (!fileDropdown) return;
    fileDropdown.classList.toggle("open", isOpen);
    fileButton?.setAttribute("aria-expanded", String(isOpen));
    fileToggle?.setAttribute("aria-expanded", String(isOpen));
  };

  const toggleFileMenu = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = !fileDropdown?.classList.contains("open");
    setFileMenuOpen(Boolean(isOpen));
    if (isOpen) {
      fileMenu
        ?.querySelector<HTMLElement>(".modal-file-menu-item.active, .modal-file-menu-item")
        ?.focus();
    }
  };

  fileButton?.addEventListener("click", toggleFileMenu);
  fileToggle?.addEventListener("click", toggleFileMenu);

  fileButton?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      toggleFileMenu(e);
    }
  });

  fileToggle?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      toggleFileMenu(e);
    }
  });

  fileMenu?.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".modal-file-menu-item"
    );
    const targetPath = target?.dataset.path;
    if (!target || !targetPath || !currentFileType) return;
    setFileMenuOpen(false);
    await openFileModal(
      targetPath,
      currentFileType,
      true,
      triggerElement || undefined
    );
  });

  fileMenu?.addEventListener("keydown", async (event) => {
    const items = Array.from(
      fileMenu.querySelectorAll<HTMLButtonElement>(".modal-file-menu-item")
    );
    const currentIndex = items.findIndex((item) => item === event.target);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        } else {
          fileButton?.focus();
        }
        break;
      case "Escape":
        event.preventDefault();
        setFileMenuOpen(false);
        fileButton?.focus();
        break;
      case "Tab":
        setFileMenuOpen(false);
        break;
      case "Enter":
      case " ":
        if (currentIndex >= 0 && currentFileType) {
          const targetPath = items[currentIndex].dataset.path;
          if (!targetPath) return;
          event.preventDefault();
          setFileMenuOpen(false);
          await openFileModal(
            targetPath,
            currentFileType,
            true,
            triggerElement || undefined
          );
        }
        break;
    }
  });

  // Setup install dropdown toggle
  setupInstallDropdown("install-dropdown");

  // Handle browser back/forward navigation
  window.addEventListener("hashchange", handleHashChange);

  document.addEventListener("click", (e) => {
    if (fileDropdown && !fileDropdown.contains(e.target as Node)) {
      setFileMenuOpen(false);
    }
  });

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
  if (!modal || !title) return;

  currentFilePath = filePath;
  currentFileType = type;
  currentViewMode = "raw";

  // Track trigger element for focus return
  triggerElement =
    trigger || triggerElement || (document.activeElement as HTMLElement);

  // Update URL for deep linking
  if (updateUrl) {
    updateHash(filePath);
  }

  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title;
  }

  // Show modal with loading state
  const fallbackName = getFileName(filePath);
  updateModalTitle(fallbackName, filePath);
  modal.classList.remove("hidden");
  modal.classList.add("visible");

  // Set focus to close button for accessibility
  setTimeout(() => {
    closeBtn?.focus();
  }, 0);

  // Handle plugins differently - show as item list
  if (type === "plugin") {
    const modalContent = getModalContent();
    if (!modalContent) return;
    hideSkillFileSwitcher();
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

  // Show copy/download buttons for regular files
  if (copyBtn) copyBtn.style.display = "inline-flex";
  if (downloadBtn) downloadBtn.style.display = "inline-flex";
  if (downloadBtn) {
    downloadBtn.setAttribute(
      "aria-label",
      type === "skill" ? "Download skill as ZIP" : "Download file"
    );
  }
  renderPlainText("Loading...");
  hideSkillFileSwitcher();
  updateViewButtons();

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

  const [resolvedTitle, fileContent] = await Promise.all([
    resolveResourceTitle(filePath, type),
    fetchFileContent(filePath),
    type === "skill" ? configureSkillFileSwitcher(filePath) : Promise.resolve(),
  ]);

  if (currentFilePath !== filePath) {
    return;
  }

  updateModalTitle(resolvedTitle, filePath);
  currentFileContent = fileContent;
  await renderCurrentFileContent();
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
    modalContent.innerHTML =
      '<div class="collection-loading">Loading plugin...</div>';
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

  // Render external plugin view (metadata + links) or local plugin view (items list)
  if (plugin.external) {
    renderExternalPluginModal(plugin, modalContent);
  } else {
    renderLocalPluginModal(plugin, modalContent);
  }
}

/**
 * Get the best URL for an external plugin, preferring the deep path within the repo
 */
function getExternalPluginUrl(plugin: Plugin): string {
  if (plugin.source?.source === "github" && plugin.source.repo) {
    const base = `https://github.com/${plugin.source.repo}`;
    return plugin.source.path
      ? `${base}/tree/main/${plugin.source.path}`
      : base;
  }
  // Sanitize URLs from JSON to prevent XSS via javascript:/data: schemes
  return sanitizeUrl(plugin.repository || plugin.homepage);
}

/**
 * Render modal content for an external plugin (no local files)
 */
function renderExternalPluginModal(
  plugin: Plugin,
  modalContent: HTMLElement
): void {
  const authorHtml = plugin.author?.name
    ? `<div class="external-plugin-meta-row">
        <span class="external-plugin-meta-label">Author</span>
        <span class="external-plugin-meta-value">${
          plugin.author.url
            ? `<a href="${sanitizeUrl(
                plugin.author.url
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                plugin.author.name
              )}</a>`
            : escapeHtml(plugin.author.name)
        }</span>
      </div>`
    : "";

  const repoHtml = plugin.repository
    ? `<div class="external-plugin-meta-row">
        <span class="external-plugin-meta-label">Repository</span>
        <span class="external-plugin-meta-value"><a href="${sanitizeUrl(
          plugin.repository
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        plugin.repository
      )}</a></span>
      </div>`
    : "";

  const homepageHtml =
    plugin.homepage && plugin.homepage !== plugin.repository
      ? `<div class="external-plugin-meta-row">
          <span class="external-plugin-meta-label">Homepage</span>
          <span class="external-plugin-meta-value"><a href="${sanitizeUrl(
            plugin.homepage
          )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          plugin.homepage
        )}</a></span>
        </div>`
      : "";

  const licenseHtml = plugin.license
    ? `<div class="external-plugin-meta-row">
        <span class="external-plugin-meta-label">License</span>
        <span class="external-plugin-meta-value">${escapeHtml(
          plugin.license
        )}</span>
      </div>`
    : "";

  const sourceHtml = plugin.source?.repo
    ? `<div class="external-plugin-meta-row">
        <span class="external-plugin-meta-label">Source</span>
        <span class="external-plugin-meta-value">GitHub: ${escapeHtml(
          plugin.source.repo
        )}${
        plugin.source.path ? ` (${escapeHtml(plugin.source.path)})` : ""
      }</span>
      </div>`
    : "";

  const repoUrl = getExternalPluginUrl(plugin);

  modalContent.innerHTML = `
    <div class="collection-view">
      <div class="collection-description">${escapeHtml(
        plugin.description || ""
      )}</div>
      ${
        plugin.tags && plugin.tags.length > 0
          ? `<div class="collection-tags">
              <span class="resource-tag resource-tag-external">🔗 External Plugin</span>
              ${plugin.tags
                .map(
                  (t) => `<span class="resource-tag">${escapeHtml(t)}</span>`
                )
                .join("")}
            </div>`
          : `<div class="collection-tags">
              <span class="resource-tag resource-tag-external">🔗 External Plugin</span>
            </div>`
      }
      <div class="external-plugin-metadata">
        ${authorHtml}
        ${repoHtml}
        ${homepageHtml}
        ${licenseHtml}
        ${sourceHtml}
      </div>
      <div class="external-plugin-cta">
        <a href="${sanitizeUrl(
          repoUrl
        )}" class="btn btn-primary external-plugin-repo-btn" target="_blank" rel="noopener noreferrer">
          View Repository →
        </a>
      </div>
      <div class="external-plugin-note">
        This is an external plugin maintained outside this repository. Browse the repository to see its contents and installation instructions.
      </div>
    </div>
  `;
}

/**
 * Render modal content for a local plugin (item list)
 */
function renderLocalPluginModal(
  plugin: Plugin,
  modalContent: HTMLElement
): void {
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
            <span class="collection-item-icon">${getResourceIconSvg(
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
      let path = (el as HTMLElement).dataset.path;
      const itemType = (el as HTMLElement).dataset.type;

      switch (itemType) {
        case "agent":
          path = path.replace(".md", ".agent.md");
          break;
        case "skill":
          path = `${path}/SKILL.md`;
          break;
      }

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
    modal.classList.remove("visible");
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
  currentViewMode = "raw";
  triggerElement = null;
  hideSkillFileSwitcher();
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
