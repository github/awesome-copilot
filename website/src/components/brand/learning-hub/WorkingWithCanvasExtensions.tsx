/**
 * Bespoke Learning Hub article for "Working with Canvas Extensions", ported
 * near-verbatim from the Brand Engineering prototype's
 * `pages/working-with-canvas-extensions.tsx`
 * (`site-generator/prototypes/awesome-copilot-community-library`).
 *
 * Only the following were adapted from the prototype source:
 * - `PrototypePageProps`/`pageHref` import swapped for the site's `pageHref`.
 * - Media imports replaced with static paths. The large source video
 *   (`copilot-app-canvas.mp4`, ~20MB) is not committed to this repo — TODO:
 *   host it externally (e.g. a CDN/GitHub release asset) and swap
 *   `canvasPoster` below to a real `<video>` source. Until then the canvas demo
 *   renders as a static webp poster.
 */
import { Heading, Text } from "@primer/react-brand";
import { BookIcon, PlayIcon, GlobeIcon, ArrowUpRightIcon } from "@primer/octicons-react";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import {
  CopyBlock,
  LearningArticleLayout,
  type TocSection,
} from "../LearningArticleLayout";
import { VideoCarousel, type Video } from "../VideoCarousel";

// TODO: replace with a hosted URL once the large source video is uploaded
// externally; see file header note.
const canvasPoster = "/images/learning-hub/working-with-canvas-extensions/canvases-light.webp";

const videoSeries: Video[] = [
  {
    id: "UzYm0kyVY9s",
    title: "Exploring the agent-first GitHub Copilot desktop app",
    meta: "GitHub Checkout",
  },
  {
    id: "LsA4vIX_3UY",
    title: "Meet the GitHub Copilot app: Your new AI desktop assistant",
    meta: "GitHub",
  },
  {
    id: "LwqUp4Dc1mQ",
    title: "Extending AI agents: A live demo of the GitHub MCP Server",
    meta: "Demo",
  },
  {
    id: "HN47tveqfQU",
    title: "End-to-end development with GitHub Copilot and an MCP server",
    meta: "Demo",
  },
  {
    id: "onVn-lnHZ9s",
    title: "Demo: end-to-end agentic development with GitHub Copilot",
    meta: "Demo",
  },
  {
    id: "usXv9jJWjvI",
    title: "Automating daily workflows with the GitHub Copilot app and MCP",
    meta: "GitHub",
  },
];

const bidirectionalPoints = [
  "You can interact through UI controls (buttons, forms, filters, cards, etc.)",
  "The agent can call canvas capabilities to update that same state",
  "You can iterate quickly by asking the agent to add or revise capabilities",
];

const workflowPoints = [
  "Triage boards",
  "Planning documents",
  "Live browser-assisted workflows",
  "Release coordination surfaces",
];

const structurePoints: { lead: string; rest: string }[] = [
  {
    lead: "package.json",
    rest: "for metadata and dependencies",
  },
  {
    lead: "extension.mjs",
    rest: "(or another entry module) for canvas behavior and capabilities",
  },
  {
    lead: "Optional UI files",
    rest: "(index.html, assets) for richer panel controls",
  },
  {
    lead: "Optional persisted artifacts",
    rest: "/state files",
  },
];

const contractPoints: { lead: string; rest: string }[] = [
  {
    lead: "Define clear canvas actions and schemas",
    rest: "in createCanvas(...)",
  },
  {
    lead: "Keep action names verb-oriented and predictable",
    rest: "(get_*, apply_*, sync_*)",
  },
  {
    lead: "Return structured state from handlers",
    rest: "so both the UI and agent remain in sync",
  },
];

const examples: { title: string; description: string }[] = [
  {
    title: "Backlog Swipe Triage",
    description:
      "swipe-based issue triage surface for fast backlog decisions.",
  },
  {
    title: "Release Notes Showcase",
    description: "release notes authoring and review canvas pattern.",
  },
  {
    title: "Chromium Control Canvas",
    description:
      "advanced canvas that coordinates panel controls with a real headful Chromium window.",
  },
  {
    title: "Agent Arcade",
    description:
      "retro arcade canvas with agent-callable controls for choosing or restarting mini-games while agents work.",
  },
];

const iteratingPoints = [
  "Add or rename capabilities as your workflow evolves",
  "Simplify controls that are rarely used",
  "Add guardrails around sensitive actions",
  "Keep capability names clear and action-oriented",
];

const nextSteps = [
  "Review the GitHub Copilot app overview for broader session and workflow concepts.",
  "Browse the Canvas Extensions page for discoverable extensions.",
  "Fork one of the example extension folders above and adapt it to your own workflow.",
];

const triagePrompt = `/create-canvas Create an issue triage canvas with list filtering, label editing, and quick-priority actions. Add capabilities for get_issues, update_priority, and apply_label.`;

const releasePrompt = `/create-canvas Create a release checklist canvas that tracks milestones and owners. Add capabilities for add_item, assign_owner, mark_done, and export_summary.`;

const planningPrompt = `/create-canvas Create a markdown planning canvas that combines my open PRs and issues, and lets me launch and track agent sessions from the canvas.`;

const articleSections: TocSection[] = [
  { id: "what-canvases-can-do", label: "What canvases can do" },
  { id: "create-a-canvas", label: "Create a canvas" },
  { id: "prompt-patterns", label: "Prompt patterns" },
  { id: "choose-scope", label: "Choose scope" },
  { id: "extension-structure", label: "Extension structure" },
  { id: "best-practices", label: "Best practices" },
  { id: "examples", label: "Examples" },
  { id: "iterating", label: "Iterating" },
  { id: "next-steps", label: "Next steps" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

export default function WorkingWithCanvasExtensions({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="working-with-canvas-extensions"
      breadcrumbLabel="Canvas Extensions"
      heroTitle="Canvas Extensions"
      animateHeroTitle
      heroSubtitle="Shared, interactive work surfaces in the GitHub Copilot app that move progress out of chat into an artifact people and agents can update."
      tocSections={articleSections}
      upNext={{
        label: "Get started with the GitHub Copilot app",
        href: pageHref("github-copilot-app"),
      }}
    >
      <section id="what-canvases-can-do" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          What canvases can do
        </Heading>
        <Text as="p" size="300" variant="muted">
          This guide explains what canvases can do, how to create one with{" "}
          <code className={styles.inlineCode}>/create-canvas</code>, and how to
          use patterns from this repository as reference implementations.
        </Text>
        <Text as="p" size="300" variant="muted">
          A canvas is a bidirectional surface:
        </Text>
        <ul className={styles.checkList}>
          {bidirectionalPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          This makes canvases especially useful for workflows where visibility
          and steering matter, for example:
        </Text>
        <ul className={styles.checkList}>
          {workflowPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <figure className={styles.videoFigure}>
          <img
            className={styles.video}
            src={canvasPoster}
            alt="Demo of using canvas extensions in the GitHub Copilot app"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </section>

      <section id="create-a-canvas" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Create a canvas with{" "}
          <code className={styles.inlineCode}>/create-canvas</code>
        </Heading>
        <Text as="p" size="300" variant="muted">
          In the GitHub Copilot app, create canvases from an active session
          using the <code className={styles.inlineCode}>/create-canvas</code>{" "}
          skill.
        </Text>
        <ol className={styles.stepsList}>
          <li>Open or start an agent session.</li>
          <li>
            In the prompt box, run{" "}
            <code className={styles.inlineCode}>/create-canvas</code> and
            describe:
            <ul className={styles.pointList}>
              <li>the workflow you want</li>
              <li>what people should do in the UI</li>
              <li>what the agent should do via callable capabilities</li>
            </ul>
          </li>
          <li>Let the agent generate the extension and open it in the right panel.</li>
          <li>Continue iterating by asking for capability or UI changes.</li>
        </ol>
      </section>

      <section id="prompt-patterns" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Prompt patterns that work well
        </Heading>
        <Text as="p" size="300" variant="muted">
          Use explicit capability language in your prompt:
        </Text>
        <CopyBlock code={triagePrompt} label="Triage canvas" />
        <CopyBlock code={releasePrompt} label="Release checklist" />
        <CopyBlock code={planningPrompt} label="Planning canvas" />
      </section>

      <section id="choose-scope" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Choose scope: project or personal
        </Heading>
        <Text as="p" size="300" variant="muted">
          When creating a canvas extension, choose where it should live:
        </Text>
        <ul className={styles.pointList}>
          <li>
            <span className={styles.stepLabel}>Project scope</span> —{" "}
            <code className={styles.inlineCode}>.github/extensions</code>{" "}
            (shared with the repository team)
          </li>
          <li>
            <span className={styles.stepLabel}>User scope</span> —{" "}
            <code className={styles.inlineCode}>~/.copilot/extensions</code>{" "}
            (personal to your machine)
          </li>
        </ul>
        <Text as="p" size="300" variant="muted">
          Use project scope when the workflow is team-relevant, and user scope
          for personal experiments or private workflows.
        </Text>
      </section>

      <section id="extension-structure" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Typical extension structure
        </Heading>
        <Text as="p" size="300" variant="muted">
          Canvas extensions can vary, but most include:
        </Text>
        <ul className={styles.pointList}>
          {structurePoints.map((item) => (
            <li key={item.lead}>
              <code className={styles.inlineCode}>{item.lead}</code> {item.rest}
            </li>
          ))}
        </ul>
      </section>

      <section id="best-practices" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Best practices
        </Heading>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Choose storage scope intentionally
          </span>
          <Text as="p" size="300" variant="muted">
            Default canvas state is often session-scoped. If you only need state
            for the current session, keep it in session storage paths such as:
          </Text>
          <ul className={styles.pointList}>
            <li>
              <code className={styles.inlineCode}>
                &lt;copilot_home&gt;/session-state/&lt;sessionId&gt;/files/&lt;whatever&gt;
              </code>
            </li>
          </ul>
          <Text as="p" size="300" variant="muted">
            If you want data to persist across multiple sessions for the same
            extension, use extension-scoped storage such as:
          </Text>
          <ul className={styles.pointList}>
            <li>
              <code className={styles.inlineCode}>
                &lt;copilot_home&gt;/extensions/&lt;extensionId&gt;/&lt;whatever&gt;
              </code>
            </li>
          </ul>
          <Text as="p" size="300" variant="muted">
            This split keeps ephemeral workflow data separate from longer-lived
            user data.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Use joinSession handlers as your canvas-agent contract
          </span>
          <Text as="p" size="300" variant="muted">
            Treat <code className={styles.inlineCode}>joinSession</code> +{" "}
            <code className={styles.inlineCode}>createCanvas</code> as the
            contract between UI interactions and agent-callable actions:
          </Text>
          <ul className={styles.pointList}>
            {contractPoints.map((item) => (
              <li key={item.lead}>
                <span className={styles.stepLabel}>{item.lead}</span>{" "}
                {item.rest}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="examples" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Examples from this repository
        </Heading>
        <Text as="p" size="300" variant="muted">
          Use these extension folders as concrete references:
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Reference implementations</span>
          <ul className={styles.pointList}>
            {examples.map((example) => (
              <li key={example.title}>
                <span className={styles.stepLabel}>{example.title}</span> —{" "}
                {example.description}
              </li>
            ))}
          </ul>
        </div>
        <Text as="p" size="300" variant="muted">
          These examples show different complexity levels, from focused workflow
          boards to richer UI + automation integrations.
        </Text>
      </section>

      <section id="iterating" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Iterating after first creation
        </Heading>
        <Text as="p" size="300" variant="muted">
          Treat the first{" "}
          <code className={styles.inlineCode}>/create-canvas</code> result as
          version one. Then refine in-place:
        </Text>
        <ul className={styles.checkList}>
          {iteratingPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          The fastest loop is: use the canvas, note friction, and ask the agent
          for a targeted update.
        </Text>
      </section>

      <section id="next-steps" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Next steps
        </Heading>
        <ul className={styles.checkList}>
          {nextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="video-series" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Video series
        </Heading>
        <Text as="p" size="300" variant="muted">
          Prefer to watch and learn? Explore these related videos from GitHub on
          the Copilot app, MCP servers, and extending agents. Play any video
          right here on the page.
        </Text>
        <VideoCarousel videos={videoSeries} />
      </section>

      <section id="learn-more" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Learn more
        </Heading>
        <div className={styles.learnMoreBand}>
          <a className={styles.learnMoreCard} href="https://github.com/features/copilot">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <GlobeIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              GitHub Copilot
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://docs.github.com/en/copilot/building-copilot-extensions/about-building-copilot-extensions">
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
