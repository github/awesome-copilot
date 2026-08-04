export function inlineCode(value) {
  const collapsed = String(value).replace(/\s+/g, " ").trim();
  const content = collapsed.length > 80 ? `${collapsed.slice(0, 77)}...` : collapsed;
  const longestBacktickRun = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(longestBacktickRun + 1);
  const pad = content.length === 0 || content.startsWith("`") || content.endsWith("`") ? " " : "";

  // These values are rendered verbatim into Markdown bot comments; using a fence
  // longer than any backtick run in the content prevents closing the code span.
  return `${fence}${pad}${content}${pad}${fence}`;
}
