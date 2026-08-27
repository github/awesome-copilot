import { ChevronDownIcon, MarkGithubIcon } from "@primer/octicons-react";
import {
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

import { externalRepoUrl, type ExternalSource } from "../../lib/external-source";
import { PageShell } from "./PageShell";
import { PluginsIcon } from "./PluginsIcon";
import { toggleValue } from "./catalogFilters";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/plugins.module.css";

const CONTRIBUTE_URL =
  "https://github.com/github/awesome-copilot/blob/main/docs/README.plugins.md#how-to-contribute";

const REQUEST_URL = "https://github.com/github/awesome-copilot/issues/new";

const GITHUB_TREE = "https://github.com/github/awesome-copilot/tree/main";

type SortMode = "az" | "newest";

/** A plugin record as emitted into public/data/plugins.json. */
export type PluginItem = {
  id: string;
  name: string;
  description: string;
  path: string;
  version?: string | null;
  tags?: string[];
  itemCount: number;
  lastUpdated?: string;
  external?: boolean;
  repository?: string | null;
  homepage?: string | null;
  author?: { name: string; url?: string } | null;
  source?: ExternalSource | null;
};

const sourceUrlOf = (plugin: PluginItem) =>
  plugin.external
    ? externalRepoUrl(plugin.source, [
        plugin.repository,
        plugin.homepage,
        GITHUB_TREE,
      ])
    : `${GITHUB_TREE}/${plugin.path}`;

const sizeBuckets: { label: string; test: (n: number) => boolean }[] = [
  { label: "Single item", test: (n) => n === 1 },
  { label: "2–4 items", test: (n) => n >= 2 && n <= 4 },
  { label: "5+ items", test: (n) => n >= 5 },
];

type FilterGroupId = "source" | "category" | "size";

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = { source: [], category: [], size: [] };

/**
 * Long facets collapse behind a "Show N more" toggle, matching the prototype's
 * extensions page. Real data produces far longer option lists than the
 * prototype's hardcoded arrays, so every catalog needs this.
 */
const FILTER_COLLAPSE_LIMIT = 10;

const sourceOf = (plugin: PluginItem) =>
  plugin.external ? "External" : "Built-in";

const sizeLabelOf = (plugin: PluginItem) =>
  sizeBuckets.find((bucket) => bucket.test(plugin.itemCount))?.label ?? null;

/**
 * The prototype hardcoded twelve category options. Real data carries 585 tags,
 * so the category group keeps the same shape by taking the most-used tags that
 * the build-time filter list offers.
 */
const CATEGORY_LIMIT = 12;

function categoryOptions(plugins: PluginItem[], tags: string[]): string[] {
  const counts = new Map<string, number>();
  for (const plugin of plugins) {
    for (const tag of plugin.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return tags
    .filter((tag) => counts.has(tag))
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, CATEGORY_LIMIT);
}

/**
 * The Plugins catalog, ported from the design prototype's `plugins.tsx`. The
 * prototype's hardcoded array is replaced by build-time data; the layout,
 * filters, and interactions are unchanged.
 */
export function PluginsCatalog({
  plugins,
  searchIndex,
  contributorsTotal,
  tags = [],
}: {
  plugins: PluginItem[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
  tags?: string[];
}) {
  const { colorMode } = useTheme();
  const [sortMode] = useState<SortMode>("az");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expandedGroups, setExpandedGroups] = useState<
    Record<FilterGroupId, boolean>
  >({ source: false, category: false, size: false });
  const toggleGroupExpanded = (groupId: FilterGroupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterGroups = useMemo(
    (): { id: FilterGroupId; label: string; options: string[] }[] => [
      { id: "source", label: "Source", options: ["Built-in", "External"] },
      {
        id: "category",
        label: "Category",
        options: categoryOptions(plugins, tags),
      },
      { id: "size", label: "Contents", options: sizeBuckets.map((b) => b.label) },
    ],
    [plugins, tags],
  );

  const sortedPlugins = useMemo(() => {
    const copy = plugins.filter((plugin) => {
      const sourceOk =
        filters.source.length === 0 || filters.source.includes(sourceOf(plugin));
      const categoryOk =
        filters.category.length === 0 ||
        filters.category.some((tag) => (plugin.tags ?? []).includes(tag));
      const size = sizeLabelOf(plugin);
      const sizeOk =
        filters.size.length === 0 ||
        (size !== null && filters.size.includes(size));
      return sourceOk && categoryOk && sizeOk;
    });
    if (sortMode === "az") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [plugins, sortMode, filters]);

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
    filters.source.length + filters.category.length + filters.size.length;
  const hasActiveFilters = activeFilterCount > 0;

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(sortedPlugins.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const visiblePlugins = sortedPlugins.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <PageShell
      styles={styles}
      currentPage="plugins"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search plugins"
    >
      <Box className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroIcon} aria-hidden="true">
            <PluginsIcon size={36} />
          </span>
          <Heading as="h1" size="3" className={styles.heroHeading}>
            Plugins
          </Heading>
          <Text as="p" size="300" variant="muted" className={styles.heroText}>
            Curated plugins of agents, hooks, and skills for specific workflows
          </Text>
        </div>
      </Box>

      <Section id="catalog" paddingBlockStart="none" paddingBlockEnd="none">
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter plugins">
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
            <Box className={styles.gridFrame} data-mode={colorMode}>
              <Box className={styles.gridContent}>
                <Grid
                  className={styles.threeUp}
                  columnGap="none"
                  rowGap="none"
                  enableGutters={false}
                >
                  {visiblePlugins.map((plugin) => (
                    <Grid.Column
                      key={plugin.id}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={styles.col}
                    >
                      <Box className={clsx(styles.item, styles.itemHover)}>
                        <Card
                          href={pageHref(`plugin/${plugin.id}`)}
                          fullWidth
                          ctaVariant="none"
                          backgroundColor="none"
                          className={styles.card}
                        >
                          <Card.Heading as="h2">{plugin.name}</Card.Heading>
                          <Card.Description>
                            <span className={styles.cardDescText}>
                              {plugin.description}
                            </span>
                          </Card.Description>
                        </Card>
                        <div className={styles.cardActions}>
                          <Button
                            as="a"
                            href={sourceUrlOf(plugin)}
                            variant="primary"
                            leadingVisual={MarkGithubIcon}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View source
                          </Button>
                        </div>
                        {plugin.author?.name ? (
                          <Text
                            as="p"
                            size="100"
                            className={clsx(
                              styles.cardBadge,
                              styles.cardBadgeAuthor,
                            )}
                          >
                            {plugin.author.name}
                          </Text>
                        ) : null}
                      </Box>
                    </Grid.Column>
                  ))}
                </Grid>
              </Box>
            </Box>

            {sortedPlugins.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No plugins match the selected filters.
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
                Can&rsquo;t find the plugin you need?
              </CTABanner.Heading>
              <CTABanner.Description>
                This marketplace is community-built. Share a plugin you use
                <br />
                &mdash;or request one&mdash;to help developers ship faster with
                GitHub Copilot.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button as="a" href={CONTRIBUTE_URL}>
                  Submit a plugin
                </Button>
                <Button as="a" href={REQUEST_URL} variant="secondary">
                  Request a plugin
                </Button>
              </CTABanner.ButtonGroup>
            </CTABanner>
          </Box>
        </Section>
      </Box>
    </PageShell>
  );
}
