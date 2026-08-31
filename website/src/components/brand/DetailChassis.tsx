import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import React from "react";

import { Box, Breadcrumbs, Heading, Section, Text } from "@primer/react-brand";

import { PageShell } from "./PageShell";
import { LargeFooter } from "./LargeFooter";
import type { AwesomeCopilotPage } from "./navigation";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/dotnet-upgrade.module.css";
import {
  useAgentDetailHeroPin,
  useAgentDetailProgress,
} from "./useAgentDetailScroll";

export type DetailCrumb = {
  label: string;
  /** Omitted for the trailing (current) crumb. */
  href?: string;
};

export type DetailTocItem = { id: string; label: string };

export type DetailSibling = { label: string; href: string };

export type DetailChassisProps = {
  /** Resource name — the hero `<h1>`. */
  title: string;
  /** One-line summary under the hero title. */
  description?: string;
  /** Trail rendered in the hero. The last entry is marked as the current page. */
  breadcrumbs: DetailCrumb[];
  /** Hero action row: install split-button, source/download buttons, etc. */
  install?: React.ReactNode;
  /** Extra hero content rendered under the description (e.g. `applyTo` tokens). */
  heroExtras?: React.ReactNode;
  /** "In this article" entries; ids must exist in the content region. */
  toc?: DetailTocItem[];
  /** Extra sidebar panels rendered under the table of contents. */
  sidebar?: React.ReactNode;
  previous?: DetailSibling;
  next?: DetailSibling;
  /** Catalog tab to mark current in the top nav. */
  currentPage?: AwesomeCopilotPage;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
  /** Main content region — markdown body, capability lists, file trees, … */
  children: React.ReactNode;
};

const TWO_COLUMN_QUERY = "(min-width: 75rem)";

/**
 * Shared shell for every resource detail route.
 *
 * Reproduces the designers' `agent.tsx` layout: breadcrumbs and a sticky hero
 * carrying a reading-progress rule, a two-column body whose sidebar holds the
 * in-page table of contents, sibling navigation, and a back-to-top control —
 * all inside the site-wide `PageShell` chrome.
 *
 * Everything type-specific (install affordances, metadata panels, the content
 * region itself) arrives through props so the five resource types can differ
 * without forking this file.
 */
export function DetailChassis({
  title,
  description,
  breadcrumbs,
  install,
  heroExtras,
  toc = [],
  sidebar,
  previous,
  next,
  currentPage,
  searchIndex,
  contributorsTotal,
  children,
}: DetailChassisProps) {
  const contentScrollRef = React.useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [heroBurst, setHeroBurst] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState(toc[0]?.id ?? "");

  const lastSectionId = toc[toc.length - 1]?.id ?? "";

  useAgentDetailHeroPin(contentScrollRef, {
    hero: styles.hero,
    heroInner: styles.heroInner,
    heroContent: styles.heroContent,
  });
  const scrollToTop = useAgentDetailProgress(
    contentScrollRef,
    lastSectionId,
    setShowBackToTop,
    setHeroBurst,
  );

  useScrollHostLayout(contentScrollRef);
  useScrollSpy(contentScrollRef, toc, setActiveSection);

  return (
    <PageShell
      styles={styles}
      currentPage={currentPage}
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      renderFooter={false}
    >
      <div className={styles.scrollHost} ref={contentScrollRef}>
        <Box as="section" className={styles.hero}>
          <Section paddingBlockStart="none" paddingBlockEnd="none">
            <div className={styles.heroInner}>
              <div className={styles.heroBreadcrumbs}>
                <Breadcrumbs>
                  {breadcrumbs.map((crumb, index) => {
                    const selected = index === breadcrumbs.length - 1;
                    return (
                      <Breadcrumbs.Item
                        key={`${crumb.label}-${index}`}
                        href={crumb.href ?? "#"}
                        selected={selected}
                      >
                        {index === 0 ? (
                          <ArrowLeftIcon
                            size={16}
                            className={styles.heroBreadcrumbBackIcon}
                          />
                        ) : null}
                        {crumb.label}
                      </Breadcrumbs.Item>
                    );
                  })}
                </Breadcrumbs>
              </div>
              <div className={styles.heroContent}>
                <Heading as="h1" size="4">
                  {title}
                </Heading>
                {description ? (
                  <Text
                    as="p"
                    size="200"
                    variant="muted"
                    className={clsx(
                      styles.heroDescription,
                      styles.heroDescriptionClamp,
                    )}
                  >
                    {description}
                  </Text>
                ) : null}
                {heroExtras}
                {install ? (
                  <div className={styles.heroActions}>{install}</div>
                ) : null}
              </div>
            </div>
          </Section>
          <div
            className={styles.progressRider}
            data-burst={heroBurst ? "true" : undefined}
            aria-hidden="true"
          >
            <span className={styles.progressDuck} />
            <span className={styles.confetti}>
              {Array.from({ length: 14 }).map((_, i) => (
                <i key={i} className={styles.confettiPiece} />
              ))}
            </span>
          </div>
        </Box>

        <Box as="section" className={styles.body}>
          <Section paddingBlockStart="none" paddingBlockEnd="none">
            <div className={styles.bodyInner}>
              <div className={styles.layout}>
                <article className={styles.contentCol}>{children}</article>

                <aside className={styles.sidebarCol}>
                  <div className={styles.sidebarSticky}>
                    {toc.length > 0 ? (
                      <div className={styles.sidebarSection}>
                        <div className={styles.sidebarSummary}>
                          <span className={styles.sidebarKicker}>
                            In this article
                          </span>
                        </div>
                        <nav className={styles.toc} aria-label="In this article">
                          <ul className={styles.tocList}>
                            {toc.map((section) => (
                              <li key={section.id}>
                                <a
                                  href={`#${section.id}`}
                                  className={clsx(
                                    styles.tocLink,
                                    activeSection === section.id &&
                                      styles.tocLinkActive,
                                  )}
                                  aria-current={
                                    activeSection === section.id
                                      ? "true"
                                      : undefined
                                  }
                                  onClick={(event) => {
                                    event.preventDefault();
                                    document
                                      .getElementById(section.id)
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                      });
                                    setActiveSection(section.id);
                                  }}
                                >
                                  {section.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      </div>
                    ) : null}
                    {sidebar}
                  </div>
                </aside>
              </div>
              {previous || next ? (
                <aside className={styles.nextUp} aria-label="More like this">
                  {previous ? (
                    <div className={styles.nextUpMain}>
                      <div className={styles.nextUpKickerRow}>
                        <span className={styles.nextUpKicker}>Previous</span>
                      </div>
                      <a href={previous.href} className={styles.nextUpLink}>
                        <ArrowLeftIcon
                          size={16}
                          className={styles.nextUpArrow}
                        />
                        {previous.label}
                      </a>
                    </div>
                  ) : null}
                  {next ? (
                    <div className={styles.nextUpMain}>
                      <div className={styles.nextUpKickerRow}>
                        <span className={styles.nextUpKicker}>Up next</span>
                      </div>
                      <a href={next.href} className={styles.nextUpLink}>
                        {next.label}
                        <ArrowRightIcon
                          size={16}
                          className={styles.nextUpArrow}
                        />
                      </a>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </Section>
        </Box>
        <LargeFooter />
      </div>
      <button
        type="button"
        className={clsx(
          styles.backToTop,
          showBackToTop && styles.backToTopVisible,
        )}
        onClick={scrollToTop}
        aria-label="Back to top"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUpIcon size={24} />
      </button>
    </PageShell>
  );
}

/**
 * The prototype nested the scroll region directly inside `.page`; under
 * `PageShell` it sits one level deeper, inside the `<main>` landmark. Make that
 * landmark a transparent flex pass-through so the measured 100vh scroll region
 * still resolves, and mirror the hero-pin flag the scroll hook writes onto it
 * back up to `.page`, which is what the stylesheet keys off.
 */
function useScrollHostLayout(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
) {
  React.useLayoutEffect(() => {
    const host = contentScrollRef.current;
    const landmark = host?.parentElement;
    if (!host || !landmark) return;

    landmark.style.display = "flex";
    landmark.style.flexDirection = "column";
    landmark.style.flex = "1 1 auto";
    landmark.style.minHeight = "0";

    const page = landmark.parentElement;
    if (!page) return;

    // The scroll hooks write their measurements to the scroll host's parent.
    // Republish them on `.page`, which the stylesheet's selectors key off.
    const mirror = () => {
      const pin = landmark.dataset.heroPin;
      if (pin === undefined) delete page.dataset.heroPin;
      else page.dataset.heroPin = pin;
      for (const name of Array.from(landmark.style)) {
        if (name.startsWith("--dotnet-")) {
          page.style.setProperty(name, landmark.style.getPropertyValue(name));
        }
      }
    };
    mirror();
    const observer = new MutationObserver(mirror);
    observer.observe(landmark, {
      attributes: true,
      attributeFilter: ["data-hero-pin", "style"],
    });
    return () => observer.disconnect();
  }, [contentScrollRef]);
}

/** Highlight the section the reader is currently in, below the pinned hero. */
function useScrollSpy(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  toc: DetailTocItem[],
  setActiveSection: React.Dispatch<React.SetStateAction<string>>,
) {
  React.useEffect(() => {
    if (toc.length === 0) return;
    const scroller = contentScrollRef.current;
    if (!scroller) return;

    let observer: IntersectionObserver | null = null;
    const build = () => {
      observer?.disconnect();
      const internal = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const root = internal ? scroller : null;
      const viewport = internal ? scroller.clientHeight : window.innerHeight;
      const hero = scroller.querySelector<HTMLElement>(`.${styles.hero}`);
      const pinned = internal && hero ? hero.getBoundingClientRect().height : 0;
      const bottomMargin = Math.round(Math.max(0, viewport - pinned) * 0.65);

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) setActiveSection(visible[0].target.id);
        },
        {
          root,
          rootMargin: `-${Math.round(pinned)}px 0px -${bottomMargin}px 0px`,
          threshold: 0,
        },
      );
      toc.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer?.observe(el);
      });
    };

    build();
    window.addEventListener("resize", build);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", build);
    };
  }, [contentScrollRef, toc, setActiveSection]);
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripHtmlTags = (html: string) => {
  let text = "";
  let inTag = false;
  let quote: '"' | "'" | undefined;

  for (const character of html) {
    if (inTag) {
      if (quote) {
        if (character === quote) quote = undefined;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        inTag = false;
      }
    } else if (character === "<") {
      inTag = true;
    } else {
      text += character;
    }
  }

  return text;
};

/**
 * Derive the in-page table of contents from rendered markdown, stamping a
 * stable `id` onto every `<h2>` so the TOC links and scroll-spy have anchors.
 *
 * Pure and deterministic, so the ids match between the build-time render and
 * client hydration.
 */
export function buildDetailToc(markdownHtml: string): {
  html: string;
  toc: DetailTocItem[];
} {
  if (!markdownHtml) return { html: markdownHtml, toc: [] };

  const toc: DetailTocItem[] = [];
  const used = new Map<string, number>();

  const html = markdownHtml.replace(
    /<h2([^>]*)>([\s\S]*?)<\/h2>/g,
    (match, attrs: string, inner: string) => {
      const label = stripHtmlTags(inner)
        .replace(/&lt;|&gt;|&quot;|&#39;|&amp;/g, (entity) => {
          switch (entity) {
            case "&lt;":
              return "<";
            case "&gt;":
              return ">";
            case "&quot;":
              return '"';
            case "&#39;":
              return "'";
            default:
              return "&";
          }
        })
        .trim();
      if (!label) return match;

      const existing = /\bid="([^"]+)"/.exec(attrs)?.[1];
      let id = existing ?? slugify(label);
      if (!id) return match;
      if (!existing) {
        const seen = used.get(id) ?? 0;
        used.set(id, seen + 1);
        if (seen > 0) id = `${id}-${seen}`;
      }

      toc.push({ id, label });
      const nextAttrs = existing ? attrs : ` id="${id}"${attrs}`;
      return `<h2${nextAttrs}>${inner}</h2>`;
    },
  );

  return { html, toc };
}
