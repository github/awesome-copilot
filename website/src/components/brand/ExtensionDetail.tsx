import {
  CheckIcon,
  CopyIcon,
  LinkExternalIcon,
  MarkGithubIcon,
  PlusIcon,
} from "@primer/octicons-react";
import React from "react";

import { Button, Token } from "@primer/react-brand";

import { DetailChassis, type DetailSibling } from "./DetailChassis";
import { ResourceMeta } from "./ResourceMeta";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/dotnet-upgrade.module.css";
// The framed media block and the install command bar are prototype treatments
// that live in the Copilot app page's stylesheet; reused here verbatim.
import appStyles from "./styles/github-copilot-app.module.css";

export type ExtensionDetailImage = { url: string; alt: string };

export type ExtensionDetailItem = {
  id: string;
  name: string;
  description?: string;
  version?: string | null;
  pluginName?: string | null;
  external?: boolean;
  externalSource?: string | null;
  keywords?: string[];
  author?: { name?: string; url?: string } | null;
};

export type ExtensionDetailProps = {
  item: ExtensionDetailItem;
  /** Preview screenshots, largest/primary first. */
  images: ExtensionDetailImage[];
  /** Rendered, sanitized README with heading ids already stamped. */
  markdownHtml: string;
  /** `ghapp://` deep link — absent for external extensions. */
  installUrl?: string | null;
  /** Copilot CLI command — absent for external extensions. */
  installCommand?: string | null;
  /** Repository the extension is published from. */
  sourceUrl?: string | null;
  lastUpdated?: string | null;
  previous?: DetailSibling;
  next?: DetailSibling;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

const PREVIEW_SECTION_ID = "preview";

/** Copyable `copilot plugin install …` line, matching the prototype install bar. */
function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = () => {
    navigator.clipboard?.writeText(command).catch(() => undefined);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={appStyles.installBar}>
      <code className={appStyles.installCommand} tabIndex={0}>
        {command}
      </code>
      <button
        type="button"
        className={appStyles.installCopy}
        onClick={handleCopy}
        aria-label={copied ? "Copied to clipboard" : "Copy install command"}
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

/**
 * Detail route for a canvas extension.
 *
 * Two things set it apart from the other resource details: the preview
 * screenshot leads the content column at hero scale (a gallery when an
 * extension ships more than one), and installation has two paths — the
 * `ghapp://` deep link and the Copilot CLI command. Externally hosted
 * extensions carry neither, so they fall back to a link to their source repo.
 */
export function ExtensionDetail({
  item,
  images,
  markdownHtml,
  installUrl,
  installCommand,
  sourceUrl,
  lastUpdated,
  previous,
  next,
  searchIndex,
  contributorsTotal,
}: ExtensionDetailProps) {
  const hasPreview = images.length > 0;

  const install = (
    <>
      {installUrl ? (
        <Button
          as="a"
          href={installUrl}
          variant="primary"
          hasArrow={false}
          leadingVisual={PlusIcon}
        >
          Open in Copilot app
        </Button>
      ) : null}
      {sourceUrl ? (
        <Button
          as="a"
          href={sourceUrl}
          variant={installUrl ? "secondary" : "primary"}
          hasArrow={false}
          leadingVisual={installUrl ? undefined : LinkExternalIcon}
          className={installUrl ? styles.iconButton : undefined}
          aria-label={
            installUrl ? `View ${item.name} on GitHub` : undefined
          }
        >
          {installUrl ? <MarkGithubIcon size={16} /> : "View source repository"}
        </Button>
      ) : null}
    </>
  );

  const heroExtras =
    item.version || item.external ? (
      <div className={styles.metaValues}>
        {item.version ? <Token text={`v${item.version}`} /> : null}
        {item.external ? <Token text="Externally hosted" /> : null}
      </div>
    ) : null;

  return (
    <DetailChassis
      title={item.name}
      description={item.description}
      breadcrumbs={[
        { label: "Extensions", href: pageHref("extensions") },
        { label: item.name },
      ]}
      install={install}
      heroExtras={heroExtras}
      sidebar={
        <ResourceMeta
          kicker="Extension details"
          groups={[
            { label: "Keywords", items: item.keywords ?? [] },
            {
              label: "Source",
              items: item.externalSource ? [item.externalSource] : [],
            },
          ]}
          author={item.author?.name ?? null}
          lastUpdated={lastUpdated}
          sourceUrl={sourceUrl ?? undefined}
        />
      }
      previous={previous}
      next={next}
      currentPage="extensions"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      {hasPreview ? (
        <section id={PREVIEW_SECTION_ID} className={styles.articleSection}>
          <h2 className={styles.articleHeading}>Preview</h2>
          {images.map((image) => (
            <figure key={image.url} className={appStyles.videoFigure}>
              <img
                className={appStyles.gif}
                src={image.url}
                alt={image.alt}
                loading="eager"
                decoding="async"
                width={1280}
                height={720}
              />
            </figure>
          ))}
        </section>
      ) : null}

      {installUrl || installCommand ? (
        <section className={styles.articleSection}>
          <h2 className={styles.articleHeading}>Install</h2>
          {installCommand ? <InstallCommand command={installCommand} /> : null}
          {installUrl ? (
            <p>
              Or{" "}
              <a href={installUrl}>open {item.name} directly in the Copilot app</a>
              .
            </p>
          ) : null}
        </section>
      ) : sourceUrl ? (
        <section className={styles.articleSection}>
          <h2 className={styles.articleHeading}>Install</h2>
          <p>
            {item.name} is hosted outside this repository. Follow the
            installation steps in its{" "}
            <a href={sourceUrl}>source repository</a>.
          </p>
        </section>
      ) : null}

      {markdownHtml ? (
        <section className={styles.articleSection}>
          <div dangerouslySetInnerHTML={{ __html: markdownHtml }} />
        </section>
      ) : null}
    </DetailChassis>
  );
}
