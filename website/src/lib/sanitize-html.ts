/**
 * Isomorphic HTML sanitizer for rendered markdown.
 *
 * `marked` allows raw HTML to pass through untouched, and the resulting string
 * is injected via `set:html` / `innerHTML` on the resource detail pages and in
 * the client-side file browser. Even though the markdown we render originates
 * from this repository, a compromised or malicious resource file could
 * otherwise introduce persistent XSS. Sanitizing the generated HTML gives us
 * defense-in-depth on both the server (build time) and the client.
 *
 * `isomorphic-dompurify` resolves to a jsdom-backed DOMPurify in Node (so it
 * works in Astro frontmatter during `astro build`) and to the native
 * browser DOMPurify when bundled for the client.
 */
import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize a fragment of HTML produced from trusted-but-untrusted markdown,
 * stripping scripts, event handlers, and dangerous URL schemes while keeping
 * the formatting tags GitHub-flavored markdown commonly emits.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;
  return DOMPurify.sanitize(html, {
    // Keep links that open in a new tab (target/rel) which some resource docs
    // author directly as raw HTML.
    ADD_ATTR: ["target", "rel"],
  });
}
