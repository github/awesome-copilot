import { escapeHtml, getGitHubUrl, getLastUpdatedHtml } from "../utils";

export interface RenderableExtension {
  id: string;
  name: string;
  path: string;
  ref: string;
  lastUpdated?: string | null;
}

export type ExtensionSortOption = "title" | "lastUpdated";

export function sortExtensions<T extends RenderableExtension>(
  items: T[],
  sort: ExtensionSortOption
): T[] {
  return [...items].sort((a, b) => {
    if (sort === "lastUpdated") {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    }

    return a.name.localeCompare(b.name);
  });
}

export function renderExtensionsHtml(items: RenderableExtension[]): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No extensions found</h3>
        <p>No canvas extensions are available right now.</p>
      </div>
    `;
  }

  return items
    .map(
      (item) => `
        <article class="resource-item" role="listitem">
          <div class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${escapeHtml(item.name)}</div>
              <div class="resource-description">Canvas extension</div>
              <div class="resource-meta">
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </div>
          <div class="resource-actions">
            <button
              class="btn btn-primary btn-small copy-install-url-btn"
              data-install-url="${escapeHtml(
                `https://github.com/github/awesome-copilot/tree/${item.ref}/${item.path.replace(
                  /\\/g,
                  "/"
                )}`
              )}"
              title="Copy install URL"
            >
              Install
            </button>
            <a href="${getGitHubUrl(
              item.path
            )}" class="btn btn-secondary btn-small" target="_blank" rel="noopener noreferrer" title="View on GitHub">GitHub</a>
          </div>
        </article>
      `
    )
    .join("");
}
