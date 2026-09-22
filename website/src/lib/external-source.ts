/**
 * Shared helpers for building safe GitHub links to external (third-party)
 * plugin/extension sources.
 *
 * This module is intentionally dependency-free (no DOM or node imports) so it
 * can run both at build time (in Astro frontmatter, e.g. plugin/[id].astro and
 * extension/[id].astro) and on the client (plugins-render.ts, modal.ts).
 */

export interface ExternalSource {
  source?: string;
  repo?: string;
  path?: string;
  ref?: string;
  sha?: string;
}

const GITHUB_REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
// Tags, branch names, or a 40-char commit SHA. Deliberately excludes
// whitespace, "..", and characters that could break out of the path segment.
const GITHUB_REF_RE = /^(?!\/)(?!.*\/\/)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._/-]+$/;

/**
 * Allow only http(s) URLs; return "#" for anything else (mirrors the
 * client-side sanitizeUrl in scripts/utils.ts). Prevents javascript:/data:
 * schemes from reaching an href/src attribute.
 */
export function sanitizeHttpUrl(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // Invalid URL
  }
  return "#";
}

function encodeRepoPath(rawPath: string): string {
  return rawPath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Build a GitHub URL for an external plugin/extension source, pinned to the
 * most immutable revision available (sha, then ref, then the default branch).
 * Path segments are URL-encoded and a leading "/" (or a bare "/" path) is
 * treated as "no path".
 *
 * When the source is not a valid GitHub repo reference, falls back to the first
 * safe http(s) URL in `fallbackUrls`, or "#" if none is provided.
 */
export function externalRepoUrl(
  source: ExternalSource | null | undefined,
  fallbackUrls: Array<string | null | undefined> = []
): string {
  if (
    source?.source === "github" &&
    typeof source.repo === "string" &&
    GITHUB_REPO_RE.test(source.repo)
  ) {
    const base = `https://github.com/${source.repo}`;
    const candidateRef = source.sha || source.ref;
    const ref =
      candidateRef && GITHUB_REF_RE.test(candidateRef) ? candidateRef : "";
    const path =
      source.path && source.path !== "/" ? encodeRepoPath(source.path) : "";

    if (path) {
      return `${base}/tree/${ref || "main"}/${path}`;
    }
    return ref ? `${base}/tree/${ref}` : base;
  }

  for (const url of fallbackUrls) {
    const safe = sanitizeHttpUrl(url);
    if (safe !== "#") return safe;
  }
  return "#";
}
