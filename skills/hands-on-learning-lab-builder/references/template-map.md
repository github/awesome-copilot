# Generated artifact mapping — v0.2

Templates in assets/templates/ are **source templates**, not ready-to-run files. Replace all `{{PLACEHOLDER}}` values with course-specific content.

| Source template | Generated destination |
| --- | --- |
| README.md | README.md |
| instructor-contract.md | course/instructor-contract.md |
| copilot-instructor.agent.md | .github/agents/lab-instructor.agent.md |
| copilot-instructions.md | .github/copilot-instructions.md |
| codex-AGENTS.md | AGENTS.md |
| claude-CLAUDE.md | CLAUDE.md |
| curriculum.md | course/curriculum.md |
| lesson.md | course/lessons/lesson-NN.md |
| progress.md | course/progress.md |
| learning-record.yaml | course/learning-record.yaml |
| decisions.md | course/decisions.md |

Also generate course/prerequisites.md, docs/architecture.md, real stack-specific learner starter assets, reference answers when useful, tests/verification, and a consistency validator. When feasible, generate .github/workflows/validate.yml **at the root of the standalone generated repository**, with correct paths. A nested workflow in a sample directory is not discovered by GitHub Actions in its parent repository.

Validate links, placeholders, dependencies, lesson time totals, assistant references, starter/reference separation, and executable checks. If a requirement is inapplicable to the selected stack, document the alternative and why.
