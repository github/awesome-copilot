import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileDirectoryIcon,
  MarkGithubIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import React from "react";

import { Button, Text } from "@primer/react-brand";

import {
  DetailChassis,
  type DetailSibling,
  type DetailTocItem,
} from "./DetailChassis";
import { ResourceMeta } from "./ResourceMeta";
import {
  SyntaxHighlightedCode,
  detectCodeLanguage,
  type CodeLanguage,
} from "./SyntaxHighlightedCode";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/dotnet-upgrade.module.css";
import fileStyles from "./styles/skill-files.module.css";

export type SkillFile = {
  /** Repo-relative path, e.g. `skills/my-skill/scripts/scan.py`. */
  path: string;
  /** Path relative to the skill folder, e.g. `scripts/scan.py`. */
  name: string;
  size?: number;
};

export type SkillDetailItem = {
  id: string;
  name?: string;
  title: string;
  description?: string;
  path: string;
  skillFile: string;
  files?: SkillFile[];
  assets?: string[];
  hasAssets?: boolean;
  assetCount?: number;
};

export type SkillDetailProps = {
  item: SkillDetailItem;
  /** Rendered, sanitized SKILL.md body with heading ids already stamped. */
  markdownHtml: string;
  toc: DetailTocItem[];
  /** GitHub tree URL for the skill folder. */
  githubUrl: string;
  /** `https://github.com/.../blob/main` — per-file links are built from this. */
  githubBlobBase: string;
  /** `https://raw.githubusercontent.com/.../main` — lazy file fetches. */
  rawBase: string;
  /** `gh skills install …` — skills have no VS Code install URI. */
  installCommand: string;
  rawMarkdown: string;
  lastUpdated?: string | null;
  previous?: DetailSibling;
  next?: DetailSibling;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

type FileKind = "markdown" | "code" | "image" | "text";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "avif",
]);

const CODE_LANGUAGES: Record<string, CodeLanguage> = {
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  ts: "tsx",
  tsx: "tsx",
  js: "tsx",
  jsx: "tsx",
  mjs: "tsx",
  cjs: "tsx",
  cs: "tsx",
  py: "bash",
  sh: "bash",
  bash: "bash",
  ps1: "bash",
  html: "markup",
  xml: "markup",
  svg: "markup",
  csproj: "markup",
  props: "markup",
  targets: "markup",
  bicep: "bash",
};

function extensionOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function kindOf(path: string): FileKind {
  const ext = extensionOf(path);
  if (IMAGE_EXTENSIONS.has(ext) && ext !== "svg") return "image";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext in CODE_LANGUAGES) return "code";
  return "text";
}

function formatSize(bytes?: number): string | null {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function encodeRepoPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

/**
 * Skill detail route.
 *
 * A skill is a folder, not a file, so the content region is a file switcher
 * rather than a single article: `SKILL.md` is server-rendered into the page and
 * every bundled asset is lazily fetched from raw.githubusercontent.com on first
 * selection, then cached. Markdown assets render as rich markdown, recognised
 * source files are syntax highlighted with the prototype's highlighter, images
 * render inline, and anything else falls back to a monospace block.
 *
 * The `#file=<path>` deep-link convention from the previous file browser is
 * preserved so existing shared links keep working.
 */
export function SkillDetail({
  item,
  markdownHtml,
  toc,
  githubUrl,
  githubBlobBase,
  rawBase,
  installCommand,
  rawMarkdown,
  lastUpdated,
  previous,
  next,
  searchIndex,
  contributorsTotal,
}: SkillDetailProps) {
  const primaryPath = item.skillFile;
  const primaryName = primaryPath.split("/").pop() ?? "SKILL.md";

  // SKILL.md always leads; the remaining bundle files follow in data order.
  const files = React.useMemo<SkillFile[]>(() => {
    const all = item.files ?? [];
    const primary = all.find((file) => file.path === primaryPath) ?? {
      path: primaryPath,
      name: primaryName,
    };
    return [primary, ...all.filter((file) => file.path !== primaryPath)];
  }, [item.files, primaryPath, primaryName]);

  const [activePath, setActivePath] = React.useState(primaryPath);
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [copied, setCopied] = React.useState(false);

  const active =
    files.find((file) => file.path === activePath) ?? files[0] ?? null;
  const isPrimary = active?.path === primaryPath;
  const kind = active ? kindOf(active.path) : "text";

  // Honour `#file=<path>` on load and on later hash navigation.
  React.useEffect(() => {
    const fromHash = () => {
      const match = /^#file=(.+)$/.exec(window.location.hash);
      if (!match) return;
      let wanted: string | undefined;
      try {
        wanted = decodeURIComponent(match[1]);
      } catch {
        return;
      }
      if (files.some((file) => file.path === wanted)) setActivePath(wanted);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [files]);

  // Lazily fetch the selected asset. SKILL.md and images never need a fetch.
  React.useEffect(() => {
    if (!active || isPrimary || kind === "image") return;
    if (contents[active.path] !== undefined) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    fetch(`${rawBase}/${encodeRepoPath(active.path)}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        setContents((current) => ({ ...current, [active.path]: text }));
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [active, isPrimary, kind, rawBase, contents]);

  const selectFile = React.useCallback((path: string) => {
    setActivePath(path);
    const hash = `#file=${encodeURIComponent(path)}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }, []);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopyInstall = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  }, [installCommand]);

  const activeGithubUrl = active
    ? `${githubBlobBase}/${encodeRepoPath(active.path)}`
    : githubUrl;
  const activeRawUrl = active
    ? `${rawBase}/${encodeRepoPath(active.path)}`
    : undefined;

  const install = (
    <>
      <Button
        variant="primary"
        onClick={handleCopyInstall}
        leadingVisual={copied ? CheckIcon : CopyIcon}
      >
        {copied ? "Copied" : "Copy install command"}
      </Button>
      <Button
        as="a"
        href={githubUrl}
        variant="secondary"
        className={styles.iconButton}
        aria-label={`View the ${item.title} skill on GitHub`}
      >
        <MarkGithubIcon size={16} />
      </Button>
    </>
  );

  const fileCount = files.length;
  const assetCount = item.assetCount ?? Math.max(0, fileCount - 1);

  return (
    <DetailChassis
      title={item.title}
      description={item.description}
      breadcrumbs={[
        { label: "Skills", href: pageHref("skills") },
        { label: item.title },
      ]}
      install={install}
      heroExtras={
        <div className={styles.codeBlockWrap}>
          <span className={styles.codeLabel}>Install with the GitHub CLI</span>
          <SyntaxHighlightedCode
            className={styles.codeBlock}
            code={installCommand}
            language="bash"
            lineClassName={styles.codeLine}
          />
        </div>
      }
      /* Anchors only exist while SKILL.md is on screen. */
      toc={isPrimary ? toc : []}
      sidebar={
        <ResourceMeta
          kicker="Skill details"
          groups={[
            {
              label: "Files",
              items: [`${fileCount} file${fileCount === 1 ? "" : "s"}`],
            },
            {
              label: "Bundled assets",
              items: assetCount
                ? [`${assetCount} asset${assetCount === 1 ? "" : "s"}`]
                : [],
            },
            { label: "Folder", items: [item.path] },
          ]}
          lastUpdated={lastUpdated}
          sourceUrl={githubUrl}
        />
      }
      previous={previous}
      next={next}
      currentPage="skills"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      <section className={styles.articleSection}>
        {fileCount > 1 ? (
          <>
            <span className={styles.codeLabel}>
              <FileDirectoryIcon size={16} /> Files in this skill
            </span>
            <ul className={fileStyles.fileTabs} aria-label="Files in this skill">
              {files.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    className={clsx(
                      fileStyles.fileTab,
                      file.path === activePath && fileStyles.fileTabActive,
                    )}
                    aria-current={
                      file.path === activePath ? "true" : undefined
                    }
                    onClick={() => selectFile(file.path)}
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {active ? (
          <div className={fileStyles.fileBar}>
            <span className={fileStyles.filePath}>
              {active.name}
              {formatSize(active.size) ? ` · ${formatSize(active.size)}` : ""}
            </span>
            <div className={fileStyles.fileActions}>
              <Button
                as="a"
                href={activeGithubUrl}
                variant="secondary"
                size="small"
                className={styles.iconButton}
                aria-label={`View ${active.name} on GitHub`}
              >
                <MarkGithubIcon size={16} />
              </Button>
              {activeRawUrl ? (
                <Button
                  as="a"
                  href={activeRawUrl}
                  variant="secondary"
                  size="small"
                  download
                  className={styles.iconButton}
                  aria-label={`Download ${active.name}`}
                >
                  <DownloadIcon size={16} />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <FileView
          active={active}
          isPrimary={isPrimary}
          kind={kind}
          markdownHtml={markdownHtml}
          rawMarkdown={rawMarkdown}
          text={active ? contents[active.path] : undefined}
          status={status}
          rawBase={rawBase}
          githubUrl={activeGithubUrl}
        />
      </section>
    </DetailChassis>
  );
}

function FileView({
  active,
  isPrimary,
  kind,
  markdownHtml,
  rawMarkdown,
  text,
  status,
  rawBase,
  githubUrl,
}: {
  active: SkillFile | null;
  isPrimary: boolean;
  kind: FileKind;
  markdownHtml: string;
  rawMarkdown: string;
  text?: string;
  status: "idle" | "loading" | "error";
  rawBase: string;
  githubUrl: string;
}) {
  const [markdown, setMarkdown] = React.useState<string | null>(null);

  // Non-primary markdown assets are parsed in the browser; `marked` and the
  // sanitizer are only pulled in when such a file is actually opened.
  React.useEffect(() => {
    if (isPrimary || kind !== "markdown" || text === undefined) {
      setMarkdown(null);
      return;
    }
    let cancelled = false;
    void Promise.all([
      import("marked"),
      import("../../lib/sanitize-html"),
      import("../../lib/markdown-a11y"),
    ]).then(([{ marked }, { sanitizeHtml }, { enhanceMarkdownA11y }]) => {
      if (cancelled) return;
      setMarkdown(
        enhanceMarkdownA11y(
          sanitizeHtml(marked.parse(text, { async: false }) as string),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isPrimary, kind, text]);

  if (!active) return null;

  if (isPrimary) {
    return markdownHtml ? (
      <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
    ) : (
      <pre tabIndex={0} className={styles.codeBlock}>
        <code>{rawMarkdown}</code>
      </pre>
    );
  }

  if (kind === "image") {
    return (
      <img
        className={fileStyles.fileImage}
        src={`${rawBase}/${encodeRepoPath(active.path)}`}
        alt={active.name}
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (status === "loading") {
    return (
      <Text as="p" size="200" variant="muted">
        Loading {active.name}…
      </Text>
    );
  }

  if (status === "error" || text === undefined) {
    return (
      <Text as="p" size="200" variant="muted">
        Couldn&apos;t load this file. <a href={githubUrl}>View it on GitHub</a>.
      </Text>
    );
  }

  if (kind === "markdown") {
    return markdown ? (
      <div dangerouslySetInnerHTML={{ __html: markdown }} />
    ) : (
      <Text as="p" size="200" variant="muted">
        Rendering {active.name}…
      </Text>
    );
  }

  if (kind === "code") {
    const language =
      CODE_LANGUAGES[extensionOf(active.path)] ?? detectCodeLanguage(text);
    return (
      <SyntaxHighlightedCode
        className={styles.codeBlock}
        code={text}
        language={language}
        lineClassName={styles.codeLine}
      />
    );
  }

  return (
    <pre tabIndex={0} className={styles.codeBlock}>
      <code>{text}</code>
    </pre>
  );
}
