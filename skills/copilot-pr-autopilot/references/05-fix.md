# Step 5: Apply fixes

Sub-agent type: `general-purpose`, **one sub-agent per finding**,
parallel **max 5 concurrent**; budget: 5 min each. If step 4 returned
more than 5 `fix` rows, the parent runs step 5 in waves of ≤5.

## Inputs

Per sub-agent (one finding per invocation):
- `thread_id`, `file`, `line` from step 3.
- The finding `summary` and Copilot's suggested fix (if any).
- The triage `rationale` from step 4 — the agent already decided this
  is a `fix`; this sub-agent only implements it.

## Return contract

```
{ thread_id, files_touched, summary, status }
```

Where `status` ∈ `complete` | `partial` | `blocked` and `summary` is
a one-line description of the change.

## Procedure

1. **Discover repo conventions for the area being edited — first.**
   Before writing any code, read:
   - `.github/instructions/*.md` whose `applyTo` glob matches the
     file's path,
   - `.github/skills/`,
   - `AGENTS.md`,
   - `CONTRIBUTING.md`,
   - neighbor-file patterns in the same directory and recent commits
     touching similar files.
2. Apply the fix in line with those conventions.
3. Return `files_touched` + a one-line `summary` + `status`.

## Gotchas

- **Max 5 concurrent fix sub-agents.** The cap prevents fix-fanout
  chaos; the parent merges results and reconciles file conflicts
  between waves before step 6.
- **Never invent a generic answer that contradicts repo practice.**
  That's the "elephant in school" anti-pattern — a Copilot suggestion
  in isolation looks right but breaks the project's lint, format,
  spell-check, license-header, or framework conventions. The
  discovery step is mandatory, not optional.
- **One finding per sub-agent.** Fixes that need to touch the same
  file get serialized by the parent between waves — don't merge
  multiple findings into one sub-agent invocation.
- **Project policy beats Copilot suggestion.** If discovery surfaces
  a documented convention (spell-check allowlist mechanism, lint
  suppression style, etc.) that contradicts the suggested fix, follow
  the convention and reflect that in the reply body drafted in step 8
  (see [04-triage.md](04-triage.md#project-specific-policy-hooks)).
- **Push back with written rationale** if implementing the fix would
  over-engineer the design for a hypothetical edge case — flip the
  triage to `decline` and return `status: blocked` with the rationale
  so step 8 drafts the right reply.
