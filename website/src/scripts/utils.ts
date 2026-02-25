/**
 * Utility functions for the Awesome Copilot website
 */

const REPO_BASE_URL =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";
const REPO_GITHUB_URL = "https://github.com/github/awesome-copilot/blob/main";

// VS Code install URL configurations
const VSCODE_INSTALL_CONFIG: Record<
  string,
  { baseUrl: string; scheme: string }
> = {
  instructions: {
    baseUrl: "https://aka.ms/awesome-copilot/install/instructions",
    scheme: "chat-instructions",
  },
  instruction: {
    baseUrl: "https://aka.ms/awesome-copilot/install/instructions",
    scheme: "chat-instructions",
  },
  agent: {
    baseUrl: "https://aka.ms/awesome-copilot/install/agent",
    scheme: "chat-agent",
  },
};

/**
 * Get the base path for the site
 */
export function getBasePath(): string {
  // In Astro, import.meta.env.BASE_URL is available at build time
  // At runtime, we use a data attribute on the body
  if (typeof document !== "undefined") {
    return document.body.dataset.basePath || "/";
  }
  return "/";
}

/**
 * Fetch JSON data from the data directory
 */
export async function fetchData<T = unknown>(
  filename: string
): Promise<T | null> {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}data/${filename}`);
    if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error);
    return null;
  }
}

/**
 * Fetch raw file content from GitHub
 */
export async function fetchFileContent(
  filePath: string
): Promise<string | null> {
  try {
    const response = await fetch(`${REPO_BASE_URL}/${filePath}`);
    if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
    return await response.text();
  } catch (error) {
    console.error(`Error fetching file content:`, error);
    return null;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Deprecated fallback for older browsers that lack the async clipboard API.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Generate VS Code install URL
 * @param type - Resource type (agent, instructions)
 * @param filePath - Path to the file
 * @param insiders - Whether to use VS Code Insiders
 */
export function getVSCodeInstallUrl(
  type: string,
  filePath: string,
  insiders = false
): string | null {
  const config = VSCODE_INSTALL_CONFIG[type];
  if (!config) return null;

  const rawUrl = `${REPO_BASE_URL}/${filePath}`;
  const vscodeScheme = insiders ? "vscode-insiders" : "vscode";
  const innerUrl = `${vscodeScheme}:${
    config.scheme
  }/install?url=${encodeURIComponent(rawUrl)}`;

  return `${config.baseUrl}?url=${encodeURIComponent(innerUrl)}`;
}

/**
 * Get GitHub URL for a file
 */
export function getGitHubUrl(filePath: string): string {
  return `${REPO_GITHUB_URL}/${filePath}`;
}

/**
 * Get raw GitHub URL for a file (for fetching content)
 */
export function getRawGitHubUrl(filePath: string): string {
  return `${REPO_BASE_URL}/${filePath}`;
}

/**
 * Download a file from its path
 */
export async function downloadFile(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(`${REPO_BASE_URL}/${filePath}`);
    if (!response.ok) throw new Error("Failed to fetch file");

    const content = await response.text();
    const filename = filePath.split("/").pop() || "file.md";

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Download failed:", error);
    return false;
  }
}

/**
 * Share/copy link to clipboard (deep link to current page with file hash)
 */
export async function shareFile(filePath: string): Promise<boolean> {
  const deepLinkUrl = `${window.location.origin}${
    window.location.pathname
  }#file=${encodeURIComponent(filePath)}`;
  return copyToClipboard(deepLinkUrl);
}

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  type: "success" | "error" = "success"
): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string | undefined, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Get resource type from file path
 */
export function getResourceType(filePath: string): string {
  if (filePath.endsWith(".agent.md")) return "agent";
  if (filePath.endsWith(".instructions.md")) return "instruction";
  if (/(^|\/)skills\//.test(filePath) && filePath.endsWith("SKILL.md"))
    return "skill";
  if (/(^|\/)hooks\//.test(filePath) && filePath.endsWith("README.md"))
    return "hook";
  if (/(^|\/)workflows\//.test(filePath) && filePath.endsWith(".md"))
    return "workflow";
  // Check for plugin directories (e.g., plugins/<id>, plugins/<id>/)
  if (/(^|\/)plugins\/[^/]+\/?$/.test(filePath)) return "plugin";
  // Check for plugin.json files (e.g., plugins/<id>/.github/plugin/plugin.json)
  if (filePath.endsWith("/.github/plugin/plugin.json")) return "plugin";
  return "unknown";
}

/**
 * Format a resource type for display
 */
export function formatResourceType(type: string): string {
  const labels: Record<string, string> = {
    agent: "🤖 Agent",
    instruction: "📋 Instruction",
    skill: "⚡ Skill",
    hook: "🪝 Hook",
    workflow: "⚡ Workflow",
    plugin: "🔌 Plugin",
  };
  return labels[type] || type;
}

/**
 * Get icon for resource type
 */
export function getResourceIcon(type: string): string {
  const icons: Record<string, string> = {
    agent: "🤖",
    instruction: "📋",
    skill: "⚡",
    hook: "🪝",
    workflow: "⚡",
    plugin: "🔌",
  };
  return icons[type] || "📄";
}

/**
 * Generate HTML for install dropdown button
 */
export function getInstallDropdownHtml(
  type: string,
  filePath: string,
  small = false
): string {
  const vscodeUrl = getVSCodeInstallUrl(type, filePath, false);
  const insidersUrl = getVSCodeInstallUrl(type, filePath, true);

  if (!vscodeUrl) return "";

  const sizeClass = small ? "install-dropdown-small" : "";
  const uniqueId = `install-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return `
    <div class="install-dropdown ${sizeClass}" id="${uniqueId}" data-install-scope="list">
      <a href="${vscodeUrl}" class="btn btn-primary ${
    small ? "btn-small" : ""
  } install-btn-main" target="_blank" rel="noopener">
        Install
      </a>
      <button type="button" class="btn btn-primary ${
        small ? "btn-small" : ""
      } install-btn-toggle" aria-label="Install options" aria-expanded="false">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
        </svg>
      </button>
      <div class="install-dropdown-menu">
        <a href="${vscodeUrl}" target="_blank" rel="noopener">
          VS Code
        </a>
        <a href="${insidersUrl}" target="_blank" rel="noopener">
          VS Code Insiders
        </a>
      </div>
    </div>
  `;
}

/**
 * Setup dropdown close handlers for dynamically created dropdowns
 */
export function setupDropdownCloseHandlers(): void {
  if (dropdownHandlersReady) return;
  dropdownHandlersReady = true;

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const dropdown = target.closest(
        '.install-dropdown[data-install-scope="list"]'
      );
      const toggle = target.closest(
        ".install-btn-toggle"
      ) as HTMLButtonElement | null;
      const menuLink = target.closest(
        ".install-dropdown-menu a"
      ) as HTMLAnchorElement | null;

      if (dropdown) {
        e.stopPropagation();

        if (toggle) {
          e.preventDefault();
          const isOpen = dropdown.classList.toggle("open");
          toggle.setAttribute("aria-expanded", String(isOpen));
          return;
        }

        if (menuLink) {
          dropdown.classList.remove("open");
          const toggleBtn = dropdown.querySelector<HTMLButtonElement>(
            ".install-btn-toggle"
          );
          toggleBtn?.setAttribute("aria-expanded", "false");
          return;
        }

        return;
      }

      document
        .querySelectorAll('.install-dropdown[data-install-scope="list"].open')
        .forEach((openDropdown) => {
          openDropdown.classList.remove("open");
          const toggleBtn = openDropdown.querySelector<HTMLButtonElement>(
            ".install-btn-toggle"
          );
          toggleBtn?.setAttribute("aria-expanded", "false");
        });
    },
    true
  );
}

/**
 * Generate HTML for action buttons (download, share) in list view
 */
export function getActionButtonsHtml(filePath: string, small = false): string {
  const btnClass = small ? "btn-small" : "";
  const iconSize = small ? 14 : 16;

  return `
    <button class="btn btn-secondary ${btnClass} action-download" data-path="${escapeHtml(
    filePath
  )}" title="Download file">
      <svg viewBox="0 0 16 16" width="${iconSize}" height="${iconSize}" fill="currentColor">
        <path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/>
      </svg>
    </button>
    <button class="btn btn-secondary ${btnClass} action-share" data-path="${escapeHtml(
    filePath
  )}" title="Copy link">
      <svg viewBox="0 0 16 16" width="${iconSize}" height="${iconSize}" fill="currentColor">
        <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25zm-.025 5.45a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 1 1-2.83-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25z"/>
      </svg>
    </button>
  `;
}

/**
 * Setup global action handlers for download and share buttons
 */
export function setupActionHandlers(): void {
  if (actionHandlersReady) return;
  actionHandlersReady = true;

  document.addEventListener(
    "click",
    async (e) => {
      const target = (e.target as HTMLElement).closest(
        ".action-download, .action-share"
      ) as HTMLElement | null;
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      const path = target.dataset.path;
      if (!path) return;

      if (target.classList.contains("action-download")) {
        const success = await downloadFile(path);
        showToast(
          success ? "Download started!" : "Download failed",
          success ? "success" : "error"
        );
        return;
      }

      const success = await shareFile(path);
      showToast(
        success ? "Link copied!" : "Failed to copy link",
        success ? "success" : "error"
      );
    },
    true
  );
}

let dropdownHandlersReady = false;
let actionHandlersReady = false;

/**
 * Format a date as relative time (e.g., "3 days ago")
 * @param isoDate - ISO 8601 date string
 * @returns Relative time string
 */
export function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "Unknown";

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes === 0) return "just now";
      return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
}

/**
 * Format a date for display (e.g., "January 15, 2026")
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date string
 */
export function formatFullDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Unknown";

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate HTML for displaying last updated time with hover tooltip
 * @param isoDate - ISO 8601 date string
 * @returns HTML string with relative time and title attribute
 */
export function getLastUpdatedHtml(isoDate: string | null | undefined): string {
  const relativeTime = formatRelativeTime(isoDate);
  const fullDate = formatFullDate(isoDate);

  if (relativeTime === "Unknown") {
    return `<span class="last-updated">Updated: Unknown</span>`;
  }

  return `<span class="last-updated" title="${escapeHtml(
    fullDate
  )}">Updated ${relativeTime}</span>`;
}
