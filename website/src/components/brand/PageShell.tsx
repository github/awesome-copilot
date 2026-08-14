import { MarkGithubIcon } from "@primer/octicons-react";
import { Box, Button, ThemeProvider, useTheme } from "@primer/react-brand";
import type { ReactNode } from "react";

import { ContributorsNavButton } from "./ContributorsNavButton";
import { LanguageSelect } from "./LanguageSelect";
import { LargeFooter } from "./LargeFooter";
import { SkipLink } from "./SkipLink";
import { TopNav } from "./TopNav";
import { TopNavSearch } from "./TopNavSearch";
import { getAwesomeCopilotNavLinks, type AwesomeCopilotPage } from "./navigation";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";

const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

export type PageShellProps = {
  /** Scoped CSS module for the page, providing the topBar/subNav class names. */
  styles: Record<string, string | undefined>;
  /** Catalog page to mark as current in the nav. */
  currentPage?: AwesomeCopilotPage;
  /** Site-wide search index, injected from build-time data. */
  searchIndex?: SearchItem[];
  /** Live contributor count for the nav button. */
  contributorsTotal?: number;
  searchAriaLabel?: string;
  contributorsCurrent?: boolean;
  children: ReactNode;
};

/**
 * Shared chrome for every page: skip link, the combined top navigation
 * (brand mark, Resources menu, Playbook tab, search, contributors, contribute),
 * the `<main>` landmark, and the footer.
 *
 * The prototype repeated this block verbatim at the top of each page; it is
 * extracted here so pages only own their content.
 */
export function PageShell({
  styles,
  currentPage,
  searchIndex = [],
  contributorsTotal = 0,
  searchAriaLabel = "Search the library",
  contributorsCurrent = false,
  children,
}: PageShellProps) {
  return (
    <ThemeProvider colorMode="auto">
      <PageShellBody
        styles={styles}
        currentPage={currentPage}
        searchIndex={searchIndex}
        contributorsTotal={contributorsTotal}
        searchAriaLabel={searchAriaLabel}
        contributorsCurrent={contributorsCurrent}
      >
        {children}
      </PageShellBody>
    </ThemeProvider>
  );
}

/**
 * Inner shell, rendered beneath the ThemeProvider so it can read the resolved
 * colour mode. The prototype mirrors that mode onto `data-mode`, which its CSS
 * modules key their light/dark treatments off.
 */
function PageShellBody({
  styles,
  currentPage,
  searchIndex = [],
  contributorsTotal = 0,
  searchAriaLabel = "Search the library",
  contributorsCurrent = false,
  children,
}: PageShellProps) {
  const { colorMode } = useTheme();
  const subNavLinks = getAwesomeCopilotNavLinks(pageHref, currentPage);
  const contributorsHref = pageHref("contributors");

  return (
    <Box className={styles.page} backgroundColor="default" data-mode={colorMode}>
      <SkipLink />
      <header className={styles.topBar}>
        <nav className={styles.topBarInner} aria-label="Primary">
          <a href={pageHref()} className={styles.subNavTitle}>
            <MarkGithubIcon size={24} />
            Awesome GitHub Copilot
          </a>
          <TopNav
            styles={styles}
            links={subNavLinks}
            contributorsHref={contributorsHref}
            contributorsTotal={contributorsTotal}
            searchIndex={searchIndex}
            contributorsCurrent={contributorsCurrent}
            searchAriaLabel={searchAriaLabel}
          />
          <div className={styles.topBarActions}>
            <TopNavSearch
              index={searchIndex}
              styles={styles}
              inputAriaLabel={searchAriaLabel}
            />
            <ContributorsNavButton
              href={contributorsHref}
              current={contributorsCurrent}
              total={contributorsTotal}
            />
            <LanguageSelect />
            <Button as="a" href={CONTRIBUTING_URL} variant="subtle" size="small">
              Contribute
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <LargeFooter />
    </Box>
  );
}
