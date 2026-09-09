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

- Bash 3.2+ on GNU/Linux or macOS, Git Bash, or PowerShell 7
- For the Bash driver: `bash`, `git`, `gh`, `copilot`, `jq`, and `find` on
  `PATH`
- For the PowerShell driver: `git`, `gh`, `copilot`, and `pwsh` on `PATH`
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
& "$Fixture\11-stage15-installed-path-contract.ps1"
```

The native Bash contracts use only local fixture data, temporary directories
under this fixture, and the installed shepherd-task Bash scripts. They do not
invoke paid Copilot or mutating GitHub operations. From the repository root:

```bash
fixture=plugins/shepherd-task/test/simple-math
for contract in \
  03-resolve-repository-remote.sh \
  05-stage20-artifact-contract.sh \
  06-stage40-review-contract.sh \
  07-driver-encoding-contract.sh \
  08-psncpps-contract.sh \
  09-skill-powershell-contract.sh \
  10-simple-math-fixture-contract.sh \
  11-stage15-installed-path-contract.sh
do
  "$fixture/$contract"
done
```

## Run the end-to-end control campaign

Install the current source first. Bash installation:

```bash
plugins/shepherd-task/scripts/install-task-shepherd.sh
```

PowerShell installation:

```powershell
.\plugins\shepherd-task\scripts\install-task-shepherd.ps1
```

Then run the installed Bash driver from any working directory:

```bash
"${COPILOT_HOME:-$HOME/.copilot}/plugins/shepherd-task/test/simple-math/run-campaign.sh" \
  'https://github.com/OWNER/DISPOSABLE-REPOSITORY' \
  "$HOME/workareas"
```

To validate the installed Bash layout and all offline integration contracts
without cloning, creating issues, or invoking paid Copilot operations:

```bash
"${COPILOT_HOME:-$HOME/.copilot}/plugins/shepherd-task/test/simple-math/run-campaign.sh" \
  'https://github.com/OWNER/REPOSITORY' \
  "$HOME/workareas" \
  --validate-installed-only
```

Or run the installed PowerShell driver:

```powershell
& "$HOME\.copilot\plugins\shepherd-task\test\simple-math\run-campaign.ps1" `
  -RepositoryUrl 'https://github.com/OWNER/DISPOSABLE-REPOSITORY' `
  -WorkareasDir 'C:\workareas'
```

Use `-ValidateInstalledOnly` for the equivalent non-mutating installed-layout
validation in PowerShell.

Both control drivers intentionally omit the optional lesson-propagation
argument when invoking stage 00. The resulting manifest must explicitly
contain:

```json
{
  "lessonPropagation": "off"
}
```

The run is successful only when both issues are closed, both linked pull
requests are merged serially, the repository-owned CI check succeeds, stage 25
records a successful `off` run, and `campaign-lessons.md` retains its initial
placeholder. No cleanup is performed.
