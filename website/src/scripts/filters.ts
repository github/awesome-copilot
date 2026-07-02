/**
 * Client-side filter management.
 *
 * Manages multi-select and single-select filters, boolean toggles,
 * and syncs filter state to URL query parameters.
 *
 * All functions guard against server-side execution (`typeof document === 'undefined'`).
 */

import {
  getQueryParam,
  getQueryParamValues,
  getQueryParamFlag,
  updateQueryParams,
} from './url-state';

/* ── Types ──────────────────────────────────────────────────── */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  /** URL query param name, e.g. 'model', 'tag', 'category'. */
  param: string;
  /** Display label. */
  label: string;
  /** 'multi' = repeated params; 'single' = one value; 'flag' = boolean toggle. */
  type: 'multi' | 'single' | 'flag';
  /** Available options (for multi/single). */
  options: FilterOption[];
}

export interface ActiveFilters {
  /** Multi-select: param → selected values */
  multi: Record<string, string[]>;
  /** Single-select: param → selected value */
  single: Record<string, string>;
  /** Boolean flags: param → active */
  flags: Record<string, boolean>;
}

/* ── Initialization ─────────────────────────────────────────── */

/**
 * Read all active filters from the current URL.
 */
export function readFiltersFromUrl(configs: FilterConfig[]): ActiveFilters {
  const multi: Record<string, string[]> = {};
  const single: Record<string, string> = {};
  const flags: Record<string, boolean> = {};

  for (const cfg of configs) {
    switch (cfg.type) {
      case 'multi':
        multi[cfg.param] = getQueryParamValues(cfg.param);
        break;
      case 'single':
        single[cfg.param] = getQueryParam(cfg.param) ?? '';
        break;
      case 'flag':
        flags[cfg.param] = getQueryParamFlag(cfg.param);
        break;
    }
  }

  return { multi, single, flags };
}

/* ── Mutations ──────────────────────────────────────────────── */

/**
 * Toggle a multi-select filter value on/off.
 */
export function toggleFilter(param: string, value: string, current: string[]): void {
  const next = current.includes(value)
    ? current.filter(v => v !== value)
    : [...current, value];

  updateQueryParams({ setAll: { [param]: next } });
}

/**
 * Set a single-select filter value.
 */
export function setSingleFilter(param: string, value: string): void {
  updateQueryParams({ set: { [param]: value || null } });
}

/**
 * Toggle a boolean flag filter.
 */
export function toggleFlag(param: string, active: boolean): void {
  updateQueryParams({ flag: { [param]: !active } });
}

/* ── Filtering ──────────────────────────────────────────────── */

/**
 * Apply filters to an array of items.  Each item exposes its filterable
 * fields as string arrays (tags, categories, etc.).  The caller provides
 * a resolver that extracts the relevant values from an item.
 *
 * Returns the filtered items and the count before filtering.
 */
export function applyFilters<T>(
  items: T[],
  filters: ActiveFilters,
  resolver: (item: T) => Record<string, string[]>,
): { results: T[]; total: number } {
  let filtered = [...items];

  // Multi-select filters: item must match at least one selected value
  for (const [param, selected] of Object.entries(filters.multi)) {
    if (selected.length === 0) continue;
    filtered = filtered.filter(item => {
      const values = resolver(item)[param] ?? [];
      return selected.some(s => values.includes(s));
    });
  }

  // Single-select filters
  for (const [param, value] of Object.entries(filters.single)) {
    if (!value) continue;
    filtered = filtered.filter(item => {
      const resolved = resolver(item);
      if (!(param in resolved)) return true;

      const values = resolved[param] ?? [];
      return values.includes(value);
    });
  }

  // Boolean flags
  for (const [param, active] of Object.entries(filters.flags)) {
    if (!active) continue;
    filtered = filtered.filter(item => {
      const values = resolver(item)[param] ?? [];
      return values.length > 0 && values[0] !== 'false';
    });
  }

  return { results: filtered, total: items.length };
}

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Check whether any filters are currently active.
 */
export function hasActiveFilters(filters: ActiveFilters): boolean {
  const hasMulti = Object.values(filters.multi).some(v => v.length > 0);
  const hasSingle = Object.values(filters.single).some(v => v !== '');
  const hasFlags = Object.values(filters.flags).some(v => v);
  return hasMulti || hasSingle || hasFlags;
}

/**
 * Build a human-readable label describing active filters.
 * Example: "filtered by models: 2, tools: 1"
 */
export function describeFilters(filters: ActiveFilters, configs: FilterConfig[]): string {
  const parts: string[] = [];

  for (const cfg of configs) {
    if (cfg.type === 'multi' && (filters.multi[cfg.param]?.length ?? 0) > 0) {
      parts.push(`${cfg.label}: ${filters.multi[cfg.param].length}`);
    }
    if (cfg.type === 'flag' && filters.flags[cfg.param]) {
      parts.push(cfg.label);
    }
  }

  return parts.length > 0 ? `filtered by ${parts.join(', ')}` : '';
}

/**
 * Clear all filter state from the URL.
 */
export function clearAllFilters(configs: FilterConfig[]): void {
  const remove: Record<string, string | null> = { q: null };

  for (const cfg of configs) {
    remove[cfg.param] = null;
  }

  updateQueryParams({ set: remove });
}
