# Script Injection

`${{ <expr> }}` is substituted into the script **as text, before the shell runs**. Any expression
that resolves to data an outside contributor controls is therefore a command-injection sink.

## Attacker-Controllable Contexts

These can be set by anyone who can open an issue, PR, or comment:

| Context | Set by |
| --- | --- |
| `github.event.issue.title` / `.body` | Issue author |
| `github.event.pull_request.title` / `.body` | PR author |
| `github.event.pull_request.head.ref` / `.head.label` | PR author (branch name) |
| `github.head_ref` | PR author (branch name) |
| `github.event.comment.body` | Commenter |
| `github.event.review.body` / `.review_comment.body` | Reviewer |
| `github.event.commits.*.message` / `head_commit.message` | Commit author |
| `github.event.commits.*.author.email` / `.name` | Commit author |
| `github.event.pages.*.page_name` | Wiki editor |

A branch named `$(<attacker-command>)` or an issue titled `"; <attacker-command> #` becomes shell
when interpolated into a `run:` step.

## The Vulnerable Pattern

```yaml
# VULNERABLE
- run: |
    echo "Reviewing PR: ${{ github.event.pull_request.title }}"
    git checkout ${{ github.head_ref }}
```

## The Safe Pattern — Pass Through `env:`

Bind the untrusted value to an environment variable, then reference the *shell* variable (quoted).
The shell variable is data, never re-parsed as workflow syntax:

```yaml
# SAFE
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
    HEAD_REF: ${{ github.head_ref }}
  run: |
    echo "Reviewing PR: $PR_TITLE"
    git checkout "$HEAD_REF"
```

`${{ }}` now appears only on the `env:` side, where it is assigned as a value rather than spliced
into a command. Always quote the shell variable (`"$PR_TITLE"`) to prevent word-splitting and
globbing.

## `actions/github-script`

The same rule applies. Do not interpolate `${{ }}` into the `script:` body — pass it through the
environment and read `process.env`:

```yaml
# VULNERABLE
- uses: actions/github-script@<sha>
  with:
    script: console.log("${{ github.event.issue.title }}")

# SAFE
- uses: actions/github-script@<sha>
  env:
    TITLE: ${{ github.event.issue.title }}
  with:
    script: console.log(process.env.TITLE)
```

## Custom Action Inputs

Passing untrusted `${{ }}` into a composite or JS action's `with:` inputs can be safe or not
depending on whether the action itself interpolates the input into a shell. When in doubt, pass via
`env:` and have the action read the environment, or sanitize/validate first (e.g. a branch name
should match `^[A-Za-z0-9._/-]+$`).

## Quick Audit Checklist

1. Grep every `run:` and `script:` for `${{`.
2. For each, resolve what the expression points to.
3. If it can be set by a non-collaborator → rewrite via `env:` with a quoted shell variable.
4. `github.actor`, `github.repository`, `github.sha`, `github.ref` (for branch protection contexts)
   and similar server-controlled values are not attacker-set, but a defense-in-depth `env:` rewrite
   costs nothing.
