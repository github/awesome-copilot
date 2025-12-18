import { Frontmatter } from '../types';

export function parseFrontmatter(content: string): { frontmatter?: Frontmatter; body: string } {
  const lines = content.split('\n');
  if (lines.length < 2 || lines[0].trim() !== '---') {
    return { body: content };
  }

  const endIndex = lines.slice(1).findIndex(line => line.trim() === '---');
  if (endIndex === -1) {
    return { body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex + 1);
  const body = lines.slice(endIndex + 2).join('\n');

  // If no actual frontmatter content between delimiters, return empty object
  if (frontmatterLines.length === 0 || frontmatterLines.every(line => line.trim() === '')) {
    return { frontmatter: {}, body };
  }

  try {
    const frontmatter: Frontmatter = {};
    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
    return { frontmatter, body };
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error);
    return { body: content };
  }
}
