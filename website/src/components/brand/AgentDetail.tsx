import { DownloadIcon, MarkGithubIcon, PlusIcon } from "@primer/octicons-react";
import React from "react";

import { ActionMenu, Button } from "@primer/react-brand";

import {
  DetailChassis,
  type DetailSibling,
  type DetailTocItem,
} from "./DetailChassis";
import { ResourceMeta } from "./ResourceMeta";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/dotnet-upgrade.module.css";

export type AgentDetailItem = {
  id: string;
  title: string;
  description?: string;
  model?: string | string[];
  tools?: string[];
  handoffs?: (string | { label?: string; agent?: string })[];
  mcpServers?: string[];
  path: string;
  filename?: string;
};

export type AgentDetailProps = {
  item: AgentDetailItem;
  /** Rendered, sanitized markdown body with heading ids already stamped. */
  markdownHtml: string;
  toc: DetailTocItem[];
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

export function AgentDetail({
  item,
  markdownHtml,
  toc,
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
}: AgentDetailProps) {
  const models = Array.isArray(item.model)
    ? item.model
    : item.model
      ? [item.model]
      : [];

  // Handoffs are recorded as `{ label, agent }` records; the chip shows the
  // human label, falling back to the agent id.
  const handoffs = (item.handoffs ?? [])
    .map((handoff) =>
      typeof handoff === "string"
        ? handoff
        : (handoff.label ?? handoff.agent ?? ""),
    )
    .filter(Boolean);

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
        <ActionMenu.Overlay aria-label={`Install the ${item.title} agent`}>
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
        aria-label={`View the ${item.title} agent on GitHub`}
      >
        <MarkGithubIcon size={16} />
      </Button>
      <Button
        as="a"
        href={downloadUrl}
        variant="secondary"
        download
        className={styles.iconButton}
        aria-label={`Download the ${item.title} agent file`}
      >
        <DownloadIcon size={16} />
      </Button>
    </>
  );

  return (
    <DetailChassis
      title={item.title}
      description={item.description}
      breadcrumbs={[
        { label: "Agents", href: pageHref("agents") },
        { label: item.title },
      ]}
      install={install}
      toc={toc}
      sidebar={
        <ResourceMeta
          kicker="Agent details"
          groups={[
            { label: "Models", items: models },
            { label: "Tools", items: item.tools ?? [] },
            { label: "Handoffs", items: handoffs },
            { label: "MCP servers", items: item.mcpServers ?? [] },
          ]}
          lastUpdated={lastUpdated}
          sourceUrl={githubUrl}
        />
      }
      previous={previous}
      next={next}
      currentPage="agents"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      <section className={styles.articleSection}>
        <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
      </section>
    </DetailChassis>
  );
}
