import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  Grid,
  Heading,
  Image,
  Pagination,
  Section,
  Stack,
  Text,
  useTheme,
} from "@primer/react-brand";

import styles from "./styles/learning-hub-copilot-app.module.css";
import { DuckIcon } from "./DuckIcon";
import { PlaybookIcon } from "./PlaybookIcon";
import { PageShell } from "./PageShell";
import { ScrambleText } from "./ScrambleText";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import { contributorsTotal as siteContributorsTotal } from "../../lib/site-data";

type Topic =
  | "Getting started"
  | "Agents & Skills"
  | "Customization"
  | "Automation"
  | "Extensions & MCP"
  | "CLI";
type Kind = "Guide" | "Tutorial" | "Terminology" | "Example" | "Workshop";

/** Article frontmatter projected out of the `docs` collection at build time. */
export type PlaybookArticle = {
  /** Collection entry id, e.g. `learning-hub/agentic-workflows`. */
  id: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  /** ISO date string; the collection stores a Date, serialised across the island boundary. */
  lastUpdated?: string;
};

type Entry = PlaybookArticle & {
  topic: Topic;
  kind: Kind;
  isNew?: boolean;
};

// The prototype hardcoded a topic/kind per article. Real frontmatter only
// carries free-form `tags`, so the two facets are derived from them; the first
// matching tag wins, in the order listed here.
const TOPIC_BY_TAG: [string, Topic][] = [
  ["cli", "CLI"],
  ["mcp", "Extensions & MCP"],
  ["canvases", "Extensions & MCP"],
  ["canvas-extensions", "Extensions & MCP"],
  ["extensions", "Extensions & MCP"],
  ["plugins", "Extensions & MCP"],
  ["agents", "Agents & Skills"],
  ["subagents", "Agents & Skills"],
  ["skills", "Agents & Skills"],
  ["orchestration", "Agents & Skills"],
  ["coding-agent", "Automation"],
  ["automation", "Automation"],
  ["automations", "Automation"],
  ["workflows", "Automation"],
  ["hooks", "Automation"],
  ["github-actions", "Automation"],
  ["customization", "Customization"],
  ["instructions", "Customization"],
  ["configuration", "Customization"],
];

const KIND_BY_TAG: [string, Kind][] = [
  ["workshop", "Workshop"],
  ["glossary", "Terminology"],
  ["terminology", "Terminology"],
  ["reference", "Terminology"],
  ["examples", "Example"],
  ["tutorial", "Tutorial"],
  ["setup", "Tutorial"],
  ["desktop", "Tutorial"],
];

function deriveTopic(tags: string[]): Topic {
  for (const [tag, topic] of TOPIC_BY_TAG) {
    if (tags.includes(tag)) return topic;
  }
  return "Getting started";
}

function deriveKind(tags: string[]): Kind {
  for (const [tag, kind] of KIND_BY_TAG) {
    if (tags.includes(tag)) return kind;
  }
  return "Guide";
}

type FilterGroupId = "topic" | "kind";

// The prototype also offered a "Level" facet. No article frontmatter records a
// level, so the group is omitted rather than populated with invented values.
const filterGroups: { id: FilterGroupId; label: string; options: string[] }[] = [
  {
    id: "topic",
    label: "Topic",
    options: [
      "Getting started",
      "Agents & Skills",
      "Customization",
      "Automation",
      "Extensions & MCP",
      "CLI",
    ],
  },
  {
    id: "kind",
    label: "Content type",
    options: ["Guide", "Tutorial", "Terminology", "Example", "Workshop"],
  },
];

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = {
  topic: [],
  kind: [],
};

const recommendedCards = [
  {
    id: "desktop-app",
    page: "github-copilot-app",
    labels: [] as string[],
    title: "Desktop App",
    description:
      "Explore the GitHub Copilot app — a control center for directing multiple agents in parallel. Perfect for agent-native development and parallel work with isolated worktrees.",
  },
  {
    id: "reference",
    page: "github-copilot-terminology-glossary",
    labels: [] as string[],
    title: "Terminology",
    description:
      "Quick-lookup resources to keep handy while you work. Browse the GitHub Copilot Terminology Glossary for definitions of common terms and concepts.",
  },
  {
    id: "terminal",
    page: "cli-for-beginners",
    labels: [] as string[],
    title: "Copilot CLI",
    description:
      "Looking for a guided path into GitHub Copilot from the terminal? Explore the Copilot CLI for Beginners with a text-based experience or the YouTube video series.",
  },
  {
    id: "fundamentals",
    page: "what-are-agents-skills-instructions",
    labels: [] as string[],
    title: "Fundamentals",
    description:
      "Essential concepts to tailor GitHub Copilot beyond its default experience. Start with What are Agents, Skills, and Instructions and work through the full track to master every customization primitive. For delegation and orchestration patterns, continue with Agents and Subagents.",
  },
  {
    id: "automations",
    page: "using-automations-in-copilot-app",
    labels: [] as string[],
    title: "Automations",
    description:
      "Start with Using Automations in the GitHub Copilot app for templates, setup guidance, and real examples.",
  },
  {
    id: "canvases",
    page: "working-with-canvas-extensions",
    labels: [] as string[],
    title: "Canvases",
    description:
      "Learn Working with Canvas Extensions to create and evolve interactive canvases with /create-canvas.",
  },
  {
    id: "workshop",
    page: "copilot-workshops",
    labels: [] as string[],
    title: "Workshop",
    description:
      "Prefer to learn by building? Work through Hands-on with GitHub Copilot's agents — a hands-on workshop with four harnesses (VS Code, Copilot CLI, Copilot app, and cloud agent) built around a shared Tailspin Toys backlog.",
  },
];

export function PlaybookIndex({
  articles,
  searchIndex = [],
  contributorsTotal = siteContributorsTotal,
}: {
  articles: PlaybookArticle[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  return (
    <PageShell
      styles={styles}
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search the Copilot Playbook"
    >
      <PlaybookIndexBody articles={articles} searchIndex={searchIndex} />
    </PageShell>
  );
}

function PlaybookIndexBody({
  articles,
  searchIndex,
}: {
  articles: PlaybookArticle[];
  searchIndex: SearchItem[];
}) {
  const { colorMode } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [heroSearchFocused, setHeroSearchFocused] = useState(false);
  const [heroActiveIndex, setHeroActiveIndex] = useState(-1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const heroSearchInputRef = React.useRef<HTMLInputElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const newest = articles.reduce<string | undefined>((latest, article) => {
      if (!article.lastUpdated) return latest;
      return !latest || article.lastUpdated > latest
        ? article.lastUpdated
        : latest;
    }, undefined);
    return articles.map((article) => ({
      ...article,
      topic: deriveTopic(article.tags),
      kind: deriveKind(article.tags),
      isNew: newest !== undefined && article.lastUpdated === newest,
    }));
  }, [articles]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement | null;
        const isTyping =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable === true;
        if (!isTyping) {
          event.preventDefault();
          heroSearchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const REC_PER_PAGE = 3;
  const recPageCount = Math.ceil(recommendedCards.length / REC_PER_PAGE);
  const [recPage, setRecPage] = React.useState(0);
  const changeRecPage = (direction: 1 | -1) => {
    setRecPage((page) => (page + direction + recPageCount) % recPageCount);
  };
  const visibleRecCards = recommendedCards.slice(
    recPage * REC_PER_PAGE,
    recPage * REC_PER_PAGE + REC_PER_PAGE,
  );

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const topicOk =
        filters.topic.length === 0 || filters.topic.includes(entry.topic);
      const kindOk =
        filters.kind.length === 0 || filters.kind.includes(entry.kind);
      const searchOk =
        query.length === 0 ||
        [entry.title, entry.description, entry.topic, entry.kind, ...entry.tags]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return topicOk && kindOk && searchOk;
    });
  }, [entries, filters, searchTerm]);

  const sortedEntries = useMemo(() => {
    return sortOrder === "oldest"
      ? [...filteredEntries].reverse()
      : filteredEntries;
  }, [filteredEntries, sortOrder]);

  const articleMatches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length === 0) return [];
    return entries
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [entries, searchTerm]);

  const resourceMatches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length === 0) return [];
    return searchIndex
      .filter(
        (resource) =>
          resource.title.toLowerCase().includes(query) ||
          resource.description.toLowerCase().includes(query) ||
          resource.category.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [searchIndex, searchTerm]);

  const trimmedSearch = searchTerm.trim();
  const heroSearchOpen = heroSearchFocused && trimmedSearch.length > 0;
  const hasSearchResults =
    articleMatches.length > 0 || resourceMatches.length > 0;

  const heroOptionCount = articleMatches.length + resourceMatches.length;

  // A fresh query re-orders the list, so drop any stale highlight.
  React.useEffect(() => {
    setHeroActiveIndex(-1);
  }, [trimmedSearch]);

  React.useEffect(() => {
    if (heroActiveIndex < 0) return;
    document
      .getElementById(`hero-search-option-${heroActiveIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [heroActiveIndex]);

  const handleResultsKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    optionCount: number,
    activeIndex: number,
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>,
    optionIdPrefix: string,
  ) => {
    if (optionCount === 0) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % optionCount);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(optionCount - 1);
        break;
      case "Enter":
        if (activeIndex >= 0) {
          event.preventDefault();
          document.getElementById(`${optionIdPrefix}-${activeIndex}`)?.click();
        }
        break;
    }
  };

  const toggleFilter = (groupId: FilterGroupId, option: string) => {
    setFilters((prev) => {
      const current = prev[groupId];
      const next = current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option];
      return { ...prev, [groupId]: next };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setCurrentPage(1);
  };

  const activeFilterCount = filters.topic.length + filters.kind.length;
  const hasActiveFilters = activeFilterCount > 0;

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const visibleEntries = sortedEntries.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <>
      <Box className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTop}>
            <span className={styles.heroIcon} aria-hidden="true">
              <PlaybookIcon size={44} />
            </span>
            <Heading as="h1" size="3" className={styles.heroHeading}>
              Copilot Playbook
            </Heading>
          </div>
          <label className={styles.heroSearch}>
            <input
              type="text"
              ref={heroSearchInputRef}
              className={styles.heroSearchInput}
              aria-label="Search the Copilot Playbook"
              role="combobox"
              aria-expanded={heroSearchOpen}
              aria-controls="hero-search-results"
              aria-activedescendant={
                heroSearchOpen && heroActiveIndex >= 0
                  ? `hero-search-option-${heroActiveIndex}`
                  : undefined
              }
              autoComplete="off"
              value={searchTerm}
              onFocus={() => setHeroSearchFocused(true)}
              onBlur={() => setHeroSearchFocused(false)}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchTerm("");
                  setHeroSearchFocused(false);
                  setHeroActiveIndex(-1);
                  event.currentTarget.blur();
                  return;
                }
                handleResultsKeyDown(
                  event,
                  heroOptionCount,
                  heroActiveIndex,
                  setHeroActiveIndex,
                  "hero-search-option",
                );
              }}
            />
            {searchTerm === "" && (
              <div className={styles.heroSearchHint} aria-hidden="true">
                <span className={styles.heroSearchCaret} />
                <span className={styles.heroSearchHintMono}>
                  <ScrambleText
                    text="What would you like to learn?"
                    cursor="fade"
                  />
                </span>
                <span className={styles.heroSearchDuck}>
                  <DuckIcon size={22} />
                </span>
              </div>
            )}
            {searchTerm === "" ? (
              <kbd className={styles.heroSearchKbd}>/</kbd>
            ) : (
              <button
                type="button"
                className={clsx(
                  styles.heroSearchKbd,
                  styles.heroSearchKbdButton,
                )}
                aria-label="Clear search"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
              >
                /
              </button>
            )}
            {heroSearchOpen && (
              <div
                id="hero-search-results"
                className={styles.heroSearchResults}
                role="listbox"
                aria-label="Search results"
                onMouseDown={(event) => event.preventDefault()}
              >
                {hasSearchResults ? (
                  <>
                    {articleMatches.length > 0 && (
                      <div className={styles.heroSearchGroup}>
                        <p className={styles.heroSearchGroupLabel}>Articles</p>
                        {articleMatches.map((entry, i) => (
                          <a
                            key={entry.id}
                            id={`hero-search-option-${i}`}
                            href={entry.href}
                            className={clsx(
                              styles.heroSearchResult,
                              heroActiveIndex === i &&
                                styles.heroSearchResultActive,
                            )}
                            role="option"
                            aria-selected={heroActiveIndex === i}
                            onMouseEnter={() => setHeroActiveIndex(i)}
                          >
                            <span className={styles.heroSearchResultText}>
                              {entry.title}
                            </span>
                            <ArrowUpRightIcon
                              size={16}
                              className={styles.heroSearchResultIcon}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {resourceMatches.length > 0 && (
                      <div className={styles.heroSearchGroup}>
                        <p className={styles.heroSearchGroupLabel}>Resources</p>
                        {resourceMatches.map((resource, j) => {
                          const optionIndex = articleMatches.length + j;
                          return (
                            <a
                              key={`${resource.category}-${resource.title}`}
                              id={`hero-search-option-${optionIndex}`}
                              href={resource.href}
                              className={clsx(
                                styles.heroSearchResult,
                                heroActiveIndex === optionIndex &&
                                  styles.heroSearchResultActive,
                              )}
                              role="option"
                              aria-selected={heroActiveIndex === optionIndex}
                              onMouseEnter={() => setHeroActiveIndex(optionIndex)}
                            >
                              <span className={styles.heroSearchResultText}>
                                {resource.title}
                                <span className={styles.heroSearchResultMeta}>
                                  {resource.category}
                                </span>
                              </span>
                              <ArrowUpRightIcon
                                size={16}
                                className={styles.heroSearchResultIcon}
                              />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      className={styles.heroSearchMore}
                      onClick={() => {
                        setHeroSearchFocused(false);
                        document
                          .getElementById("catalog")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    >
                      See all results for “{trimmedSearch}”
                    </button>
                  </>
                ) : (
                  <p className={styles.heroSearchEmpty}>
                    No results for “{trimmedSearch}”
                  </p>
                )}
              </div>
            )}
          </label>
        </div>
      </Box>

      <Box className={styles.recommended}>
        <div className={styles.recommendedInner}>
          <div className={styles.recommendedHeader}>
            <Heading as="h2" size="5" className={styles.recommendedTitle}>
              Get started
            </Heading>
            <div className={styles.carouselNav}>
              <button
                type="button"
                className={styles.carouselButton}
                aria-label="Previous recommendations"
                onClick={() => changeRecPage(-1)}
              >
                <ArrowLeftIcon size={20} />
              </button>
              <button
                type="button"
                className={styles.carouselButton}
                aria-label="Next recommendations"
                onClick={() => changeRecPage(1)}
              >
                <ArrowRightIcon size={20} />
              </button>
            </div>
          </div>
          <div className={styles.carouselTrack} key={recPage}>
            {visibleRecCards.map((rec) => (
              <a
                key={rec.id}
                href={pageHref(rec.page)}
                data-rec-card
                className={styles.recCard}
              >
                <div className={styles.recCardLabels}>
                  {rec.labels.map((label) => (
                    <span key={label} className={styles.recCardLabel}>
                      {label}
                    </span>
                  ))}
                </div>
                <h3 className={styles.recCardHeading}>
                  {rec.title}
                  <ArrowUpRightIcon size={20} />
                </h3>
                <p className={styles.recCardDesc}>{rec.description}</p>
                <div
                  aria-hidden="true"
                  className={clsx(
                    styles.recCardImage,
                    rec.id === "desktop-app" && styles.recCardImageDesktop,
                    rec.id === "terminal" && styles.recCardImageTerminal,
                    rec.id === "fundamentals" && styles.recCardImageFundamentals,
                    rec.id === "automations" && styles.recCardImageAutomations,
                    rec.id === "canvases" && styles.recCardImageCanvases,
                    rec.id === "reference" && styles.recCardImageReference,
                  )}
                />
              </a>
            ))}
          </div>
        </div>
      </Box>

      <Section
        id="catalog"
        className={styles.catalogSection}
        paddingBlockStart="none"
        paddingBlockEnd="none"
      >
        <div className={styles.catalogHeader}>
          <Heading as="h2" size="5" className={styles.recommendedTitle}>
            Articles
          </Heading>
          <div className={styles.sortControl}>
            <span className={styles.sortLabel}>Sort by:</span>
            <details className={styles.sortMenu}>
              <summary className={styles.sortTrigger}>
                {sortOrder === "newest" ? "Newest" : "Oldest"}
                <ChevronDownIcon size={16} className={styles.sortChevron} />
              </summary>
              <div className={styles.sortOverlay} role="menu">
                {(["newest", "oldest"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortOrder === value}
                    className={clsx(
                      styles.sortOption,
                      sortOrder === value && styles.sortOptionActive,
                    )}
                    onClick={(event) => {
                      setSortOrder(value);
                      setCurrentPage(1);
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    {value === "newest" ? "Newest" : "Oldest"}
                    <CheckIcon
                      size={16}
                      className={styles.sortOptionCheck}
                      aria-hidden={sortOrder !== value}
                    />
                  </button>
                ))}
              </div>
            </details>
          </div>
          <button
            type="button"
            className={styles.filterToggle}
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen((open) => !open)}
          >
            <span>
              Filters{hasActiveFilters ? ` (${activeFilterCount})` : ""}
            </span>
            <ChevronDownIcon
              size={16}
              className={clsx(
                styles.filterToggleChevron,
                mobileFiltersOpen && styles.filterToggleChevronOpen,
              )}
            />
          </button>
        </div>
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter guide sections">
            <div
              className={clsx(
                styles.filterBody,
                !mobileFiltersOpen && styles.filterBodyCollapsed,
              )}
            >
              {filterGroups.map((group) => (
                <div className={styles.filterGroup} key={group.id}>
                  <Text as="h2" size="100" className={styles.filterHeading}>
                    {group.label}
                  </Text>
                  <div className={styles.filterOptions}>
                    {group.options.map((option) => (
                      <div className={styles.filterOption} key={option}>
                        <FormControl>
                          <Checkbox
                            checked={filters[group.id].includes(option)}
                            onChange={() => toggleFilter(group.id, option)}
                          />
                          <FormControl.Label>{option}</FormControl.Label>
                        </FormControl>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {hasActiveFilters ? (
                <div className={styles.filterActions}>
                  <Button
                    variant="secondary"
                    size="medium"
                    hasArrow={false}
                    onClick={clearFilters}
                  >
                    Clear all ({activeFilterCount})
                  </Button>
                </div>
              ) : null}
            </div>
          </aside>

          <Box className={styles.catalogMain}>
            <Box className={styles.gridFrame} data-mode={colorMode}>
              <Box className={styles.gridContent}>
                <Grid
                  className={styles.threeUp}
                  columnGap="none"
                  rowGap="none"
                  enableGutters={false}
                >
                  {visibleEntries.map((entry) => (
                    <Grid.Column
                      key={entry.id}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={styles.col}
                    >
                      <Box className={clsx(styles.item, styles.itemHover)}>
                        <a href={entry.href} className={styles.catalogCard}>
                          <div className={styles.recCardLabels}>
                            {entry.isNew ? (
                              <span
                                className={clsx(
                                  styles.recCardLabel,
                                  styles.recCardLabelAccent,
                                )}
                              >
                                New
                              </span>
                            ) : null}
                            <span className={styles.recCardLabel}>
                              {entry.topic}
                            </span>
                            <span
                              className={clsx(
                                styles.recCardLabel,
                                styles.recCardLabelOutline,
                              )}
                            >
                              {entry.kind}
                            </span>
                          </div>
                          <h3 className={styles.recCardHeading}>
                            {entry.title}
                            <ArrowUpRightIcon size={20} />
                          </h3>
                          <p className={styles.recCardDesc}>
                            {entry.description}
                          </p>
                        </a>
                      </Box>
                    </Grid.Column>
                  ))}
                </Grid>
              </Box>
            </Box>

            {filteredEntries.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No sections match the selected filters.
                </Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Section>

      <div className={styles.rule} aria-hidden="true" />

      <Box className={styles.paginationRow}>
        <Stack direction="horizontal" justifyContent="center" padding="none">
          <Pagination
            className={styles.pagination}
            pageCount={pageCount}
            currentPage={page}
            onPageChange={(e, n) => {
              e.preventDefault();
              setCurrentPage(n);
            }}
          />
        </Stack>
      </Box>

      <Box className={styles.dividerFrame}>
        <Section paddingBlockStart="condensed" paddingBlockEnd="none">
          <Stack justifyContent="center" padding="none">
            <Image
              src="/media/brand-divider-copilot-jumping.webp"
              alt=""
              width={1738}
              height={196}
              loading="lazy"
              decoding="async"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </Stack>
        </Section>
      </Box>
    </>
  );
}
