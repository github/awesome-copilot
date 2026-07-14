/**
 * Client behaviour for multi-file bundle detail pages (skills and hooks).
 *
 * Skills and hooks are multi-file bundles: there is no single-command CLI
 * install for hooks, and skills install with the GitHub CLI. This script wires
 * up the shared file browser (the primary file — SKILL.md or README.md — is
 * embedded at build time; other files are lazily fetched and rendered — markdown
 * via `marked`, code via a lazily-imported Shiki, images via their raw GitHub
 * URL, everything else as plain text), plus the "copy install command",
 * "Download ZIP", copy-file and Share actions. Deep links use the existing
 * `#file=<path>` hash convention.
 */
import { marked } from "marked";
import { enhanceMarkdownA11y } from "../../lib/markdown-a11y";
import { sanitizeHtml } from "../../lib/sanitize-html";
import {
  copyToClipboard,
  downloadZipBundle,
  escapeHtml,
  getRawGitHubUrl,
  isSafeRepoFilePath,
  showToast,
  type ZipDownloadFile,
} from "../utils";

interface CachedFile {
  html?: string;
  rawText?: string;
}

type RenderedFile = CachedFile & { html: string };

interface FileDescriptor {
  path: string;
  name: string;
  lang: string;
  kind: string;
}

function isImageKind(kind: string): boolean {
  return kind === "image";
}

function encodeRepoPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

function getSafeGitHubFileUrl(
  githubBase: string,
  filePath: string
): string | null {
  if (!isSafeRepoFilePath(filePath)) return null;

  try {
    const base = new URL(githubBase);
    if (base.protocol !== "https:" || base.hostname !== "github.com") return null;

    base.pathname = `${base.pathname.replace(/\/+$/, "")}/${encodeRepoPath(
      filePath
    )}`;
    base.search = "";
    base.hash = "";
    return base.toString();
  } catch {
    return null;
  }
}

let highlighterPromise: Promise<
  (code: string, lang: string) => Promise<string>
> | null = null;

/**
 * Lazily load Shiki and return a highlight helper. Falls back to plain,
 * escaped `<pre>` output if Shiki (or the requested language) is unavailable.
 */
function loadHighlighter() {
  highlighterPromise ??= import("shiki").then(({ codeToHtml }) => {
    return async (code: string, lang: string) => {
      try {
        const highlighted = await codeToHtml(code, {
          lang,
          themes: { light: "github-light", dark: "github-dark" },
        });
        // Shiki emits a scrollable <pre>; make it keyboard focusable.
        return highlighted.replace(
          /<pre(?![^>]*\btabindex=)/,
          '<pre tabindex="0"'
        );
      } catch {
        return `<pre tabindex="0" class="skill-file-plain"><code>${escapeHtml(code)}</code></pre>`;
      }
    };
  });
  return highlighterPromise;
}

function initFileBrowser(): void {
  const root = document.querySelector<HTMLElement>("[data-file-browser-page]");
  if (!root) return;

  const browser = root.querySelector<HTMLElement>("[data-file-browser]");
  const contentEl = root.querySelector<HTMLElement>("[data-file-content]");
  const statusEl = root.querySelector<HTMLElement>("[data-file-status]");
  const currentNameEl = root.querySelector<HTMLElement>(
    "[data-current-file-name]"
  );
  const fileSelect = root.querySelector<HTMLSelectElement>("[data-file-select]");
  const githubLink = root.querySelector<HTMLAnchorElement>("[data-file-github]");
  const primaryFilePath = browser?.dataset.primaryFile ?? "";
  const githubBase = browser?.dataset.githubBase ?? "";

  const cache = new Map<string, CachedFile>();
  let activePath = primaryFilePath;

  // Seed the cache with the primary file's raw source and its already-rendered
  // HTML. The server-rendered primary view has frontmatter stripped (gray-matter),
  // so caching the rendered HTML avoids re-parsing the raw (frontmatter-including)
  // source if the user navigates away and back to the primary file.
  if (contentEl) {
    const rawPrimary =
      root.querySelector<HTMLTextAreaElement>("[data-raw-markdown]")?.value ??
      "";
    cache.set(primaryFilePath, {
      rawText: rawPrimary,
      html: contentEl.innerHTML,
    });
  }

  // Build the canonical file list from the <select> options. Single-file
  // bundles have no select, so fall back to just the embedded primary file.
  const fileDescriptors: FileDescriptor[] = fileSelect
    ? Array.from(fileSelect.options).map((opt) => ({
        path: opt.value,
        name: opt.dataset.fileName ?? opt.value,
        lang: opt.dataset.fileLang ?? "text",
        kind: opt.dataset.fileKind ?? "other",
      }))
    : [
        {
          path: primaryFilePath,
          name: currentNameEl?.textContent?.trim() || primaryFilePath,
          lang: "markdown",
          kind: "markdown",
        },
      ];

  const setStatus = (message: string | null): void => {
    if (!statusEl) return;
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
  };

  const setActive = (path: string): void => {
    if (fileSelect && fileSelect.value !== path) fileSelect.value = path;
  };

  const showLoadError = (fileUrl: string | null): void => {
    contentEl?.replaceChildren();
    contentEl?.classList.remove("is-code");
    contentEl?.classList.remove("is-image");
    setStatus(null);
    if (!contentEl) return;

    const message = document.createElement("p");
    message.className = "detail-empty";
    message.append("Couldn't load this file.");

    if (fileUrl) {
      message.append(" ");
      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View it on GitHub";
      message.append(link, ".");
    }

    contentEl.append(message);
  };

  async function renderFile(
    path: string,
    name: string,
    lang: string,
    kind: string
  ): Promise<RenderedFile> {
    const cached = cache.get(path);
    if (cached?.html !== undefined) return cached as RenderedFile;

    if (isImageKind(kind)) {
      const imageUrl = getRawGitHubUrl(path);
      const entry: RenderedFile = {
        html: `<img class="skill-file-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`,
      };
      cache.set(path, entry);
      return entry;
    }

    let rawText = cached?.rawText;
    if (rawText === undefined) {
      setStatus("Loading…");
      const response = await fetch(getRawGitHubUrl(path));
      if (!response.ok) throw new Error(`Failed to load ${name}`);
      rawText = await response.text();
    }

    let html: string;
    if (kind === "markdown") {
      html = enhanceMarkdownA11y(
        sanitizeHtml(marked.parse(rawText, { async: false }) as string)
      );
    } else if (kind === "code") {
      const highlight = await loadHighlighter();
      html = await highlight(rawText, lang);
    } else {
      html = `<pre tabindex="0" class="skill-file-plain"><code>${escapeHtml(rawText)}</code></pre>`;
    }

    const entry: RenderedFile = { html, rawText };
    cache.set(path, entry);
    return entry;
  }

  async function selectFile(
    path: string,
    name: string,
    lang: string,
    kind: string,
    updateHash = true
  ): Promise<void> {
    if (!contentEl) return;
    const fileUrl = githubBase ? getSafeGitHubFileUrl(githubBase, path) : null;
    if (!isSafeRepoFilePath(path)) {
      showLoadError(null);
      return;
    }

    activePath = path;
    setActive(path);
    if (currentNameEl) currentNameEl.textContent = name;
    if (githubLink) githubLink.href = fileUrl ?? "#";

    try {
      const entry = await renderFile(path, name, lang, kind);
      contentEl.innerHTML = entry.html;
      contentEl.classList.toggle("is-code", kind === "code");
      contentEl.classList.toggle("is-image", isImageKind(kind));
      setStatus(null);
    } catch {
      showLoadError(fileUrl);
    }

    if (updateHash) {
      const newHash = `#file=${encodeURIComponent(path)}`;
      if (window.location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    }
  }

  // --- File selection ---
  fileSelect?.addEventListener("change", () => {
    const opt = fileSelect.selectedOptions[0];
    if (!opt) return;
    const path = opt.value;
    if (!path || path === activePath) return;
    void selectFile(
      path,
      opt.dataset.fileName ?? path,
      opt.dataset.fileLang ?? "text",
      opt.dataset.fileKind ?? "other"
    );
  });

  // --- Copy current file contents ---
  root
    .querySelector<HTMLButtonElement>("[data-action='copy-file']")
    ?.addEventListener("click", async () => {
      const activeDescriptor = fileDescriptors.find((d) => d.path === activePath);
      if (activeDescriptor && isImageKind(activeDescriptor.kind)) {
        showToast("Images can't be copied as text", "error");
        return;
      }

      let entry = cache.get(activePath);
      if (entry?.rawText === undefined) {
        try {
          const response = await fetch(getRawGitHubUrl(activePath));
          if (response.ok) {
            const rawText = await response.text();
            entry = { ...entry, rawText };
            cache.set(activePath, entry);
          }
        } catch {
          /* handled below */
        }
      }
      if (entry?.rawText === undefined) {
        showToast("Nothing to copy", "error");
        return;
      }
      const success = await copyToClipboard(entry.rawText);
      showToast(
        success ? "File copied!" : "Failed to copy file",
        success ? "success" : "error"
      );
    });

  // --- Copy install command ---
  const installBlock = root.querySelector<HTMLElement>("[data-install-command]");
  root
    .querySelector<HTMLButtonElement>("[data-action='copy-install']")
    ?.addEventListener("click", async () => {
      const command = installBlock?.dataset.installCommand ?? "";
      if (!command) return;
      const success = await copyToClipboard(command);
      showToast(
        success ? "Install command copied!" : "Failed to copy",
        success ? "success" : "error"
      );
    });

  // --- Download ZIP bundle ---
  root
    .querySelector<HTMLButtonElement>("[data-action='download-zip']")
    ?.addEventListener("click", async (event) => {
      const btn = event.currentTarget as HTMLButtonElement;
      const bundleId = root.dataset.bundleId ?? "bundle";
      const files: ZipDownloadFile[] = fileDescriptors.map((d) => ({
        name: d.name,
        path: d.path,
      }));
      if (files.length === 0) {
        showToast("No files found for this item.", "error");
        return;
      }

      const originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Preparing…";
      try {
        await downloadZipBundle(bundleId, files);
        showToast("Download started!", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Download failed.";
        showToast(message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    });

  // --- Share (deep link to the active file) ---
  root
    .querySelector<HTMLButtonElement>("[data-action='share']")
    ?.addEventListener("click", async () => {
      const url = `${window.location.origin}${window.location.pathname}#file=${encodeURIComponent(
        activePath
      )}`;
      const success = await copyToClipboard(url);
      showToast(
        success ? "Link copied!" : "Failed to copy link",
        success ? "success" : "error"
      );
    });

  // --- Honour a #file= deep link (on load and on later hash navigation) ---
  const selectFromHash = (updateHash: boolean): void => {
    const hashMatch = window.location.hash.match(/^#file=(.+)$/);
    if (!hashMatch) return;
    let wanted: string | undefined;
    try {
      wanted = decodeURIComponent(hashMatch[1]);
    } catch {
      wanted = undefined;
    }
    const desc = wanted
      ? fileDescriptors.find((d) => d.path === wanted)
      : undefined;
    if (desc && wanted !== activePath) {
      void selectFile(desc.path, desc.name, desc.lang, desc.kind, updateHash);
    }
  };

  selectFromHash(false);

  // React to same-page hash changes (address-bar edits, in-page anchor links,
  // and browser back/forward navigation between shared #file= links).
  window.addEventListener("hashchange", () => {
    selectFromHash(false);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFileBrowser, {
    once: true,
  });
} else {
  initFileBrowser();
}
