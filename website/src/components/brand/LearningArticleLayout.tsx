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
import { LargeFooter } from "./LargeFooter";
import { TypingText } from "./TypingText";
import type { PrototypePageProps } from "./pageHref";
import { getAwesomeCopilotNavLinks } from "./navigation";
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
import { contributorsTotal as siteContributorsTotal } from "../../lib/site-data";

const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

// Minimum article reading strip (px) that must remain below a pinned hero. When
// pinning the hero would leave less than this — because the viewport is short or
// the hero is tall (e.g. the CLI page's install bar) — the hero is released to
// scroll away instead of trapping the article in a narrow band.
const MIN_HERO_READING = 464;

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
  searchIndex = [],
  contributorsTotal = siteContributorsTotal,
  upNext,
  showLanguageSelect = false,
  children,
}: LearningArticleLayoutProps) {
  const { colorMode } = useTheme();
  const subNavLinks = getAwesomeCopilotNavLinks(pageHref);
  const contentScrollRef = React.useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [heroBurst, setHeroBurst] = React.useState(false);
  const heroBurstRef = React.useRef(false);
  const [activeSection, setActiveSection] = React.useState(
    tocSections[0]?.id ?? "",
  );
  // Visible height of the hero once it pins to the top of the scroll region
  // (measured below). The scroll-spy detection zone is offset by this so a
  // section only becomes "active" once it clears the fixed hero.
  const [pinnedHeight, setPinnedHeight] = React.useState(0);

  const scrollToTop = () => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll-spy: highlight the current section in the "In this article" list. The
  // pinned hero covers the top of the scroll region, so the detection zone is
  // pushed below it (top margin = hero height) and its lower bound tracks the
  // remaining visible area — reproducing "top third of what the reader can see".
  React.useEffect(() => {
    const scroller = contentScrollRef.current;
    if (!scroller) return;
    let observer: IntersectionObserver | null = null;
    const build = () => {
      observer?.disconnect();
      const viewport = scroller.clientHeight;
      const below = Math.max(0, viewport - pinnedHeight);
      const bottomMargin = Math.round(below * 0.65);
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
            );
          if (visible[0]) {
            setActiveSection(visible[0].target.id);
          }
        },
        {
          root: scroller,
          rootMargin: `-${Math.round(pinnedHeight)}px 0px -${bottomMargin}px 0px`,
          threshold: 0,
        },
      );
      tocSections.forEach((section) => {
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
  }, [tocSections, pinnedHeight]);

  // Expose the scroll region's scrollbar width so the fixed top bar and hero can
  // inset by the same amount and keep every vertical gridline aligned.
  React.useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const page = el.parentElement;
    const setRegion = () => {
      const scrollbar = el.offsetWidth - el.clientWidth;
      page?.style.setProperty("--app-scrollbar", `${scrollbar}px`);
      // Align the progress line + duck to the framed content (between the outer
      // vertical gridlines) rather than the viewport edge: expose the frame's
      // left inset and width so the line and the duck start at the first
      // vertical line on load and end at the last one.
      const heroEl = page?.getElementsByClassName(styles.hero)[0];
      const frameEl = page?.getElementsByClassName(styles.heroInner)[0];
      const contentEl = page?.getElementsByClassName(styles.heroContent)[0];
      if (heroEl && frameEl) {
        const heroRect = heroEl.getBoundingClientRect();
        const frameRect = frameEl.getBoundingClientRect();
        const start = Math.round((frameRect.left - heroRect.left) * 100) / 100;
        const width = Math.round(frameRect.width * 100) / 100;
        page?.style.setProperty("--app-frame-start", `${start}px`);
        page?.style.setProperty("--app-frame-width", `${width}px`);
        // Split the hero into the breadcrumb band that scrolls off the top and
        // the body that pins below it. --app-hero-crumb is the negative sticky
        // offset (so the crumbs scroll out of view) and --app-hero-pinned is the
        // hero's remaining visible height (so the sticky TOC and in-page anchor
        // jumps clear the pinned hero). Both are parent-minus-child offsets, so
        // they stay correct whether the hero is in flow or stuck.
        if (contentEl) {
          const contentRect = contentEl.getBoundingClientRect();
          // Geometry of the hero split, independent of whether it is currently
          // pinned (both are parent-minus-child offsets): the breadcrumb band
          // that scrolls off the top, and the body that would pin below it.
          const crumbBand = Math.round((contentRect.top - heroRect.top) * 100) / 100;
          const contentBand = Math.round((heroRect.bottom - contentRect.top) * 100) / 100;
          // Only pin the hero in the two-column layout AND when doing so still
          // leaves a usable reading strip below it. On short viewports — or when
          // the hero is tall (e.g. the CLI install bar) — release it so the
          // article isn't squeezed into a narrow horizontal strip. Driven here
          // rather than by a fixed max-height media query so the threshold
          // adapts to each page's actual hero height.
          const twoColumn = window.matchMedia("(min-width: 75rem)").matches;
          const roomBelow = el.clientHeight - contentBand;
          const shouldPin = twoColumn && roomBelow >= MIN_HERO_READING;
          const crumb = shouldPin ? crumbBand : 0;
          const pinned = shouldPin ? contentBand : 0;
          if (page) page.dataset.heroPin = shouldPin ? "true" : "false";
          page?.style.setProperty("--app-hero-crumb", `${crumb}px`);
          page?.style.setProperty("--app-hero-pinned", `${pinned}px`);
          setPinnedHeight((prev) =>
            Math.abs(prev - pinned) > 0.5 ? pinned : prev,
          );
        }
      }
    };
    setRegion();
    window.addEventListener("resize", setRegion);
    // The hero's height settles after fonts load and the install bar lays out,
    // so re-measure whenever it resizes to keep --app-hero-crumb / -pinned exact
    // (the offsets are scroll-invariant, so observing while pinned is safe).
    const heroEl = page?.getElementsByClassName(styles.hero)[0];
    let observer: ResizeObserver | undefined;
    if (heroEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => setRegion());
      observer.observe(heroEl);
    }
    return () => {
      window.removeEventListener("resize", setRegion);
      observer?.disconnect();
    };
  }, []);

  // Drive the hero's green bottom line as a reading-progress indicator. The
  // "finish line" is the scroll position where the last article title reaches
  // the reading zone, so the line fills to the very last vertical gridline
  // exactly when the reader arrives at that title, and the duck bursts into
  // confetti at the end of the line. An ease-out mapping keeps the line visibly
  // moving from the very first scroll.
  React.useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const page = el.parentElement;
    const lastId = tocSections[tocSections.length - 1]?.id;
    let lastHeadingEl: HTMLElement | null = null;
    const setProgress = () => {
      if (!lastHeadingEl && lastId) {
        const sectionEl = document.getElementById(lastId);
        lastHeadingEl =
          (sectionEl?.querySelector("h2") as HTMLElement | null) ?? sectionEl;
      }
      const rootRect = el.getBoundingClientRect();
      let finish = el.scrollHeight - el.clientHeight;
      if (lastHeadingEl) {
        const headingRect = lastHeadingEl.getBoundingClientRect();
        const headingOffset = headingRect.top - rootRect.top + el.scrollTop;
        finish = Math.max(1, headingOffset - rootRect.height * 0.6);
      }
      const progress = finish > 0 ? Math.min(1, el.scrollTop / finish) : 0;
      const eased = Math.max(progress > 0 ? Math.pow(progress, 0.5) : 0, 0.055);
      page?.style.setProperty("--app-progress", String(eased));
      setShowBackToTop(el.scrollTop > 200);
      const reached = progress >= 1;
      if (reached !== heroBurstRef.current) {
        heroBurstRef.current = reached;
        setHeroBurst(reached);
      }
    };
    setProgress();
    el.addEventListener("scroll", setProgress, { passive: true });
    window.addEventListener("resize", setProgress);
    return () => {
      el.removeEventListener("scroll", setProgress);
      window.removeEventListener("resize", setProgress);
    };
  }, [tocSections]);

  return (
    <Box className={styles.page} backgroundColor="default" data-mode={colorMode}>
      <SkipLink />
      <header className={styles.topBar}>
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
        <Box as="section" className={styles.hero}>
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
