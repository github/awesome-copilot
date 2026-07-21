## Summary

**shepherd-task** is a collection of skills and scripts that invoke GitHub and GitHub Copilot agents and CLIs to drive a sufficiently detailed set of GitHub issues from assignment to merged.

**shepherd-task** uses this opinionated choice of the following agents and tools.

1. Copilot Coding Agent (CCA).
2. Copilot Code Review Agent (CCRA).
3. GitHub CLI `gh`.
4. GitHub Copilot CLI `copilot`.

It shepherds tasks from assignment through CI approval, code review resolution, and merge — all orchestrated via `copilot --yolo` sessions driven by shell scripts.

## Enabling assumptions

### Preconditions

1. The work will happen within a single GitHub repository.
1. The repository has GitHub Copilot Coding Agent and Code Review Agent installed and properly configured.
1. User has `gh` CLI installed at version 2.45.0 or later and is signed in.
1. USer has permissions on the repository to:
   1. Assign issues to `Copilot`.
   1. Push to the repository.
1. User has `copilot` CLI installed at version `1.0.72-0` or later and is signed in.
1. User has a local development environment suitable for using Copilot CLI and `git worktree` to do development work, including running tests.
1. User accepts that all of the work is to be done on a non-`main` base branch in the repository.
1. User accepts this plugin will invoke `copilot --yolo`.
1. The specification for the job to be done is encoded in an ordered set of GitHub issues in the issue tracker of the GitHub repository.
1. User has `jq` installed and accessible to Copilot CLI.

### Postconditions

The user of `shepherd-task` is responsible for creating a PR from the specified non-`main base branch to main.

## Motivation

When using the Copilot coding agent to implement tasks from a backlog, there is a significant amount of repetitive supervisory work: assigning the issue, waiting for the PR, approving workflow runs, interpreting CI failures, requesting changes, waiting for fixes, resolving code review comments, and finally merging. This system automates that entire loop, allowing a developer to hand off a list of issue numbers and walk away.

A successful run of the system will result in the work being merged to the specified non-`main` base branch, so that a further PR can be made from that branch with greater human oversight.

This plugin was developed and battle-tested in the `github/copilot-sdk` repository, where it has successfully shepherded dozens of tasks through the full lifecycle. It is being contributed here so the broader community can adopt, adapt, and improve it.

## Architecture

The system has two layers:

1. **Skills** (Copilot-invocable instructions) — three SKILL.md files that Copilot reads during `--yolo` sessions to know what to do at each phase:
   - `shepherd-task-from-assignment-to-ready`: Assigns an issue to @copilot with a specific base branch, waits for PR creation, iterates through CI approval and review-agent feedback (up to 20 iterations).
   - `shepherd-task-from-ready-to-merged-to-base`: Marks the PR as ready, waits for Copilot code review, resolves comments locally in a git worktree, pushes fixes, and merges.
   - `shepherd-task-approve-workflows-and-wait-for-completion`: Reusable sub-skill that approves pending `action_required` workflow runs and blocks until completion.

2. **Orchestration scripts** (user-facing entry points) — shell scripts that launch `copilot --yolo` sessions, verify outcomes with `gh` CLI between phases, and provide idempotent retry semantics. Both Bash and PowerShell variants are included for cross-platform support.

The plugin manifest (`plugin.json`) ties these together as a discoverable unit in the marketplace.

### Invocation flow

1. User invokes `shepherd-task-given-list`. See [figure 01: script shepherd-task-given-list](figure-01-shepherd-task-given-list.md).

2. For each task, `shepherd-task-given-list` invokes `shepherd-task`. See [figure 02: script shepherd-task](figure-02-shepherd-task.md).

   a. Phase 1: Assign task to Copilot Coding Agent and make it ready for review. See [figure 03: skill: from-assigned-to-ready](figure-03-from-assigned-to-ready.md).

   b. Phase 2: Mark ready for review and resolve all Copilot Code Review Agent comments that have merit. See [figure 04: skill: from ready-to-merged-to-base](figure-04-from-ready-to-merged.md).

3. Perform post-mortem. See [figure 05: skill: create post-mortem](figure-05-post-mortem.md).


## Sample invocation

Bash

```bash
. ./plugins/shepherd-task/scripts/shepherd-task-given-list.sh 13,4,5,6,7,8,9,10,11 edburns/2-build-out-demo edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk
```

PowerShell

```powershell
. .\plugins\shepherd-task\scripts\shepherd-task-given-list.ps1 13,4,5,6,7,8,9,10,11 edburns/2-build-out-demo edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk
```

This invocation was used to implement the issues in this Epic: https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/issues/2 .

## Installation

### Step 1: Install skills (via `gh skill`)

```bash
gh skill install github/awesome-copilot shepherd-task-from-assignment-to-ready
gh skill install github/awesome-copilot shepherd-task-from-ready-to-merged-to-base
gh skill install github/awesome-copilot shepherd-task-approve-workflows-and-wait-for-completion
```

Requires GitHub CLI v2.90.0+.

### Step 2: Install orchestration scripts

The scripts are not installable via `gh skill`. Either:
- Clone this repository and run from `plugins/shepherd-task/scripts/`, or
- Use the bundled installer to copy only the scripts into your repo:

   Bash

   ```bash
   . ./plugins/shepherd-task/scripts/install-task-shepherd.sh /path/to/your/repo
   ```
   
   PowerShell
   
   ```powershell
   . .\plugins\shepherd-task\scripts\install-task-shepherd.ps1 \path\to\your\repo
   ```

The installer copies **only** the orchestration scripts — it does not duplicate the skills (those are managed by `gh skill install` above).

## Uninstallation

There is no `gh skill uninstall` command. To remove installed skills, manually delete the skill directories from your agent's skills location.

- Use the bundled uninstaller to remove the scripts from your repo.

   Bash

   ```bash
   . ./plugins/shepherd-task/scripts/uninstall-task-shepherd.sh /path/to/your/repo
   ```
   
   PowerShell
   
   ```powershell
   . .\plugins\shepherd-task\scripts\uninstall-task-shepherd.ps1 \path\to\your\repo
   ```


## How it works

```
User runs: shepherd-task-given-list.sh "1841,1842,1843" feature-branch owner/repo
  └─ For each issue, calls shepherd-task.sh
       ├─ Phase 1: echo prompt | copilot --yolo  (invokes shepherd-task-from-assignment-to-ready)
       │    └─ skill loops: assign → wait for PR → approve workflows → fix CI → repeat
       ├─ Verify: gh pr checks, no unresolved reviews
       ├─ Phase 2: echo prompt | copilot --yolo  (invokes shepherd-task-from-ready-to-merged-to-base)
       │    └─ skill loops: mark ready → resolve review comments locally → push → merge
       └─ Verify: PR merged to non-main base branch, issue closed
```

## Key design decisions

- **Scripts verify state independently** — they don't trust Copilot exit codes; they use `gh` CLI to confirm PR existence, CI status, and merge state between phases.
- **Idempotent** — if a PR already exists for the issue, Phase 1 is skipped. If already merged, Phase 2 is skipped. Safe to re-run after failures.
- **Local review resolution** — Phase 2 resolves Copilot code review comments in a local git worktree rather than asking the remote agent to fix itself, giving more reliable results.
- **Cross-platform** — every script has both `.sh` and `.ps1` variants.

## Per-file manifest

### Plugin

| File | Purpose |
|------|---------|
| `plugins/shepherd-task/.github/plugin/plugin.json` | Plugin manifest grouping the three skills; includes metadata, keywords, and version |
| `plugins/shepherd-task/README.md` | User-facing documentation for the plugin |

### Orchestration scripts

| File | Purpose |
|------|---------|
| `plugins/shepherd-task/scripts/shepherd-task-given-list.sh` | Bash: iterates a comma-separated list of issue numbers, invoking shepherd-task.sh for each |
| `plugins/shepherd-task/scripts/shepherd-task-given-list.ps1` | PowerShell equivalent |
| `plugins/shepherd-task/scripts/shepherd-task.sh` | Bash: orchestrates Phase 1 + Phase 2 for a single task issue with state verification |
| `plugins/shepherd-task/scripts/shepherd-task.ps1` | PowerShell equivalent |
| `plugins/shepherd-task/scripts/shepherd-task-inspect-json.sh` | Bash: debug utility to inspect copilot JSON session logs |
| `plugins/shepherd-task/scripts/shepherd-task-inspect-json.ps1` | PowerShell equivalent |
| `plugins/shepherd-task/scripts/install-task-shepherd.sh` | Bash: copies the full shepherd system into another repository |
| `plugins/shepherd-task/scripts/install-task-shepherd.ps1` | PowerShell equivalent |

### Skills

| File | Purpose |
|------|---------|
| `skills/shepherd-task-from-assignment-to-ready/SKILL.md` | Skill instructions for Phase 1: assign to Copilot → PR created → CI passing → no unresolved reviews |
| `skills/shepherd-task-from-ready-to-merged-to-base/SKILL.md` | Skill instructions for Phase 2: mark ready → resolve code review → merge to base branch |
| `skills/shepherd-task-approve-workflows-and-wait-for-completion/SKILL.md` | Reusable sub-skill: approve `action_required` workflow runs and wait for completion |

### Generated files (updated by `npm run build`)

| File | Purpose |
|------|---------|
| `.github/plugin/marketplace.json` | Marketplace registry updated with new shepherd-task plugin entry |
| `docs/README.plugins.md` | Plugin listing updated to include shepherd-task |
| `docs/README.skills.md` | Skills listing updated with the three new shepherd-task skills |

## Validation

```
$ npm run skill:validate
✅ shepherd-task-approve-workflows-and-wait-for-completion is valid
✅ shepherd-task-from-assignment-to-ready is valid
✅ shepherd-task-from-ready-to-merged-to-base is valid

$ npm run plugin:validate
✅ shepherd-task is valid
```

## Testing

This system has been used in production on `github/copilot-sdk` to shepherd implementation tasks for Java SDK development. It handles the common failure modes: workflow approval gates, CI flakiness, Copilot code review comment iteration, merge conflicts, and base branch drift.

## Pull Request Checklist

- [x] I have read and followed the [CONTRIBUTING.md](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md) guidelines.
- [x] I have read and followed the [Guidance for submissions involving paid services](https://github.com/github/awesome-copilot/discussions/968).
- [x] My contribution adds a new instruction, prompt, agent, skill, workflow, or canvas extension file in the correct directory.
- [x] The file follows the required naming convention.
- [x] The content is clearly structured and follows the example format.
- [x] I have tested my instructions, prompt, agent, skill, workflow, or canvas extension with GitHub Copilot.
- [x] I have run `npm start` and verified that `README.md` is up to date.
- [ ] I am targeting the `main` branch for this pull request.

---

## Description

<!-- Briefly describe your contribution and its purpose. Include any relevant context or usage notes. -->

---

## Type of Contribution

- [ ] New instruction file.
- [ ] New prompt file.
- [ ] New agent file.
- [x] New plugin.
- [x] New skill file.
- [ ] New agentic workflow.
- [ ] New canvas extension.
- [ ] Update to existing instruction, prompt, agent, plugin, skill, workflow, or canvas extension.
- [ ] Other (please specify):

---

## Additional Notes

<!-- Add any additional information or context for reviewers here. -->

---

By submitting this pull request, I confirm that my contribution abides by the [Code of Conduct](../CODE_OF_CONDUCT.md) and will be licensed under the MIT License.




