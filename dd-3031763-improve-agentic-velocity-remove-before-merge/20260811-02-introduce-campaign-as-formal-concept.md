# Introduce campaign as a formal shepherd-task concept

Implement this plan autonomously in the current `awesome-copilot` repository. Make the code changes, update directly related documentation and tests, run validation, and fix failures. Do not merely describe an implementation.

## Goal

Formalize a durable shepherd-task **campaign** that can span multiple failed, resumed, or intentionally partitioned invocations of `shepherd-task-given-list`.

Add Bash and PowerShell campaign-initialization scripts, make the campaign manifest authoritative, and update every script under `plugins/shepherd-task/` to use the new directory and terminology contracts consistently.

There is no backward-compatibility requirement. Reject legacy invocations and legacy directory layouts rather than inferring or adopting them.

This change establishes campaign identity and directory structure. It initializes the campaign lessons file but does **not** yet implement lesson production, curation, or consumption by Copilot Coding Agent.

## Domain terminology

Use these terms consistently in code, help, errors, tests, diagrams, and documentation.

### Campaign

One durable, ordered engineering effort over a set of not-necessarily already-created issues sharing one GitHub repository and one non-`main` campaign base branch. A campaign can contain one or more `shepherd-task-given-list` runs, including retries over the uncompleted subset. A campaign has exactly one campaign ID.

### Campaign ID

A lowercase canonical UUID/GUID with hyphens, minted exactly once when the campaign is initialized. It remains unchanged for the entire campaign.

Canonical format:

```text
xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
```

Accept any valid canonical UUID when reading a manifest, but generate UUID version 4.

### Campaign metadata directory

A repository-root-relative, repository-visible directory with this exact basename:

```text
<campaign-issue-number>-<campaign-shortname>-remove-before-merge
```

Constraints:

- `campaign-issue-number` is a positive decimal GitHub issue number without `#`.
- `campaign-shortname` is lowercase ASCII kebab-case matching `[a-z0-9]+(?:-[a-z0-9]+)*`.
- `remove-before-merge` is the required literal suffix.
- The directory is created at the Git repository root.
- It contains campaign coordination state and must be removed before the campaign base branch is merged to `main`.

Example:

```text
3031763-improve-agentic-velocity-remove-before-merge
```

### Shepherd-task-given-list run

Exactly one invocation of `shepherd-task-given-list` within a campaign. It operates on an ordered list or remaining subset of campaign issues. A failed invocation followed by a retry constitutes two distinct shepherd-task-given-list runs in the same campaign.

### Shepherd-task-given-list run directory

A direct child of the campaign metadata directory containing artifacts from exactly one shepherd-task-given-list run. Its exact basename is:

```text
shepherd-tasks-<campaign-id>-YYYYMMDD-HHMM
```

Use local time for `YYYYMMDD-HHMM`. If that exact directory already exists, fail clearly; never reuse it or mix artifacts.

### Campaign lessons file

`campaign-lessons.md` in the campaign metadata directory. For this change, initialize it with a concise heading and an explanation that it will contain validated lessons for subsequent issues. Do not implement propagation behavior yet.

## Required directory structure

After initialization and one given-list invocation, the relevant structure is:

```text
<campaign-issue-number>-<campaign-shortname>-remove-before-merge/
├── shepherd-campaign.json
├── campaign-lessons.md
├── ignorance-reduction-plan.md
├── prompts/
│   └── shepherd-task-20-YYYYMMDD-HHMM/
│       ├── <generated stage-20 prompt and invocation script>
│       ├── <stage-20 JSON, share, and OTel logs>
│       ├── issue-bodies/
│       └── creation-ledger.json
├── spikes/
├── supporting-artifacts/
└── shepherd-tasks-<campaign-id>-YYYYMMDD-HHMM/
    ├── shepherd-task-given-list-run.json
    ├── phase1-task-*.md
    ├── phase1-task-*.json
    ├── phase1-otel-*.jsonl
    ├── phase2-task-*.md
    ├── phase2-task-*.json
    ├── phase2-otel-*.jsonl
    ├── post-mortem-session-*.md
    ├── post-mortem-session-*.json
    └── *-post-mortem.md
```

Do not create empty placeholder directories merely to match this illustration; Git does not persist them. Create directories only when a script needs them. The exact ignorance-reduction-plan filename remains a stage-10/stage-20 input; `ignorance-reduction-plan.md` above identifies its role rather than mandating that literal filename.

## Authoritative campaign manifest

The initializer must atomically write:

```text
<campaign-metadata-directory>/shepherd-campaign.json
```

Use this schema and property naming:

```json
{
  "schemaVersion": 1,
  "campaignId": "9b3ce2cd-1c5e-4de8-b8bd-d273cd8db952",
  "campaignIssueNumber": 3031763,
  "campaignShortname": "improve-agentic-velocity",
  "repository": "owner/repo",
  "baseBranch": "owner/topic-branch",
  "campaignMetadataDirectory": "3031763-improve-agentic-velocity-remove-before-merge",
  "lessonsFile": "campaign-lessons.md",
  "createdAt": "2026-08-11T22:35:00Z"
}
```

Rules:

- `schemaVersion` must equal numeric `1`.
- `campaignId` must be a canonical UUID.
- `campaignIssueNumber` must be a positive integer.
- `campaignShortname`, `repository`, and `baseBranch` must pass the validations below.
- `campaignMetadataDirectory` must be the repo-relative basename computed from the issue number and shortname, and it must match the actual directory basename.
- `lessonsFile` must equal the literal `campaign-lessons.md`.
- `createdAt` must be UTC ISO 8601.
- Unknown future properties may be tolerated when reading, but all required properties must exist with correct types and values.
- The manifest is authoritative for campaign ID, repository, and base branch. Downstream scripts must not ask callers to repeat repository or base branch.
- Missing, malformed, unsupported, path-inconsistent, or internally inconsistent manifests are hard failures.
- Never silently repair, replace, or regenerate an existing manifest.

## Shepherd-task-given-list run manifest

Each given-list invocation must atomically create this file before the first task starts:

```text
<run-directory>/shepherd-task-given-list-run.json
```

Initial content:

```json
{
  "schemaVersion": 1,
  "campaignId": "9b3ce2cd-1c5e-4de8-b8bd-d273cd8db952",
  "campaignMetadataDirectory": "3031763-improve-agentic-velocity-remove-before-merge",
  "repository": "owner/repo",
  "baseBranch": "owner/topic-branch",
  "taskIssues": [101, 102, 103],
  "startedAt": "2026-08-11T22:45:00Z",
  "completedAt": null,
  "exitCode": null,
  "status": "running"
}
```

In the Bash `EXIT` path and PowerShell `finally` path, update it atomically after the post-mortem attempt:

- Successful run: `status: "succeeded"`, `exitCode: 0`.
- Failed or interrupted run reaching cleanup: `status: "failed"`, actual nonzero `exitCode`.
- Set `completedAt` to UTC ISO 8601.

Do not turn a shepherding failure into success if post-mortem generation or run-manifest finalization fails. Preserve the original nonzero exit code. If shepherding succeeded but required finalization cannot be persisted, return nonzero and report the failure explicitly.

## Shared campaign-contract helpers

Avoid independent, drifting manifest validators in every entry point. Add paired internal helpers under `plugins/shepherd-task/scripts/`, for example:

```text
shepherd-task-campaign-common.sh
shepherd-task-campaign-common.ps1
```

They should provide equivalent Bash/PowerShell operations for:

- locating the Git repository root;
- resolving a supplied campaign metadata directory safely;
- proving it is inside the repository root;
- loading and validating `shepherd-campaign.json`;
- exposing campaign ID, repository, base branch, issue number, shortname, and canonical relative directory;
- validating a shepherd-task-given-list run directory as a direct child of the campaign metadata directory;
- validating its basename against the campaign ID and timestamp format;
- atomically writing JSON state.

Implementation requirements:

- Bash may use the system's existing `jq` requirement for JSON construction and validation.
- PowerShell must use built-in JSON support.
- Quote all paths and values.
- Do not use `eval`.
- Do not permit `..`, symlink resolution, or absolute-path tricks to escape the repository root.
- A PowerShell helper intended for dot-sourcing must not have a script-level `param()` block or execute work merely because it was loaded.
- Keep validation behavior and error meaning equivalent across platforms.

## 1. Add campaign initialization scripts

Create:

```text
plugins/shepherd-task/scripts/shepherd-task-init-campaign.sh
plugins/shepherd-task/scripts/shepherd-task-init-campaign.ps1
```

### Interface

Bash:

```text
shepherd-task-init-campaign.sh <CAMPAIGN_ISSUE_NUMBER> <CAMPAIGN_SHORTNAME> <BASE_BRANCH> <REPO>
```

PowerShell:

```text
shepherd-task-init-campaign.ps1 <CAMPAIGN_ISSUE_NUMBER> <CAMPAIGN_SHORTNAME> <BASE_BRANCH> <REPO>
```

Use positional parameters in the same order and idiomatic named PowerShell parameters.

### Validation

Before creating anything:

- Require execution inside a Git worktree.
- Resolve the repository root and create the campaign directory there, regardless of the caller's current subdirectory.
- Require a positive campaign issue number.
- Require the shortname format defined above.
- Require `REPO` in `OWNER/REPO` format.
- Require a syntactically valid Git branch name.
- Reject `main`.
- Require the current checked-out branch to equal `BASE_BRANCH`; do not write campaign state onto another branch.
- Require the computed campaign metadata directory not to exist.
- Require `shepherd-campaign.json` and `campaign-lessons.md` not to exist through any alias or conflicting path.
- Preflight all platform dependencies before creating the directory.

Use a standard platform UUID v4 facility. Bash may require `uuidgen`; fail with a clear installation message if unavailable. PowerShell should use `[guid]::NewGuid()`. Normalize generated IDs to lowercase canonical form.

### Creation behavior

- Create the campaign metadata directory without `mkdir -p`/`-Force` semantics that would accept an existing directory.
- Write the manifest through a temporary file in the target directory and atomically rename it.
- Write `campaign-lessons.md` atomically with concise content similar to:

  ```markdown
  # Campaign lessons

  This file contains validated, reusable lessons for subsequent issues in this campaign.
  The issue specification and repository instructions remain authoritative.
  ```

- If initialization fails after directory creation, clean up only files and the exact newly created directory from this invocation. Never delete a pre-existing directory.
- Do not commit, push, create issues, or invoke Copilot.
- Print the absolute campaign metadata directory, repo-relative directory, campaign ID, repository, and base branch.

No adoption, upgrade, inference, or legacy mode is permitted.

## 2. Change `shepherd-task-given-list` into a campaign consumer

Update both:

```text
plugins/shepherd-task/scripts/shepherd-task-given-list.sh
plugins/shepherd-task/scripts/shepherd-task-given-list.ps1
```

### New interface

Bash:

```text
shepherd-task-given-list.sh <TASK_ISSUES> <CAMPAIGN_METADATA_DIRECTORY>
```

PowerShell:

```text
shepherd-task-given-list.ps1 <TASK_ISSUES> <CAMPAIGN_METADATA_DIRECTORY>
```

Remove `BASE_BRANCH` and `REPO` caller inputs completely. Load them from the validated campaign manifest.

### Required behavior

- Preserve validation of the comma-separated ordered positive issue list.
- Validate the campaign before creating a run directory.
- Create the run directory as a direct child of the campaign metadata directory using the exact required name.
- Fail if the same-minute path already exists.
- Create the run manifest before invoking `shepherd-task`.
- Pass the campaign metadata directory and run directory explicitly to each single-task invocation.
- Include the campaign ID and campaign metadata directory in status output.
- Preserve serialized, fail-fast task execution.
- Preserve mandatory redaction and best-effort post-mortem invocation.
- Supply the post-mortem prompt with `SHEPHERD_LOG_DIR`, `SCRIPT_EXIT_CODE`, `TASK_ISSUES`, `BASE_BRANCH`, and `REPO` as today, plus explicit `CAMPAIGN_ID` and `CAMPAIGN_METADATA_DIRECTORY` context. Do not require the stage-50 skill to mutate campaign state.
- Finalize the run manifest according to the rules above.
- Ensure Bash trap handling retains the original exit code and does not recursively invoke cleanup.
- Ensure PowerShell catches both child-process nonzero exits and terminating exceptions.

## 3. Make the single-task orchestrators consume campaign/run context

Update:

```text
plugins/shepherd-task/scripts/shepherd-task.sh
plugins/shepherd-task/scripts/shepherd-task.ps1
```

### New internal interface

Bash:

```text
shepherd-task.sh <TASK_ISSUE> <CAMPAIGN_METADATA_DIRECTORY> <SHEPHERD_TASK_GIVEN_LIST_RUN_DIRECTORY>
```

PowerShell:

```text
shepherd-task.ps1 <TASK_ISSUE> <CAMPAIGN_METADATA_DIRECTORY> <SHEPHERD_TASK_GIVEN_LIST_RUN_DIRECTORY>
```

Requirements:

- Remove caller-supplied `BASE_BRANCH`, `REPO`, and optional/default log-directory behavior.
- Require and validate both directories.
- Derive repository, base branch, and campaign ID from the campaign manifest.
- Confirm the run manifest belongs to the same campaign and includes the current task issue.
- Never create a run directory itself.
- Continue writing phase share, JSON, and OTel files directly into the supplied run directory.
- Include `CAMPAIGN_ID` and `CAMPAIGN_METADATA_DIRECTORY` as context in both stage-30 and stage-40 Copilot prompts, without adding lesson behavior in this change.
- Preserve all existing PR discovery, idempotent phase skipping, CI checks, review checks, merge verification, issue closure, redaction, and exit semantics.

## 4. Update the monitor scripts

Update:

```text
plugins/shepherd-task/scripts/shepherd-task-monitor.sh
plugins/shepherd-task/scripts/shepherd-task-monitor.ps1
```

New interfaces:

```text
shepherd-task-monitor.sh <SHEPHERD_TASK_GIVEN_LIST_RUN_DIRECTORY> [POLL_INTERVAL]
shepherd-task-monitor.ps1 <SHEPHERD_TASK_GIVEN_LIST_RUN_DIRECTORY> [POLL_INTERVAL]
```

- Remove the redundant repository argument.
- Validate the run directory and campaign manifest.
- Derive repository and campaign information from validated state.
- Display campaign ID, campaign metadata directory, and given-list run directory.
- Preserve existing file watching, GitHub polling, stale detection, and status behavior.
- Update help and examples to use the formal terms.

## 5. Update stage-20 interview scripts

Update:

```text
plugins/shepherd-task/scripts/shepherd-task-interview-user-to-create-issues.sh
plugins/shepherd-task/scripts/shepherd-task-interview-user-to-create-issues.ps1
```

Require the campaign metadata directory as the only command-line campaign argument:

```text
shepherd-task-interview-user-to-create-issues.sh <CAMPAIGN_METADATA_DIRECTORY>
shepherd-task-interview-user-to-create-issues.ps1 <CAMPAIGN_METADATA_DIRECTORY>
```

Behavior:

- Validate the campaign manifest first.
- Derive `REPO`, `BASE_BRANCH`, `PARENT_ISSUE`, and `PLAN_DIRECTORY` from it:
  - `PARENT_ISSUE` is `campaignIssueNumber`.
  - `PLAN_DIRECTORY` is `campaignMetadataDirectory`.
- Do not ask the user to re-enter those four values.
- Continue interviewing for the remaining stage-20 inputs.
- Store the generated prompt, generated invocation script, stage-20 JSON/share/OTel logs, issue bodies, and creation ledger within a uniquely named stage-20 artifact directory under the agreed `prompts/` directory:

  ```text
  <campaign-metadata-directory>/prompts/shepherd-task-20-YYYYMMDD-HHMM
  ```

- Do not create another top-level campaign artifact directory for stage 20.
- Fail rather than reuse an existing same-minute stage-20 artifact directory.
- Pass that directory as stage 20's `LOG_DIRECTORY`.
- Include `CAMPAIGN_ID` as additional prompt context, but preserve all inputs required by the current stage-20 skill.
- Preserve redaction and Bash/PowerShell parity.

## 6. Update generic inspection and redaction scripts

Review all of these:

```text
redact-secrets.sh
redact-secrets.ps1
shepherd-task-inspect-json.sh
shepherd-task-inspect-json.ps1
shepherd-task-inspect-otel-token-summary.sh
shepherd-task-inspect-otel-token-summary.ps1
```

Their generic file/directory behavior need not change. Update terminology, usage examples, and comments that imply run directories live in the current working directory or use the old `shepherd-tasks-YYYYMMDD-HHMM` format.

Do not weaken recursive redaction or change redaction rules unnecessarily.

## 7. Update installation and uninstallation

Review and update:

```text
install-task-shepherd.sh
install-task-shepherd.ps1
uninstall-task-shepherd.sh
uninstall-task-shepherd.ps1
```

- The existing plugin copy should install the new initializer and shared helpers.
- Extend installation verification to prove both initializer scripts, both shared campaign helpers, and both redactors were installed.
- Print the installed initializer paths in completion output.
- Uninstallation removes installed plugin files as today.
- Uninstallation must never discover or remove campaign metadata directories or run directories from repositories.
- Preserve skill installation/removal behavior.

## 8. Update every remaining script and test descendant

Search every file under `plugins/shepherd-task/`, including `test/`, for:

- old given-list argument order;
- separate repository/base-branch inputs where the manifest should be authoritative;
- `shepherd-tasks-YYYYMMDD-HHMM`;
- run directories created in the current working directory;
- informal `remove-before-merge`, `RBM`, `PLAN_DIRECTORY`, log-directory, campaign, and run terminology.

Update both test scripts to exercise the formal model:

- `01-prepare-base-branch.ps1` must stop manually inventing an RBM directory. Arrange its workflow so a real campaign issue number is available, invoke `shepherd-task-init-campaign.ps1`, then write the plan inside the initialized campaign metadata directory.
- `02-create-issues.ps1` must load the campaign manifest rather than re-derive the directory from the branch slug. It should use the manifest's campaign issue as the parent and create only the ordered child issues needed by the scenario.
- Update parameters and examples accordingly.
- Preserve the tests' intended remote side effects and make those side effects explicit in their help.

Do not leave a second implementation of campaign directory naming in tests.

## 9. Update documentation and diagrams

Update directly related files under `plugins/shepherd-task/`, especially:

```text
README.md
figure-01-shepherd-task-given-list.md
figure-02-shepherd-task.md
figure-05-post-mortem.md
plugin.json
```

The plugin manifest may not need structural changes, but inspect it and update its description or version only if repository conventions require that for this feature.

Documentation must:

- define all terms from this plan;
- show the one-campaign-to-many-given-list-runs relationship;
- document initialization before stage 10;
- show exact Bash and PowerShell initialization and given-list examples;
- show the manifest and directory schemas;
- state that the campaign metadata directory is temporary repository-visible state removed before merge to `main`;
- distinguish campaign metadata from a given-list run directory;
- state that logs are redacted but still require review before commit;
- remove old examples that create `shepherd-tasks-YYYYMMDD-HHMM` in the current directory;
- explain strict rejection of legacy layouts;
- identify `campaign-lessons.md` as initialized but not yet propagated by this change.

## Error handling and safety invariants

- Validate completely before creating durable state whenever possible.
- Never use broad success-shaped fallbacks.
- Never silently mint a replacement campaign ID.
- Never infer campaign identity from directory names alone; validate the manifest.
- Never allow repository/base-branch arguments to override the manifest.
- Never reuse an existing initializer, stage-20, or given-list run directory.
- Never recursively delete an unknown or pre-existing path during rollback.
- Preserve log redaction before persistence.
- Keep Bash and PowerShell behavior equivalent.
- Do not introduce compatibility aliases or deprecated invocation paths.
- Do not implement campaign lesson propagation in this change.
- Do not edit files under `dd-3031763-improve-agentic-velocity-remove-before-merge/`, including this prompt.

## Validation

Run the smallest relevant checks while iterating, then complete all of the following:

```bash
bash -n plugins/shepherd-task/scripts/*.sh
npm run plugin:validate
npm run skill:validate
npm run build
bash eng/fix-line-endings.sh
```

If `pwsh` is available, parse every PowerShell file under `plugins/shepherd-task/` without invoking scripts that create branches, GitHub issues, or campaign state.

Add or execute non-destructive contract checks using temporary directories/repositories to prove, for both available platforms:

1. Initializer creates the exact directory, manifest, UUID, and lessons file.
2. Initializer rejects invalid issue numbers, shortnames, `main`, malformed repositories, branch mismatch, and pre-existing directories.
3. Campaign validation rejects malformed JSON, missing fields, incorrect types, invalid UUIDs, mismatched directory names, unsupported schema versions, and paths outside the repo.
4. Given-list run-directory construction includes the campaign ID and timestamp and rejects collisions.
5. Run-manifest task issues are numeric JSON values in original order.
6. Single-task and monitor validation reject a run directory belonging to another campaign.
7. Paths containing spaces remain functional.

Do not invoke live `copilot --yolo`, assign real issues, or run the destructive integration test scenario merely for validation.

After build and line-ending normalization, rerun syntax, plugin, and skill validation. Then inspect:

```bash
git status --short
git diff --check
```

Use exhaustive searches to ensure no active script, help text, diagram, or README example still documents:

```text
shepherd-task-given-list <TASK_ISSUES> <BASE_BRANCH> <REPO>
shepherd-tasks-YYYYMMDD-HHMM
```

References in historical bundled examples outside `plugins/shepherd-task/` are out of scope unless changed code or generated documentation points to them.

## Completion criteria

The work is complete only when:

- both initializer scripts and shared helpers exist and have platform parity;
- one immutable campaign ID is persisted before planning or issue creation;
- all orchestration inputs derive repository/base branch from the campaign manifest;
- each given-list invocation creates exactly one correctly nested run directory and lifecycle manifest;
- all scripts and tests under `plugins/shepherd-task/` use the formal concepts consistently;
- direct documentation and diagrams match executable behavior;
- validation passes;
- the final report lists changed interfaces, schema decisions, tests performed, and any unavailable platform validation.
