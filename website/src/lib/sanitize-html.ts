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
import {
  resolveMarkdownImage,
  resolveMarkdownSrcset,
  type MarkdownImageSource,
} from "./markdown-images";

let markdownHooksInstalled = false;

function ensureMarkdownHooks(): void {
  if (markdownHooksInstalled) return;
  markdownHooksInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "IMG") return;
    node.removeAttribute("data-markdown-block-image");
    let container = node.closest("picture") ?? node;
    if (container.parentElement?.tagName === "A") container = container.parentElement;
    const parent = container.parentElement;
    if (!parent || !["P", "DIV", "BODY", "SECTION", "ARTICLE", "LI"].includes(parent.tagName)) return;
    // A standalone image is a block; text and multi-image rows stay inline.
    if (parent.querySelectorAll("img").length !== 1) return;
    if (parent.tagName === "P" && parent.textContent?.trim()) return;
    if (Array.from(parent.childNodes).some((child) =>
      child.nodeType === 3 && child.textContent?.trim(),
    )) return;
    node.setAttribute("data-markdown-block-image", "");
  });

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
  imageSource?: MarkdownImageSource | null,
): string {
  if (!html) return html;
  ensureMarkdownHooks();
  // Scope provenance to this synchronous render; it must never leak between
  // documents (or between the build-time and file-browser rendering paths).
  if (imageSource !== undefined) {
    DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
      const image = node.nodeName === "IMG";
      const pictureSource =
        node.nodeName === "SOURCE" && node.parentNode?.nodeName === "PICTURE";
      if (
        !(image && data.attrName === "src") &&
        !((image || pictureSource) && data.attrName === "srcset")
      ) return;
      try {
        data.attrValue = data.attrName === "srcset"
          ? resolveMarkdownSrcset(data.attrValue, imageSource)
          : resolveMarkdownImage(data.attrValue, imageSource);
      } catch (error) {
        data.keepAttr = false;
        console.warn(
          `[markdown-images] Dropped ${data.attrName} in "${imageSource?.filePath ?? "unknown source"}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }
  try {
    return DOMPurify.sanitize(html, {
      // Keep links that open in a new tab (target/rel) which some resource docs
      // author directly as raw HTML.
      ADD_ATTR: ["target", "rel"],
    });
  } finally {
    if (imageSource !== undefined) DOMPurify.removeHook("uponSanitizeAttribute");
  }
}
