---
name: agentic-workflows
description: 'Design, create, update, debug, and upgrade GitHub Agentic Workflows (gh-aw). Use for AI-powered GitHub Actions automation, issue or pull request triage, scheduled repository maintenance, workflow compilation, and gh-aw troubleshooting.'
---

# GitHub Agentic Workflows

Design and maintain secure GitHub Agentic Workflows from natural-language requirements. Use the current upstream `gh-aw` guidance as the source of truth instead of relying on remembered syntax.

## Start with the Upstream Dispatcher

For every request:

1. Fetch and read all of:
   `https://raw.githubusercontent.com/github/gh-aw/main/create.md`
2. Classify the request using that dispatcher.
3. Fetch the matching prompt from:
   `https://raw.githubusercontent.com/github/gh-aw/main/.github/aw/`
4. Resolve relevant relative links in the selected prompt against the same `.github/aw/` base URL and read them before making changes.
5. If `.github/aw/instructions.md` exists in the target repository, read it after the upstream guidance. Repository instructions override upstream defaults when they conflict.

Use the `main` branch URLs specified by the dispatcher so the guidance stays current. If the upstream prompt cannot be fetched, use the official documentation at `https://github.github.com/gh-aw/`, state the limitation, and do not invent unsupported syntax.

## Route the Request

| User intent | Upstream prompt |
|---|---|
| Design requirements are incomplete | `designer.md` |
| Create a workflow | `create-agentic-workflow.md` |
| Update an existing workflow | `update-agentic-workflow.md` |
| Debug, audit, or investigate a run | `debug-agentic-workflow.md` |
| Upgrade workflows or fix deprecations | `upgrade-agentic-workflows.md` |
| Create a reusable component or MCP wrapper | `create-shared-agentic-workflow.md` |

Read the complete selected prompt before acting. Load only the linked topic references relevant to the request, except when the selected prompt marks references as required.

## Working Method

### 1. Establish the requested outcome

- Distinguish implementation from design-only evaluation.
- If the user asks to create or implement a workflow, produce the workflow files rather than only describing them.
- If the user asks to evaluate an idea without creating files, return a compact design covering trigger, scope, tools, permissions, safe outputs, and `noop` behavior.
- Ask one focused question at a time only for policy choices that cannot be inferred. Do not repeat questions already answered by the request or repository.

### 2. Inspect the target repository

Before designing a workflow, inspect:

- `.github/aw/instructions.md`
- `AGENTS.md`, `CONTRIBUTING.md`, and `CODEOWNERS`
- existing `.github/workflows/*.md` and matching `.lock.yml` files
- issue and pull request templates
- repository labels and team-routing conventions when the workflow will triage work
- manifests, lock files, and validation commands when the workflow will build or test code

Use bounded GitHub queries and report unavailable data. For maintenance workflows, separate observed repository facts from recommendations.

### 3. Prepare the CLI for implementation

For workflow creation, editing, compilation, or debugging, follow the installation and upgrade instructions in the current upstream dispatcher. Verify the result with:

```bash
gh aw version
```

Prefer the official GitHub CLI installation path when installation is needed:

```bash
gh extension install github/gh-aw
```

Do not install or upgrade global tooling for a design-only evaluation. Do not run `gh aw init` unless the user explicitly asks for repository initialization.

### 4. Apply the security model

- Keep the agent job read-only.
- Route every GitHub mutation through the most specific `safe-outputs` operation.
- Prefer `tools.github.mode: gh-proxy` for GitHub reads.
- Enable only the required toolsets, MCP servers, secrets, and network destinations.
- Scope safe outputs with allowlists, targets, limits, and file restrictions where supported.
- Never interpolate untrusted issue, pull request, or comment content directly into shell scripts.
- Require the workflow to call `noop` with a short reason when no visible action is needed.
- Recommend traditional GitHub Actions when the request requires multi-job orchestration, cross-job state, long waits, approvals, or rollback logic.

### 5. Create or edit the workflow

- Store source workflows at `.github/workflows/<workflow-id>.md`.
- Derive a lowercase kebab-case workflow ID and avoid overwriting an existing workflow.
- Keep YAML frontmatter minimal and put agent instructions in the Markdown body.
- Use deterministic prefetch steps for large GitHub datasets and give the agent compact files rather than unbounded context.
- Preserve existing repository conventions and make the smallest complete change.
- Do not commit or push unless the user explicitly requests it.

### 6. Compile and verify

Follow the current selected prompt's compile instructions. At minimum:

```bash
gh aw compile <workflow-id>
gh aw compile --validate
```

Fix every compile or validation error before stopping. Review both the source and generated lock file. Ensure `.gitattributes` contains:

```text
.github/workflows/*.lock.yml linguist-generated=true
```

For a newly created workflow, the persistent result normally includes:

- `.github/workflows/<workflow-id>.md`
- `.github/workflows/<workflow-id>.lock.yml`
- `.gitattributes` only when the generated-file rule was missing

## Issue Triage Pattern

For a request such as:

> Create a workflow that triages new issues by type and priority, identifies duplicates, asks clarifying questions, and assigns the right team members.

Use the create-workflow route and infer as much as possible from labels, issue templates, `CODEOWNERS`, and existing ownership conventions.

Design the workflow so it:

1. Runs when an issue is opened; use the current public-entrypoint guidance when community contributors must be allowed to trigger it.
2. Reads the triggering issue, repository labels, ownership rules, and a bounded set of duplicate candidates with GitHub read tools.
3. Checks for a likely duplicate before routing. When confidence is high, add a comment linking the canonical issue; do not close the issue unless explicitly requested.
4. Applies only allowlisted type and priority labels through `add-labels`.
5. Uses `add-comment` to ask concise clarifying questions when required information is missing.
6. Uses `assign-to-user` with an explicit assignee allowlist when ownership is clear.
7. Avoids assignment when clarification is still required unless repository policy says otherwise.
8. Calls `noop` when no safe visible change is appropriate.

Ask for the allowed labels, assignees, or routing policy only when they cannot be inferred. Never grant direct issue write permission to the agent job to implement these actions.

## Completion Criteria

Do not consider an implementation complete until:

- the workflow behavior matches the request
- every write maps to a configured safe output
- permissions and network access are minimal
- the source compiles successfully
- validation passes
- the generated lock file is current
- the final diff contains only intended workflow-related changes

## Official References

- Overview: `https://github.github.com/gh-aw/`
- Quick start: `https://github.github.com/gh-aw/setup/quick-start/`
- Upstream dispatcher: `https://raw.githubusercontent.com/github/gh-aw/main/create.md`
