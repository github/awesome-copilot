/**
 * Search index adapter.
 *
 * The prototype shipped a hand-written `searchIndex.ts`. Here the same shape is
 * produced from the site's generated `public/data/search-index.json` plus the
 * fixed top-level destinations, so `TopNavSearch` searches the real library.
 */

export type SearchCategory =
  | "Pages"
  | "Articles"
  | "Agents"
  | "Instructions"
  | "Skills"
  | "Plugins"
  | "Extensions";

export type SearchItem = {
  title: string;
  description: string;
  category: SearchCategory;
  /** Resolved site URL for the result. */
  href: string;
};

/** Generated record shape from `eng/generate-website-data.mjs`. */
export type GeneratedSearchRecord = {
  type: string;
  id: string;
  title: string;
  description?: string;
  path?: string;
};

const CATEGORY_BY_TYPE: Record<string, SearchCategory> = {
  agent: "Agents",
  instruction: "Instructions",
  skill: "Skills",
  plugin: "Plugins",
  extension: "Extensions",
  article: "Articles",
};

const DETAIL_ROUTE_BY_TYPE: Record<string, string> = {
  agent: "agent",
  instruction: "instruction",
  skill: "skill",
  plugin: "plugin",
  extension: "extension",
};

/** Top-level destinations so search always surfaces the main sections. */
export const staticPages = (base: string): SearchItem[] => {
  const at = (path: string) => `${base}${path}`.replace(/\/{2,}/g, "/");
  return [
    {
      title: "Home",
      description:
        "The Awesome GitHub Copilot library home — browse agents, instructions, skills, plugins, and extensions.",
      category: "Pages",
      href: at("/"),
    },
    {
      title: "Agents",
      description:
        "Ready-to-use custom agents for GitHub Copilot — specialized assistants for focused tasks.",
      category: "Pages",
      href: at("/agents/"),
    },
    {
      title: "Instructions",
      description:
        "Repository and language instruction files that steer GitHub Copilot toward your conventions.",
      category: "Pages",
      href: at("/instructions/"),
    },
    {
      title: "Skills",
      description:
        "Self-contained skill folders that bundle instructions and resources together.",
      category: "Pages",
      href: at("/skills/"),
    },
    {
      title: "Plugins",
      description:
        "Installable plugin packages that group related agents, hooks, and skills.",
      category: "Pages",
      href: at("/plugins/"),
    },
    {
      title: "Extensions",
      description:
        "Interactive canvas extensions that enrich the GitHub Copilot app experience.",
      category: "Pages",
      href: at("/extensions/"),
    },
    {
      title: "Learning Hub",
      description:
        "Articles and guides for getting the most from every agent, skill, and instruction.",
      category: "Pages",
      href: at("/learning-hub/"),
    },
    {
      title: "Contributors",
      description: "The people who build and maintain the community library.",
      category: "Pages",
      href: at("/contributors/"),
    },
  ];
};

/** Convert generated records into `TopNavSearch` items. */
export function buildSearchIndex(
  records: GeneratedSearchRecord[],
  base = "/",
): SearchItem[] {
  const at = (path: string) => `${base}${path}`.replace(/\/{2,}/g, "/");
  const items: SearchItem[] = [];
  for (const record of records) {
    const category = CATEGORY_BY_TYPE[record.type];
    if (!category) continue;
    const route = DETAIL_ROUTE_BY_TYPE[record.type];
    items.push({
      title: record.title,
      description: record.description ?? "",
      category,
      href: route ? at(`/${route}/${record.id}/`) : at("/"),
    });
  }
  return items;
}
