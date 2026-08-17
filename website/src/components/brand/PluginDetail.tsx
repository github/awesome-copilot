import { MarkGithubIcon, PlusIcon } from "@primer/octicons-react";
import React from "react";

import {
  ActionMenu,
  Box,
  Button,
  Card,
  Grid,
  Heading,
  Label,
  Text,
  Token,
  useTheme,
} from "@primer/react-brand";
import { clsx } from "clsx";

import type { ExternalSource } from "../../lib/external-source";
import { DetailChassis, type DetailSibling } from "./DetailChassis";
import { ResourceMeta } from "./ResourceMeta";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import gridStyles from "./styles/plugins.module.css";
import styles from "./styles/dotnet-upgrade.module.css";

/** A bundled agent / hook / skill / extension inside a plugin. */
export type PluginIncludedItem = {
  kind: string;
  path?: string;
  title?: string | null;
  /** Absolute site path to the item's own detail page, when one exists. */
  detailUrl?: string | null;
};

export type PluginDetailItem = {
  id: string;
  name: string;
  description?: string;
  path: string;
  version?: string | null;
  tags?: string[];
  itemCount?: number;
  items?: PluginIncludedItem[];
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  license?: string | null;
  author?: { name?: string; url?: string } | null;
  source?: ExternalSource | null;
};

export type PluginDetailProps = {
  item: PluginDetailItem;
  /** Rendered, sanitized README with heading ids already stamped. */
  markdownHtml: string;
  /** GitHub URL for the plugin source (repo tree, or the external repo). */
  githubUrl: string;
  /** Copilot CLI command that installs this plugin. */
  installCommand: string;
  /** `ghapp://` deep link that installs this plugin into the Copilot app. */
  appInstallUrl: string;
  lastUpdated?: string | null;
  previous?: DetailSibling;
  next?: DetailSibling;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

const KIND_LABELS: Record<string, string> = {
  agent: "Agent",
  hook: "Hook",
  skill: "Skill",
  extension: "Extension",
  instruction: "Instruction",
  mcp: "MCP server",
  prompt: "Prompt",
};

const kindLabel = (kind: string) =>
  KIND_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);

/** Fall back to the trailing path segment when an item carries no title. */
function itemTitle(item: PluginIncludedItem): string {
  if (item.title) return item.title;
  const segments = (item.path ?? "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return last.replace(/\.[^.]+$/, "") || kindLabel(item.kind);
}

/**
 * Detail route for a plugin.
 *
 * Differs from the other resource detail pages in three ways: the plugin's
 * bundled contents are rendered as a card grid linking to each item's own
 * detail page, installation deep-links into the Copilot app (with the CLI
 * command offered as a secondary path), and externally-hosted plugins carry
 * provenance badges.
 */
export function PluginDetail({
  item,
  markdownHtml,
  githubUrl,
  installCommand,
  appInstallUrl,
  lastUpdated,
  previous,
  next,
  searchIndex,
  contributorsTotal,
}: PluginDetailProps) {
  const { colorMode } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [installCommand]);

  const includedItems = item.items ?? [];
  const hasContents = includedItems.length > 0;

  // Installing straight into the Copilot app is the primary path, so it is the
  // split button's default action. The CLI command stays available behind the
  // menu for people working in a terminal or on a machine without the app.
  const install = (
    <>
      <ActionMenu mode="split-button" menuAlignment="start">
        <ActionMenu.Button
          as="a"
          href={appInstallUrl}
          variant="primary"
          leadingVisual={PlusIcon}
        >
          Install
        </ActionMenu.Button>
        <ActionMenu.Overlay aria-label={`Install the ${item.name} plugin`}>
          <ActionMenu.Item as="a" href={appInstallUrl}>
            Install in Copilot app
          </ActionMenu.Item>
          <ActionMenu.Item onClick={handleCopy}>
            {copied ? "Copied CLI command" : "Copy CLI install command"}
          </ActionMenu.Item>
        </ActionMenu.Overlay>
      </ActionMenu>
      <Button
        as="a"
        href={githubUrl}
        variant="secondary"
        className={styles.iconButton}
        aria-label={`View the ${item.name} plugin on GitHub`}
      >
        <MarkGithubIcon size={16} />
      </Button>
    </>
  );

  // Provenance sits in the hero: whether the plugin ships from this repository
  // or from a third-party repo is the first thing a reader needs to know.
  const heroExtras = (
    <div className={styles.metaValues} role="group" aria-label="Plugin provenance">
      <Label color={item.external ? "purple" : "green"} size="medium">
        {item.external ? "External plugin" : "Built-in"}
      </Label>
      {item.version ? <Token>{`v${item.version}`}</Token> : null}
      {item.author?.name ? <Token>{item.author.name}</Token> : null}
      {item.license ? <Token>{item.license}</Token> : null}
      {item.external && item.source?.repo ? (
        <Token>{item.source.repo}</Token>
      ) : null}
    </div>
  );

  return (
    <DetailChassis
      title={item.name}
      description={item.description}
      breadcrumbs={[
        { label: "Plugins", href: pageHref("plugins") },
        { label: item.name },
      ]}
      install={install}
      heroExtras={heroExtras}
      sidebar={
        <ResourceMeta
          kicker="Plugin details"
          groups={[
            { label: "Version", items: item.version ? [item.version] : [] },
            {
              label: "Source",
              items: [item.external ? "External" : "Built-in"],
            },
            { label: "License", items: item.license ? [item.license] : [] },
            { label: "Tags", items: item.tags ?? [] },
          ]}
          author={item.author?.name ?? null}
          lastUpdated={lastUpdated}
          sourceUrl={githubUrl}
        />
      }
      previous={previous}
      next={next}
      currentPage="plugins"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      {item.external ? (
        <section className={styles.articleSection}>
          <div className={styles.proTip}>
            <div className={styles.proTipHeader}>
              <span className={styles.proTipTitle}>
                Maintained outside this repository
              </span>
            </div>
            <div className={styles.proTipBody}>
              <p className={styles.proTipLead}>
                {item.author?.name
                  ? `${item.name} is published by ${item.author.name}`
                  : `${item.name} is published by a third party`}
                {item.source?.repo ? ` from ${item.source.repo}` : ""}
                {item.source?.sha || item.source?.ref
                  ? `, pinned to ${item.source.sha ?? item.source.ref}`
                  : ""}
                . Review the source before installing.
              </p>
              <p>
                <a className={styles.proTipLink} href={githubUrl}>
                  View the source repository
                </a>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {hasContents ? (
        <section className={styles.articleSection} id="plugin-contents">
          <Heading as="h2" size="5" className={styles.articleHeading}>
            What&rsquo;s included
          </Heading>
          <Box className={gridStyles.gridFrame} data-mode={colorMode}>
            <Box className={gridStyles.gridContent}>
              <Grid
                className={gridStyles.threeUp}
                columnGap="none"
                rowGap="none"
                enableGutters={false}
              >
                {includedItems.map((included, index) => {
                  const title = itemTitle(included);
                  return (
                    <Grid.Column
                      key={`${included.kind}-${included.path ?? title}-${index}`}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={gridStyles.col}
                    >
                      <Box
                        className={clsx(
                          gridStyles.item,
                          included.detailUrl && gridStyles.itemHover,
                        )}
                      >
                        <Card
                          href={
                            included.detailUrl
                              ? pageHref(included.detailUrl)
                              : githubUrl
                          }
                          fullWidth
                          ctaVariant="none"
                          backgroundColor="none"
                          className={gridStyles.card}
                        >
                          <Card.Heading as="h3">{title}</Card.Heading>
                          <Card.Description>
                            <span className={gridStyles.cardDescText}>
                              {included.path ?? kindLabel(included.kind)}
                            </span>
                          </Card.Description>
                        </Card>
                        <div className={gridStyles.cardMeta}>
                          <Token>{kindLabel(included.kind)}</Token>
                        </div>
                      </Box>
                    </Grid.Column>
                  );
                })}
              </Grid>
            </Box>
          </Box>
        </section>
      ) : null}

      {markdownHtml ? (
        <section className={styles.articleSection}>
          <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
        </section>
      ) : (
        <section className={styles.articleSection}>
          <Text as="p" variant="muted">
            This plugin does not ship a README in this repository.
            {item.external ? " Documentation lives in its source repo." : ""}
          </Text>
        </section>
      )}
    </DetailChassis>
  );
}
