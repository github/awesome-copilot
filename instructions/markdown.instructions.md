---
description: 'Markdown formatting aligned to the CommonMark specification (0.31.2)'
applyTo: '**/*.md'
---

# CommonMark Markdown

Apply these rules per the [CommonMark spec 0.31.2](https://spec.commonmark.org/0.31.2/) when writing or reviewing `.md` files. CommonMark spec for reference only. Do not download CommonMark spec.

## Preliminaries

- A line ends at a newline (`U+000A`), carriage return (`U+000D`), or end of file. A blank line contains only spaces or tabs.
- Tabs behave as 4-space tab stops for block structure but are not expanded in content.
- Replace `U+0000` with the replacement character `U+FFFD`.
- **Backslash escapes**: `\` before any ASCII punctuation character renders the literal character. Not recognized in code spans, code blocks, or autolinks.
- **Entity and numeric character references**: `&amp;`, `&#123;`, `&#x7B;` — valid HTML5 entities only. Not recognized in code spans or code blocks. Cannot replace structural characters.

## Leaf Blocks

- **Thematic breaks**: 3+ matching `-`, `_`, or `*` characters on a line with 0–3 spaces indent. Only spaces or tabs allowed on the line otherwise. Can interrupt a paragraph.
- **ATX headings**: 1–6 `#` characters followed by a space or end of line. Optional closing `#` sequence (preceded by a space). 0–3 spaces indent allowed.
- **Setext headings**: Text underlined with `=` (level 1) or `-` (level 2). Cannot interrupt a paragraph — blank line required after a preceding paragraph.
- **Indented code blocks**: Lines indented 4+ spaces. Cannot interrupt a paragraph. Content is literal text, not parsed as Markdown.
- **Fenced code blocks**: Open with 3+ backticks or tildes (do not mix). Closing fence must use same character with at least the same count. Info string after backtick fence cannot contain backticks. Specify language identifier after the opening fence. Content is literal text.
- **HTML blocks**: Seven types defined by start/end tag conditions. Types 1–5 end at their matching end pattern. Type 6 ends at a blank line. Type 7 cannot interrupt a paragraph and ends at a blank line.
- **Link reference definitions**: `[label]: destination "title"`. Case-insensitive label matching (Unicode case fold). First definition wins for duplicate labels. Cannot interrupt a paragraph.
- **Paragraphs**: Consecutive non-blank lines not interpretable as other block constructs. Leading spaces up to 3 are stripped.
- **Blank lines**: Ignored between blocks; determine whether a list is tight or loose.

## Container Blocks

- **Block quotes**: Lines prefixed with `>` (optionally followed by a space). Lazy continuation allowed for paragraph text only. A blank line separates consecutive block quotes.
- **List items**: Bullet markers (`-`, `+`, `*`) or ordered markers (1–9 digits + `.` or `)`). Content column determined by marker width + spaces to first non-whitespace (1–4 spaces after marker). Sublists must be indented to the content column. An ordered list interrupting a paragraph must start with `1`.
- **Lists**: Sequence of same-type list items. Changing bullet character or ordered delimiter starts a new list. A list is loose if any item is separated by a blank line.

## Inlines

- **Code spans**: Backtick-delimited inline code. Line endings convert to spaces. Leading and trailing space stripped when both present (unless content is all spaces). Backslash escapes are literal inside code spans.
- **Emphasis and strong emphasis**: `*`/`_` for `<em>`, `**`/`__` for `<strong>`. `_` is not allowed for intraword emphasis. Left-flanking / right-flanking delimiter run rules apply. Delimiter run length sum must not be a multiple of 3 when one delimiter can both open and close (unless both lengths are multiples of 3).
- **Links**: Inline `[text](url "title")` or reference `[text][label]` / `[text][]` / `[text]`. Link text may contain inlines but not other links. Destination in `<…>` allows spaces; without angle brackets, balanced parentheses allowed. No whitespace between link text and `(` or `[`.
- **Images**: `![alt](src "title")` — same syntax as links prefixed with `!`. Alt text is the plain-string content of the description.
- **Autolinks**: `<URI>` or `<email>` in angle brackets. Scheme must be 2–32 characters starting with an ASCII letter. Bare URLs are not auto-linked in CommonMark (requires angle brackets).
- **Raw HTML**: Open/close tags, comments (`<!--` … `-->`), processing instructions (`<?` … `?>`), declarations (`<!` … `>`), CDATA (`<![CDATA[` … `]]>`) are passed through as literal HTML.
- **Hard line breaks**: Two+ trailing spaces or `\` before a line ending. Not recognized in code spans or HTML tags. Does not work at end of a block.
- **Soft line breaks**: A line ending not preceded by two+ spaces or `\`. Rendered as a space in browsers.

## Validation Checklist

- [ ] ATX headings use 1–6 `#` followed by a space.
- [ ] Fenced code blocks specify a language identifier and use matching fence characters and counts.
- [ ] Backtick fence info strings do not contain backtick characters.
- [ ] Indented code blocks are preceded by a blank line (they cannot interrupt a paragraph).
- [ ] Emphasis uses `*` for intraword; `_` only at word boundaries.
- [ ] Links use `[text](url)` or reference syntax with no whitespace before `(` or `[`.
- [ ] Images include non-empty alt text.
- [ ] Autolinks use angle brackets (`<URL>`); bare URLs are not CommonMark autolinks.
- [ ] No unbalanced parentheses in bare link destinations (use `<…>` or escape).
- [ ] HTML block type 7 (custom/inline-level tags) is preceded by a blank line when following a paragraph.
