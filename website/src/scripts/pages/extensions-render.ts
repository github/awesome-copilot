import {
  escapeHtml,
  getGitHubHandle,
  getGitHubUrl,
  getLastUpdatedHtml,
} from "../utils";
import { sanitizeHttpUrl } from "../../lib/external-source";
import { renderEmptyStateHtml, renderSharedCardHtml } from "./card-render";

// Allow only http(s) URLs from external/generated data; unsafe values collapse
// to "" so downstream truthiness guards (disabled buttons, omitted links) hold.
function safeUrl(value?: string | null): string {
  const sanitized = sanitizeHttpUrl(value);
  return sanitized === "#" ? "" : sanitized;
}

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

export function getExtensionDetailUrl(id: string): string {
  return `/extension/${id}/`;
}

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
      const installUrl = safeUrl(
        item.installUrl ||
          (item.path && item.ref
            ? `https://github.com/github/awesome-copilot/tree/${item.ref}/${item.path.replace(
                /\\/g,
                "/"
              )}`
            : "")
      );
      const sourceUrl = safeUrl(
        item.sourceUrl || (item.path ? getGitHubUrl(item.path) : "")
      );
      const pluginId = item.pluginName || item.id;
      const ghappInstallUrl =
        !item.external && pluginId
          ? `ghapp://plugins/install?source=${encodeURIComponent(
              `${pluginId}@awesome-copilot`
            )}`
          : "";

      const previewImageUrl = safeUrl(item.imageUrl);
      const previewMediaHtml = previewImageUrl
        ? `<div class="resource-thumbnail-btn" aria-hidden="true">
            <img class="resource-thumbnail" src="${escapeHtml(previewImageUrl)}" alt="${escapeHtml(item.name)} preview" loading="lazy" />
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
        ${
          ghappInstallUrl
            ? `<a
          class="btn btn-primary btn-small"
          href="${escapeHtml(ghappInstallUrl)}"
          title="Install in the GitHub Copilot app"
        >
          Install in Copilot app
        </a>`
            : ""
        }
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
        href: getExtensionDetailUrl(item.id),
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
