# Start here

This kit contains the complete implementation specification for `{system_name}`.
Codex and Hermes can use the root `AGENTS.md` as project context; the complete
task is in `IMPLEMENTATION.md`.

## Status

Open `manifest.json`. Hand the kit to an implementing agent only when status is
`ready_for_implementation` and `critical_unknowns` is empty.

## Codex

1. Extract the archive and open the resulting directory as a project.
2. Send this instruction:

> Read `IMPLEMENTATION.md` and implement the complete kit through all acceptance
> criteria. Do not stop at a description or scaffold.

## Hermes

1. Extract the archive and start Hermes in the resulting directory.
2. Send the same instruction.
3. After implementation, install the generated profile distributions by
   following `implementation/IMPLEMENTATION-RESULT.md`.

## Important boundary

Implementation does not authorize spending, publication, messages to people,
changes to live accounts, or activation of scheduled tasks without separate,
exact approval.
