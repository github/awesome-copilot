/**
 * Shared adapter constants.
 *
 * These map to the same URLs used by `eng/generate-website-data.mjs`
 * and `eng/constants.mjs`.  Kept in one place so every adapter
 * produces consistent raw URLs and GitHub browse links.
 */

/** Base URL for raw file content on GitHub. */
export const RAW_BASE = 'https://raw.githubusercontent.com/github/awesome-copilot/main';

/** Base URL for the GitHub blob viewer. */
export const GITHUB_BLOB_BASE = 'https://github.com/github/awesome-copilot/blob/main';

/**
 * Build a raw-content URL for the given repository-relative path.
 * Returns null when `filePath` is falsy.
 */
export function rawUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  return `${RAW_BASE}/${filePath}`;
}

/**
 * Build a GitHub blob viewer URL for the given path.
 */
export function githubBlobUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  return `${GITHUB_BLOB_BASE}/${filePath}`;
}
