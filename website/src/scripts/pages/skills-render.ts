import {
  escapeHtml,
  getGitHubUrl,
  getLastUpdatedHtml,
} from "../utils";

export interface RenderableSkillFile {
  name: string;
  path: string;
}

export interface RenderableSkill {
  id: string;
  title: string;
  description?: string;
  path: string;
  skillFile: string;
  category: string;
  hasAssets: boolean;
  assetCount: number;
  files: RenderableSkillFile[];
  lastUpdated?: string | null;
}

export type SkillSortOption = "title" | "lastUpdated";

export function sortSkills<T extends RenderableSkill>(
  items: T[],
  sort: SkillSortOption
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

export function renderSkillsHtml(
  items: RenderableSkill[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = "", highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No skills found</h3>
        <p>Try a different search term or adjust filters</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      const titleHtml =
        query && highlightTitle
          ? highlightTitle(item.title, query)
          : escapeHtml(item.title);

      return `
        <article class="resource-item" data-path="${escapeHtml(
          item.skillFile
        )}" data-skill-id="${escapeHtml(item.id)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${titleHtml}</div>
              <div class="resource-description">${escapeHtml(
                item.description || "No description"
              )}</div>
              <div class="resource-meta">
                <span class="resource-tag tag-category">${escapeHtml(
                  item.category
                )}</span>
                ${
                  item.hasAssets
                    ? `<span class="resource-tag tag-assets">${
                        item.assetCount
                      } asset${item.assetCount === 1 ? "" : "s"}</span>`
                    : ""
                }
                <span class="resource-tag">${item.files.length} file${
          item.files.length === 1 ? "" : "s"
        }</span>
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            <button class="btn btn-primary download-skill-btn" data-skill-id="${escapeHtml(
              item.id
            )}" title="Download as ZIP">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
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
