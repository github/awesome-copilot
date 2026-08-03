# Review of Earlier Shepherd-Task Prompt Logs

**Date:** 2026-08-03  
**Sources:** Prompt logs under `copilot-sdk-01/1682-java-tool-ergonomics-prompts-remove-before-merge` and `copilot-sdk-02/1810-java-tool-ergonomics-tool-as-lambda-remove-before-merge`.

## Executive summary

These earlier prompt logs predate the formal post-mortem process, so they do not provide one uniform run summary. They do, however, record several concrete shepherd executions and the difficulties encountered while building and using the primitive shepherd skill.

The main findings are:

- **Copilot Coding Agent (CCA):** PR creation and coding-agent completion were slow enough to exceed fixed 10-minute and 15-minute polls. The agent could continue working after the local poll timed out, creating uncertainty about whether it was stuck or merely slow.
- **Copilot Code Review Agent (CCRA):** review completion was difficult to detect; a 10-minute poll found no review even though a Copilot review later existed. Review comments also exposed real semantic defects that source-text-only tests had missed.
- **Copilot CLI:** the orchestration session repeatedly had to manage long blocking waits, distinguish expected failures from real failures, and recover from phase-state ambiguity. Very large token/session costs were recorded for some runs.
- **GitHub CLI (`gh`):** workflow approval semantics were initially misunderstood; the fork-only approval endpoint was tried before `gh run rerun` was identified as the correct same-repository mechanism. Branch-name/remote-name confusion caused base-branch update failures and false failure reports after successful merges. A stale or incorrect comment lookup also returned HTTP 404.

## Tool-by-tool findings

### Copilot Coding Agent (CCA)

| Where it struggled | Evidence and impact |
|---|---|
| **PR creation exceeded the initial poll window.** | In the 2026-07-01 shepherd run for task [#1876](https://github.com/github/copilot-sdk/issues/1876), the first “PR found” poll ran for 600 seconds and timed out. The issue was assigned to Copilot, but no PR or issue comments were visible at that point. The agent was still working, so the timeout did not distinguish slow progress from a stuck run. |
| **Agent execution exceeded another 10-minute wait.** | In the 2026-06-30 run for [#1840](https://github.com/github/copilot-sdk/issues/1840) / [#1857](https://github.com/github/copilot-sdk/pull/1857), the Copilot cloud-agent workflow was still running after 600 seconds while seven workflow runs awaited approval. The operator had to continue waiting before approving the runs. |
| **Agent execution exceeded a longer 15-minute wait.** | In the same 2026-06-30 prompt log, task [#1841](https://github.com/github/copilot-sdk/issues/1841) required a 900-second wait; the script timed out while the agent was still running and then had to wait again. |
| **Implementation quality required substantial human-directed iteration.** | In the 1682 logs for PR [#1792](https://github.com/github/copilot-sdk/pull/1792), human review identified a single-record schema/handler mismatch, generic-type deserialization loss, primitive optional-parameter hazards, and other semantic issues. These were not merely formatting problems; they required processor changes, new validation, and targeted tests. |
| **Created unrelated or poorly scoped work in one case.** | The 2026-06-24 log records an unexpected PR [#1786](https://github.com/github/copilot-sdk/pull/1786), created by the Copilot SWE Agent against `main`, duplicating the incremental Epic [#1682](https://github.com/github/copilot-sdk/issues/1682) work instead of targeting the feature branch. |

### Copilot Code Review Agent (CCRA)

| Where it struggled | Evidence and impact |
|---|---|
| **Review completion was not reliably observable within the polling window.** | For PR [#1877](https://github.com/github/copilot-sdk/pull/1877), the prompt log shows a 600-second poll ending with `TIMEOUT: No Copilot review found`. A subsequent `gh api` query showed a Copilot review (`copilot-pull-request-reviewer[bot]`) already present, demonstrating that the polling predicate or timing was insufficient. |
| **Review results arrived asynchronously relative to CI and agent work.** | For PR [#1857](https://github.com/github/copilot-sdk/pull/1857), the process had to wait for the cloud agent, rerun action-required workflows, watch checks, and separately inspect bot comments before declaring the PR ready. The review state was not a single event that could be trusted from the initial PR state. |
| **Found important semantic defects missed by earlier tests.** | Review comments on [#1792](https://github.com/github/copilot-sdk/pull/1792) identified schema/handler inconsistency for a single record parameter, generic type erasure during Jackson conversion, invalid optional primitive handling, and unsafe reflection/JPMS behavior. The prompt log explicitly concludes that existing tests checked generated source shape but not schema-plus-handler behavior. |
| **Review comments sometimes required additional investigation before remediation.** | Examples include determining whether a reviewer’s generic-erasure comment referred to raw `Class` tokens versus full Jackson `JavaType`, and replacing a raw JSON substring assertion with an `ObjectNode.has("defer")` check. This added review latency but improved correctness. |

### Copilot CLI

| Where it struggled | Evidence and impact |
|---|---|
| **Long waits consumed the interactive session and required repeated continuation.** | The 2026-06-30 and 2026-07-01 logs contain repeated 600-, 900-, and 1800-second waits for PR creation, cloud-agent completion, CI, and review. The operator repeatedly had to inspect status and launch another wait rather than receive a reliable terminal result. |
| **Phase completion was initially defined textually rather than structurally.** | The primitive skill used `SHEPHERD COMPLETE` / `SHEPHERD FAILED` text in Copilot output and later had to add explicit instructions that phase 2 must not start after phase 1 failure. This indicates the CLI session and outer script did not initially have a robust machine-readable phase contract. |
| **Expected CI failures had to be manually separated from real failures.** | `gh pr checks --watch --fail-fast` exited 1 on the expected “No remove-before-merge directories” check. The Copilot session then performed a second status query and correctly ignored that check. Without this interpretation, the CLI would have classified a successful phase as failed. |
| **Review polling could produce false negatives.** | The 600-second no-review result for PR [#1877](https://github.com/github/copilot-sdk/pull/1877), followed by discovery of an existing review, shows that the CLI’s polling logic was too narrow or raced with review publication. |
| **Resource use was high.** | One 2026-07-01 shepherd session reports approximately 724.6k tokens and 21m 27s of AI-credit/session usage for a phase-1 run. The logs show many repeated status inspections and waits, indicating significant orchestration overhead. |
| **The CLI could recover successfully when the operator supplied explicit state checks.** | Tasks [#1840](https://github.com/github/copilot-sdk/issues/1840) and [#1842](https://github.com/github/copilot-sdk/issues/1842) reached ready-for-review status after workflow reruns, CI filtering, base-branch correction attempts, and bot-comment checks. |

### GitHub CLI (`gh`)

| Where it struggled | Evidence and impact |
|---|---|
| **Workflow approval endpoint semantics were initially wrong.** | The primitive shepherd first investigated a `POST .../actions/runs/{id}/approve` path, then discovered from the actual same-repository behavior that it is fork-only. The correct recovery was `gh run rerun` for `action_required` runs. |
| **`action_required` state was confusing.** | Runs appeared with `status: completed` and `conclusion: action_required`, which did not look like a normal pending run. The operator had to inspect run details and experiment before determining that rerunning the runs was the correct operational equivalent of clicking “Approve workflows to run.” |
| **Base-branch names mixed remote-qualified and repository-qualified forms.** | For PR [#1879](https://github.com/github/copilot-sdk/pull/1879), the PR was successfully merged into `edburns/1810-java-tool-ergonomics-tool-as-lambda`, but the outer script expected `upstream/edburns/1810-java-tool-ergonomics-tool-as-lambda` and reported failure. Attempts to set the base to the remote-qualified name returned `GraphQL: Proposed base branch ... was not found`. The same issue was recorded for PR [#1881](https://github.com/github/copilot-sdk/pull/1881). |
| **The CLI could report a deterministic 404 for stale review-comment identifiers.** | A lookup for comment `3508639895` on PR [#1877](https://github.com/github/copilot-sdk/pull/1877) returned `gh: Not Found (HTTP 404)`. A subsequent collection query found the comment, indicating the identifier/path combination was stale or the endpoint was wrong. |
| **Merge/check commands required repository-specific interpretation.** | The primitive process used `gh pr checks --watch`, but its nonzero exit code included the expected remove-before-merge check. It also needed explicit base-branch inspection and correction rather than assuming the requested string was a valid GitHub branch name. |
| **`gh` was valuable once used as an independent state source.** | `gh issue view`, `gh pr view`, `gh run list`, `gh run rerun`, `gh pr checks`, and `gh api` supplied the evidence needed to distinguish CCA progress, workflow approval, CI completion, review presence, and merge state. |

## Cross-cutting conclusions

1. **The primitive system’s central weakness was state-machine ambiguity.** “Assigned,” “agent still working,” “PR exists,” “workflow needs approval,” “review requested,” “review posted,” “checks complete,” and “merged” were often discovered through separate ad hoc queries.
2. **Fixed timeouts were observation checkpoints, not reliable failure boundaries.** Several agents continued successfully after 600 or 900 seconds. A timeout needed to preserve resumable state rather than imply that work had stopped.
3. **Remote agent progress and local CLI progress were coupled in a fragile way.** The local session had to remain active while the cloud agent and review agent operated asynchronously, increasing waiting cost and the risk of false failure.
4. **Repository identifiers needed normalization.** A Git remote name such as `upstream` is not part of a GitHub branch name. Passing `upstream/branch` to `gh pr edit --base` caused avoidable failures and later false-negative verification.
5. **The most valuable review feedback was semantic.** The 1682 logs show that generated-source assertions alone did not prove runtime schema/handler correctness. Review agents found defects only when behavior, serialization, and invocation semantics were considered together.

## Recommended priorities

1. Use a structured state record for every task and phase: issue, PR, branch, target base branch, current head SHA, agent status, workflow run IDs, review IDs, and terminal state.
2. Make all waits resumable and configurable; distinguish “not observed within window” from “confirmed failed.”
3. Normalize `BASE_BRANCH` before invoking `gh`: accept a Git remote separately, but pass only the repository branch name to GitHub APIs.
4. Preflight workflow approval behavior and use `gh run rerun` for same-repository `action_required` runs.
5. Poll for reviews by PR, reviewer identity, review ID, and target head, rather than relying on one body format or a single timing window.
6. Treat expected checks as named exceptions in machine-readable evaluation rather than interpreting `gh pr checks` exit code alone.
7. Require integration or execution-level tests for generated tool schema and handler binding, not only generated source-text assertions.
8. Preserve a resumable outcome after every timeout and report whether the task is `in-progress`, `ready`, `failed`, `resumable`, `merged`, or `not-started`.

## Source inventory

### Issue 1682 prompt logs

- `20260615-prompts.md` through `20260618-prompts.md`: initial Java tool-definition investigation, low-level E2E test planning, skill creation, and architecture/ignorance-reduction work.
- `20260622-prompts.md` through `20260626-prompts.md`: schema-generator testing, review feedback, PR [#1792](https://github.com/github/copilot-sdk/pull/1792), single-record schema/handler remediation, and generated-code/JPMS concerns.

### Issue 1810 prompt logs

- `20260626-prompts.md` and `20260628-prompts.md`: lambda API design, zero-argument overloads, LangChain4j and Micronaut comparison, and plan formation.
- `20260629-prompts.md`: issue and plan preparation.
- `20260630-prompts.md`: first primitive shepherd execution, workflow rerun discovery, CI/review waiting, and PR [#1857](https://github.com/github/copilot-sdk/pull/1857).
- `20260701-prompts.md`: shepherd skill refinement and executions involving PRs [#1877](https://github.com/github/copilot-sdk/pull/1877), [#1879](https://github.com/github/copilot-sdk/pull/1879), and [#1881](https://github.com/github/copilot-sdk/pull/1881).
