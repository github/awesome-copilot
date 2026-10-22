import { renderResourceMarkdown } from "./detail-page";
import { buildDetailToc } from "./detail-toc";
import { sanitizeHtml } from "./sanitize-html";

export function renderPluginReadme(
  markdown: string,
  urls?: { linkBaseUrl: string; imageBaseUrl: string },
  warn: (error: unknown) => void = console.warn,
): string {
  try {
    const { markdownHtml } = renderResourceMarkdown(markdown, urls);
    if (!markdownHtml.trim()) throw new Error("README rendered no content");
    return finalizePluginReadme(markdownHtml, urls, warn);
  } catch (error) {
    warn(error);
    return "";
  }
}

export function finalizePluginReadme(
  markdownHtml: string,
  urls?: { linkBaseUrl: string; imageBaseUrl: string },
  warn: (error: unknown) => void = console.warn,
): string {
  try {
    const { html } = buildDetailToc(markdownHtml);
    return sanitizeHtml(html, urls);
  } catch (error) {
    warn(error);
    return "";
  }
}
