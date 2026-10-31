---
description: 'Code review instructions that require every finding to be falsifiable: file and line, triggering input, expected vs. predicted result, and the smallest failing test.'
applyTo: '**'
excludeAgent: 'cloud-agent'
---

# Falsifiable Code Review Findings

Use these instructions for Copilot code review when you want fewer speculative comments and more findings a reviewer can confirm or reject with a test. They suit pull requests that may contain AI-generated code, where a plausible-looking patch can pass the obvious case and fail at a boundary.

## Intent

- Treat the pull request description as the intent of the change: what it must do and what it must not change.
- If the description does not state the intent, say so in the review and ask for it before calling behavior a bug.

## What to report

- Report only problems that change behavior, security, data, or what a reader must understand.
- Skip style issues that a formatter or linter would catch.

## Make every finding falsifiable

For each finding, give:

- the file and line;
- the concrete input or state that triggers the problem;
- the expected result;
- the result you predict the code produces;
- the smallest test that would fail today.

If you cannot name a triggering input, label the item `question`, not `bug`.

## Review order

Check in this order:

1. The stated intent.
2. Boundary inputs: empty, one, many, duplicates, mixed types, ordering.
3. State and side effects: mutation, retries, partial failure.
4. Error paths.
5. Security-relevant input: authorization, injection, secrets.
6. Tests that pass without proving the intent.

## Honesty about coverage

- Write `not traced` for any code path you did not follow.
- Do not claim that you ran code or tests.

## End of the review

End with:

- the three highest-risk findings;
- what you did not review;
- one decision: approve, request changes, or need more information.

## Example finding

Code under review: `return [...scores].sort().reverse().slice(0, 3);`

```text
bug: src/leaderboard.js:6
Trigger: topScores([9, 100, 25, 3])
Expected: [100, 25, 9]
Predicted: [9, 3, 25], because sort() without a comparator compares values as strings
Failing test: assert.deepEqual(topScores([9, 100, 25, 3]), [100, 25, 9])
```

A test that uses only two-digit scores passes on the same code, which is why the trigger matters.
