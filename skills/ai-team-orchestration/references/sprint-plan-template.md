# Work Plan Template

Use this for substantial work. Small, clear changes can proceed directly from the issue or request.

```markdown
# [Work Item] - Plan

## Goal

[One observable outcome.]

## Context

- Relevant issue/request: [link or summary]
- Repository instructions: [links]
- Important constraints: [list]

## In Scope

- [deliverable]

## Out of Scope

- [explicit exclusion]

## Tasks

1. [task]
2. [task]
3. [task]

## Acceptance Criteria

- [ ] [observable behavior]
- [ ] Relevant repository checks pass (example: `npm run lint`, `npm test`)
- [ ] Tests covering the change are added or validated
- [ ] Documentation/context is updated when behavior or operation changed

## Verification

- Automated: [commands or checks]
  - Example: `npm ci && npm run test` or `pytest -q`
  - Example: `npm run lint && npm run build`
- Manual: [focused scenarios, if useful]
- Independent review: required / optional / not needed - [reason]
- QA: required / optional / not needed - [reason]

## PR Checklist (add to PR body)

- Branch name follows repo policy (e.g., `feat/`, `fix/`, or `chore/`)
- Description: short summary, why, and acceptance criteria
- Verification steps included (commands & manual checks)
- Tests added or existing tests updated
- Relevant docs/PROJECT_BRIEF updated if behavior changed
- Reviewers: @team or specific owners
- Required checks: list CI jobs that must pass
- Release notes / changelog entry: yes/no

## Risks and Decisions

- [risk or material decision]

## QA risk matrix (when to require QA)

- High impact × High uncertainty = QA required
- High impact × Low uncertainty = QA recommended
- Low impact × High uncertainty = QA recommended
- Low impact × Low uncertainty = QA optional

## Next Action

[owner and immediate next step]
```

## Progress Note

For long-running work, keep a short progress note:

```markdown
# [Work Item] - Progress

- Completed: [items]
- In progress: [item]
- Blocked: [issue or none]
- Decisions: [material decisions]
- Verification so far: [results]
- Next action: [specific action]
```

## Dev Handoff

```text
Read the repository instructions, PROJECT_BRIEF.md when present, and this plan.
Implement the in-scope work, run the listed verification, update durable context
when needed, and prepare a pull request. Do not merge.
```
