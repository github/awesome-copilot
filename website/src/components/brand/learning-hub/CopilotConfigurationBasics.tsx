import { Heading, Text } from "@primer/react-brand";

import styles from "../styles/github-copilot-app.module.css";
import type { PageHref } from "../pageHref";
import {
  CopyBlock,
  LearningArticleLayout,
  type TocSection,
} from "../LearningArticleLayout";

const articleSections: TocSection[] = [
  { id: "configuration-levels", label: "Configuration Levels" },
  { id: "key-configuration-options", label: "Key Configuration Options" },
  { id: "repository-level-configuration", label: "Repository-Level Configuration" },
  { id: "setting-up-team-configuration", label: "Setting Up Team Configuration" },
  { id: "ide-specific-configuration", label: "IDE-Specific Configuration" },
  { id: "common-questions", label: "Common Questions" },
  { id: "next-steps", label: "Next Steps" },
];

export default function CopilotConfigurationBasics({ pageHref }: { pageHref: PageHref }) {
  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="copilot-configuration-basics"
      breadcrumbLabel="Configuration Basics"
      heroTitle="Copilot Configuration Basics"
      heroSubtitle="GitHub Copilot&rsquo;s configuration layers let you tailor its behavior to your preferences, projects, and team standards for consistent results."
      tocSections={articleSections}
      upNext={{
        label: "Defining Custom Instructions",
        href: "https://awesome-copilot.github.com/learning-hub/defining-custom-instructions/",
      }}
    >
      <section id="configuration-levels" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Configuration Levels
        </Heading>
        <Text as="p" size="300" variant="muted">GitHub Copilot uses a hierarchical configuration system where settings at different levels can override each other. Understanding this hierarchy helps you apply the right configuration at the right level.</Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>User Settings</span>
          <Text as="p" size="300" variant="muted">User settings apply globally across all your projects and represent your personal preferences. These are stored in your IDE&rsquo;s user configuration and travel with your IDE profile.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Common user-level settings</span>:</Text>
          <ul className={styles.checkList}>
            <li>Enable/disable inline suggestions globally</li>
            <li>Commit message style preferences</li>
            <li>Default language preferences</li>
          </ul>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: For personal preferences that should apply everywhere you work, like keyboard shortcuts or whether you prefer inline suggestions vs chat.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Repository Settings</span>
          <Text as="p" size="300" variant="muted">Repository settings live in your codebase (typically in <code className={styles.inlineCode}>.github/</code> although some editors allow customising the paths that Copilot will use) and are shared with everyone working on the project. These provide the highest level of customization and override both user and workspace settings.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Common repository-level customizations</span>:</Text>
          <ul className={styles.checkList}>
            <li>Custom instructions for coding conventions</li>
            <li>Reusable skills for common tasks</li>
            <li>Specialized agents for project workflows</li>
            <li>Custom agents for domain expertise</li>
          </ul>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: For repository-wide standards, project-specific best practices, and reusable customizations that should be version-controlled and shared.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Organisation Settings (GitHub.com only)</span>
          <Text as="p" size="300" variant="muted">Organisation settings allow administrators to enforce Copilot policies across all repositories within an organization. These settings can include defining custom agents, creating globally applied instructions, enabling or disabling Copilot, managing billing, and setting usage limits. These policies may not be enforced in the IDE, depending on the IDE&rsquo;s support for organization-level settings, but will apply to Copilot usage on GitHub.com.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: For enforcing organization-wide policies, ensuring compliance, and providing shared resources across multiple repositories.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Configuration Precedence</span>
          <Text as="p" size="300" variant="muted">When multiple configuration levels define the same setting, GitHub Copilot applies them in this order (highest precedence first):</Text>
          <ol className={styles.stepsList}>
            <li><span className={styles.stepLabel}>Organisation settings</span> (if applicable)</li>
            <li><span className={styles.stepLabel}>Repository settings</span> (<code className={styles.inlineCode}>.github/</code>)</li>
            <li><span className={styles.stepLabel}>User settings</span> (IDE global preferences)</li>
          </ol>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Example</span>: If your user settings disable Copilot for <code className={styles.inlineCode}>.test.ts</code> files, but repository settings enable custom instructions for test files, the repository settings take precedence and Copilot remains active with the custom instructions applied.</Text>
        </div>
      </section>

      <section id="key-configuration-options" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Key Configuration Options
        </Heading>
        <Text as="p" size="300" variant="muted">These settings control GitHub Copilot&rsquo;s core behavior across all IDEs:</Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Inline Suggestions</span>
          <Text as="p" size="300" variant="muted">Control whether Copilot automatically suggests code completions as you type.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>VS Code example</span>:</Text>
          <CopyBlock code={`{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": false
  }
}`} label="VS Code example:" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why it matters</span>: Some developers prefer to invoke Copilot explicitly rather than seeing automatic suggestions. You can also enable it only for specific languages.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Chat Availability</span>
          <Text as="p" size="300" variant="muted">Control access to GitHub Copilot Chat in your IDE.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>VS Code example</span>:</Text>
          <CopyBlock code={`{
  "github.copilot.chat.enabled": true
}`} label="VS Code example:" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why it matters</span>: Chat provides a conversational interface for asking questions and getting explanations, complementing inline suggestions.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Suggestion Trigger Behavior</span>
          <Text as="p" size="300" variant="muted">Configure how and when Copilot generates suggestions.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>VS Code example</span>:</Text>
          <CopyBlock code={`{
  "editor.inlineSuggest.enabled": true,
  "github.copilot.editor.enableAutoCompletions": true
}`} label="VS Code example:" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why it matters</span>: Control whether suggestions appear automatically or only when explicitly requested, balancing helpfulness with potential distraction.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Language-Specific Settings</span>
          <Text as="p" size="300" variant="muted">Enable or disable Copilot for specific programming languages.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>VS Code example</span>:</Text>
          <CopyBlock code={`{
  "github.copilot.enable": {
    "typescript": true,
    "javascript": true,
    "python": true,
    "markdown": false
  }
}`} label="VS Code example:" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why it matters</span>: You may want Copilot active for code files but not for documentation or configuration files.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Excluded Files and Directories</span>
          <Text as="p" size="300" variant="muted">Prevent Copilot from accessing specific files or directories.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>VS Code example</span>:</Text>
          <CopyBlock code={`{
  "github.copilot.advanced": {
    "debug.filterLogCategories": [],
    "excludedFiles": [
      "**/secrets/**",
      "**/*.env",
      "**/node_modules/**"
    ]
  }
}`} label="VS Code example:" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why it matters</span>: Exclude sensitive files, generated code, or dependencies from Copilot&rsquo;s context to improve suggestion relevance and protect confidential information.</Text>
        </div>
      </section>

      <section id="repository-level-configuration" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Repository-Level Configuration
        </Heading>
        <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>.github/</code> directory in your repository enables team-wide customizations that are version-controlled and shared across all contributors.</Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Directory Structure</span>
          <Text as="p" size="300" variant="muted">A well-organized Copilot configuration directory looks like this:</Text>
          <CopyBlock code={`.github/
├── agents/
│   ├── terraform-expert.agent.md
│   └── api-reviewer.agent.md
├── skills/
│   ├── generate-tests/
│   │   └── SKILL.md
│   └── refactor-component/
│       └── SKILL.md
└── instructions/
    ├── typescript-conventions.instructions.md
    └── api-design.instructions.md`} label="A well-organized Copilot configuration directory looks like this:" />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Monorepo Support</span>
          <Text as="p" size="300" variant="muted">In monorepos with multiple packages or services, GitHub Copilot CLI discovers customizations at <span className={styles.stepLabel}>every directory level</span> from your working directory up to the git repository root. This means each package or service can have its own <code className={styles.inlineCode}>.github/</code> folder with specialized agents, instructions, skills, and MCP servers, while still inheriting configuration from parent directories.</Text>
          <CopyBlock code={`my-monorepo/
├── .github/
│   └── instructions/
│       └── shared-conventions.instructions.md   ← applies everywhere
├── packages/
│   ├── api/
│   │   └── .github/
│   │       └── agents/
│   │           └── api-expert.agent.md           ← applies in packages/api/
│   └── web/
│       └── .github/
│           └── instructions/
│               └── react-conventions.instructions.md  ← applies in packages/web/`} label="Monorepo Support" />
          <Text as="p" size="300" variant="muted">When you work inside <code className={styles.inlineCode}>packages/api/</code>, Copilot loads configuration from <code className={styles.inlineCode}>packages/api/.github/</code>, then <code className={styles.inlineCode}>packages/.github/</code> (if it exists), then the root <code className={styles.inlineCode}>.github/</code>. This layered discovery ensures the right context is active no matter where in the repository you&rsquo;re working.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Personal Skills Directory</span>
          <Text as="p" size="300" variant="muted">In addition to repository-level skills, GitHub Copilot CLI supports <span className={styles.stepLabel}>personal skills directories</span> at <code className={styles.inlineCode}>~/.copilot/skills/</code> and <code className={styles.inlineCode}>~/.agents/skills/</code>. Skills you place in either location are discovered automatically across all your projects, making them ideal for personal workflows and reusable utilities that are not project-specific.</Text>
          <CopyBlock code={`~/.agents/
└── skills/
    ├── my-review-style/
    │   └── SKILL.md     ← available in all sessions
    └── cleanup-todos/
        └── SKILL.md`} label="Personal Skills Directory" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>~/.agents/skills/</code> path aligns with the VS Code GitHub Copilot for Azure extension&rsquo;s default skill discovery path, while <code className={styles.inlineCode}>~/.copilot/skills/</code> matches the Copilot CLI configuration directory. Both are supported for personal skills.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Pinning Model and Effort via .github/copilot/settings.json</span>
          <Text as="p" size="300" variant="muted"><em>(v1.0.70+)</em> A <span className={styles.stepLabel}>trusted repository</span> can pin the model, reasoning effort level, and context tier for all sessions working in that repository by adding a <code className={styles.inlineCode}>.github/copilot/settings.json</code> file. This is a team governance feature that ensures everyone uses a consistent model configuration without relying on individual user settings:</Text>
          <CopyBlock code={`{
  "model": "claude-sonnet-4",
  "effortLevel": "high",
  "contextTier": "full"
}`} label="Pinning Model and Effort via .github/copilot/settings.json" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Supported fields</span>:</Text>
          <table tabIndex={0}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Description</th>
                <th>Example values</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className={styles.inlineCode}>model</code></td>
                <td>The AI model to use for this repository</td>
                <td><code className={styles.inlineCode}>"claude-sonnet-4"</code>, <code className={styles.inlineCode}>"gpt-4.1"</code>, <code className={styles.inlineCode}>"claude-sonnet-5"</code></td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>effortLevel</code></td>
                <td>Reasoning effort level</td>
                <td><code className={styles.inlineCode}>"low"</code>, <code className={styles.inlineCode}>"medium"</code>, <code className={styles.inlineCode}>"high"</code></td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>contextTier</code></td>
                <td>How much context to include</td>
                <td><code className={styles.inlineCode}>"default"</code>, <code className={styles.inlineCode}>"full"</code></td>
              </tr>
            </tbody>
          </table>
          <Text as="p" size="300" variant="muted">In addition to model and effort settings, this file can also extend the URL, MCP server, and skill deny lists, allowing organizations to enforce access restrictions at the repository level.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Why use this</span>: Pin a model when your team has agreed on the right cost/quality tradeoff for a project. Pin a high effort level for codebases where mistakes are expensive. Deny lists let you block specific MCP servers or URLs that aren&rsquo;t appropriate for a given project&rsquo;s security posture.</Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Trust requirement:</span>
            <Text as="p" size="300" variant="muted">The repository must be explicitly trusted by the user for these settings to take effect. This prevents untrusted repositories from changing your model or access restrictions without your knowledge.</Text>
          </div>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Custom Agents</span>
          <Text as="p" size="300" variant="muted">Agents are specialized assistants for specific workflows. Place agent definition files in <code className={styles.inlineCode}>.github/agents/</code>.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Example agent</span> (<code className={styles.inlineCode}>terraform-expert.agent.md</code>):</Text>
          <CopyBlock code={`---
description: 'Terraform infrastructure-as-code specialist'
tools: ['filesystem', 'terminal']
name: 'Terraform Expert'
---

You are an expert in Terraform and cloud infrastructure.
Guide users through creating, reviewing, and deploying infrastructure code.`} label="Example agent (terraform-expert.agent.md):" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: Create agents for domain-specific tasks like infrastructure management, API design, or security reviews.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Reusable Skills</span>
          <Text as="p" size="300" variant="muted">Skills are self-contained folders that package reusable capabilities. Store them in <code className={styles.inlineCode}>.github/skills/</code>.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Example skill</span> (<code className={styles.inlineCode}>generate-tests/SKILL.md</code>):</Text>
          <CopyBlock code={`---
name: generate-tests
description: 'Generate comprehensive unit tests for a component, covering happy path, edge cases, and error conditions'
---

# generate-tests

Generate unit tests for the selected code that:
- Cover all public methods and edge cases
- Use our testing conventions from @testing-utils.ts
- Include descriptive test names

See [references/test-patterns.md](references/test-patterns.md) for standard patterns.`} label="Example skill (generate-tests/SKILL.md):" />
          <Text as="p" size="300" variant="muted">Skills can also bundle reference files, templates, and scripts in their folder, giving the AI richer context than a single file can provide. Unlike the older prompt format, skills can be discovered and invoked by agents automatically.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Dynamic skill retrieval</span> (v1.0.66+): By default, Copilot CLI uses embeddings-based retrieval to automatically surface the most relevant skills for each prompt. You can toggle this behavior with the <code className={styles.inlineCode}>--dynamic-retrieval</code> flag or the <code className={styles.inlineCode}>dynamicRetrieval</code> config setting. To disable embeddings-based retrieval (for example, to force all configured skills to always be loaded):</Text>
          <CopyBlock code={`copilot --dynamic-retrieval skills=off`} label="Reusable Skills" />
          <Text as="p" size="300" variant="muted">This setting persists across sessions once saved to your config.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: For repetitive tasks your team performs regularly, like generating tests, creating documentation, or refactoring patterns.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Instructions Files</span>
          <Text as="p" size="300" variant="muted">Instructions provide persistent context that applies automatically when working in specific files or directories. Store them in <code className={styles.inlineCode}>.github/instructions/</code>.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Example instruction</span> (<code className={styles.inlineCode}>typescript-conventions.instructions.md</code>):</Text>
          <CopyBlock code={`---
description: 'TypeScript coding conventions for this project'
applyTo: '**.ts, **.tsx'
---

When writing TypeScript code:
- Use strict type checking
- Prefer interfaces over type aliases for object types
- Always handle null/undefined with optional chaining
- Use async/await instead of raw promises`} label="Example instruction (typescript-conventions.instructions.md):" />
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>When to use</span>: For project-wide coding standards, architectural patterns, or technology-specific conventions that should influence all suggestions.</Text>
        </div>
      </section>

      <section id="setting-up-team-configuration" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Setting Up Team Configuration
        </Heading>
        <Text as="p" size="300" variant="muted">Follow these steps to establish effective team-wide Copilot configuration:</Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>1. Create the Configuration Structure</span>
          <Text as="p" size="300" variant="muted">Start by creating the <code className={styles.inlineCode}>.github/</code> directory in your repository root:</Text>
          <CopyBlock code={`mkdir -p .github/{agents,skills,instructions}`} label="Start by creating the .github/ directory in your repository root:" />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>2. Document Your Conventions</span>
          <Text as="p" size="300" variant="muted">Create instructions that capture your team&rsquo;s coding standards:</Text>
          <CopyBlock code={`---
description: 'Team coding conventions and best practices'
applyTo: '**'
---

Our team follows these practices:
- Write self-documenting code with clear names
- Add comments only for complex logic
- Prefer composition over inheritance
- Keep functions small and focused`} label="Create instructions that capture your team&rsquo;s coding standards:" />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>3. Build Reusable Skills</span>
          <Text as="p" size="300" variant="muted">Identify repetitive tasks and create skills for them:</Text>
          <CopyBlock code={`---
name: add-error-handling
description: 'Add comprehensive error handling to existing code following team patterns'
---

# add-error-handling

Add error handling to the selected code:
- Catch and handle potential errors
- Log errors with context
- Provide meaningful error messages
- Follow our error handling patterns from @error-utils.ts`} label="Identify repetitive tasks and create skills for them:" />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>4. Version Control Best Practices</span>
          <ul className={styles.checkList}>
            <li><span className={styles.stepLabel}>Commit all <code className={styles.inlineCode}>.github/</code> files</span> to your repository</li>
            <li><span className={styles.stepLabel}>Use descriptive commit messages</span> when adding or updating customizations</li>
            <li><span className={styles.stepLabel}>Review changes</span> to ensure they align with team standards</li>
            <li><span className={styles.stepLabel}>Document</span> each customization with clear descriptions and examples</li>
          </ul>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>5. Onboard New Team Members</span>
          <Text as="p" size="300" variant="muted">Make Copilot configuration part of your onboarding process:</Text>
          <ol className={styles.stepsList}>
            <li>Point new members to your <code className={styles.inlineCode}>.github/</code> directory</li>
            <li>Explain which agents and skills exist and when to use them</li>
            <li>Encourage exploration and contributions</li>
            <li>Include example usage in your project README</li>
          </ol>
        </div>
      </section>

      <section id="ide-specific-configuration" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          IDE-Specific Configuration
        </Heading>
        <Text as="p" size="300" variant="muted">While repository-level customizations work across all IDEs, you may also need IDE-specific settings:</Text>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>VS Code</span>
          <Text as="p" size="300" variant="muted">Settings file: <code className={styles.inlineCode}>.vscode/settings.json</code> or global user settings</Text>
          <CopyBlock code={`{
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.chat.enabled": true,
  "editor.inlineSuggest.enabled": true
}`} label="VS Code" />
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Visual Studio</span>
          <Text as="p" size="300" variant="muted">Settings: Tools → Options → GitHub Copilot</Text>
          <ul className={styles.checkList}>
            <li>Configure inline suggestions</li>
            <li>Set keyboard shortcuts</li>
            <li>Manage language-specific enablement</li>
          </ul>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>JetBrains IDEs</span>
          <Text as="p" size="300" variant="muted">Settings: File → Settings → Tools → GitHub Copilot</Text>
          <ul className={styles.checkList}>
            <li>Enable/disable for specific file types</li>
            <li>Configure suggestion behavior</li>
            <li>Customize keyboard shortcuts</li>
          </ul>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>GitHub Copilot CLI</span>
          <Text as="p" size="300" variant="muted">Configuration file: <code className={styles.inlineCode}>~/.copilot-cli/config.json</code></Text>
          <CopyBlock code={`{
  "editor": "vim",
  "suggestions": true
}`} label="GitHub Copilot CLI" />
          <Text as="p" size="300" variant="muted">CLI settings use <span className={styles.stepLabel}>camelCase</span> naming. Key settings added in recent releases:</Text>
          <table tabIndex={0}>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className={styles.inlineCode}>includeCoAuthoredBy</code></td>
                <td>Include Co-authored-by trailer in commits</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>effortLevel</code></td>
                <td>Default reasoning effort level (<code className={styles.inlineCode}>low</code>, <code className={styles.inlineCode}>medium</code>, <code className={styles.inlineCode}>high</code>)</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>autoUpdatesChannel</code></td>
                <td>Update channel (<code className={styles.inlineCode}>stable</code>, <code className={styles.inlineCode}>preview</code>)</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>statusLine</code></td>
                <td>Show status line in the terminal UI</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>include_gitignored</code></td>
                <td>Include gitignored files in <code className={styles.inlineCode}>@</code> file search</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>extension_mode</code></td>
                <td>Control extensibility (agent tools and plugins)</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>continueOnAutoMode</code></td>
                <td>Automatically switch to the auto model on rate limit instead of pausing</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>proxy</code></td>
                <td>HTTP(S) proxy URL for all outbound CLI requests (e.g., <code className={styles.inlineCode}>http://proxy.example.com:8080</code>) (v1.0.64+)</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>sessionLimits</code></td>
                <td>Restrict credit or turn usage for a session; limits apply across the current conversation and reset on <code className={styles.inlineCode}>/clear</code> (v1.0.66+)</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>stayInAutopilot</code></td>
                <td>Keep the CLI in autopilot mode after an autopilot task completes, instead of returning to interactive mode (v1.0.69+)</td>
              </tr>
            </tbody>
          </table>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted">Older snake_case names (e.g., <code className={styles.inlineCode}>include_gitignored</code>, <code className={styles.inlineCode}>auto_updates_channel</code>) are still accepted for backward compatibility, but camelCase is now the preferred format.</Text>
          </div>
          <Text as="p" size="300" variant="muted">In addition to the main config file, GitHub Copilot CLI reads two optional per-project files for repository-specific overrides:</Text>
          <ul className={styles.pointList}>
            <li><code className={styles.inlineCode}>.claude/settings.json</code> &mdash; committed project settings</li>
            <li><code className={styles.inlineCode}>.claude/settings.local.json</code> &mdash; local overrides (add to <code className={styles.inlineCode}>.gitignore</code> for personal adjustments)</li>
          </ul>
          <Text as="p" size="300" variant="muted">These files follow the same format as <code className={styles.inlineCode}>config.json</code> and are loaded after the global config, so they can tailor CLI behaviour&mdash;including hook definitions&mdash;per repository without touching <code className={styles.inlineCode}>.github/</code>.</Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Important (v1.0.36+):</span>
            <Text as="p" size="300" variant="muted">Custom agents, skills, and commands placed in <code className={styles.inlineCode}>~/.claude/</code> (the Claude Code user directory) are <span className={styles.stepLabel}>no longer loaded</span> by GitHub Copilot CLI. Only <code className={styles.inlineCode}>~/.claude/settings.json</code> is read for configuration. If you previously stored personal agents or skills in <code className={styles.inlineCode}>~/.claude/</code>, move them to the supported locations: <code className={styles.inlineCode}>~/.copilot/agents/</code> for user-level agents, <code className={styles.inlineCode}>~/.copilot/skills/</code> or <code className={styles.inlineCode}>~/.agents/skills/</code> for personal skills, or <code className={styles.inlineCode}>.github/agents/</code> and <code className={styles.inlineCode}>.github/skills/</code> in your repositories for project-level customizations.</Text>
          </div>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Model Picker</span>
          <Text as="p" size="300" variant="muted">The model picker opens in a <span className={styles.stepLabel}>full-screen view</span> with inline reasoning effort adjustment. Use the <span className={styles.stepLabel}>← / →</span> arrow keys to change the reasoning effort level (<code className={styles.inlineCode}>low</code>, <code className={styles.inlineCode}>medium</code>, <code className={styles.inlineCode}>high</code>) directly from the picker without leaving the session. The current reasoning effort level is also displayed in the model header (e.g., <code className={styles.inlineCode}>claude-sonnet-4.6 (high)</code>) so you always know which level is active.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Auto mode and server-side model routing</span> (v1.0.43+): When you select <span className={styles.stepLabel}>Auto</span> as your model, the CLI uses server-side model routing for real-time model selection. Instead of locking in a single model at session start, Auto mode evaluates each request and routes it to the most appropriate model dynamically. This means straightforward questions can be handled by a faster model while complex reasoning tasks are automatically escalated &mdash; without you needing to switch models manually.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Model family aliases</span> (v1.0.64+): Instead of typing a full model name, you can use short family aliases in the model setting: <code className={styles.inlineCode}>opus</code>, <code className={styles.inlineCode}>sonnet</code>, <code className={styles.inlineCode}>haiku</code> (Anthropic), and <code className={styles.inlineCode}>gpt</code>, <code className={styles.inlineCode}>gemini</code> (Google/OpenAI). The CLI resolves the alias to the latest available model in that family. This is especially useful in scripts or configuration files where you want to track the best model in a family without hardcoding a version string.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>CLI Session Commands</span>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/settings</code> command (v1.0.61+) opens an interactive dialog to browse and edit all user settings in one place. Use it to discover available settings, toggle options, and update values without manually editing your config file:</Text>
          <CopyBlock code={`/settings`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The settings dialog supports search &mdash; type to filter settings by name. Changes take effect immediately.</Text>
          <Text as="p" size="300" variant="muted"><em>(v1.0.70+)</em> The <code className={styles.inlineCode}>/settings</code> command and the <code className={styles.inlineCode}>/model</code> command both support <span className={styles.stepLabel}><code className={styles.inlineCode}>--repo</code> and <code className={styles.inlineCode}>--local</code> flags</span> for explicitly scoping which layer of settings you want to view or edit:</Text>
          <CopyBlock code={`/settings --repo    # view/edit repository-scoped settings
/settings --local   # view/edit local (user-level) settings
/model --repo       # view/edit the model pinned for this repository
/model --local      # view/edit your personal model preference`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">These flags mirror the <span className={styles.stepLabel}>Repo</span> and <span className={styles.stepLabel}>Repo (local)</span> scope tabs available in the <code className={styles.inlineCode}>/settings</code> dashboard (v1.0.71+), making it easier to manage per-repository vs. user-global configuration without ambiguity. In v1.0.71+, the <code className={styles.inlineCode}>/settings</code> dashboard also shows <span className={styles.stepLabel}>Repo</span> and <span className={styles.stepLabel}>Repo (local)</span> tabs alongside the existing user-level view, giving you a unified place to see which settings are applied at each layer.</Text>
          <Text as="p" size="300" variant="muted">GitHub Copilot CLI has two commands for managing session state, with distinct behaviours:</Text>
          <table tabIndex={0}>
            <thead>
              <tr>
                <th>Command</th>
                <th>Behaviour</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className={styles.inlineCode}>/new [prompt]</code></td>
                <td>Starts a fresh conversation while keeping the current session backgrounded. You can switch back to backgrounded sessions.</td>
              </tr>
              <tr>
                <td><code className={styles.inlineCode}>/clear [prompt]</code></td>
                <td>Abandons the current session entirely and starts a new one. Backgrounded sessions are not affected. MCP servers configured in your project are preserved in the new session.</td>
              </tr>
            </tbody>
          </table>
          <Text as="p" size="300" variant="muted">Both commands accept an optional prompt argument to seed the new session with an opening message, for example <code className={styles.inlineCode}>/new Add error handling to the login flow</code>.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/session rename</code> command renames the current session. When called <span className={styles.stepLabel}>without a name argument</span>, it automatically generates a session name based on the conversation history:</Text>
          <CopyBlock code={`/session rename               # auto-generate a name from conversation history
/session rename "My feature"  # set a specific name`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Auto-generated names help you find sessions quickly when switching between multiple backgrounded sessions.</Text>
          <Text as="p" size="300" variant="muted">You can also name a session at startup with the <code className={styles.inlineCode}>--name</code> flag, and resume it by name later:</Text>
          <CopyBlock code={`copilot --name "auth-refactor"          # start a session with a given name
copilot --resume="auth-refactor"        # resume that session by name`} label="You can also name a session at startup with the --name flag, and resume it by name later:" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/session delete</code> command removes sessions you no longer need:</Text>
          <CopyBlock code={`/session delete              # delete the current session
/session delete <id>         # delete a session by ID
/session delete-all          # delete all sessions`} label="The /session delete command removes sessions you no longer need:" />
          <Text as="p" size="300" variant="muted">You can also press <span className={styles.stepLabel}>x</span> on a highlighted session in the session picker (<code className={styles.inlineCode}>--resume</code>) to delete it directly from the list.</Text>
          <Text as="p" size="300" variant="muted">In the session picker, press <span className={styles.stepLabel}><code className={styles.inlineCode}>s</code></span> to cycle the sort order: relevance, last used, created, or name. The picker also shows the branch name and idle/in-use status for each session.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/rewind</code> command opens a timeline picker that lets you roll back the conversation to any earlier point in history, reverting both the conversation and any file changes made after that point. You can also trigger it by pressing <span className={styles.stepLabel}>double-Esc</span>:</Text>
          <CopyBlock code={`/rewind`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Use <code className={styles.inlineCode}>/rewind</code> when you want to branch off from a different point in the conversation, rather than just undoing the most recent turn.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/undo</code> command reverts the last turn&mdash;including any file changes the agent made&mdash;letting you course-correct without manually undoing edits:</Text>
          <CopyBlock code={`/undo`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Use <code className={styles.inlineCode}>/undo</code> when the agent&rsquo;s last response went in an unwanted direction and you want to try a different approach from that point.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/fork</code> command (v1.0.45+) copies the current session into a <span className={styles.stepLabel}>new independent session</span> that starts from the same conversation state. The original session continues unchanged &mdash; you can switch back to it at any time. This is useful when you want to explore two different approaches to a problem simultaneously. In v1.0.64+, <code className={styles.inlineCode}>/branch</code> is available as an alias for <code className={styles.inlineCode}>/fork</code> (matching Claude Code&rsquo;s command naming):</Text>
          <CopyBlock code={`/fork                    # fork with an auto-generated name
/fork "my-experiment"    # fork with a custom name (v1.0.47+)
/branch                  # alias for /fork (v1.0.64+)`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">After forking, the new session is immediately active. Both sessions share the same history up to the fork point but accumulate changes independently from that moment forward. Use <code className={styles.inlineCode}>/fork</code> to experiment with a risky refactor without abandoning your current working session. Since v1.0.47, forked sessions display their <span className={styles.stepLabel}>origin session</span> name in the sessions dialog, making it easy to trace which session a fork came from.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/cd</code> command changes the working directory for the current session. Since v1.0.65, the working directory <span className={styles.stepLabel}>persists when you resume a session</span> &mdash; if you restart the CLI and resume, you return to the same directory automatically. Changing directory also triggers discovery of custom agents in the new location, so switching to a different project loads its agents without a restart:</Text>
          <CopyBlock code={`/cd ~/projects/my-other-repo`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">This is useful when you have multiple backgrounded sessions each focused on a different project directory.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/worktree</code> command (v1.0.61+, also aliased <code className={styles.inlineCode}>/move</code>) creates a new git worktree and switches into it, moving any uncommitted changes along. This lets you start working on a parallel branch without leaving your current terminal session:</Text>
          <CopyBlock code={`/worktree my-feature-branch`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">In v1.0.66+, you can pass a task description to <code className={styles.inlineCode}>/worktree</code> to name the branch from the task and immediately run the task as the first prompt in the new worktree &mdash; all in one step:</Text>
          <CopyBlock code={`/worktree fix the login redirect`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">This creates a branch named from your task description and begins working on it immediately, making it easy to spin up parallel work without stopping to think of a branch name.</Text>
          <Text as="p" size="300" variant="muted">After the command runs, the session is inside the new worktree. Use this when you want to work on a second task in parallel without stashing changes or opening a new terminal. In v1.0.64+ you can also use the experimental <code className={styles.inlineCode}>--worktree</code> flag at startup (<code className={styles.inlineCode}>copilot -w [name]</code>) to create or reuse a worktree under <code className={styles.inlineCode}>&lt;repo&gt;.worktrees/</code> before the session begins.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/every</code> command (also available as <code className={styles.inlineCode}>/loop</code> since v1.0.64) schedules a recurring prompt to run automatically at a specified interval. The companion <code className={styles.inlineCode}>/after</code> command runs a prompt once after a specified delay. Both are useful for self-paced automation &mdash; polling for results, periodically summarizing progress, or triggering other slash commands on a timer:</Text>
          <CopyBlock code={`/every 5m Check if there are any new test failures and summarize them
/loop 30s Check if the build is done
/after 2h /compact                        # compact the session after 2 hours
/every 1d /chronicle standup              # daily standup report via /chronicle`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The interval can be specified in seconds (<code className={styles.inlineCode}>s</code>), minutes (<code className={styles.inlineCode}>m</code>), or hours (<code className={styles.inlineCode}>h</code>), and both commands can invoke other slash commands as their payload. To see and manage all your scheduled prompts, use <code className={styles.inlineCode}>/every</code> with no argument &mdash; it opens the schedule manager. To cancel a running schedule, use <code className={styles.inlineCode}>/every stop</code> or <span className={styles.stepLabel}>Ctrl+C</span>.</Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Experimental:</span>
            <Text as="p" size="300" variant="muted"><code className={styles.inlineCode}>/every</code>, <code className={styles.inlineCode}>/loop</code>, and <code className={styles.inlineCode}>/after</code> are part of the experimental feature set. They appear in the <code className={styles.inlineCode}>/experimental</code> slash command list &mdash; enable experimental features if they are not already visible in your current session.</Text>
          </div>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted">Scheduled prompts run in the background of the current session and use your active model. They share the session context window, so very frequent scheduling with long responses may consume context rapidly. Use <code className={styles.inlineCode}>/compact</code> if context usage becomes a concern.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/pr auto</code> command <em>(v1.0.66+)</em> starts a self-paced automation loop that drives the current pull request to CI green. Rather than running continuously, it fixes one failing item per run and paces itself around CI checks to avoid redundant work:</Text>
          <CopyBlock code={`/pr auto            # start fixing the current PR until CI passes
/pr automerge       # continue until the PR is fully merged`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted"><code className={styles.inlineCode}>/pr auto</code> is ideal when you have a PR with failing tests or linting errors &mdash; let it work through failures one at a time while you focus on other things. <code className={styles.inlineCode}>/pr automerge</code> extends this further: it continues until all CI checks pass, required reviews are approved, and the PR is successfully merged. Both commands can be monitored and stopped from <code className={styles.inlineCode}>/loop</code> or <code className={styles.inlineCode}>/every</code>, which register the running automation as a scheduleable loop task.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/delegate</code> command creates a <span className={styles.stepLabel}>delegate PR</span> &mdash; a pull request that the coding agent works on autonomously. By default, the delegate PR targets your current branch. Use <code className={styles.inlineCode}>--base</code> <em>(v1.0.69+)</em> to specify a different target base branch:</Text>
          <CopyBlock code={`/delegate                      # create a delegate PR targeting the current branch
/delegate --base main          # create a delegate PR targeting main
/delegate --base release/2.0   # target a specific release branch`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">This is useful when you want to hand off a task to the coding agent on a specific branch &mdash; for example, backporting a fix to an older release branch or targeting a long-lived feature branch for automated work.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/share html</code> command exports the current session &mdash; including conversation history and any research reports &mdash; as a <span className={styles.stepLabel}>self-contained interactive HTML file</span>:</Text>
          <CopyBlock code={`/share html`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The exported file contains everything needed to view the session without a network connection and can be shared with teammates or stored for later reference. This complements <code className={styles.inlineCode}>/share</code> (which shares via URL) for cases where an offline or attached format is preferred.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/chronicle</code> command opens an interactive timeline of everything the agent has done in the current session. It shows file changes, tool calls, and conversation turns in chronological order, letting you review the full arc of the session at a glance:</Text>
          <CopyBlock code={`/chronicle`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Chronicle tracks which files were created, modified, or deleted during the session alongside the conversation that led to those changes. Use it to review what happened before a <code className={styles.inlineCode}>/rewind</code>, audit what the agent changed, or share a summary of session activity with teammates.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/chronicle skills review</code> subcommand <em>(v1.0.66+)</em> opens an interactive review flow for proposed draft skill changes. When the agent has suggested additions or modifications to skills during a session, you can review each draft individually and choose to accept, reject, or defer:</Text>
          <CopyBlock code={`/chronicle skills review`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">This keeps you in control of skill evolution &mdash; the agent can propose skill improvements as it discovers reusable patterns, but nothing is applied until you explicitly approve each change.</Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted">Session history, file tracking, and the <code className={styles.inlineCode}>/chronicle</code> command were previously experimental features. As of v1.0.40, they are available to all users without enabling experimental mode.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/diagnose</code> command (v1.0.64+) analyzes the current session&rsquo;s logs and surfaces diagnostic information to help troubleshoot unexpected behavior, performance issues, or errors:</Text>
          <CopyBlock code={`/diagnose`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Use <code className={styles.inlineCode}>/diagnose</code> when a session is behaving unexpectedly &mdash; it inspects session logs and reports what it finds, making it easier to share diagnostics with support or understand what happened internally.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Keyboard shortcuts for queuing messages</span>: Use <span className={styles.stepLabel}>Ctrl+Q</span> or <span className={styles.stepLabel}>Ctrl+Enter</span> to queue a message (send it while the agent is still working). <span className={styles.stepLabel}>Ctrl+D</span> no longer queues messages &mdash; it now has its default terminal behavior. If you have muscle memory for Ctrl+D queuing, switch to Ctrl+Q.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Background running tasks</span>: Press <span className={styles.stepLabel}>Ctrl+X → B</span> to move the current running task or shell command to the background. The task continues executing while you can type a new message or review earlier output. This is useful for long-running commands where you want to interact with the agent while waiting for the result.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Shell command history in normal mode</span> (v1.0.65+): The <span className={styles.stepLabel}>↑/↓</span> arrow keys and <span className={styles.stepLabel}>Ctrl+R</span> reverse search now include past shell commands (commands run with <code className={styles.inlineCode}>!</code>) while you are in normal (non-shell) input mode. Previously you had to type <code className={styles.inlineCode}>!</code> to enter shell mode before history worked. Now you can recall and re-run a shell command without switching modes first &mdash; useful for quickly repeating a build, test, or diagnostic command from earlier in the session.</Text>
          <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Inline image rendering</span> (v1.0.64+): The CLI can display images inline in the terminal when your terminal supports it. If an MCP tool, agent, or attachment returns an image, it is rendered directly in the conversation timeline rather than shown as a file path or URL. This works in terminals with image protocol support (such as iTerm2, Kitty, Wezterm, and tmux with appropriate configuration).</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/ask</code> command lets you ask a quick question without affecting your conversation history. The current session context is preserved, so you can use it for one-off lookups without derailing an ongoing task. Responses are rendered as full markdown, including tables and formatted links:</Text>
          <CopyBlock code={`/ask What does the \`retry\` utility in src/utils do?`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/refine</code> command <em>(v1.0.70+)</em> rewrites a rough, stream-of-consciousness prompt into a clear, structured one before sending it to the agent:</Text>
          <CopyBlock code={`/refine`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Type your rough idea, and <code className={styles.inlineCode}>/refine</code> transforms it into a precise, well-structured prompt. This is especially helpful for complex multi-step tasks where prompt clarity significantly affects output quality &mdash; for example, turning &ldquo;um make the login thing work better with the existing setup&rdquo; into a focused task description with clear scope and acceptance criteria.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/env</code> command shows all loaded environment details &mdash; instructions, MCP servers, skills, agents, and plugins &mdash; in a single view. Use it to verify that the right resources are active for the current session:</Text>
          <CopyBlock code={`/env`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/context</code> command shows a visualization of the current conversation&rsquo;s context window usage &mdash; how many tokens are consumed and how much headroom remains:</Text>
          <CopyBlock code={`/context`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/usage</code> command displays session metrics such as the number of tokens consumed, API calls made, and any quota information for the current session. In v1.0.64+, <code className={styles.inlineCode}>/usage</code> also shows per-model token totals when you have used multiple models in a session:</Text>
          <CopyBlock code={`/usage`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/compact</code> command summarizes the conversation history to free up context window space while preserving the thread of the conversation. Use it when your context is getting full but you do not want to start a fresh session:</Text>
          <CopyBlock code={`/compact`} label="CLI Session Commands" />
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted">Skills remain loaded and effective after <code className={styles.inlineCode}>/compact</code>. You do not need to re-invoke them after compacting.</Text>
          </div>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>ACP sessions (v1.0.39+):</span>
            <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/compact</code>, <code className={styles.inlineCode}>/context</code>, <code className={styles.inlineCode}>/usage</code>, and <code className={styles.inlineCode}>/env</code> commands are now available in ACP (Agent Coordination Protocol) sessions, allowing remote ACP clients to surface session details and manage context from within their own automated workflows.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/statusline</code> command (with <code className={styles.inlineCode}>/footer</code> as an alias) lets you control which items appear in the terminal status bar. You can show or hide individual indicators like the working directory, current branch, effort level, context window usage, quota, and <span className={styles.stepLabel}>active account username</span> (v1.0.43+). The <span className={styles.stepLabel}>changes</span> toggle shows a running count of added/removed lines for the session &mdash; useful when tracking the scope of an ongoing edit. In v1.0.65+, there is also an opt-in <span className={styles.stepLabel}>CI check status</span> indicator that shows the passing/running/failing state of CI checks for the current branch &mdash; enable it from the <code className={styles.inlineCode}>/statusline</code> menu:</Text>
          <CopyBlock code={`/statusline             # show the statusline configuration menu`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Toggle the <span className={styles.stepLabel}>username</span> indicator to display which GitHub account is currently active in the footer &mdash; helpful when you work with multiple accounts or switch between personal and organization contexts.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/keep-alive</code> command prevents the system from sleeping while Copilot CLI is active. This is useful during long-running agent sessions on laptops or machines with aggressive sleep settings:</Text>
          <CopyBlock code={`/keep-alive             # toggle keep-alive on or off`} label="CLI Session Commands" />
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted"><code className={styles.inlineCode}>/keep-alive</code> was previously an experimental feature. As of v1.0.36, it is available without enabling experimental mode.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/allow-all</code> command (also accessible as <code className={styles.inlineCode}>/yolo</code>) enables autopilot mode, where the agent runs all tools without asking for confirmation. It now supports <code className={styles.inlineCode}>on</code>, <code className={styles.inlineCode}>off</code>, and <code className={styles.inlineCode}>show</code> subcommands:</Text>
          <CopyBlock code={`/allow-all on     # enable allow-all mode
/allow-all off    # disable allow-all mode
/allow-all show   # check current allow-all status`} label="CLI Session Commands" />
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Note:</span>
            <Text as="p" size="300" variant="muted"><code className={styles.inlineCode}>/allow-all on</code> permissions persist after <code className={styles.inlineCode}>/clear</code> starts a new session, so you don&rsquo;t need to re-enable it each time.</Text>
          </div>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>ACP clients (v1.0.39+):</span>
            <Text as="p" size="300" variant="muted">ACP clients can also toggle allow-all mode programmatically via session configuration, without issuing a slash command. This is useful for automated pipelines that drive Copilot CLI through the ACP protocol.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>/autopilot</code> command (v1.0.45+) is a quick in-session toggle that switches between <span className={styles.stepLabel}>interactive mode</span> (where the agent pauses to ask for confirmation before tool use) and <span className={styles.stepLabel}>autopilot mode</span> (where it runs autonomously). Unlike <code className={styles.inlineCode}>/allow-all</code> which specifically controls whether tool permissions are required, <code className={styles.inlineCode}>/autopilot</code> toggles the overall agent mode:</Text>
          <CopyBlock code={`/autopilot        # toggle between interactive and autopilot modes`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Use <code className={styles.inlineCode}>/autopilot</code> when you want to flip between supervised and unsupervised operation mid-session without typing out the full <code className={styles.inlineCode}>/allow-all on</code> or <code className={styles.inlineCode}>/allow-all off</code> commands.</Text>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Enhanced autopilot (v1.0.64+):</span>
            <Text as="p" size="300" variant="muted">When autopilot mode is active &mdash; including when launched with <code className={styles.inlineCode}>--autopilot</code> at startup or during automatic continuation turns &mdash; the agent automatically handles elicitation dialogs, <code className={styles.inlineCode}>ask_user</code> prompts, sampling requests, and permission prompts without surfacing them as interactive dialogs. This means long-running automated sessions can proceed end-to-end without manual confirmation steps.</Text>
          </div>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Auto allow-all mode (v1.0.69+):</span>
            <Text as="p" size="300" variant="muted">In addition to the standard allow-all mode (which approves everything), the CLI now supports an <span className={styles.stepLabel}>auto allow-all</span> mode that uses an LLM judge to evaluate each tool request. When enabled, the judge automatically approves requests it evaluates as acceptable, and asks you for manual confirmation only for requests it considers risky. This gives you a middle ground between full autopilot and fully supervised operation &mdash; most routine actions proceed automatically while unusual or potentially dangerous actions still surface for your review. As of v1.0.69-3, this mode requires experimental features to be enabled &mdash; use <code className={styles.inlineCode}>/experimental on</code> or start the CLI with <code className={styles.inlineCode}>--experimental</code> &mdash; then activate it with <code className={styles.inlineCode}>/allow-all auto</code>. The previous <code className={styles.inlineCode}>AUTO_APPROVAL</code> environment variable approach has been removed in favour of experimental mode.</Text>
          </div>
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Read-only gh CLI commands (v1.0.46+):</span>
            <Text as="p" size="300" variant="muted">Read-only <code className={styles.inlineCode}>gh</code> commands &mdash; such as <code className={styles.inlineCode}>gh issue list</code>, <code className={styles.inlineCode}>gh pr view</code>, <code className={styles.inlineCode}>gh run status</code>, and other commands that don&rsquo;t write to GitHub &mdash; are <span className={styles.stepLabel}>automatically approved</span> without a permission prompt. Only commands that write to GitHub (like creating issues, merging PRs) still require explicit approval. This reduces friction during exploratory sessions where you frequently check issue or PR status.</Text>
          </div>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>--effort</code> flag (shorthand for <code className={styles.inlineCode}>--reasoning-effort</code>) controls how much computational reasoning the model applies to a request:</Text>
          <CopyBlock code={`gh copilot --effort high "Refactor the authentication module"`} label="CLI Session Commands" />
          <Text as="p" size="300" variant="muted">Accepted values are <code className={styles.inlineCode}>low</code>, <code className={styles.inlineCode}>medium</code>, and <code className={styles.inlineCode}>high</code>. You can also set a default via the <code className={styles.inlineCode}>effortLevel</code> config setting.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>CLI Startup Flags</span>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>-C &lt;directory&gt;</code> flag changes the working directory before starting, similar to <code className={styles.inlineCode}>git -C</code> (v1.0.42+). This is useful for scripts or aliases that need to start Copilot CLI in a specific project directory without a separate <code className={styles.inlineCode}>cd</code>:</Text>
          <CopyBlock code={`copilot -C ~/projects/my-repo          # start in a different directory
copilot -C ~/projects/my-repo -p "..."  # combine with prompt mode`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>--mode</code> flag (along with its aliases <code className={styles.inlineCode}>--autopilot</code> and <code className={styles.inlineCode}>--plan</code>) lets you launch the CLI directly in a specific agent mode without waiting for the interactive session to start:</Text>
          <CopyBlock code={`copilot --mode agent    # start in agent mode (autonomous tool use)
copilot --autopilot     # alias for --mode autopilot (allow-all)
copilot --plan          # start in plan mode (propose without executing)`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">This is useful in scripts or CI pipelines where you want the CLI to immediately begin working in a specific mode without an interactive prompt.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>--max-autopilot-continues</code> flag controls how many times Copilot can automatically continue in autopilot mode before pausing for confirmation. The default is 5:</Text>
          <CopyBlock code={`copilot --autopilot --max-autopilot-continues 10 "Refactor the authentication module"`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">Set it higher for long-running tasks, or lower for tasks where you want more frequent checkpoints. Setting it to <code className={styles.inlineCode}>0</code> disables automatic continuation entirely.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>--sandbox</code> and <code className={styles.inlineCode}>--no-sandbox</code> flags <em>(v1.0.70+)</em> turn the OS-level shell sandbox on or off for the current session only, without permanently changing your saved sandbox setting. This is useful with <code className={styles.inlineCode}>-p</code> (prompt mode) when you need to temporarily adjust sandbox behavior for a specific automated task:</Text>
          <CopyBlock code={`copilot --sandbox -p "Run the full test suite and fix any failures"
copilot --no-sandbox -p "Set up development environment with system tools"`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">These flags apply only to the current invocation &mdash; your persisted sandbox preference remains unchanged.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>--attachment</code> flag (available in prompt mode, <code className={styles.inlineCode}>-p</code>) lets you attach files &mdash; images or native documents &mdash; to the initial prompt in non-interactive mode:</Text>
          <CopyBlock code={`copilot -p "Summarize the architecture shown in these diagrams" \\
  --attachment arch-overview.png \\
  --attachment data-flow.pdf`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">This is useful in automated pipelines where you want to pass visual or document context (screenshots, design specs, PDF reports) to the model without interactive file selection. Multiple <code className={styles.inlineCode}>--attachment</code> flags can be specified to include several files at once.</Text>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>COPILOT_HOME</code> environment variable sets the Copilot CLI configuration directory. It is the preferred replacement for the <code className={styles.inlineCode}>--config-dir</code> flag, which is deprecated:</Text>
          <CopyBlock code={`# Preferred — set via environment variable
export COPILOT_HOME=~/.my-copilot-config
copilot

# Deprecated — use COPILOT_HOME instead
copilot --config-dir ~/.my-copilot-config`} label="CLI Startup Flags" />
          <Text as="p" size="300" variant="muted">Set <code className={styles.inlineCode}>COPILOT_HOME</code> in your shell profile to use a custom config directory across all sessions. This is especially useful when running multiple Copilot configurations for different projects or teams.</Text>
        </div>
        <div className={styles.promptGroup}>
          <span className={styles.promptLabel}>Shell Completion</span>
          <Text as="p" size="300" variant="muted">The <code className={styles.inlineCode}>copilot completion</code> subcommand generates a static shell completion script for subcommands, flags, and known option values. Once installed, pressing Tab auto-completes Copilot CLI commands in your terminal.</Text>
          <CopyBlock code={`# Bash — add to ~/.bashrc
eval "$(copilot completion bash)"

# Zsh — add to ~/.zshrc
eval "$(copilot completion zsh)"

# Fish — add to ~/.config/fish/config.fish
copilot completion fish | source`} label="Shell Completion" />
          <Text as="p" size="300" variant="muted">Or write the script to a file and source it from your shell profile:</Text>
          <CopyBlock code={`copilot completion bash > ~/.copilot-completion.bash
echo 'source ~/.copilot-completion.bash' >> ~/.bashrc`} label="Or write the script to a file and source it from your shell profile:" />
          <div className={styles.promptGroup}>
            <span className={styles.promptLabel}>Tip:</span>
            <Text as="p" size="300" variant="muted">Reload your shell (<code className={styles.inlineCode}>source ~/.bashrc</code> or open a new terminal) after adding the completion script for changes to take effect.</Text>
          </div>
        </div>
      </section>

      <section id="common-questions" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Common Questions
        </Heading>
        <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Q: How do I disable Copilot for specific files?</span></Text>
        <Text as="p" size="300" variant="muted">A: Use the <code className={styles.inlineCode}>excludedFiles</code> setting in your IDE configuration or create a workspace setting that disables Copilot for specific patterns:</Text>
        <CopyBlock code={`{
  "github.copilot.advanced": {
    "excludedFiles": [
      "**/secrets/**",
      "**/*.env",
      "**/test/fixtures/**"
    ]
  }
}`} label="Common Questions" />
        <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Q: Can I have different settings per project?</span></Text>
        <Text as="p" size="300" variant="muted">A: Yes! Use workspace settings (<code className={styles.inlineCode}>.vscode/settings.json</code>) for project-specific preferences that don&rsquo;t need to be shared, or use repository settings (for example, files in <code className={styles.inlineCode}>.github/agents/</code>, <code className={styles.inlineCode}>.github/skills/</code>, <code className={styles.inlineCode}>.github/instructions/</code>, and <code className={styles.inlineCode}>.github/copilot-instructions.md</code>) for team-wide customizations that should be version-controlled.</Text>
        <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Q: How do team settings override personal settings?</span></Text>
        <Text as="p" size="300" variant="muted">A: Repository-level Copilot configuration (such as <code className={styles.inlineCode}>.github/agents/</code>, <code className={styles.inlineCode}>.github/skills/</code>, <code className={styles.inlineCode}>.github/instructions/</code>, and <code className={styles.inlineCode}>.github/copilot-instructions.md</code>) has the highest precedence, followed by workspace settings, then user settings. This means team-defined instructions and agents will apply even if your personal settings differ, ensuring consistency across the team.</Text>
        <Text as="p" size="300" variant="muted"><span className={styles.stepLabel}>Q: Where should I put customizations that apply to all my projects?</span></Text>
        <Text as="p" size="300" variant="muted">A: Use user-level settings in your IDE for personal preferences that should apply everywhere. For customizations specific to a technology or framework (like React conventions), consider creating a collection in the awesome-copilot-hub repository that you can reference across multiple projects.</Text>
      </section>

      <section id="next-steps" className={styles.articleSection}>
        <Heading as="h2" size="5" className={styles.articleHeading}>
          Next Steps
        </Heading>
        <Text as="p" size="300" variant="muted">Now that you understand Copilot configuration, explore how to create powerful customizations:</Text>
        <ul className={styles.checkList}>
          <li><span className={styles.stepLabel}><a href="https://awesome-copilot.github.com/learning-hub/what-are-agents-skills-instructions/">What are Agents, Skills, and Instructions</a></span> - Understand the customization types you can configure</li>
          <li><span className={styles.stepLabel}><a href="https://awesome-copilot.github.com/learning-hub/understanding-copilot-context/">Understanding Copilot Context</a></span> - Learn how configuration affects context usage</li>
          <li><span className={styles.stepLabel}><a href="https://awesome-copilot.github.com/learning-hub/defining-custom-instructions/">Defining Custom Instructions</a></span> - Create persistent context for your projects</li>
          <li><span className={styles.stepLabel}><a href="https://awesome-copilot.github.com/learning-hub/creating-effective-skills/">Creating Effective Skills</a></span> - Build reusable task folders with bundled assets</li>
          <li><span className={styles.stepLabel}><a href="https://awesome-copilot.github.com/learning-hub/building-custom-agents/">Building Custom Agents</a></span> - Develop specialized assistants</li>
        </ul>
      </section>
    </LearningArticleLayout>
  );
}
