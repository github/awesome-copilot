# Generation rules — v0.2

## Hybrid generation

1. Inspect destination repository and preserve existing files.
2. Generate the approved blueprint, decisions, prerequisites, and architecture.
3. Generate canonical instructor contract and independent Copilot, Codex, and Claude Code adapters.
4. Generate lessons and runnable assets in dependency order and validated batches.
5. Validate from the **generated repository root** (not merely the builder's example subdirectory); distinguish checks that cannot run.
6. Report completed, pending, observed, agent-reported, and unverified work separately.

## Implementation-first contract

- **Learner workspace:** Start with a minimal, runnable scaffold or deliberately incomplete exercise, not a fully solved application. Explicitly identify what works now and what the learner must implement.
- **Reference answers:** Keep completed code, expected SQL output, solution notebooks, or equivalent references separate from learner work when meaningful. Do not force a reference directory for conceptual or infrastructure-only exercises.
- **Progression:** Each lesson builds on earlier learner work; identify prerequisite state, concrete modifications, and what later lessons depend on.
- **Acceptance:** Every substantial exercise specifies observable acceptance criteria, exact verification commands (or manual steps), expected outcomes, and how to interpret failures.
- **Hints:** Give at least three increasingly specific hints for nontrivial exercises; keep full solutions out of the primary exercise and reveal them on request.
- **Failure engineering:** Include safe controlled failures and recovery at appropriate points, including state changes, retry safety, duplicate risks, and cleanup.
- **Trade-offs:** Explain current implementation vs learning simplification vs production design.

## Generated repository baseline

- README.md, AGENTS.md, CLAUDE.md, .github/copilot-instructions.md, .github/agents/lab-instructor.agent.md.
- course/instructor-contract.md, curriculum.md, prerequisites.md, progress.md, learning-record.yaml, decisions.md, lessons/.
- docs/architecture.md and appropriate troubleshooting/production notes.
- Runnable learner workspace, separate reference material when meaningful, tests/verification and a stack-appropriate consistency validator.
- CI workflow under **generated root** .github/workflows/ when repository hosting and runtime make CI feasible. Otherwise document why CI is inapplicable or blocked; do not generate a misleading workflow.
- All adapter files point to the shared instructor contract and progress records; none requires another assistant to function.

## Validation contract

Validate only what the environment supports and preserve commands and outcomes:
1. Structural: required files, no unresolved placeholders, links, lesson dependencies, time totals, assistant references, and starter/reference separation.
2. Executable: dependency installation, reference checks, starter baseline checks, syntax/lint, and stack-specific runtime smoke tests where safe and available.
3. CI: workflow location, working directories, commands, and trigger behavior from generated repository root; execute in CI when possible. Nested workflows are not active in the parent builder repository.
4. Portability: inspect all assistant adapters, then run real handoff tests if tools are available. File presence alone is not runtime proof.
5. Record **observed**, **reported**, **not run**, and **blocked** checks distinctly, including environment, warnings, failures, cleanup, and cost. Never call a defined workflow an executed workflow.

Do not overwrite user files without approval. No paid cloud, destructive, or production operation without separate authorization. Templates are starting points, not evidence of functioning output.
