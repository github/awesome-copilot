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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initResourceDetail, {
    once: true,
  });
} else {
  initResourceDetail();
}
