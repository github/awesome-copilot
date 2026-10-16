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

function findTagEnd(html: string, start: number): number {
  let quote: '"' | "'" | undefined;

  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }

  return -1;
}

function skipStyleElement(html: string, start: number): number {
  let closingStart = html.indexOf("</style", start);
  while (closingStart !== -1) {
    const boundary = html[closingStart + 7];
    if (boundary === ">" || boundary === "/" || /\s/.test(boundary ?? "")) {
      const closingEnd = findTagEnd(html, closingStart);
      return closingEnd === -1 ? html.length : closingEnd + 1;
    }
    closingStart = html.indexOf("</style", closingStart + 7);
  }
  return html.length;
}

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
  const headings: { start: number; end: number; replacement: string }[] = [];
  let heading: { start: number; openingTagEnd: number; attrs: string } | undefined;
  let cursor = 0;

  while (cursor < markdownHtml.length) {
    const start = markdownHtml.indexOf("<", cursor);
    if (start === -1) break;
    if (markdownHtml.startsWith("<!--", start)) {
      const commentEnd = markdownHtml.indexOf("-->", start + 4);
      cursor = commentEnd === -1 ? markdownHtml.length : commentEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(markdownHtml, start);
    if (tagEnd === -1) break;
    cursor = tagEnd + 1;

    let nameStart = start + 1;
    const closing = markdownHtml[nameStart] === "/";
    if (closing) nameStart += 1;
    let nameEnd = nameStart;
    while (/[a-z0-9:-]/i.test(markdownHtml[nameEnd] ?? "")) nameEnd += 1;
    const tagName = markdownHtml.slice(nameStart, nameEnd).toLowerCase();
    if (tagName === "style" && !closing) {
      cursor = skipStyleElement(markdownHtml, cursor);
      continue;
    }
    if (tagName !== "h2") continue;

    if (!closing) {
      if (!heading && !markdownHtml.slice(nameEnd, tagEnd).trimEnd().endsWith("/")) {
        heading = {
          start,
          openingTagEnd: tagEnd + 1,
          attrs: markdownHtml.slice(nameEnd, tagEnd),
        };
      }
      continue;
    }
    if (!heading) continue;

    const label = stripHtmlTags(markdownHtml.slice(heading.openingTagEnd, start))
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

    if (label) {
      const existing = /\bid="([^"]+)"/.exec(heading.attrs)?.[1];
      let id = existing ?? slugify(label);
      if (id) {
        if (!existing) {
          const seen = used.get(id) ?? 0;
          used.set(id, seen + 1);
          if (seen > 0) id = `${id}-${seen}`;
        }

        toc.push({ id, label });
        if (!existing) {
          headings.push({
            start: heading.start,
            end: heading.openingTagEnd,
            replacement: `<h2 id="${id}"${heading.attrs}>`,
          });
        }
      }
    }
    heading = undefined;
  }

  let html = markdownHtml;
  if (headings.length) {
    const parts: string[] = [];
    let previousEnd = 0;
    for (const item of headings) {
      parts.push(markdownHtml.slice(previousEnd, item.start), item.replacement);
      previousEnd = item.end;
    }
    parts.push(markdownHtml.slice(previousEnd));
    html = parts.join("");
  }

  return { html, toc };
}
