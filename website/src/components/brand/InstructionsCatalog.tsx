import { ChevronDownIcon, DownloadIcon, MarkGithubIcon } from "@primer/octicons-react";
import {
  ActionMenu,
  Box,
  Button,
  CTABanner,
  Card,
  Checkbox,
  FormControl,
  Grid,
  Heading,
  Pagination,
  Section,
  Stack,
  Text,
  useTheme,
} from "@primer/react-brand";
import { clsx } from "clsx";
import { useMemo, useState } from "react";

import { PageShell } from "./PageShell";
import { InstructionsIcon } from "./InstructionsIcon";
import { useCatalogPageFocus } from "./useCatalogPageFocus";
import { CatalogSortControl, CATALOG_SORT_OPTIONS } from "./CatalogSortControl";
import {
  daysSince,
  toggleValue,
  updatedBuckets,
  updatedBucketOf,
} from "./catalogFilters";
import { pageHref } from "./pageHref";
import { downloadFile } from "./resourceActions";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/instructions.module.css";

const CONTRIBUTE_URL =
  "https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md#how-to-contribute";

const REQUEST_URL = "https://github.com/github/awesome-copilot/issues/new";

const RAW_BASE = "https://raw.githubusercontent.com/github/awesome-copilot/main";
const GITHUB_BASE = "https://github.com/github/awesome-copilot/blob/main";

/** Sentinel emitted by the data generator for items with no file extensions. */
const NO_EXTENSION = "(none)";

/** An instruction record as emitted into public/data/instructions.json. */
export type InstructionItem = {
  id: string;
  title: string;
  description: string;
  applyTo: string | null;
  applyToPatterns: string[];
  extensions: string[];
  path: string;
  filename: string;
  lastUpdated: string;
};

export type InstructionFilters = {
  patterns: string[];
  extensions: string[];
};

const instructionSourceUrl = (instruction: InstructionItem) =>
  `${GITHUB_BASE}/${instruction.path}`;

/**
 * VS Code deep link for instructions, matching the scheme used by the detail
 * pages (`src/lib/detail-page.ts`): the `chat-instructions` command wrapped in
 * the aka.ms redirector.
 */
const installUrl = (instruction: InstructionItem, insiders = false) => {
  const rawUrl = `${RAW_BASE}/${instruction.path}`;
  const editor = insiders ? "vscode-insiders" : "vscode";
  const innerUrl = `${editor}:chat-instructions/install?url=${encodeURIComponent(rawUrl)}`;
  return `https://aka.ms/awesome-copilot/install/instructions?url=${encodeURIComponent(innerUrl)}`;
};

const downloadUrl = (instruction: InstructionItem) =>
  `${RAW_BASE}/${instruction.path}`;

type SortMode = "az" | "newest";

type FilterGroupId = "pattern" | "extension" | "updated";

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = { pattern: [], extension: [], updated: [] };

const PAGE_SIZE = 6;

/**
 * Long facets collapse behind a "Show N more" toggle, matching the prototype's
 * extensions page. Real data produces far longer option lists than the
 * prototype's hardcoded arrays, so every catalog needs this.
 */
const FILTER_COLLAPSE_LIMIT = 10;

/**
 * The Instructions catalog, ported from the design prototype's
 * `instructions.tsx`. The prototype's hardcoded array and filter options are
 * replaced by build-time data; the layout, filters, and interactions are
 * unchanged.
 */
export function InstructionsCatalog({
  instructions,
  filters: filterOptions,
  searchIndex,
  contributorsTotal,
}: {
  instructions: InstructionItem[];
  filters?: InstructionFilters;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  const { colorMode } = useTheme();
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [currentPage, setCurrentPage] = useState(1);
  useCatalogPageFocus(currentPage);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expandedGroups, setExpandedGroups] = useState<
    Record<FilterGroupId, boolean>
  >({ pattern: false, extension: false, updated: false });
  const toggleGroupExpanded = (groupId: FilterGroupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterGroups = useMemo<
    { id: FilterGroupId; label: string; options: string[] }[]
  >(
    () => [
      {
        id: "pattern",
        label: "Applies to",
        options: filterOptions?.patterns ?? [],
      },
      {
        id: "extension",
        label: "File extension",
        options: filterOptions?.extensions ?? [],
      },
      {
        id: "updated",
        label: "Last updated",
        options: updatedBuckets.map((bucket) => bucket.label),
      },
    ],
    [filterOptions],
  );

  const sortedInstructions = useMemo(() => {
    const copy = instructions.filter((item) => {
      const patternOk =
        filters.pattern.length === 0 ||
        filters.pattern.some((pattern) => item.applyToPatterns.includes(pattern));
      const extensionOk =
        filters.extension.length === 0 ||
        filters.extension.some((ext) =>
          ext === NO_EXTENSION
            ? item.extensions.length === 0
            : item.extensions.includes(ext),
        );
      const updatedOk =
        filters.updated.length === 0 ||
        filters.updated.includes(updatedBucketOf(daysSince(item.lastUpdated)));
      return patternOk && extensionOk && updatedOk;
    });
    if (sortMode === "newest") {
      copy.sort((a, b) => daysSince(a.lastUpdated) - daysSince(b.lastUpdated));
    } else {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    }
    return copy;
  }, [instructions, sortMode, filters]);

  const toggleFilter = (groupId: FilterGroupId, option: string) => {
    setFilters((prev) => ({
      ...prev,
      [groupId]: toggleValue(prev[groupId], option),
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setCurrentPage(1);
  };

  const activeFilterCount =
    filters.pattern.length + filters.extension.length + filters.updated.length;
  const hasActiveFilters = activeFilterCount > 0;
  const pageCount = Math.max(
    1,
    Math.ceil(sortedInstructions.length / PAGE_SIZE),
  );
  const page = Math.min(currentPage, pageCount);
  const visibleInstructions = sortedInstructions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <PageShell
      styles={styles}
      currentPage="instructions"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search instructions"
    >
      <Box className={clsx(styles.hero, "heading-texture")}>
        <div className={styles.heroInner}>
          <InstructionsIcon className={styles.heroIcon} />
          <Heading as="h1" size="3" className={styles.heroHeading}>
            Instructions
          </Heading>
          <Text as="p" size="300" variant="muted" className={styles.heroText}>
            Community-curated standards and best practices that teach Copilot
            your team&rsquo;s conventions.
          </Text>
        </div>
      </Box>

      <Section id="catalog" tabIndex={-1} paddingBlockStart="none" paddingBlockEnd="none">
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter instructions">
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
            <div
              className={clsx(
                styles.filterBody,
                !mobileFiltersOpen && styles.filterBodyCollapsed,
              )}
            >
              {filterGroups.map((group) => {
                const isExpandable =
                  group.options.length > FILTER_COLLAPSE_LIMIT;
                const expanded = expandedGroups[group.id];
                const visibleOptions =
                  isExpandable && !expanded
                    ? group.options.slice(0, FILTER_COLLAPSE_LIMIT)
                    : group.options;
                return (
                  <div className={styles.filterGroup} key={group.id}>
                    <Text as="h2" size="100" className={styles.filterHeading}>
                      {group.label}
                    </Text>
                    <div className={styles.filterOptions}>
                      {visibleOptions.map((option) => (
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
                    {isExpandable ? (
                      <button
                        type="button"
                        className={styles.showMoreButton}
                        aria-expanded={expanded}
                        onClick={() => toggleGroupExpanded(group.id)}
                      >
                        {expanded
                          ? "Show less"
                          : `Show ${group.options.length - FILTER_COLLAPSE_LIMIT} more`}
                      </button>
                    ) : null}
                  </div>
                );
              })}
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
            <Box className={styles.toolbar}>
              <CatalogSortControl
                ariaLabel="Sort instructions"
                value={sortMode}
                options={CATALOG_SORT_OPTIONS}
                styles={styles}
                onChange={(value) => {
                  setSortMode(value);
                  setCurrentPage(1);
                }}
              />
            </Box>
            <Box className={styles.gridFrame} data-mode={colorMode}>
              <Box className={styles.gridContent}>
                <Grid
                  className={styles.threeUp}
                  columnGap="none"
                  rowGap="none"
                  enableGutters={false}
                >
                  {visibleInstructions.map((item) => (
                    <Grid.Column
                      key={item.id}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={styles.col}
                    >
                      <Box className={clsx(styles.item, styles.itemHover)}>
                        <Card
                          href={pageHref(`instruction/${item.id}`)}
                          fullWidth
                          ctaVariant="none"
                          backgroundColor="none"
                          className={styles.card}
                        >
                          <Card.Heading as="h2">{item.title}</Card.Heading>
                          <Card.Description>
                            <span className={styles.cardDescText}>
                              {item.description}
                            </span>
                          </Card.Description>
                        </Card>
                        <div className={styles.cardActions}>
                          <ActionMenu mode="split-button" menuAlignment="start">
                            <ActionMenu.Button
                              as="a"
                              href={installUrl(item)}
                              variant="primary"
                            >
                              Install
                            </ActionMenu.Button>
                            <ActionMenu.Overlay
                              aria-label={`Install ${item.title} to your editor`}
                            >
                              <ActionMenu.Item
                                as="a"
                                href={installUrl(item, false)}
                              >
                                VS Code
                              </ActionMenu.Item>
                              <ActionMenu.Item
                                as="a"
                                href={installUrl(item, true)}
                              >
                                VS Code Insiders
                              </ActionMenu.Item>
                            </ActionMenu.Overlay>
                          </ActionMenu>
                          <Button
                            as="button"
                            variant="secondary"
                            onClick={() =>
                              void downloadFile(downloadUrl(item), item.filename)
                            }
                            aria-label={`Download ${item.title} instruction file`}
                            className={styles.iconButton}
                          >
                            <DownloadIcon />
                          </Button>
                          <Button
                            as="a"
                            href={instructionSourceUrl(item)}
                            variant="secondary"
                            aria-label={`View ${item.title} instruction on GitHub`}
                            className={styles.iconButton}
                          >
                            <MarkGithubIcon />
                          </Button>
                        </div>
                      </Box>
                    </Grid.Column>
                  ))}
                </Grid>
              </Box>
            </Box>

            {sortedInstructions.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No instructions match the selected filters.
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

      <div className={styles.rule} aria-hidden="true" />

      <Box className={styles.ctaFrame}>
        <Section paddingBlockStart="none" paddingBlockEnd="none">
          <Box className={styles.ctaFrameInner}>
            <CTABanner align="center" backgroundColor="subtle">
              <CTABanner.Heading>
                Can&rsquo;t find the instructions you need?
              </CTABanner.Heading>
              <CTABanner.Description>
                This library is community-built. Share an instruction file you
                use&mdash;or request one&mdash;
                <br />
                to help developers ship faster with GitHub Copilot.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button as="a" href={CONTRIBUTE_URL}>
                  Submit an instruction
                </Button>
                <Button as="a" href={REQUEST_URL}>
                  Request an instruction
                </Button>
              </CTABanner.ButtonGroup>
            </CTABanner>
          </Box>
        </Section>
      </Box>
    </PageShell>
  );
}
