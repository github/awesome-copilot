# Validation scenario: a 404 that re-running cannot fix

This is a recorded application of this skill to a real failed GitHub Actions
job, not a synthetic example. Every run ID, SHA, and command below is public, so
it can be replayed or checked.

**Source:** `shauryagangrade/awesome-ai-prompts`, run
[40091680340](https://github.com/shauryagangrade/awesome-ai-prompts/actions/runs/40091680340),
job `New external links (PR only)`, head `5ea9cff6`, 2026-10-24 11:53 UTC.

## The check and its log

The job checks URLs added by a pull request and exits 1 if any of them is
unreachable:

```text
Checking 18 URL(s) added in `git diff origin/main...5ea9cff6`
[.] https://awesome-ai-prompts.vercel.app/prompt/security-performance/security-audit (status 200)
[X] https://awesome-ai-prompts.vercel.app/prompt/security-performance/secrets-scanning-response (status 404)
17 of 18 links healthy
Broken or unreachable links:
  - https://awesome-ai-prompts.vercel.app/prompt/security-performance/secrets-scanning-response
##[error]Process completed with exit code 1.
```

## Diagnosis

- **First error:** the 404 line. It is the only broken URL; the other 17 return
  200. The exit-code line at the end is fallout.
- **Class:** pipeline. The URL is well formed, and the page it points at was
  generated correctly in the pull request. The URL host is the project's
  production deployment, which serves `main`, and the page reached `main` at
  12:59 UTC, 66 minutes after this run. A pull request cannot make a production
  URL exist, so no retry and no edit to the link can turn this green.
- **Ownership:** the URL is new in this pull request, so the job had never
  checked it on `main`. This job only runs on `pull_request`, so there is no
  base-branch run to compare against; the diff quoted in the log is the
  ownership evidence.
- **Reproduced:** not as a 404, because the page has since been deployed. The
  deterministic evidence is that
  `website/prompt/security-performance/secrets-scanning-response.html` exists in
  `5ea9cff6` but not in `main` before `c283b32`, while the production host serves
  `main`.
- **Action:** fix the pipeline, not the link. Keep the live check on the
  scheduled run. On pull requests, either resolve the project's own host against
  the build output, or skip self-hosted URLs added by the diff.

## Report

```text
Check:       New external links (PR only) on 5ea9cff6
First error: [X] .../prompt/security-performance/secrets-scanning-response (status 404)
Class:       pipeline
Ownership:   introduced by this PR (URL is new; the job does not run on main)
Reproduced:  no 404 today; page absent from main before c283b32, present in 5ea9cff6
Action:      fix pipeline (check the build output, or skip self-hosted URLs on PRs)
Result:      link was correct; URL returns 200 after deploy
```

## Verified after the fact

- The URL returns 200 on 2026-11-03.
- The prompt landed on `main` in `c283b32` ("Collated PR: 10 new prompts") at
  2026-10-24 12:59 UTC.
- No source change was needed. The failure was the check's target, not the link.
