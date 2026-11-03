# Validation

Two recorded applications of this skill to real failed jobs in a public
repository. Every run ID, SHA, and command below is public, so each can be
replayed or checked.

## Origin

The seven steps, the four failure classes, the verification checklist, and the
rules are the [`ci-gate-diagnosis` prompt](https://github.com/shauryagangrade/awesome-ai-prompts/blob/main/devops-deploy/ci-gate-diagnosis-prompt.md),
published in `shauryagangrade/awesome-ai-prompts` on 2026-10-24, before this
skill existed. This skill packages that workflow for Copilot and adds the fixed
report block, the base-branch worktree recipe, the `pull_request`-only caveat,
and the validation below.

## Scenario 1: a green local run, a red CI run

This is a run inside GitHub Copilot CLI, on a checkout of the failing commit.
CLI 1.0.105, model `gpt-6-luna` (the CLI's default selection, recorded in its
own usage log), 8 model requests, 2026-11-03. The worktree was a full clone, so
the failing command passed locally before the run started.

**Check:** `Docs structure + em dashes`, run
[40202831763](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40202831763),
head `3ba8bf96`, push to `main`, 2026-10-25 14:33 UTC.

**Log**, trimmed to the failing step:

```text
Job:    Docs structure + em dashes
Step:   Build all-prompts page (deterministic + in sync)
Run:    https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40202831763
Commit: 3ba8bf965671e6db8cb05ed089fe3127de9007ad

##[group]Run python3 scripts/build-all.py --check
python3 scripts/build-all.py --check
shell: /usr/bin/bash -e {0}
##[endgroup]
FAIL stale: website/sitemap.xml
run: python3 scripts/build-all.py to regenerate, or delete removed pages
##[error]Process completed with exit code 1.
```

**Prompt:**

```text
A CI check is failing on this repository and I need to know whether my change caused it.

The failed job log is in ./ci-log.txt. Use the diagnose-ci-gate skill in .github/skills/diagnose-ci-gate/SKILL.md and follow it.

Give me the skill's report, in its format. Do not change any files: I want the diagnosis, not a fix.
```

**Reply**, verbatim:

````text
I’ll use the supplied job log first, then compare its SHA and failure against the base branch and recent CI evidence.

The run is a `main` push at the checked-out SHA, not a PR check; I’m checking the exact job log and nearby `main` runs now, including whether the generated sitemap was already stale before this commit.

```text
Check:       Docs structure + em dashes on 3ba8bf965671e6db8cb05ed089fe3127de9007ad
First error: FAIL stale: website/sitemap.xml (Build all-prompts page, `python3 scripts/build-all.py --check`)
Class:       pipeline — the generator reads Git history for sitemap dates, but CI’s default checkout is shallow.
Ownership:   pre-existing to 3ba8: the same failure occurred on main at 1c981e9 ([run](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40202231365)); that commit introduced the Git-history dependency in `scripts/build-all.py:753-768`. 3ba8 changed only `.markdownlint-cli2.jsonc`.
Reproduced:  no — it passes locally on macOS with Python 3.14.7 and full Git history; CI used Ubuntu 24.04, and its Python version is not in the log.
Action:      fix pipeline — fetch the history the generator requires. The later revert at 64aae52 removed that dependency.
Result:      the check passed on the subsequent main run ([40203292949](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40203292949)); no files changed.
```
````

**Checked after the fact:**

- `get_git_lastmod()` is added in `1c981e9` and removed in `64aae52`. The
  commit under test, `3ba8bf96`, changes only `.markdownlint-cli2.jsonc`.
- The parent commit `1c981e9` failed the same job in run
  [40202231365](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40202231365),
  so ownership is pre-existing, as reported.
- A full clone at `3ba8bf96` passes: `OK (144 prompts, 162 files deterministic
  and in sync)`. A depth-1 fetch of the same commit, which is what CI's default
  checkout does, fails with `FAIL stale: website/sitemap.xml`.
- Run
  [40203292949](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40203292949)
  at `64aae52` passed.

The report is right on all five points, and the classification is the useful
part: the local check was green, so the skill had to explain the difference
instead of reporting "cannot reproduce, probably flaky". Its own note that it
could not see the CI Python version is also the right level of caution, since
the reproduction was done on macOS.

## Scenario 2: a 404 that re-running cannot fix

Run [40091680340](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40091680340),
job `New external links (PR only)`, head `5ea9cff6`, 2026-10-24 11:53 UTC. The
job checks URLs added by a pull request:

```text
Checking 18 URL(s) added in `git diff origin/main...5ea9cff6`
[X] https://awesome-ai-prompts.vercel.app/prompt/security-performance/secrets-scanning-response (status 404)
17 of 18 links healthy
##[error]Process completed with exit code 1.
```

- **Class:** pipeline. The page was generated correctly in the pull request, but
  the URL points at the production deployment, which serves `main`; the page
  reached `main` 66 minutes after the run. A pull request cannot make a
  production URL exist, so no retry and no edit to the link can turn this green.
- **Ownership:** the URL is new in the pull request. This job only runs on
  `pull_request`, so there is no base-branch run to compare against, and the diff
  quoted in the log is the ownership evidence.
- **Reproduced:** not as a 404, because the page has since deployed. The
  deterministic evidence is that the generated page exists in `5ea9cff6` but not
  in `main` before `c283b32`, while the production host serves `main`.
- **Action:** fix the check's target, not the link. Keep the live check on the
  scheduled run; on pull requests, resolve the project's own host against the
  build output, or skip self-hosted URLs added by the diff.

This scenario is why Step 4 handles jobs that only run on `pull_request`, and why
the pipeline row includes checks that assert a target a pull request cannot
produce.
