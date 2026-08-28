# Shepherd-task lesson propagation mechanism experiment

This fixture runs one `lessonPropagation=campaign` treatment and one
`lessonPropagation=off` control from the same immutable baseline SHA. It is a
real, paid, long-running experiment that creates branches, issues, PRs,
workflow runs, Copilot sessions, and commits. It is destructive to those test
resources. Use only a disposable, fresh repository.

An n=1 treatment/control comparison verifies the propagation mechanism and
produces evidence for manual inspection. It does **not** establish statistical
efficacy or prove causal productivity. Both campaigns eventually receive the
merged issue-1 implementation; the experimental difference is whether the
validated lesson mechanism is active for issue 2.

## Prerequisites

- Enable and configure Copilot Coding Agent (CCA), Copilot code review, and
  GitHub Actions in the disposable target repository.
- Be prepared to approve the first Actions runs created from Copilot-authored
  branches. Stage 30 must observe the substantive math-tool check, not merely a
  selector or an empty check set.
- Authenticate `gh` with issue, PR, review, Actions, push, merge, and issue
  closing permissions. Authenticate Copilot CLI and accept `copilot --yolo`.
- Install `git`, `gh`, `copilot`, `jq`, `uuidgen`, and PowerShell 7 (`pwsh`).
- Use an environment that can remain available for days and can run the
  repository's PowerShell gating command.
- Configure exactly one Git remote whose GitHub URL matches `OWNER/REPO`.
- Use distinct, valid non-`main` campaign branches.
- Be able to approve Actions runs and push, merge, and close test resources.
- Personal repositories are supported with ordinary untyped issues.
  Organization issue type `Task` is preferred when it is enabled, but is not
  required.

The Awesome Copilot **source checkout** and disposable **target repository**
are different directories. Install the plugin and skills from source first.
Then keep the current directory in the target clone and invoke every fixture
or shepherd script by absolute path from the source checkout.

## Procedure

The examples use PowerShell and these placeholders:

```powershell
$Source = '/absolute/path/to/awesome-copilot'
$Repo = 'OWNER/DISPOSABLE-REPO'
$Target = '/absolute/path/to/disposable-clone'
```

1. **Prepare a fresh target repository and clone.** The default branch must
   have at least one commit. Configure exactly one matching remote.

   ```powershell
   gh repo create $Repo --private --add-readme
   git clone "https://github.com/$Repo.git" $Target
   Set-Location $Target
   ```

   Confirm that the default branch has the generated initial commit and that
   the checkout is clean before continuing.

2. **Install the plugin and all shepherd skills from the source checkout.**

   ```powershell
   & "$Source/plugins/shepherd-task/scripts/install-task-shepherd.ps1"
   ```

3. **Create the deterministic baseline once and capture its exact SHA.**

   ```powershell
   Set-Location $Target
   & "$Source/plugins/shepherd-task/test/00-prepare-test-baseline.ps1" `
     -Repo $Repo `
     -BaselineBranch 'experiment/shepherd-shared-baseline'
   $BaselineSha = (git rev-parse HEAD).Trim()
   ```

   Record the prominently printed 40-character SHA. The baseline commit
   contains `.github/workflows/shepherd-task-math-tool.yml` and
   `eng/test-math-tool.ps1` before either campaign exists.

4. **Create two campaigns from the same SHA.** Script 01 checks out the newly
   created campaign branch. After the first invocation, return to the shared
   baseline branch (or any clean branch) before the second invocation. Do not
   delete or rewrite either campaign branch.

   ```powershell
   & "$Source/plugins/shepherd-task/test/01-prepare-base-branch.ps1" `
     -Repo $Repo `
     -BaseBranch 'experiment/shepherd-treatment' `
     -CampaignShortname 'math-treatment' `
     -LessonPropagation campaign `
     -BaselineSha $BaselineSha

   git checkout experiment/shepherd-shared-baseline
   git status --short

   & "$Source/plugins/shepherd-task/test/01-prepare-base-branch.ps1" `
     -Repo $Repo `
     -BaseBranch 'experiment/shepherd-control' `
     -CampaignShortname 'math-control' `
     -LessonPropagation off `
     -BaselineSha $BaselineSha
   ```

   Save each printed campaign metadata directory. Verify both campaign init
   commits report `$BaselineSha` as their first parent.

5. **Create and verify the two child issues on each campaign branch.**

   ```powershell
   git checkout experiment/shepherd-treatment
   & "$Source/plugins/shepherd-task/test/02-create-issues.ps1" `
     -CampaignMetadataDirectory '<TREATMENT-DIRECTORY>'

   git checkout experiment/shepherd-control
   & "$Source/plugins/shepherd-task/test/02-create-issues.ps1" `
     -CampaignMetadataDirectory '<CONTROL-DIRECTORY>'
   ```

   Stage 20 may create ordinary untyped issues in a personal repository. The
   fixture verifies what was actually created and does not block on issue type.
   Preserve the printed ordered issue lists and stage-20 evidence paths. These
   evidence files are intentionally untracked and local: do not run
   `git clean`, delete the campaign `prompts` directories, or switch to a
   different clone before step 7.

6. **Run stage 25 for treatment and control.** Prefer serial campaign runs and
   preserve every generated log/artifact directory. Use the exact commands
   printed by script 02, substituting absolute source paths if needed:

   ```powershell
   git checkout experiment/shepherd-treatment
   & "$Source/plugins/shepherd-task/scripts/shepherd-task-25-given-list.ps1" `
     -LessonPropagation campaign `
     -TaskIssues '<TREATMENT-ISSUE-1>,<TREATMENT-ISSUE-2>' `
     -CampaignMetadataDirectory '<TREATMENT-DIRECTORY>'

   git checkout experiment/shepherd-control
   & "$Source/plugins/shepherd-task/scripts/shepherd-task-25-given-list.ps1" `
     -LessonPropagation off `
     -TaskIssues '<CONTROL-ISSUE-1>,<CONTROL-ISSUE-2>' `
     -CampaignMetadataDirectory '<CONTROL-DIRECTORY>'
   ```

   Do not start issue 2 manually. Stage 25 must start it only after issue 1
   merges into that campaign's base branch.

7. **Verify each completed campaign on its base branch.**

   ```powershell
   git checkout experiment/shepherd-treatment
   git pull --ff-only
   & "$Source/plugins/shepherd-task/test/04-verify-lesson-experiment.ps1" `
     -CampaignMetadataDirectory '<TREATMENT-DIRECTORY>' `
     -SecondIssuePrNumber <TREATMENT-ISSUE-2-PR>

   git checkout experiment/shepherd-control
   git pull --ff-only
   & "$Source/plugins/shepherd-task/test/04-verify-lesson-experiment.ps1" `
     -CampaignMetadataDirectory '<CONTROL-DIRECTORY>' `
     -SecondIssuePrNumber <CONTROL-ISSUE-2-PR>
   ```

8. **Compare and manually inspect evidence.** Treatment lessons should evolve
   from the placeholder to validated issue 1, then validated issue 1 plus issue
   2. Control lessons must remain the initial placeholder. Follow the
   verifier's `MANUAL CHECK`: inspect treatment issue 2's stage-30 session
   artifacts and PR changes/description for evidence that issue 1's validated
   lesson was read and applied. PR prose alone is not automatic proof.

## Expected checkpoints

- Baseline workflow and canonical test runner exist before both campaigns.
- Both campaign initialization commits have the same exact first-parent SHA.
- Treatment issue bodies contain exact campaign lesson instructions; control
  issue bodies contain none.
- Treatment `campaign-lessons.md` evolves placeholder -> validated issue 1 ->
  validated issue 1 plus validated issue 2.
- Control `campaign-lessons.md` remains the exact initial placeholder.
- Treatment issue 2 starts only after issue 1's PR merges.
- The expected transferable category is a non-obvious, repository-tested
  implementation pattern that lets dot-sourced unit tests coexist with direct
  CLI execution. Task 2 does not prescribe that pattern.
- Semantic use is established only by the manual evidence check, not by the
  automated mechanism verifier.

## Cleanup

Capture all evidence first. Then manually close leftover issues and PRs,
delete remote experiment branches, and remove campaign metadata directories
from retained branches as appropriate. There is intentionally no automated
destructive cleanup or rollback.
