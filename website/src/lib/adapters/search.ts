/**
 * Search index adapter.
 *
 * Normalizes search-index.json entries into a flat searchable list
 * that the fuzzy engine can consume.  Maps upstream types to route
 * paths and labels for result rendering.
 */

import type { SearchIndexItem } from '../upstream-types';
import { GITHUB_BLOB_BASE } from './config';

export interface SearchResultEntry {
  id: string;
  type: string;
  title: string;
  description: string;
  path: string;
  tags: string[];
  searchText: string;
  route: string;
  label: string;
  lastUpdated: string;
}

/** Mapping from upstream `type` values to UI route and display label. */
const TYPE_MAP: Record<string, { route: string; label: string }> = {
  agent:       { route: '/agents/',       label: 'Agent' },
  instruction: { route: '/instructions/', label: 'Instruction' },
  skill:       { route: '/skills/',       label: 'Skill' },
  hook:        { route: '/hooks/',        label: 'Hook' },
  workflow:    { route: '/workflows/',    label: 'Workflow' },
  plugin:      { route: '/plugins/',      label: 'Plugin' },
};

export function adaptSearchIndex(items: SearchIndexItem[]): SearchResultEntry[] {
  return items
    .map(item => {
      const typeInfo = TYPE_MAP[item.type];
      // Unknown types are silently skipped
      if (!typeInfo) return null;

      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        path: item.path,
        tags: item.tags ?? [],
        searchText: item.searchText ?? [item.title, item.description].join(' ').toLowerCase(),
        route: typeInfo.route,
        label: typeInfo.label,
        lastUpdated: item.lastUpdated,
      };
    })
    .filter((e): e is SearchResultEntry => e !== null);
}
