/**
 * Accessibility post-processing for marked-generated markdown HTML.
 *
 * axe flags two issues on rendered markdown that we fix here rather than in the
 * source content:
 *  - `scrollable-region-focusable`: <pre> and <table> blocks can overflow on the
 *    x-axis, so they must be keyboard focusable to let keyboard users scroll them.
 *  - `label`: GitHub-style task-list checkboxes (`- [ ]` / `- [x]`) render as bare
 *    disabled <input type="checkbox"> elements with no accessible name.
 *
 * This module is pure (no DOM or node deps) so it can run both at build time
 * (src/lib/detail-page.ts) and on the client (src/scripts/pages/file-browser.ts).
 */
export function enhanceMarkdownA11y(html: string): string {
  if (!html) return html;
  let out = html;

  // Make scrollable code/table blocks keyboard focusable.
  out = out.replace(/<pre(?![^>]*\btabindex=)/g, '<pre tabindex="0"');
  out = out.replace(/<table(?![^>]*\btabindex=)/g, '<table tabindex="0"');

  // Give task-list checkboxes an accessible name based on their checked state.
  out = out.replace(
    /<input\b([^>]*\btype="checkbox"[^>]*)>/g,
    (match, attrs) => {
      if (/\baria-label=/.test(attrs)) return match;
      const label = /\bchecked\b/.test(attrs)
        ? "Completed task"
        : "Incomplete task";
      return `<input${attrs} aria-label="${label}">`;
    }
  );

  return out;
}
