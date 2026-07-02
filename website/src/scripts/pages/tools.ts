/**
 * Tools page functionality
 */
import { escapeHtml } from "../utils";
import { openCardDetailsModal } from "../modal";
import { initListingPage } from "./listing-controller";
import {
  renderToolModalLinks,
  renderToolsHtml,
  sortTools,
  toolCategories,
  toolSearchText,
  type RenderableTool,
  type ToolSortOption,
} from "./tools-render";

interface Tool extends RenderableTool {}

const COPY_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>';

function buildSection(heading: string, items: string[]): string {
  if (!items.length) return "";
  return `<div class="tool-section"><h3>${heading}</h3><ul>${items
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join("")}</ul></div>`;
}

function openToolDetailsModal(item: Tool, trigger?: HTMLElement): void {
  const badges: string[] = [];
  if (item.category) {
    badges.push(`<span class="resource-tag">${escapeHtml(item.category)}</span>`);
  }
  if (item.featured) {
    badges.push('<span class="resource-tag tag-featured">Featured</span>');
  }

  const sections: string[] = [
    buildSection("Features", item.features ?? []),
    buildSection("Requirements", item.requirements ?? []),
  ];

  if (item.configuration?.content) {
    const encoded = encodeURIComponent(item.configuration.content);
    sections.push(
      `<div class="tool-config"><h3>Configuration</h3><div class="tool-config-wrapper"><pre><code>${escapeHtml(
        item.configuration.content
      )}</code></pre></div><button class="copy-config-btn" type="button" data-config="${encoded}">${COPY_SVG}<span>Copy configuration</span></button></div>`
    );
  }

  const tagsHtml = item.tags?.length
    ? `<div class="tool-tags">${item.tags
        .map((tag) => `<span class="tool-tag">${escapeHtml(tag)}</span>`)
        .join("")}</div>`
    : "";

  const detailsHtml = `
    <div class="resource-details-body modal-card-details-body tool-details-modal">
      <div class="resource-details-content">
        <p class="resource-details-description">${escapeHtml(
          item.description || "No description"
        )}</p>
        ${
          badges.length
            ? `<div class="resource-meta resource-details-meta">${badges.join(
                ""
              )}</div>`
            : ""
        }
        ${sections.filter(Boolean).join("")}
        ${tagsHtml}
        <div class="resource-actions resource-details-actions">${renderToolModalLinks(
          item
        )}</div>
      </div>
    </div>`;

  openCardDetailsModal({
    title: item.name,
    description: item.description || "No description",
    detailsHtml,
    trigger,
  });
}

/** Delegated handler for the bespoke copy-configuration button (modal only). */
function setupCopyConfigHandlers(): void {
  document.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest(
      ".copy-config-btn"
    ) as HTMLButtonElement | null;
    if (!button) return;

    event.stopPropagation();
    const config = decodeURIComponent(button.dataset.config || "");
    try {
      await navigator.clipboard.writeText(config);
      const originalHtml = button.innerHTML;
      button.classList.add("copied");
      button.innerHTML = `${COPY_SVG}<span>Copied!</span>`;
      window.setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = originalHtml;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  });
}

setupCopyConfigHandlers();

initListingPage<Tool>({
  dataFile: "tools.json",
  keyOf: (item) => item.id,
  search: toolSearchText,
  facetValues: (item) => ({ category: toolCategories(item) }),
  sort: (items, sort) => sortTools(items, sort as ToolSortOption),
  render: renderToolsHtml,
  noun: "tool",
  defaultSort: "featured",
  openModal: openToolDetailsModal,
});
