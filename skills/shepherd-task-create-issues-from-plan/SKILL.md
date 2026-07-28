---
name: shepherd-task-create-issues-from-plan
description: 'Use this skill to turn the ordered implementation section of an ignorance reduction plan into detailed, serial child Task issues under an existing GitHub parent issue, incorporating resolved research, spike artifacts, concrete example-issue style, branch instructions, gating tests, and verified sub-issue ordering. All 12 inputs are required.'
---

# Skill: Create Shepherd Task Issues from a Plan

## Purpose

Satisfy the `shepherd-task` precondition that a job specification is encoded as an ordered set of GitHub issues. Create one coding-agent-ready child issue for each direct task subsection in an ignorance reduction plan's implementation section, preserving build order and carrying the relevant resolved research into each issue.

The created issues are specifications, not summaries. A coding agent must be able to complete each issue without guessing about scope, prior decisions, files, tests, or completion criteria.

## Inputs (all required)

1. **`REPO`** — GitHub repository in `OWNER/REPO` format.
2. **`BASE_BRANCH`** — Non-`main` topic branch all task PRs target.
3. **`PARENT_ISSUE`** — Number or URL of the existing parent issue that children are linked to.
4. **`PLAN_DIRECTORY`** — Repo-relative path to the directory on `BASE_BRANCH` that contains the plan, spikes, and all supporting resources.
5. **`PLAN_FILE_NAME`** — Name of the ignorance reduction plan file within `PLAN_DIRECTORY`.
6. **`QUESTIONS_SECTION`** — Exact heading of the resolved "questions to answer before writing code" section in the plan.
7. **`IMPLEMENTATION_SECTION`** — Exact heading of the implementation/build-order section whose direct task subsections become child issues.
8. **`EXAMPLE_ISSUES`** — One or more issue numbers or URLs whose title/body style, specificity, and formatting establish the expected standard.
9. **`BASE_REMOTE`** — Remote name agents should use (e.g. `upstream` or `origin`).
10. **`ISSUE_TYPE`** — GitHub issue type for children (e.g. `Task`).
11. **`SUPPORTING_ARTIFACTS`** — Repo-relative paths or path constraints for spike reports, prototypes, screenshots, etc. that task issues must cite.
12. **`UPDATE_PLAN_CHECKBOXES`** — Whether to add progress checkboxes to the implementation section after successful issue creation (`true` or `false`).

## Fixed behaviors

- Use the signed-in `gh` CLI for all interactions with GitHub, especially creating the issues and setting them as child issues.
- Create one child per direct task subsection, in plan order.
- Leave every child unassigned. Work starts only when the user assigns each issue in turn.
- State that tasks are assigned, completed, and merged serially in the listed order.
- Require the agent to read the entire plan and explicitly list the exact sections to re-read.
- Include relevant `Resolution:` values and explicit directions for accessing relevant spike research or other artifacts.
- Add discriminating gating tests where they reduce downstream rework.
- Each issue must prominently include text stating that on the base branch, the `PLAN_DIRECTORY` contains the `PLAN_FILE_NAME` and supporting resources.
- Never write vague references such as "read the relevant sections"; enumerate exact headings.
- Never cite a resolution without its concrete value or operational consequence.

## Bundled examples

The following files in this skill directory are real prompts from prior campaigns where issues were created manually. Study them to understand the expected level of specificity, the instructions given to the coding agent, and the campaign-specific adaptations made in each case:

- [examples/01-1682-java-tool-ergonomics.md](./examples/01-1682-java-tool-ergonomics.md)
- [examples/02-1810-java-tool-as-lambda.md](./examples/02-1810-java-tool-as-lambda.md)
- [examples/03-dd-3017826-java-real-estate-demo.md](./examples/03-dd-3017826-java-real-estate-demo.md)
- [examples/04-28-python-agent-demo.md](./examples/04-28-python-agent-demo.md)

When creating issues, produce issue bodies at least as specific and structured as those examples demand.

## Procedure

### Step 1: Validate the invocation

1. Verify `BASE_BRANCH` is not `main` or the repository's default branch.
2. Verify `BASE_BRANCH` exists.
3. Verify `PARENT_ISSUE` exists, is open, and belongs to `REPO`.
4. Discover the repository owner's issue types. Verify `ISSUE_TYPE` exists and is enabled.
5. Read `PLAN_DIRECTORY/PLAN_FILE_NAME` from `BASE_BRANCH`. Prefer `git show "$BASE_BRANCH:$PLAN_DIRECTORY/$PLAN_FILE_NAME"`; fall back to `gh api`.
6. Verify both `QUESTIONS_SECTION` and `IMPLEMENTATION_SECTION` headings occur exactly once.
7. Verify every question that gates implementation has a non-empty `Resolution:`. If any is unresolved, stop and list blockers.

### Step 2: Study examples and existing children

1. Fetch every `EXAMPLE_ISSUES` issue body. Extract conventions for structure, specificity, and formatting.
2. List current children of `PARENT_ISSUE` via `gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues"`.
3. The workflow is idempotent — do not create duplicates. Stop and report ambiguous matches.

### Step 3: Build a traceability map

For each direct child heading beneath `IMPLEMENTATION_SECTION`:

1. Exact subsection number and title.
2. Files, APIs, behavior to build or change.
3. Tests and gating criteria from the plan.
4. Prerequisite task (if not the first).
5. Every question/resolution from `QUESTIONS_SECTION` that constrains this task — with concrete resolution values.
6. Relevant spike reports, prototypes, screenshots within `PLAN_DIRECTORY` and `SUPPORTING_ARTIFACTS`.
7. Additional gating tests that catch contract, integration, or regression failures before the next serial task starts.

### Step 4: Draft all issues before creating any

Each issue body must include:

- A prominent statement: "On the `BASE_BRANCH` branch, the directory `PLAN_DIRECTORY` contains the plan (`PLAN_FILE_NAME`) and supporting resources (spikes, prototypes, diagrams)."
- Instruction to read the entire plan before working.
- Exact section headings to re-read, with relevant resolved decisions spelled out.
- Explicit paths to spike research and artifacts within `PLAN_DIRECTORY`.
- Branch and execution order instructions.
- Concrete specification of what to build.
- Tests and gating criteria.
- Out-of-scope boundaries.

Title each issue with its implementation subsection identity and an actionable outcome.

### Step 5: Create and link issues in order

Write each body to a temporary file. Create issues with the REST API so the issue type is set at creation:

```bash
gh api "repos/$REPO/issues" \
  -X POST \
  -f title="$TITLE" \
  -f body=@"$BODY_FILE" \
  -f type="$ISSUE_TYPE" \
  --jq '{id,number,node_id,html_url,title}'
```

Link using integer `sub_issue_id`:

```bash
printf '{"sub_issue_id": %s}' "$CHILD_ID" | \
  gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues" -X POST --input -
```

Create and link one at a time in plan order. On linking failure, retry up to 3 times. If still fails, stop immediately.

### Step 6: Verify postconditions

- Child count increased by expected number.
- Each implementation subsection has exactly one child.
- Child order matches plan order.
- Every child has `ISSUE_TYPE`, is open, has no assignees.

If `UPDATE_PLAN_CHECKBOXES=true`, add progress checkboxes to the implementation section.

### Step 7: Report the ordered handoff

Return:
1. Ordered table of implementation subsection, issue number, title, URL.
2. Comma-separated child issue numbers for `shepherd-task-given-list`.
3. Suggested invocation using `BASE_BRANCH` and `REPO`.

## Guardrails

- Never create issues from unresolved implementation decisions.
- Never target `main` or the default branch.
- Never assign the created issues.
- Never collapse multiple subsections into one issue or split one subsection without explicit user approval.
- Never write vague references — enumerate exact headings.
- Never cite a resolution without its concrete value.
- Never invent spike findings — cite available evidence or identify missing evidence as a blocker.
- Never continue after a partial creation/linking failure.
- Do not run `shepherd-task` or assign Copilot. This skill only creates and verifies the ordered issue backlog.
