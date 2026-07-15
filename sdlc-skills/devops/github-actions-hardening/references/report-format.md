# Report Format

Use this structure for every workflow hardening review.

## 1. Summary Table (always first)

```
GitHub Actions Hardening — <workflow file(s) reviewed>

| Severity   | Count |
| ---------- | ----- |
| 🔴 CRITICAL | 1     |
| 🟠 HIGH     | 2     |
| 🟡 MEDIUM   | 1     |
| 🔵 LOW      | 1     |
| ⚪ INFO     | 0     |
```

If nothing was found: `No issues found. Checked: triggers, injection sinks, permissions, action
pinning, secret handling.`

## 2. Findings (grouped by issue type, not by file)

For each finding use a card:

```
### 🔴 CRITICAL — Script injection via PR title on a privileged trigger

File: .github/workflows/triage.yml  (line 14)
Trigger: pull_request_target

Offending code:
    - run: echo "New PR: ${{ github.event.pull_request.title }}"

Risk: pull_request_target runs with a read/write token and repository secrets, and any
contributor can open a PR with a title like  "; <attacker-command> #  which is executed as shell.
This allows secret exfiltration and pushes with the workflow token.

Fix:
    - env:
        PR_TITLE: ${{ github.event.pull_request.title }}
      run: echo "New PR: $PR_TITLE"

Confidence: High
```

## 3. Remediation Blocks

Every CRITICAL and HIGH finding includes a concrete before/after. Preserve the author's
indentation, step names, and surrounding structure — change only what fixes the issue, and add a
one-line comment explaining the change where it isn't obvious.

## 4. Closing Note

End with the explicit line:

> Review each change before committing. Nothing has been modified.

## Style Rules

* Quote the exact offending line and give its location.
* Explain risk in plain English — what an attacker actually does, not just the rule name.
* Per-finding confidence: High / Medium / Low.
* Don't inflate severity: a fork `pull_request` (read-only token, no secrets) running untrusted
  code is not CRITICAL on its own.
