/**
 * URL state serialization / deserialization helpers.
 *
 * All functions are safe to call at build time (server-side) —
 * they return sensible defaults when `window` is unavailable.
 *
 * Features:
 * - Read single query params, repeated params (multi-select), and boolean flags
 * - Update the URL via history.replaceState (no page reload)
 * - Modal hash management (#file=path)
 */

const IS_CLIENT = typeof window !== 'undefined';

/* ── Query param readers ───────────────────────────────────── */

/**
 * Get a single query parameter value from the current URL.
 * Returns `null` when the param is absent.
 */
export function getQueryParam(name: string): string | null {
  if (!IS_CLIENT) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Get all values for a repeated query parameter (multi-select filters).
 * Returns an empty array when the param is absent.
 */
export function getQueryParamValues(name: string): string[] {
  if (!IS_CLIENT) return [];
  const params = new URLSearchParams(window.location.search);
  return params.getAll(name);
}

/**
 * Get a boolean flag from a query param.
 * Treats "1", "true", "yes" (case-insensitive) as `true`.
 */
export function getQueryParamFlag(name: string): boolean {
  const value = getQueryParam(name);
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower === '1' || lower === 'true' || lower === 'yes';
}

/* ── Query param writers ───────────────────────────────────── */

export interface QueryUpdates {
  /** Set (or remove) a single-value param.  Pass `null` to remove. */
  set?: Record<string, string | null>;
  /** Replace all values for a repeated param. */
  setAll?: Record<string, string[]>;
  /** Add a single value to a repeated param. */
  add?: Record<string, string>;
  /** Remove a specific value from a repeated param. */
  remove?: Record<string, string>;
  /** Boolean toggle.  Pass `true` to set `=1`, `false` to remove. */
  flag?: Record<string, boolean>;
}

/**
 * Update query parameters in the URL without a page reload.
 *
 * This uses `history.replaceState` so the back/forward history
 * is not polluted by every filter change.
 */
export function updateQueryParams(updates: QueryUpdates): void {
  if (!IS_CLIENT) return;

  const url = new URL(window.location.href);
  const params = url.searchParams;

  // Set / remove single values
  if (updates.set) {
    for (const [key, value] of Object.entries(updates.set)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
  }

  // Replace all values for repeated params
  if (updates.setAll) {
    for (const [key, values] of Object.entries(updates.setAll)) {
      params.delete(key);
      for (const v of values) {
        params.append(key, v);
      }
    }
  }

  // Add to repeated params
  if (updates.add) {
    for (const [key, value] of Object.entries(updates.add)) {
      params.append(key, value);
    }
  }

  // Remove specific values from repeated params
  if (updates.remove) {
    for (const [key, value] of Object.entries(updates.remove)) {
      const current = params.getAll(key);
      params.delete(key);
      for (const v of current) {
        if (v !== value) params.append(key, v);
      }
    }
  }

  // Boolean flags
  if (updates.flag) {
    for (const [key, active] of Object.entries(updates.flag)) {
      if (active) {
        params.set(key, '1');
      } else {
        params.delete(key);
      }
    }
  }

  // Write back without reload
  const newUrl = url.pathname + (params.toString() ? '?' + params.toString() : '') + url.hash;
  history.replaceState(null, '', newUrl);
}

/* ── Modal hash ─────────────────────────────────────────────── */

/**
 * Get the file path from the URL hash.
 * Example: `#file=skills/example/SKILL.md` returns `skills/example/SKILL.md`.
 * Returns `null` if no file hash is present.
 */
export function getFileHash(): string | null {
  if (!IS_CLIENT) return null;
  const hash = window.location.hash;
  if (hash.startsWith('#file=')) {
    return decodeURIComponent(hash.slice(6));
  }
  return null;
}

/**
 * Set the `#file=path` hash in the URL.  Does not reload the page.
 */
export function setFileHash(filePath: string): void {
  if (!IS_CLIENT) return;
  const url = new URL(window.location.href);
  url.hash = `file=${encodeURIComponent(filePath)}`;
  history.replaceState(null, '', url.toString());
}

/**
 * Remove the `#file=` hash from the URL.
 */
export function clearFileHash(): void {
  if (!IS_CLIENT) return;
  // Use replaceState with empty hash, preserving search params
  const url = new URL(window.location.href);
  url.hash = '';
  history.replaceState(null, '', url.toString());
}
