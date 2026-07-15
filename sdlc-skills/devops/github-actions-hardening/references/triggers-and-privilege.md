# Triggers and Privilege

The single most important question for workflow security is: **can an outside contributor trigger
this workflow, and if so, what token and secrets does it get?** GitHub answers this differently per
trigger.

## Trust Matrix

| Trigger | Who can fire it | `GITHUB_TOKEN` | Secrets available | Risk |
| --- | --- | --- | --- | --- |
| `push` | Repo collaborators | read/write | yes | Low — trusted authors |
| `pull_request` (same-repo branch) | Collaborators | read/write | yes | Low |
| `pull_request` (from a fork) | **Anyone** | **read-only** | **no** | Low by design — even malicious code can't steal anything |
| `pull_request_target` | **Anyone with a fork** | **read/write** | **yes** | **High** — runs in base-repo context |
| `workflow_run` | Fires after another workflow | **read/write** | **yes** | **High** |
| `issue_comment`, `issues` | **Anyone** | **read/write** | **yes** | **High** |

The trap: `pull_request` from a fork is *safe* because GitHub deliberately strips the token down
and withholds secrets. Maintainers who find that "the secrets don't work on fork PRs" often switch
to `pull_request_target` to get them back — and in doing so hand a write token and every secret to
arbitrary contributors.

## Why `pull_request_target` Is Dangerous

`pull_request_target` checks out the **base** repository's workflow definition (so a fork can't
change what runs), but it runs with full privileges. The danger is when the workflow then
explicitly checks out the **fork's** code and executes it:

```yaml
# DANGEROUS — RCE with a write token + secrets
on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
        with:
          ref: ${{ github.event.pull_request.head.sha }}   # fork's code
      - run: npm install && npm test                        # runs the fork's code + scripts
```

`npm install` alone runs arbitrary lifecycle scripts from the PR. With `pull_request_target` those
scripts can read `secrets.*` and push commits with the write token.

## The Safe Two-Workflow Pattern

Split responsibilities. An **unprivileged** workflow runs the untrusted code; a **privileged**
workflow consumes only the trusted *output*.

```yaml
# 1) Unprivileged: runs untrusted code, no secrets, read-only token
name: PR Build
on: pull_request
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@<sha>
        with: { name: pr, path: dist/ }
```

```yaml
# 2) Privileged: triggered by the first, never runs fork code
name: PR Comment
on:
  workflow_run:
    workflows: ["PR Build"]
    types: [completed]
permissions:
  pull-requests: write
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@<sha>   # data only, not executed
      # post results, using the trusted token — but never execute the artifact
```

## Rules

* Treat `pull_request_target`, `workflow_run`, `issue_comment`, and `issues` as privileged.
* In a privileged workflow, **never** check out and execute PR/fork code.
* If you only need to label, comment, or triage based on metadata, that is fine — just don't run
  the contributor's code.
* Prefer `pull_request` (with its safe read-only/no-secrets defaults) whenever possible.
