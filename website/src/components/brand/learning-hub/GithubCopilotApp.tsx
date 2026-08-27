/**
 * Bespoke Learning Hub article for "GitHub Copilot app", ported near-verbatim
 * from the Brand Engineering prototype's `pages/github-copilot-app.tsx`
 * (`site-generator/prototypes/awesome-copilot-community-library`).
 *
 * Only the following were adapted from the prototype source:
 * - `PrototypePageProps`/`pageHref` import swapped for the site's `pageHref`.
 * - Media imports (webpack asset imports in the prototype) replaced with
 *   static paths. The two large source videos
 *   (`copilot-app-centralized-inbox.mp4`, ~23MB and
 *   `copilot-app-delegate-to-agents.mp4`, ~32MB) are not committed to this
 *   repo — TODO: host them externally (e.g. a CDN/GitHub release asset) and
 *   swap `inboxPoster`/`delegateGif` below to real `<video>` sources. Until
 *   then the inbox video renders as its poster image and the delegate clip
 *   renders as its already-ported static webp.
 */
import { Heading, Text } from "@primer/react-brand";
import { BookIcon, PlayIcon, GlobeIcon, ArrowUpRightIcon } from "@primer/octicons-react";

import styles from "../styles/github-copilot-app.module.css";
import { CopyBlock, LearningArticleLayout, ProTip, type TocSection } from "../LearningArticleLayout";
import { VideoCarousel, type Video } from "../VideoCarousel";
import type { PageHref } from "../pageHref";

const DOWNLOAD_URL = "https://github.com/features/ai/github-app?locale=en-US";

// TODO: replace with hosted URLs once the large source videos are uploaded
// externally; see file header note.
const inboxPoster = "/images/learning-hub/github-copilot-app/copilot-app-centralized-inbox-poster.webp";
const delegateGif = "/images/learning-hub/github-copilot-app/copilot-app-delegate-to-agents.webp";

const controlCenterPoints = [
  "See all your active work at a glance",
  "Spin up multiple agents working on different tasks simultaneously",
  "Inspect what each agent is doing in real time",
  "Redirect agents mid-task or approve their changes",
  "Let agents handle automation (like merging PRs) while you focus elsewhere",
];

const keyFeatures: { title: string; description: string }[] = [
  {
    title: "The My Work view",
    description:
      "A single dashboard for active sessions, your inbox of issues and PRs, background automations, and overall status — so you stop checking GitHub, your CLI, and VS Code separately.",
  },
  {
    title: "Automations",
    description:
      "Built-in automations run scheduled tasks with the same agentic technology. Use templates out of the box or create your own, running as a plan, an interactive session, or on autopilot.",
  },
  {
    title: "Isolated worktrees",
    description:
      "Every session runs in its own git worktree — a real, isolated copy of your branch with its own environment and changes, so multiple agents never step on each other.",
  },
  {
    title: "Canvases",
    description:
      "Interactive work surfaces where you and agents collaborate. A canvas shows the actual work — a plan, a PR diff, terminal output, or a live browser — that you can edit, approve, or redirect.",
  },
  {
    title: "Agent Merge",
    description:
      "Carries pull requests through the whole workflow: monitors CI, addresses failing tests and lint, tracks required reviewers, and can merge automatically once every condition is met.",
  },
];

const audiences: { title: string; description: string }[] = [
  {
    title: "Teams running parallel agents",
    description:
      "If you use agents regularly and need to manage parallel work, the app is a dedicated control center — everything in one place instead of many windows.",
  },
  {
    title: "Non-traditional developers",
    description:
      "A more accessible, desktop-first interface for business analysts, product managers, and technical teammates who find VS Code or the CLI overwhelming.",
  },
  {
    title: "Multi-agent workflows",
    description:
      "The worktree architecture makes it natural to dispatch multiple agents on different tasks with no manual branch juggling or coordination.",
  },
  {
    title: "GUI-first developers",
    description:
      "A visual interface for common tasks that still surfaces the full power of agents, hooks, skills, and custom instructions.",
  },
];

const comparisonRows: { experience: string; bestFor: string; strength: string }[] = [
  {
    experience: "Copilot CLI",
    bestFor: "Developers in the terminal",
    strength: "Raw power, scriptable, always available in your shell.",
  },
  {
    experience: "VS Code extension",
    bestFor: "Coding and real-time AI assistance",
    strength: "Integrated with your editor, instant feedback.",
  },
  {
    experience: "GitHub.com",
    bestFor: "Code review and PR management",
    strength: "Central hub for collaboration, always accessible on web.",
  },
  {
    experience: "Copilot app",
    bestFor: "Directing parallel agents, visual workflow",
    strength: "Control center for agentic development and multi-agent management.",
  },
];

const installSteps = [
  "Download the installer for your platform.",
  "Install and launch the app.",
  "Authenticate with your GitHub account.",
  "Connect the repositories you want to work in.",
];

const sessionWays: { lead: string; rest: string }[] = [
  {
    lead: "From an issue:",
    rest: "assign it to Copilot and the app opens a session to work on it.",
  },
  {
    lead: "From a prompt:",
    rest: "open the app and describe what you want done, like “Add dark mode support.”",
  },
  {
    lead: "From your inbox:",
    rest: "the app syncs your GitHub inbox — click an issue and start a session for it.",
  },
];

const sessionFlow = [
  "You describe the work or assign an issue.",
  "The Copilot app creates an isolated worktree.",
  "The agent reads your issue, instructions, and codebase.",
  "It plans and implements a solution.",
  "You monitor progress in the My Work view.",
  "You redirect the agent or let it finish.",
  "Changes are ready for review — a PR or an approval.",
];

const customizations: { title: string; lead: string; code: string }[] = [
  { title: "Custom agents", lead: "Markdown agent files in", code: ".github/agents/" },
  { title: "Skills", lead: "Specialized task guidance in", code: ".github/skills/" },
  {
    title: "Instructions",
    lead: "Coding standards in",
    code: ".github/instructions/",
  },
  {
    title: "Hooks",
    lead: "Automated checks and formatting in",
    code: ".github/hooks/",
  },
  {
    title: "Setup steps",
    lead: "Environment setup in",
    code: ".github/copilot-setup-steps.yml",
  },
];

const workflows: { title: string; steps: string[] }[] = [
  {
    title: "Parallel bug fixes",
    steps: [
      "Create a session for “Fix login timeout issue.”",
      "While it runs, create another for “Fix dark mode button styling.”",
      "Monitor both in the My Work view.",
      "Review and merge each PR independently.",
    ],
  },
  {
    title: "Feature development across sprints",
    steps: [
      "Connect your issue tracker and pull features from the backlog.",
      "Create a session for each feature.",
      "Each agent works independently in its own worktree.",
      "PRs land without interfering with each other.",
    ],
  },
  {
    title: "Automated PR management",
    steps: [
      "Configure Agent Merge in the app settings.",
      "Choose the automations to enable — run CI, address feedback, merge.",
      "Create a session to implement a feature.",
      "Agent Merge monitors the PR and merges when it’s ready.",
    ],
  },
];

const deepLinkSnippet = `# Start a new session in a repo
open "ghapp://session/new?repo=owner/repo"

# Start from a branch or a pull request
open "ghapp://session/new?repo=owner/repo&branch=main"
open "ghapp://session/new?repo=owner/repo&pr=1234"

# Start with a kickoff prompt or an initial mode
open "ghapp://session/new?repo=owner/repo&prompt=fix%20the%20flaky%20test"
open "ghapp://session/new?repo=owner/repo&mode=plan"`;

const articleSections: TocSection[] = [
  { id: "overview", label: "Overview" },
  { id: "key-features", label: "Key features" },
  { id: "who-its-for", label: "Who it’s for" },
  { id: "how-it-compares", label: "How it compares" },
  { id: "getting-started", label: "Getting started" },
  { id: "session-flow", label: "How a session works" },
  { id: "customizations", label: "Built on your customizations" },
  { id: "workflows", label: "Common workflows" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

/** GitHub's "Copilot app for Beginners" YouTube series. */
const videoSeries: Video[] = [
  {
    id: "LsA4vIX_3UY",
    title: "Meet the GitHub Copilot app: Your new AI desktop assistant",
    meta: "GitHub",
  },
];

export default function GithubCopilotApp({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="github-copilot-app"
      breadcrumbLabel="GitHub Copilot app"
      heroTitle="GitHub Copilot app"
      animateHeroTitle
      heroSubtitle="A desktop experience for agent-native development — see multiple agents run in parallel and take control, all in one place."
      heroCta={{ label: "Download the app", href: DOWNLOAD_URL }}
      tocSections={articleSections}
      upNext={{
        label: "GitHub Copilot Terminology Glossary",
        href: pageHref("github-copilot-terminology-glossary"),
      }}
    >
      <section id="overview" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          What is the GitHub Copilot app?
        </Heading>
        <Text as="p" size="300" variant="muted">
          The Copilot app is a standalone desktop application that serves as a
          control center for agentic development. Instead of managing agents
          through GitHub.com pull requests, issues, and CLI windows, the Copilot
          app brings everything into one unified interface.
        </Text>
        <figure className={styles.videoFigure}>
          <img
            className={styles.video}
            src={inboxPoster}
            alt="The GitHub Copilot app showing a centralized inbox of active work"
            loading="lazy"
            decoding="async"
            width={2000}
            height={957}
          />
        </figure>
        <Text as="p" size="300" variant="muted">
          Think of it as a command center where you can:
        </Text>
        <ul className={styles.checkList}>
          {controlCenterPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          The key difference from existing Copilot experiences is that the app
          is purpose-built for parallel agent work. It handles the complexity of
          managing multiple isolated environments, branches, and worktrees
          automatically, so you don&rsquo;t have to.
        </Text>
      </section>

      <section id="key-features" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Key features
        </Heading>
        <ul className={styles.pointList}>
          {keyFeatures.map((feature) => (
            <li key={feature.title}>
              <span className={styles.stepLabel}>{feature.title}</span> —{" "}
              {feature.description}
            </li>
          ))}
        </ul>
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/LsA4vIX_3UY"
            title="What is the GitHub Copilot app?"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="who-its-for" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Who it&rsquo;s for
        </Heading>
        <Text as="p" size="300" variant="muted">
          The Copilot app isn&rsquo;t a replacement for existing experiences —
          it&rsquo;s another tool in the toolbox that fills a specific gap.
        </Text>
        <ul className={styles.pointList}>
          {audiences.map((audience) => (
            <li key={audience.title}>
              <span className={styles.stepLabel}>{audience.title}</span> —{" "}
              {audience.description}
            </li>
          ))}
        </ul>
        <figure className={styles.videoFigure}>
          <img
            className={styles.gif}
            src={delegateGif}
            alt="The GitHub Copilot app delegating tasks to multiple agents working in parallel"
            loading="lazy"
            decoding="async"
            width={960}
            height={459}
          />
        </figure>
      </section>

      <section id="how-it-compares" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          How it compares
        </Heading>
        <Text as="p" size="300" variant="muted">
          Each Copilot surface is best for a different job. The app is the
          control center for directing parallel agents.
        </Text>
        <ul className={styles.pointList}>
          {comparisonRows.map((row) => (
            <li key={row.experience}>
              <span className={styles.stepLabel}>{row.experience}</span> — best
              for {row.bestFor.toLowerCase()}. {row.strength}
            </li>
          ))}
        </ul>
      </section>

      <section id="getting-started" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Getting started
        </Heading>
        <Text as="p" size="300" variant="muted">
          To use the GitHub Copilot app, you&rsquo;ll need a Copilot Pro, Pro+,
          Business, or Enterprise plan, a compatible OS (macOS, Windows, or
          Linux), and connected GitHub repositories.
        </Text>
        <ol className={styles.stepsList}>
          {installSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Start a session three ways</span>
          <ul className={styles.pointList}>
            {sessionWays.map((way) => (
              <li key={way.lead}>
                <span className={styles.stepLabel}>{way.lead}</span> {way.rest}
              </li>
            ))}
          </ul>
        </div>
        <Text as="p" size="300" variant="muted">
          The app supports URL deep links on the{" "}
          <code className={styles.inlineCode}>ghapp://</code> scheme — handy for
          starting a session straight from your terminal:
        </Text>
        <CopyBlock code={deepLinkSnippet} label="Deep links" />
      </section>

      <section id="session-flow" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          How a session works
        </Heading>
        <Text as="p" size="300" variant="muted">
          Each session runs in its own worktree with an isolated environment,
          and you can run many in parallel.
        </Text>
        <ol className={styles.stepsList}>
          {sessionFlow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <ProTip>
        <p className={styles.proTipLead}>
          Pin the app to your dock and keep the My Work view open — it&rsquo;s
          the fastest way to see every running agent at a glance.
        </p>
        <p>
          Connect your issue tracker first. Assigning an issue to Copilot
          becomes the quickest way to spin up a new, fully-scoped session.
        </p>
      </ProTip>

      <section id="customizations" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Built on your customizations
        </Heading>
        <Text as="p" size="300" variant="muted">
          The app respects all your existing GitHub Copilot configuration, so
          agents behave the same way they do everywhere else.
        </Text>
        <ul className={styles.pointList}>
          {customizations.map((item) => (
            <li key={item.title}>
              <span className={styles.stepLabel}>{item.title}</span> —{" "}
              {item.lead}{" "}
              <code className={styles.inlineCode}>{item.code}</code>.
            </li>
          ))}
        </ul>
      </section>

      <section id="workflows" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Common workflows
        </Heading>
        <Text as="p" size="300" variant="muted">
          A few ways teams put the app to work every day.
        </Text>
        {workflows.map((workflow) => (
          <div key={workflow.title} className={styles.promptGroup}>
            <span className={styles.promptLabel}>{workflow.title}</span>
            <ol className={styles.stepsList}>
              {workflow.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section id="video-series" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Video series
        </Heading>
        <Text as="p" size="300" variant="muted">
          Prefer to watch and learn? Get a guided tour of the GitHub Copilot app
          in this video from GitHub. Play it right here on the page.
        </Text>
        <VideoCarousel videos={videoSeries} />
      </section>

      <section id="learn-more" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Learn more
        </Heading>
        <div className={styles.learnMoreBand}>
          <a
            className={styles.learnMoreCard}
            href="https://github.com/features/ai/github-app?locale=en-US"
          >
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <GlobeIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              GitHub Copilot app
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a
            className={styles.learnMoreCard}
            href="https://docs.github.com/en/copilot/concepts/agents/github-copilot-app"
          >
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <BookIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              Documentation
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://www.youtube.com/playlist?list=PLNBWjViYXaIY">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <PlayIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              Video series
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
        </div>
      </section>
    </LearningArticleLayout>
  );
}
