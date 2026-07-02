import { escapeHtml } from "../utils";
import {
  FACT_ICONS,
  GITHUB_MARK,
  TYPE_ICONS,
  renderResourceGridHtml,
  type RCardFact,
  type RCardModel,
} from "./resource-card";

export interface RenderableTool {
  id: string;
  name: string;
  title?: string;
  description: string;
  category: string;
  featured: boolean;
  requirements: string[];
  features: string[];
  links: {
    blog?: string;
    vscode?: string;
    "vscode-insiders"?: string;
    "visual-studio"?: string;
    github?: string;
    documentation?: string;
    marketplace?: string;
    npm?: string;
    pypi?: string;
  };
  configuration?: {
    type: string;
    content: string;
  } | null;
  tags: string[];
}

export type ToolSortOption = "featured" | "title";

export function sortTools<T extends RenderableTool>(
  tools: T[],
  sort: ToolSortOption
): T[] {
  return [...tools].sort((a, b) => {
    if (sort === "featured") {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
    }

    return a.name.localeCompare(b.name);
  });
}

export function toolCategories(item: RenderableTool): string[] {
  return item.category ? [item.category] : [];
}

export function toolSearchText(item: RenderableTool): string {
  return [
    item.name,
    item.description ?? "",
    item.category ?? "",
    (item.tags ?? []).join(" "),
    (item.features ?? []).join(" "),
  ].join(" ");
}

export function sanitizeToolUrl(url: string): string {
  try {
    const protocol = new URL(url).protocol;
    if (
      protocol === "http:" ||
      protocol === "https:" ||
      protocol === "vscode:" ||
      protocol === "vscode-insiders:"
    ) {
      return escapeHtml(url);
    }
  } catch {
    return "#";
  }

  return "#";
}

// Ordered by how we surface the primary card action + modal link buttons.
const LINK_DEFS: { key: keyof RenderableTool["links"]; label: string }[] = [
  { key: "vscode", label: "Install in VS Code" },
  { key: "vscode-insiders", label: "VS Code Insiders" },
  { key: "visual-studio", label: "Visual Studio" },
  { key: "marketplace", label: "Marketplace" },
  { key: "npm", label: "npm" },
  { key: "pypi", label: "PyPI" },
  { key: "documentation", label: "Docs" },
  { key: "blog", label: "Blog" },
  { key: "github", label: "GitHub" },
];

/** Best single call-to-action for the card, plus the key it consumed. */
function primaryToolLink(
  tool: RenderableTool
): { key: string; label: string; href: string } | null {
  for (const { key, label } of LINK_DEFS) {
    const href = tool.links[key];
    if (href) return { key, label, href };
  }
  return null;
}

/** All link buttons for the details modal. */
export function renderToolModalLinks(tool: RenderableTool): string {
  return LINK_DEFS.map(({ key, label }) => {
    const href = tool.links[key];
    if (!href) return "";
    const primary = key === "vscode" ? "btn btn-primary" : "btn btn-secondary";
    return `<a class="${primary}" href="${sanitizeToolUrl(
      href
    )}" target="_blank" rel="noopener">${label}</a>`;
  })
    .filter(Boolean)
    .join("");
}

export function renderToolsHtml(tools: RenderableTool[]): string {
  const models: RCardModel[] = tools.map((tool) => {
    const safeName = escapeHtml(tool.name);
    const facts: RCardFact[] = [];
    if (tool.featured) {
      facts.push({ icon: FACT_ICONS.star, label: "Featured" });
    }
    if (tool.features?.length) {
      facts.push({
        icon: FACT_ICONS.feature,
        label: `${tool.features.length} feature${
          tool.features.length === 1 ? "" : "s"
        }`,
      });
    }

    const primary = primaryToolLink(tool);
    const primaryHtml = primary
      ? `<a href="${sanitizeToolUrl(
          primary.href
        )}" class="btn btn-primary btn-small" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="${escapeHtml(
          primary.label
        )}">${escapeHtml(primary.label)}</a>`
      : "";

    const githubHref = tool.links.github;
    const githubHtml =
      githubHref && primary?.key !== "github"
        ? `<a href="${sanitizeToolUrl(
            githubHref
          )}" class="btn btn-secondary btn-small action-github rcard-lead" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="View on GitHub" aria-label="View ${safeName} on GitHub">${GITHUB_MARK}</a>`
        : "";

    return {
      accent: "dev",
      icon: TYPE_ICONS.wrench,
      title: tool.name,
      description: tool.description || "No description",
      path: tool.id,
      badge: tool.category ? { text: tool.category } : null,
      facts,
      actionsHtml: `${primaryHtml}${githubHtml}`,
    };
  });

  return renderResourceGridHtml(
    models,
    "No tools match your filters",
    "Try a different search term or clear the active filters."
  );
}
