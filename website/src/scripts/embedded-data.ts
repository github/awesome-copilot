/**
 * Embedded page-data helpers.
 *
 * Astro server-renders JSON payloads into inline `<script type="application/json">`
 * elements so that client scripts can read them without an extra network round-trip.
 *
 * Pattern
 * -------
 * 1. The Astro component calls `serializeEmbeddedData(data)` and writes the result
 *    into a `<script type="application/json" id="<element-id>">` tag.
 * 2. The client script calls `getEmbeddedData<T>(filename)` which reads and parses
 *    that element, falling back to a `fetch` if the element is absent.
 *
 * Memoisation
 * -----------
 * Results are cached in `embeddedDataCache` so that repeated calls for the same
 * key do not re-parse the DOM.
 *
 * Security
 * --------
 * `serializeEmbeddedData` replaces `<` with `\u003c` so that embedded JSON cannot
 * prematurely close the containing `<script>` tag (e.g. via a `</script>` inside
 * a string value).
 */

const embeddedDataCache = new Map<string, unknown>();

export function getEmbeddedDataElementId(filename: string): string {
  return `page-data-${filename.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

export function serializeEmbeddedData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getEmbeddedData<T>(filename: string): T | null {
  if (typeof document === "undefined") return null;

  if (embeddedDataCache.has(filename)) {
    return embeddedDataCache.get(filename) as T;
  }

  const element = document.getElementById(getEmbeddedDataElementId(filename));
  if (!(element instanceof HTMLScriptElement)) return null;

  try {
    const data = JSON.parse(element.textContent || "null") as T;
    embeddedDataCache.set(filename, data);
    return data;
  } catch (error) {
    console.error(`Error parsing embedded data for ${filename}:`, error);
    return null;
  }
}
