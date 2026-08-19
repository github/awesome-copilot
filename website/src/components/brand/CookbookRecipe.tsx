import { DownloadIcon, FileDirectoryIcon, MarkGithubIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import React from "react";

import { Button, Text } from "@primer/react-brand";

import { DetailChassis, type DetailTocItem } from "./DetailChassis";
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

export type RecipeFile = {
  /** Repo-relative path, e.g. `cookbook/copilot-sdk/nodejs/error-handling.md`. */
  path: string;
  /** File name shown on the tab. */
  name: string;
};

export type CookbookRecipeProps = {
  cookbookName: string;
  recipeName: string;
  recipeDescription: string;
  languageName: string;
  languageIcon?: string;
  tags: string[];
  files: RecipeFile[];
  /** Path of the file rendered server-side (the recipe's markdown doc). */
  primaryPath: string;
  /** Rendered, sanitized markdown for `primaryPath`. */
  markdownHtml: string;
  rawMarkdown: string;
  toc: DetailTocItem[];
  /** `https://github.com/.../blob/main` — per-file links are built from this. */
  githubBlobBase: string;
  /** `https://raw.githubusercontent.com/.../main` — lazy file fetches. */
  rawBase: string;
  lastUpdated?: string | null;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

type FileKind = "markdown" | "code" | "text";

const CODE_LANGUAGES: Record<string, CodeLanguage> = {
  ts: "tsx",
  tsx: "tsx",
  js: "tsx",
  jsx: "tsx",
  mjs: "tsx",
  cs: "tsx",
  go: "tsx",
  java: "tsx",
  py: "bash",
  sh: "bash",
  bash: "bash",
  ps1: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  html: "markup",
  xml: "markup",
};

function extensionOf(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function kindOf(path: string): FileKind {
  const ext = extensionOf(path);
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext in CODE_LANGUAGES) return "code";
  return "text";
}

function encodeRepoPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

/**
 * Cookbook recipe detail route.
 *
 * A recipe has one doc and (usually) one runnable example per language, so the
 * content region is the same file switcher used by skills: the doc is rendered
 * at build time, the example is fetched from raw.githubusercontent.com on first
 * selection and then cached. The `#file=<path>` deep-link convention from the
 * previous file browser is preserved so existing shared links keep working.
 */
export function CookbookRecipe({
  cookbookName,
  recipeName,
  recipeDescription,
  languageName,
  languageIcon,
  tags,
  files,
  primaryPath,
  markdownHtml,
  rawMarkdown,
  toc,
  githubBlobBase,
  rawBase,
  lastUpdated,
  searchIndex,
  contributorsTotal,
}: CookbookRecipeProps) {
  const [activePath, setActivePath] = React.useState(primaryPath);
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );

  const active = files.find((file) => file.path === activePath) ?? files[0];
  const isPrimary = active?.path === primaryPath;
  const kind = active ? kindOf(active.path) : "text";

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

  React.useEffect(() => {
    if (!active || isPrimary) return;
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
  }, [active, isPrimary, rawBase, contents]);

  const selectFile = React.useCallback((path: string) => {
    setActivePath(path);
    const hash = `#file=${encodeURIComponent(path)}`;
    if (window.location.hash !== hash) history.replaceState(null, "", hash);
  }, []);

  const activeGithubUrl = active
    ? `${githubBlobBase}/${encodeRepoPath(active.path)}`
    : `${githubBlobBase}/${encodeRepoPath(primaryPath)}`;
  const activeRawUrl = active
    ? `${rawBase}/${encodeRepoPath(active.path)}`
    : undefined;

  const install = (
    <Button
      as="a"
      href={activeGithubUrl}
      variant="secondary"
      className={styles.iconButton}
      aria-label={`View the ${recipeName} recipe on GitHub`}
    >
      <MarkGithubIcon size={16} />
    </Button>
  );

  return (
    <DetailChassis
      title={recipeName}
      description={recipeDescription}
      breadcrumbs={[
        { label: "Cookbook", href: pageHref("cookbook") },
        { label: cookbookName, href: pageHref("cookbook") },
        { label: `${recipeName} (${languageName})` },
      ]}
      install={install}
      /* Anchors only exist while the recipe doc is on screen. */
      toc={isPrimary ? toc : []}
      sidebar={
        <ResourceMeta
          kicker="Recipe details"
          groups={[
            { label: "Cookbook", items: [cookbookName] },
            {
              label: "Language",
              items: [
                languageIcon ? `${languageIcon} ${languageName}` : languageName,
              ],
            },
            { label: "Tags", items: tags },
            {
              label: "Files",
              items: [`${files.length} file${files.length === 1 ? "" : "s"}`],
            },
          ]}
          lastUpdated={lastUpdated}
          sourceUrl={`${githubBlobBase}/${encodeRepoPath(primaryPath)}`}
        />
      }
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      <section className={styles.articleSection}>
        {files.length > 1 ? (
          <>
            <span className={styles.codeLabel}>
              <FileDirectoryIcon size={16} /> Files in this recipe
            </span>
            <ul
              className={fileStyles.fileTabs}
              aria-label="Files in this recipe"
            >
              {files.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    className={clsx(
                      fileStyles.fileTab,
                      file.path === activePath && fileStyles.fileTabActive,
                    )}
                    aria-current={file.path === activePath ? "true" : undefined}
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
            <span className={fileStyles.filePath}>{active.name}</span>
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

        <RecipeFileView
          active={active ?? null}
          isPrimary={isPrimary}
          kind={kind}
          markdownHtml={markdownHtml}
          rawMarkdown={rawMarkdown}
          text={active ? contents[active.path] : undefined}
          status={status}
          githubUrl={activeGithubUrl}
        />
      </section>
    </DetailChassis>
  );
}

function RecipeFileView({
  active,
  isPrimary,
  kind,
  markdownHtml,
  rawMarkdown,
  text,
  status,
  githubUrl,
}: {
  active: RecipeFile | null;
  isPrimary: boolean;
  kind: FileKind;
  markdownHtml: string;
  rawMarkdown: string;
  text?: string;
  status: "idle" | "loading" | "error";
  githubUrl: string;
}) {
  const [markdown, setMarkdown] = React.useState<string | null>(null);

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
        Couldn't load this file. <a href={githubUrl}>View it on GitHub</a>.
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
