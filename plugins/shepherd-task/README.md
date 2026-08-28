# Shepherd Task

`shepherd-task` runs an ordered engineering campaign through GitHub issues within the scope of a single GitHub repository. It uses GitHub Copilot Coding Agent (CCA) for implementation, Copilot code review for review findings, local Copilot CLI sessions for orchestration and review fixes, and `gh` for authoritative GitHub state. The campaign has several ordered "stages". The numbered lifecycle starts at stage 00 and leaves gaps between stages to allow for future stages as necessary. See [Stages](#stages).

The unit of coordination is an issue in the GitHub issue tracker. Each implementation issue produces a PR against one non-`main` campaign base branch. Issues run serially so every merged PR becomes the starting point for the next issue.

## System model

### Actors

| Actor | Responsibility |
|---|---|
| Human campaign owner | Creates the campaign issue and base branch, resolves research questions, starts runs, handles manual failures, and eventually opens the campaign-base-to-`main` PR |
| Local orchestration scripts | Invoked by the human campaign owner. Ideally invoked on in an environment that can run for days, such as a [Microsoft Dev Box](https://devbox.microsoft.com/). Validate campaign state, create run artifacts, invoke Copilot CLI, and independently verify PR/issue outcomes |
| Local Copilot CLI | Executes stages 20, 30, 40, and 50 with `copilot --yolo` |
| Copilot Coding Agent (CCA) | Implements an assigned issue on a new branch and opens a draft PR against the campaign base branch |
| Copilot code review | Reviews each ready PR head and creates line-level findings |
| `gh` CLI | Supplies authoritative issue, PR, review, workflow, and merge state |

### Campaign

A campaign is one ordered body of work in one repository against one non-`main`
base branch. It has:

- one open parent campaign issue;
- one immutable campaign UUID;
- one campaign metadata directory at the repository root;
- one `shepherd-campaign.json`;
- one `campaign-lessons.md`;
- zero or one ignorance-reduction plan;
- ordered child implementation issues;
- one or more `shepherd-task-25-given-list` runs.

The campaign metadata directory name is:

```text
<campaign-issue-number>-<campaign-shortname>-remove-before-merge
```

The directory is intentionally repository-visible temporary state. Task PRs
merge it into the campaign base branch. Remove it before the final campaign PR
is merged to `main`.

### Stages

| Stage      | Skill                                              | Script                                            | Result |
|------------|----------------------------------------------------|---------------------------------------------------|--------|
| 00         |                                                    | `shepherd-task-00-init-campaign`                  | Creates the campaign manifest and lessons file |
| 10         | `shepherd-task-10-create-ignorance-reduction-plan` |                                                   | Creates a plan whose research questions have empty `Resolution` blocks |
| Human gate |                                                    |                                                   | Human + Copilot research/spikes fill every implementation-gating `Resolution` block in the ignorance reduction plan |
| 15         |                                                    | `shepherd-task-15-prepare-create-issues`          | Derives stage-20 inputs and generates a prompt plus invocation script |
| 20         | `shepherd-task-20-create-issues-from-plan`         |                                                   | Creates and orders the implementation child issues |
| 25         |                                                    | `shepherd-task-25-given-list`                     | Runs selected child issues serially and always invokes stage 50 |
| 30         | `shepherd-task-30-from-assignment-to-ready`        |                                                   | Produces a verified draft PR immediately before Ready for review                     |
| 40         | `shepherd-task-40-from-ready-to-merged-to-base`    |                                                   | Reviews, fixes, publishes lessons, and merges the PR to the campaign base            |
| 50         | `shepherd-task-50-create-post-mortem`              |                                                   | Writes an evidence-based report for the given-list run                               |

Stages 10 and 20 are optional only when suitable implementation issues already
exist. Stage 00 campaign initialization is still required because stages 30, 40, and 50
consume campaign identity and lesson-mode metadata. In `campaign` lesson mode,
pre-existing child issues must also contain the required campaign-lessons
instructions expected by stage 30.

## Prerequisites

- Work in a local checkout of the campaign repository.
- Check out the exact non-`main` campaign base branch before stage 00 initialization.
- Enable and configure Copilot Coding Agent and Copilot code review in the
  repository.
- Authenticate `gh` with issue, PR, review, Actions, and push permissions.
- Authenticate the `copilot` CLI and accept that orchestration uses
  `copilot --yolo`.
- Install `git`, `jq`, and `uuidgen`; PowerShell users need PowerShell 7.
- Provide a local environment capable of running every gating command named in
  the child issues.
- Configure a Git remote whose GitHub URL exactly matches the repository in the
  campaign manifest. Stages 15 and 40 require exactly one match when a remote is
  not supplied explicitly. The remote may be named `origin`, `upstream`, or
  anything else.
- Use a repository with substantive CI for the changed component. Selector or
  aggregator checks alone cannot satisfy stage 30.
- Keep the campaign base branch different from the repository default branch
  and from `main`.

## Installation

From a checkout of this repository, the bundled installer copies the plugin to
`$COPILOT_HOME/plugins/shepherd-task` (default `~/.copilot`) and installs all
six shepherd skills that are not already present:

```bash
./plugins/shepherd-task/scripts/install-task-shepherd.sh
```

```powershell
.\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

The scripts can also be run directly from this checkout.

To remove the installed plugin and shepherd skills without touching campaign
directories:

```bash
./plugins/shepherd-task/scripts/uninstall-task-shepherd.sh
```

```powershell
.\plugins\shepherd-task\scripts\uninstall-task-shepherd.ps1
```

## End-to-end campaign procedure

### 1. Create the parent issue and campaign base branch

Create one parent campaign issue in GitHub. Create and check out the non-`main`
base branch from the commit on which all task work should build.

### 2. Run stage 00: initialize campaign metadata

Bash:

```bash
./plugins/shepherd-task/scripts/shepherd-task-00-init-campaign.sh \
  <campaign-issue-number> \
  <campaign-shortname> \
  <base-branch> \
  <owner/repo> \
  <off|campaign>
```

PowerShell:

```powershell
.\plugins\shepherd-task\scripts\shepherd-task-00-init-campaign.ps1 `
  -CampaignIssueNumber <campaign-issue-number> `
  -CampaignShortname <campaign-shortname> `
  -BaseBranch <base-branch> `
  -Repo <owner/repo> `
  -LessonPropagation <off|campaign>
```

Stage 00 requires the checked-out branch to equal `BaseBranch`. It
creates a new directory, mints a UUIDv4, and atomically writes
`shepherd-campaign.json` and `campaign-lessons.md`. It does not commit, push,
create issues, or invoke Copilot. Commit and push the initialized campaign state
to the campaign base branch.

### 3. Create and resolve the plan when issues do not exist

Invoke `shepherd-task-10-create-ignorance-reduction-plan` with:

- `FILENAME`: a path inside the campaign directory whose basename ends with
  `ignorance-reduction-plan.md`;
- `CONTEXT`: the loaded campaign context.

The plan must contain exactly one level-two heading with `Ignorance reduction`
and exactly one level-two heading with `Implementation`. Direct implementation
tasks are level-three headings below the implementation heading.

Stage 10 intentionally leaves `Resolution` blocks empty. Resolve every
implementation-gating question before stage 20. Spikes may inform the
resolutions, but spike source code remains research material rather than
production source.

### 4. Run stage 15, then execute stage 20

Bash:

```bash
./plugins/shepherd-task/scripts/shepherd-task-15-prepare-create-issues.sh \
  <campaign-metadata-directory>
```

PowerShell:

```powershell
.\plugins\shepherd-task\scripts\shepherd-task-15-prepare-create-issues.ps1 `
  -CampaignMetadataDirectory <campaign-metadata-directory>
```

Stage 15 preparation is non-interactive. It derives:

- the single `*ignorance-reduction-plan.md`;
- the unique ignorance-reduction and implementation headings;
- the count of direct implementation tasks;
- the single Git remote matching the manifest repository;
- the campaign-owned repository, branch, issue, UUID, and lesson mode.

Ambiguity is a hard failure. The command creates:

```text
<campaign-directory>/prompts/shepherd-task-20-YYYYMMDD-HHMM/
├── YYYYMMDD-HHMM-invoke-shepherd-task-20-create-issues-from-plan-skill.md
└── YYYYMMDD-HHMM-invoke-shepherd-task-20-create-issues-from-plan-skill.(sh|ps1)
```

Run the generated invocation script. Stage 20 validates the plan and campaign,
studies its bundled issue examples, drafts all child bodies, and persists them
before creating anything. It prefers an enabled organization issue type named
`Task`; otherwise it creates ordinary untyped issues.

Stage 20 creates and links issues one at a time and records every result in
`creation-ledger.json`. It is deliberately one-shot, not resumable. On partial
failure it stops, reconciles the ledger, prints deletion commands, and requires
manual cleanup before another invocation.

### 5. Run stage 25 with an ordered issue list

Bash:

```bash
./plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh \
  --lesson-propagation=<off|campaign> \
  "<issue-number>,<issue-number>" \
  <campaign-metadata-directory>
```

PowerShell:

```powershell
.\plugins\shepherd-task\scripts\shepherd-task-25-given-list.ps1 `
  -LessonPropagation <off|campaign> `
  -TaskIssues "<issue-number>,<issue-number>" `
  -CampaignMetadataDirectory <campaign-metadata-directory>
```

The requested lesson mode must exactly match the immutable manifest mode. The
stage 25 script creates one run directory and run manifest, then invokes
`shepherd-task` for each issue in order. It stops at the first failed issue.
Start a later given-list run with the remaining issue subset after correcting
the failure.

See:

- [Figure 01 — stage 25 given-list batch orchestration](figure-01-shepherd-task-25-given-list.md)
- [Figure 02 — one-issue orchestration](figure-02-shepherd-task.md)
- [Figure 03 — stage 30, assignment to ready boundary](figure-03-from-assigned-to-ready.md)
- [Figure 04 — stage 40, ready boundary to merged](figure-04-from-ready-to-merged.md)
- [Figure 05 — stage 50 post-mortem](figure-05-post-mortem.md)

### 6. Monitor an active run when needed

In another terminal:

```bash
./plugins/shepherd-task/scripts/shepherd-task-monitor.sh \
  <given-list-run-directory> \
  <owner/repo> \
  [poll-seconds]
```

The monitor watches new phase artifacts, discovers linked PRs, reports draft,
review, CI, and merge state, and warns after 20 minutes without file activity.
It does not control or resume the run.

### 7. Finish the campaign

After all task PRs merge into the campaign base branch:

1. Review the stage-50 reports and campaign lessons.
2. Remove the campaign metadata directory.
3. Commit and push the cleanup.
4. Open the final PR from the campaign base branch to `main`.
5. Apply normal human review and repository merge policy.

## Lesson propagation

The mode is chosen once during stage 00 initialization and is immutable for the campaign.

### `off`

- `campaign-lessons.md` still exists because the campaign schema requires it.
- Stage-20 issue bodies omit lesson consumption and production instructions.
- Stages 30 and 40 must not read or modify campaign lessons.

### `campaign`

1. Stage 20 tells every child issue to read only previously validated lessons.
2. CCA adds `Candidate lessons for issue #N` to `campaign-lessons.md`.
3. Stage 30 refuses readiness unless the current PR preserves earlier lessons
   and contains a substantive candidate section for the issue.
4. Stage 40 combines the candidate with implementation, tests, CI failures,
   corrective commits, and review findings.
5. Stage 40 replaces the candidate with one validated section or an explicit
   `No reusable lessons identified` result.
6. The lesson-only commit is pushed, CI is rerun, and Copilot review is
   requested again for that new head.
7. The PR and validated lessons merge atomically into the campaign base branch.
8. The next serial issue reads the newly validated lessons.

Validated entries contain applicability, actionable guidance, evidence, source,
and confidence. Raw reasoning, secrets, complete trajectories, speculation,
and issue-local facts are rejected.

## Stage 30 readiness boundary

Stage 30 assigns CCA through the REST API using
`agent_assignment.base_branch`; plain assignee editing is not sufficient. It
then finds the draft PR, waits for the latest CCA work cycle, and validates one
unchanged PR head.

The same head must satisfy all of these conditions:

- the PR is open, draft, linked to the issue, and targets the campaign base;
- the latest `copilot_work_finished` is not older than the latest
  `copilot_work_started`;
- the PR has an effective nonempty diff;
- every issue deliverable and acceptance criterion has concrete evidence;
- every issue-specified gating command passes against that head;
- relevant substantive CI passes; selector-only success is insufficient;
- no unresolved review thread, requested change, or actionable bot comment
  remains;
- in `campaign` mode, the candidate lesson section exists and earlier validated
  lessons remain intact.

Failures lead to a request-changes loop with CCA. A new head invalidates all
previous evidence. The shared limit is 20 correction iterations. Stage 30 stops
immediately before marking the PR Ready for review.

## Stage 40 review and merge boundary

Stage 40:

1. marks the draft PR ready;
2. captures the target head and previous Copilot review ID;
3. requests reviewer `Copilot` and requires positive acknowledgement;
4. waits for a new Copilot review tied to the target head;
5. refuses to merge if Copilot reports that the PR exceeds its file limit;
6. gathers unresolved top-level findings from that review;
7. creates a sibling worktree and fixes meritorious findings locally;
8. pushes fixes, replies with commit evidence, and resolves threads;
9. waits for CI and requests another acknowledged review for each new head;
10. repeats for at most eight review rounds;
11. publishes and re-reviews campaign lessons when lesson mode is `campaign`;
12. verifies final CI, review, lesson, base-branch, and merge conditions;
13. handles base-branch conflicts with a local rebase and
    `--force-with-lease`;
14. merges with `gh pr merge --merge --delete-branch`;
15. closes the task issue.

Review fixes are made by the local Copilot CLI, not by CCA. A review body heading
or a textual “comments generated” count is not authoritative; stage 40 uses
review IDs, commit IDs, review comments, and GraphQL thread state.

## Workflow approval helper

`shepherd-task-approve-workflows-and-wait-for-completion` finds branch runs with
`action_required`, reruns them with `gh run rerun`, and blocks on
`gh pr checks --watch --fail-fast`. No pending approval is a successful no-op.
The stages use blocking waits so the Copilot CLI session does not go idle while
GitHub work is still running.

## Campaign manifest

`shepherd-campaign.json` is the authoritative durable campaign identity:

```json
{
  "schemaVersion": 1,
  "campaignId": "12345678-1234-4234-8234-123456789abc",
  "campaignIssueNumber": 123,
  "campaignShortname": "example-campaign",
  "repository": "owner/repo",
  "baseBranch": "owner/example-campaign",
  "lessonPropagation": "campaign",
  "campaignMetadataDirectory": "123-example-campaign-remove-before-merge",
  "lessonsFile": "campaign-lessons.md",
  "createdAt": "2026-08-26T20:00:00Z"
}
```

Downstream scripts derive repository, base branch, campaign UUID, and lesson
mode from this file. They reject missing, malformed, or path-inconsistent
campaign state.

## Given-list run manifest

Every given-list invocation creates
`shepherd-task-25-given-list-run.json`:

```json
{
  "schemaVersion": 1,
  "campaignId": "12345678-1234-4234-8234-123456789abc",
  "campaignMetadataDirectory": "123-example-campaign-remove-before-merge",
  "repository": "owner/repo",
  "baseBranch": "owner/example-campaign",
  "lessonPropagation": "campaign",
  "taskIssues": [201, 202],
  "startedAt": "2026-08-26T20:10:00Z",
  "completedAt": null,
  "exitCode": null,
  "status": "running"
}
```

The exit trap/finally block changes `completedAt`, `exitCode`, and `status` to
the final observed result.

## Artifact layout

```text
123-example-campaign-remove-before-merge/
├── shepherd-campaign.json
├── campaign-lessons.md
├── example-ignorance-reduction-plan.md
├── prompts/
│   └── shepherd-task-20-YYYYMMDD-HHMM/
│       ├── ...create-issues-from-plan-skill.md
│       ├── ...create-issues-from-plan-skill.(sh|ps1)
│       ├── creation-ledger.json
│       ├── issue-bodies/
│       ├── create-issues-session-....json
│       ├── create-issues-session-....md
│       └── create-issues-otel-....jsonl
└── shepherd-tasks-CAMPAIGN-UUID-YYYYMMDD-HHMM/
    ├── shepherd-task-25-given-list-run.json
    ├── phase1-task-....json
    ├── phase1-task-....md
    ├── phase1-otel-....jsonl
    ├── phase2-task-....json
    ├── phase2-task-....md
    ├── phase2-otel-....jsonl
    ├── post-mortem-session-....json
    ├── post-mortem-session-....md
    └── ...-post-mortem.md
```

Each given-list invocation has its own run directory. A campaign may have
multiple run directories because of retries or intentional issue batching.

## Post-mortem behavior

The given-list exit path invokes stage 50 after success or failure. Stage 50
receives the original exit code, reads the still-running run manifest,
phase JSON/session shares, and campaign context, calculates task timings,
review rounds, failures, idle markers, and available token usage, then writes
an eight-section Markdown report into the run directory. The caller finalizes
the run manifest after the post-mortem attempt. Post-mortem failure produces a
warning but does not replace the original run exit code.

## Logs, telemetry, and redaction

- Phase and post-mortem JSON output is passed through the JSON redactor.
- OTel JSONL files capture input/output token data when available.
- The run directory is rescanned for `.json*` files after sessions complete.
- The redactor replaces credential-like keys, content-bearing event fields,
  known token patterns, and high-entropy base64-like strings.
- Markdown session shares are not processed by the JSON redactor.
- An interrupted run may not have completed its final scan.

Treat every artifact directory as sensitive. Run the redactor again and inspect
all JSON, JSONL, and Markdown before committing campaign artifacts:

```bash
./plugins/shepherd-task/scripts/redact-secrets.sh \
  <given-list-run-directory>
```

Inspection helpers:

```bash
./plugins/shepherd-task/scripts/shepherd-task-inspect-json.sh \
  <session-json-file> [event-count]

./plugins/shepherd-task/scripts/shepherd-task-inspect-otel-token-summary.sh \
  <otel-jsonl-file-or-run-directory>
```

PowerShell equivalents are included for each helper.

## Failure and recovery semantics

- Validation failures stop before creating durable state whenever possible.
- Stage 20 is one-shot. Partial issue creation requires manual deletion using
  the reconciled ledger before retry.
- A given-list run stops on the first failed issue but still runs stage 50 and
  finalizes its manifest.
- Resume a campaign by starting a new given-list run with the remaining issues.
- An existing open linked PR lets single-issue orchestration skip a second CCA
  assignment and continue verification.
- Timeouts, unavailable required tests, skipped relevant CI, unacknowledged
  reviews, review file-limit refusal, exhausted iteration budgets, and
  unresolved merge conflicts require manual intervention.
- No script merges the campaign base branch to `main`.

## File map

| Path | Purpose |
|---|---|
| `scripts/shepherd-task-00-init-campaign.*` | Run stage 00: create durable campaign identity and lesson state |
| `scripts/shepherd-task-15-prepare-create-issues.*` | Run stage 15: derive and generate stage-20 invocation artifacts |
| `scripts/shepherd-task-25-given-list.*` | Run stage 25: create a run and dispatch issues serially |
| `scripts/shepherd-task.*` | Orchestrate stages 30 and 40 for one issue |
| `scripts/resolve-repository-remote.*` | Resolve and validate the unique local Git remote matching the campaign repository |
| `scripts/shepherd-task-monitor.*` | Observe an active run |
| `scripts/redact-secrets.*` | Redact JSON/JSONL artifacts |
| `scripts/shepherd-task-inspect-json.*` | Show meaningful Copilot session events |
| `scripts/shepherd-task-inspect-otel-token-summary.*` | Summarize OTel token usage |
| `scripts/install-task-shepherd.*` | Install plugin and skills into Copilot home |
| `scripts/uninstall-task-shepherd.*` | Remove installed plugin and skills |
| `test/01-prepare-base-branch.ps1` | Create a real test campaign and plan |
| `test/02-create-issues.ps1` | Run real stage-20 issue creation for that campaign |
