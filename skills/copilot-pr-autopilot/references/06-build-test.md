# Step 6: Build + test per repo conventions

Sub-agent type: `task` (may fan out to several `explore` sub-agents in
parallel for discovery); budget: 10 min (extension cap up to 2× for
slow suites).

## Inputs

- The set of files touched in step 5 (from each fix sub-agent's
  `files_touched`).
- Whatever the parent has cached from prior rounds about the repo's
  build / test / lint command set.

## Return contract

```
{ status, failures }
```

Where `status` ∈ `pass` | `fail` and `failures` is the relevant
excerpt from the failing tool's output (build errors, test failures,
lint diagnostics) — enough for the parent to decide whether to loop
back to step 5 for a follow-up fix or push as-is.

## Procedure

**Discovery first** — read and combine:

- `.github/instructions/*.md`,
- `AGENTS.md`,
- `CONTRIBUTING.md`,
- `README.md`,
- `package.json` scripts,
- `Makefile`,
- language-specific tooling configs,
- AND recent CI workflow runs (`gh run list`, `gh run view`) to learn
  the *actual* command set in use.

THEN run those exact commands on the changed code. Independent
discovery axes (build tool / test runner / lint / spelling / format)
can be dispatched as separate `explore` sub-agents in parallel; cache
the discovered commands per round so re-runs don't re-discover.

## Gotchas

- **Never invent generic build commands.** A broken build wastes the
  next full review cycle (3–10 min). If discovery turns up nothing,
  surface the gap — don't guess.
- **Respect repo-specific spell-check / lint / format policies.**
  Some repos prefer rewording over allowlist entries; some have a
  patterns/regex file; some accept inline-ignore directives. Inspect
  the repo's existing config and recent commits before applying a
  generic fix.
- **Cache discovered commands per round, not per loop.** Repo configs
  can change between rounds (a fix may add a new lint), so re-discover
  at the start of each round, but reuse within the round.
- **Failures route back to step 5.** When `status: fail`, the parent
  re-enters step 5 with the failure excerpts as a new finding — don't
  push a broken build to satisfy step 7.
