import type { ReactNode } from "react";
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

const videoSeries: Video[] = [
  {
    id: "LsA4vIX_3UY",
    title: "Meet the GitHub Copilot app: Your new AI desktop assistant",
    meta: "GitHub",
  },
];

type GlossaryBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "code"; code: string };

type GlossaryTerm = {
  id: string;
  term: string;
  definition: [GlossaryBlock, ...GlossaryBlock[]];
};

const articleBaseUrl =
  "https://awesome-copilot.github.com/learning-hub/github-copilot-terminology-glossary/";

const frontMatterExample = `---
name: 'React Component Generator'
description: 'Generate modern React components with TypeScript'
mode: 'agent'
tools: ['codebase']
---`;

const toolsExample = `tools: ['codebase', 'terminalCommand', 'github']`;

const coreTerms: GlossaryTerm[] = [
  {
    id: "agent",
    term: "Agent",
    definition: [
      {
        type: "paragraph",
        text: "A specialized configuration file (`*.agent.md`) that defines a GitHub Copilot persona or assistant with specific expertise, tools, and behavior patterns. In products that support delegation, the agent is usually the primary coordinator or main session persona, while subagents handle narrower delegated tasks.",
      },
      {
        type: "paragraph",
        text: "**When to use**: For recurring workflows that benefit from deep tooling integrations and persistent conversational context.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/)",
      },
    ],
  },
  {
    id: "subagent",
    term: "Subagent",
    definition: [
      {
        type: "paragraph",
        text: "A temporary, task-focused agent launched by another agent or orchestrator. A subagent usually gets a narrower prompt, its own isolated context window, and returns a summary back to the main agent instead of staying in the primary conversation.",
      },
      {
        type: "paragraph",
        text: "**When to use**: For isolated research, parallel analysis, specialized review passes, or delegated implementation steps.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Agents and Subagents](../agents-and-subagents/)",
      },
    ],
  },
  {
    id: "built-in-tool",
    term: "Built-in Tool",
    definition: [
      {
        type: "paragraph",
        text: "A native capability provided by GitHub Copilot without requiring additional configuration or MCP servers. Examples include code search, file editing, terminal command execution, and web search. Built-in tools are always available and don’t require installation.",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Tools](#tools), [MCP](#mcp-model-context-protocol)",
      },
    ],
  },
  {
    id: "chat-mode",
    term: "Chat Mode",
    definition: [
      {
        type: "paragraph",
        text: "**Deprecated terminology** - This term is no longer used. Use [Agent](#agent) instead.",
      },
      {
        type: "paragraph",
        text: "Previously, “chat mode” was an alternative term for [Agent](#agent) that described how GitHub Copilot Chat could be transformed into domain-specific assistants. The ecosystem has standardized on “Agent” as the preferred terminology.",
      },
      {
        type: "paragraph",
        text: "**See**: [Agent](#agent)",
      },
    ],
  },
  {
    id: "collection",
    term: "Collection",
    definition: [
      {
        type: "paragraph",
        text: "**Note**: Collections are a concept specific to the Awesome GitHub Copilot repository and are not part of standard GitHub Copilot terminology.",
      },
      {
        type: "paragraph",
        text: "A curated grouping of related skills, instructions, and agents organized around a specific theme or workflow. Collections are defined in YAML files (`*.collection.yml`) in the `collections/` directory and help users discover related customizations together.",
      },
      {
        type: "paragraph",
        text: "**Example**: The “Awesome Copilot” collection bundles meta-skills for discovering and generating GitHub Copilot customizations.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/)",
      },
    ],
  },
  {
    id: "custom-agent",
    term: "Custom Agent",
    definition: [
      {
        type: "paragraph",
        text: "See [Agent](#agent). The term “custom” emphasizes that these are user-defined configurations rather than GitHub Copilot’s default behavior. Custom agents can be created by anyone and shared via repositories like Awesome GitHub Copilot.",
      },
    ],
  },
  {
    id: "custom-instruction",
    term: "Custom Instruction",
    definition: [
      {
        type: "paragraph",
        text: "See [Instruction](#instruction). The term “custom” emphasizes that these are user-defined rules rather than GitHub Copilot’s built-in understanding. Custom instructions are particularly useful for codifying team-specific standards and architectural decisions.",
      },
    ],
  },
];

const configurationTerms: GlossaryTerm[] = [
  {
    id: "front-matter",
    term: "Front Matter",
    definition: [
      {
        type: "paragraph",
        text: "YAML metadata placed at the beginning of Markdown files (between `---` delimiters) that provides structured information about the file and controls its behavior. In this repository, front matter typically includes fields like `name`, `description`, `mode`, `model`, `tools`, and `applyTo`.",
      },
      {
        type: "paragraph",
        text: "The front matter is what controls:",
      },
      {
        type: "bullets",
        items: [
          "**Tool access**: Which built-in and MCP tools the customization can use",
          "**Model selection**: Which AI model powers the customization",
          "**Scope**: Where the customization applies (e.g., `applyTo` patterns for instructions)",
        ],
      },
      {
        type: "paragraph",
        text: "**Note**: Not all fields are common across all customization types. Refer to the specific documentation for agents, skills, or instructions to see which fields apply to each type.",
      },
      {
        type: "paragraph",
        text: "**Example**:",
      },
      {
        type: "code",
        code: frontMatterExample,
      },
      {
        type: "paragraph",
        text: "**Used in**: Skills, agents, instructions, and Learning Hub articles.",
      },
    ],
  },
  {
    id: "handoff",
    term: "Handoff",
    definition: [
      {
        type: "paragraph",
        text: "A VS Code custom-agent frontmatter property (`handoffs`) that defines suggested transitions from one agent to another, often with a pre-filled follow-up prompt. Handoffs are useful for guided workflows such as research -> implementation or planning -> review.",
      },
      {
        type: "paragraph",
        text: "**Important**: GitHub’s [custom agent configuration reference](../building-custom-agents/#agent-configuration-reference) says `handoffs` are currently ignored for Copilot cloud agent on GitHub.com, so this concept is not portable across every Copilot surface.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Agents and Subagents](../agents-and-subagents/), [Building Custom Agents](../building-custom-agents/)",
      },
    ],
  },
  {
    id: "agentsmd",
    term: "AGENTS.md",
    definition: [
      {
        type: "paragraph",
        text: "An emerging industry standard file format for defining portable AI coding instructions that work across different AI coding tools (GitHub Copilot, Claude, Codex, and others). The `AGENTS.md` file, typically placed in a repository root or `.github/` directory, contains instructions for how AI assistants should interact with your codebase.",
      },
      {
        type: "paragraph",
        text: "Unlike tool-specific customization files (`.agent.md`, `.prompt.md`, `.instructions.md`), `AGENTS.md` aims to provide a standardized, platform-agnostic way to define AI behavior that can be consumed by multiple tools.",
      },
      {
        type: "paragraph",
        text: "**Key characteristics**:",
      },
      {
        type: "bullets",
        items: [
          "Platform-agnostic format for cross-tool compatibility",
          "Typically contains project context, coding standards, and architectural guidelines",
          "Located at repository root or in `.github/` directory",
        ],
      },
      {
        type: "paragraph",
        text: "**Learn more**: [AGENTS.md Specification](https://agents.md/)",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Instruction](#instruction), [Front Matter](#front-matter)",
      },
    ],
  },
  {
    id: "instruction",
    term: "Instruction",
    definition: [
      {
        type: "paragraph",
        text: "A configuration file (`*.instructions.md`) that provides persistent background context and coding standards that GitHub Copilot reads whenever working on matching files. Instructions contain style guides, framework-specific hints, and repository rules that help Copilot align with your engineering practices automatically.",
      },
      {
        type: "paragraph",
        text: "**When to use**: For long-lived guidance that applies across many sessions, like coding standards or compliance requirements.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/), [Defining Custom Instructions](../defining-custom-instructions/)",
      },
    ],
  },
];

const skillsTerms: GlossaryTerm[] = [
  {
    id: "persona",
    term: "Persona",
    definition: [
      {
        type: "paragraph",
        text: "The identity, tone, and behavioral characteristics defined for an [Agent](#agent). A well-crafted persona helps GitHub Copilot respond consistently and appropriately for specific domains or expertise areas.",
      },
      {
        type: "paragraph",
        text: "**Example**: A “Database Performance Expert” persona might prioritize query optimization and explain concepts using database-specific terminology.",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Agent](#agent)",
      },
    ],
  },
  {
    id: "prompt",
    term: "Prompt",
    definition: [
      {
        type: "paragraph",
        text: "**Deprecated** — Prompts (`*.prompt.md`) were reusable chat templates that captured specific tasks or workflows, invoked using the `/` command in GitHub Copilot Chat. Prompts have been superseded by [Skills](#skill), which offer the same slash-command invocation plus agent discovery, bundled assets, and cross-platform portability.",
      },
      {
        type: "paragraph",
        text: "If you have existing prompts, consider migrating them to skills. See [Creating Effective Skills](../creating-effective-skills/) for guidance.",
      },
      {
        type: "paragraph",
        text: "**See**: [Skill](#skill)",
      },
    ],
  },
  {
    id: "skill",
    term: "Skill",
    definition: [
      {
        type: "paragraph",
        text: "A self-contained folder containing a `SKILL.md` file and optional bundled assets (reference documents, templates, scripts) that packages a reusable capability for GitHub Copilot. Skills follow the open [Agent Skills specification](https://agentskills.io/home) and can be invoked by users via `/command` or discovered and invoked by agents automatically.",
      },
      {
        type: "paragraph",
        text: "**Key advantages**:",
      },
      {
        type: "bullets",
        items: [
          "**Agent discovery**: Extended frontmatter lets agents find and invoke skills automatically",
          "**Bundled assets**: Reference files, templates, and scripts provide richer context",
          "**Cross-platform**: Portable across coding agent systems via the Agent Skills specification",
        ],
      },
      {
        type: "paragraph",
        text: "**Example**: A `/generate-tests` skill might include a `SKILL.md` with testing instructions, a `references/test-patterns.md` with common patterns, and a `templates/test-template.ts` starter file.",
      },
      {
        type: "paragraph",
        text: "**When to use**: For standardizing how Copilot responds to recurring tasks, especially when bundled resources improve quality.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/), [Creating Effective Skills](../creating-effective-skills/)",
      },
    ],
  },
];

const platformTerms: GlossaryTerm[] = [
  {
    id: "mcp-model-context-protocol",
    term: "MCP (Model Context Protocol)",
    definition: [
      {
        type: "paragraph",
        text: "A standardized protocol for connecting AI assistants like GitHub Copilot to external data sources, tools, and services. MCP servers act as bridges, allowing Copilot to interact with APIs, databases, file systems, and other resources beyond its built-in capabilities.",
      },
      {
        type: "paragraph",
        text: "**Example**: An MCP server might provide access to your company’s internal documentation, AWS resources, or a specific database system.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Model Context Protocol](https://modelcontextprotocol.io/) | [MCP Specification](https://spec.modelcontextprotocol.io/) | [Understanding MCP Servers](../understanding-mcp-servers/)",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Tools](#tools), [Built-in Tool](#built-in-tool)",
      },
    ],
  },
  {
    id: "hook",
    term: "Hook",
    definition: [
      {
        type: "paragraph",
        text: "A shell command or script that runs automatically in response to lifecycle events during a Copilot agent session. Hooks are stored as JSON files in `.github/hooks/` and can trigger on events like session start/end, prompt submission, before/after tool use, and when errors occur. They provide deterministic automation—linting, formatting, governance scanning—that doesn’t depend on the AI remembering to do it.",
      },
      {
        type: "paragraph",
        text: "**Example**: A `postToolUse` hook that runs Prettier after the agent edits files, or a `preToolUse` hook that blocks dangerous shell commands.",
      },
      {
        type: "paragraph",
        text: "**When to use**: For deterministic automation that must happen reliably, like formatting code, running linters, or auditing prompts for compliance.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Automating with Hooks](../automating-with-hooks/)",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Agent](#agent), [Coding Agent](#coding-agent)",
      },
    ],
  },
  {
    id: "coding-agent",
    term: "Coding Agent",
    definition: [
      {
        type: "paragraph",
        text: "The autonomous GitHub Copilot agent that works on issues in a cloud environment without continuous human guidance. You assign an issue to Copilot, it spins up a dev environment, implements a solution, runs tests, and opens a pull request for review.",
      },
      {
        type: "paragraph",
        text: "**Key characteristics**:",
      },
      {
        type: "bullets",
        items: [
          "Runs in an isolated cloud environment",
          "Uses your repository’s instructions, agents, skills, and hooks",
          "Always produces a PR—it can’t merge or deploy",
          "Supports iteration via PR comments",
        ],
      },
      {
        type: "paragraph",
        text: "**When to use**: For well-defined tasks with clear acceptance criteria that can be completed autonomously.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Using the Copilot Coding Agent](../using-copilot-coding-agent/)",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Agent](#agent), [Hook](#hook)",
      },
    ],
  },
  {
    id: "plugin",
    term: "Plugin",
    definition: [
      {
        type: "paragraph",
        text: "An installable package that extends GitHub Copilot CLI with a bundled set of agents, skills, hooks, MCP server configurations, and LSP integrations. Plugins provide a way to distribute and share custom capabilities across projects and teams, with versioning, discovery, and one-command installation via marketplaces.",
      },
      {
        type: "paragraph",
        text: "**Example**: Installing `database-data-management@awesome-copilot` to get a database specialist agent, migration skills, and schema validation hooks in a single command.",
      },
      {
        type: "paragraph",
        text: "**When to use**: When you want to share a curated set of Copilot capabilities across multiple projects or team members, or when you want to install community-contributed tooling without manually copying files.",
      },
      {
        type: "paragraph",
        text: "**Learn more**: [Installing and Using Plugins](../installing-and-using-plugins/)",
      },
      {
        type: "paragraph",
        text: "**Related terms**: [Agent](#agent), [Skill](#skill), [Hook](#hook)",
      },
    ],
  },
  {
    id: "tools",
    term: "Tools",
    definition: [
      {
        type: "paragraph",
        text: "Capabilities that GitHub Copilot can invoke to perform actions or retrieve information. Tools fall into two categories:",
      },
      {
        type: "ordered",
        items: [
          "**Built-in tools**: Native capabilities like `codebase` (code search), `terminalCommand` (running commands), and `web` (web search)",
          "**MCP tools**: External integrations provided by MCP servers (e.g., database queries, cloud resource management, or API calls)",
        ],
      },
      {
        type: "paragraph",
        text: "Agents and skills can specify which tools they require or recommend in their front matter.",
      },
      {
        type: "paragraph",
        text: "**Example front matter**:",
      },
      {
        type: "code",
        code: toolsExample,
      },
      {
        type: "paragraph",
        text: "**Related terms**: [MCP](#mcp-model-context-protocol), [Built-in Tool](#built-in-tool), [Agent](#agent)",
      },
    ],
  },
];

const contributionNote =
  "**Have a term you’d like to see added?** Contributions are welcome! See our [Contributing Guidelines](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md) for how to suggest additions to this glossary.";

const articleSections: TocSection[] = [
  { id: "core-concepts", label: "Core Concepts" },
  { id: "configuration-metadata", label: "Configuration & Metadata" },
  { id: "skills-interactions", label: "Skills & Interactions" },
  { id: "platform-integration", label: "Platform & Integration" },
  { id: "video-series", label: "Video series" },
  { id: "learn-more", label: "Learn more" },
];

function articleHref(href: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return new URL(href, articleBaseUrl).href;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const inlinePattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(
        <code className={styles.inlineCode} key={`${match.index}-code`}>
          {match[1]}
        </code>,
      );
    } else if (match[2]) {
      parts.push(<strong key={`${match.index}-strong`}>{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      parts.push(
        <a href={articleHref(match[4])} key={`${match.index}-link`}>
          {match[3]}
        </a>,
      );
    }

    lastIndex = inlinePattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderBlock(block: GlossaryBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <Text as="p" size="300" variant="muted" key={key}>
        {renderInline(block.text)}
      </Text>
    );
  }

  if (block.type === "bullets") {
    return (
      <ul className={styles.pointList} key={key}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "ordered") {
    return (
      <ol className={styles.stepsList} key={key}>
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }

  return <CopyBlock code={block.code} key={key} />;
}

function GlossaryList({ terms }: { terms: GlossaryTerm[] }) {
  return (
    <ul className={styles.pointList}>
      {terms.map((item) => {
        const [leadBlock, ...detailBlocks] = item.definition;
        return (
          <li id={item.id} key={item.id}>
            <span className={styles.stepLabel}>{item.term}</span> —{" "}
            {leadBlock.type === "paragraph"
              ? renderInline(leadBlock.text)
              : renderBlock(leadBlock, `${item.id}-lead`)}
            {detailBlocks.map((block, index) =>
              renderBlock(block, `${item.id}-${index}`),
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function TerminologyGlossary({
  pageHref,
}: PrototypePageProps) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="github-copilot-terminology-glossary"
      breadcrumbLabel="Glossary"
      heroTitle="Terminology"
      animateHeroTitle
      heroSubtitle="Definitions for the terms you&rsquo;ll meet while exploring agents, skills, instructions, and related GitHub Copilot concepts."
      tocSections={articleSections}
      upNext={{
        label: "GitHub Copilot CLI for Beginners",
        href: pageHref("cli-for-beginners"),
      }}
    >
      <section id="core-concepts" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Core Concepts
        </Heading>
        <Text as="p" size="300" variant="muted">
          Use this page as a quick reference when reading articles in the
          Learning Hub or browsing the repository.
        </Text>
        <GlossaryList terms={coreTerms} />
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/EPyyyB23NUU"
            title="Introducing the GitHub Copilot coding agent"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="configuration-metadata" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Configuration &amp; Metadata
        </Heading>
        <GlossaryList terms={configurationTerms} />
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/-yKALFS5ewY"
            title="How to use agents, skills, and instructions in Copilot CLI"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="skills-interactions" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Skills &amp; Interactions
        </Heading>
        <GlossaryList terms={skillsTerms} />
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/LAF-lACf2QY"
            title="Prompt engineering essentials: Getting better results from LLMs"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
      </section>

      <section id="platform-integration" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Platform &amp; Integration
        </Heading>
        <GlossaryList terms={platformTerms} />
        <figure className={styles.videoFigure}>
          <iframe
            className={styles.videoEmbedFrame}
            src="https://www.youtube.com/embed/DtQjVIRRszM"
            title="How to use MCP servers with GitHub Copilot CLI"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </figure>
        <Text as="p" size="300" variant="muted">
          {renderInline(contributionNote)}
        </Text>
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
          <a className={styles.learnMoreCard} href="https://github.com/features/copilot">
            <span className={styles.learnMoreCardIcon} aria-hidden="true">
              <GlobeIcon size={24} />
            </span>
            <span className={styles.learnMoreCardTitle}>
              GitHub Copilot
              <ArrowUpRightIcon size={20} />
            </span>
          </a>
          <a className={styles.learnMoreCard} href="https://docs.github.com/en/copilot/get-started/what-is-github-copilot">
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
