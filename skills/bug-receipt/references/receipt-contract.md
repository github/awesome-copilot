# Machine-readable receipt contract

Use JSON only when the user, CI, or another tool needs a structured artifact. Keep the normal final answer human-readable.

## Required fields

- `version`: integer `1`.
- `status`: `verified`, `partial`, or `blocked`.
- `problem`: concise defect and intended behavior.
- `baseline`: object with `command`, `result`, and `evidence`.
- `rootCause`: object with `summary` and at least one evidence item for `verified`.
- `changes`: array of `{ "file", "summary" }` objects.
- `verification`: array of `{ "command", "result", "evidence" }` objects.
- `gaps`: array of explicit missing proof statements.

Baseline results are `failed`, `observed`, or `not-run`. Verification results are `passed`, `failed`, or `not-run`.

## Status invariants

For `verified`:

- Require an observed baseline: `failed` or `observed`, never `not-run`.
- Require at least one concrete root-cause evidence item with `location` and `observation`.
- Require at least one changed file or artifact.
- Require at least one verification item.
- Require every verification result to be `passed`.
- Require `gaps` to be empty.

For `partial`:

- Preserve all evidence obtained.
- Put every missing or inconclusive proof layer in `gaps`.
- Never convert an unrun check into `passed`.

For `blocked`:

- Require at least one gap naming the external blocking condition.
- Leave unperformed work empty or mark it `not-run`; do not speculate about the result.

Validate against [receipt.schema.json](receipt.schema.json), run `node scripts/validate-receipt.mjs <file>` from the skill directory, or pipe JSON to `node scripts/validate-receipt.mjs - --json`.
