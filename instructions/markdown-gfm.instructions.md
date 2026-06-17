---
description: 'Markdown formatting for GitHub-flavored markdown (GFM) files'
applyTo: '**/*.md'
---

# GitHub Flavored Markdown (GFM)

Apply these rules per the [GFM spec](https://github.github.com/gfm/) when writing or reviewing `.md` files. GFM is a strict superset of CommonMark. GFM spec for reference only. Do not download GFM Spec.

## Preliminaries

- A line ends at a newline (`U+000A`), carriage return (`U+000D`), or end of file. A blank line contains only spaces or tabs.
- Tabs behave as 4-space tab stops for block structure but are not expanded in content.
- Replace `U+0000` with the replacement character `U+FFFD`.

## Leaf Blocks

- **Thematic breaks**: 3+ matching `-`, `_`, or `*` characters on a line with 0–3 spaces indent. No other characters on the line. Can interrupt a paragraph.
- **ATX headings**: 1–6 `#` characters followed by a space or end of line. Optional closing `#` sequence (preceded by a space). 0–3 spaces indent allowed.
- **Setext headings**: Text underlined with `=` (level 1) or `-` (level 2). Cannot interrupt a paragraph — blank line required after a preceding paragraph.
- **Indented code blocks**: Lines indented 4+ spaces. Cannot interrupt a paragraph. Content is literal text, not parsed as Markdown.
- **Fenced code blocks**: Open with 3+ backticks or tildes (do not mix). Closing fence must use same character with at least the same count. Specify language identifier after the opening fence. Content is literal text.
- **HTML blocks**: Seven types defined by start/end tag conditions. Types 1–6 can interrupt paragraphs; type 7 cannot. Content is passed through as raw HTML.
  - Type 1: `<script>`, `<pre>`, or `<style>` (case-insensitive) — ends at matching closing tag.
  - Type 2: `<!--` comment — ends at `-->`.
  - Type 3: `<?` processing instruction — ends at `?>`.
  - Type 4: `<!` + uppercase letter (e.g., `<!DOCTYPE>`) — ends at `>`.
  - Type 5: `<![CDATA[` — ends at `]]>`.
  - Type 6: Block-level HTML tags (`<div>`, `<table>`, `<p>`, `<h1>`–`<h6>`, `<ul>`, `<ol>`, `<section>`, etc.) — ends at a blank line.
  - Type 7: Any other complete open or closing tag on its own line — ends at a blank line. Cannot interrupt a paragraph.
- **Link reference definitions**: `[label]: destination "title"`. Case-insensitive label matching. First definition wins for duplicate labels. Cannot interrupt a paragraph.
- **Paragraphs**: Consecutive non-blank lines not interpretable as other block constructs. Leading spaces up to 3 are stripped.
- **Blank lines**: Ignored between blocks; determine whether a list is tight or loose.
- **Tables** *(extension)*: Header row, delimiter row (`---`, `:---:`, `---:`), zero or more data rows. Delimit cells with `|`. Escape literal pipe as `\|`. Header and delimiter must have matching column count. Broken at first blank line or other block-level structure.

## Container Blocks

- **Block quotes**: Lines prefixed with `>` (optionally followed by a space). Lazy continuation allowed for paragraph text only. A blank line separates consecutive block quotes.
- **List items**: Bullet markers (`-`, `+`, `*`) or ordered markers (1–9 digits + `.` or `)`). Content column determined by marker width + spaces to first non-whitespace. Sublists must be indented to the content column. An ordered list interrupting a paragraph must start with `1`.
- **Task list items** *(extension)*: `- [ ]` (unchecked) or `- [x]` (checked) at the start of a list item paragraph. Space between `-` and `[` is required. May be nested.
- **Lists**: Sequence of same-type list items. Changing bullet character or ordered delimiter starts a new list. A list is loose if any item is separated by a blank line.

## Inlines

- **Backslash escapes**: `\` before any ASCII punctuation character renders the literal character. Not recognized in code spans, code blocks, or autolinks.
- **Entity and numeric character references**: `&amp;`, `&#123;`, `&#x7B;` — valid HTML5 entities. Not recognized in code spans or code blocks. Cannot replace structural characters.
- **Code spans**: Backtick-delimited inline code. Line endings convert to spaces. Leading and trailing space stripped when both present. Backslash escapes are literal inside code spans.
- **Emphasis and strong emphasis**: `*`/`_` for `<em>`, `**`/`__` for `<strong>`. `_` is not allowed for intraword emphasis. Left-flanking / right-flanking delimiter run rules apply. Delimiter run length sum must not be a multiple of 3 when one delimiter can both open and close (unless both lengths are multiples of 3).
- **Strikethrough** *(extension)*: `~~text~~` — one or two tildes. Does not span across paragraphs. Three or more tildes do not create strikethrough.
- **Links**: Inline `[text](url "title")` or reference `[text][label]` / `[text][]` / `[text]`. Link text may contain inlines but not other links. Destination in `<…>` allows spaces. No whitespace between link text and `(` or `[`.
- **Images**: `![alt](src "title")` — same syntax as links prefixed with `!`. Alt text is the plain-string content of the description.
- **Autolinks**: `<URI>` or `<email>` in angle brackets. Scheme must be 2–32 characters starting with an ASCII letter.
- **Autolinks** *(extension)*: Bare `http://`, `https://`, `www.` URLs and bare email addresses auto-link without angle brackets. Trailing punctuation excluded; parentheses balanced.
- **Raw HTML**: Open/close tags, comments (`<!-- -->`), processing instructions (`<? ?>`), declarations (`<!…>`), CDATA (`<![CDATA[…]]>`) are passed through.
- **Disallowed raw HTML** *(extension)*: `<title>`, `<textarea>`, `<style>`, `<xmp>`, `<iframe>`, `<noembed>`, `<noframes>`, `<script>`, `<plaintext>` have their leading `<` replaced with `&lt;`.
- **Hard line breaks**: Two+ trailing spaces or `\` before a line ending. Not recognized in code spans or HTML tags.
- **Soft line breaks**: A line ending not preceded by two+ spaces or `\`. Rendered as a space in browsers.

## Validation Checklist

- [ ] ATX headings use 1–6 `#` followed by a space.
- [ ] Fenced code blocks specify a language identifier and use matching fence characters and counts.
- [ ] Tables include header and delimiter rows with matching column count. Alignment set with `:` in the delimiter.
- [ ] Task list items have a space between `-` and `[ ]` or `[x]`.
- [ ] Emphasis uses `*` for intraword; `_` only at word boundaries.
- [ ] Strikethrough uses exactly `~~` (not 3+ tildes).
- [ ] Links use `[text](url)` or reference syntax with no whitespace before `(` or `[`.
- [ ] No disallowed raw HTML tags (`<script>`, `<style>`, `<title>`, `<textarea>`, `<xmp>`, `<iframe>`, `<noembed>`, `<noframes>`, `<plaintext>`).
