import {
  BookIcon,
  BrowserIcon,
  ChecklistIcon,
  CopilotIcon,
  MarkGithubIcon,
  PlugIcon,
  ZapIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import React from "react";

import {
  Box,
  Button,
  Card,
  CTABanner,
  Grid,
  Hero,
  Image,
  Section,
  Stack,
  Token,
  useTheme,
} from "@primer/react-brand";

import styles from "./styles/styles.module.css";
import brandDivider from "./brand-divider-copilot-sitting.webp";
import { LargeFooter } from "./LargeFooter";
import { ContributorsHoverCard } from "./ContributorsHoverCard";
import { ContributorsNavButton } from "./ContributorsNavButton";
import { contributorsTotal as siteContributorsTotal } from "../../lib/site-data";
import { LearningIcon } from "./LearningIcon";
import type { PrototypePageProps } from "./pageHref";
import { getAwesomeCopilotNavLinks } from "./navigation";
import { TopNav } from "./TopNav";
import { SkipLink } from "./SkipLink";
import { TopNavSearch } from "./TopNavSearch";

const REPO_URL = "https://github.com/github/awesome-copilot";
const CONTRIBUTING_URL =
  "https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md";

type ResourceIcon = React.ComponentType<{
  size?: number | "small" | "medium" | "large";
}>;

type Resource = {
  icon: ResourceIcon;
  name: string;
  count?: string;
  description: string;
  page?: string;
  anchor?: string;
  id: string;
};

const resources: Resource[] = [
  {
    icon: CopilotIcon,
    name: "Agents",
    count: "220",
    description:
      "Custom agents that give Copilot specialized skills for your projects.",
    page: "agents",
    id: "agents",
  },
  {
    icon: ChecklistIcon,
    name: "Instructions",
    count: "189",
    description:
      "Coding standards and best practices that steer Copilot's output.",
    page: "instructions",
    id: "instructions",
  },
  {
    icon: ZapIcon,
    name: "Skills",
    count: "386",
    description:
      "Self-contained folders that bundle instructions and resources together.",
    page: "skills",
    id: "skills",
  },
  {
    icon: PlugIcon,
    name: "Plugins",
    count: "110",
    description:
      "Curated plugins, grouped by theme, that extend what Copilot can do.",
    page: "plugins",
    id: "plugins",
  },
  {
    icon: BrowserIcon,
    name: "Extensions",
    count: "14",
    description:
      "Interactive canvas extensions that enrich the Copilot app experience.",
    page: "extensions",
    id: "extensions",
  },
  {
    icon: BookIcon,
    name: "Learning Hub",
    count: "27",
    description:
      "Articles and guides for getting the most from every agent and skill.",
    page: "learning-hub-copilot-app",
    id: "learning-hub-copilot-app",
  },
];

export default function AwesomeCopilot({ pageHref }: PrototypePageProps) {
  const { colorMode } = useTheme();
  const subNavLinks = getAwesomeCopilotNavLinks(pageHref);
  const internalHref = ({ page, anchor }: { page?: string; anchor?: string }) =>
    page ? pageHref(page) : `#${anchor}`;

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
            pageHref={pageHref}
          />
          <div className={styles.topBarActions}>
            <TopNavSearch
              pageHref={pageHref}
              styles={styles}
              inputAriaLabel="Search the library"
            />
            <ContributorsNavButton
              href={pageHref("contributors")}
              total={siteContributorsTotal}
            />
            <Button as="a" href={CONTRIBUTING_URL} variant="subtle" size="small">
              Contribute
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
      <Box className={styles.heroFrame}>
        <Section paddingBlockStart="none" paddingBlockEnd="none">
          <Box className={styles.heroFrameInner}>
            <Stack
              direction="vertical"
              alignItems="center"
              gap="normal"
              padding="none"
            >
              <div className={styles.heroRiseIcon}>
                <ContributorsHoverCard
                  size={56}
                  href={pageHref("contributors")}
                />
              </div>
              <Hero align="center">
                <Hero.Heading>
                  The community library for GitHub Copilot
                </Hero.Heading>
                <Hero.Description>
                  Discover reusable agents, skills, instructions, hooks, and
                  tools built by developers to help you ship faster with
                  Copilot.
                </Hero.Description>
                <Hero.PrimaryAction href={REPO_URL}>
                  Explore repository
                </Hero.PrimaryAction>
                <Hero.SecondaryAction href={CONTRIBUTING_URL}>
                  Become a contributor
                </Hero.SecondaryAction>
              </Hero>
            </Stack>
          </Box>
        </Section>
      </Box>

      <Box
        id="resources"
        className={styles.cardGridFrame}
        marginBlockEnd={{ narrow: 24, wide: 80 }}
      >
        <Box className={styles.cardGridContent}>
          <Grid columnGap="none" rowGap="none" enableGutters={false}>
            {resources.map((item) => (
              <Grid.Column
                key={item.name}
                span={{ xsmall: 12, small: 6, xlarge: 4 }}
                className={clsx(
                  styles.cardGridColumn,
                  styles.cardGridColumnArrowHover,
                )}
              >
                <Box className={styles.cardGridItem} id={item.id}>
                  <Card
                    href={internalHref(item)}
                    fullWidth
                    ctaVariant="arrow"
                    ctaText={`Explore ${item.name}`}
                    backgroundColor="none"
                    className={styles.resourceCard}
                  >
                    <Card.Heading as="h2" size="5">
                      <span className={styles.cardHeadingRow}>
                        <span>{item.name}</span>
                        {item.count ? (
                          <Token variant="default">{item.count}</Token>
                        ) : null}
                      </span>
                    </Card.Heading>
                    <Card.Description>{item.description}</Card.Description>
                  </Card>
                </Box>
              </Grid.Column>
            ))}
          </Grid>
        </Box>
      </Box>

      <Box className={styles.ctaFrame}>
        <Section paddingBlockStart="none" paddingBlockEnd="none">
          <Box id="learning-hub" className={styles.ctaFrameInner}>
            <CTABanner align="center" hasGridLines>
              <CTABanner.Logo>
                <LearningIcon size={64} />
              </CTABanner.Logo>
              <CTABanner.Heading as="h2" size="3">
                Master GitHub Copilot
              </CTABanner.Heading>
              <CTABanner.Description>
                Read the documentation to learn every feature and
                workflow, then head to GitHub&rsquo;s YouTube channel for videos,
                demos, and talks.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button
                  as="a"
                  href="https://docs.github.com/en/copilot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the docs
                </Button>
                <Button
                  as="a"
                  href="https://www.youtube.com/@GitHub/featured"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on YouTube
                </Button>
              </CTABanner.ButtonGroup>
            </CTABanner>
          </Box>
        </Section>
      </Box>

      <Box className={styles.dividerFrame}>
        <Section paddingBlockStart="normal" paddingBlockEnd="none">
          <Stack justifyContent="center" padding="none">
            <Image
              src={brandDivider}
              alt=""
              width={1230}
              height={157}
              loading="lazy"
              decoding="async"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </Stack>
        </Section>
      </Box>

      </main>

      <LargeFooter />

    </Box>
  );
}
