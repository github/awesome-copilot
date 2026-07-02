/**
 * Lightweight YAML front matter parser.
 *
 * Splits a Markdown (or similar) document into its front matter block and body.
 * Used by the file-viewer modal to strip YAML before passing Markdown to the renderer.
 *
 * Regex breakdown for the front matter pattern:
 *   ^---\r?\n        opening fence (‘---’), handles both LF and CRLF line endings
 *   ([\s\S]*?)        capture group 1: front matter content (non-greedy to stop at the
 *                    first closing fence rather than consuming the whole file)
 *   \r?\n---\r?\n?    closing fence, with an optional trailing newline
 *   ([\s\S]*)$        capture group 2: the document body that follows
 */
export interface ParsedFrontmatter {
  frontmatter: string | null;
  body: string;
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  return { frontmatter: match[1].trim(), body: match[2] };
}
