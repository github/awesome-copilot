# v0.2 acceptance criteria

## Interview and approval
1. Extract known requirements, ask only material follow-ups, and show planning status.
2. Challenge infeasible scope, unnecessary complexity, budget and prerequisite conflicts.
3. Propose a dependency-ordered curriculum with implementation and failure/recovery exercises.
4. Wait for explicit approval before full generation.

## Generated lab
5. Generate a learner-first scaffold that is not secretly the finished solution.
6. Supply separate reference answers when useful; explain exceptions for SQL, IaC, conceptual and other stacks.
7. Give nontrivial lessons prerequisites, actual files, implementation tasks, measurable acceptance criteria, verification commands, progressive hints, failure recovery, and production trade-offs.
8. Make the Copilot instructor agent, Codex AGENTS.md, Claude CLAUDE.md, and shared instructor contract available independently.
9. Preserve learner-controlled completion, skipping, reopening, resetting, pace, and assessment overrides.
10. Keep self-reported progress, instructor assessment, and observed technical evidence distinct.

## Validation and integrity
11. Check generated structure and runnable behavior from the intended repository root; use stack-appropriate validation and CI when feasible.
12. Report commands, environment, outcomes, warnings, failures, skipped/blocked checks and unverified assistant compatibility honestly.
13. Preserve existing files; obtain authorization for paid/destructive operations.
14. Never equate file presence, unexecuted CI configuration, or self-report with proven runtime behavior or mastery.

Run representative scenarios in tests/scenarios.md; do not treat a numerical score as overriding integrity or safety failures.
