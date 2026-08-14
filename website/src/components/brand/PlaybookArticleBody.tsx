import { AlertIcon, MarkGithubIcon } from "@primer/octicons-react";

import {
  LearningArticleLayout,
  type TocSection,
} from "./LearningArticleLayout";
import type {
  ArticleBlock,
  ArticleSection,
  CalloutKind,
} from "../../lib/playbook-article";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/github-copilot-app.module.css";

const CALLOUT_TITLES: Record<CalloutKind, string> = {
  note: "Note",
  tip: "Pro tip",
  caution: "Caution",
};

/**
 * Static sibling of `ProTip`. Article bodies are prerendered, so this variant
 * reuses the same prototype classes and drops the dismiss control that would
 * require client state.
 */
function Callout({ kind, html }: { kind: CalloutKind; html: string }) {
  return (
    <aside className={styles.proTip}>
      <div className={styles.proTipHeader}>
        <span className={styles.proTipMark}>
          {kind === "caution" ? (
            <AlertIcon size={20} />
          ) : (
            <MarkGithubIcon size={20} />
          )}
        </span>
        <span className={styles.proTipTitle}>{CALLOUT_TITLES[kind]}</span>
      </div>
      <div
        className={styles.proTipBody}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </aside>
  );
}

function Block({ block, index }: { block: ArticleBlock; index: number }) {
  if (block.type === "callout") {
    return <Callout key={index} kind={block.kind} html={block.html} />;
  }
  return <div key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;
}

export function PlaybookArticleBody({
  slug,
  breadcrumbLabel,
  title,
  description,
  sections,
  tocSections,
  searchIndex = [],
  contributorsTotal = 0,
}: {
  /** Site path of this article, e.g. `learning-hub/agentic-workflows`. */
  slug: string;
  breadcrumbLabel: string;
  title: string;
  description: string;
  sections: ArticleSection[];
  tocSections: TocSection[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage={slug}
      breadcrumbLabel={breadcrumbLabel}
      heroTitle={title}
      heroSubtitle={description}
      tocSections={tocSections}
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={styles.articleSection}
        >
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} index={index} />
          ))}
        </section>
      ))}
    </LearningArticleLayout>
  );
}
