// Card building core for the Chat Cards canvas extension. This module is
// dependency-free so the extension folder stays self-contained for reuse
// outside this repository. It knows nothing about the Copilot SDK or the
// page server; extension.mjs wires those. Everything here is pure string
// logic, so it can be exercised with plain Node without joining a session.

// ---------------------------------------------------------------------------
// Escaping and small string helpers
// ---------------------------------------------------------------------------

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Every text field an action accepts is PLAIN text and is escaped here, so a
// caller must not pre-escape. Callers do it anyway, and turning their
// "&amp;" into "&amp;amp;" shows the entity literally in the card. A "&" that
// already begins a well-formed character reference is therefore left alone.
// This costs nothing in safety: < > " and ' are still escaped
// unconditionally, so no pre-escaped text can reopen a tag or an attribute.
const ESCAPE_PATTERN =
  /[<>"']|&(?!#\d{1,7};|#[xX][0-9a-fA-F]{1,6};|[a-zA-Z][a-zA-Z0-9]{1,31};)/g;

export function escapeHtml(value) {
  return String(value ?? "").replace(ESCAPE_PATTERN, (ch) => HTML_ESCAPES[ch]);
}

let uidCounter = 0;

export function uid(prefix = "mcc") {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function looksLikeUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value ?? "").trim());
}

export function isDataUrlOfType(value, type) {
  return new RegExp(`^data:${type}/[a-z0-9.+-]+\\s*[;,]`, "i").test(String(value ?? "").trim());
}

export function isBlobUrl(value) {
  return /^blob:\S+$/i.test(String(value ?? "").trim());
}

// Sources a <video>/<audio> element can actually play inside a card.
export function isPlayableMediaUrl(value) {
  const v = String(value ?? "").trim();
  return isHttpUrl(v) || isDataUrlOfType(v, "video") || isDataUrlOfType(v, "audio") || isBlobUrl(v);
}

// Sources an <img> or a video poster can display inside a card.
export function isDisplayableImageUrl(value) {
  const v = String(value ?? "").trim();
  return isHttpUrl(v) || isDataUrlOfType(v, "image") || isBlobUrl(v);
}

// Convert plain text to paragraph markup: blank lines separate paragraphs,
// single newlines become <br>.
export function textToParagraphs(text) {
  const blocks = String(text ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// HTML sanitizing
// ---------------------------------------------------------------------------
// The extension stays dependency-free (no HTML parser), so this is a strict
// rebuild-only sanitizer: a tag survives only if its name is allowlisted,
// and it is then
// re-emitted from scratch with only allowlisted, validated attributes.
// Anything else (unknown tags, malformed tags) is escaped and shown as
// literal text, so a mistake is visible instead of silently dropped. Closing
// tags are balanced against a stack, so caller HTML can never close the
// card's own containers or leak an open element into the rest of the page.

const SAFE_HTML_TAGS = new Set([
  "a", "abbr", "b", "blockquote", "br", "caption", "code", "dd", "details",
  "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "kbd", "li", "mark", "ol", "p", "pre", "q",
  "s", "samp", "section", "small", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul", "var",
]);

const SANITIZE_VOID_TAGS = new Set(["br", "hr", "img"]);

// Per-tag attribute allowlist with a validator per attribute. An attribute
// missing here, or failing its validator, is dropped.
const SAFE_CLASS_PATTERN = /^[a-zA-Z0-9_ -]*$/;
const SAFE_ATTR_RULES = {
  "*": {
    class: (v) =>
      SAFE_CLASS_PATTERN.test(v) && !v.split(/\s+/).some((className) => className.startsWith("mcc-")),
    title: () => true,
  },
  a: { href: (v) => isHttpUrl(v.trim()) },
  img: {
    src: (v) => isDisplayableImageUrl(v),
    alt: () => true,
    width: (v) => /^\d{1,4}$/.test(v),
    height: (v) => /^\d{1,4}$/.test(v),
  },
  td: { colspan: (v) => /^\d{1,3}$/.test(v), rowspan: (v) => /^\d{1,3}$/.test(v) },
  th: {
    colspan: (v) => /^\d{1,3}$/.test(v),
    rowspan: (v) => /^\d{1,3}$/.test(v),
    scope: (v) => v === "col" || v === "row",
  },
  details: { open: () => true },
  ol: { start: (v) => /^\d{1,6}$/.test(v), type: (v) => /^[1AaIi]$/.test(v) },
};

const ATTR_PATTERN = /([a-zA-Z][a-zA-Z0-9-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function rebuildTag(name, attrText) {
  const rules = { ...SAFE_ATTR_RULES["*"], ...(SAFE_ATTR_RULES[name] ?? {}) };
  let out = `<${name}`;
  ATTR_PATTERN.lastIndex = 0;
  let match;
  while ((match = ATTR_PATTERN.exec(attrText)) !== null) {
    const attr = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    const validator = rules[attr];
    if (!validator) continue;
    if (value === undefined) {
      // Boolean attribute (e.g. <details open>).
      if (validator("")) out += ` ${attr}`;
      continue;
    }
    if (validator(value)) out += ` ${attr}="${escapeHtml(value)}"`;
  }
  // Links open outside the canvas, matching the table and markdown renderers.
  if (name === "a" && out.includes(' href="')) {
    out += ' target="_blank" rel="noopener noreferrer nofollow"';
  }
  return `${out}>`;
}

// Strip active content from caller-supplied HTML so it can be embedded in a
// card. Unknown or malformed tags render as visible literal text.
export function sanitizeHtml(html) {
  const segments = String(html ?? "").split(/(<[^>]*>)/);
  const openStack = [];
  let out = "";

  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (!segment.startsWith("<")) {
      out += escapeHtml(segment);
      continue;
    }
    const match = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)\/?\s*>$/.exec(segment);
    const name = match?.[2]?.toLowerCase();
    if (!match || !SAFE_HTML_TAGS.has(name)) {
      out += escapeHtml(segment);
      continue;
    }
    if (match[1] === "/") {
      // Emit the close only if the element is actually open, closing any
      // elements opened after it first so nesting stays valid.
      const depth = openStack.lastIndexOf(name);
      if (depth === -1) continue;
      while (openStack.length > depth) {
        out += `</${openStack.pop()}>`;
      }
      continue;
    }
    out += rebuildTag(name, match[3] ?? "");
    if (!SANITIZE_VOID_TAGS.has(name)) openStack.push(name);
  }

  while (openStack.length > 0) {
    out += `</${openStack.pop()}>`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tutor terms
// ---------------------------------------------------------------------------

const DEFAULT_MAX_PER_TERM = 1;
const DEFAULT_MAX_TOTAL = 40;

// Text inside these elements is not visible prose. A span here is either
// shown literally or breaks the element: SVG <title> is the native tooltip,
// so markup inside it turns the tooltip into raw text.
const TERM_SKIP_TAGS = new Set(["script", "style", "title", "desc", "head", "textarea", "option", "select"]);

const TERM_CODE_TAGS = new Set(["pre", "code", "kbd", "samp", "var"]);

// Elements with no closing tag, which therefore never open a region.
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// Comments, doctypes, and a stray "<" all return null: they open nothing.
function readTag(token) {
  const match = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(token);
  if (!match) return null;
  return {
    name: match[2].toLowerCase(),
    closing: match[1] === "/",
    selfClosing: /\/\s*>$/.test(token),
    isTerm: /class\s*=\s*["'][^"']*\bmcc-term\b/.test(token),
  };
}

function prepareTerms(terms) {
  const seen = new Set();
  const prepared = [];
  for (const entry of terms) {
    const trimmed = (entry?.term ?? "").trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    // Identical terms listed twice would otherwise burn the per-term budget
    // twice over and produce two tips for the same word.
    if (seen.has(key)) continue;
    seen.add(key);
    prepared.push({ key, tip: entry.tip ?? "", escaped: escapeHtml(trimmed) });
  }
  // Longest first, so "memory safety" claims the position rather than the
  // "memory" that starts at the same index.
  prepared.sort((a, b) => b.escaped.length - a.escaped.length || a.key.localeCompare(b.key));
  return prepared;
}

// Wrap visible-text occurrences of tutor terms in .mcc-term spans so the
// canvas page can show dwell tooltips. Every match is emitted straight to the
// output and never rescanned, and a single alternation over all terms does
// the scanning, so one term can never land inside markup produced for
// another. Regions that are not visible prose (attributes, <title>, <script>,
// <style>, code samples, and text already inside an .mcc-term span) are
// skipped outright.
export function wrapTermsInHtml(html, terms, options = {}) {
  const maxPerTerm = options.maxPerTerm ?? DEFAULT_MAX_PER_TERM;
  const maxTotal = options.maxTotal ?? DEFAULT_MAX_TOTAL;
  const prepared = prepareTerms(terms ?? []);
  if (prepared.length === 0 || maxPerTerm < 1 || maxTotal < 1) return html;

  const skipTags = new Set(TERM_SKIP_TAGS);
  if (!options.includeCode) for (const tag of TERM_CODE_TAGS) skipTags.add(tag);

  const byMatch = new Map(prepared.map((term) => [term.escaped.toLowerCase(), term]));
  const pattern = new RegExp(
    `(?<![\\w-])(?:${prepared.map((term) => escapeRegExp(term.escaped)).join("|")})(?![\\w-])`,
    "gi",
  );

  const used = new Map();
  const openTags = [];
  const segments = html.split(/(<[^>]*>)/);
  let total = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.length === 0) continue;

    if (segment.startsWith("<")) {
      const tag = readTag(segment);
      if (!tag) continue;
      if (tag.closing) {
        for (let depth = openTags.length - 1; depth >= 0; depth--) {
          if (openTags[depth].name === tag.name) {
            openTags.length = depth;
            break;
          }
        }
      } else if (!tag.selfClosing && !VOID_TAGS.has(tag.name)) {
        openTags.push({ name: tag.name, skip: skipTags.has(tag.name) || tag.isTerm });
      }
      continue;
    }

    if (total >= maxTotal) continue;
    if (openTags.some((open) => open.skip)) continue;

    pattern.lastIndex = 0;
    let out = "";
    let last = 0;
    let match;
    while (total < maxTotal && (match = pattern.exec(segment)) !== null) {
      const term = byMatch.get(match[0].toLowerCase());
      if (!term) continue;
      const count = used.get(term.key) ?? 0;
      if (count >= maxPerTerm) continue;
      used.set(term.key, count + 1);
      total += 1;
      out +=
        segment.slice(last, match.index) +
        `<span class="mcc-term" data-tip="${escapeHtml(term.tip)}" tabindex="0">${match[0]}</span>`;
      last = match.index + match[0].length;
    }
    if (last > 0) segments[i] = out + segment.slice(last);
  }

  return segments.join("");
}

// ---------------------------------------------------------------------------
// Text to table
// ---------------------------------------------------------------------------

const CANDIDATE_DELIMITERS = ["\t", "|", ";", ","];

// Pick the first candidate delimiter that appears on most non-empty lines.
export function detectCellDelimiter(lines) {
  if (lines.length === 0) return null;
  const threshold = Math.max(1, Math.ceil(lines.length * 0.6));
  for (const delimiter of CANDIDATE_DELIMITERS) {
    const linesWithDelimiter = lines.filter((line) => line.includes(delimiter)).length;
    if (linesWithDelimiter >= threshold) return delimiter;
  }
  return null;
}

// Pad or trim header titles to exactly `count` columns.
export function balanceHeaders(headers, count) {
  const out = headers.slice(0, count).map((h) => h.trim());
  while (out.length < count) out.push(`Column ${out.length + 1}`);
  return out;
}

export function textToTable(text, options = {}) {
  const rowDelimiter = options.rowDelimiter ?? "\n";
  const lines = String(text ?? "")
    .split(rowDelimiter)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    const width = options.columns ?? options.headers?.length ?? 1;
    return { headers: options.headers ? balanceHeaders(options.headers, width) : [], rows: [] };
  }

  const delimiter = options.cellDelimiter ?? detectCellDelimiter(lines);
  let rows;
  if (delimiter) {
    rows = lines.map((line) =>
      line
        .split(delimiter)
        .map((cell) => cell.trim())
        // Drop empty edge cells produced by markdown-style "| a | b |" rows.
        .filter((cell, index, cells) => cell.length > 0 || (index > 0 && index < cells.length - 1)),
    );
  } else {
    const columns = Math.max(1, options.columns ?? options.headers?.length ?? 2);
    rows = [];
    for (let i = 0; i < lines.length; i += columns) {
      rows.push(lines.slice(i, i + columns));
    }
  }

  const width = Math.max(
    1,
    options.columns ?? Math.max(options.headers?.length ?? 0, ...rows.map((row) => row.length)),
  );
  rows = rows.map((row) => {
    const cells = row.slice(0, width);
    while (cells.length < width) cells.push("");
    return cells;
  });

  return {
    headers: options.headers ? balanceHeaders(options.headers, width) : [],
    rows,
  };
}

// Ensure explicit row data is rectangular, padding short rows with blanks.
export function normalizeRows(rows, headers = []) {
  const width = Math.max(1, headers.length, ...rows.map((row) => row.length));
  const balanced = rows.map((row) => {
    const cells = row.slice(0, width).map((cell) => String(cell ?? ""));
    while (cells.length < width) cells.push("");
    return cells;
  });
  return {
    headers: headers.length > 0 ? balanceHeaders(headers, width) : [],
    rows: balanced,
  };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------
// The extension stays dependency-free (no markdown package), so this is a
// small renderer
// covering what a model-written guide actually uses: headings, paragraphs,
// nested lists, fenced code, pipe tables, blockquotes, rules, and the inline
// set (code, bold, italic, links, images). Every text node passes through
// escapeHtml, so the output cannot carry active content.

function renderInline(raw) {
  // Null bytes would collide with the placeholder markers below.
  let text = escapeHtml(String(raw ?? "").replace(/\u0000/g, ""));

  // Code spans first: their content is protected from the other inline rules.
  const codeSpans = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(`<code>${code}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // Images before links, so ![alt](src) is not half-eaten by the link rule.
  text = text.replace(/!\[([^\]]*)\]\(([^()\s]+)\)/g, (whole, alt, src) => {
    if (/^https?:\/\//i.test(src) || /^data:image\//i.test(src)) {
      return `<img src="${src}" alt="${alt}">`;
    }
    return whole;
  });
  text = text.replace(/\[([^\]]+)\]\(([^()\s]+)\)/g, (whole, label, href) => {
    if (/^https?:\/\//i.test(href)) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
    }
    return whole;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>");
  text = text.replace(/(^|\s)_([^_]+)_(?=\s|[.,;:!?)]|$)/g, "$1<em>$2</em>");

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => codeSpans[Number(index)]);
}

function renderCodeBlock(code, language) {
  return (
    '<div class="mcc-codewrap">' +
    '<button type="button" class="mcc-btn mcc-copy-code">Copy</button>' +
    `<pre><code class="language-${escapeHtml(language || "text")}">${escapeHtml(code)}</code></pre>` +
    "</div>"
  );
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitTableRow(line) {
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells.length > 0 && cells[0] === "") cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function renderList(lines, start) {
  // Returns { html, next }. Nesting follows indentation width; two or more
  // extra spaces open a child list, matching how models format outlines.
  const stack = [];
  let html = "";
  let index = start;

  const closeTo = (depth) => {
    while (stack.length > depth) {
      const top = stack.pop();
      html += `</li></${top.tag}>`;
    }
  };

  while (index < lines.length) {
    const match = LIST_ITEM_PATTERN.exec(lines[index]);
    if (!match) break;
    const indent = match[1].replace(/\t/g, "  ").length;
    const ordered = /\d/.test(match[2][0]);
    const tag = ordered ? "ol" : "ul";

    while (stack.length > 0 && indent < stack[stack.length - 1].indent) {
      const top = stack.pop();
      html += `</li></${top.tag}>`;
    }

    if (stack.length === 0 || indent > stack[stack.length - 1].indent + 1) {
      stack.push({ indent, tag });
      html += `<${tag}><li>${renderInline(match[3])}`;
    } else {
      html += `</li><li>${renderInline(match[3])}`;
    }
    index += 1;
  }
  closeTo(0);
  return { html, next: index };
}

// Render a markdown fragment to card-styled HTML (no section folding).
export function renderMarkdownFragment(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const parts = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    parts.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
    paragraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    const fence = /^```\s*([a-zA-Z0-9+#._-]*)\s*$/.exec(trimmed);
    if (fence) {
      flushParagraph();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      parts.push(renderCodeBlock(code.join("\n"), fence[1]));
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      parts.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      parts.push("<hr>");
      i += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quoted = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const inner = quoted
        .join("\n")
        .split(/\n{2,}/)
        .map((block) => `<p>${block.split("\n").map(renderInline).join("<br>")}</p>`)
        .join("");
      parts.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph();
      const headers = splitTableRow(trimmed);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().length > 0) {
        rows.push(splitTableRow(lines[i].trim()));
        i += 1;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th scope="col">${renderInline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = rows
        .map((row) => `<tr>${headers.map((_, c) => `<td>${renderInline(row[c] ?? "")}</td>`).join("")}</tr>`)
        .join("");
      parts.push(
        `<div class="mcc-table-scroll"><table class="mcc-table">${thead}<tbody>${tbody}</tbody></table></div>`,
      );
      continue;
    }

    if (LIST_ITEM_PATTERN.test(line)) {
      flushParagraph();
      const list = renderList(lines, i);
      parts.push(list.html);
      i = list.next;
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();
  return parts.join("\n");
}

// Parse a markdown document for the document card: the first H1
// becomes the title, and the body splits into sections on H2 headings (the
// content before the first H2 is the intro section with a null heading).
export function parseMarkdownDocument(markdown) {
  const source = String(markdown ?? "").replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  let title;
  const sections = [];
  let current = { heading: null, lines: [] };
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) inFence = !inFence;
    if (!inFence) {
      const h1 = /^#\s+(.*?)\s*#*\s*$/.exec(trimmed);
      if (h1 && title === undefined) {
        title = h1[1];
        continue;
      }
      const h2 = /^##\s+(.*?)\s*#*\s*$/.exec(trimmed);
      if (h2) {
        if (current.lines.join("").trim().length > 0 || current.heading !== null) sections.push(current);
        current = { heading: h2[1], lines: [] };
        continue;
      }
    }
    current.lines.push(line);
  }
  if (current.lines.join("").trim().length > 0 || current.heading !== null) sections.push(current);

  return {
    title,
    sections: sections.map((section) => ({
      heading: section.heading,
      html: renderMarkdownFragment(section.lines.join("\n")),
    })),
  };
}

function renderMarkdownSections(sections, options = {}) {
  const folded = options.folded !== false;
  const headed = sections.filter((section) => section.heading !== null);
  const parts = [];

  if (!folded || headed.length === 0) {
    for (const section of sections) {
      if (section.heading !== null) parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
      parts.push(section.html);
    }
    return parts.join("");
  }

  let firstOpenUsed = false;
  let controlsAdded = false;
  for (const section of sections) {
    if (section.heading === null) {
      parts.push(section.html);
      continue;
    }
    if (!controlsAdded) {
      controlsAdded = true;
      parts.push(`<div style="display:flex;gap:6px;justify-content:flex-end;margin-bottom:8px">
<button type="button" class="mcc-btn" data-mcc-expand="all">Show all</button>
<button type="button" class="mcc-btn" data-mcc-expand="none">Hide all</button>
</div>`);
    }
    const open = !firstOpenUsed && options.openFirst !== false ? " open" : "";
    firstOpenUsed = true;
    parts.push(`<details class="mcc-reveal"${open}>
<summary>${escapeHtml(section.heading)}</summary>
<div class="mcc-reveal-body">${section.html}</div>
</details>`);
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------
// Axis, grid, and separator colors reference the card theme variables (with
// the plain light values
// as fallbacks) instead of fixed hex values. The canvas page inlines the SVG
// in its own DOM, so the chart follows the light/dark theme for free.

const PALETTE = ["#2b6cb0", "#2f855a", "#0e7490", "#5b6b7b", "#1d4e89", "#38a169", "#4c7ba8"];

const CHART_WIDTH = 640;
const CHART_HEIGHT = 340;
const MARGIN = { top: 20, right: 20, bottom: 56, left: 52 };

const GRID_STROKE = "var(--mcc-border, #d8e2ec)";
const TICK_FILL = "var(--mcc-muted, #5b6b7b)";
const LABEL_FILL = "var(--mcc-text, #1f2328)";
const SLICE_STROKE = "var(--mcc-surface, #ffffff)";

// Steps a reader can do arithmetic on, in ascending order within each decade.
const STEP_MANTISSAS = [1, 2, 2.5, 5];

// Choose an axis top and tick step covering [0, maxValue] in at most maxTicks
// intervals, picking the SMALLEST readable step that fits rather than slicing
// the range into a fixed number of equal parts. Integer data is additionally
// held to an integer step, so a 1-5 rating scale reads 0, 1, 2, 3, 4, 5.
export function niceScale(maxValue, maxTicks = 6, integerData = false) {
  if (!(maxValue > 0) || !Number.isFinite(maxValue)) return { max: 1, step: 1, ticks: [0, 1] };

  let step = 0;
  const startExponent = Math.floor(Math.log10(maxValue)) - 2;
  for (let exponent = startExponent; exponent <= startExponent + 9 && step === 0; exponent++) {
    for (const mantissa of STEP_MANTISSAS) {
      const candidate = mantissa * 10 ** exponent;
      if (candidate <= 0) continue;
      if (integerData && !Number.isInteger(candidate)) continue;
      // The epsilon keeps a max that is an exact multiple of the candidate
      // from being counted as one interval too many.
      if (Math.ceil(maxValue / candidate - 1e-9) <= maxTicks) {
        step = candidate;
        break;
      }
    }
  }
  if (step === 0) step = maxValue / maxTicks;

  const max = Number((Math.ceil(maxValue / step - 1e-9) * step).toFixed(6));
  const ticks = [];
  // Half a step of slack absorbs the float drift that would otherwise drop
  // the top tick when max is an exact multiple of step.
  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return { max, step, ticks };
}

// Data made only of integers gets an integer axis. A 1-5 rating scale is the
// common case, and fractional ticks on it are noise.
function seriesScale(series) {
  const values = series.flatMap((s) => s.values).filter((value) => Number.isFinite(value));
  return niceScale(Math.max(...values, 0), 6, values.every((value) => Number.isInteger(value)));
}

// Only the decimals the step actually needs, so a 0.25 step reads "0.25" and
// a whole-number step never prints "3.0".
function decimalsForStep(step) {
  if (Number.isInteger(step)) return 0;
  const text = step.toPrecision(12).replace(/0+$/, "");
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : Math.min(6, text.length - dot - 1);
}

function formatTick(value, step) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(decimalsForStep(step));
}

function axisAndGrid(scale, plotWidth, plotHeight) {
  let out = "";
  for (const value of scale.ticks) {
    const y = MARGIN.top + plotHeight - (plotHeight * value) / scale.max;
    out += `<line x1="${MARGIN.left}" y1="${y.toFixed(1)}" x2="${MARGIN.left + plotWidth}" y2="${y.toFixed(1)}" stroke="${GRID_STROKE}" stroke-width="1"/>`;
    out += `<text x="${MARGIN.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${TICK_FILL}">${escapeHtml(
      formatTick(value, scale.step),
    )}</text>`;
  }
  return out;
}

// Break a label across at most maxLines lines without splitting words. A word
// too long to fit on its own line is left alone rather than hyphenated; the
// full text is always reachable from the <title> either way.
export function wrapLabel(label, maxChars, maxLines) {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [label];
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maxChars || current.length === 0) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]}...`;
  return kept;
}

function xLabels(labels, plotWidth, plotHeight) {
  const step = plotWidth / Math.max(1, labels.length);
  const maxChars = Math.max(6, Math.floor(step / 6));
  return labels
    .map((label, i) => {
      const x = MARGIN.left + step * i + step / 2;
      const y = MARGIN.top + plotHeight + 16;
      const lines = wrapLabel(label, maxChars, 2);
      const tspans = lines
        .map((line, index) => `<tspan x="${x.toFixed(1)}" dy="${index === 0 ? 0 : 12}">${escapeHtml(line)}</tspan>`)
        .join("");
      return (
        `<text x="${x.toFixed(1)}" y="${y}" text-anchor="middle" font-size="11" fill="${LABEL_FILL}">` +
        `<title>${escapeHtml(label)}</title>${tspans}</text>`
      );
    })
    .join("");
}

function barChartSvg(labels, series) {
  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const scale = seriesScale(series);
  const maxValue = scale.max;
  const groupStep = plotWidth / Math.max(1, labels.length);
  const barWidth = Math.max(4, (groupStep * 0.7) / Math.max(1, series.length));

  let bars = "";
  series.forEach((s, si) => {
    s.values.slice(0, labels.length).forEach((value, li) => {
      const height = Math.max(0, (value / maxValue) * plotHeight);
      const x = MARGIN.left + groupStep * li + groupStep * 0.15 + barWidth * si;
      const y = MARGIN.top + plotHeight - height;
      bars +=
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${height.toFixed(1)}" ` +
        `fill="${PALETTE[si % PALETTE.length]}" rx="2"><title>${escapeHtml(`${s.name} - ${labels[li]}: ${value}`)}</title></rect>`;
    });
  });

  return (
    `<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img" xmlns="http://www.w3.org/2000/svg">` +
    axisAndGrid(scale, plotWidth, plotHeight) +
    bars +
    xLabels(labels, plotWidth, plotHeight) +
    "</svg>"
  );
}

function lineChartSvg(labels, series) {
  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const scale = seriesScale(series);
  const maxValue = scale.max;
  const step = plotWidth / Math.max(1, labels.length);

  let lines = "";
  series.forEach((s, si) => {
    const color = PALETTE[si % PALETTE.length];
    const points = s.values
      .slice(0, labels.length)
      .map((value, li) => {
        const x = MARGIN.left + step * li + step / 2;
        const y = MARGIN.top + plotHeight - (value / maxValue) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    lines += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`;
    s.values.slice(0, labels.length).forEach((value, li) => {
      const x = MARGIN.left + step * li + step / 2;
      const y = MARGIN.top + plotHeight - (value / maxValue) * plotHeight;
      lines +=
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${color}">` +
        `<title>${escapeHtml(`${s.name} - ${labels[li]}: ${value}`)}</title></circle>`;
    });
  });

  return (
    `<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img" xmlns="http://www.w3.org/2000/svg">` +
    axisAndGrid(scale, plotWidth, plotHeight) +
    lines +
    xLabels(labels, plotWidth, plotHeight) +
    "</svg>"
  );
}

function pieChartSvg(slices, donut) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0) || 1;

  let angle = -Math.PI / 2;
  let paths = "";
  slices.forEach((slice, i) => {
    const share = Math.max(0, slice.value) / total;
    const sweep = share * Math.PI * 2;
    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    const end = angle + sweep;
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const percent = (share * 100).toFixed(1);
    if (share >= 0.999) {
      paths += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${PALETTE[i % PALETTE.length]}"><title>${escapeHtml(
        `${slice.label}: ${slice.value} (${percent}%)`,
      )}</title></circle>`;
    } else if (share > 0) {
      paths +=
        `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" ` +
        `fill="${PALETTE[i % PALETTE.length]}" stroke="${SLICE_STROKE}" stroke-width="1">` +
        `<title>${escapeHtml(`${slice.label}: ${slice.value} (${percent}%)`)}</title></path>`;
    }
    angle = end;
  });
  if (donut) {
    paths += `<circle cx="${cx}" cy="${cy}" r="${radius * 0.55}" fill="${SLICE_STROKE}"/>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" role="img" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

function chartLegend(entries) {
  const items = entries
    .map((entry) => `<li><span class="mcc-swatch" style="background:${entry.color}"></span>${escapeHtml(entry.label)}</li>`)
    .join("");
  return `<ul class="mcc-legend">${items}</ul>`;
}

function chartDataTable(options) {
  let head = "";
  let rows = "";
  if (options.type === "pie" || options.type === "donut") {
    head = '<tr><th scope="col">Label</th><th scope="col">Value</th></tr>';
    rows = (options.values ?? [])
      .map((slice) => `<tr><td>${escapeHtml(slice.label)}</td><td>${escapeHtml(String(slice.value))}</td></tr>`)
      .join("");
  } else {
    const labels = options.labels ?? [];
    head =
      '<tr><th scope="col">Series</th>' +
      labels.map((label) => `<th scope="col">${escapeHtml(label)}</th>`).join("") +
      "</tr>";
    rows = (options.series ?? [])
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.name)}</td>` +
          labels.map((_, i) => `<td>${escapeHtml(String(s.values[i] ?? ""))}</td>`).join("") +
          "</tr>",
      )
      .join("");
  }
  return `<details class="mcc-reveal"><summary>View data</summary><div class="mcc-reveal-body">
<div class="mcc-table-scroll"><table class="mcc-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
</div></details>`;
}

// ---------------------------------------------------------------------------
// Card shell
// ---------------------------------------------------------------------------

// The canvas page renders header toggles for every card; these attributes are
// how a builder opts a card out.
function renderCardShell(options) {
  const id = uid("card");
  let body = options.body;
  if (options.tutorTerms && options.tutorTerms.length > 0) {
    body = wrapTermsInHtml(body, options.tutorTerms, {
      includeCode: options.tutorTermsInCode === true,
    });
  }

  const config = {
    id,
    kind: options.kind,
    dwellMs: options.dwellMs ?? 1200,
    contextActions: (options.contextActions ?? []).map((action) => ({
      label: String(action.label ?? ""),
      prompt: String(action.prompt ?? ""),
    })),
    draggable: options.draggable !== false,
  };

  const subtitle = options.subtitle
    ? `<p class="mcc-subtitle">${escapeHtml(options.subtitle)}</p>`
    : "";
  const toggles =
    '<button type="button" class="mcc-btn mcc-copy-card" title="Copy this card as standalone HTML to paste elsewhere">Copy card</button>' +
    '<button type="button" class="mcc-btn mcc-toggle-code" title="Show or hide this card\'s HTML source">&lt;/&gt;</button>' +
    '<button type="button" class="mcc-btn mcc-toggle-collapse" title="Collapse or expand this card" aria-expanded="true">&#x2303;</button>' +
    '<button type="button" class="mcc-btn mcc-remove-card" title="Remove this card from the canvas">&#x2715;</button>';

  const articleHtml = `<article class="mcc-card" data-card-id="${escapeHtml(id)}">
  <header class="mcc-head"${config.draggable ? ' draggable="true"' : ""}>
    <div>
      <h1>${escapeHtml(options.title)}</h1>
      ${subtitle}
    </div>
    <div class="mcc-tools">${toggles}</div>
  </header>
  <div class="mcc-body">
${body}
  </div>
  <footer class="mcc-foot">chat-cards &middot; ${escapeHtml(options.kind)} card</footer>
</article>`;

  return { id, articleHtml, config };
}

function finishCard(shellOptions, summary) {
  const { id, articleHtml, config } = renderCardShell(shellOptions);
  return {
    id,
    kind: shellOptions.kind,
    title: shellOptions.title,
    articleHtml,
    config,
    summary,
  };
}

function requireTitle(options) {
  const title = String(options?.title ?? "").trim();
  if (title.length === 0) throw new Error("A non-empty title is required.");
  return title;
}

// Tab panels and reveal sections accept markdown (with "content" as an
// alias, because that is the key agents reach for unprompted), code, HTML
// (sanitized to an allowlisted subset), or plain text, checked in that
// order. A part with none of them is an error, not an empty panel:
// rendering nothing silently is exactly the failure an agent cannot see
// and correct.
function richContent(part, what) {
  const markdown = [part.markdown, part.content].find(
    (value) => value !== undefined && String(value).trim().length > 0,
  );
  if (markdown !== undefined) {
    return `<div class="mcc-doc">${renderMarkdownFragment(markdown)}</div>`;
  }
  if (part.code !== undefined && String(part.code).trim().length > 0) {
    return renderCodeBlock(String(part.code), part.language);
  }
  if (part.html !== undefined && String(part.html).trim().length > 0) {
    return sanitizeHtml(part.html);
  }
  if (part.text !== undefined && String(part.text).trim().length > 0) {
    return textToParagraphs(part.text);
  }
  throw new Error(
    `${what} has no content. Provide non-empty "markdown" (alias "content"), "code", "html", or "text".`,
  );
}

// ---------------------------------------------------------------------------
// Card builders
// ---------------------------------------------------------------------------

export function buildTabCard(options) {
  const title = requireTitle(options);
  const tabs = Array.isArray(options.tabs) ? options.tabs : [];
  if (tabs.length === 0) throw new Error("Provide at least one tab.");

  const groupId = uid("tabs");
  const buttons = tabs
    .map((tab, index) => {
      const selected = index === 0 ? "true" : "false";
      return (
        `<button type="button" class="mcc-tab" role="tab" id="${groupId}-tab-${index}" ` +
        `aria-selected="${selected}" aria-controls="${groupId}-panel-${index}">` +
        `${escapeHtml(tab.label ?? `Tab ${index + 1}`)}</button>`
      );
    })
    .join("\n");
  const panels = tabs
    .map((tab, index) => {
      const hidden = index === 0 ? "" : " hidden";
      return (
        `<div class="mcc-panel" role="tabpanel" id="${groupId}-panel-${index}" ` +
        `aria-labelledby="${groupId}-tab-${index}"${hidden}>${richContent(tab, `Tab "${tab.label ?? index + 1}"`)}</div>`
      );
    })
    .join("\n");

  const body = `<section class="mcc-block mcc-tabs">
<div role="tablist" aria-label="${escapeHtml(title)}">
${buttons}
</div>
${panels}
</section>`;

  const labels = tabs.map((tab, index) => tab.label ?? `Tab ${index + 1}`).join(", ");
  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "tabs",
      body,
      tutorTerms: options.tutorTerms,
      tutorTermsInCode: options.tutorTermsInCode,
      contextActions: options.contextActions,
    },
    `Created tab card "${title}" with ${tabs.length} tab(s): ${labels}.`,
  );
}

function renderTableCell(value, columnIndex, options) {
  const autoLink = options.autoLinkUrls !== false;
  const isLinkColumn = options.linkColumns?.includes(columnIndex) ?? false;
  if ((isLinkColumn || autoLink) && looksLikeUrl(value)) {
    const href = escapeHtml(value.trim());
    return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${href}</a>`;
  }
  return escapeHtml(value);
}

export function tableDataToHtml(data, options = {}) {
  const caption = options.caption ? `<caption>${escapeHtml(options.caption)}</caption>` : "";
  const thead =
    data.headers.length > 0
      ? `<thead><tr>${data.headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead>`
      : "";
  const tbody = data.rows
    .map((row) => `<tr>${row.map((cell, index) => `<td>${renderTableCell(cell, index, options)}</td>`).join("")}</tr>`)
    .join("\n");
  return `<div class="mcc-table-scroll"><table class="mcc-table">${caption}${thead}<tbody>
${tbody}
</tbody></table></div>`;
}

export function buildTableCard(options) {
  const title = requireTitle(options);
  if ((!options.rows || options.rows.length === 0) && !options.text) {
    throw new Error("Provide either rows or text.");
  }
  const data =
    options.rows && options.rows.length > 0
      ? normalizeRows(options.rows, options.headers ?? [])
      : textToTable(options.text ?? "", {
          columns: options.columns,
          headers: options.headers,
          cellDelimiter: options.cellDelimiter,
        });

  const body = `<section class="mcc-block">
${tableDataToHtml(data, options)}
</section>`;

  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "table",
      body,
      tutorTerms: options.tutorTerms,
      contextActions: options.contextActions,
    },
    `Created table card "${title}" with ${data.rows.length} row(s)` +
      ` and ${Math.max(data.headers.length, data.rows[0]?.length ?? 0)} column(s).`,
  );
}

export function buildChartCard(options) {
  const title = requireTitle(options);
  const type = options.type;
  if (!["bar", "line", "pie", "donut"].includes(type)) {
    throw new Error('Chart type must be one of "bar", "line", "pie", "donut".');
  }
  if ((type === "pie" || type === "donut") && (!options.values || options.values.length === 0)) {
    throw new Error("Pie and donut charts require values.");
  }
  if ((type === "bar" || type === "line") && (!options.series?.length || !options.labels?.length)) {
    throw new Error("Bar and line charts require labels and series.");
  }
  if (type === "bar" || type === "line") {
    // The scale, bar geometry, and line placement all assume values from 0
    // up. A negative or non-numeric value would render as a clamped bar or
    // an off-canvas point, silently misrepresenting the data, so it is
    // rejected here (and the action schema says the same) instead.
    for (const s of options.series ?? []) {
      for (const value of Array.isArray(s?.values) ? s.values : []) {
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(
            `Series "${s?.name ?? "?"}" contains ${String(value)}: ` +
              "bar and line charts accept finite values of 0 or greater only.",
          );
        }
      }
    }
  }

  let svg;
  let legendHtml;
  if (type === "pie" || type === "donut") {
    const slices = options.values ?? [];
    svg = pieChartSvg(slices, type === "donut");
    const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0) || 1;
    legendHtml = chartLegend(
      slices.map((slice, i) => ({
        label: `${slice.label} (${((Math.max(0, slice.value) / total) * 100).toFixed(1)}%)`,
        color: PALETTE[i % PALETTE.length],
      })),
    );
  } else {
    const labels = options.labels ?? [];
    const series = options.series ?? [];
    svg = type === "line" ? lineChartSvg(labels, series) : barChartSvg(labels, series);
    legendHtml =
      series.length > 1
        ? chartLegend(series.map((s, i) => ({ label: s.name, color: PALETTE[i % PALETTE.length] })))
        : "";
  }

  const description = options.description ? `<p class="mcc-help">${escapeHtml(options.description)}</p>` : "";
  const yLabel = options.yLabel ? `<p class="mcc-help">${escapeHtml(options.yLabel)}</p>` : "";

  const body = `<section class="mcc-block mcc-chart">
${description}${yLabel}
${svg}
${legendHtml}
${chartDataTable(options)}
</section>`;

  const points =
    type === "pie" || type === "donut"
      ? `${options.values?.length ?? 0} slice(s)`
      : `${options.series?.length ?? 0} series over ${options.labels?.length ?? 0} label(s)`;
  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: `chart-${type}`,
      body,
      tutorTerms: options.tutorTerms,
      contextActions: options.contextActions,
    },
    `Created ${type} chart card "${title}" (${points}) as an SVG with a collapsible data table.`,
  );
}

function normalizeFieldOptions(options = []) {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : { ...option, value: option.value ?? option.label },
  );
}

function renderFormField(field, formId) {
  const type = field.type ?? "text";
  const fieldId = `${formId}-${String(field.name).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const name = escapeHtml(field.name);
  const required = field.required ? " required" : "";
  const requiredMark = field.required ? '<span class="mcc-required" title="Required">*</span>' : "";
  const label = escapeHtml(field.label ?? field.name);
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const value = field.value !== undefined ? escapeHtml(field.value) : "";
  const help = field.help ? `<span class="mcc-help">${escapeHtml(field.help)}</span>` : "";

  if (type === "hidden") {
    return `<input type="hidden" name="${name}" value="${value}">`;
  }
  if (type === "textarea") {
    return `<div class="mcc-field"><label for="${fieldId}">${label}${requiredMark}</label>
<textarea id="${fieldId}" name="${name}"${placeholder}${required}>${value}</textarea>${help}</div>`;
  }
  if (type === "select") {
    const optionTags = normalizeFieldOptions(field.options)
      .map((option) => {
        const selected = option.value === field.value ? " selected" : "";
        return `<option value="${escapeHtml(option.value ?? option.label)}"${selected}>${escapeHtml(option.label)}</option>`;
      })
      .join("");
    return `<div class="mcc-field"><label for="${fieldId}">${label}${requiredMark}</label>
<select id="${fieldId}" name="${name}"${required}>${optionTags}</select>${help}</div>`;
  }
  if (type === "checkbox" || type === "radio") {
    const choiceOptions = normalizeFieldOptions(field.options ?? [{ label: field.label ?? field.name, value: "yes" }]);
    // Native required covers "pick one" radio groups and a lone confirmation
    // checkbox. A required multi-checkbox group means "check at least one",
    // which HTML cannot express (required on each box would demand all of
    // them), so the fieldset is marked and the canvas page enforces it at
    // submit time via setCustomValidity.
    const nativeRequired = field.required && (type === "radio" || choiceOptions.length === 1) ? " required" : "";
    const choices = choiceOptions
      .map((option, index) => {
        const choiceId = `${fieldId}-${index}`;
        const checked = option.value === field.value ? " checked" : "";
        return `<label class="mcc-choice" for="${choiceId}">
<input type="${type}" id="${choiceId}" name="${name}" value="${escapeHtml(option.value ?? option.label)}"${checked}${nativeRequired}>
${escapeHtml(option.label)}</label>`;
      })
      .join("\n");
    const requireOne = field.required && type === "checkbox" && choiceOptions.length > 1 ? " data-mcc-require-one" : "";
    return `<fieldset class="mcc-field" style="border:none;padding:0;margin:0"${requireOne}>
<label>${label}${requiredMark}</label>
${choices}${help}</fieldset>`;
  }
  return `<div class="mcc-field"><label for="${fieldId}">${label}${requiredMark}</label>
<input type="${escapeHtml(type)}" id="${fieldId}" name="${name}" value="${value}"${placeholder}${required}>${help}</div>`;
}

export function buildFormCard(options) {
  const title = requireTitle(options);
  const fields = Array.isArray(options.fields) ? options.fields : [];
  if (fields.length === 0) throw new Error("Provide at least one field.");

  const formId = uid("form");
  const fieldHtml = fields.map((field) => renderFormField(field, formId)).join("\n");
  const description = options.description ? `<p class="mcc-help">${escapeHtml(options.description)}</p>` : "";
  const templateAttr = options.promptTemplate
    ? ` data-prompt-template="${escapeHtml(options.promptTemplate)}"`
    : "";

  const body = `<section class="mcc-block">
${description}
<form class="mcc-form" data-card-title="${escapeHtml(title)}"${templateAttr}>
${fieldHtml}
<div>
<button type="submit" class="mcc-btn mcc-btn-primary">${escapeHtml(options.submitLabel ?? "Submit")}</button>
</div>
<p class="mcc-form-status" role="status" aria-live="polite"></p>
<div class="mcc-form-fallback">
<p class="mcc-help">If the agent did not pick this up automatically, copy the text below and send it as your next message.</p>
<textarea readonly></textarea>
<button type="button" class="mcc-btn mcc-copy-prompt">Copy prompt</button>
</div>
</form>
</section>`;

  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "form",
      body,
      contextActions: options.contextActions,
      // Forms stay pinned in place: dragging one away from its explanatory
      // neighbors invites mis-submissions.
      draggable: false,
    },
    `Created form card "${title}" with ${fields.length} field(s). ` +
      "Submitting it sends the values back to the conversation as the next prompt.",
  );
}

export function buildRevealCard(options) {
  const title = requireTitle(options);
  const sections = Array.isArray(options.sections) ? options.sections : [];
  if (sections.length === 0) throw new Error("Provide at least one section.");

  const sectionHtml = sections
    .map((section) => {
      const open = section.open ? " open" : "";
      return `<div class="mcc-block"><details class="mcc-reveal"${open}>
<summary>${escapeHtml(section.heading ?? "Section")}</summary>
<div class="mcc-reveal-body">${richContent(section, `Section "${section.heading ?? "Section"}"`)}</div>
</details></div>`;
    })
    .join("\n");

  const body = `<div class="mcc-block" style="display:flex;gap:6px;justify-content:flex-end">
<button type="button" class="mcc-btn" data-mcc-expand="all">Show all</button>
<button type="button" class="mcc-btn" data-mcc-expand="none">Hide all</button>
</div>
${sectionHtml}`;

  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "show-hide",
      body,
      tutorTerms: options.tutorTerms,
      contextActions: options.contextActions,
    },
    `Created show/hide card "${title}" with ${sections.length} collapsible section(s).`,
  );
}

function countListItems(items) {
  return items.reduce((sum, item) => sum + 1 + countListItems(item.children ?? []), 0);
}

function renderListItems(items) {
  const lis = items
    .map((item) => {
      const children = item.children?.length ? renderListItems(item.children) : "";
      return `<li>${escapeHtml(item.text)}${children}</li>`;
    })
    .join("\n");
  return `<ol class="mcc-seq">\n${lis}\n</ol>`;
}

export function buildListCard(options) {
  const title = requireTitle(options);
  const items = Array.isArray(options.items) ? options.items : [];
  if (items.length === 0) throw new Error("Provide at least one item.");

  const intro = options.intro ? textToParagraphs(options.intro) : "";
  const body = `<section class="mcc-block">
${intro}
${renderListItems(items)}
</section>`;

  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "list",
      body,
      tutorTerms: options.tutorTerms,
      contextActions: options.contextActions,
    },
    `Created sequential list card "${title}" with ${countListItems(items)} item(s).`,
  );
}

export function buildMarkdownCard(options) {
  const markdown = String(options.markdown ?? "");
  if (markdown.trim().length === 0) throw new Error("Provide markdown content.");
  const doc = parseMarkdownDocument(markdown);
  const title = options.title ?? doc.title ?? "Document";

  const bodyHtml = renderMarkdownSections(doc.sections, {
    folded: options.splitSections,
    openFirst: options.openFirst,
  });
  const body = `<section class="mcc-block mcc-doc">
${bodyHtml}
</section>`;

  const headings = doc.sections.filter((section) => section.heading !== null).map((section) => section.heading);
  const described =
    headings.length > 0
      ? `${headings.length} collapsible section(s): ${headings.join(", ")}`
      : "a single flowing section";
  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "document",
      body,
      tutorTerms: options.tutorTerms,
      contextActions: options.contextActions,
    },
    `Created document card "${title}" from markdown with ${described}.`,
  );
}

export function buildVideoCard(options) {
  const title = requireTitle(options);
  const src = String(options.src ?? "").trim();
  if (!isPlayableMediaUrl(src)) {
    throw new Error(
      "src must be a direct http(s) video file URL, a data:video/* URI, or a blob: URL " +
        "(not a streaming platform page).",
    );
  }
  const poster =
    options.poster && isDisplayableImageUrl(options.poster)
      ? ` poster="${escapeHtml(String(options.poster).trim())}"`
      : "";
  const description = options.description ? `<p class="mcc-help">${escapeHtml(options.description)}</p>` : "";
  const link = isHttpUrl(src)
    ? `<p class="mcc-video-fallback"><a href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer nofollow">Open the clip directly</a></p>`
    : "";

  const body = `<section class="mcc-block mcc-video">
${description}
<div class="mcc-video-frame">
<video controls preload="metadata" src="${escapeHtml(src)}"${poster}></video>
</div>
${link}
</section>`;

  return finishCard(
    {
      title,
      subtitle: options.subtitle,
      kind: "video",
      body,
      contextActions: options.contextActions,
    },
    `Created video card "${title}" for ${src.slice(0, 120)}.`,
  );
}

// Dispatch table used by extension.mjs for create and update actions.
export const CARD_BUILDERS = {
  tabs: buildTabCard,
  table: buildTableCard,
  chart: buildChartCard,
  form: buildFormCard,
  "show-hide": buildRevealCard,
  list: buildListCard,
  document: buildMarkdownCard,
  video: buildVideoCard,
};

export function buildCard(kind, options) {
  const builder = CARD_BUILDERS[kind];
  if (!builder) {
    throw new Error(`Unknown card kind "${kind}". Valid kinds: ${Object.keys(CARD_BUILDERS).join(", ")}.`);
  }
  return builder(options);
}
