/**
 * Custom Pagefind integration that extends Starlight's search index
 * with resource records (agents, skills, instructions, hooks, workflows, plugins).
 *
 * Starlight's pagefind is enabled (pagefind: true) so the search UI renders,
 * but this integration runs AFTER Starlight's and overwrites the index with
 * HTML pages + custom resource records combined.
 */
import type { AstroIntegration } from "astro";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

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
};

const TYPE_PAGES: Record<string, string> = {
  agent: "/agents/",
  instruction: "/instructions/",
  skill: "/skills/",
  hook: "/hooks/",
  workflow: "/workflows/",
  plugin: "/plugins/",
  tool: "/tools/",
};

export default function pagefindResources(): AstroIntegration {
  let siteBase = "/";

  return {
    name: "pagefind-resources",
    hooks: {
      "astro:config:done": ({ config }) => {
        siteBase = config.base;
      },
      "astro:build:done": async ({ dir, logger }) => {
        const log = logger.fork("pagefind-resources");
        const now = performance.now();

        try {
          log.info("Building search index with Pagefind + resource records...");

          const response = await pagefind.createIndex();
          if (response.errors.length > 0) {
            for (const err of response.errors) log.error(err);
            throw new Error("Failed to create Pagefind index");
          }
          const { index } = response;

          // Index all built HTML pages (same as Starlight's default)
          const indexResult = await index.addDirectory({
            path: fileURLToPath(dir),
          });
          if (indexResult.errors.length > 0) {
            for (const err of indexResult.errors) log.error(err);
            throw new Error("Failed to index HTML directory");
          }
          log.info(`Indexed ${indexResult.page_count} HTML pages.`);

          // Read and index resource records from search-index.json
          const searchIndexPath = fileURLToPath(
            new URL("./data/search-index.json", dir)
          );
          let records: SearchRecord[];
          try {
            records = JSON.parse(readFileSync(searchIndexPath, "utf-8"));
          } catch {
            log.warn("Could not read search-index.json, skipping resource indexing.");
            records = [];
          }

          // Use the base path from Astro config (e.g. "/")
          const base = siteBase.endsWith("/") ? siteBase : `${siteBase}/`;

          let added = 0;
          for (const record of records) {
            const typePage = TYPE_PAGES[record.type];
            if (!typePage) continue;

            const url = `${base}${typePage.slice(1)}#file=${encodeURIComponent(record.path)}`;
            const typeLabel = TYPE_LABELS[record.type] || record.type;

            const addResult = await index.addCustomRecord({
              url,
              content: record.searchText || `${record.title} ${record.description}`,
              language: "en",
              meta: {
                title: `${record.title} — ${typeLabel}`,
              },
              filters: {
                type: [record.type],
              },
            });

            if (addResult.errors.length > 0) {
              for (const err of addResult.errors) log.warn(`Record ${record.id}: ${err}`);
            } else {
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
            `Search index built in ${elapsed < 750 ? `${Math.round(elapsed)}ms` : `${(elapsed / 1000).toFixed(2)}s`}.`
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
