import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import matter from "gray-matter";

/**
 * Build-time helpers shared by the resource detail pages
 * (src/pages/agent/[id].astro, src/pages/instruction/[id].astro, ...).
 *
 * This module is intentionally free of any DOM/browser dependencies so it can
 * run in Astro frontmatter at build time (unlike src/scripts/utils.ts, which is
 * client-side).
 */

const RAW_BASE =
  "https://raw.githubusercontent.com/github/awesome-copilot/main";
const GITHUB_BASE = "https://github.com/github/awesome-copilot/blob/main";

// Per resource-type VS Code install configuration.
const INSTALL_CONFIG = {
  agent: {
    command: "chat-agent",
    baseUrl: "https://aka.ms/awesome-copilot/install/agent",
  },
  instruction: {
    command: "chat-instructions",
    baseUrl: "https://aka.ms/awesome-copilot/install/instructions",
  },
} as const satisfies Record<string, { command: string; baseUrl: string }>;

export type ResourceType = keyof typeof INSTALL_CONFIG;

export interface DetailPageInput {
  path: string;
  lastUpdated?: string | null;
}

export interface DetailPageData {
  vscodeUrl: string;
  insidersUrl: string;
  githubUrl: string;
  markdownHtml: string;
  frontmatterText: string;
  rawMarkdown: string;
  lastUpdated: string | null;
}

// Repo root, resolved relative to this module (website/src/lib/ -> repo root).
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function buildInstallUrl(
  filePath: string,
  type: ResourceType,
  insiders: boolean
): string {
  const { command, baseUrl } = INSTALL_CONFIG[type];
  const rawUrl = `${RAW_BASE}/${filePath}`;
  const editor = insiders ? "vscode-insiders" : "vscode";
  const innerUrl = `${editor}:${command}/install?url=${encodeURIComponent(rawUrl)}`;
  return `${baseUrl}?url=${encodeURIComponent(innerUrl)}`;
}

function formatLastUpdated(lastUpdated?: string | null): string | null {
  return lastUpdated
    ? new Date(lastUpdated).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

/**
 * Read a resource's markdown file at build time and return its rendered HTML,
 * trimmed frontmatter block, and the raw file contents.
 */
export function readResourceMarkdown(filePath: string): {
  markdownHtml: string;
  frontmatterText: string;
  rawMarkdown: string;
} {
  let markdownHtml = "";
  let frontmatterText = "";
  let rawMarkdown = "";
  try {
    const raw = fs.readFileSync(path.join(repoRoot, filePath), "utf-8");
    rawMarkdown = raw;
    const parsed = matter(raw);
    frontmatterText = parsed.matter?.trim() ?? "";
    markdownHtml = marked.parse(parsed.content, { async: false }) as string;
  } catch {
    markdownHtml = "";
  }
  return { markdownHtml, frontmatterText, rawMarkdown };
}

/**
 * Build every piece of shared data a resource detail page needs: install URLs,
 * the GitHub source URL, rendered/raw markdown, and the formatted update date.
 */
export function loadDetailPage(
  item: DetailPageInput,
  type: ResourceType
): DetailPageData {
  return {
    vscodeUrl: buildInstallUrl(item.path, type, false),
    insidersUrl: buildInstallUrl(item.path, type, true),
    githubUrl: `${GITHUB_BASE}/${item.path}`,
    ...readResourceMarkdown(item.path),
    lastUpdated: formatLastUpdated(item.lastUpdated),
  };
}
