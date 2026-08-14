import { ChevronDownIcon, CopyIcon, DownloadIcon, MarkGithubIcon } from "@primer/octicons-react";
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
import React, { useMemo, useState } from "react";

import { PageShell } from "./PageShell";
import { SkillsIcon } from "./SkillsIcon";
import {
  daysSince,
  fileBuckets,
  fileBucketOf,
  toggleValue,
  updatedBuckets,
  updatedBucketOf,
} from "./catalogFilters";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import styles from "./styles/skills.module.css";

const CONTRIBUTE_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";
const REQUEST_URL = "https://github.com/github/awesome-copilot/issues/new";

/** A skill record as emitted into public/data/skills.json. */
export type SkillItem = {
  id: string;
  title: string;
  description: string;
  assetCount: number;
  files: number;
  lastUpdated: string;
};

const skillSourceUrl = (skill: SkillItem) =>
  `https://github.com/github/awesome-copilot/blob/main/skills/${skill.id}`;

const installCommand = (skill: SkillItem) =>
  `gh skills install github/awesome-copilot ${skill.id}`;

const downloadUrl = (skill: SkillItem) =>
  `https://raw.githubusercontent.com/github/awesome-copilot/main/skills/${skill.id}/SKILL.md`;

type FilterGroupId = "resources" | "files" | "updated";

const filterGroups: { id: FilterGroupId; label: string; options: string[] }[] = [
  {
    id: "resources",
    label: "Resources",
    options: ["Includes assets", "Instructions only"],
  },
  { id: "files", label: "Bundled files", options: fileBuckets.map((b) => b.label) },
  { id: "updated", label: "Last updated", options: updatedBuckets.map((b) => b.label) },
];

type FilterState = Record<FilterGroupId, string[]>;

const emptyFilters: FilterState = { resources: [], files: [], updated: [] };

const resourceOf = (skill: SkillItem) =>
  skill.assetCount > 0 ? "Includes assets" : "Instructions only";

const PAGE_SIZE = 6;

/**
 * The Skills catalog, ported from the design prototype's `skills.tsx`. The
 * prototype's hardcoded array is replaced by build-time data; the layout,
 * filters, and interactions are unchanged.
 */
export function SkillsCatalog({
  skills,
  searchIndex,
  contributorsTotal,
}: {
  skills: SkillItem[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  const { colorMode } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [copied, setCopied] = useState(false);
  const copyTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(
    () => () => window.clearTimeout(copyTimer.current),
    [],
  );

  const copyInstall = async (skill: SkillItem) => {
    try {
      await navigator.clipboard.writeText(installCommand(skill));
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const sortedSkills = useMemo(() => {
    const filtered = skills.filter((skill) => {
      const resourcesOk =
        filters.resources.length === 0 ||
        filters.resources.includes(resourceOf(skill));
      const filesOk =
        filters.files.length === 0 ||
        filters.files.includes(fileBucketOf(skill.files));
      const updatedOk =
        filters.updated.length === 0 ||
        filters.updated.includes(updatedBucketOf(daysSince(skill.lastUpdated)));
      return resourcesOk && filesOk && updatedOk;
    });
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [skills, filters]);

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
    filters.resources.length + filters.files.length + filters.updated.length;
  const hasActiveFilters = activeFilterCount > 0;
  const pageCount = Math.max(1, Math.ceil(sortedSkills.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const visibleSkills = sortedSkills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageShell
      styles={styles}
      currentPage="skills"
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search skills"
    >
      <Box className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroIcon} aria-hidden="true">
            <SkillsIcon size={36} />
          </span>
          <Heading as="h1" size="3" className={styles.heroHeading}>
            Skills
          </Heading>
          <Text as="p" size="300" variant="muted" className={styles.heroText}>
            Self-contained agent skills that bundle instructions and resources —
            contributed and curated by the community to extend GitHub Copilot.
          </Text>
        </div>
      </Box>

      <Section id="catalog" paddingBlockStart="none" paddingBlockEnd="none">
        <Box className={styles.catalog}>
          <aside className={styles.filterNav} aria-label="Filter skills">
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((open) => !open)}
            >
              <span>Filters{hasActiveFilters ? ` (${activeFilterCount})` : ""}</span>
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
                  {visibleSkills.map((skill) => (
                    <Grid.Column
                      key={skill.id}
                      span={{ xsmall: 12, medium: 6, large: 6 }}
                      className={styles.col}
                    >
                      <Box className={clsx(styles.item, styles.itemHover)}>
                        <Card
                          href={pageHref(`skill/${skill.id}`)}
                          fullWidth
                          ctaVariant="none"
                          backgroundColor="none"
                          className={styles.card}
                        >
                          <Card.Heading as="h2">{skill.title}</Card.Heading>
                          <Card.Description>
                            <span className={styles.cardDescText}>
                              {skill.description}
                            </span>
                          </Card.Description>
                        </Card>
                        <div className={styles.cardActions}>
                          <Button
                            variant="primary"
                            hasArrow={false}
                            leadingVisual={CopyIcon}
                            onClick={() => copyInstall(skill)}
                          >
                            Copy install
                          </Button>
                          <Button
                            as="a"
                            href={downloadUrl(skill)}
                            variant="secondary"
                            download
                            aria-label={`Download ${skill.title} skill file`}
                            className={styles.iconButton}
                          >
                            <DownloadIcon />
                          </Button>
                          <Button
                            as="a"
                            href={skillSourceUrl(skill)}
                            variant="secondary"
                            aria-label={`View ${skill.title} skill on GitHub`}
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

            {sortedSkills.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text as="p" variant="muted">
                  No skills match the selected filters.
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
                Can&rsquo;t find the skill you need?
              </CTABanner.Heading>
              <CTABanner.Description>
                This library is community-built. Share a skill you use&mdash;or
                request one&mdash;to help developers ship faster with GitHub
                Copilot.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button as="a" href={CONTRIBUTE_URL}>
                  Submit a skill
                </Button>
                <Button as="a" href={REQUEST_URL}>
                  Request a skill
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
