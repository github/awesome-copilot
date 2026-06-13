/**
 * ToolItem → ToolCard adapter.
 *
 * Tools use a different view model (ToolCard) because they render
 * as inline cards with copyable configuration, not as searchable
 * list items with file modals.
 */

import type { ToolCard } from '../types';
import type { ToolItem } from '../upstream-types';

export function adaptTool(item: ToolItem): ToolCard {
  const tags = buildTags(item);

  return {
    title: item.name,
    badge: item.category,
    description: item.description,
    tags,
    config: item.configuration?.content ?? '',
  };
}

function buildTags(item: ToolItem): string[] {
  const tags = [...(item.tags ?? [])];
  if (item.category) tags.push(item.category);
  if (item.featured) tags.push('featured');
  return [...new Set(tags)];
}

/**
 * Produce a ResultItem-like wrapper for search indexing.
 * Tools appear in search results even though their detail page
 * uses ToolCard, so this bridges the type gap.
 */
export function adaptToolForSearch(item: ToolItem): {
  slug: string;
  title: string;
  label: string;
  description: string;
  tags: string[];
  config: string;
} {
  return {
    slug: item.id,
    title: item.name,
    label: 'Tool',
    description: item.description,
    tags: buildTags(item),
    config: item.configuration?.content ?? '',
  };
}

/** Convenience: adapt an entire array. */
export function adaptTools(items: ToolItem[]): ToolCard[] {
  return items.map(adaptTool);
}
