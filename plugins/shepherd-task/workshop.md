# Two-hour workshop for `shepherd-task` skills and scripts

## Caveats

This workshop has been tested on Windows (Dev Box), macOS, and GNU/Linux. 

## Install `shepherd-task`

1. Clone `https://github.com/edburns/awesome-copilot` and check out the known-good tag of `shepherd-task`.

   I did all the testing with SSH urls.
   
   ```
   git clone git@github.com:edburns/awesome-copilot.git awesome-copilot-01
   cd awesome-copilot-01
   git checkout shepherd-task-v1.0.3
   ```
   
1. Open the `awesome-copilot-01/plugins/shepherd-task/README.md`.

   Ensure the **Local prerequisites** are all satisfied.
  
5. Uninstall any previous versions of `shepherd-task` on your system and install the desired version.

   Windows

   ```powershell
   cd .\plugins\shepherd-task\scripts
   .\uninstall-task-shepherd.ps1
   .\install-task-shepherd.ps1
   ```
   
   macOS, GNU/Linux
   
   ```bash
   cd plugins/shepherd-task/scripts/
   ./uninstall-task-shepherd.sh
   ./install-task-shepherd.sh
   ```
   
## Prepared campaigns

From the [README](https://github.com/edburns/awesome-copilot/blob/edburns/dd-3032934-shepherd-task/plugins/shepherd-task/README.md):

> `shepherd-task` runs an ordered engineering campaign through GitHub issues within the scope of a single GitHub repository. It uses GitHub Copilot Coding Agent (CCA) for implementation, Copilot code review for review findings, local Copilot CLI sessions for orchestration and review fixes, and `gh` for authoritative GitHub state. The campaign has several ordered "stages". The numbered lifecycle starts at stage 00 and leaves gaps between stages to allow for future stages as necessary. See [Stages](#stages).

> The unit of coordination is an issue in the GitHub issue tracker. Each implementation issue produces a PR against one non-`main` campaign base branch. Issues run serially so every merged PR becomes the starting point for the next issue.

This workshop includes two prepared campaigns to illustrate the operation of the system:

- `simple-math`: Fibonacci and factorial. Runs end-to-end in under 30 minutes. 

- `cargotracker-add-change-arrival-deadline-feature`: Add a cross-cutting feature to an existing enterprise Java 17 app. Runs at least an hour.
   
## Run the prepared `simple-math` campaign

1. Create a new empty GitHub repository with the following attributes

   - **Owner**: your GitHub ID that is associated with your Microsoft GitHub Copilot license.

   - **Repository name**: Suggested name: `YYYYMMDD-HHMM-simple-math` where `YYYYMMDD-HHMM` are something like `20260909-1943-simple-math` but for your current time and date. The point is uniqueness.

   - **Description**: `shepherd-task simple-math campaign`

   - **Visibility**: Public
   
   - **Start with a template**: No template

   - **Add README**: On

   - **Add .gitignore**: No .gitignore

   - **Add license**: MIT license (my default)
   
   Select **Create repository**.
   
   - Note your fully qualified repository URL. For discussion, `myRepositoryUrl`.
   
1. Open the `awesome-copilot-01/plugins/shepherd-task/README.md`.

   Ensure the **Repository prerequisites** are all satisfied.
   
1. Run the prepared campaign

   Windows

   ```powershell
   Get-Help $HOME\.copilot\plugins\shepherd-task\test\simple-math\run-campaign.ps1
   & "$HOME\.copilot\plugins\shepherd-task\test\simple-math\run-campaign.ps1" `
     -RepositoryUrl 'myRepositoryUrl'
   ```
   
   macOS, GNU/Linux
   
   ```bash
   cd $HOME/.copilot/plugins/shepherd-task/test/simple-math
   ./run-campaign.sh -h
   ./run-campaign.sh 'myRepositoryUrl'
   ```
   
### Commentary on the prepared `simple-math` campaign

This section explains what's happening as the `simple-math` campaign runs. It uses sample output from a known-good invocation.

`run-campaign` output uses the following semantic palette.

- White: log output from `run-campaign`.

- Dark gray: Planned commands that `run-campaign` will invoke.

- Purple: Actual commands invoked by `run-campaign`.

- Cyan: Stage markers. See `awesome-copilot-01/plugins/shepherd-task/README.md`.

#### Stage 00 - Initialize campaign

The `run-campaign` script creates a top level "container" issue in the specified repository. This is something you'd have to create yourself when invoking the campaign for real.

The init script needs this top level issue so it knows where to place the remaining issues.

Here are some examples of the top-level issue:

- https://github.com/edburns/dd-3061974-03-bash-simple-math/issues/1
- https://github.com/edburns/dd-3061974-04-windows-simple-math/issues/1
- https://github.com/edburns/dd-3061974-03-bash-simple-math-ubuntu/issues/3

Invoke the `init-campaign` script. This creates the campaign metadata directory. See section **Campaign** in `awesome-copilot-01/plugins/shepherd-task/README.md`.

Windows

```powershell
cd C:\Users\edburns\workareas\dd-3056162-shepherd-control
& 'C:\Users\edburns\.copilot\plugins\shepherd-task\scripts\shepherd-task-00-init-campaign.ps1' `
    -CampaignIssueNumber '1' `
    -CampaignShortname 'math-control' `
    -BaseBranch 'experiment/shepherd-control' `
    -Repo 'edburns/dd-3056167-01-windows'
```

macOS, GNU/Linux

```bash
cd /home/edburns/workareas/dd-3061974-03-bash-simple-math-ubuntu-shepherd-control
/home/edburns/.copilot/plugins/shepherd-task/scripts/shepherd-task-00-init-campaign.sh 3 math-control experiment/shepherd-control edburns/dd-3061974-03-bash-simple-math-ubuntu
```

Inspect the campaign manifest.

```powershell
cd C:\Users\edburns\workareas\dd-3056162-shepherd-control\2-math-control-remove-before-merge
type .\shepherd-campaign.json
```

See **Campaign manifest** in `awesome-copilot-01/plugins/shepherd-task/README.md`.
   
#### Stage 10 - Create ignorance-reduction plan

```
[shepherd] Normal usage invokes skill shepherd-task-10-create-ignorance-reduction-plan.
[shepherd] Human and Copilot research then fills every implementation-gating Resolution block.
[shepherd] This simple-math fixture substituted an already-resolved math-tool-ignorance-reduction-plan.md for Stage 10 and the research gate.
```

In a real-world invocation of a campaign, here is where you would spend time creating an "ignorance reduction plan". In the prepared sample, a filled in ignorance reduction plan is created for you. Examine the filled in plan, for example 

`C:\Users\edburns\workareas\dd-3056162-shepherd-control\2-math-control-remove-before-merge\math-tool-ignorance-reduction-plan.md`

The section headings of the plan have a required format, as described in `awesome-copilot-01/plugins/shepherd-task/README.md` **Create and resolve the plan when issues do not exist**. 

The ignorance reduction plan should be as detailed as possible. The skill includes several examples of real-world plans and uses them to guide the creation of your plan.

Here are the ignorance reduction plans for the `simple-math` campaign for Windows, macOS, and GNU/Linux.

- https://github.com/edburns/dd-3061974-04-windows-simple-math/blob/experiment/shepherd-control/1-math-control-remove-before-merge/math-tool-ignorance-reduction-plan.md
- https://github.com/edburns/dd-3061974-03-bash-simple-math/blob/experiment/shepherd-control/1-math-control-remove-before-merge/math-tool-ignorance-reduction-plan.md
- https://github.com/edburns/dd-3061974-03-bash-simple-math-ubuntu/blob/experiment/shepherd-control/3-math-control-remove-before-merge/math-tool-ignorance-reduction-plan.md

#### Stage 15 - Prepare Stage 20

❌❌There is a known bug in the `run-campaign` for `simple-math` that causes the actual invocation of this stage to appear too late.❌❌

In this stage, the user invokes the script `shepherd-task-15-prepare-create-issues`. This invokes the corresponding skill to read the ignorance reduction plan from the previous step and create issues in the repository issue tracker. A skill is necessary for this because the entire per-issue specification given to the coding agent is included in the issue description.

Windows

```powershell
[shepherd] Working directory:
C:\Users\edburns\workareas\dd-3056167-01-windows-shepherd-control
& 'C:\Users\edburns\.copilot\plugins\shepherd-task\scripts\shepherd-task-15-prepare-create-issues.ps1' `
   -CampaignMetadataDirectory '1-math-control-remove-before-merge' `
```

macOS, GNU/Linux

```bash
[shepherd] Working directory:
/Users/edburns/workareas/dd-3061974-03-bash-simple-math-shepherd-control
/Users/edburns/.copilot/plugins/shepherd-task/scripts/shepherd-task-15-prepare-create-issues.sh 1-math-control-remove-before-merge
```

Look at the issues created in your repository. Take [this repository](https://github.com/edburns/dd-3056167-01-windows) as an example.

1. The top level "container" issue, created before initializing the campaign. If your repository supports issue types, this would be an **Epic**. https://github.com/edburns/dd-3056167-01-windows/issues/1 . Note that `shepherd-task` does not close this issue. The intent is that the all of the work in the child issues is merged to the topic branch, and the human user creates a PR from that branch to close the top level issue. In this example, the topic branch is https://github.com/edburns/dd-3056167-01-windows/tree/experiment/shepherd-control .

2. Individual issues within the container issue for each step in the plan.

   1. https://github.com/edburns/dd-3056167-01-windows/issues/2

   2. https://github.com/edburns/dd-3056167-01-windows/issues/3

#### Stage 25 - Dispatch ordered issue list

```powershell
[shepherd] Working directory:
C:\Users\edburns\workareas\dd-3056167-01-windows-shepherd-control
& 'C:\Users\edburns\.copilot\plugins\shepherd-task\scripts\shepherd-task-25-given-list.ps1' `
    -TaskIssues '2,3' `
    -CampaignMetadataDirectory '1-math-control-remove-before-merge'
[shepherd] Stage 25 will process issues 2,3 serially.
[shepherd] For each issue, Stage 30 moves assignment to the Ready-for-review boundary, then Stage 40 reviews and merges it.
[shepherd] Stage 50 creates the campaign post-mortem after success or failure.
[shepherd] Run evidence will be written beneath: C:\Users\edburns\workareas\dd-3056167-01-windows-shepherd-control\1-math-control-remove-before-merge\shepherd-tasks-<CAMPAIGN_ID>-<TIMESTAMP>
```

macOS, GNU/Linux

```bash
[shepherd] Working directory:
/Users/edburns/workareas/dd-3061974-03-bash-simple-math-shepherd-control
/Users/edburns/.copilot/plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh 2\,3 1-math-control-remove-before-merge
[shepherd] Stage 25 will process issues 2,3 serially.
[shepherd] For each issue, Stage 30 moves assignment to the Ready-for-review boundary, then Stage 40 reviews and merges it.
[shepherd] Stage 50 creates the campaign post-mortem after success or failure.
[shepherd] Run evidence will be written beneath: /Users/edburns/workareas/dd-3061974-03-bash-simple-math-shepherd-control/1-math-control-remove-before-merge/shepherd-tasks-<CAMPAIGN_ID>-<TIMESTAMP>

```

See `awesome-copilot-01/plugins/shepherd-task/README.md` **Run stage 25 with an ordered issue list**.

#### Stages 30, 40, 50

By the time you have invoked `shepherd-task-25-given-list` the work proceeds in an entirely human hands-off manner. See `awesome-copilot-01/plugins/shepherd-task/README.md` Sections **Stage 30 readiness boundary** through **Workflow approval helper** and **Post-mortem behavior**.

The post mortem is not pushed by the `shepherd-task` system, you must commit and push it yourself, if desired.

The sample post-mortem is available at https://github.com/edburns/dd-3056167-01-windows/blob/experiment/shepherd-control/1-math-control-remove-before-merge/shepherd-tasks-61e0ba90-97d8-4ee8-b32c-90a2ce3ec2a4-20260909-2010/20260909-2054-post-mortem.md .

## Run the prepared `cargotracker-add-change-arrival-deadline-feature` campaign

1. Visit https://github.com/azure-javaee/cargotracker .

1. Select **Fork**.

   - **Owner**: your GitHub ID that is associated with your Microsoft GitHub Copilot license.

   - **Repository name**: Suggested name: `YYYYMMDD-HHMM-cargotracker-add-feature` where `YYYYMMDD-HHMM` are something like `20260909-1943-cargotracker-add-feature` but for your current time and date. The point is uniqueness.

   - Ensure **Copy the `master` branch only is not checked**.
   
   - Select **Create fork**.
   
   - Note your fully qualified repository URL. For discussion, `myRepositoryUrl`.
   
1. Select the **Actions** tab. 

1. Select **I understand my workflows, go ahead and enable them**.

1. Select the **Settings** tab.

1. Search for **Issues**. Ensure the checkbox is checked. ✅

1. Set the default branch to **20260902-2104Z-commit-e7b651f-liberty**.

1. Ensure you have the desired version of `shepherd-task` on your system. See [the `simple-math` example](#run-the-prepared-simple-math-campaign).

1. Invoke the `run-campaign`.

   Windows
   
   ```powershell
   Get-Help $HOME\.copilot\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\run-campaign.ps1
   & "$HOME\.copilot\plugins\shepherd-task\test\cargotracker-add-change-arrival-deadline-feature\run-campaign.ps1" `
     -RepositoryUrl 'myRepositoryUrl'
   ```
   
   macOS, GNU/Linux
   
   ```bash
   $HOME/.copilot/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh -h
   $HOME/.copilot/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature/run-campaign.sh 'myRepositoryUrl'
   ```

#### Examine the post-mortem report

The `shepherd-task` system will cause a post-mortem report to be written to the campaign metadata directory. Here are the examples from the Windows, macOS, and GNU/Linux variants.

- https://github.com/edburns/dd-3061974-04-windows-simple-math/blob/experiment/shepherd-control/1-math-control-remove-before-merge/shepherd-tasks-fb7a1a66-a5de-43de-9206-194ee2a0e062-20260910-1032/20260910-1136-post-mortem.md
- https://github.com/edburns/dd-3061974-03-bash-simple-math/blob/experiment/shepherd-control/1-math-control-remove-before-merge/shepherd-tasks-28a343f5-3c4e-4135-baa4-902faa957677-20260910-0954/20260910-1035-post-mortem.md
- https://github.com/edburns/dd-3061974-03-bash-simple-math-ubuntu/blob/experiment/shepherd-control/3-math-control-remove-before-merge/shepherd-tasks-2f2e3b72-45a8-4649-8951-45d46264d114-20260910-1709/20260910-1802-post-mortem.md

   
### Commentary on the prepared `cargotracker-add-change-arrival-deadline-feature` campaign

The process for this campaign is exactly the same as for `simple-math` but the domain of the campaign is much more complex.

To get an idea of the complexity take a look at the ignorance reduction plan for the campaign. Here is the ignorance reduction plan for windows, macOS, and GNU/Linux for this campaign.

- https://github.com/edburns/dd-3061974-03-cargotracker-windows/blob/experiment/shepherd-control/1-arrival-deadline-control-remove-before-merge/add-change-arrival-deadline-feature-ignorance-reduction-plan.md
- https://github.com/edburns/dd-3061974-02-cargotracker/blob/experiment/shepherd-control/1-arrival-deadline-control-remove-before-merge/add-change-arrival-deadline-feature-ignorance-reduction-plan.md
- https://github.com/edburns/dd-3061974-05-cargotracker-linux/blob/experiment/shepherd-control/1-arrival-deadline-control-remove-before-merge/add-change-arrival-deadline-feature-ignorance-reduction-plan.md

#### Exercising the completed work

Your campaign run will include output similar to the following.

```bash
=== shepherd-task Cargo Tracker run ===
Repository:          edburns/dd-3061974-02-cargotracker
Workareas directory: /Users/edburns/workareas
Fixture root:        /Users/edburns/.copilot/plugins/shepherd-task/test/cargotracker-add-change-arrival-deadline-feature
Primary checkout:    /Users/edburns/workareas/dd-3061974-02-cargotracker-shepherd-target
Control worktree:    /Users/edburns/workareas/dd-3061974-02-cargotracker-shepherd-control
Source branch:       20260902-2104Z-commit-e7b651f-liberty
Baseline branch:     experiment/shepherd-shared-baseline
Control branch:      experiment/shepherd-control
```

When the campaign completes successfully, your **Primary checkout** is the state of Cargo Tracker **before** the work and your **Control worktree** is the state of Cargo Tracker after the campaign. In both cases, you can start Cargo Tracker on JDK 17 with the following command.

```
./mvnw clean package -Popenliberty liberty:run
```

Look for a log message similar to the following:

```
[INFO] [AUDIT   ] CWWKT0016I: Web application available (default_host): http://192.168.0.219:8080/cargo-tracker/
```

#### Exercising Cargo Tracker

1. Visit the URL in from the log message.

1. Select **Administration interface**.

1. In the **Not Routed Cargo** section, notice that **DEF789** has an edit date widget in the **Deadline** column.

   This widget is will not be present in the **Primary checkout** variant.
   
1. Press `Ctrl-C` or invoke `./mvnw -Popenliberty liberty:stop` in another window to stop the server.

#### Examine the post-mortem report

The `shepherd-task` system will cause a post-mortem report to be written to the campaign metadata directory. Here are the examples from the Windows, macOS, and GNU/Linux variants.

- Windows ⌛
- https://github.com/edburns/dd-3061974-02-cargotracker/blob/experiment/shepherd-control/1-arrival-deadline-control-remove-before-merge/shepherd-tasks-c9e71f6c-ab48-4663-8125-5b796a989029-20260910-0948/20260910-1246-post-mortem.md
- https://github.com/edburns/dd-3061974-05-cargotracker-linux/blob/experiment/shepherd-control/1-arrival-deadline-control-remove-before-merge/shepherd-tasks-34dfbae2-dbd9-4702-ad9a-808b93224026-20260910-1738/20260910-2025-post-mortem.md

