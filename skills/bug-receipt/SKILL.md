---
name: bug-receipt
description: 'Fix software defects with an auditable proof receipt: reproduce, trace root cause, repair, verify, and report VERIFIED, PARTIAL, or BLOCKED. Use for bug fixes and regressions.'
---

# Bug Receipt

Treat the receipt as the completion gate, not as decoration added after a conclusion.

## Define proof before editing

Write a compact working ledger with the observed problem, intended behavior, strongest direct acceptance check, and proof layers required by the affected surface. Keep it current while investigating.

Choose proof that can falsify the fix. A green build is not a substitute for a browser interaction, API round trip, persistence reload, or concurrency sequence when one of those is the user-visible contract.

## Establish the baseline

1. Restate the observed defect and the intended behavior in one sentence each.
2. Run the narrowest safe reproduction before editing whenever the environment permits it.
3. Record the exact command or interaction and the decisive failing observation.
4. If reproduction is unavailable, state why and cap the final status at `PARTIAL` or `BLOCKED`.

Do not convert an assumption, stale log, source read, or passing build into a reproduced baseline.

## Trace the cause

Follow the live owner path far enough to distinguish the responsible cause from a nearby symptom. Cite concrete evidence such as a file and line, stack frame, request/response, state transition, or runtime observation.

Separate:

- facts directly observed;
- bounded inferences supported by those facts;
- remaining gaps.

Do not claim root cause from plausibility alone.

## Repair the responsible layer

Make the smallest change that fixes the responsible behavior and preserves adjacent contracts. Avoid unrelated cleanup, silent fallbacks, fixture-specific exceptions, retries, or post-processing unless the product contract requires them.

Record every changed file or artifact and its role in the repair.

## Close the proof loop

Run, in proportion to the defect:

1. the original reproduction or direct acceptance check;
2. the nearest relevant negative or regression check;
3. the affected build, type, lint, or integration gate when applicable;
4. the live UI, network, backend, or runtime path when the user-visible claim depends on it.

Record exact commands and observed results. Never invent a test, command, count, file location, or runtime observation.

Use these minimum direct checks when applicable:

| Defect surface | Direct proof |
| --- | --- |
| Logic or failing test | Original failing input or focused test now passes |
| UI behavior | Real interaction plus relevant console and network observation |
| API or integration | Request, response, and responsible service behavior |
| Persistence | Write/read or reload round trip through the real owner path |
| Race or lifecycle | Repeated triggering sequence and the violated invariant |
| Build or configuration | Affected build, startup, or deployment path |

## Assign status

- Use `VERIFIED` only when the baseline failure was observed, root-cause evidence is concrete, the responsible change is identified, every declared verification passed, and no material gap remains.
- Use `PARTIAL` when useful evidence exists but at least one required proof layer is missing or inconclusive.
- Use `BLOCKED` when the fix or its proof cannot proceed because of a specific external condition.

For `BLOCKED`, name the single next evidence package or experiment that closes the causal chain. When the failure spans systems, require correlated evidence from every relevant owner rather than an isolated capture.

Passing syntax, compilation, one narrow unit test, or source inspection alone does not prove downstream behavior unless it is the complete acceptance contract.

## Return the receipt

Finish with this compact structure:

```text
BUG RECEIPT · VERIFIED | PARTIAL | BLOCKED

Problem    <observed defect and intended behavior>
Baseline   <exact command or interaction>
           <decisive observed result>
Root cause <location and evidence-backed mechanism>
Change     <file or artifact — responsible repair>
Proof      <check: result · check: result>
Gaps       <none, or the exact missing proof>
```

Use `not run` explicitly where applicable. Do not omit a row to make the receipt look complete.

For a machine-readable receipt or CI integration, read [references/receipt-contract.md](references/receipt-contract.md) and conform to its JSON fields and status invariants.

When a JSON artifact is requested, start from [assets/receipt.template.json](assets/receipt.template.json), write it to a task-owned path, and validate it with `node scripts/validate-receipt.mjs <receipt.json>` from this skill directory. Do not commit the generated receipt unless the user requests it.

## Source and license

Originally published at https://github.com/lMysticl/bug-receipt under the MIT License.
