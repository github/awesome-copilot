/**
 * Turns rendered markdown HTML into the shape the Learning Hub article chassis
 * expects: one `<section>` per `<h2>`, with GitHub admonitions lifted out as
 * discrete callout blocks.
 */

export type CalloutKind = "note" | "tip" | "caution";

export type ArticleBlock =
  | { type: "html"; html: string }
  | { type: "callout"; kind: CalloutKind; html: string };

export type ArticleSection = {
  id: string;
  heading: string | null;
  blocks: ArticleBlock[];
};

/**
 * `remark-github-admonitions-to-directives` rewrites `> [!NOTE]` blockquotes as
 * container directives. With no directive-aware rehype step configured, those
 * render as attribute-less `<div>` wrappers that carry no trace of their type,
 * so the type is recovered by reading the admonition markers out of the raw
 * markdown and correlating them positionally with those wrappers.
 */
const ADMONITION_RE = /^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gim;

const KIND_BY_MARKER: Record<string, CalloutKind> = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "note",
  WARNING: "caution",
  CAUTION: "caution",
};

function admonitionKinds(markdown: string): CalloutKind[] {
  return Array.from(markdown.matchAll(ADMONITION_RE)).map(
    (match) => KIND_BY_MARKER[match[1].toUpperCase()],
  );
}

/** Index just past the `</div>` that closes the `<div>` opening at `start`. */
function findDivEnd(html: string, start: number): number {
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html)) !== null) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return tag.lastIndex;
  }
  return html.length;
}

function splitCallouts(html: string, kinds: CalloutKind[]): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const opener = /<div>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(html)) !== null) {
    const end = findDivEnd(html, match.index);
    const before = html.slice(cursor, match.index);
    if (before.trim()) blocks.push({ type: "html", html: before });
    blocks.push({
      type: "callout",
      kind: kinds.shift() ?? "note",
      html: html.slice(match.index + "<div>".length, end - "</div>".length),
    });
    cursor = end;
    opener.lastIndex = end;
  }
  const tail = html.slice(cursor);
  if (tail.trim()) blocks.push({ type: "html", html: tail });
  return blocks;
}

/**
 * @param html Rendered article HTML.
 * @param markdown Raw markdown body, used only to recover admonition types.
 */
export function buildArticleSections(
  html: string,
  markdown: string,
): ArticleSection[] {
  const kinds = admonitionKinds(markdown);
  const headings = Array.from(
    html.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi),
  );

  const bounds: { id: string | null; heading: string | null; from: number }[] = [
    { id: null, heading: null, from: 0 },
  ];
  for (const heading of headings) {
    bounds.push({
      id: heading[1],
      heading: heading[2].replace(/<[^>]+>/g, "").trim(),
      from: heading.index ?? 0,
    });
  }

  const sections: ArticleSection[] = [];
  bounds.forEach((bound, index) => {
    const to = bounds[index + 1]?.from ?? html.length;
    const chunk = html.slice(bound.from, to);
    if (!chunk.trim()) return;
    sections.push({
      id: bound.id ?? "introduction",
      heading: bound.heading,
      // Callout kinds are consumed in document order across the whole article.
      blocks: splitCallouts(chunk, kinds),
    });
  });
  return sections;
}
