import { escapeHtml, getGitHubHandle, getGitHubUrl } from "../utils";
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from "./resource-card";

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

export function getExtensionInstallUrl(item: RenderableExtension): string {
  return (
    item.installUrl ||
    (item.path && item.ref
      ? `https://github.com/github/awesome-copilot/tree/${item.ref}/${item.path.replace(
          /\\/g,
          "/"
        )}`
      : "")
  );
}

export function getExtensionSourceUrl(item: RenderableExtension): string {
  return item.sourceUrl || (item.path ? getGitHubUrl(item.path) : "");
}

export function extensionAuthorHandle(item: RenderableExtension): string {
  const authorName = item.author?.name;
  const authorUrl = item.author?.url;
  if (!authorName) return "";
  return authorUrl ? getGitHubHandle(authorUrl, authorName) : authorName;
}

export function extensionSource(item: RenderableExtension): string[] {
  return item.external ? ["external"] : ["local"];
}

export function extensionSearchText(item: RenderableExtension): string {
  return [
    item.name,
    item.description ?? "",
    item.author?.name ?? "",
    (item.keywords ?? []).join(" "),
    item.external ? "external" : "local",
  ].join(" ");
}

export function renderExtensionsHtml(items: RenderableExtension[]): string {
  const models: RCardModel[] = items.map((item) => {
    const safeName = escapeHtml(item.name);
    const installUrl = getExtensionInstallUrl(item);
    const sourceUrl = getExtensionSourceUrl(item);

    const mediaHtml = item.imageUrl
      ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" />`
      : undefined;

    const facts: RCardFact[] = [];
    const handle = extensionAuthorHandle(item);
    if (handle) {
      facts.push({ icon: FACT_ICONS.author, label: `by ${handle}` });
    }
    if (item.keywords?.length) {
      facts.push({
        icon: FACT_ICONS.tag,
        label: `${item.keywords.length} keyword${
          item.keywords.length === 1 ? "" : "s"
        }`,
      });
    }

    const installHtml = `<button type="button" class="btn btn-primary btn-small copy-install-url-btn" data-install-url="${escapeHtml(
      installUrl
    )}" ${
      installUrl ? "" : "disabled"
    } onclick="event.stopPropagation()" title="Copy install URL"><span>Copy URL</span></button>`;

    const sourceHtml = sourceUrl
      ? `<a href="${escapeHtml(
          sourceUrl
        )}" class="btn btn-secondary btn-small action-github rcard-lead" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="View source" aria-label="View ${safeName} source">${GITHUB_MARK}</a>`
      : "";

    return {
      accent: "extension",
      icon: TYPE_ICONS.browser,
      title: item.name,
      description: item.description || "Canvas extension",
      path: item.id,
      badge: item.external ? { text: "External" } : null,
      facts,
      actionsHtml: `${installHtml}${sourceHtml}`,
      attributes: { "data-extension-id": item.id },
      articleClassName: item.external ? "resource-item-external" : undefined,
      mediaHtml,
    };
  });

  return renderResourceGridHtml(
    models,
    "No extensions found",
    "No canvas extensions match your filters."
  );
}
