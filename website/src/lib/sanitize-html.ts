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
import {
  resolveMarkdownImage,
  resolveMarkdownSrcset,
  type MarkdownImageSource,
} from "./markdown-images";

export type MarkdownSource =
  | MarkdownImageSource
  | { linkBaseUrl: string; imageBaseUrl: string }
  | null;

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
    // Separate block siblings do not make an image inline with their text.
    const blockTags = [
      "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DETAILS", "DIV", "DL",
      "FIELDSET", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5",
      "H6", "HEADER", "HR", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "UL",
    ];
    if (Array.from(parent.childNodes).some((child) =>
      child.textContent?.trim() && !blockTags.includes(child.nodeName),
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
  source?: MarkdownSource,
): string {
  if (!html) return html;
  ensureMarkdownHooks();
  const urls = source && "linkBaseUrl" in source ? source : undefined;
  const imageSource = source === null || (source && "rawBase" in source)
    ? source : undefined;
  const config = {
    // Keep links that open in a new tab (target/rel) which some resource docs
    // author directly as raw HTML.
    ADD_ATTR: ["target", "rel"],
    ...(urls ? { FORBID_ATTR: ["style"], FORBID_TAGS: ["style"] } : {}),
  };
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
    if (imageSource !== undefined) DOMPurify.removeHook("uponSanitizeAttribute");
    if (urls) DOMPurify.removeHook("afterSanitizeAttributes");
  }
}
