# Java Modernization Studio

An interactive GitHub Copilot **canvas** that turns the [GitHub Copilot App Modernization for Java](https://learn.microsoft.com/en-us/azure/developer/java/migration/migrate-github-copilot-app-modernization-for-java) CLI workflow into a visible, steerable dashboard — assess a legacy Java app, drive a prioritized remediation plan, run validation gates, and dispatch Microsoft predefined tasks, all grounded in the repo's real artifacts.

The Copilot App Modernization for Java tooling stays the engine. This canvas is the cockpit on top of it: it reads what the workflow produces and turns each step into an agent-driving button.

## What it does

- **Overview** — at-a-glance modernization status (phase, % complete, finding counts) scanned from the repo.
- **Readiness (Environment Doctor)** — checks JDK, Maven (or `./mvnw`), Git, Docker, and Azure CLI on PATH and flags what's missing before you start.
- **Assessment** — renders structured findings from `.appmod/assessment.json` (stack summary, severity-ordered findings, strengths), each with a one-click action.
- **Plan & Progress** — renders `plan.md` / `progress.md` as live checklists (`- [ ]` / `- [x]`).
- **Validation** — runs the workflow's quality gates (CVE validation, test generation) before and after changes.
- **Tasks** — dispatches Microsoft predefined modernization tasks (managed identity for DB, secrets → Key Vault, message-broker → Service Bus, S3 → Blob, cache → Redis, Entra ID auth, and more) relevant to the detected stack.
- **Summary** — surfaces `summary.md` when the run is complete.
- **Autopilot** — an optional phase-ordered, hands-free loop that advances assessment → remediation → validation and updates the dashboard as the agent makes progress.

Buttons don't execute logic in the canvas — they dispatch a grounded prompt to your Copilot agent (action kinds: `run_task`, `generate_plan`, `run_cve`, `generate_tests`, `fix_finding`). The agent does the work; the canvas reflects the result.

## Prerequisites

- **GitHub Copilot app** (the canvas host).
- **GitHub Copilot App Modernization for Java** tooling — the underlying workflow this canvas drives.
- **JDK 17+** and **Maven** (or a `./mvnw` wrapper) for the Java project you're modernizing.
- *Optional:* **Azure CLI** (`az`) for cloud-readiness and Azure migration tasks; **Docker** for container checks.

## Install

This is an in-repo canvas extension. Copy the `java-modernization-studio/` folder into one of:

- `~/.copilot/extensions/` — **user scope** (just you), or
- `.github/extensions/` — **project scope** (shared with your repo's team).

Then reload extensions (or restart the app) so Copilot discovers it. No build step is required — the Copilot CLI resolves `@github/copilot-sdk` automatically.

## Usage

Point the canvas at a Java repository and let the agent drive it:

```text
Open the Java Modernization Studio canvas for /path/to/my-java-app and run a readiness check.
```

The canvas resolves the target repo from its `repoPath` input, falling back to the session's working directory. From there:

1. **Readiness first** — resolve any missing JDK/Maven/Azure CLI the Doctor flags.
2. **Assess** — generate `.appmod/assessment.json` + a prioritized `plan.md` / `progress.md`.
3. **Remediate** — work findings in severity order (P0 first), using task buttons and "Help me fix this".
4. **Validate** — run the CVE and test-generation gates.
5. **Ship** — when the work is genuinely complete, write `summary.md`.

### Suggested agent instructions

```text
When a user modernizes a Java project with the Java Modernization Studio canvas:
1) Open the canvas pointed at the repo (repoPath) and run the Environment Doctor first.
2) Run an assessment; write findings to .appmod/assessment.json and a prioritized plan.md / progress.md.
   Start plan.md, progress.md, and summary.md with the exact first line <!-- appmod-cockpit --> so the
   canvas recognizes them as modernization artifacts.
3) Work findings in severity order (P0 first); run the validation gates (CVE scan, test generation)
   before and after code changes.
4) Keep plan.md / progress.md updated as - [ ] / - [x] checklists. Only write summary.md when the
   work is truly complete.
```

## How it stays grounded

The canvas renders **real repo state**, never invented status:

- Structured findings come from `.appmod/assessment.json`.
- Plan/progress/summary come from root `plan.md` / `progress.md` / `summary.md`.
- To avoid mistaking an unrelated repo's `plan.md` for modernization output, root markdown is trusted **only** when `.appmod/` exists **or** the file's first line is the provenance marker `<!-- appmod-cockpit -->`.
- Stack detection (build tool, Java version, framework, container) is parsed from `pom.xml` / Gradle / Dockerfile and drives which tasks are shown.

## Agent-callable actions

| Action | Description |
|---|---|
| `get_state` | Return the current modernization snapshot scanned from the repo (assessment, plan/progress, gates, tasks). |
| `refresh` | Re-scan the repo and push a fresh snapshot to the open canvas. |

## Development

The grounding/parsing logic is pure and unit-tested independently of the canvas runtime:

```bash
node --test test/cockpit.test.mjs
```

## License

MIT
