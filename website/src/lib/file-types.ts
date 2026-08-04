/**
 * Map a file name to a Shiki language id and a coarse "kind" used by the file
 * browser to decide how to render it (markdown prose, highlighted code, image,
 * or a plain fallback). Shared between the build-time FileBrowser component
 * and the client-side file-browser script, so both agree on languages.
 */

export type FileKind = "markdown" | "code" | "image" | "other";

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cs: "csharp",
  c: "c",
  cpp: "cpp",
  h: "c",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ps1: "powershell",
  json: "json",
  jsonc: "json",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  html: "html",
  css: "css",
  scss: "scss",
  xml: "xml",
  sql: "sql",
  dockerfile: "docker",
  md: "markdown",
  markdown: "markdown",
  txt: "text",
};

const CODE_LANGS = new Set<string>([
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "ruby",
  "go",
  "rust",
  "java",
  "csharp",
  "c",
  "cpp",
  "php",
  "swift",
  "kotlin",
  "bash",
  "powershell",
  "json",
  "yaml",
  "toml",
  "html",
  "css",
  "scss",
  "xml",
  "sql",
  "docker",
]);

const IMAGE_EXTS = new Set<string>([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "avif",
  "bmp",
  "ico",
]);

export interface FileMeta {
  ext: string;
  lang: string;
  kind: FileKind;
}

export function getFileMeta(name: string): FileMeta {
  const base = name.split("/").pop() ?? name;
  const ext =
    base.toLowerCase() === "dockerfile"
      ? "dockerfile"
      : (base.split(".").pop() ?? "").toLowerCase();
  const lang = EXT_LANG[ext] ?? "text";
  let kind: FileKind = "other";
  if (IMAGE_EXTS.has(ext)) kind = "image";
  else if (ext === "md" || ext === "markdown") kind = "markdown";
  else if (CODE_LANGS.has(lang)) kind = "code";
  return { ext, lang, kind };
}
