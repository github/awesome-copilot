# Controlled JavaScript replay

Use `run_controlled_replay` only for operator-selected extracted modules when
the separate replay policy is enabled. Call `mode: plan` first. Review the exact
module, stub, runtime, sandbox, case, limits, and policy commitments. Execute
only with `approved: true` and that exact plan digest.

Treat return values, exceptions, denials, limits, and crashes as observations of
the isolated experiment with controlled-replay authority, not facts about the
real application. Never substitute browser/Electron permission, process
capture, or an in-process `vm` run. Reproducer export requires separate literal
approval and evidence-write authority after sandbox cleanup.
