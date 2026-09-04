# Clean up the simple-math shepherd-task control driver output

Work autonomously in the current `awesome-copilot` repository. Implement the complete change described below. Do not merely report what should change.

## Objective

Change only the simple-math control experiment driver:

```text
plugins/shepherd-task/test/simple-math/20260904-run-control-experiment.ps1
```

Make its default terminal output teach a human how to use the canonical shepherd-task workflow while hiding successful intermediate implementation output.

The default transcript must emphasize:

1. the ordered shepherd-task lifecycle;
2. which stages are performed by this control experiment;
3. which normal workflow stages are replaced by deterministic simple-math fixture preparation;
4. the exact PowerShell invocation of each canonical shepherd-task script used by the experiment;
5. the current campaign and two-issue execution progress;
6. the durable evidence produced by the run.

Provide opt-in switches for exposing intermediate child-process output. Preserve all current simple-math campaign behavior, repository initialization behavior, side effects, validation, failure semantics, redaction, artifacts, and cleanup policy.

This driver is the faster simple-math counterpart of:

```text
plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/20260904-run-control-experiment.ps1
```

If the Cargo Tracker driver has already received the output-cleanup implementation described by:

```text
dd-3031763-improve-agentic-velocity-remove-before-merge/dd-3060045-clean-up-driver-output-cargotracker-driver.md
```

inspect and reuse its driver-local design where appropriate. Preserve simple-math-specific behavior rather than blindly copying Cargo Tracker assumptions.

## Hard scope boundary

Do not modify any core shepherd-task script or skill.

In particular, do not edit:

```text
plugins/shepherd-task/scripts/**
skills/shepherd-task*/**
```

Do not edit generated stage-20 launchers. Do not change any prompt sent to a shepherd-task skill. Do not change any Markdown, JSONL, OTel, handoff, run-manifest, lesson, summary, or post-mortem format.

Do not change the simple-math fixture scripts unless a pre-existing non-destructive contract test must be updated to assert the driver behavior. Prefer changing only the driver and the smallest directly related contract test.

Do not apply this output design to the Cargo Tracker driver, treatment/control drivers, Bash scripts, or other experiment drivers in this change. If the Cargo Tracker driver already contains analogous helpers, duplication inside this one test driver is acceptable; do not extract shared production infrastructure as part of this task.

## Simple-math facts that must remain unchanged

The implementation must preserve these domain-specific facts:

- The driver operates against a fresh disposable GitHub repository.
- If the cloned repository is empty, the driver creates and pushes the initial `README.md` commit.
- The fixture creates an immutable simple-math baseline.
- The control campaign shortname is `math-control`.
- The campaign base branch is `experiment/shepherd-control`.
- Lesson propagation is `off`.
- The resolved plan is `math-tool-ignorance-reduction-plan.md`.
- The campaign contains exactly two ordered implementation issues.
- `Get-CampaignHandoff` must continue requiring exactly two positive issue numbers.
- The simple-math fixture and verification contracts remain authoritative for domain behavior.
- All worktrees, branches, issues, pull requests, and evidence remain preserved after success or failure.

Do not introduce Cargo Tracker-specific paths, branch names, fixed baseline SHAs, Maven behavior, five-task assumptions, or arrival-deadline terminology.

## Canonical workflow to teach

The default output must accurately teach this lifecycle:

1. **Stage 00 — initialize campaign**
   - Script: `shepherd-task-00-init-campaign.ps1`
2. **Stage 10 — create ignorance-reduction plan**
   - Skill: `shepherd-task-10-create-ignorance-reduction-plan`
3. **Research gate**
   - Human and Copilot research or spikes fill every implementation-gating `Resolution` block.
4. **Stage 15 — prepare stage 20**
   - Script: `shepherd-task-15-prepare-create-issues.ps1`
5. **Stage 20 — create issues from the resolved plan**
   - Skill: `shepherd-task-20-create-issues-from-plan`
6. **Stage 25 — dispatch the ordered issue list**
   - Script: `shepherd-task-25-given-list.ps1`
7. **For every issue, serially**
   - Stage 30 skill: `shepherd-task-30-from-assignment-to-ready`
   - Stage 40 skill: `shepherd-task-40-from-ready-to-merged-to-base`
8. **Stage 50 — create the campaign post-mortem**
   - Skill: `shepherd-task-50-create-post-mortem`

The driver does not invoke stage 10 or perform the research gate live. `01-prepare-base-branch.ps1` writes a deterministic, already-resolved simple-math ignorance-reduction plan. The default output must state this substitution clearly without implying that normal shepherd-task users may omit planning or research.

Stage 25 invokes stages 30 and 40 serially for each of the two issues and invokes stage 50 after success or failure. The output must not mislabel stage 50 as stage 40.

## New command-line switches

Add these PowerShell switch parameters:

```powershell
[switch]$ShowDomainFixtureOutput,
[switch]$ShowShepherdTaskScriptOutput,
[switch]$ShowContractOutput,
[switch]$ShowNativeToolOutput,
[switch]$ShowAllOutput
```

Document every switch in comment-based help.

`-ShowAllOutput` enables all four specific output channels. Normalize that choice once near startup rather than repeatedly checking `ShowAllOutput` throughout the script.

Do not add `-ShowCopilotCLIOutput` or `-ShowCopilotSkillOutput`. The driver does not own those nested process boundaries and must not parse, replay, or expose redacted session artifacts.

### `-ShowDomainFixtureOutput`

Show the complete inherited output of simple-math fixture scripts directly invoked by the driver:

```text
00-prepare-test-baseline.ps1
01-prepare-base-branch.ps1
02-create-issues.ps1
04-verify-control-campaign.ps1
get-copilot-skill-list.ps1, if its successful output would otherwise be displayed
```

The complete output can contain nested shepherd-task, Copilot CLI, `git`, and `gh` messages. Do not attempt to classify or filter individual lines.

### `-ShowShepherdTaskScriptOutput`

Show the complete inherited output of canonical shepherd-task scripts directly invoked by the driver, principally:

```text
shepherd-task-25-given-list.ps1
```

Its output can contain the per-issue worker, Copilot CLI runtime, nested native tools, and stage-50 messages. Do not modify core scripts or filter their individual lines.

The default educational command display is independent of this switch. Canonical planned and actual invocations must be shown even when child output is hidden.

### `-ShowContractOutput`

Show output from all offline contract scripts run during preflight.

Contract output is hidden on successful default runs. A failed contract must still expose enough captured output to diagnose the failure.

### `-ShowNativeToolOutput`

Show output from native commands invoked directly by the driver, including:

- `gh auth status`;
- repository inspection;
- clone;
- initial commit and push when the disposable repository is empty;
- worktree creation;
- final fast-forward pull.

This switch does not control native commands invoked inside fixture or shepherd-task child processes.

### `-ShowAllOutput`

Enable:

```text
ShowDomainFixtureOutput
ShowShepherdTaskScriptOutput
ShowContractOutput
ShowNativeToolOutput
```

## Child-process output contract

Implement output control only at process boundaries owned by the driver.

Do not use prefix-based filtering. Several child layers use the same `[shepherd-task]` prefix, and Copilot CLI runtime messages do not have a stable shepherd-task prefix.

Refactor or replace `Invoke-CheckedPwshScript` so callers identify the output channel for each invocation. A suitable design may use a validated channel name such as:

```text
DomainFixture
ShepherdTaskScript
Contract
```

Requirements:

- When a channel is enabled, preserve the current live child output behavior.
- When a channel is disabled and the child succeeds, suppress its stdout and stderr.
- When a channel is disabled and the child fails, print the captured stdout and stderr before throwing.
- Preserve the child process's actual exit code.
- Never let output capture turn a failure into success.
- Keep stdout and stderr ordering as useful as PowerShell permits.
- Do not hide the driver's educational status messages.
- Do not print an empty diagnostic block when a failed child produced no output.
- Include the failed script path and exit code in the terminating error.
- Keep invocation arguments as a flat PowerShell string array. Do not introduce nested-array argument bugs.
- Continue using a fresh `pwsh -NoLogo -NoProfile -File` process for checked PowerShell scripts.

If temporary files are used to preserve combined output, create them under a safe temporary directory and remove only those exact files in `finally`. Do not leave new driver log files in the repository or campaign worktree. An in-memory implementation is preferred if it preserves useful output and exit behavior.

## Direct native-command output contract

Create a small, explicit driver-owned mechanism for direct native commands whose routine output should be hidden by default and shown with `-ShowNativeToolOutput`.

Requirements:

- Preserve commands, arguments, working directories, and side effects.
- Capture the exit code immediately after each native invocation.
- On success, display captured output only when native output is enabled.
- On failure, display captured output regardless of the switch and then fail with the existing operation-specific meaning.
- Do not rewrite repository-state queries that already intentionally capture or suppress output for validation.
- Do not expose secrets, tokens, authorization headers, or environment values.
- It is acceptable to leave intentionally silent probe commands such as `git ls-remote ... *> $null` silent.

At minimum, review:

```text
gh auth status
gh repo view
git clone
git add
git commit
git push
git worktree add
git pull --ff-only
```

The `git add`, `git commit`, and `git push` operations above are conditionally executed only when the disposable repository is empty. Preserve that behavior exactly.

Review every other direct `git` and `gh` invocation in the driver and classify it deliberately as:

- user-facing native output;
- captured validation data;
- or an intentionally silent probe.

Do not mechanically stream JSON or other machine-readable values used internally by the driver.

## Default educational output

The default output must be concise, ordered, and understandable without color. Color may supplement the structure but must not carry essential meaning.

Use one consistent driver-owned prefix, such as:

```text
[shepherd-control]
```

Use explicit stage labels in the text. Do not rely on unqualified terms such as `Phase 1` and `Phase 2`.

### Opening explanation

After resolving the repository and paths, print a compact run header that includes the existing repository, workarea, checkout, worktree, baseline branch, and control branch information.

Then print a concise workflow explanation that distinguishes:

- canonical shepherd-task stages;
- the fixture substitution for stage 10 and the research gate;
- experiment-only setup and verification work.

The output should say, in substance:

```text
Stage 10 and the human/Copilot research gate are not run live.
This deterministic simple-math control fixture writes an already-resolved plan in their place.
```

Do not describe repository initialization, baseline creation, contract checks, repository cloning, or final experiment verification as shepherd-task lifecycle stages.

### Canonical script invocation display

Add a reusable driver helper that prints copyable multiline PowerShell invocations. It must:

- print the stage number and purpose;
- print the canonical script basename;
- print a valid call operator invocation using the resolved installed script path;
- quote paths and string values safely for display;
- print one argument per continuation line;
- use PowerShell backtick continuation consistently;
- distinguish `Planned invocation` from `Actual invocation`;
- support clearly marked placeholders such as `<CAMPAIGN_ISSUE_NUMBER>`;
- never execute the displayed command;
- remain readable without terminal colors.

Use canonical shepherd-task scripts in these displays, not fixture wrapper scripts.

### Stage 00 display

Immediately before invoking `01-prepare-base-branch.ps1`, print:

```text
Stage 00 — Initialize campaign
Planned invocation of shepherd-task-00-init-campaign.ps1:
```

Show the resolved installed path and these exact arguments:

```text
-CampaignIssueNumber <CAMPAIGN_ISSUE_NUMBER>
-CampaignShortname "math-control"
-BaseBranch "<actual control branch>"
-Repo "<actual owner/repository>"
```

The campaign issue number is not known until the fixture creates the issue and invokes stage 00. The placeholder is therefore required in the planned display.

After `01-prepare-base-branch.ps1` succeeds:

- locate the unique `math-control` campaign directory as today;
- load and validate `shepherd-campaign.json`;
- obtain the actual campaign issue number from the manifest;
- print `Actual invocation of shepherd-task-00-init-campaign.ps1`;
- show all four arguments with the values that were actually used.

Do not infer the issue number only from the directory name when the manifest provides the authoritative value.

### Stage 10 and research substitution display

After stage 00's actual invocation, state that:

- a normal campaign next invokes `shepherd-task-10-create-ignorance-reduction-plan`;
- human and Copilot research then fills every implementation-gating `Resolution` block;
- this simple-math control fixture has written an already-resolved `math-tool-ignorance-reduction-plan.md` instead;
- the driver is proceeding to stage 15.

Do not print or synthesize a fake stage-10 command because the driver does not invoke that skill.

### Stage 15 display

Immediately before invoking `02-create-issues.ps1`, print:

```text
Stage 15 — Prepare stage 20
Planned invocation of shepherd-task-15-prepare-create-issues.ps1:
```

At this point the campaign metadata directory is known. Show:

```text
& "<installed shepherd-task-15-prepare-create-issues.ps1 path>" `
    -CampaignMetadataDirectory "<actual directory>" `
    -PassThru
```

Although all values are known, retain the planned/actual convention.

After `02-create-issues.ps1` succeeds, print the same command as the actual invocation. The displayed command must match the invocation performed inside the fixture, including `-PassThru`.

Then state that stage 15 generated a launcher which invoked the stage-20 skill and that the simple-math fixture verified the resulting two issue bodies. Do not print the generated launcher's internal output by default.

### Stage 25 display

Before stage 20 has produced the issue handoff, show a planned stage-25 invocation with:

```text
-TaskIssues "<TASK_ISSUE_LIST>"
-CampaignMetadataDirectory "<actual directory, if already known>"
```

Place this at the point in the narrative where a normal user would understand that stage 20 must first create the issues. Do not claim the placeholder command has been executed.

After loading and validating `shepherd-test-experiment-handoff.json`, print:

```text
Stage 25 — Dispatch ordered issue list
Actual invocation of shepherd-task-25-given-list.ps1:
```

Show:

```text
& "<installed shepherd-task-25-given-list.ps1 path>" `
    -TaskIssues "<actual comma-separated two-issue list>" `
    -CampaignMetadataDirectory "<actual directory>"
```

Print this immediately before the driver invokes stage 25.

The existing fixture line `Exact stage-25 command:` will be hidden by default with the rest of `02-create-issues.ps1` output, avoiding duplicate commands.

### Stage 30, stage 40, and stage 50 explanation

Before invoking stage 25, explain that stage 25 will:

- process the two supplied issues serially;
- invoke stage 30 for each issue to move it from assignment to the boundary before Ready for review;
- invoke stage 40 for that issue to move it from Ready for review through merge to the campaign base branch;
- proceed to the second issue only after the first issue is merged;
- invoke stage 50 to produce a post-mortem after success or failure.

Do not print fabricated exact commands for stages 30, 40, or 50 because they are skill prompts constructed inside unchanged core scripts.

When `-ShowShepherdTaskScriptOutput` is not selected, the driver must still communicate meaningful progress around the long-running stage-25 operation. Do not change core scripts to achieve this. Use a driver-only approach:

- print a clear message before handing control to stage 25, including both issue numbers;
- print that detailed live per-issue output can be enabled with `-ShowShepherdTaskScriptOutput`;
- print a clear completion message after stage 25 returns successfully.

Do not add polling, extra GitHub API traffic, background execution, or behavior-changing monitoring solely for cosmetic progress.

### Experiment-only operations

Continue performing preflight, contracts, clone, optional empty-repository initialization, baseline creation, worktree creation, synchronization, fixture verification, and evidence collection.

Present these as concise driver-owned statuses, for example:

```text
[shepherd-control] Experiment setup: validating prerequisites
[shepherd-control] Experiment setup: creating immutable simple-math baseline
[shepherd-control] Experiment verification: checking completed campaign
```

Do not number them as shepherd-task stages.

### Completion and failure output

Preserve the existing final lessons display, completion summary, machine-readable summary, and no-cleanup statement.

Enhance the completion output only as needed to make the lifecycle result clear. Do not dump hidden child output after success.

On failure:

- preserve the exact `$currentPhase` banner;
- show the exception;
- show captured output from the failing hidden child or native command;
- list existing evidence paths as today;
- rethrow;
- restore the initial working directory;
- perform no automated campaign cleanup.

Avoid printing the same captured failure output twice.

## Structural implementation guidance

Keep the driver readable. Prefer small helpers with explicit responsibilities, for example:

```text
Test-OutputChannelEnabled
Invoke-CheckedPwshScript
Invoke-CheckedNativeCommand
ConvertTo-PowerShellDisplayLiteral
Write-ShepherdScriptInvocation
Write-ControlStage
```

Names may differ, but avoid one large helper with unrelated formatting, execution, capture, and manifest responsibilities.

PowerShell correctness requirements:

- Retain `Set-StrictMode -Version Latest`.
- Retain fail-fast behavior.
- Capture `$LASTEXITCODE` immediately after native commands.
- Do not depend on `$?` for native process success.
- Do not use `Invoke-Expression`.
- Do not construct executable command strings.
- Keep display-only command formatting separate from actual invocation arrays.
- Correctly quote display values containing apostrophes, spaces, or PowerShell metacharacters.
- Keep the driver file UTF-8 without BOM.
- Preserve flat-array behavior for `pwsh -File` arguments.
- Do not write secrets or authentication material to captured output.

## Help and examples

Update comment-based help to explain:

- the educational default output;
- the deterministic simple-math substitution for stage 10 and research;
- every new output switch;
- that the switches expose complete output at driver-owned child boundaries;
- that nested output cannot be separated by emitter without changing core scripts;
- that hidden failing output is revealed automatically.

Retain the existing paid-operation and no-cleanup warnings.

Add at least:

1. the current default invocation example;
2. an example enabling shepherd-task script output;
3. an example enabling all output.

Use Windows PowerShell syntax and Windows-style paths.

## Tests and contracts

Do not run the paid end-to-end simple-math control campaign as validation.

Update the smallest appropriate existing non-destructive contract, likely:

```text
plugins/shepherd-task/test/simple-math/07-driver-encoding-contract.ps1
```

If that contract would become incoherent, add one narrowly focused PowerShell contract beside it rather than overloading unrelated assertions.

Contract coverage must prove, without live GitHub or Copilot operations:

1. The driver parses as valid PowerShell.
2. The driver remains UTF-8 without BOM.
3. All five new switch parameters exist.
4. `ShowAllOutput` enables all four specific channels.
5. No `ShowCopilotCLIOutput` or `ShowCopilotSkillOutput` parameter is introduced.
6. The default educational output contains ordered references to stages 00, 10, research, 15, 20, 25, 30, 40, and 50.
7. Planned and actual labels exist for stages 00, 15, and 25.
8. Stage 00 planned output contains `<CAMPAIGN_ISSUE_NUMBER>`.
9. Stage 25 planned output contains `<TASK_ISSUE_LIST>`.
10. The canonical script names and required argument names appear in the driver:
    - `shepherd-task-00-init-campaign.ps1`
    - `-CampaignIssueNumber`
    - `-CampaignShortname`
    - `-BaseBranch`
    - `-Repo`
    - `shepherd-task-15-prepare-create-issues.ps1`
    - `-CampaignMetadataDirectory`
    - `-PassThru`
    - `shepherd-task-25-given-list.ps1`
    - `-TaskIssues`
11. The stage-00 display uses the simple-math shortname `math-control`.
12. The driver still invokes the simple-math fixture wrappers required by the experiment.
13. The driver still validates exactly two handoff issue numbers.
14. Hidden successful child output and automatically revealed failing child output are covered through a safe stub script or static/isolated helper test.
15. Enabled child output is passed through.
16. Nonzero child exit codes remain failures.
17. The invocation display helper quotes paths and values containing spaces.
18. No core shepherd-task script or skill is modified.

Tests must not:

- create GitHub issues or pull requests;
- invoke `copilot --yolo`;
- clone a remote repository;
- publish branches;
- run a paid campaign;
- depend on GitHub authentication.

## Validation

Run the smallest relevant checks while iterating, then complete:

```powershell
pwsh -NoLogo -NoProfile -File .\plugins\shepherd-task\test\simple-math\07-driver-encoding-contract.ps1
```

Run any new driver-output contract added by the implementation.

Parse-check the changed driver and every changed PowerShell contract without invoking their operational bodies.

Then run:

```powershell
npm run plugin:validate
npm run skill:validate
npm run build
```

Normalize line endings before completion:

```powershell
bash eng/fix-line-endings.sh
```

After normalization, rerun the targeted PowerShell contracts and parse checks. Also run:

```powershell
git --no-pager diff --check
git --no-pager status --short
```

Inspect the final diff and ensure:

- the operational change is confined to the requested simple-math driver;
- only the smallest directly related simple-math contract test is additionally changed or added;
- no shepherd-task core script or skill changed;
- the Cargo Tracker driver was not changed;
- no generated repository output changed unexpectedly;
- no paid or destructive experiment was executed.

## Completion criteria

The work is complete only when:

- default output teaches the canonical shepherd-task lifecycle;
- stage 10 and research substitution is explicit;
- planned and actual canonical invocations are shown for stages 00, 15, and 25;
- placeholders are used before values are known and actual values are shown afterward;
- stage-00 output uses `math-control`;
- stage-25 output uses the actual ordered two-issue list;
- successful intermediate output is hidden by default;
- the four specific output switches and `ShowAllOutput` behave as defined;
- failing hidden subprocess output is automatically revealed;
- optional initialization of an empty disposable repository remains correct;
- no core shepherd-task script, skill, prompt, or artifact contract changes;
- all non-destructive validation passes.

## Completion report

Report:

- the final default-output behavior;
- the implemented switches and their exact scope;
- how planned and actual commands are produced for stages 00, 15, and 25;
- how hidden output is recovered on failure;
- preservation of simple-math-specific two-issue and empty-repository behavior;
- files changed;
- validation commands and outcomes;
- explicit confirmation that no live paid control campaign was run and no core shepherd-task script or skill was modified.
