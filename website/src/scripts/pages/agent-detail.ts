/**
 * Client behaviour for the agent detail page.
 *
 * The heavy lifting (metadata, rendered documentation) is done at build time,
 * so this only wires up the install split-button dropdown plus the Download
 * and Share actions in the sidebar Actions card.
 */
import { copyToClipboard, downloadFile, showToast } from "../utils";

function initAgentDetail(): void {
  const root = document.querySelector<HTMLElement>("[data-agent-detail]");
  if (!root) return;

  const filePath = root.dataset.path;

  // --- Install split-button dropdown ---
  const dropdown = root.querySelector<HTMLElement>("[data-install-menu]");
  const toggle = dropdown?.querySelector<HTMLButtonElement>(
    "[data-install-toggle]"
  );

  const closeMenu = () => {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  };

  toggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown!.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the menu on outside click / Escape.
  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
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
  document.addEventListener("DOMContentLoaded", initAgentDetail, { once: true });
} else {
  initAgentDetail();
}
