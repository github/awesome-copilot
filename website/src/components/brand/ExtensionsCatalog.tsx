import {
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  MarkGithubIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import React, { useMemo, useState } from "react";
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

import { ExtensionsIcon } from "./ExtensionsIcon";
import { PageShell } from "./PageShell";
import { TypingText } from "./TypingText";
import {
  daysSince,
  toggleValue,
  updatedBuckets,
  updatedBucketOf,
} from "./catalogFilters";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/extensions.module.css";

const CONTRIBUTE_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-canvas-extensions";

const REQUEST_URL = "https://github.com/github/awesome-copilot/issues/new";

/** An extension record as emitted into public/data/extensions.json. */
export type ExtensionItem = {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  imageUrl?: string | null;
  installUrl?: string | null;
  installCommand?: string | null;
  sourceUrl?: string | null;
  external?: boolean;
  author?: { name?: string; url?: string } | null;
  keywords?: string[];
};

/** Where the "view on GitHub" action points: an external extension carries its
 *  own source repo, an in-repo one is covered by the install URL. */
const extensionSourceUrl = (ext: ExtensionItem) =>
  ext.sourceUrl ?? ext.installUrl ?? undefined;

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

type FilterGroupId = "author" | "updated" | "keyword";

const FILTER_COLLAPSE_LIMIT = 10;

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = { author: [], updated: [], keyword: [] };

const PAGE_SIZE = 6;

function CopyInstallButton({
  ext,
  command,
  onCopied,
}: {
  ext: ExtensionItem;
  command: string;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(command).catch(() => undefined);
    }
    setCopied(true);
    onCopied();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="secondary"
      hasArrow={false}
      onClick={onCopy}
      aria-label={
        copied
          ? `Copied install command for ${ext.name}`
          : `Copy install command for ${ext.name}`
      }
      className={styles.iconButton}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

/**
 * The canvas extensions catalog, ported from the design prototype's
 * `extensions.tsx`. The prototype's hardcoded array is replaced by build-time
 * data; the layout, filters, and interactions are unchanged.
 */
export function ExtensionsCatalog({
  extensions,
  searchIndex,
  contributorsTotal,
}: {
  extensions: ExtensionItem[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  const { colorMode } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const showCopiedToast = React.useCallback(() => {
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expandedGroups, setExpandedGroups] = useState<
    Record<FilterGroupId, boolean>
  >({ author: false, updated: false, keyword: false });

  const toggleGroupExpanded = (groupId: FilterGroupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterGroups = useMemo(() => {
    const authorOptions = uniqueSorted(
      extensions
        .map((ext) => ext.author?.name)
        .filter((name): name is string => Boolean(name)),
    );
    const keywordOptions = uniqueSorted(
      extensions.flatMap((ext) => ext.keywords ?? []),
    );
    const updatedOptions = updatedBuckets
      .map((bucket) => bucket.label)
      .filter((label) =>
        extensions.some(
          (ext) => updatedBucketOf(daysSince(ext.lastUpdated)) === label,
        ),
      );
    return [
      { id: "author" as const, label: "Author", options: authorOptions },
      { id: "updated" as const, label: "Last updated", options: updatedOptions },
      { id: "keyword" as const, label: "Keyword", options: keywordOptions },
    ];
  }, [extensions]);

  const sortedExtensions = useMemo(() => {
    const copy = extensions.filter((ext) => {
      const authorOk =
        filters.author.length === 0 ||
        (ext.author?.name !== undefined &&
          filters.author.includes(ext.author.name));
      const updatedOk =
        filters.updated.length === 0 ||
        filters.updated.includes(updatedBucketOf(daysSince(ext.lastUpdated)));
      const keywordOk =
        filters.keyword.length === 0 ||
        filters.keyword.every((keyword) =>
          (ext.keywords ?? []).includes(keyword),
        );
      return authorOk && updatedOk && keywordOk;
    });
    copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [extensions, filters]);

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
    filters.author.length + filters.updated.length + filters.keyword.length;
  const hasActiveFilters = activeFilterCount > 0;
  const pageCount = Math.max(1, Math.ceil(sortedExtensions.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visibleExtensions = sortedExtensions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <PageShell
      styles={styles}
      currentPage="extensions"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search extensions"
    >
      <Box className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroIcon} aria-hidden="true">
            <ExtensionsIcon size={36} />
          </span>
          <Heading as="h1" size="3" className={styles.heroHeading}>
            Canvas Extensions
          </Heading>
          <Text as="p" size="300" variant="muted" className={styles.heroText}>
            Canvas extensions that bring interactive GitHub Copilot app
            experiences to life — contributed and curated by the community.
          </Text>
        </div>
      </Box>

      <Section id="catalog" paddingBlockStart="none" paddingBlockEnd="none">
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter extensions">
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
                  {visibleExtensions.map((ext) => {
                    const detailHref = pageHref(`extension/${ext.id}`);
                    const sourceUrl = extensionSourceUrl(ext);
                    return (
                      <Grid.Column
                        key={ext.id}
                        span={{ xsmall: 12, medium: 6, large: 6 }}
                        className={styles.col}
                      >
                        <Box className={clsx(styles.item, styles.itemHover)}>
                          {ext.imageUrl ? (
                            <a
                              href={detailHref}
                              className={styles.cardMedia}
                              aria-label={`View ${ext.name}`}
                              tabIndex={-1}
                            >
                              <img
                                className={styles.cardImage}
                                src={ext.imageUrl}
                                alt={`${ext.name} preview`}
                                loading="lazy"
                                decoding="async"
                                width={1280}
                                height={720}
                              />
                            </a>
                          ) : null}
                          <Card
                            href={detailHref}
                            fullWidth
                            ctaVariant="none"
                            backgroundColor="none"
                            className={styles.card}
                          >
                            <Card.Heading as="h2">{ext.name}</Card.Heading>
                            <Card.Description>
                              <span className={styles.cardDescText}>
                                {ext.description}
                              </span>
                            </Card.Description>
                          </Card>
                          <div className={styles.cardActions}>
                            {ext.installUrl ? (
                              <Button
                                as="a"
                                href={ext.installUrl}
                                variant="primary"
                                hasArrow={false}
                              >
                                Open in Copilot app
                              </Button>
                            ) : null}
                            {ext.installCommand ? (
                              <CopyInstallButton
                                ext={ext}
                                command={ext.installCommand}
                                onCopied={showCopiedToast}
                              />
                            ) : null}
                            {sourceUrl ? (
                              <Button
                                as="a"
                                href={sourceUrl}
                                variant="secondary"
                                aria-label={`View ${ext.name} on GitHub`}
                                className={styles.iconButton}
                              >
                                <MarkGithubIcon />
                              </Button>
                            ) : null}
                          </div>
                          {ext.author?.name ? (
                            <Text as="p" size="100" className={styles.cardBadge}>
                              <TypingText
                                text={ext.author.name}
                                className={styles.cardBadgeName}
                              />
                            </Text>
                          ) : null}
                        </Box>
                      </Grid.Column>
                    );
                  })}
                </Grid>
              </Box>
            </Box>

            {sortedExtensions.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No extensions match the selected filters.
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
                Don&rsquo;t see what you&rsquo;re looking for?
              </CTABanner.Heading>
              <CTABanner.Description>
                This collection is community-built. Share your own canvas
                extension
                <br />
                &mdash;or request one&mdash;to help others get more out of the
                GitHub Copilot app.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button as="a" href={CONTRIBUTE_URL}>
                  Submit an extension
                </Button>
                <Button as="a" href={REQUEST_URL}>
                  Request an extension
                </Button>
              </CTABanner.ButtonGroup>
            </CTABanner>
          </Box>
        </Section>
      </Box>

      <div
        className={styles.toast}
        role="status"
        aria-live="polite"
        data-visible={copied ? "true" : undefined}
      >
        Install command copied!
      </div>
    </PageShell>
  );
}
