import { ArrowUpIcon } from "@primer/octicons-react";
import { Avatar, Box, Button, Heading, Text } from "@primer/react-brand";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

import { PageShell } from "./PageShell";
import type { SearchItem } from "./searchIndex";
import contributorsStyles from "./styles/contributorsPage.module.css";
import styles from "./styles/styles.module.css";

const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

/** A contributor as recorded in the repository's `.all-contributorsrc`. */
export type Contributor = {
  login: string;
  name: string;
  avatarUrl: string;
  profileUrl: string;
};

/**
 * The contributors page, ported from the design prototype's `contributors.tsx`.
 * The prototype's static `contributors.ts` array is replaced by build-time data
 * read from `.all-contributorsrc`; the layout and interactions are unchanged.
 */
export function ContributorsPage({
  contributors,
  searchIndex,
}: {
  contributors: Contributor[];
  searchIndex?: SearchItem[];
}) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const total = contributors.length;

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 200);
    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <PageShell
      styles={styles}
      searchIndex={searchIndex}
      contributorsTotal={total}
      contributorsCurrent
      searchAriaLabel="Search the library"
    >
      <Box className={contributorsStyles.hero}>
        <div className={contributorsStyles.heroInner}>
          <Heading as="h1" size="3" className={contributorsStyles.heroHeading}>
            Our contributors
          </Heading>
          <Text
            as="p"
            size="300"
            variant="muted"
            className={contributorsStyles.heroText}
          >
            Thank you to the {total.toLocaleString()} people who have shared
            ideas, examples, and improvements with Awesome Copilot.
          </Text>
          <Button as="a" href={CONTRIBUTING_URL} variant="primary">
            Become a contributor
          </Button>
        </div>
      </Box>

      <section className={contributorsStyles.section} aria-label="Contributors">
        <div className={contributorsStyles.sectionInner}>
          <ul className={contributorsStyles.grid}>
            {contributors.map((contributor) => (
              <li
                className={contributorsStyles.gridCell}
                key={contributor.login}
              >
                <a
                  className={contributorsStyles.contributorLink}
                  href={contributor.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Avatar
                    src={contributor.avatarUrl}
                    alt=""
                    size={64}
                    loading="lazy"
                  />
                  <span className={contributorsStyles.contributorName}>
                    {contributor.name}
                  </span>
                  <span className={contributorsStyles.contributorLogin}>
                    @{contributor.login}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <button
        type="button"
        className={clsx(
          contributorsStyles.backToTop,
          showBackToTop && contributorsStyles.backToTopVisible,
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
