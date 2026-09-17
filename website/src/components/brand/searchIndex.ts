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
  /** Canonical destination supplied by the index, never inferred from a title. */
  canonicalHref?: string;
  /** Language of the rendered content, not the requested fallback route. */
  locale?: string;
};

export const CATEGORY_LABELS: Record<SearchCategory, string> = {
  Pages: "Pages",
  Articles: "Articles",
  Agents: "Agents",
  Instructions: "Instructions",
  Skills: "Skills",
  Plugins: "Plugins",
  Extensions: "Extensions",
};

/** Preserve case, escaped path separators and meaningful queries/fragments. */
export function hrefKey(href: string): string {
  const url = new URL(href, "https://awesome-copilot.github.com");
  const path = url.pathname
    .replace(/%[0-9a-f]{2}/gi, (escape) => {
      const character = String.fromCharCode(parseInt(escape.slice(1), 16));
      return /[A-Za-z0-9._~-]/.test(character) ? character : escape.toUpperCase();
    })
    .replace(/\/{2,}/g, "/")
    .replace(/\/index\.html$/, "/")
    .replace(/\/+$/, "") || "/";
  return `${path}${url.search}${url.hash}`;
}

/** A richer resource record wins over a generic HTML hit for the same URL. */
export function mergeSearchItems(items: SearchItem[]): SearchItem[] {
  const byIdentity = new Map<string, SearchItem>();
  const richness = (item: SearchItem) =>
    (item.category !== "Pages" ? 2 : 0) + (item.description ? 1 : 0);
  for (const item of items) {
    const key = hrefKey(item.canonicalHref ?? item.href);
    const previous = byIdentity.get(key);
    if (!previous || richness(item) > richness(previous)) {
      byIdentity.set(key, item);
    }
  }
  return [...byIdentity.values()];
}

function pathSegments(href: string, base: string): string[] {
  const pathname = new URL(href, "https://awesome-copilot.github.com").pathname;
  const relative = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, "");
  return relative.split("/").filter(Boolean);
}

/** Content metadata wins over a locale prefix on an English-fallback route. */
export function filterSearchItemsByLocale(
  items: SearchItem[],
  locale: string,
  base = "/",
): SearchItem[] {
  return items.filter((item) => {
    const firstSegment = pathSegments(item.canonicalHref ?? item.href, base)[0] ?? "";
    const itemLocale = item.locale ||
      (/^[a-z]{2}-[a-z]{2}$/i.test(firstSegment) ? firstSegment : "en");
    return itemLocale.toLowerCase() === locale.toLowerCase();
  });
}

/** Locale prefixes are removed for classification only, never for identity. */
export function categoryOf(href: string, base = "/"): SearchCategory {
  const segments = pathSegments(href, base);
  if (/^[a-z]{2}-[a-z]{2}$/i.test(segments[0] ?? "")) segments.shift();
  if (segments.length < 2) return "Pages";
  return CATEGORY_BY_TYPE[segments[0]] ??
    (segments[0] === "learning-hub" ? "Articles" : "Pages");
}

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
      href: route
        ? at(`/${route}/${encodeURIComponent(record.id)}/`)
        : at(`/${record.id}/`),
      locale: "en",
    });
  }
  return [...staticPages(base), ...items];
}
