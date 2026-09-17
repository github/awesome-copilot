import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  MarkGithubIcon,
  XIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import React from "react";

import {
  Box,
  Breadcrumbs,
  Button,
  Heading,
  Section,
  Text,
  ThemeProvider,
  useTheme,
} from "@primer/react-brand";

import styles from "./styles/github-copilot-app.module.css";
import navStyles from "./styles/TopNav.module.css";
import { LargeFooter } from "./LargeFooter";
import { ReadingHeader } from "./ReadingHeader";
import { useAgentDetailHeroPin, useAgentDetailProgress, useReadingScrollSpy } from "./useAgentDetailScroll";
import { TypingText } from "./TypingText";
import type { PrototypePageProps } from "./pageHref";
import { getAwesomeCopilotNavLinks } from "./navigation";
import { getScrollBehavior } from "./scrollBehavior";
import { TopNav } from "./TopNav";
import { LanguageSelect } from "./LanguageSelect";
import { SkipLink } from "./SkipLink";
import {
  type CodeLanguage,
  SyntaxHighlightedCode,
} from "./SyntaxHighlightedCode";
import { TopNavSearch } from "./TopNavSearch";
import { ContributorsNavButton } from "./ContributorsNavButton";
import type { SearchItem } from "./searchIndex";
import {
  contributorsTotal as siteContributorsTotal,
  searchIndex as siteSearchIndex,
} from "../../lib/site-data";

const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

/** Copyable, syntax-highlighted code block for learning articles. */
export function CopyBlock({
  code,
  label,
  language,
}: {
  code: string;
  label?: string;
  language?: CodeLanguage;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={styles.codeBlockWrap}>
      {label ? <span className={styles.codeLabel}>{label}</span> : null}
      <div className={styles.codeSurface}>
        <button
          type="button"
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy code"}
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        </button>
        <SyntaxHighlightedCode
          className={styles.codeBlock}
          code={code}
          language={language}
          lineClassName={styles.codeLine}
        />
      </div>
    </div>
  );
}

/** Dismissible "Pro tip" callout in the article flow. */
export function ProTip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  return (
    <aside className={styles.proTip}>
      <div className={styles.proTipHeader}>
        <span className={styles.proTipMark}>
          <MarkGithubIcon size={20} />
        </span>
        <span className={styles.proTipTitle}>Pro tip</span>
        <button
          type="button"
          className={styles.proTipClose}
          onClick={() => setOpen(false)}
          aria-label="Dismiss pro tip"
        >
          <XIcon size={20} />
        </button>
      </div>
      <div className={styles.proTipBody}>{children}</div>
    </aside>
  );
}

export type TocSection = { id: string; label: string };

export type LearningArticleLayoutProps = {
  pageHref: PrototypePageProps["pageHref"];
  /** Page slug of this article, used for the current breadcrumb link. */
  currentPage: string;
  /** Short label for the current (selected) breadcrumb. */
  breadcrumbLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Type the hero title out one character at a time on load, with a blinking
   *  terminal caret. Opt-in per page. */
  animateHeroTitle?: boolean;
  /** Optional primary CTA button in the hero. */
  heroCta?: { label: string; href: string };
  /** Optional custom content rendered in the hero below the description. */
  heroExtra?: React.ReactNode;
  /** Sections shown in the sticky "In this article" list; ids must match the
   *  `id` on each `<section>` rendered in `children`. */
  tocSections: TocSection[];
  /** Site-wide search index, injected from build-time data. */
  searchIndex?: SearchItem[];
  /** Live contributor count for the nav button. */
  contributorsTotal?: number;
  /** Optional "Up next" band pinned to the footer's green line. */
  upNext?: { label: string; href: string };
  /**
   * Only pages that actually have a mirrored translation should offer a
   * language switch. Defaults to false; the Learning Hub article body passes
   * true for the `copilot-workshops/app` track.
   */
  showLanguageSelect?: boolean;
  /** Article body — a sequence of `<section id=...>` blocks (and any ProTip). */
  children: React.ReactNode;
};

export function LearningArticleLayout(props: LearningArticleLayoutProps) {
  return (
    <ThemeProvider colorMode="auto">
      <LearningArticleLayoutBody {...props} />
    </ThemeProvider>
  );
}

function LearningArticleLayoutBody({
  pageHref,
  currentPage,
  breadcrumbLabel,
  heroTitle,
  heroSubtitle,
  animateHeroTitle = false,
  heroCta,
  heroExtra,
  tocSections,
  searchIndex = siteSearchIndex,
  contributorsTotal = siteContributorsTotal,
  upNext,
  showLanguageSelect = false,
  children,
}: LearningArticleLayoutProps) {
  const { colorMode } = useTheme();
  const subNavLinks = getAwesomeCopilotNavLinks(
    pageHref,
    "learning-hub-copilot-app",
  );
  const contentScrollRef = React.useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [heroBurst, setHeroBurst] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState(
    tocSections[0]?.id ?? "",
  );
  const pinnedHeight = useAgentDetailHeroPin(contentScrollRef, {
    hero: styles.hero,
    heroInner: styles.heroInner,
  }, "app");
  const scrollToTop = useAgentDetailProgress(
    contentScrollRef,
    setShowBackToTop,
    setHeroBurst,
    "app",
  );
  useReadingScrollSpy(contentScrollRef, tocSections, pinnedHeight, setActiveSection);

  const progressRider = (
    <div className={styles.progressViewport} aria-hidden="true">
      <div className={styles.progressRider} data-burst={heroBurst ? "true" : undefined}>
        <span className={styles.progressDuck} />
        <span className={styles.confetti}>
          {Array.from({ length: 14 }).map((_, i) => (
            <i key={i} className={styles.confettiPiece} />
          ))}
        </span>
      </div>
    </div>
  );

  return (
    <Box className={styles.page} backgroundColor="default" data-mode={colorMode}>
      <SkipLink />
      <header className={clsx(styles.topBar, navStyles.header)}>
        <nav className={styles.topBarInner} aria-label="Primary">
          <a href={pageHref()} className={styles.subNavTitle}>
            <MarkGithubIcon size={20} />
            Awesome GitHub Copilot
          </a>
          <TopNav
            styles={styles}
            links={subNavLinks}
            contributorsHref={pageHref("contributors")}
            contributorsTotal={contributorsTotal}
            searchIndex={searchIndex}
            searchAriaLabel="Search the library"
            showLanguageSelect={showLanguageSelect}
          />
          <div className={styles.topBarActions}>
            <TopNavSearch
              index={searchIndex}
              styles={styles}
              inputAriaLabel="Search the library"
            />
            <ContributorsNavButton
              href={pageHref("contributors")}
              total={contributorsTotal}
            />
            {showLanguageSelect && <LanguageSelect />}
            <Button as="a" href={CONTRIBUTING_URL} variant="subtle" size="small">
              Contribute
            </Button>
          </div>
        </nav>
      </header>

      <div className={styles.scrollHost} ref={contentScrollRef}>
        <main id="main-content" tabIndex={-1}>
        <ReadingHeader title={heroTitle} className={styles.readingHeader}>
          {progressRider}
        </ReadingHeader>
        <Box as="section" className={clsx(styles.hero, "heading-texture")}>
          <Section paddingBlockStart="none" paddingBlockEnd="none">
            <div className={styles.heroInner}>
            <div className={styles.heroBreadcrumbs}>
              <Breadcrumbs>
                <Breadcrumbs.Item href={pageHref("learning-hub-copilot-app")}>
                  <ArrowLeftIcon
                    size={16}
                    className={styles.heroBreadcrumbBackIcon}
                  />
                  GitHub Copilot Learning Hub
                </Breadcrumbs.Item>
                <Breadcrumbs.Item href={pageHref(currentPage)} selected>
                  {breadcrumbLabel}
                </Breadcrumbs.Item>
              </Breadcrumbs>
            </div>
            <div className={styles.heroContent}>
              <Heading as="h1" size="4">
                {animateHeroTitle ? (
                  <TypingText
                    text={heroTitle}
                    speedMs={60}
                    caret
                    caretClassName={styles.heroTitleCaret}
                  />
                ) : (
                  heroTitle
                )}
              </Heading>
              <Text
                as="p"
                size="200"
                variant="muted"
                className={clsx(
                  styles.heroDescription,
                  animateHeroTitle && styles.heroReveal,
                  animateHeroTitle && styles.heroRevealDescription,
                )}
              >
                {heroSubtitle}
              </Text>
              {heroExtra ? (
                <div
                  className={clsx(
                    styles.heroExtra,
                    animateHeroTitle && styles.heroReveal,
                    animateHeroTitle && styles.heroRevealExtra,
                  )}
                >
                  {heroExtra}
                </div>
              ) : null}
              {heroCta ? (
                <div
                  data-hero-actions
                  className={clsx(
                    styles.heroActions,
                    animateHeroTitle && styles.heroReveal,
                    animateHeroTitle && styles.heroRevealActions,
                  )}
                >
                  <Button
                    as="a"
                    href={heroCta.href}
                    variant="primary"
                    size="medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {heroCta.label}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
        {progressRider}
      </Box>
      <Box as="section" className={styles.body}>
          <Section paddingBlockStart="none" paddingBlockEnd="none">
            <div className={styles.bodyInner}>
              <div className={styles.layout}>
                <article className={styles.contentCol} data-reading-content>{children}</article>

                <aside className={styles.sidebarCol}>
                  <div className={styles.sidebarSticky}>
                    <div className={styles.sidebarSection}>
                      <div className={styles.sidebarSummary}>
                        <span className={styles.sidebarKicker}>
                          In this article
                        </span>
                      </div>
                      <nav className={styles.toc} aria-label="In this article">
                        <ul className={styles.tocList}>
                          {tocSections.map((section) => (
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
                                      behavior: getScrollBehavior(),
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
                  </div>
                </aside>
              </div>
              {upNext ? (
                <aside className={styles.nextUp} aria-label="Up next">
                  <div className={styles.nextUpMain}>
                    <div className={styles.nextUpKickerRow}>
                      <span className={styles.nextUpKicker}>Up next</span>
                    </div>
                    <a href={upNext.href} className={styles.nextUpLink}>
                      {upNext.label}
                      <ArrowRightIcon size={16} className={styles.nextUpArrow} />
                    </a>
                  </div>
                </aside>
              ) : null}
            </div>
          </Section>
        </Box>
        </main>
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
    </Box>
  );
}
