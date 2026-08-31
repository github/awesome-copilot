/**
 * Bespoke Learning Hub article for "Using Automations in the GitHub Copilot app",
 * ported near-verbatim from the Brand Engineering prototype's
 * `pages/using-automations-in-copilot-app.tsx`
 * (`site-generator/prototypes/awesome-copilot-community-library`).
 *
 * Only the following were adapted from the prototype source:
 * - `PrototypePageProps`/`pageHref` import swapped for the site's `pageHref`.
 * - Media imports replaced with static paths. The large source video
 *   (`copilot-app-delegate-to-agents.mp4`, ~32MB) is not committed to this
 *   repo — TODO: host it externally (e.g. a CDN/GitHub release asset) and swap
 *   `delegateGif` below to a real `<video>` source. Until then the clip renders
 *   as its already-ported static webp.
 */
import { Heading, Text } from "@primer/react-brand";
import { BookIcon, PlayIcon, GlobeIcon, ArrowUpRightIcon } from "@primer/octicons-react";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import {
  LearningArticleLayout,
  type TocSection,
} from "../LearningArticleLayout";
import { VideoCarousel, type Video } from "../VideoCarousel";

// TODO: replace with a hosted URL once the large source video is uploaded
// externally; see file header note.
const delegateGif = "/images/learning-hub/using-automations-in-copilot-app/copilot-app-delegate-to-agents.webp";

const videoSeries: Video[] = [
  {
    id: "usXv9jJWjvI",
    title: "Automating daily workflows with the GitHub Copilot app and MCP",
    meta: "GitHub",
  },
  {
    id: "3_i03fGXs9U",
    title: "Introducing GitHub Agentic Workflows",
    meta: "GitHub",
  },
  {
    id: "P2qK2BCdi-w",
    title: "Demo: using /delegate in the GitHub Copilot CLI",
    meta: "Demo",
  },
  {
    id: "HDEGFNAUkX8",
    title: "How to automate code reviews and testing with GitHub Copilot",
    meta: "Guide",
  },
  {
    id: "onVn-lnHZ9s",
    title: "Demo: end-to-end agentic development with GitHub Copilot",
    meta: "Demo",
  },
  {
    id: "LsA4vIX_3UY",
    title: "Meet the GitHub Copilot app: Your new AI desktop assistant",
    meta: "GitHub",
  },
];

const createAutomationUrl =
  "ghapp://automations/new?name=Awesome%20Copilot%20daily%20PR%20summary&trigger=daily&time=09%3A00&prompt=Pulls%20open%20PRs%20via%20gh%20api%2C%20filters%20to%20updates%20in%20the%20last%2024%20hours%2C%20and%20returns%20a%20concise%20summary%20table";

const whyThisWorks: string[] = [
  "It is narrowly scoped (one repo, one reporting goal).",
  "It has explicit command examples in the prompt.",
  "It runs on a predictable cadence and produces a format that is easy to review.",
];

const typicalRefinements: string[] = [
  "Tighten scope (for example, only specific labels, teams, or paths)",
  "Improve output format (table, checklist, short summary)",
  "Add clear success criteria (what should be included or excluded)",
];

const communityIdeas: string[] = [
  "Daily status updates for initiative-specific issues",
  "Review and inbox hygiene tasks",
  "Recurring personal workflow maintenance",
];

const practicalGuardrails: string[] = [
  "Keep prompts explicit and scoped to one outcome.",
  "Give the automation only the capabilities it needs.",
  "Avoid secrets in prompts; use repository secrets and variables where needed.",
  "Prefer review-friendly outputs so it is easy to trust and iterate.",
];

const articleSections: TocSection[] = [
  {
    id: "start-with-templates-then-customize",
    label: "Start with templates (then customize)",
  },
  {
    id: "use-the-work-surface-audit-trick",
    label: "Use the work-surface audit trick",
  },
  {
    id: "create-your-first-automation-in-the-app",
    label: "Create your first automation in the app",
  },
  {
    id: "example-awesome-copilot-daily-pr-summary",
    label: "Example: Awesome Copilot daily PR summary",
  },
  {
    id: "iterate-in-chat-to-improve-results",
    label: "Iterate in chat to improve results",
  },
  {
    id: "real-world-ideas-from-the-community",
    label: "Real-world ideas from the community",
  },
  { id: "practical-guardrails", label: "Practical guardrails" },
  { id: "next-step", label: "Next step" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

export default function UsingAutomationsInCopilotApp({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="using-automations-in-copilot-app"
      breadcrumbLabel="Automations"
      heroTitle="Automations in the GitHub Copilot app"
      animateHeroTitle
      heroSubtitle="One of the fastest ways to make the GitHub Copilot app useful daily: save a recurring task once, then run it on a schedule or on demand."
      tocSections={articleSections}
      upNext={{
        label: "Working with Canvas Extensions",
        href: pageHref("working-with-canvas-extensions"),
      }}
    >
      <section
        id="start-with-templates-then-customize"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Start with templates (then customize)
        </Heading>
        <Text as="p" size="300" variant="muted">
          If you are not sure where to begin, start with templates, adapt one to
          your workflow, and iterate from real runs.
        </Text>
        <Text as="p" size="300" variant="muted">
          When you create a new automation in the Copilot app, browse the
          built-in templates first. They give you a strong starting point for
          both prompt structure and scope.
        </Text>
        <Text as="p" size="300" variant="muted">
          Common examples include:
        </Text>
        <ul className={styles.checkList}>
          <li>
            <span className={styles.stepLabel}>Triage incoming issues</span> (for
            example, label issues as{" "}
            <code className={styles.inlineCode}>bug</code>,{" "}
            <code className={styles.inlineCode}>enhancement</code>, or{" "}
            <code className={styles.inlineCode}>other</code>)
          </li>
          <li>
            <span className={styles.stepLabel}>Fix failing tests nightly</span>{" "}
            (attempt a fix and open a draft pull request)
          </li>
          <li>
            <span className={styles.stepLabel}>
              Prepare weekly release notes
            </span>{" "}
            (draft and open a pull request on schedule)
          </li>
        </ul>
        <Text as="p" size="300" variant="muted">
          Even if none of these are an exact match, templates are the quickest
          way to avoid a blank-page start.
        </Text>
        <figure className={styles.videoFigure}>
          <img
            className={styles.video}
            src={delegateGif}
            alt="Demo of delegating work to agents in the GitHub Copilot app"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </section>

      <section
        id="use-the-work-surface-audit-trick"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Use the work-surface audit trick
        </Heading>
        <Text as="p" size="300" variant="muted">
          A practical way to discover useful automations is to ask Copilot to
          audit your work surfaces and suggest candidates.
        </Text>
        <Text as="p" size="300" variant="muted">
          If you have MCP servers configured (for example, WorkIQ for Microsoft
          365 or a Slack MCP server), try a prompt like this in a regular chat
          first:
        </Text>
        <blockquote className={styles.prompt}>
          If available, use WorkIQ (Teams/Outlook) and a Slack MCP server to
          review my recent messages and calendar. Identify where I’m missing
          follow-ups or repeating work, and suggest a short list of useful
          automations.
        </blockquote>
        <Text as="p" size="300" variant="muted">
          This often produces several concrete automation ideas in one pass. Then
          turn the best one into a saved automation.
        </Text>
      </section>

      <section
        id="create-your-first-automation-in-the-app"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Create your first automation in the app
        </Heading>
        <ol className={styles.stepsList}>
          <li>
            Open <span className={styles.stepLabel}>Automations</span> in the
            Copilot app sidebar.
          </li>
          <li>
            Click <span className={styles.stepLabel}>New automation</span>.
          </li>
          <li>Start from a template or from scratch.</li>
          <li>Give it a clear name and a specific prompt.</li>
          <li>Choose when it runs (manual, hourly, daily, or weekly).</li>
          <li>Optionally set mode, model, and reasoning effort.</li>
          <li>
            Use <span className={styles.stepLabel}>Create and run</span> for the
            first run so you can immediately inspect output and refine.
          </li>
        </ol>
        <Text as="p" size="300" variant="muted">
          If your first version is only 70% right, that is normal. The fastest
          path is to iterate from a real run.
        </Text>
      </section>

      <section
        id="example-awesome-copilot-daily-pr-summary"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Example: Awesome Copilot daily PR summary
        </Heading>
        <Text as="p" size="300" variant="muted">
          Here is a real in-app automation used on the{" "}
          <code className={styles.inlineCode}>github/awesome-copilot</code>{" "}
          repository:
        </Text>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name</td>
              <td>Awesome Copilot daily PR summary</td>
            </tr>
            <tr>
              <td>Interval</td>
              <td>Daily at 09:00</td>
            </tr>
            <tr>
              <td>Mode</td>
              <td>Autopilot</td>
            </tr>
            <tr>
              <td>What it does</td>
              <td>
                Pulls open PRs via{" "}
                <code className={styles.inlineCode}>gh api</code>, filters to
                updates in the last 24 hours, and returns a concise summary
                table
              </td>
            </tr>
          </tbody>
        </table>
        <Text as="p" size="300" variant="muted">
          <a href={createAutomationUrl}>Create Automation</a>
        </Text>
        <Text as="p" size="300" variant="muted">
          Why this works well:
        </Text>
        <ul className={styles.checkList}>
          {whyThisWorks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          This is a strong starter pattern you can copy for issue triage, release
          prep, review tracking, or team digests.
        </Text>
      </section>

      <section
        id="iterate-in-chat-to-improve-results"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Iterate in chat to improve results
        </Heading>
        <Text as="p" size="300" variant="muted">
          After each run, open a chat and refine the automation prompt directly.
          Typical refinements:
        </Text>
        <ul className={styles.checkList}>
          {typicalRefinements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          The goal is not a perfect first prompt. The goal is a useful automation
          that gets better with each run.
        </Text>
      </section>

      <section
        id="real-world-ideas-from-the-community"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Real-world ideas from the community
        </Heading>
        <Text as="p" size="300" variant="muted">
          Teams are already using recurring automations for practical work such
          as:
        </Text>
        <ul className={styles.checkList}>
          {communityIdeas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          Use these as patterns, then tailor them to your own repo, rituals, and
          communication style.
        </Text>
      </section>

      <section id="practical-guardrails" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Practical guardrails
        </Heading>
        <ul className={styles.checkList}>
          {practicalGuardrails.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="next-step" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Next step
        </Heading>
        <Text as="p" size="300" variant="muted">
          Open <span className={styles.stepLabel}>Automations</span>, pick one
          template, and convert one recurring task you currently do manually into
          a daily run. That single win usually makes the next automation obvious.
        </Text>
      </section>

      <section id="video-series" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Video series
        </Heading>
        <Text as="p" size="300" variant="muted">
          Prefer to watch and learn? Explore these related videos from GitHub on
          automating workflows, delegating to agents, and agentic development.
          Play any video right here on the page.
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
          <a className={styles.learnMoreCard} href="https://docs.github.com/en/copilot/concepts/coding-agent">
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
