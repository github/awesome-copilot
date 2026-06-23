import {
  escapeHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from "../utils";

export interface RenderableHook {
  id: string;
  title: string;
  description?: string;
  path: string;
  readmeFile: string;
  hooks: string[];
  tags: string[];
  assets: string[];
  lastUpdated?: string | null;
}

export type HookSortOption = "title" | "lastUpdated";

function getStableAccent(item: RenderableHook): string {
  const accents = ['purple', 'blue', 'green', 'yellow'];
  let hash = 0;
  for (const char of item.id || item.title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return accents[hash % accents.length];
}

export function sortHooks<T extends RenderableHook>(
  items: T[],
  sort: HookSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === "lastUpdated") {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.title.localeCompare(b.title);
  });
}

export function renderHooksHtml(items: RenderableHook[]): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No hooks found</h3>
        <p>Try adjusting the selected filters.</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      return `
        <article class="resource-item resource-card resource-card--${getStableAccent(item)}" data-path="${escapeHtml(
          item.readmeFile
        )}" data-hook-id="${escapeHtml(item.id)}" role="listitem">
          <button type="button" class="resource-card__preview resource-preview" aria-label="Preview ${escapeHtml(item.title)}">
            <div class="resource-card__topline">
              <span class="badge badge--blue">hook</span>
            </div>
            <div class="resource-card__body">
              <h2 class="resource-card__title">${escapeHtml(item.title)}</h2>
              <p class="resource-card__description">${escapeHtml(
                item.description || "No description"
              )}</p>
              <div class="resource-card__tags resource-meta">
                ${item.hooks
                  .map(
                    (hook) =>
                      `<span>${escapeHtml(
                        hook
                      )}</span>`
                  )
                  .join("")}
                ${item.tags
                  .map(
                    (tag) =>
                      `<span>${escapeHtml(
                        tag
                      )}</span>`
                  )
                  .join("")}
                ${
                  item.assets.length > 0
                    ? `<span>${
                        item.assets.length
                      } asset${item.assets.length === 1 ? "" : "s"}</span>`
                    : ""
                }
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-card__footer resource-actions">
            <button type="button" class="btn btn-primary download-hook-btn" data-hook-id="${escapeHtml(
              item.id
            )}" title="Download as ZIP" aria-label="Download ${escapeHtml(item.title)} as ZIP">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"/>
              </svg>
              Download
            </button>
            <a href="${getGitHubUrl(
              item.path
            )}" class="btn btn-secondary" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">GitHub</a>
          </div>
        </article>
      `;
    })
    .join("");
}
