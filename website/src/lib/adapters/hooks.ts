/**
 * HookItem → ResultItem adapter.
 */

import type { ResultItem } from '../types';
import type { HookItem } from '../upstream-types';
import { stableAccent } from '../../scripts/resource-catalog';
import { rawUrl } from './config';

export function adaptHook(item: HookItem): ResultItem {
  const tags = buildTags(item);

  const result: ResultItem = {
    id: item.id,
    title: item.title,
    label: 'Hook',
    description: item.description,
    tags,
    accent: stableAccent(item.id),
    detail: item.readmeFile ?? undefined,
    event: item.hooks.length > 0 ? item.hooks.join(', ') : undefined,
    actions: ['install', 'download', 'share', 'github'],
  };

  return result;
}

function buildTags(item: HookItem): string[] {
  return [
    ...(item.hooks ?? []),
    ...(item.tags ?? []),
  ];
}

/** Convenience: adapt an entire array. */
export function adaptHooks(items: HookItem[]): ResultItem[] {
  return items.map(adaptHook);
}
