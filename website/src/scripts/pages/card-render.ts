import { escapeHtml } from "../utils";

export interface SharedCardRenderItem {
  title: string;
  description?: string;
  role?: string;
  tabIndex?: number;
  articleClassName?: string;
  articleAttributes?: Record<string, string>;
  previewMediaHtml?: string;
  infoExtraHtml?: string;
  metaHtml?: string;
  actionsHtml?: string;
  /**
   * When provided, the card preview renders as a link to a dedicated detail
   * page instead of a button that opens a modal. This enables real URL deep
   * linking and native open-in-new-tab behaviour.
   */
  href?: string;
}

function renderAttributes(attributes?: Record<string, string>): string {
  if (!attributes) return "";
  return Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join("");
}

export function renderEmptyStateHtml(title: string, description: string): string {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

export function renderSharedCardHtml(item: SharedCardRenderItem): string {
  const role = item.role ?? "listitem";
  const articleClass = item.articleClassName
    ? `resource-item ${item.articleClassName}`
    : "resource-item";

  const previewInner = `
        ${item.previewMediaHtml || ""}
        <div class="resource-info">
          <div class="resource-title">${escapeHtml(item.title)}</div>
          <div class="resource-description">${escapeHtml(item.description || "No description")}</div>
          ${item.infoExtraHtml || ""}
          <div class="resource-meta">
            ${item.metaHtml || ""}
          </div>
        </div>`;

  const preview = item.href
    ? `<a class="resource-preview" href="${escapeHtml(item.href)}">${previewInner}
      </a>`
    : `<button type="button" class="resource-preview">${previewInner}
      </button>`;

  return `
    <div class="${articleClass}" role="${escapeHtml(role)}"${item.tabIndex !== undefined ? ` tabindex="${String(item.tabIndex)}"` : ""}${renderAttributes(item.articleAttributes)}>
      ${preview}
      ${item.actionsHtml ? `<div class="resource-actions">${item.actionsHtml}</div>` : ""}
    </div>
  `;
}
