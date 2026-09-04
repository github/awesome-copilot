# Simple-math shepherd-task control fixture

This fixture is a self-contained end-to-end invocation of `shepherd-task` with
lesson propagation disabled. It creates two serial implementation issues,
shepherds both through completion, and verifies the resulting repository and
campaign evidence.

There is one campaign, one stage-25 run, and no paired comparison phase.

## What it exercises

1. Creates a deterministic PowerShell/Pester math-tool baseline.
2. Creates one `experiment/shepherd-control` campaign branch.
3. Initializes the campaign through stage 00 without specifying a lesson mode.
4. Verifies that stage 00 persisted `lessonPropagation=off`.
5. Uses stage 20 to create two ordered issues.
6. Uses stage 25 to shepherd both issues serially through stages 30, 40, and 50.
7. Verifies merged PR ordering, substantive CI, issue-body contracts, and the
   unchanged `campaign-lessons.md` placeholder.
8. Preserves the checkout, worktree, campaign artifacts, run logs,
   post-mortem, and a machine-readable summary.

## Requirements

- Windows PowerShell or PowerShell 7
- `git`, `gh`, `copilot`, and `pwsh` on `PATH`
- Authenticated GitHub CLI
- A disposable GitHub repository with Actions, Copilot Coding Agent, and
  Copilot code review enabled
- The shepherd-task plugin and skills installed from this checkout

The repository may be empty. The driver creates an initial commit when needed.
The target and control-worktree paths must not already exist. The remote
baseline and control branch names must also be unused.

## Offline contracts

From the repository root:

```powershell
$Fixture = '.\plugins\shepherd-task\test\simple-math'

& "$Fixture\03-resolve-repository-remote.ps1"
& "$Fixture\05-stage20-artifact-contract.ps1"
& "$Fixture\06-stage40-review-contract.ps1"
& "$Fixture\07-driver-encoding-contract.ps1"
& "$Fixture\08-psncpps-contract.ps1"
& "$Fixture\09-skill-powershell-contract.ps1"
& "$Fixture\10-simple-math-fixture-contract.ps1"
```

The Bash contracts can be run with Git Bash:

```powershell
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/simple-math/03-resolve-repository-remote.sh"
& "C:\Program Files\Git\bin\bash.exe" `
  "plugins/shepherd-task/test/simple-math/06-stage40-review-contract.sh"
```

## Run the end-to-end control campaign

Install the current source first:

```powershell
.\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

Then run:

```powershell
.\plugins\shepherd-task\test\simple-math\20260904-run-control-experiment.ps1 `
  -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-REPOSITORY' `
  -WorkareasDir 'C:\workareas'
```

The control driver intentionally omits `-LessonPropagation` when invoking
stage 00. The resulting manifest must explicitly contain:

```json
{
  "lessonPropagation": "off"
}
```

The run is successful only when both issues are closed, both linked pull
requests are merged serially, the repository-owned CI check succeeds, stage 25
records a successful `off` run, and `campaign-lessons.md` retains its initial
placeholder. No cleanup is performed.
