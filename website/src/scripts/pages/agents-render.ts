import {
  escapeHtml,
  getActionButtonsHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from "../utils";

export interface RenderableAgent {
  title: string;
  description?: string;
  path: string;
  model?: string;
  tools?: string[];
  hasHandoffs?: boolean;
  lastUpdated?: string | null;
}

export type AgentSortOption = "title" | "lastUpdated";

const resourceType = "agent";

export function sortAgents<T extends RenderableAgent>(
  items: T[],
  sort: AgentSortOption
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

export function renderAgentsHtml(
  items: RenderableAgent[],
  options: {
    query?: string;
    highlightTitle?: (title: string, query: string) => string;
  } = {}
): string {
  const { query = "", highlightTitle } = options;

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <h3>No agents found</h3>
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
        <article class="resource-item" data-path="${escapeHtml(item.path)}" role="listitem">
          <button type="button" class="resource-preview">
            <div class="resource-info">
              <div class="resource-title">${titleHtml}</div>
              <div class="resource-description">${escapeHtml(
                item.description || "No description"
              )}</div>
              <div class="resource-meta">
                ${
                  item.model
                    ? `<span class="resource-tag tag-model">${escapeHtml(
                        item.model
                      )}</span>`
                    : ""
                }
                ${
                  item.tools
                    ?.slice(0, 3)
                    .map(
                      (tool) =>
                        `<span class="resource-tag">${escapeHtml(tool)}</span>`
                    )
                    .join("") || ""
                }
                ${
                  item.tools && item.tools.length > 3
                    ? `<span class="resource-tag">+${
                        item.tools.length - 3
                      } more</span>`
                    : ""
                }
                ${
                  item.hasHandoffs
                    ? `<span class="resource-tag tag-handoffs">handoffs</span>`
                    : ""
                }
                ${getLastUpdatedHtml(item.lastUpdated)}
              </div>
            </div>
          </button>
          <div class="resource-actions">
            ${getInstallDropdownHtml(resourceType, item.path, true)}
            ${getActionButtonsHtml(item.path, true)}
            <a href="${getGitHubUrl(
              item.path
            )}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
              GitHub
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}
