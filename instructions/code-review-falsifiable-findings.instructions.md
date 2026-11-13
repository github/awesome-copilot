---
description: 'Code review instructions that require every finding to be falsifiable: file and line, triggering input, expected vs. predicted result, and the smallest failing test.'
applyTo: '**'
excludeAgent: 'cloud-agent'
---

# Falsifiable Code Review Findings

Use this alongside a general review instruction. It does not change what to look for; it changes the shape of each finding so a reviewer can confirm or reject it with one test.

## Make every finding falsifiable

For each finding, give:

- the file and line;
- the concrete input or state that triggers the problem;
- the expected result;
- the result you predict the code produces;
- the smallest test that would fail today.

If you cannot name a triggering input, label the item `question`, not `bug`. Write `not traced` for code paths you did not follow, and do not claim that you ran code or tests.

## Example

Code under review: `return [...scores].sort().reverse().slice(0, limit);`

A speculative comment such as "Consider passing a comparator to `sort()` to avoid unexpected ordering" becomes:

```text
bug: src/leaderboard.js:6
Trigger: topScores([9, 100, 25, 3])
Expected: [100, 25, 9]
Predicted: [9, 3, 25], because sort() without a comparator compares values as strings
Failing test: assert.deepEqual(topScores([9, 100, 25, 3]), [100, 25, 9])
```

A test such as `topScores([40, 75, 62, 18])` passes on the same code; only the trigger exposes the bug.
