# Shepherd Task Plugin

End-to-end task shepherding system that automates the full lifecycle of GitHub issues through the Copilot coding agent.

## What it does

This plugin orchestrates the complete workflow of assigning a GitHub issue to Copilot, shepherding the resulting PR through CI and code review, and merging it — all via `copilot --yolo` sessions driven by shell scripts.

## Included Skills

| Skill | Description |
|-------|-------------|
| **shepherd-task** | Orchestrator with bundled Bash/PowerShell scripts |
| **shepherd-task-from-assignment-to-ready** | Phase 1: Assignment → CI passing → ready for review |
| **shepherd-task-from-ready-to-merged-to-base** | Phase 2: Ready → code review resolution → merge |
| **shepherd-task-approve-workflows-and-wait-for-completion** | Reusable sub-skill for workflow approval |

## Quick Start

```bash
# Shepherd a single task
./plugins/shepherd-task/scripts/shepherd-task.sh 1850 my-feature-branch owner/repo

# Shepherd multiple tasks
./plugins/shepherd-task/scripts/shepherd-task-given-list.sh "1850,1851,1852" my-feature-branch owner/repo
```

## Requirements

- `gh` CLI authenticated
- `copilot` CLI installed
- `jq` for log inspection
