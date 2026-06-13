/**
 * PluginItem → ResultItem adapter.
 *
 * External plugins have extra metadata (author, license, homepage)
 * and no file-backed modal.  Local plugins expose their bundled items.
 */

import type { ResultItem } from '../types';
import type { PluginItem } from '../upstream-types';
import { rawUrl } from './config';

export function adaptPlugin(item: PluginItem): ResultItem {
  const tags = [...(item.tags ?? [])];

  const result: ResultItem = {
    slug: item.id,
    title: item.name,
    label: 'Plugin',
    description: item.description,
    tags,
    accent: 'blue',
    detail: item.path,
    items: item.itemCount,
    contains: item.items.map(i => i.kind),
    author: item.author ?? undefined,
    license: item.license ?? undefined,
    actions: buildActions(item),
  };

  return result;
}

function buildActions(item: PluginItem): string[] {
  if (item.external) return ['view-repo'];
  return ['install', 'github'];
}

/** Convenience: adapt an entire array. */
export function adaptPlugins(items: PluginItem[]): ResultItem[] {
  return items.map(adaptPlugin);
}
