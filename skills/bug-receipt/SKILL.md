---
name: bug-receipt
description: 'Close bugs and incidents with an auditable BUG RECEIPT and VERIFIED, PARTIAL, or BLOCKED status. Use for defect repair, regression proof, production incidents, and issue closeout.'
---

# Bug Receipt

## Mandatory closeout output

For every bug or incident closeout decision, return the complete receipt below as the entire user-facing result, even when the user requests a concise reply or does not name this format. Concision shortens field values; it never removes or renames a row. Do not replace the receipt with prose.

```text
BUG RECEIPT · VERIFIED | PARTIAL | BLOCKED

Problem    <observed defect and intended behavior>
Baseline   <failing interaction or command and decisive result; or not run>
Root cause <proven mechanism; or unproven hypothesis>
Change     <responsible change; or none>
Proof      <supplied or executed check: result; include every decisive layer>
Gaps       <none; or exact missing proof and single next experiment/package>
Source     executed now | supplied | mixed
```

Use `not run`, `unproven`, or `none` explicitly. Never omit a row to make the receipt look complete.

## Establish the evidence boundary

Before editing, record the observed problem, intended behavior, strongest direct check, and evidence source: `executed now`, `supplied`, or `mixed`. Never imply that supplied evidence was executed in the current run.

Reproduce the failure with the narrowest safe check when possible. If reproduction is unavailable, preserve the evidence obtained and cap the result at `PARTIAL` or `BLOCKED`.

## Trace and repair

1. Follow the live owner path from input to symptom.
2. Separate observed facts, bounded inferences, and gaps.
3. Require a concrete location or runtime transition before naming root cause.
4. Make the smallest responsible change; avoid unrelated cleanup, retries, silent fallbacks, and fixture-specific exceptions.

Do not convert a plausible patch, stale log, source read, or passing build into proof of the user-visible behavior.

## Close the proof loop

Run only checks required by the affected contract:

- original reproduction or direct acceptance check;
- nearest negative or regression check;
- affected build or integration gate;
- real UI, API, persistence, concurrency, or runtime path when the claim crosses that boundary.

Use these decisive boundaries:

| Surface | Required direct proof |
| --- | --- |
| Logic or failing test | Original failing input or focused test now passes |
| UI behavior | Real interaction plus relevant console and network observation |
| API or integration | Request, response, and responsible service behavior |
| Persistence | Write/read or reload round trip through the real owner path |
| Race or lifecycle | Repeated concurrent trigger; zero-or-one success; affected-row and transaction evidence; final invariant |
| Cross-system blocker | One sanitized failing request/response with timestamp or request ID, edge and application logs, and identity-provider logs when the trace reaches that owner |

## Assign status

- `VERIFIED`: observed baseline, concrete cause, responsible change, all declared checks passed, no material gap.
- `PARTIAL`: useful evidence exists, but a required proof layer is missing or inconclusive.
- `BLOCKED`: a specific external condition prevents reproduction, repair, or proof.

For `PARTIAL` or `BLOCKED`, name the single minimal experiment or correlated evidence package that closes the decisive gap. Never invent a command, observation, count, location, or result.

For a machine-readable receipt or CI integration, read [references/receipt-contract.md](references/receipt-contract.md) and conform to its JSON fields and status invariants.

When a JSON artifact is requested, start from [assets/receipt.template.json](assets/receipt.template.json), write it to a task-owned path, and validate it with `node scripts/validate-receipt.mjs <receipt.json>` from this skill directory. Do not commit the generated receipt unless the user requests it.

## Source and license

Originally published at https://github.com/lMysticl/bug-receipt under the MIT License.
