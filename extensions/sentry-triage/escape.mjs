// Shared HTML-escaping helpers. All Sentry / MCP / agent-derived values are
// interpolated into HTML string templates, so every dynamic text or attribute
// value MUST pass through here before it reaches the webview.

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape a value for use as HTML text or a double/single-quoted attribute. */
export function escapeHtml(value) {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch])
}

/**
 * Return a safe href: only http(s) URLs are allowed through, everything else
 * (javascript:, data:, malformed, etc.) collapses to '#'. The result is still
 * attribute-escaped for embedding.
 */
export function safeHref(value) {
  if (value == null) return '#'
  const raw = String(value).trim()
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return escapeHtml(url.href)
    }
  } catch {
    // not an absolute URL — fall through
  }
  return '#'
}

/**
 * Serialize a value as JSON safe to embed inside an inline <script> block.
 * Escapes the characters that can terminate the script element or break the
 * JS string context (`<`, `>`, U+2028, U+2029).
 */
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Neutralize a piece of untrusted, Sentry-derived text before it is embedded in
 * an agent prompt that can create issues / spawn code-writing sessions. A
 * crafted Sentry title or message is prompt-injection input, so we:
 *   - collapse newlines and control characters to spaces, so it cannot introduce
 *     its own instruction lines, fenced blocks, or fake tool directives;
 *   - strip Markdown/emphasis and backtick fences that could restructure the
 *     prompt;
 *   - cap the length so a huge payload can't bury the real instructions.
 * This is defense-in-depth on top of treating the values as labeled data — not a
 * substitute for keeping untrusted content out of executable instructions.
 */
export function sanitizeForPrompt(value, maxLen = 300) {
  let text = value == null ? '' : String(value)
  text = text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
  text = text.replace(/[`]+/g, "'")
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length > maxLen) text = text.slice(0, maxLen - 1).trimEnd() + '…'
  return text
}
