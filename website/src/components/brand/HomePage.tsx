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
} from "@primer/react-brand";

import styles from "./styles/styles.module.css";
import { AgentsIcon } from "./AgentsIcon";
import { ContributorsHoverCard } from "./ContributorsHoverCard";
import { ExtensionsIcon } from "./ExtensionsIcon";
import { InstructionsIcon } from "./InstructionsIcon";
import { LearningIcon } from "./LearningIcon";
import { LearningHubIcon } from "./LearningHubIcon";
import { PageShell } from "./PageShell";
import { PluginsIcon } from "./PluginsIcon";
import { SkillsIcon } from "./SkillsIcon";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import { contributorsTotal as siteContributorsTotal } from "../../lib/site-data";

const REPO_URL = "https://github.com/github/awesome-copilot";
type ResourceIcon = React.ComponentType<{
  size?: number;
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

/** Live counts injected at build time, replacing the prototype's hardcoded figures. */
export type HomePageCounts = {
  agents: number;
  instructions: number;
  skills: number;
  plugins: number;
  extensions: number;
  learningHub: number;
};

export type HomePageProps = {
  counts: HomePageCounts;
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
};

const buildResources = (counts: HomePageCounts): Resource[] => [
  {
    icon: AgentsIcon,
    name: "Agents",
    count: String(counts.agents),
    description:
      "Custom agents that give Copilot specialized skills for your projects.",
    page: "agents",
    id: "agents",
  },
  {
    icon: InstructionsIcon,
    name: "Instructions",
    count: String(counts.instructions),
    description:
      "Coding standards and best practices that steer Copilot's output.",
    page: "instructions",
    id: "instructions",
  },
  {
    icon: SkillsIcon,
    name: "Skills",
    count: String(counts.skills),
    description:
      "Self-contained folders that bundle instructions and resources together.",
    page: "skills",
    id: "skills",
  },
  {
    icon: PluginsIcon,
    name: "Plugins",
    count: String(counts.plugins),
    description:
      "Curated plugins, grouped by theme, that extend what Copilot can do.",
    page: "plugins",
    id: "plugins",
  },
  {
    icon: ExtensionsIcon,
    name: "Extensions",
    count: String(counts.extensions),
    description:
      "Interactive panels for the Copilot app, supplied by canvas extensions.",
    page: "extensions",
    id: "extensions",
  },
  {
    icon: LearningHubIcon,
    name: "Learning Hub",
    count: String(counts.learningHub),
    description:
      "Articles and guides for getting the most from every agent and skill.",
    page: "learning-hub-copilot-app",
    id: "learning-hub-copilot-app",
  },
];

export function HomePage({
  counts,
  searchIndex = [],
  contributorsTotal = siteContributorsTotal,
}: HomePageProps) {
  const resources = buildResources(counts);
  const internalHref = ({ page, anchor }: { page?: string; anchor?: string }) =>
    page ? pageHref(page) : `#${anchor}`;

  return (
    <PageShell
      styles={styles}
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
      searchAriaLabel="Search the library"
    >
      <Box className={styles.heroFrame}>
        <Section paddingBlockStart="none" paddingBlockEnd="none">
          <Box className={clsx(styles.heroFrameInner, "heading-grid")}>
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
                  Learn Copilot through hands-on guides, then explore agents,
                  skills, and tools built by the community.
                </Hero.Description>
                <Hero.PrimaryAction
                  href={pageHref("learning-hub-copilot-app")}
                  className={styles.heroPrimaryAction}
                  leadingVisual={
                    <span aria-hidden="true">
                      <LearningHubIcon size={20} />
                    </span>
                  }
                >
                  Explore Learning Hub
                </Hero.PrimaryAction>
                <Hero.SecondaryAction href={REPO_URL}>
                  View on GitHub
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
                span={{ xsmall: 12, medium: 6, xlarge: 4 }}
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
                    disableAnimation
                    backgroundColor="none"
                    className={styles.resourceCard}
                  >
                    <Card.Heading as="h2" size="5">
                      <span className={styles.cardHeadingRow}>
                        <span className={styles.resourceIcon} aria-hidden="true">
                          <item.icon size={24} />
                        </span>
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
            <CTABanner align="center">
              <CTABanner.Logo>
                <LearningIcon size={64} />
              </CTABanner.Logo>
              <CTABanner.Heading as="h2" size="3">
                Learn by building
              </CTABanner.Heading>
              <CTABanner.Description>
                Start with the basics, follow a hands-on workshop, or explore
                practical guides for your next Copilot workflow.
              </CTABanner.Description>
              <CTABanner.ButtonGroup>
                <Button
                  as="a"
                  href="https://www.youtube.com/@GitHub/featured"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Watch on YouTube
                </Button>
                <Button
                  as="a"
                  href="https://docs.github.com/en/copilot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the docs
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
              src="/media/brand-divider-copilot-sitting.webp"
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
    </PageShell>
  );
}
