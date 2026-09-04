---
name: shepherd-task-20-create-issues-from-plan
description: 'Stage 20 of the shepherd-task campaign lifecycle (creation of ordered implementation issues). Use this skill to turn the ordered implementation section of an ignorance reduction plan into detailed, serial child issues under an existing GitHub parent issue, preferring the Task issue type when the repository supports it. Incorporates resolved research, campaign lesson mode, spike artifacts, branch instructions, gating tests, persistent run artifacts, and verified sub-issue ordering. All 14 inputs are required. Skip this stage when suitable implementation issues already exist.'
---

# Skill: Create Shepherd Task Issues from a Plan (shepherd-task stage 20 — creation of ordered implementation issues)

## Purpose

This is stage 20 of the ordered shepherd-task campaign lifecycle (00 → 10 → 15 → 20 → 25 → 30 → 40 → 50): creation of ordered implementation issues. Satisfy the `shepherd-task` precondition that a job specification is encoded as an ordered set of GitHub issues. Create one coding-agent-ready child issue for each direct task subsection in an ignorance reduction plan's implementation section, preserving build order and carrying the relevant resolved research into each issue.

This stage (and stage 10) is only needed when a campaign does not yet have an ordered set of implementation issues. If suitable issues already exist, skip directly to stage 30 (`shepherd-task-30-from-assignment-to-ready`).

The created issues are specifications, not summaries. A coding agent must be able to complete each issue without guessing about scope, prior decisions, files, tests, or completion criteria.

## Inputs (all required)

1. **`REPO`** — GitHub repository in `OWNER/REPO` format.
2. **`BASE_BRANCH`** — Non-`main` topic branch all task PRs target.
3. **`PARENT_ISSUE`** — Positive integer issue number of the existing parent issue that children are linked to. URLs are not accepted.
4. **`PLAN_DIRECTORY`** — Repo-relative path to the directory on `BASE_BRANCH` that contains the plan, spikes, and all supporting resources.
5. **`PLAN_FILE_NAME`** — Name of the ignorance reduction plan file within `PLAN_DIRECTORY`.
6. **`QUESTIONS_SECTION`** — Exact heading of the resolved "questions to answer before writing code" section in the plan.
7. **`IMPLEMENTATION_SECTION`** — Exact heading of the implementation/build-order section whose direct task subsections become child issues.
8. **`EXPECTED_TASK_COUNT`** — Positive integer count of direct task headings discovered beneath `IMPLEMENTATION_SECTION`.
9. **`BASE_REMOTE`** — Remote name matching `REPO`; the stage 15 preparation script derives it from configured Git remote URLs.
10. **`LOG_DIRECTORY`** — Absolute path to the existing run log directory. The launcher supplies this input; store all drafted issue bodies, the creation ledger, and the stage result here.
11. **`CAMPAIGN_ID`** — Canonical campaign UUID from `PLAN_DIRECTORY/shepherd-campaign.json`.
12. **`LESSON_PROPAGATION`** — Immutable campaign mode, exactly `off` or `campaign`.
13. **`DRAFT_VALIDATOR`** — Absolute path to the platform-specific `validate-stage20-drafts.ps1` or `validate-stage20-drafts.sh` script supplied by the stage 15 launcher.
14. **`ISSUE_BODY_VERIFIER`** — Absolute path to the platform-specific `verify-github-issue-body.ps1` or `verify-github-issue-body.sh` script supplied by the stage 15 launcher.

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
- Prefer the enabled `Task` issue type when the repository owner provides it; otherwise create ordinary untyped issues.
- In `campaign` mode, every issue must tell CCA to consume validated campaign lessons and contribute candidate lessons. In `off` mode, omit all lesson consumption and production instructions.

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
2. Verify `LOG_DIRECTORY` is an absolute path to an existing writable directory. Create `LOG_DIRECTORY/issue-bodies`; fail before creating any GitHub issues if this cannot be done.
3. Verify `DRAFT_VALIDATOR` and `ISSUE_BODY_VERIFIER` are absolute paths to existing platform-appropriate scripts. On Bash, both must be executable.
4. Verify `BASE_BRANCH` is not `main` or the repository's default branch.
5. Verify `BASE_BRANCH` exists.
6. Verify `BASE_REMOTE` exists and its configured GitHub URL matches `REPO`.
7. Verify `PARENT_ISSUE` exists, is open, and belongs to `REPO`.
8. Determine whether `REPO` supports an enabled issue type named exactly `Task`:
   - Read the repository owner's login and type from `gh api "repos/$REPO"`.
   - If the owner type is `Organization`, query `gh api "orgs/$OWNER/issue-types"`. If the request succeeds and contains an entry whose `name` is exactly `Task` and whose `is_enabled` value is `true`, set `SELECTED_ISSUE_TYPE=Task`. If it succeeds without such an entry, leave `SELECTED_ISSUE_TYPE` empty.
   - If the owner type is `User`, leave `SELECTED_ISSUE_TYPE` empty because organization issue types are unavailable.
   - Fail on repository lookup errors, unrecognized owner types, or organization issue-type lookup errors. Do not turn authentication, authorization, or transient API failures into an untyped-success fallback.
   - Report whether child issues will use `Task` or be created without an issue type before creating anything.
9. Read `PLAN_DIRECTORY/PLAN_FILE_NAME` from `BASE_BRANCH`. Prefer `git show "$BASE_BRANCH:$PLAN_DIRECTORY/$PLAN_FILE_NAME"`; fall back to `gh api`.
10. Verify both `QUESTIONS_SECTION` and `IMPLEMENTATION_SECTION` headings occur exactly once.
11. Verify `EXPECTED_TASK_COUNT` is a positive integer and exactly equals the number of direct task headings beneath `IMPLEMENTATION_SECTION`.
12. Verify every question that gates implementation has a non-empty resolution block:
  - Treat `Resolution:` as a marker, not as a single-line value. Its block includes content on the marker line and all following paragraphs, lists, tables, code blocks, and other Markdown until the next peer question/subsection heading or the end of `QUESTIONS_SECTION`.
  - A standalone `**Resolution:**` line followed by substantive block content is resolved. Never classify it as empty merely because no value appears on the marker line, and never use a same-line-only regular expression as the resolution check.
  - After ignoring blank lines and Markdown formatting delimiters, classify a resolution as unresolved only when its entire block has no substantive content or explicitly states that the gating decision remains unresolved.
  - Before stopping, list each blocking question and quote its complete parsed resolution block, or explicitly state that no resolution block exists. If the block contains a concrete decision, answer, or operational consequence, do not report that question as unresolved.
13. Read `PLAN_DIRECTORY/shepherd-campaign.json` from `BASE_BRANCH`. Verify its `campaignId` and `lessonPropagation` exactly match `CAMPAIGN_ID` and `LESSON_PROPAGATION`, and verify `campaign-lessons.md` exists.

### Step 2: Study bundled examples and existing children

1. Study every issue example bundled with this skill and extract conventions for structure, specificity, and formatting. Do not require external example-issue URLs.
2. List current children of `PARENT_ISSUE` via `gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues"` and retain their issue IDs and numbers as the pre-creation baseline.
3. Treat issue creation as a one-shot operation, not an idempotent or resumable operation. Do not infer matches between existing children and implementation subsections.

### Step 3: Build a traceability map

For each direct child heading beneath `IMPLEMENTATION_SECTION`:

1. Exact subsection number and title.
2. Files, APIs, behavior to build or change.
3. Tests and gating criteria from the plan.
4. Prerequisite task (if not the first).
5. Every question/resolution from `QUESTIONS_SECTION` that constrains this task — with concrete resolution values.
6. Relevant spike **findings** (decisions, constraints, rejected approaches) from `PLAN_DIRECTORY` and resources referenced by the plan — extracted as prose, never as source file references (see "Spike firewall" section).
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

When `LESSON_PROPAGATION=campaign`, also include this prominent required section, substituting actual values:

```markdown
## Campaign lessons (REQUIRED)

Campaign ID: `CAMPAIGN_ID`.

Before implementation, read `PLAN_DIRECTORY/campaign-lessons.md` from `BASE_BRANCH`.
Treat only entries under `Validated lessons` as advisory context; the issue specification and repository instructions remain authoritative.

Before declaring the task complete, update that same file in this PR by adding a
`Candidate lessons for issue #<this issue's actual number>` section. Record only concise,
reusable repository discoveries, failed approaches worth avoiding, commands
that actually passed, and non-obvious constraints. Include applicability and
evidence. Do not include raw reasoning, secrets, complete trajectories, or
speculation. Preserve all existing validated lessons.
```

When `LESSON_PROPAGATION=off`, do not mention the lessons file or ask CCA to read or modify it.

Title each issue with its implementation subsection identity and an actionable outcome.

### Step 5: Create and link issues in order

Before creating the first issue, write every drafted body to `LOG_DIRECTORY/issue-bodies/NN-SUBSECTION-body.md`, where `NN` is its zero-padded creation order and `SUBSECTION` is a filesystem-safe form of the implementation subsection identity. Never write issue bodies to a temporary directory and never delete these files.

Invoke `DRAFT_VALIDATOR` against `LOG_DIRECTORY/issue-bodies`, passing `EXPECTED_TASK_COUNT` and `LESSON_PROPAGATION`, before the first GitHub mutation. Re-read every persisted body from disk as part of that validation. Fail before creating any issue unless all of these checks pass:

```powershell
& $DRAFT_VALIDATOR `
  -BodyDirectory (Join-Path $LOG_DIRECTORY 'issue-bodies') `
  -ExpectedCount $EXPECTED_TASK_COUNT `
  -LessonPropagation $LESSON_PROPAGATION
```

```bash
"$DRAFT_VALIDATOR" \
  "$LOG_DIRECTORY/issue-bodies" \
  "$EXPECTED_TASK_COUNT" \
  "$LESSON_PROPAGATION"
```

- Exactly `EXPECTED_TASK_COUNT` non-empty `*-body.md` files exist.
- Every file contains physical newline characters and more than one physical line.
- The first nonblank line is a level-two Markdown heading.
- Every required level-two section heading begins at the start of its own physical line.
- The re-read content contains the complete drafted specification; do not validate only a whitespace-normalized or in-memory copy.

If a tool flattened Markdown into one line, repair and re-read every affected file before proceeding.

Create issues with the REST API. Use `-F/--field`, not `-f/--raw-field`, for `body=@...`; only `-F` reads the body from the referenced file.

When `SELECTED_ISSUE_TYPE=Task`, set the type at creation:

```bash
gh api "repos/$REPO/issues" \
  -X POST \
  -f title="$TITLE" \
  -F "body=@$BODY_FILE" \
  -f type="$SELECTED_ISSUE_TYPE" \
  --jq '{id,number,node_id,html_url,title}'
```

When `SELECTED_ISSUE_TYPE` is empty, omit the `type` field entirely:

```bash
gh api "repos/$REPO/issues" \
  -X POST \
  -f title="$TITLE" \
  -F "body=@$BODY_FILE" \
  --jq '{id,number,node_id,html_url,title}'
```

Link using integer `sub_issue_id`:

```bash
printf '{"sub_issue_id": %s}' "$CHILD_ID" | \
  gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues" -X POST --input -
```

Before creating the first issue, initialize `LOG_DIRECTORY/creation-ledger.json` as a JSON array. Also initialize `LOG_DIRECTORY/stage-20-result.json` with this shape:

```json
{
  "schemaVersion": 1,
  "status": "in_progress",
  "ledgerFile": "creation-ledger.json",
  "operationError": null
}
```

Write both JSON documents atomically. Immediately after each successful create call, append an object to the ledger with these exact fields: `implementationSubsection`, `bodyFile`, `id`, `number`, `title`, `url`, `body_verified`, and `linked`. Store `bodyFile` as a path relative to `LOG_DIRECTORY`, set `body_verified=false` and `linked=false`, then persist the ledger. Never keep the ledger only in memory.

On PowerShell, preserve the ledger as a flat object array for zero, one, and multiple entries. Use `ConvertFrom-Json -NoEnumerate`, verify that the JSON root is an array, reject nested array entries, and return entries normally:

```powershell
function Read-CreationLedger {
    $parsed = [IO.File]::ReadAllText($ledgerPath) |
        ConvertFrom-Json -NoEnumerate
    if ($parsed -isnot [System.Array]) {
        throw 'Creation ledger JSON root must be an array.'
    }

    $ledger = [object[]]$parsed
    if (@($ledger | Where-Object { $_ -is [System.Array] }).Count -ne 0) {
        throw 'Creation ledger must not contain nested array entries.'
    }
    return $ledger
}

$ledger = @(Read-CreationLedger)
```

Never use unary-comma returns such as `return ,([object[]]@())` or `return ,@(...)`; when the caller uses `@(...)`, those forms turn an empty ledger or the complete parsed ledger into one nested array entry. When writing, pass an explicit array to `ConvertTo-Json -InputObject`, including for zero or one entry, so the persisted JSON root remains an array:

```powershell
$json = ConvertTo-Json -InputObject ([object[]]$ledger) -Depth 10
```

For every PowerShell native command, including read-only reconciliation calls, capture output and then capture `$LASTEXITCODE` immediately before piping, parsing, formatting, or invoking another command. For example:

```powershell
$childrenOutput = & gh api "repos/$REPO/issues/$PARENT_ISSUE/sub_issues" --paginate 2>&1
$childrenExitCode = $LASTEXITCODE
if ($childrenExitCode -ne 0) {
    throw "Unable to query parent children: $($childrenOutput | Out-String)"
}
$serverChildren = @(($childrenOutput | Out-String) | ConvertFrom-Json)
```

Never use `gh ... | ConvertFrom-Json` and then inspect `$LASTEXITCODE`; the PowerShell transformation can obscure the native command result.

Before linking the new issue, invoke `ISSUE_BODY_VERIFIER` to fetch the complete issue through the GitHub REST API and verify that its body exactly equals `BODY_FILE`. The verifier normalizes CRLF and CR to LF, permits only a single trailing newline difference, and retries read-only fetch/comparison failures up to six times with five-second delays. It does not retry authentication or authorization failures.

```powershell
$issue = & $ISSUE_BODY_VERIFIER `
  -Repository $REPO `
  -IssueNumber $ISSUE_NUMBER `
  -ExpectedBodyPath $BODY_FILE `
  -MaxAttempts 6 `
  -DelaySeconds 5 `
  -DiagnosticPath (Join-Path $LOG_DIRECTORY "issue-$ISSUE_NUMBER-body-verification-failure.json")
```

```bash
issue_json="$(
  "$ISSUE_BODY_VERIFIER" \
    "$REPO" \
    "$ISSUE_NUMBER" \
    "$BODY_FILE" \
    6 \
    5 \
    "$LOG_DIRECTORY/issue-$ISSUE_NUMBER-body-verification-failure.json"
)"
```

Do not replace the verifier with `gh issue view`, GraphQL, `--jq '.body'` captured into PowerShell, or whitespace trimming. On final failure, preserve the verifier's metadata-only diagnostic and enter the failure flow without creating another issue. After a match, set `body_verified=true` and persist the ledger. Immediately after successfully linking it, set `linked=true` and persist the ledger.

Create and link one at a time in plan order. On linking failure, retry up to 3 times. If any create, link, or postcondition-verification step fails:

1. Stop immediately. Do not create, link, edit, or delete anything else.
2. Use read-only GitHub queries to reconcile every ledger entry against current repository and parent-child state. Update each `linked` value from observed server state.
3. Atomically write `stage-20-result.json` with `status` set to `failed` and `operationError` set to the failed operation and error. Preserve the other fields and schema shown above. Do not duplicate issue identities in this document; `creation-ledger.json` is their single source of truth.
4. Report the failed operation and its error.
5. Print the complete reconciled creation ledger in creation order, including issue number, title, URL, body-file path, `body_verified`, and whether it was linked to `PARENT_ISSUE`.
6. Print one cleanup command per created issue:

   ```bash
   gh issue delete ISSUE_NUMBER --repo "$REPO" --yes
   ```

7. Tell the invoking user that the operation did not complete, that the skill performed no automatic rollback, and that they must delete every issue in the ledger before invoking the skill again.

If the ledger is empty, explicitly report that no issues were created and no cleanup is required.

### Step 6: Verify postconditions

- Relative to the pre-creation baseline, the child count increased by exactly the number of ledger entries.
- Every ledger entry is linked exactly once and corresponds, in creation order, to one implementation subsection.
- The newly linked child order matches plan order.
- Every issue in the ledger has a body exactly matching its persisted body file, is open, and has no assignees. Invoke `ISSUE_BODY_VERIFIER` again for each final body check; do not substitute a GraphQL or single-attempt read.
- When `SELECTED_ISSUE_TYPE=Task`, every created issue has type `Task`. When it is empty, no issue-type postcondition is required.
- After every other postcondition passes, atomically write `stage-20-result.json` with `status` set to `complete` and `operationError` set to `null`. Do not add issue identities; `creation-ledger.json` is their single source of truth. A successful Copilot process exit is not a stage-success signal; the status document plus the complete ledger are authoritative.

### Step 7: Report the ordered handoff

Return:
1. Ordered table of implementation subsection, issue number, title, URL.
2. Comma-separated child issue numbers for `shepherd-task-25-given-list`.
3. Suggested campaign-aware given-list invocation using the ordered issue numbers and `PLAN_DIRECTORY`; stage 25 derives `LESSON_PROPAGATION` from the campaign manifest.
4. Whether the issues were created with type `Task` or without an issue type.

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
- Never report success or leave `stage-20-result.json` as `in_progress` after a known failure.
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
