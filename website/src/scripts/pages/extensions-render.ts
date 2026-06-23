import { escapeHtml, getGitHubUrl, getLastUpdatedHtml } from "../utils";

export interface RenderableExtension {
  id: string;
  canvasId?: string;
  extensionId?: string;
  extensionName?: string;
  name: string;
  path?: string | null;
  ref?: string | null;
  version?: string | null;
  description?: string;
  lastUpdated?: string | null;
  keywords?: string[];
  screenshots?: {
    icon?: {
      path?: string | null;
      type?: string | null;
    } | null;
    gallery?: {
      path?: string | null;
      type?: string | null;
    } | null;
  } | null;
  imageUrl?: string | null;
  assetPath?: string | null;
  installUrl?: string | null;
  sourceUrl?: string | null;
  external?: boolean;
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
    .map((item) => {
      const installUrl =
        item.installUrl ||
        (item.path && item.ref
          ? `https://github.com/github/awesome-copilot/tree/${item.ref}/${item.path.replace(
             /\\/g,
             "/"
           )}`
          : "");
      const sourceUrl =
        item.sourceUrl || (item.path ? getGitHubUrl(item.path) : "");

      return `
        <article id="${escapeHtml(item.id)}" class="resource-item" role="listitem">
          <div class="resource-preview">
           ${
             item.imageUrl
               ? `<button type="button" class="resource-thumbnail-btn" data-preview-url="${escapeHtml(item.imageUrl)}" data-preview-alt="${escapeHtml(item.name)} preview" aria-label="Open ${escapeHtml(item.name)} preview">
                    <img class="resource-thumbnail" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)} preview" loading="lazy" />
                  </button>`
               : `<div class="resource-thumbnail resource-thumbnail-placeholder" aria-hidden="true">Canvas</div>`
           }
           <div class="resource-info">
             <div class="resource-title">${escapeHtml(item.name)}</div>
             <div class="resource-description">${escapeHtml(
               item.description || "Canvas extension"
             )}</div>
             <div class="resource-keywords">
               ${
                 item.keywords && item.keywords.length > 0
                   ? item.keywords
                       .map(
                         (kw) =>
                           `<span class="keyword-tag">${escapeHtml(kw)}</span>`
                       )
                       .join("")
                   : ""
               }
             </div>
             <div class="resource-meta">
               ${
                 item.external
                   ? '<span class="resource-tag">External</span>'
                   : ""
               }
               ${getLastUpdatedHtml(item.lastUpdated)}
             </div>
           </div>
         </div>
          <div class="resource-actions">
            <button
              class="btn btn-primary btn-small copy-install-url-btn"
              data-install-url="${escapeHtml(installUrl)}"
              title="Copy install URL"
              ${installUrl ? "" : "disabled"}
            >
              Install
            </button>
            ${
              sourceUrl
                ? `<a href="${escapeHtml(
                    sourceUrl
                  )}" class="btn btn-secondary btn-small" target="_blank" rel="noopener noreferrer" title="View source">Source</a>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}
