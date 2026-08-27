import { Heading, Text } from "@primer/react-brand";
import { BookIcon, PlayIcon, GlobeIcon, ArrowUpRightIcon } from "@primer/octicons-react";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import { InstallCommandBar } from "../InstallCommandBar";
import { LearningArticleLayout, type TocSection } from "../LearningArticleLayout";
import { VideoCarousel, type Video } from "../VideoCarousel";

const cliIntroVideo = "/media/cli-for-beginners-intro.mp4";

const articleSections: TocSection[] = [
  { id: "what-youll-learn", label: "What you’ll learn" },
  { id: "prerequisites", label: "Prerequisites" },
  {
    id: "github-copilot-family",
    label: "Understanding the GitHub Copilot family",
  },
  { id: "course-structure", label: "Course structure" },
  { id: "how-this-course-works", label: "How this course works" },
  {
    id: "command-reference",
    label: "GitHub Copilot CLI command reference",
  },
  { id: "getting-help", label: "Getting help" },
  { id: "license", label: "License" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

/** GitHub's official "Copilot CLI for Beginners" YouTube series. */
const videoSeries: Video[] = [
  {
    id: "BDxRhhs36ns",
    title: "Getting started with GitHub Copilot CLI",
    meta: "Part 1 · GitHub",
  },
  {
    id: "bdIJkGr2NV0",
    title: "Interactive vs non-interactive modes",
    meta: "Part 2 · GitHub",
  },
  {
    id: "-Yavis20B4Q",
    title: "A beginner’s guide to slash commands",
    meta: "Part 3 · GitHub",
  },
  {
    id: "v8dr7QcIiLU",
    title: "Plan, delegate, and review",
    meta: "Part 4 · GitHub",
  },
  {
    id: "DtQjVIRRszM",
    title: "How to use MCP servers with Copilot CLI",
    meta: "Part 5 · GitHub",
  },
  {
    id: "-yKALFS5ewY",
    title: "Using agents, skills, and instructions",
    meta: "Part 6 · GitHub",
  },
];

export default function CliForBeginnersOverview({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="cli-for-beginners"
      breadcrumbLabel="Copilot CLI"
      heroTitle="GitHub Copilot CLI"
      animateHeroTitle
      heroSubtitle="GitHub Copilot CLI brings AI assistance to your terminal — ask questions, generate apps, review code, write tests, and debug without leaving it. Start here, then continue into the hands-on workshop track."
      heroExtra={<InstallCommandBar />}
      tocSections={articleSections}
      upNext={{
        label: "Quick Start",
        href: pageHref("learning-hub/cli-for-beginners/00-quick-start"),
      }}
    >
      <section id="what-youll-learn" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          What you’ll learn
        </Heading>
        <Text as="p" size="300" variant="muted">
          <strong>
            Learn to supercharge your development workflow with AI-powered
            command-line assistance.
          </strong>
        </Text>
        <figure className={styles.videoFigure}>
          <video
            className={styles.video}
            src={cliIntroVideo}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Demo of GitHub Copilot CLI assisting from the terminal"
          />
        </figure>
        <Text as="p" size="300" variant="muted">
          Think of it as having a knowledgeable colleague available 24/7 who can
          read your code, explain confusing patterns, and help you work faster!
        </Text>
        <Text as="p" size="300" variant="muted">
          This course is designed for:
        </Text>
        <ul className={styles.checkList}>
          <li>
            <strong>Software Developers</strong> who want to use AI from the
            command line
          </li>
          <li>
            <strong>Terminal users</strong> who prefer keyboard-driven workflows
            over IDE integrations
          </li>
          <li>
            <strong>Teams looking to standardize</strong> AI-assisted code review
            and development practices
          </li>
        </ul>
        <Text as="p" size="300" variant="muted">
          This hands-on course takes you from zero to productive with GitHub
          Copilot CLI. You’ll work with a single Python book collection app
          throughout all chapters, progressively improving it using AI-assisted
          workflows. By the end, you’ll confidently use AI to review code,
          generate tests, debug issues, and automate workflows: all from your
          terminal.
        </Text>
        <Text as="p" size="300" variant="muted">
          <strong>No AI experience required.</strong> If you can use a terminal,
          you can learn this.
        </Text>
        <Text as="p" size="300" variant="muted">
          <strong>Perfect for:</strong> Developers, students, and anyone who has
          experience with software development.
        </Text>
      </section>

      <section id="prerequisites" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Prerequisites
        </Heading>
        <Text as="p" size="300" variant="muted">
          Before starting, ensure you have:
        </Text>
        <ul className={styles.checkList}>
          <li>
            <strong>GitHub account</strong>: {" "}
            <a href="https://github.com/signup">Create one free</a>
          </li>
          <li>
            <strong>GitHub Copilot access</strong>:{" "}
            <a href="https://github.com/features/copilot/plans">
              Free offering
            </a>
            {", "}
            <a href="https://github.com/features/copilot/plans">
              Monthly subscription
            </a>
            {", or "}
            <a href="https://education.github.com/pack">
              Free for students/teachers
            </a>
          </li>
          <li>
            <strong>Terminal basics</strong>: Comfortable with {" "}
            <code className={styles.inlineCode}>cd</code>, {" "}
            <code className={styles.inlineCode}>ls</code>, running commands
          </li>
        </ul>
      </section>

      <section id="github-copilot-family" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Understanding the GitHub Copilot family
        </Heading>
        <Text as="p" size="300" variant="muted">
          GitHub Copilot has evolved into a family of AI-powered tools. Here’s
          where each one lives:
        </Text>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Where it runs</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <a href="https://docs.github.com/copilot/how-tos/copilot-cli/cli-getting-started">
                  <strong>GitHub Copilot CLI</strong>
                </a>
                <br />
                (this course)
              </td>
              <td>Your terminal</td>
              <td>Terminal-native AI coding assistant</td>
            </tr>
            <tr>
              <td>
                <a href="https://docs.github.com/copilot">
                  <strong>GitHub Copilot</strong>
                </a>
              </td>
              <td>VS Code, Visual Studio, JetBrains, etc.</td>
              <td>Agent mode, chat, inline suggestions</td>
            </tr>
            <tr>
              <td>
                <a href="https://github.com/copilot">
                  <strong>Copilot on GitHub.com</strong>
                </a>
              </td>
              <td>GitHub</td>
              <td>Immersive chat about your repos, create agents, and more</td>
            </tr>
            <tr>
              <td>
                <a href="https://docs.github.com/copilot/using-github-copilot/using-copilot-coding-agent-to-work-on-tasks">
                  <strong>GitHub Copilot coding agent</strong>
                </a>
              </td>
              <td>GitHub</td>
              <td>Assign issues to agents, get PRs back</td>
            </tr>
          </tbody>
        </table>
        <Text as="p" size="300" variant="muted">
          This course focuses on <strong>GitHub Copilot CLI</strong>, bringing AI
          assistance directly to your terminal.
        </Text>
      </section>

      <section id="course-structure" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Course structure
        </Heading>
        <table>
          <thead>
            <tr>
              <th>Chapter</th>
              <th>Title</th>
              <th>What you’ll build</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>00</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/00-quick-start")}>Quick Start</a>
              </td>
              <td>Installation and verification</td>
            </tr>
            <tr>
              <td>01</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/01-setup-and-first-steps")}>First Steps</a>
              </td>
              <td>Live demos + three interaction modes</td>
            </tr>
            <tr>
              <td>02</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/02-context-and-conversations")}>
                  Context and Conversations
                </a>
              </td>
              <td>Multi-file project analysis</td>
            </tr>
            <tr>
              <td>03</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/03-development-workflows")}>
                  Development Workflows
                </a>
              </td>
              <td>Code review, debug, test generation</td>
            </tr>
            <tr>
              <td>04</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/04-agents-and-custom-instructions")}>
                  Create Specialized AI Assistants
                </a>
              </td>
              <td>Custom agents for your workflow</td>
            </tr>
            <tr>
              <td>05</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/05-skills")}>Automate Repetitive Tasks</a>
              </td>
              <td>Skills that load automatically</td>
            </tr>
            <tr>
              <td>06</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/06-mcp-servers")}>
                  Connect to GitHub, Databases &amp; APIs
                </a>
              </td>
              <td>MCP server integration</td>
            </tr>
            <tr>
              <td>07</td>
              <td>
                <a href={pageHref("learning-hub/cli-for-beginners/07-putting-it-all-together")}>
                  Putting It All Together
                </a>
              </td>
              <td>Complete feature workflows</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="how-this-course-works" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          How this course works
        </Heading>
        <Text as="p" size="300" variant="muted">
          Each chapter follows the same pattern:
        </Text>
        <ol className={styles.stepsList}>
          <li>
            <strong>Real-World Analogy</strong>: Understand the concept through
            familiar comparisons
          </li>
          <li>
            <strong>Core Concepts</strong>: Learn the essential knowledge
          </li>
          <li>
            <strong>Hands-On Examples</strong>: Run actual commands and see
            results
          </li>
          <li>
            <strong>Assignment</strong>: Practice what you learned
          </li>
          <li>
            <strong>What’s Next</strong>: Preview of the following chapter
          </li>
        </ol>
        <Text as="p" size="300" variant="muted">
          <strong>Code examples are runnable.</strong> Every copilot text block in
          this course can be copied and run in your terminal.
        </Text>
      </section>

      <section id="command-reference" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          GitHub Copilot CLI command reference
        </Heading>
        <Text as="p" size="300" variant="muted">
          The {" "}
          <strong>
            <a href="https://docs.github.com/en/copilot/reference/cli-command-reference">
              GitHub Copilot CLI command reference
            </a>
          </strong>{" "}
          helps you find commands and keyboard shortcuts to help you use Copilot
          CLI effectively.
        </Text>
      </section>

      <section id="getting-help" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Getting help
        </Heading>
        <ul className={styles.checkList}>
          <li>
            <strong>Found a bug?</strong> {" "}
            <a href="https://github.com/github/copilot-cli-for-beginners/issues">
              Open an Issue
            </a>
          </li>
          <li>
            <strong>Want to contribute?</strong> PRs welcome!
          </li>
          <li>
            <strong>Official Docs:</strong> {" "}
            <a href="https://docs.github.com/copilot/concepts/agents/about-copilot-cli">
              GitHub Copilot CLI Documentation
            </a>
          </li>
        </ul>
      </section>

      <section id="license" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          License
        </Heading>
        <Text as="p" size="300" variant="muted">
          This project is licensed under the terms of the MIT open source license.
          Please refer to the {" "}
          <a href="https://github.com/github/copilot-cli-for-beginners/blob/main/LICENSE">
            LICENSE
          </a>{" "}
          file for the full terms.
        </Text>
      </section>

      <section id="video-series" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Video series
        </Heading>
        <Text as="p" size="300" variant="muted">
          Prefer to watch and learn? Follow GitHub’s official{" "}
          <strong>Copilot CLI for beginners</strong> video series. Pick a chapter
          below to play it right here on the page.
        </Text>
        <VideoCarousel videos={videoSeries} />
      </section>

      <section id="learn-more" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Learn more
        </Heading>
        <div className={styles.learnMoreBand}>
          <a className={styles.learnMoreCard} href="https://github.com/features/copilot/cli">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <GlobeIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              GitHub Copilot CLI
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <BookIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              Documentation
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://www.youtube.com/playlist?list=PL0lo9MOBetEHvO-spzKBAITkkTqv4RvNl">
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
