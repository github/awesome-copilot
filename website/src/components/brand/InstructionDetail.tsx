import { DownloadIcon, MarkGithubIcon, PlusIcon } from "@primer/octicons-react";
import React from "react";

import { ActionMenu, Button, Token } from "@primer/react-brand";

import { DetailChassis, type DetailSibling } from "./DetailChassis";
import { ResourceMeta } from "./ResourceMeta";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/dotnet-upgrade.module.css";

export type InstructionDetailItem = {
  id: string;
  title: string;
  description?: string;
  applyTo?: string | string[] | null;
  applyToPatterns?: string[];
  extensions?: string[];
  path: string;
  filename?: string;
};

export type InstructionDetailProps = {
  item: InstructionDetailItem;
  /** Rendered, sanitized markdown body with heading ids already stamped. */
  markdownHtml: string;
  /** `chat-instructions` VS Code install URL (see src/lib/detail-page.ts). */
  vscodeUrl: string;
  insidersUrl: string;
  githubUrl: string;
  downloadUrl: string;
  rawMarkdown: string;
  lastUpdated?: string | null;
  previous?: DetailSibling;
  next?: DetailSibling;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

export function InstructionDetail({
  item,
  markdownHtml,
  vscodeUrl,
  insidersUrl,
  githubUrl,
  downloadUrl,
  rawMarkdown,
  lastUpdated,
  previous,
  next,
  searchIndex,
  contributorsTotal,
}: InstructionDetailProps) {
  const applyTo = Array.isArray(item.applyTo)
    ? item.applyTo
    : item.applyTo
      ? [item.applyTo]
      : (item.applyToPatterns ?? []);

  const handleCopyMarkdown = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawMarkdown);
    } catch {
      /* clipboard unavailable */
    }
  }, [rawMarkdown]);

  const install = (
    <>
      <ActionMenu mode="split-button" menuAlignment="start">
        <ActionMenu.Button
          as="a"
          href={vscodeUrl}
          variant="primary"
          leadingVisual={PlusIcon}
        >
          Install
        </ActionMenu.Button>
        <ActionMenu.Overlay
          aria-label={`Install the ${item.title} instructions`}
        >
          <ActionMenu.Item as="a" href={vscodeUrl}>
            Install in VS Code
          </ActionMenu.Item>
          <ActionMenu.Item as="a" href={insidersUrl}>
            Install in VS Code Insiders
          </ActionMenu.Item>
          <ActionMenu.Item as="a" href={downloadUrl} download>
            Download file
          </ActionMenu.Item>
          <ActionMenu.Item onClick={handleCopyMarkdown}>
            Copy markdown
          </ActionMenu.Item>
        </ActionMenu.Overlay>
      </ActionMenu>
      <Button
        as="a"
        href={githubUrl}
        variant="secondary"
        className={styles.iconButton}
        aria-label={`View the ${item.title} instructions on GitHub`}
      >
        <MarkGithubIcon size={16} />
      </Button>
      <Button
        as="a"
        href={downloadUrl}
        variant="secondary"
        download
        className={styles.iconButton}
        aria-label={`Download the ${item.title} instructions file`}
      >
        <DownloadIcon size={16} />
      </Button>
    </>
  );

  // The glob patterns decide when Copilot applies these instructions, so they
  // are promoted into the hero rather than left in the sidebar.
  const heroExtras =
    applyTo.length > 0 ? (
      <div className={styles.metaValues} role="list" aria-label="Applies to">
        {applyTo.map((pattern) => (
          <span key={pattern} role="listitem">
            <Token text={pattern} />
          </span>
        ))}
      </div>
    ) : null;

  return (
    <DetailChassis
      title={item.title}
      description={item.description}
      breadcrumbs={[
        { label: "Instructions", href: pageHref("instructions") },
        { label: item.title },
      ]}
      install={install}
      heroExtras={heroExtras}
      sidebar={
        <ResourceMeta
          kicker="Instruction details"
          groups={[
            { label: "Applies to", items: applyTo },
            { label: "Extensions", items: item.extensions ?? [] },
          ]}
          lastUpdated={lastUpdated}
          sourceUrl={githubUrl}
        />
      }
      previous={previous}
      next={next}
      currentPage="instructions"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      <section className={styles.articleSection}>
        <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
      </section>
    </DetailChassis>
  );
}
