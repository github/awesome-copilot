/**
 * Builds the Pagefind search index after the static build completes.
 *
 * Indexes canonical HTML pages, excluding untranslated locale rewrites. Resource
 * metadata enriches the HTML record; only resources without HTML need a custom
 * record. Search-only markup is never written back to the served pages.
 */
import type { AstroIntegration } from "astro";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";
import { hrefKey } from "../components/brand/searchIndex";

interface SearchRecord {
  type: string;
  id: string;
  title: string;
  description: string;
  path: string;
  tags?: string[];
  searchText: string;
}

const TYPE_LABELS: Record<string, string> = {
  agent: "Agent",
  instruction: "Instruction",
  skill: "Skill",
  hook: "Hook",
  workflow: "Workflow",
  plugin: "Plugin",
  tool: "Tool",
  extension: "Extension",
};

const TYPE_PAGES: Record<string, string> = {
  agent: "/agents/",
  instruction: "/instructions/",
  skill: "/skills/",
  hook: "/hooks/",
  workflow: "/workflows/",
  plugin: "/plugins/",
  tool: "/tools/",
  extension: "/extensions/",
};

// Resource types that have a dedicated detail page at /<type>/<id>/. Search
// results for these should deep-link to the canonical detail page.
const DETAIL_ROUTE_TYPES = new Set([
  "agent",
  "instruction",
  "skill",
  "hook",
  "workflow",
  "plugin",
  "extension",
]);

function attribute(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1];
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * BaseLayout emits a canonical link and the actual content language. Learning
 * fallbacks can have a localized canonical link, so lang must also be checked.
 * Never collapse a translated document just because its slug matches English.
 */
export function prepareSearchHtml(
  html: string,
  url: string,
  { base = "/", locales = [], defaultLocale = "en" }: {
    base?: string; locales?: string[]; defaultLocale?: string;
  } = {},
  record?: SearchRecord,
): { url: string; content: string } | null {
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) return null;
  const locale = attribute(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang");
  if (!locale) throw new Error(`Missing content language: ${url}`);
  const relative = url.slice(base.length).split("/")[0];
  if (relative !== defaultLocale && locales.includes(relative) && locale === defaultLocale) return null;

  const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
  const canonical = attribute(canonicalTag ?? "", "href");
  if (!canonical) throw new Error(`Missing canonical URL: ${url}`);
  const destination = new URL(canonical, "https://awesome-copilot.github.com").pathname;
  const meta = {
    canonical: destination,
    locale,
    ...(record ? { resourceTitle: record.title, description: record.description } : {}),
  };
  const typeFilter = record
    ? `<meta data-pagefind-filter="type[content]" content="${escapeAttribute(record.type)}">`
    : "";
  let content = html
    .replace(/<body\b[^>]*>/i, (tag) => tag.replace(/\sdata-pagefind-body(?:=["'][^"']*["'])?/i, ""))
    .replace(/<main\b/i, "<main data-pagefind-body");
  if (!/<main\b/i.test(content)) throw new Error(`Missing search content landmark: ${url}`);
  content = content.replace("</head>", `${Object.entries(meta).map(([name, value]) =>
    `<meta data-pagefind-meta="${name}[content]" content="${escapeAttribute(value)}">`,
  ).join("")}${typeFilter}</head>`);
  if (!record) {
    content = content.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i,
      (tag) => tag.replace("<meta", '<meta data-pagefind-meta="description[content]"'));
  } else {
    const keywords = `${record.searchText || ""} ${TYPE_LABELS[record.type] || record.type} ${record.type}`;
    content = content.replace("</main>", `<span data-pagefind-weight="0.5">${escapeAttribute(keywords)}</span></main>`);
  }
  return { url: destination, content };
}

export default function pagefindResources(): AstroIntegration {
  let siteBase = "/";
  let locales: string[] = [];
  let defaultLocale = "en";

  return {
    name: "pagefind-resources",
    hooks: {
      "astro:config:done": ({ config }) => {
        siteBase = config.base;
        if (config.i18n) {
          locales = config.i18n.locales.flatMap((locale) =>
            typeof locale === "string" ? [locale] : [locale.path],
          );
          defaultLocale = config.i18n.defaultLocale;
        }
      },
      "astro:build:done": async ({ dir, logger }) => {
        const log = logger.fork("pagefind-resources");
        const now = performance.now();

        try {
          log.info("Building search index with Pagefind + resource records...");

          const response = await pagefind.createIndex({
            excludeSelectors: ["nav", "footer", '[role="navigation"]'],
          });
          if (response.errors.length > 0) {
            for (const err of response.errors) log.error(err);
            throw new Error("Failed to create Pagefind index");
          }
          const { index } = response;

          if (!index) {
            throw new Error("Pagefind index is undefined");
          }

          // Read and index resource records from search-index.json
          const searchIndexPath = fileURLToPath(
            new URL("./data/search-index.json", dir)
          );
          const records: SearchRecord[] = JSON.parse(readFileSync(searchIndexPath, "utf-8"));

          // Use the base path from Astro config (e.g. "/")
          const base = siteBase.endsWith("/") ? siteBase : `${siteBase}/`;
          const resourceUrl = (record: SearchRecord) =>
            DETAIL_ROUTE_TYPES.has(record.type) && record.id
              ? `${base}${record.type}/${encodeURIComponent(record.id)}/`
              : TYPE_PAGES[record.type] ? `${base}${TYPE_PAGES[record.type].slice(1)}` : undefined;
          const recordsByUrl = new Map(records.flatMap((record) => {
            const url = resourceUrl(record);
            return url ? [[hrefKey(url), record] as const] : [];
          }));

          const indexed = new Set<string>();
          const root = fileURLToPath(dir);
          const files = readdirSync(root, { recursive: true, encoding: "utf8" })
            .filter((file) => file.endsWith(".html")).sort();
          for (const file of files) {
            const url = `${base}${file.replace(/\\/g, "/").replace(/index\.html$/, "")}`;
            const prepared = prepareSearchHtml(
              readFileSync(join(root, file), "utf8"), url,
              { base, locales, defaultLocale }, recordsByUrl.get(hrefKey(url)),
            );
            if (!prepared || indexed.has(hrefKey(prepared.url))) continue;
            const result = await index.addHTMLFile(prepared);
            if (result.errors.length) throw new Error(`${url}: ${result.errors.join("; ")}`);
            indexed.add(hrefKey(prepared.url));
          }
          log.info(`Indexed ${indexed.size} canonical HTML pages (from ${files.length} files).`);

          let added = 0;
          for (const record of records) {
            const url = resourceUrl(record);
            if (!url || indexed.has(hrefKey(url))) continue;
            const typeLabel = TYPE_LABELS[record.type] || record.type;

            const addResult = await index.addCustomRecord({
              url,
              content:
                `${record.searchText || `${record.title} ${record.description}`} ${typeLabel} ${record.type}`,
              language: "en",
              meta: {
                title: record.title,
                resourceTitle: record.title,
                description: record.description,
                canonical: url,
                locale: "en",
              },
              filters: {
                type: [record.type],
              },
            });

            if (addResult.errors.length > 0) {
              throw new Error(`Record ${record.id}: ${addResult.errors.join("; ")}`);
            } else {
              indexed.add(hrefKey(url));
              added++;
            }
          }

          log.info(`Added ${added} resource records.`);

          // Write the combined index
          const writeResult = await index.writeFiles({
            outputPath: fileURLToPath(new URL("./pagefind/", dir)),
          });
          if (writeResult.errors.length > 0) {
            for (const err of writeResult.errors) log.error(err);
            throw new Error("Failed to write Pagefind files");
          }

          const elapsed = performance.now() - now;
          log.info(
            `Search index built in ${
              elapsed < 750
                ? `${Math.round(elapsed)}ms`
                : `${(elapsed / 1000).toFixed(2)}s`
            }.`
          );
        } catch (cause) {
          throw new Error("Failed to build Pagefind search index.", { cause });
        } finally {
          await pagefind.close();
        }
      },
    },
  };
}
