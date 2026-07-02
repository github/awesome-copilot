/**
 * PluginItem → ResultItem adapter.
 *
 * External plugins have extra metadata (author, license, homepage)
 * and no file-backed modal.  Local plugins expose their bundled items.
 */

import type { ResultItem } from "../types";
import type { PluginItem } from "../upstream-types";
import { stableAccent } from "../../scripts/resource-catalog";

export function adaptPlugin(item: PluginItem): ResultItem {
  const tags = [...(item.tags ?? [])];

  const result: ResultItem = {
    id: item.id,
    title: item.name,
    label: "Plugin",
    description: item.description,
    tags,
    accent: stableAccent(item.id),
    detail: item.path,
    items: item.itemCount,
    contains: item.items.map((i) => i.kind),
    // Upstream author can be a string or a PluginAuthor object; normalise to string.
    author:
      typeof item.author === "string"
        ? item.author
        : (item.author?.name ?? undefined),
    license: item.license ?? undefined,
    actions: buildActions(item),
  };

  return result;
}

function buildActions(item: PluginItem): string[] {
  if (item.external) return ["view-repo"];
  return ["install", "github"];
}

/** Convenience: adapt an entire array. */
export function adaptPlugins(items: PluginItem[]): ResultItem[] {
  return items.map(adaptPlugin);
}
