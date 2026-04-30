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

export function renderSkillsHtml(items: RenderableSkill[]): string {
  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No skills found</h3>
        <p>No skills are available right now.</p>
      </div>
    `;
  }

  return items
    .map((item) => {
      return `
        <article class="resource-item" data-path="${escapeHtml(
          item.skillFile
        )}" data-skill-id="${escapeHtml(item.id)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${escapeHtml(item.title)}</div>
              <div class="resource-description">${escapeHtml(
                item.description || "No description"
              )}</div>
              <div class="resource-meta">
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
            <button class="btn btn-secondary copy-install-btn" data-skill-id="${escapeHtml(
              item.id
            )}" title="Copy install command">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
              </svg>
              Copy Install
            </button>
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
