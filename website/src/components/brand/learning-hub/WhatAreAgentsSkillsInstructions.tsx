import { Heading, Text } from "@primer/react-brand";
import { BookIcon, PlayIcon, GlobeIcon, ArrowUpRightIcon } from "@primer/octicons-react";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import {
  LearningArticleLayout,
  type TocSection,
} from "../LearningArticleLayout";
import { VideoCarousel, type Video } from "../VideoCarousel";

const videoSeries: Video[] = [
  {
    id: "LsA4vIX_3UY",
    title: "Meet the GitHub Copilot app: Your new AI desktop assistant",
    meta: "GitHub",
  },
  {
    id: "onVn-lnHZ9s",
    title: "Demo: end-to-end agentic development with GitHub Copilot",
    meta: "Demo",
  },
  {
    id: "GPML5a2jZCY",
    title: "How to get the most out of the Copilot coding agent",
    meta: "Guide",
  },
  {
    id: "a1BR6K3E4zs",
    title: "When to use the coding agent versus agent mode",
    meta: "GitHub",
  },
  {
    id: "boviC841YWs",
    title: "The latest in managing and auditing GitHub Copilot agents",
    meta: "GitHub",
  },
  {
    id: "-yKALFS5ewY",
    title: "How to use agents, skills, and instructions in Copilot CLI",
    meta: "Copilot CLI",
  },
];

const agentDescriptionPoints: string[] = [
  "The tasks they specialize in (for example, “Terraform Expert” or “LaunchDarkly Flag Manager”).",
  "Which tools or MCP servers they can invoke.",
  "Optional instructions that guide the conversation style or guardrails.",
];

const agentReachPoints: string[] = [
  "You have a recurring workflow that benefits from deep tooling integrations.",
  "You want Copilot to proactively execute commands or fetch context via MCP.",
  "You need persona-level guardrails that persist throughout a coding session.",
  "You want a coordinator that can delegate narrower work to subagents.",
];

const skillReachPoints: string[] = [
  "You want to standardize how Copilot responds to a recurring task.",
  "You need bundled resources (templates, schemas, scripts) to complete the task.",
  "You want agents to discover and invoke the capability automatically.",
  "You prefer to drive the conversation, but with guardrails and rich context.",
];

const instructionReachPoints: string[] = [
  "You need persistent guidance that applies across many sessions.",
  "You are codifying architecture decisions or compliance requirements.",
  "You want Copilot to understand patterns without manually pasting context.",
];

const teamOutcomes: string[] = [
  "Consistent onboarding for new developers.",
  "Repeatable operations tasks with reduced context switching.",
  "Tailored experiences for specialized domains (security, infrastructure, data science, etc.).",
];

const articleSections: TocSection[] = [
  { id: "agents", label: "Agents" },
  { id: "skills", label: "Skills" },
  { id: "instructions", label: "Instructions" },
  {
    id: "how-the-artifacts-work-together",
    label: "How the artifacts work together",
  },
  { id: "next-steps", label: "Next steps" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

export default function AgentsSkillsInstructions({
  pageHref,
}: PrototypePageProps) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="what-are-agents-skills-instructions"
      breadcrumbLabel="Agents, Skills & Instructions"
      heroTitle="Fundamentals"
      animateHeroTitle
      heroSubtitle="Understand the core primitives that shape how Copilot behaves — what each artifact does, how it&rsquo;s packaged here, and when to use it."
      tocSections={articleSections}
      upNext={{
        label: "Using Automations in the GitHub Copilot app",
        href: pageHref("using-automations-in-copilot-app"),
      }}
    >
      <section id="agents" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Agents
        </Heading>
        <Text as="p" size="300" variant="muted">
          Agents are configuration files (
          <code className={styles.inlineCode}>*.agent.md</code>) that describe:
        </Text>
        <ul className={styles.checkList}>
          {agentDescriptionPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          When you assign an issue to Copilot or open the{" "}
          <span className={styles.stepLabel}>Agents</span> panel in VS Code,
          these configurations let you swap in a specialized assistant. Each
          agent in this repo lives under{" "}
          <code className={styles.inlineCode}>agents/</code> and includes
          metadata about the tools it depends on.
        </Text>
        <Text as="p" size="300" variant="muted">
          In products that support delegation, a primary agent can also launch
          temporary subagents for focused work such as planning, research, or
          review. See{" "}
          <a href={pageHref("agents-and-subagents")}>Agents and Subagents</a>{" "}
          for the coordination model.
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>When to reach for an agent</span>
          <ul className={styles.checkList}>
            {agentReachPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/1GVBRhDI5No"
            title="How the GitHub Copilot coding agent works"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="skills" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Skills
        </Heading>
        <Text as="p" size="300" variant="muted">
          Skills are self-contained folders that package reusable capabilities
          for GitHub Copilot. Each skill lives in its own directory and contains
          a <code className={styles.inlineCode}>SKILL.md</code> file along with
          optional bundled assets such as reference documents, templates, and
          scripts.
        </Text>
        <Text as="p" size="300" variant="muted">
          A <code className={styles.inlineCode}>SKILL.md</code> defines:
        </Text>
        <ul className={styles.checkList}>
          <li>
            A <span className={styles.stepLabel}>name</span> (used as a{" "}
            <code className={styles.inlineCode}>/command</code> in VS Code Chat
            and for agent discovery).
          </li>
          <li>
            A <span className={styles.stepLabel}>description</span> that tells
            agents and users when the skill is relevant.
          </li>
          <li>Detailed instructions for how the skill should be executed.</li>
          <li>References to any bundled assets the skill needs.</li>
        </ul>
        <Text as="p" size="300" variant="muted">
          Skills follow the open{" "}
          <a href="https://agentskills.io/home">Agent Skills specification</a>,
          making them portable across coding agent systems beyond GitHub
          Copilot.
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Why skills over prompts</span>
          <Text as="p" size="300" variant="muted">
            Skills replace the earlier prompt file (
            <code className={styles.inlineCode}>*.prompt.md</code>) pattern and
            offer several advantages:
          </Text>
          <ul className={styles.pointList}>
            <li>
              <span className={styles.stepLabel}>Agent discovery</span>: Skills
              include extended frontmatter that lets agents find and invoke them
              automatically&mdash;prompts could only be triggered manually via a
              slash command.
            </li>
            <li>
              <span className={styles.stepLabel}>Richer context</span>: Skills
              can bundle reference files, scripts, templates, and other assets
              alongside their instructions, giving the AI much more to work
              with.
            </li>
            <li>
              <span className={styles.stepLabel}>Cross-platform portability</span>: The
              Agent Skills specification is supported across multiple coding
              agent systems, so your investment travels with you.
            </li>
            <li>
              <span className={styles.stepLabel}>Slash command support</span>: Like
              prompts, skills can still be invoked via{" "}
              <code className={styles.inlineCode}>/command</code> in VS Code
              Chat.
            </li>
          </ul>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>When to reach for a skill</span>
          <ul className={styles.checkList}>
            {skillReachPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/JRDN_-4E9ts"
            title="How to extend Copilot code review with MCP and custom skills"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="instructions" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Instructions
        </Heading>
        <Text as="p" size="300" variant="muted">
          Instructions (
          <code className={styles.inlineCode}>*.instructions.md</code>) provide
          background context that Copilot reads whenever it works on matching
          files. They often contain:
        </Text>
        <ul className={styles.checkList}>
          <li>
            Coding standards or style guides (naming conventions, testing
            strategy).
          </li>
          <li>
            Framework-specific hints (Angular best practices, .NET analyzers to
            suppress).
          </li>
          <li>
            Repository-specific rules (&ldquo;never commit secrets&rdquo;,
            &ldquo;feature flags must live in{" "}
            <code className={styles.inlineCode}>flags/</code>&rdquo;).
          </li>
        </ul>
        <Text as="p" size="300" variant="muted">
          Instructions sit under{" "}
          <code className={styles.inlineCode}>instructions/</code> and can be
          scoped globally, per language, or per directory using glob patterns.
          They help Copilot align with your engineering playbook automatically.
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            When to reach for instructions
          </span>
          <ul className={styles.checkList}>
            {instructionReachPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/0jEzUhU8bLc"
            title="Your codebase, your rules: Customizing Copilot with context engineering"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section
        id="how-the-artifacts-work-together"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          How the artifacts work together
        </Heading>
        <Text as="p" size="300" variant="muted">
          Think of these artifacts as complementary layers:
        </Text>
        <ol className={styles.stepsList}>
          <li>
            <span className={styles.stepLabel}>Instructions</span> lay the
            groundwork with long-lived guardrails.
          </li>
          <li>
            <span className={styles.stepLabel}>Skills</span> let you trigger
            rich, reusable workflows on demand&mdash;and let agents discover
            those workflows automatically.
          </li>
          <li>
            <span className={styles.stepLabel}>Agents</span> bring the most
            opinionated behavior, bundling tools and instructions into a single
            persona.
          </li>
        </ol>
        <Text as="p" size="300" variant="muted">
          By combining all three, teams can achieve:
        </Text>
        <ul className={styles.checkList}>
          {teamOutcomes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="next-steps" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Next steps
        </Heading>
        <ul className={styles.checkList}>
          <li>
            Explore the rest of the{" "}
            <span className={styles.stepLabel}>Fundamentals</span> track for
            deeper dives on chat modes, collections, and MCP servers.
          </li>
          <li>
            Browse the <a href={pageHref("agents")}>Awesome Agents</a>,{" "}
            <a href={pageHref("skills")}>Skills</a>, and{" "}
            <a href={pageHref("instructions")}>Instructions</a> directories for
            inspiration.
          </li>
          <li>
            Try generating your own artifacts, then add them to the repo to keep
            the Learning Hub evolving.
          </li>
        </ul>
      </section>

      <section id="video-series" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Video series
        </Heading>
        <Text as="p" size="300" variant="muted">
          Prefer to watch and learn? Explore this playlist from GitHub on
          agents, skills, and instructions. Play any video right here on the
          page.
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
          <a className={styles.learnMoreCard} href="https://docs.github.com/en/copilot/concepts/agents">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <BookIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              Documentation
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://www.youtube.com/playlist?list=PL0lo9MOBetEFc6rN_y9-YKA3plCSUb1NP">
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
