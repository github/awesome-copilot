import { Heading, Text } from "@primer/react-brand";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import {
  CopyBlock,
  LearningArticleLayout,
  type TocSection,
} from "../LearningArticleLayout";

const WHAT_ARE_AGENTS_URL =
  "https://awesome-copilot.github.com/learning-hub/what-are-agents-skills-instructions/";
const AUTOMATING_WITH_HOOKS_URL =
  "https://awesome-copilot.github.com/learning-hub/automating-with-hooks/";
const BUILDING_CUSTOM_AGENTS_URL =
  "https://awesome-copilot.github.com/learning-hub/building-custom-agents/";
const TERMINOLOGY_GLOSSARY_URL =
  "https://awesome-copilot.github.com/learning-hub/github-copilot-terminology-glossary/";
const AGENT_CONFIGURATION_REFERENCE_URL =
  "https://docs.github.com/en/copilot/customizing-copilot/github-copilot-agents/configuration-reference-for-github-copilot-agents";

const mentalModelRows: { topic: string; agent: string; subagent: string }[] = [
  {
    topic: "How it starts",
    agent: "Selected by the user or configured for the workflow",
    subagent: "Launched by another agent or orchestrator",
  },
  {
    topic: "Lifetime",
    agent: "Persists across the main conversation or session",
    subagent: "Temporary; exists only for the delegated task",
  },
  {
    topic: "Context",
    agent: "Carries the broader conversation and goals",
    subagent: "Gets a narrower prompt and its own isolated context",
  },
  {
    topic: "Scope",
    agent: "Coordinates the whole task",
    subagent: "Performs one focused piece of work",
  },
  {
    topic: "Output",
    agent: "Talks directly with the user",
    subagent: "Reports back to the main agent, which synthesizes the result",
  },
];

const subagentChanges: { term: string; description: string }[] = [
  {
    term: "Context isolation",
    description:
      "the subagent gets only the task-relevant prompt, which reduces distraction from earlier conversation history.",
  },
  {
    term: "Focused instructions",
    description:
      "the subagent can use a tighter role, such as planner, implementer, reviewer, or researcher.",
  },
  {
    term: "Parallelism",
    description:
      "multiple subagents can work at the same time when tasks do not conflict.",
  },
  {
    term: "Controlled synthesis",
    description:
      "the parent agent decides what gets brought back into the main conversation.",
  },
  {
    term: "Alternative model selection",
    description:
      "the subagent can use a different AI model to perform a task, so while our main agent might be using a generalist model, a subagent could be configured to use a more specialized one for code review or research.",
  },
];

const subagentUseCases: string[] = [
  "research before implementation",
  "compare multiple approaches without polluting the main thread",
  "run parallel review perspectives, such as correctness, security, and architecture",
  "split large work into independent tracks with explicit dependencies",
  "keep an orchestrator agent focused on coordination rather than direct execution",
  "compare multiple approaches across different models",
];

const featureBuilderFrontmatter = `---
name: Feature Builder
tools: ['agent', 'read', 'search', 'edit']
agents: ['Planner', 'Implementer', 'Reviewer']
---`;

const plannerFrontmatter = `---
name: Planner
user-invocable: false
tools: ['read', 'search']
---`;

const parallelAnalysisPrompt = `Analyze this feature in parallel:
1. Research existing code patterns
2. Propose an implementation plan
3. Review likely security risks
Then summarize the findings into one recommendation.`;

const fleetCommand =
  "/fleet Update the auth docs, refactor the auth service, and add related tests.";

const fleetPromptModeCommand =
  'copilot -p "/fleet Update the auth docs, refactor the auth service, and add related tests." --no-ask-user';

const subagentsCommand =
  "/subagents          # open the subagents configuration panel";

const experimentalAgentCommand = `/experimental           # toggle experimental features
/agent                  # open the agent picker and select rubber-duck`;

const fleetBehaviors: string[] = [
  "the orchestrator plans work items first",
  "independent tasks can run in parallel",
  "each subagent gets its own context window",
  "subagents share the same filesystem, so overlapping writes should be avoided",
];

const nextSteps: {
  action: string;
  label: string;
  href: string;
  description: string;
}[] = [
  {
    action: "Read",
    label: "Building Custom Agents",
    href: BUILDING_CUSTOM_AGENTS_URL,
    description: "to design coordinator and worker agents.",
  },
  {
    action: "Revisit",
    label: "What are Agents, Skills, and Instructions",
    href: WHAT_ARE_AGENTS_URL,
    description: "for the broader customization model.",
  },
  {
    action: "Keep the",
    label: "GitHub Copilot Terminology Glossary",
    href: TERMINOLOGY_GLOSSARY_URL,
    description: "nearby when comparing terminology across products.",
  },
];

const articleSections: TocSection[] = [
  { id: "start-with-the-mental-model", label: "Start with the mental model" },
  {
    id: "what-changes-when-work-moves-to-a-subagent",
    label: "What changes when work moves to a subagent",
  },
  { id: "when-to-use-subagents", label: "When to use subagents" },
  { id: "launch-subagents-in-vs-code", label: "Launch subagents in VS Code" },
  {
    id: "launch-subagents-in-copilot-cli",
    label: "Launch subagents in Copilot CLI",
  },
  {
    id: "orchestration-patterns-that-work-well",
    label: "Orchestration patterns that work well",
  },
  {
    id: "repository-examples-you-can-inspect",
    label: "Repository examples you can inspect",
  },
  {
    id: "important-platform-nuance-handoffs-are-not-universal",
    label: "Important platform nuance: handoffs are not universal",
  },
  { id: "common-questions", label: "Common questions" },
  { id: "next-steps", label: "Next steps" },
];

export default function AgentsAndSubagents({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="agents-and-subagents"
      breadcrumbLabel="Agents & Subagents"
      heroTitle="Agents and Subagents"
      heroSubtitle="An agent is the primary assistant for a session, while a subagent is a temporary worker it launches for a narrower, specialized task."
      tocSections={articleSections}
      upNext={{
        label: "Understanding Copilot Context",
        href: "https://awesome-copilot.github.com/learning-hub/understanding-copilot-context/",
      }}
    >
      <section
        id="start-with-the-mental-model"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Start with the mental model
        </Heading>
        <Text as="p" size="300" variant="muted">
          This distinction matters more as you move from simple chat prompts to
          orchestrated agentic workflows.
        </Text>
        <Text as="p" size="300" variant="muted">
          Think of the main agent as a project lead and subagents as focused
          contributors:
        </Text>
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Agent</th>
              <th>Subagent</th>
            </tr>
          </thead>
          <tbody>
            {mentalModelRows.map((row) => (
              <tr key={row.topic}>
                <td>{row.topic}</td>
                <td>{row.agent}</td>
                <td>{row.subagent}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Text as="p" size="300" variant="muted">
          In practice, the main agent keeps the big picture while subagents
          absorb the noisy intermediate work: research, code inspection,
          specialized review passes, or independent implementation tracks.
        </Text>
      </section>

      <section
        id="what-changes-when-work-moves-to-a-subagent"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          What changes when work moves to a subagent
        </Heading>
        <Text as="p" size="300" variant="muted">
          Subagents are useful because they are not just &ldquo;the same agent in
          another tab.&rdquo; They usually change the shape of the work in a few
          important ways:
        </Text>
        <ul className={styles.pointList}>
          {subagentChanges.map((change) => (
            <li key={change.term}>
              <span className={styles.stepLabel}>{change.term}</span>:{" "}
              {change.description}
            </li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          That isolation is one of the main reasons subagents can outperform a
          single monolithic agent on larger tasks.
        </Text>
      </section>

      <section id="when-to-use-subagents" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          When to use subagents
        </Heading>
        <Text as="p" size="300" variant="muted">
          Subagents work especially well when you need to:
        </Text>
        <ul className={styles.checkList}>
          {subagentUseCases.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          If all of the work happens in one small file and does not need
          decomposition, a subagent may be unnecessary. The benefit appears when
          delegation reduces context pressure or lets multiple tracks run
          independently.
        </Text>
      </section>

      <section
        id="launch-subagents-in-vs-code"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Launch subagents in VS Code
        </Heading>
        <Text as="p" size="300" variant="muted">
          In VS Code, subagents are typically{" "}
          <strong>agent-initiated</strong>. You usually describe the larger task,
          and the main agent decides when to delegate a focused subtask. To make
          that possible, the agent needs access to the subagent tool.
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>1. Enable the agent tool</span>
          <Text as="p" size="300" variant="muted">
            Use the <code className={styles.inlineCode}>agent</code> tool in
            frontmatter so the main agent can launch other agents:
          </Text>
          <CopyBlock code={featureBuilderFrontmatter} />
          <Text as="p" size="300" variant="muted">
            The <code className={styles.inlineCode}>agents</code> property acts
            as an allowlist for which worker agents this coordinator can call.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            2. Define worker agents with clear boundaries
          </span>
          <Text as="p" size="300" variant="muted">
            Worker agents are often hidden from the picker and reserved for
            delegation:
          </Text>
          <CopyBlock code={plannerFrontmatter} />
          <Text as="p" size="300" variant="muted">
            You can also use{" "}
            <code className={styles.inlineCode}>disable-model-invocation: true</code>{" "}
            to prevent an agent from being used as a subagent unless another
            coordinator explicitly allows it.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            3. Prompt for isolated or parallel work
          </span>
          <Text as="p" size="300" variant="muted">
            You do not always need to say &ldquo;run a subagent,&rdquo; but
            prompts that describe isolated research or parallel tracks make
            delegation easier. For example:
          </Text>
          <CopyBlock code={parallelAnalysisPrompt} />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>4. Know the nesting rule</span>
          <Text as="p" size="300" variant="muted">
            By default, subagents do not keep spawning additional subagents. In
            VS Code, recursive delegation is controlled by the{" "}
            <code className={styles.inlineCode}>chat.subagents.allowInvocationsFromSubagents</code>{" "}
            setting, which is off by default.
          </Text>
        </div>
      </section>

      <section
        id="launch-subagents-in-copilot-cli"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Launch subagents in Copilot CLI
        </Heading>
        <Text as="p" size="300" variant="muted">
          In GitHub Copilot CLI, the clearest end-user entry point is{" "}
          <strong><code className={styles.inlineCode}>/fleet</code></strong>
          {". Fleet acts as an orchestrator that decomposes a larger objective, launches multiple background subagents, respects dependencies, and then synthesizes the final result."}
        </Text>
        <CopyBlock code={fleetCommand} />
        <Text as="p" size="300" variant="muted">
          For non-interactive execution:
        </Text>
        <CopyBlock code={fleetPromptModeCommand} />
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Prompt mode and repo hooks (v1.0.40+):
          </span>
          <Text as="p" size="300" variant="muted">
            When using{" "}
            <code className={styles.inlineCode}>copilot -p &quot;...&quot;</code>{" "}
            (prompt mode), repository hooks are disabled by default for security.
            If your <code className={styles.inlineCode}>/fleet</code> workflow
            relies on hooks (e.g., auto-formatting or lint checks after edits),
            opt in by setting{" "}
            <code className={styles.inlineCode}>GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true</code>{" "}
            before running. See{" "}
            <a href={AUTOMATING_WITH_HOOKS_URL}>Automating with Hooks</a> for
            details.
          </Text>
        </div>
        <Text as="p" size="300" variant="muted">
          The important behavior is different from a single chat turn:
        </Text>
        <ul className={styles.checkList}>
          {fleetBehaviors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Text as="p" size="300" variant="muted">
          That makes <code className={styles.inlineCode}>/fleet</code> a
          practical way to launch subagents even if you are not authoring custom
          agent files yourself.
        </Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Rubber-duck agent</span>
          <Text as="p" size="300" variant="muted">
            Available in <code className={styles.inlineCode}>/experimental</code>{" "}
            (v1.0.42+), the <strong>rubber-duck agent</strong> applies a novel
            multi-model pattern: when you&rsquo;re working in a GPT-powered
            session, the rubber-duck agent internally routes certain requests
            through Claude to provide a second perspective. The idea is similar
            to rubber-duck debugging &mdash; talking through a problem with a
            different &ldquo;listener&rdquo; often surfaces assumptions or blind
            spots you didn&rsquo;t notice.
          </Text>
          <Text as="p" size="300" variant="muted">
            In v1.0.64+, you can configure the rubber-duck agent (including its
            complementary model strategy) directly from{" "}
            <code className={styles.inlineCode}>/subagents</code>:
          </Text>
          <CopyBlock code={subagentsCommand} />
          <Text as="p" size="300" variant="muted">
            Or you can still enable experimental features and select it from the
            agent picker:
          </Text>
          <CopyBlock code={experimentalAgentCommand} />
          <Text as="p" size="300" variant="muted">
            The <strong>complementary model strategy</strong> lets you specify
            that the rubber-duck agent should automatically pick a model from a
            different family than your primary model (e.g., if you&rsquo;re on
            Claude, it selects a GPT model, and vice versa). This maximises the
            diversity of perspectives.
          </Text>
          <Text as="p" size="300" variant="muted">
            Because it runs as a sub-agent layer rather than replacing your
            primary model, you keep your current session model and context while
            the rubber-duck analysis runs in the background.
          </Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted">
              This is an experimental feature and may change. Provide feedback
              via <code className={styles.inlineCode}>/feedback</code> if you
              find it useful.
            </Text>
          </div>
        </div>
      </section>

      <section
        id="orchestration-patterns-that-work-well"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Orchestration patterns that work well
        </Heading>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Coordinator and worker</span>
          <Text as="p" size="300" variant="muted">
            One agent owns the workflow and delegates to narrower specialists
            such as planner, implementer, and reviewer. This keeps the
            coordinator lightweight and makes the worker prompts more precise.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Multi-perspective review</span>
          <Text as="p" size="300" variant="muted">
            Run parallel subagents for different lenses - correctness, security,
            code quality, architecture - and combine the results after they
            finish.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Research, then act</span>
          <Text as="p" size="300" variant="muted">
            Use one subagent to gather facts and another to implement with those
            facts. This pattern is especially helpful when you want the main
            thread to stay free of exploratory noise.
          </Text>
        </div>
        <Text as="p" size="300" variant="muted">
          The built-in{" "}
          <strong><code className={styles.inlineCode}>/research</code></strong>{" "}
          command uses this orchestrator/subagent model automatically
          (v1.0.40+): it spawns an orchestrator that breaks the topic into
          research threads, runs them in parallel as subagents, and synthesizes
          the findings into a structured report. This means you get deeper and
          more reliable results than a single-turn query provides &mdash; without
          having to set up the multi-agent pattern yourself.
        </Text>
      </section>

      <section
        id="repository-examples-you-can-inspect"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Repository examples you can inspect
        </Heading>
        <Text as="p" size="300" variant="muted">
          This repository already includes a few useful examples of
          delegation-related syntax:
        </Text>
        <ul className={styles.pointList}>
          <li>
            <a href="https://github.com/github/awesome-copilot/blob/main/agents/context7.agent.md"><code className={styles.inlineCode}>agents/context7.agent.md</code></a>{" "}
            is a concrete example of VS Code-style{" "}
            <code className={styles.inlineCode}>handoffs</code>. It defines a
            handoff button that can pass work to another agent after research is
            complete.
          </li>
          <li>
            <a href="https://github.com/github/awesome-copilot/blob/main/agents/rug-orchestrator.agent.md"><code className={styles.inlineCode}>agents/rug-orchestrator.agent.md</code></a>{" "}
            is a strong coordinator example. It enables the{" "}
            <code className={styles.inlineCode}>agent</code> tool and restricts
            delegation with{" "}
            <code className={styles.inlineCode}>agents: ['SWE', 'QA']</code>.
          </li>
          <li>
            <a href="https://github.com/github/awesome-copilot/blob/main/agents/gem-orchestrator.agent.md"><code className={styles.inlineCode}>agents/gem-orchestrator.agent.md</code></a>{" "}
            shows invocation control with{" "}
            <code className={styles.inlineCode}>user-invocable</code> and{" "}
            <code className={styles.inlineCode}>disable-model-invocation</code>{", which is useful when deciding whether an orchestrator should be directly selectable, delegatable, or both."}
          </li>
          <li>
            <a href="https://github.com/github/awesome-copilot/blob/main/agents/custom-agent-foundry.agent.md"><code className={styles.inlineCode}>agents/custom-agent-foundry.agent.md</code></a>{" "}
            documents the VS Code{" "}
            <code className={styles.inlineCode}>handoffs</code> shape in its
            guidance section, which is helpful if you want a template before
            creating your own coordinator workflow.
          </li>
        </ul>
      </section>

      <section
        id="important-platform-nuance-handoffs-are-not-universal"
        className={styles.articleSection}
      >
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Important platform nuance: handoffs are not universal
        </Heading>
        <Text as="p" size="300" variant="muted">
          VS Code documentation describes both subagents and the{" "}
          <code className={styles.inlineCode}>handoffs</code> frontmatter
          property.{" "}
          <a href={AGENT_CONFIGURATION_REFERENCE_URL}>GitHub&rsquo;s custom agent configuration reference</a>{", however, notes that "}
          <code className={styles.inlineCode}>handoffs</code> and{" "}
          <code className={styles.inlineCode}>argument-hint</code> are currently
          ignored for Copilot cloud agent on GitHub.com.
        </Text>
        <Text as="p" size="300" variant="muted">
          That means you should think about delegation features in
          product-specific terms:
        </Text>
        <ul className={styles.pointList}>
          <li>
            <span className={styles.stepLabel}>VS Code</span>: supports subagent
            concepts, allowlists, and handoff-oriented agent composition
          </li>
          <li>
            <span className={styles.stepLabel}>Copilot CLI</span>: exposes
            practical orchestration through commands like{" "}
            <code className={styles.inlineCode}>/fleet</code>
          </li>
          <li>
            <span className={styles.stepLabel}>
              GitHub.com coding agent / cloud agent
            </span>{": supports custom agents, but some VS Code-specific frontmatter is intentionally ignored"}
          </li>
        </ul>
        <Text as="p" size="300" variant="muted">
          If you share agent files across surfaces, document those differences
          so users know which behaviors are portable and which are
          editor-specific.
        </Text>
      </section>

      <section id="common-questions" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Common questions
        </Heading>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Do users always invoke subagents directly?
          </span>
          <Text as="p" size="300" variant="muted">
            No. Most of the time the main agent launches them when it decides the
            task benefits from context isolation or parallelism.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Can a subagent use a different model or tool set?
          </span>
          <Text as="p" size="300" variant="muted">
            Yes, when the delegated worker is a custom agent with its own
            frontmatter.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Are subagents always parallel?
          </span>
          <Text as="p" size="300" variant="muted">
            No. They can run sequentially when one step depends on another, or in
            parallel when work items are independent.
          </Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>
            Can I control how many subagents run simultaneously?
          </span>
          <Text as="p" size="300" variant="muted">
            Yes. In v1.0.66+, usage-based billing users can configure{" "}
            <strong>subagent concurrency and depth limits</strong> directly from{" "}
            <code className={styles.inlineCode}>/settings</code>. The concurrency
            limit controls how many subagents run in parallel; the depth limit
            controls how many levels deep delegation can chain (preventing
            runaway recursive subagent trees). These settings give you
            predictable control over resource consumption during complex
            orchestrated tasks.
          </Text>
        </div>
      </section>

      <section id="next-steps" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Next steps
        </Heading>
        <ul className={styles.checkList}>
          {nextSteps.map((step) => (
            <li key={step.label}>
              {step.action} <a href={step.href}>{step.label}</a>{" "}
              {step.description}
            </li>
          ))}
        </ul>
      </section>
    </LearningArticleLayout>
  );
}
