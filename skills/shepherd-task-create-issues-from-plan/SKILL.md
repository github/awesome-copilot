---
name: shepherd-task-create-issues-from-plan
description: 'Use this skill to turn the ordered implementation section of an ignorance reduction plan into detailed, serial child Task issues under an existing GitHub parent issue, incorporating resolved research, spike artifacts, concrete example-issue style, branch instructions, gating tests, persistent run artifacts, and verified sub-issue ordering. All 12 inputs are required.'
---

# Skill: Create Shepherd Task Issues from a Plan

## Purpose

Satisfy the `shepherd-task` precondition that a job specification is encoded as an ordered set of GitHub issues. Create one coding-agent-ready child issue for each direct task subsection in an ignorance reduction plan's implementation section, preserving build order and carrying the relevant resolved research into each issue.

The created issues are specifications, not summaries. A coding agent must be able to complete each issue without guessing about scope, prior decisions, files, tests, or completion criteria.

## Inputs (all required)

1. **`REPO`** — GitHub repository in `OWNER/REPO` format.
2. **`BASE_BRANCH`** — Non-`main` topic branch all task PRs target.
3. **`PARENT_ISSUE`** — Positive integer issue number of the existing parent issue that children are linked to. URLs are not accepted.
4. **`PLAN_DIRECTORY`** — Repo-relative path to the directory on `BASE_BRANCH` that contains the plan, spikes, and all supporting resources.
5. **`PLAN_FILE_NAME`** — Name of the ignorance reduction plan file within `PLAN_DIRECTORY`.
6. **`QUESTIONS_SECTION`** — Exact heading of the resolved "questions to answer before writing code" section in the plan.
7. **`IMPLEMENTATION_SECTION`** — Exact heading of the implementation/build-order section whose direct task subsections become child issues.
8. **`EXAMPLE_ISSUES`** — One or more comma-separated full GitHub issue URLs whose title/body style, specificity, and formatting establish the expected standard. Bare issue numbers are not accepted.
9. **`BASE_REMOTE`** — Remote name agents should use (e.g. `upstream` or `origin`).
10. **`ISSUE_TYPE`** — GitHub issue type for children (e.g. `Task`).
11. **`SUPPORTING_ARTIFACTS`** — Repo-relative paths or path constraints for spike reports, prototypes, screenshots, etc. that task issues must cite.
12. **`LOG_DIRECTORY`** — Absolute path to the existing run log directory. The launcher supplies this input; store all drafted issue bodies and the creation ledger here.

## Fixed behaviors

- Use the signed-in `gh` CLI for all interactions with GitHub, especially creating the issues and setting them as child issues.
- Create one child per direct task subsection, in plan order.
- Leave every child unassigned. Work starts only when the user assigns each issue in turn.
- State that tasks are assigned, completed, and merged serially in the listed order.
- Require the agent to read the entire plan and explicitly list the exact sections to re-read.
- Include relevant `Resolution:` values and explicit spike **findings** stated as prose — never as paths to spike source files or instructions to read/copy spike code (see "Spike firewall" section).
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

1. Verify `PARENT_ISSUE` matches `^[1-9][0-9]*$`. Reject URLs and other non-numeric values.
2. Split `EXAMPLE_ISSUES` on commas and trim surrounding whitespace from each item. Verify the list is non-empty and every item is a full GitHub issue URL matching `https://github.com/OWNER/REPO/issues/NUMBER`. Reject bare issue numbers, pull request URLs, and other URL forms.
3. Verify `LOG_DIRECTORY` is an absolute path to an existing writable directory. Create `LOG_DIRECTORY/issue-bodies`; fail before creating any GitHub issues if this cannot be done.
4. Verify `BASE_BRANCH` is not `main` or the repository's default branch.
5. Verify `BASE_BRANCH` exists.
6. Verify `PARENT_ISSUE` exists, is open, and belongs to `REPO`.
7. Discover the repository owner's issue types. Verify `ISSUE_TYPE` exists and is enabled.
8. Read `PLAN_DIRECTORY/PLAN_FILE_NAME` from `BASE_BRANCH`. Prefer `git show "$BASE_BRANCH:$PLAN_DIRECTORY/$PLAN_FILE_NAME"`; fall back to `gh api`.
9. Verify both `QUESTIONS_SECTION` and `IMPLEMENTATION_SECTION` headings occur exactly once.
10. Verify every question that gates implementation has a non-empty resolution block:
  - Treat `Resolution:` as a marker, not as a single-line value. Its block includes content on the marker line and all following paragraphs, lists, tables, code blocks, and other Markdown until the next peer question/subsection heading or the end of `QUESTIONS_SECTION`.
  - A standalone `**Resolution:**` line followed by substantive block content is resolved. Never classify it as empty merely because no value appears on the marker line, and never use a same-line-only regular expression as the resolution check.
  - After ignoring blank lines and Markdown formatting delimiters, classify a resolution as unresolved only when its entire block has no substantive content or explicitly states that the gating decision remains unresolved.
  - Before stopping, list each blocking question and quote its complete parsed resolution block, or explicitly state that no resolution block exists. If the block contains a concrete decision, answer, or operational consequence, do not report that question as unresolved.

### Step 2: Study examples and existing children

1. Parse each URL in `EXAMPLE_ISSUES` into its owner, repository, and issue number. Fetch every issue body and extract conventions for structure, specificity, and formatting.
2. List current children of `PARENT_ISSUE` via `gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues"` and retain their issue IDs and numbers as the pre-creation baseline.
3. Treat issue creation as a one-shot operation, not an idempotent or resumable operation. Do not infer matches between existing children and implementation subsections.

### Step 3: Build a traceability map

For each direct child heading beneath `IMPLEMENTATION_SECTION`:

1. Exact subsection number and title.
2. Files, APIs, behavior to build or change.
3. Tests and gating criteria from the plan.
4. Prerequisite task (if not the first).
5. Every question/resolution from `QUESTIONS_SECTION` that constrains this task — with concrete resolution values.
6. Relevant spike **findings** (decisions, constraints, rejected approaches) from `PLAN_DIRECTORY` and `SUPPORTING_ARTIFACTS` — extracted as prose, never as source file references (see "Spike firewall" section).
7. Additional gating tests that catch contract, integration, or regression failures before the next serial task starts.

### Step 4: Draft all issues before creating any

Each issue body must include:

- A prominent statement: "On the `BASE_BRANCH` branch, the directory `PLAN_DIRECTORY` contains the plan (`PLAN_FILE_NAME`) and supporting resources (diagrams, decision records). Spike subdirectories are research artifacts — read the plan's Resolution sections for findings, not the spike source code."
- Instruction to read the entire plan before working.
- Exact section headings to re-read, with relevant resolved decisions spelled out.
- Explicit spike **findings** relevant to the task, stated as prose in the issue body — never as paths to spike source files (see "Spike firewall" section).
- Branch and execution order instructions.
- Concrete specification of what to build.
- Tests and gating criteria.
- Out-of-scope boundaries.

Title each issue with its implementation subsection identity and an actionable outcome.

### Step 5: Create and link issues in order

Before creating the first issue, write every drafted body to `LOG_DIRECTORY/issue-bodies/NN-SUBSECTION-body.md`, where `NN` is its zero-padded creation order and `SUBSECTION` is a filesystem-safe form of the implementation subsection identity. Verify that the expected number of non-empty body files exists. Never write issue bodies to a temporary directory and never delete these files.

Create issues with the REST API so the issue type is set at creation. Use `-F/--field`, not `-f/--raw-field`, for `body=@...`; only `-F` reads the body from the referenced file:

```bash
gh api "repos/$REPO/issues" \
  -X POST \
  -f title="$TITLE" \
  -F "body=@$BODY_FILE" \
  -f type="$ISSUE_TYPE" \
  --jq '{id,number,node_id,html_url,title}'
```

Link using integer `sub_issue_id`:

```bash
printf '{"sub_issue_id": %s}' "$CHILD_ID" | \
  gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues" -X POST --input -
```

Before creating the first issue, initialize `LOG_DIRECTORY/creation-ledger.json` as a JSON array. Immediately after each successful create call, append the implementation subsection, body-file path, returned issue ID, number, title, and URL with `body_verified=false` and `linked=false`, then persist the ledger. Never keep the ledger only in memory.

Before linking the new issue, fetch its body from GitHub and verify it exactly equals the complete contents of `BODY_FILE` (allowing only a single trailing newline difference). If it differs, record the observed body in `LOG_DIRECTORY/issue-bodies/NN-SUBSECTION-observed-body.md` and enter the failure flow without creating another issue. After a match, set `body_verified=true` and persist the ledger. Immediately after successfully linking it, set `linked=true` and persist the ledger.

Create and link one at a time in plan order. On linking failure, retry up to 3 times. If any create, link, or postcondition-verification step fails:

1. Stop immediately. Do not create, link, edit, or delete anything else.
2. Use read-only GitHub queries to reconcile every ledger entry against current repository and parent-child state. Update each `linked` value from observed server state.
3. Report the failed operation and its error.
4. Print the complete reconciled creation ledger in creation order, including issue number, title, URL, body-file path, `body_verified`, and whether it was linked to `PARENT_ISSUE`.
5. Print one cleanup command per created issue:

   ```bash
   gh issue delete ISSUE_NUMBER --repo "$REPO" --yes
   ```

6. Tell the invoking user that the operation did not complete, that the skill performed no automatic rollback, and that they must delete every issue in the ledger before invoking the skill again.

If the ledger is empty, explicitly report that no issues were created and no cleanup is required.

### Step 6: Verify postconditions

- Relative to the pre-creation baseline, the child count increased by exactly the number of ledger entries.
- Every ledger entry is linked exactly once and corresponds, in creation order, to one implementation subsection.
- The newly linked child order matches plan order.
- Every issue in the ledger has a body exactly matching its persisted body file, has `ISSUE_TYPE`, is open, and has no assignees.

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
- Never attempt automatic rollback or resume a partial run. Report the creation ledger and cleanup commands, then stop.
- Never rerun after a partial failure until the invoking user confirms that every issue in the creation ledger has been deleted.
- Do not run `shepherd-task` or assign Copilot. This skill only creates and verifies the ordered issue backlog.

## Spike firewall — findings vs. code

Spikes and research artifacts exist to **inform decisions**, not to be transplanted into production code. Every issue body must enforce this distinction.

### What to carry forward from spikes

- **Findings:** Concrete decisions, constraints, and patterns discovered during research (e.g., "PipedInputStream is rejected because JNA creates a new thread per callback invocation — use QueueInputStream instead").
- **Resolutions:** The `Resolution:` blocks from the plan's questions section, with their concrete values and operational consequences.
- **Architectural patterns:** High-level design shapes proven by spikes (e.g., "multi-release JAR with platform-thread reader on JDK 17 and virtual-thread reader on JDK 25").
- **Negative results:** What was tried and rejected, and why (e.g., "GraalVM native-image callback invocation fails — do not pursue").

### What must NOT appear in issue bodies

- **Spike source file paths as implementation references.** Never tell the agent to "read" or "use" spike source files as templates for production code. Spike code is throwaway.
- **Spike class names, method names, or variable names.** Never reference spike-internal identifiers (e.g., `CallbackTestLib`, `SPIKE_LIB_PATH`, `libcallback_test.so`) as things to use, adapt, or copy.
- **Spike test helpers or test libraries.** Never direct the agent to reuse spike test infrastructure in production tests. Production tests must exercise production code with production dependencies.
- **Spike directory paths as working directories.** The `PLAN_DIRECTORY` contains the plan and may contain spike subdirectories; issue bodies must reference the plan and its resolutions, not the spike subdirectories themselves.

### How to reference spikes in issue bodies

When a spike's findings are relevant to a task, the issue body must:

1. State the **finding** in the issue body itself, with enough detail that the agent can implement without reading the spike code.
2. Optionally note that the finding was "established by research in `PLAN_DIRECTORY`" for human traceability.
3. Never instruct the agent to open, read, copy from, or adapt spike source files.

**Anti-pattern (causes spike pollution):**
> Read the spike at `spike-3-4-jna-callback-and-threading/java-program-that-invokes-rust-dll-mr-jar-17-25/` and use its approach.

**Correct pattern:**
> The spike established that `QueueInputStream` (a `BlockingQueue<byte[]>`-backed `InputStream`) is the correct approach for piping callback data into Java. `PipedInputStream` is rejected because JNA creates a new short-lived thread per callback invocation, and `PipedInputStream.writeSide.isAlive()` fails when the writing thread terminates. On JDK 25, the reader thread should be a virtual thread via `Thread.ofVirtual()`; on JDK 17, a platform thread. Implement this pattern from scratch using production dependencies.
