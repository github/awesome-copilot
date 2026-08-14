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
import { daysSince, toggleValue, updatedBuckets, updatedBucketOf } from "./catalogFilters";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/agents.module.css";

const CONTRIBUTE_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";
const REQUEST_URL = "https://github.com/github/awesome-copilot/issues/new";

const RAW_BASE = "https://raw.githubusercontent.com/github/awesome-copilot/main";
const GITHUB_BASE = "https://github.com/github/awesome-copilot/blob/main";
const INSTALL_REDIRECT = "https://aka.ms/awesome-copilot/install/agent";

/** An agent record as emitted into public/data/agents.json. */
export type AgentItem = {
  id: string;
  title: string;
  description: string;
  model?: unknown;
  tools?: string[];
  path: string;
  filename: string;
  lastUpdated: string;
};

/** Filter facets emitted alongside the items in public/data/agents.json. */
export type AgentFilters = {
  models?: unknown[];
  tools?: string[];
};

export const agentSourceUrl = (agent: AgentItem) => `${GITHUB_BASE}/${agent.path}`;

export const downloadUrl = (agent: AgentItem) => `${RAW_BASE}/${agent.path}`;

/**
 * VS Code deep link, matching the scheme used by the agent detail pages
 * (`src/lib/detail-page.ts`): an `aka.ms` redirect wrapping the editor URI.
 */
export const installUrl = (agent: AgentItem, insiders = false) => {
  const editor = insiders ? "vscode-insiders" : "vscode";
  const innerUrl = `${editor}:chat-agent/install?url=${encodeURIComponent(
    downloadUrl(agent),
  )}`;
  return `${INSTALL_REDIRECT}?url=${encodeURIComponent(innerUrl)}`;
};

const agentDetailHref = (agent: AgentItem) => pageHref(`agent/${agent.id}`);

/** `model` may be a single name or a list of accepted models. */
const modelsOf = (agent: AgentItem): string[] => flattenNames(agent.model);

function flattenNames(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenNames);
  return [];
}

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

type FilterGroupId = "model" | "tools" | "updated";

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = { model: [], tools: [], updated: [] };

const PAGE_SIZE = 6;

/**
 * Long facets collapse behind a "Show N more" toggle, matching the prototype's
 * extensions page. Real data produces far longer option lists than the
 * prototype's hardcoded arrays, so every catalog needs this.
 */
const FILTER_COLLAPSE_LIMIT = 10;

/**
 * The Agents catalog, ported from the design prototype's `agents.tsx`. The
 * prototype's hardcoded array and hardcoded model/capability options are
 * replaced by build-time data; the layout, filters, and interactions are
 * unchanged.
 */
export function AgentsCatalog({
  agents,
  filters: dataFilters,
  searchIndex,
  contributorsTotal,
}: {
  agents: AgentItem[];
  filters?: AgentFilters;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  const { colorMode } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expandedGroups, setExpandedGroups] = useState<
    Record<FilterGroupId, boolean>
  >({ model: false, tools: false, updated: false });
  const toggleGroupExpanded = (groupId: FilterGroupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterGroups = useMemo<
    { id: FilterGroupId; label: string; options: string[] }[]
  >(() => {
    const models = dataFilters?.models
      ? uniqueSorted(flattenNames(dataFilters.models))
      : uniqueSorted(agents.flatMap(modelsOf));
    const tools = dataFilters?.tools
      ? uniqueSorted(dataFilters.tools)
      : uniqueSorted(agents.flatMap((agent) => agent.tools ?? []));
    return [
      { id: "model", label: "Model", options: models },
      { id: "tools", label: "Tools", options: tools },
      {
        id: "updated",
        label: "Last updated",
        options: updatedBuckets.map((bucket) => bucket.label),
      },
    ];
  }, [agents, dataFilters]);

  const sortedAgents = useMemo(() => {
    const copy = agents.filter((agent) => {
      const models = modelsOf(agent);
      const modelOk =
        filters.model.length === 0 ||
        filters.model.some((model) => models.includes(model));
      const toolsOk =
        filters.tools.length === 0 ||
        filters.tools.every((tool) => (agent.tools ?? []).includes(tool));
      const updatedOk =
        filters.updated.length === 0 ||
        filters.updated.includes(updatedBucketOf(daysSince(agent.lastUpdated)));
      return modelOk && toolsOk && updatedOk;
    });
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }, [agents, filters]);

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
    filters.model.length + filters.tools.length + filters.updated.length;
  const hasActiveFilters = activeFilterCount > 0;
  const pageCount = Math.max(1, Math.ceil(sortedAgents.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visibleAgents = sortedAgents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageShell
      styles={styles}
      currentPage="agents"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search agents"
    >
      <Box className={styles.hero}>
        <div className={styles.heroInner}>
          <svg
            className={styles.heroIcon}
            width="36"
            height="36"
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M48 53L23 72"
              stroke="currentColor"
              strokeWidth="4"
              strokeMiterlimit="10"
              strokeLinecap="round"
            />
            <path
              d="M47.9998 53L72.9998 72"
              stroke="currentColor"
              strokeWidth="4"
              strokeMiterlimit="10"
              strokeLinecap="round"
            />
            <path
              d="M48.01 53L48.01 26"
              stroke="currentColor"
              strokeWidth="4"
              strokeMiterlimit="10"
              strokeLinecap="round"
            />
            <path
              d="M87 91C91.9706 91 96 86.9706 96 82C96 77.0294 91.9706 73 87 73C82.0294 73 78 77.0294 78 82C78 86.9706 82.0294 91 87 91Z"
              fill="var(--base-color-scale-gray-5)"
            />
            <path
              d="M48 18C52.9706 18 57 13.9706 57 9C57 4.02944 52.9706 0 48 0C43.0294 0 39 4.02944 39 9C39 13.9706 43.0294 18 48 18Z"
              fill="var(--base-color-scale-gray-5)"
            />
            <path
              d="M9 91C13.9706 91 18 86.9706 18 82C18 77.0294 13.9706 73 9 73C4.02944 73 0 77.0294 0 82C0 86.9706 4.02944 91 9 91Z"
              fill="var(--base-color-scale-gray-5)"
            />
          </svg>
          <Heading as="h1" size="3" className={styles.heroHeading}>
            Agents
          </Heading>
          <Text as="p" size="300" variant="muted" className={styles.heroText}>
            Specialized agents that enhance GitHub Copilot for specific
            technologies, workflows, and domains — contributed and curated by
            the community.
          </Text>
        </div>
      </Box>

      <Section id="catalog" paddingBlockStart="none" paddingBlockEnd="none">
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter agents">
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
                  {visibleAgents.map((agent) => (
                    <Grid.Column
                      key={agent.id}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={styles.col}
                    >
                      <Box className={clsx(styles.item, styles.itemHover)}>
                        <Card
                          href={agentDetailHref(agent)}
                          fullWidth
                          ctaVariant="none"
                          backgroundColor="none"
                          className={styles.card}
                        >
                          <Card.Heading as="h2">{agent.title}</Card.Heading>
                          <Card.Description>
                            <span className={styles.cardDescText}>
                              {agent.description}
                            </span>
                          </Card.Description>
                        </Card>
                        <div className={styles.cardActions}>
                          <ActionMenu mode="split-button" menuAlignment="start">
                            <ActionMenu.Button
                              as="a"
                              href={installUrl(agent)}
                              variant="primary"
                            >
                              Install
                            </ActionMenu.Button>
                            <ActionMenu.Overlay
                              aria-label={`Install ${agent.title} to your editor`}
                            >
                              <ActionMenu.Item as="a" href={installUrl(agent, false)}>
                                VS Code
                              </ActionMenu.Item>
                              <ActionMenu.Item as="a" href={installUrl(agent, true)}>
                                VS Code Insiders
                              </ActionMenu.Item>
                            </ActionMenu.Overlay>
                          </ActionMenu>
                          <Button
                            as="a"
                            href={downloadUrl(agent)}
                            variant="secondary"
                            download
                            aria-label={`Download ${agent.title} agent file`}
                            className={styles.iconButton}
                          >
                            <DownloadIcon />
                          </Button>
                          <Button
                            as="a"
                            href={agentSourceUrl(agent)}
                            variant="secondary"
                            aria-label={`View ${agent.title} agent on GitHub`}
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

            {sortedAgents.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No agents match the selected filters.
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
                Can&rsquo;t find the agent you need?
              </CTABanner.Heading>
              <CTABanner.Description>
                This library is community-built. Share an agent you use&mdash;or
                request one&mdash;to help developers ship faster with GitHub
                Copilot.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button as="a" href={CONTRIBUTE_URL}>
                  Submit an agent
                </Button>
                <Button as="a" href={REQUEST_URL}>
                  Request an agent
                </Button>
              </CTABanner.ButtonGroup>
            </CTABanner>
          </Box>
        </Section>
      </Box>
    </PageShell>
  );
}
