/**
 * Isomorphic HTML sanitizer for rendered markdown.
 *
 * `marked` allows raw HTML to pass through untouched, and the resulting string
 * is injected via `set:html` / `innerHTML` on the resource detail pages and in
 * the client-side file browser. Markdown may come from this repository or an
 * external plugin's repository, so a compromised or malicious file could
 * otherwise introduce persistent XSS. Sanitizing the generated HTML gives us
 * defense-in-depth on both the server (build time) and the client.
 *
 * `isomorphic-dompurify` resolves to a jsdom-backed DOMPurify in Node (so it
 * works in Astro frontmatter during `astro build`) and to the native
 * browser DOMPurify when bundled for the client.
 */
import DOMPurify from "isomorphic-dompurify";

let noopenerHookInstalled = false;

function ensureNoopenerHook(): void {
  if (noopenerHookInstalled) return;
  noopenerHookInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as unknown as {
      tagName?: string;
      getAttribute?: (name: string) => string | null;
      setAttribute?: (name: string, value: string) => void;
    };

    if (el?.tagName !== "A") return;
    if (el.getAttribute?.("target") !== "_blank") return;

    const rel = el.getAttribute?.("rel") ?? "";
    const tokens = new Set(rel.split(/\s+/).filter(Boolean));
    tokens.add("noopener");
    tokens.add("noreferrer");
    el.setAttribute?.("rel", Array.from(tokens).join(" "));
  });
}

/**
 * Sanitize a fragment of HTML produced from trusted-but-untrusted markdown,
 * stripping scripts, event handlers, and dangerous URL schemes while keeping
 * the formatting tags GitHub-flavored markdown commonly emits.
 */
export function sanitizeHtml(
  html: string,
  urls?: { linkBaseUrl: string; imageBaseUrl: string },
): string {
  if (!html) return html;
  ensureNoopenerHook();
  const config = {
    // Keep links that open in a new tab (target/rel) which some resource docs
    // author directly as raw HTML.
    ADD_ATTR: ["target", "rel"],
    ...(urls ? { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] } : {}),
  };
  if (urls) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (
        (node.nodeName === "IMG" || node.nodeName === "SOURCE") &&
        node.hasAttribute("srcset")
      ) {
        node.removeAttribute("srcset");
      }
      const attribute = node.nodeName === "A" ? "href" : node.nodeName === "IMG" ? "src" : null;
      if (!attribute) return;
      const value = node.getAttribute(attribute);
      if (!value || value.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return;
      const base = attribute === "href" ? urls.linkBaseUrl : urls.imageBaseUrl;
      let resolved: URL;
      if (value.startsWith("/") && !value.startsWith("//")) {
        const root = new URL(base);
        // GitHub blob URLs include /blob/; raw-content URLs do not.
        root.pathname = root.pathname.split("/").slice(0, attribute === "href" ? 5 : 4).join("/") + "/";
        resolved = new URL(value.slice(1), root);
      } else {
        resolved = new URL(value, base);
      }
      if (resolved.protocol === "https:" || resolved.protocol === "http:") {
        node.setAttribute(attribute, resolved.href);
      }
    });
  }
  try {
    return DOMPurify.sanitize(html, config);
  } finally {
    if (urls) DOMPurify.removeHook("afterSanitizeAttributes");
  }
}
