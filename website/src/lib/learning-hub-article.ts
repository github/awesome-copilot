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
 * Removes decorative emoji (and the variation-selector/ZWJ glyphs that
 * usually trail them) from heading text used in the "In this article" nav.
 */
export function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Remove the markdown title because the article chassis already renders it. */
export function stripLeadingH1(html: string): string {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, "");
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
  // Several Learning Hub articles end their markdown body with a trailing
  // `---` thematic break (left over from an earlier authoring template).
  // Rendered as-is it becomes a stray `<hr>` between the article content and
  // the site footer, with no section boundary it's meant to mark (see #2961).
  // Stripping just the final one here — rather than editing every content
  // file — also protects future articles authored with the same habit.
  const trimmedHtml = html.replace(/\s*<hr\s*\/?>\s*$/i, "");
  const headings = Array.from(
    trimmedHtml.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi),
  );

  const bounds: { id: string | null; heading: string | null; from: number }[] = [
    { id: null, heading: null, from: 0 },
  ];
  for (const heading of headings) {
    bounds.push({
      id: heading[1],
      // Some articles (e.g. the CLI for Beginners lessons) prefix/suffix
      // their `##` headings with decorative emoji. Those read fine inline in
      // the article body, but stripped down to plain text in the "In this
      // article" nav they read as stray glyphs — other Learning Hub pages
      // don't emoji-decorate their nav, so strip them here for consistency (#2962).
      heading: stripEmoji(heading[2].replace(/<[^>]+>/g, "").trim()),
      from: heading.index ?? 0,
    });
  }

  const sections: ArticleSection[] = [];
  bounds.forEach((bound, index) => {
    const to = bounds[index + 1]?.from ?? trimmedHtml.length;
    const chunk = trimmedHtml.slice(bound.from, to);
    if (!chunk.trim()) return;
    const sectionHtml = bound.id
      ? chunk.replace(/(<h2\b[^>]*?)\s+id="[^"]+"/i, "$1")
      : chunk;
    sections.push({
      id: bound.id ?? "introduction",
      heading: bound.heading,
      // Callout kinds are consumed in document order across the whole article.
      blocks: splitCallouts(sectionHtml, kinds),
    });
  });
  return sections;
}
