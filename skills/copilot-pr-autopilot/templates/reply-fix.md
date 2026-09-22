# Reply: accepted fix

Use after the loop has committed and pushed a fix for the finding. Cite
the pushed commit SHA from step 7.

```
<one sentence acknowledging the finding>.
<one or two sentences describing the fix>.
Fixed in <commit-sha>.
```

Example (language-neutral):

> The lock did not cover the install side of the path, so two
> parallel writers could read the same baseline and clobber each
> other. Promoted the per-instance lock to a process-wide
> function-local static so all read-modify-write paths share it.
> Fixed in abc1234.

When the fix is in a tested area, add a one-line test confirmation:

> Replaced the platform UUID dependency with a PID + monotonic-clock
> + atomic counter so the test target no longer pulls in the
> platform UUID library. All 42 tests in the affected suite still
> pass. Fixed in abc1234.
