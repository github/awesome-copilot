export type DetailTocItem = { id: string; label: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripHtmlTags = (html: string) => {
  let text = "";
  let inTag = false;
  let quote: '"' | "'" | undefined;

  for (const character of html) {
    if (inTag) {
      if (quote) {
        if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        inTag = false;
      }
    } else if (character === "<") {
      inTag = true;
    } else {
      text += character;
    }
  }

  return text;
};

/**
 * Derive the in-page table of contents from rendered markdown, stamping a
 * stable `id` onto every `<h2>` so the TOC links and scroll-spy have anchors.
 *
 * Pure and deterministic, so the ids match between the build-time render and
 * client hydration.
 */
export function buildDetailToc(markdownHtml: string): {
  html: string;
  toc: DetailTocItem[];
} {
  if (!markdownHtml) return { html: markdownHtml, toc: [] };

  const toc: DetailTocItem[] = [];
  const used = new Map<string, number>();

  const html = markdownHtml.replace(
    /<h2([^>]*)>([\s\S]*?)<\/h2>/g,
    (match, attrs: string, inner: string) => {
      const label = stripHtmlTags(inner)
        .replace(/&lt;|&gt;|&quot;|&#39;|&amp;/g, (entity) => {
          switch (entity) {
            case "&lt;":
              return "<";
            case "&gt;":
              return ">";
            case "&quot;":
              return '"';
            case "&#39;":
              return "'";
            default:
              return "&";
          }
        })
        .trim();
      if (!label) return match;

      const existing = /\bid="([^"]+)"/.exec(attrs)?.[1];
      let id = existing ?? slugify(label);
      if (!id) return match;
      if (!existing) {
        const seen = used.get(id) ?? 0;
        used.set(id, seen + 1);
        if (seen > 0) id = `${id}-${seen}`;
      }

      toc.push({ id, label });
      const nextAttrs = existing ? attrs : ` id="${id}"${attrs}`;
      return `<h2${nextAttrs}>${inner}</h2>`;
    },
  );

  return { html, toc };
}
