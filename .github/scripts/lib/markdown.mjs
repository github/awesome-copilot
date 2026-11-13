// Leave fenced commands, prompts, and inline sample paths unchanged.
export function mapMarkdownProse(markdown, transform) {
  let fence;
  return markdown.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return line;
    }
    if (fence) return line;
    const code = [];
    const protectedLine = line.replace(/(`+)[\s\S]*?\1/g, (match) => {
      code.push(match);
      return `\u0000${code.length - 1}\u0000`;
    });
    return transform(protectedLine).replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)]);
  }).join("");
}

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
