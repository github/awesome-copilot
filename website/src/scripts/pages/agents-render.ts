import {
  escapeHtml,
  getGitHubUrl,
  getInstallDropdownHtml,
  getLastUpdatedHtml,
} from "../utils";
import { renderEmptyStateHtml, renderSharedCardHtml } from "./card-render";

export interface RenderableAgent {
  id: string;
  title: string;
  description?: string;
  path: string;
  model?: string | string[];
  tools?: string[];
  hasHandoffs?: boolean;
  lastUpdated?: string | null;
}

export type AgentSortOption = "title" | "lastUpdated";

const resourceType = "agent";

/**
 * Build the URL of an agent's dedicated detail page.
 */
export function getAgentDetailUrl(id: string): string {
  return `/agent/${id}/`;
}

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

export function renderAgentsHtml(items: RenderableAgent[]): string {
  if (items.length === 0) {
    return renderEmptyStateHtml("No agents found", "No agents are available right now.");
  }

  return items
    .map((item) => {
      const metaHtml = `
        ${
          item.model
            ? `<span class="resource-tag tag-model">${escapeHtml(
                Array.isArray(item.model) ? item.model.join(", ") : item.model
              )}</span>`
            : ""
        }
        ${
          item.tools
            ?.slice(0, 3)
            .map((tool) => `<span class="resource-tag">${escapeHtml(tool)}</span>`)
            .join("") || ""
        }
        ${
          item.tools && item.tools.length > 3
            ? `<span class="resource-tag">+${item.tools.length - 3} more</span>`
            : ""
        }
        ${
          item.hasHandoffs
            ? `<span class="resource-tag tag-handoffs">handoffs</span>`
            : ""
        }
        ${getLastUpdatedHtml(item.lastUpdated)}
      `;

      const actionsHtml = `
        ${getInstallDropdownHtml(resourceType, item.path, true)}
        <button class="btn btn-secondary btn-small action-download" data-path="${escapeHtml(
          item.path
        )}" title="Download file">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/>
          </svg>
        </button>
        <a href="${getGitHubUrl(item.path)}" class="btn btn-secondary btn-small" target="_blank" onclick="event.stopPropagation()" title="View on GitHub">
          GitHub
        </a>
      `;

      return renderSharedCardHtml({
        title: item.title,
        description: item.description || "No description",
        href: getAgentDetailUrl(item.id),
        articleAttributes: {
          "data-path": item.path,
        },
        metaHtml,
        actionsHtml,
      });
    })
    .join("");
}
