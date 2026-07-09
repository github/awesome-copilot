/**
 * Shared client behaviour for resource detail pages (agents, instructions, ...).
 *
 * The heavy lifting (metadata, rendered documentation) is done at build time,
 * so this only wires up the install split-button dropdown plus the Download,
 * Copy markdown, and Share actions in the sidebar Actions card. Any detail page
 * that renders a root element with `data-resource-detail` gets this behaviour.
 */
import { copyToClipboard, downloadFile, showToast } from "../utils";

function initResourceDetail(): void {
  const root = document.querySelector<HTMLElement>("[data-resource-detail]");
  if (!root) return;

  const filePath = root.dataset.path;

  // --- Install split-button dropdown ---
  const dropdown = root.querySelector<HTMLElement>("[data-install-menu]");
  const toggle = dropdown?.querySelector<HTMLButtonElement>(
    "[data-install-toggle]"
  );
  const menuItems = dropdown
    ? Array.from(
        dropdown.querySelectorAll<HTMLAnchorElement>(
          ".install-dropdown-menu a[role='menuitem']"
        )
      )
    : [];

  const closeMenu = (returnFocus = false) => {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    if (returnFocus) {
      toggle?.focus();
    }
  };

  const openMenu = () => {
    if (!dropdown) return;
    dropdown.classList.add("open");
    toggle?.setAttribute("aria-expanded", "true");
    menuItems[0]?.focus();
  };

  toggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown!.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      menuItems[0]?.focus();
    }
  });

  toggle?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  });

  menuItems.forEach((item, index) => {
    item.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          menuItems[(index + 1) % menuItems.length]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          menuItems[
            (index - 1 + menuItems.length) % menuItems.length
          ]?.focus();
          break;
        case "Home":
          e.preventDefault();
          menuItems[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          menuItems[menuItems.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          closeMenu(true);
          break;
        case "Tab":
          closeMenu();
          break;
      }
    });

    item.addEventListener("click", () => {
      closeMenu();
    });
  });

  // Close the menu on outside click / Escape.
  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dropdown?.classList.contains("open")) {
      closeMenu(true);
    }
  });

  // --- Download (also available as a menu item) ---
  root
    .querySelectorAll<HTMLElement>("[data-action='download']")
    .forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        closeMenu();
        if (!filePath) return;
        const success = await downloadFile(filePath);
        showToast(
          success ? "Download started!" : "Download failed",
          success ? "success" : "error"
        );
      });
    });

  // --- Copy raw markdown (embedded at build time) ---
  const rawMarkdown =
    root.querySelector<HTMLTextAreaElement>("[data-raw-markdown]")?.value ?? "";
  root
    .querySelectorAll<HTMLElement>("[data-action='copy-markdown']")
    .forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        closeMenu();
        if (!rawMarkdown) return;
        const success = await copyToClipboard(rawMarkdown);
        showToast(
          success ? "Markdown copied!" : "Failed to copy markdown",
          success ? "success" : "error"
        );
      });
    });

  // --- Copy install command (embedded at build time) ---
  const installBlock = root.querySelector<HTMLElement>(
    "[data-install-command]"
  );
  root
    .querySelectorAll<HTMLElement>("[data-action='copy-install']")
    .forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        closeMenu();
        const command = installBlock?.dataset.installCommand ?? "";
        if (!command) return;
        const success = await copyToClipboard(command);
        showToast(
          success ? "Install command copied!" : "Failed to copy command",
          success ? "success" : "error"
        );
      });
    });

  // --- Copy install URL (fallback install target) ---
  root
    .querySelectorAll<HTMLElement>("[data-action='copy-install-url']")
    .forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        closeMenu();
        const url = el.dataset.installUrl ?? "";
        if (!url) return;
        const success = await copyToClipboard(url);
        showToast(
          success ? "Install URL copied!" : "Failed to copy URL",
          success ? "success" : "error"
        );
      });
    });

  // --- Share ---
  const shareBtn = root.querySelector<HTMLButtonElement>(
    "[data-action='share']"
  );
  shareBtn?.addEventListener("click", async () => {
    const success = await copyToClipboard(window.location.href);
    showToast(
      success ? "Link copied!" : "Failed to copy link",
      success ? "success" : "error"
    );
  });

  // --- Copy buttons on documentation code blocks ---
  enhanceCodeBlocks(root);
}

const COPY_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>`;

/**
 * Adds a "Copy" button to every fenced code block in the rendered
 * documentation. The markdown is turned into plain `<pre><code>` at build
 * time (no highlighter), so there is no copy affordance otherwise — a real
 * pain on instruction/prompt pages that are mostly config and code snippets.
 */
function enhanceCodeBlocks(root: HTMLElement): void {
  const blocks = root.querySelectorAll<HTMLPreElement>(".article-content pre");
  blocks.forEach((pre) => {
    const code = pre.querySelector("code");
    // Skip blocks with no code or that were already enhanced.
    if (!code || pre.parentElement?.classList.contains("code-block")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy-btn";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.innerHTML = COPY_ICON;

    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    btn.addEventListener("click", async () => {
      const success = await copyToClipboard(code.textContent ?? "");
      showToast(
        success ? "Code copied!" : "Failed to copy code",
        success ? "success" : "error"
      );
      if (!success) return;
      btn.classList.add("copied");
      btn.innerHTML = CHECK_ICON;
      window.clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        btn.classList.remove("copied");
        btn.innerHTML = COPY_ICON;
      }, 2000);
    });

    wrapper.appendChild(btn);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initResourceDetail, {
    once: true,
  });
} else {
  initResourceDetail();
}
