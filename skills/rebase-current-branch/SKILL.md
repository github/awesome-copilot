---
name: rebase-current-branch
description: 'Rebase the currently checked out feature branch onto the latest upstream default branch. Use when asked to update a branch with main or master, rebase the current branch onto the default branch, or sync a feature branch before review. Detects whether the repository uses main or master and guides safe conflict handling.'
license: MIT
allowed-tools: Bash
---

# Rebase the Current Branch

Update the active branch by replaying its commits on top of the latest default branch from its upstream remote. Use the repository's actual default branch, whether it is named `main`, `master`, or another branch.

## Workflow

1. **Inspect before changing anything.** Run `git status --porcelain=v1 --branch --untracked-files=all` and `git branch --show-current`. Confirm the current branch is not the default branch and note any local changes. If the working tree has changes, stop and ask the user whether to commit, stash, or otherwise handle them. Do not stash automatically.
2. **Identify the upstream and default branch.** Check `git remote -v` and `git remote show <remote>` (or the remote's symbolic `HEAD`) to determine the branch this repository treats as its default. Prefer the configured upstream for the current branch when available; otherwise use `origin`. Do not assume that `main` exists or that a branch named `master` is current. If the default branch cannot be identified unambiguously, ask the user.
3. **Fetch the latest default branch.** Fetch only the identified remote and default branch, for example:

   ```sh
   git fetch <remote> <default-branch>
   ```

   Verify the fetched remote-tracking ref exists before continuing.
4. **Rebase the active branch.** Tell the user which branch will be rebased onto which remote-tracking branch, then run:

   ```sh
   git rebase <remote>/<default-branch>
   ```

5. **Handle conflicts without discarding work.** If the rebase stops, explain which files conflict and that the rebase is paused. Resolve only when the intended changes are clear; otherwise ask the user. After resolution, stage the resolved files and run `git rebase --continue`. If the user wants to abandon the operation, run `git rebase --abort`. Never use `git reset --hard`, discard user changes, or skip commits to force completion.
6. **Offer validation hooks.** After the rebase succeeds, inspect the repository's documented validation steps and configured hooks (for example, pre-commit hooks or lint and test scripts). Ask the user whether they want those checks run before proceeding. If they agree, run the applicable checks and report their results; do not bypass or disable hooks.
7. **Verify the result.** When the rebase completes, run `git status --porcelain=v1 --branch --untracked-files=all` and summarize the outcome, including the base branch used, validation results if run, and any remaining changes. Do not push, force-push, or amend commits unless the user separately asks.

## Quick Path

For a clean working tree where the upstream default branch is known, the core operation is:

```sh
git fetch <remote> <default-branch>
git rebase <remote>/<default-branch>
```

Replace `<default-branch>` with the detected branch name (`main`, `master`, or another configured default). Never run the placeholder commands literally.

## Safety Rules

- Preserve the user's current branch and uncommitted work.
- Do not rebase the default branch itself.
- Do not assume local `main` or `master` is up to date; rebase onto the fetched remote-tracking branch.
- Do not push or force-push as part of this workflow.
- If a rebase is already in progress, inspect its state and ask whether to continue or abort; do not start another rebase.
