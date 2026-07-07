import {
  escapeHtml,
  getGitHubHandle,
  getGitHubUrl,
  getLastUpdatedHtml,
} from "../utils";
import { renderEmptyStateHtml, renderSharedCardHtml } from "./card-render";

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
    gallery?:
      | {
          path?: string | null;
          type?: string | null;
        }
      | Array<{
          path?: string | null;
          type?: string | null;
        }>
      | null;
  } | null;
  imageUrl?: string | null;
  assetPath?: string | null;
  pluginName?: string | null;
  installCommand?: string | null;
  installUrl?: string | null;
  sourceUrl?: string | null;
  external?: boolean;
  author?: { name: string; url?: string } | null;
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
    return renderEmptyStateHtml(
      "No extensions found",
      "No canvas extensions are available right now."
    );
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
      const installCommand =
        item.installCommand ||
        (item.pluginName ? `copilot plugin install ${item.pluginName}@awesome-copilot` : "");
      const sourceUrl =
        item.sourceUrl || (item.path ? getGitHubUrl(item.path) : "");

      const previewMediaHtml = item.imageUrl
        ? `<div class="resource-thumbnail-btn" data-extension-id="${escapeHtml(item.id)}" aria-hidden="true">
            <img class="resource-thumbnail" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)} preview" loading="lazy" />
           </div>`
        : `<div class="resource-thumbnail resource-thumbnail-placeholder" aria-hidden="true">Canvas</div>`;

      const infoExtraHtml = `
        <div class="resource-keywords">
          ${
           item.keywords && item.keywords.length > 0
             ? item.keywords
                 .map((kw) => `<span class="keyword-tag">${escapeHtml(kw)}</span>`)
                 .join("")
             : ""
          }
        </div>
      `;

      const authorName = item.author?.name;
      const authorUrl = item.author?.url;
      const authorHandle =
        authorName && authorUrl
          ? getGitHubHandle(authorUrl, authorName)
          : authorName || "";
      const authorHtml = authorName
        ? `<span class="resource-tag resource-author" title="${escapeHtml(
            authorName
          )}">by ${escapeHtml(authorHandle || authorName)}</span>`
        : "";

      const metaHtml = `
        ${item.external ? '<span class="resource-tag">External</span>' : ""}
        ${authorHtml}
        ${getLastUpdatedHtml(item.lastUpdated)}
      `;

      const actionsHtml = `
        <button
          class="btn btn-primary btn-small copy-install-url-btn"
          data-install-command="${escapeHtml(installCommand)}"
          title="Copy plugin install command"
          ${installCommand ? "" : "disabled"}
        >
          Copy Install
        </button>
        <button
          class="btn btn-secondary btn-small copy-install-url-btn"
          data-install-url="${escapeHtml(installUrl)}"
          title="Copy fallback URL install target"
          ${installUrl ? "" : "disabled"}
        >
          Copy URL
        </button>
        ${
          sourceUrl
           ? `<a href="${escapeHtml(
               sourceUrl
             )}" class="btn btn-secondary btn-small" target="_blank" rel="noopener noreferrer" title="View source">Source</a>`
           : ""
        }
      `;

      return renderSharedCardHtml({
        title: item.name,
        description: item.description || "Canvas extension",
        previewMediaHtml,
        infoExtraHtml,
        metaHtml,
        actionsHtml,
        articleAttributes: {
          id: item.id,
          "data-extension-id": item.id,
        },
      });
    })
    .join("");
}
