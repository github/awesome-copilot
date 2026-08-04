# Review of Extant Shepherd-Task Post-Mortems

**Date:** 2026-08-03  
**Scope:** Seven supplied shepherd-task post-mortems, plus the shepherd-task skills and orchestration scripts in this repository.

## Executive summary

The documented difficulties were concentrated in asynchronous boundaries and state detection rather than in the core ability to implement or merge code. The most consequential problems were:

- **Copilot Coding Agent (CCA):** slow or absent responses to requested corrections, including phase-1 timeouts; one large implementation also required repeated correction cycles.
- **Copilot Code Review Agent (CCRA):** refusal to review PRs over its file-count limit, reviews that reported no reviewable files, and follow-up reviews that were requested but did not arrive within the configured timeout.
- **Copilot CLI:** sessions could be killed when polling caused the agent to go idle; exported session exit codes could report success even when shepherding failed; serialized fail-fast execution left later tasks untouched.
- **GitHub CLI (`gh`):** old versions failed on deprecated Projects Classic GraphQL fields; an invalid REST reviewer identity returned HTTP 422; merge-method assumptions caused deterministic failures; and `gh pr edit` could fail after a mutation had actually succeeded.

The reports also document successful recovery: local review fixes, workflow reruns, squash-merge fallback, resumable PR state, and independent `gh` verification prevented several failures from becoming incorrect merges.

## Tool-by-tool findings

### Copilot Coding Agent (CCA)

| Where it struggled | Evidence and impact |
|---|---|
| **Did not respond to requested corrections within the phase-1 wait window.** | In the 2026-07-30 21:41 run for [#2169](https://github.com/github/copilot-sdk/issues/2169) / [#2175](https://github.com/github/copilot-sdk/pull/2175), phase 1 found requirement gaps, requested corrections, and timed out after 10 minutes without a CCA push. Phase 2 recovered by fixing the implementation locally, but the PR remained open because the second CCRA review was not acknowledged. |
| **Needed repeated correction cycles on a large implementation.** | In the 2026-07-30 17:26 run for [#2168](https://github.com/github/copilot-sdk/issues/2168) / [#2173](https://github.com/github/copilot-sdk/pull/2173), the report records four dismissed human correction cycles involving generated workflow lock files before CCA reached a clean head. |
| **Produced implementations needing substantial iterative review correction.** | In the Java real-estate run, issue [#4](https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/issues/4) required 7 CCRA rounds and 24 comments; issues [#5](https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/issues/5) and [#6](https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/issues/6) reached the 8-round cap. |

### Copilot Code Review Agent (CCRA)

| Where it struggled | Evidence and impact |
|---|---|
| **Could not review oversized PRs.** | In the 2026-07-30 17:26 run, CCRA declined [#2170](https://github.com/github/copilot-sdk/pull/2170) because the PR exceeded the 300-file limit. No inline comments were generated. |
| **Reported no reviewable files.** | In the 2026-07-30 01:56 run for [#2144](https://github.com/github/copilot-sdk/issues/2144) / [#2152](https://github.com/github/copilot-sdk/pull/2152), CCRA said it was unable to review any files, providing zero actionable coverage. |
| **Follow-up reviews did not arrive after successful requests.** | In the 2026-07-30 21:15 run for [#2168](https://github.com/github/copilot-sdk/issues/2168) / [#2173](https://github.com/github/copilot-sdk/pull/2173), two findings were fixed, threads resolved, and CI passed, but no new review appeared within 10 minutes, leaving the PR open. |
| **Created long convergence loops on complex changes.** | The Java real-estate post-mortem records 47 total rounds and 287 inline comments across 9 merged tasks, with two tasks reaching the 8-round cap. The Python final batch was healthier: 20 rounds and 30 comments across 6 tasks, with zero idle-kill failures. |

### Copilot CLI

| Where it struggled | Evidence and impact |
|---|---|
| **Went idle while a polling command was running.** | The Python post-mortem describes failed runs where polling exceeded the tool wait, the assistant said it would check back, an `assistant.idle` event appeared, and the session terminated with the PR open. |
| **Reported a misleading success-shaped exported exit code.** | In the 2026-07-30 runs for [#2168](https://github.com/github/copilot-sdk/issues/2168) / [#2173](https://github.com/github/copilot-sdk/pull/2173), the exported session record reported `exitCode: 0` while the final shepherd message said `SHEPHERD FAILED`; the outer caller returned `1`. |
| **Stopped serialized campaigns at the first unrecovered task failure.** | The 21:41 run attempted 1 of 7 tasks; six were never started. The 01:56 run targeted 8 tasks but produced artifacts for only the first task. |
| **Retried deterministic failures.** | In the 21:34 run, the CLI attempted merge-commit mode three times before selecting squash. In the 21:41 run, it repeated the same unacknowledged reviewer-request mechanism three times. |

### GitHub CLI (`gh`)

| Where it struggled | Evidence and impact |
|---|---|
| **Installed version was incompatible with the Copilot reviewer flow.** | In the 2026-07-30 21:15 run, `gh` 2.45.0 failed while querying a deprecated Projects Classic GraphQL field during `gh pr edit --add-reviewer`. A standalone `gh` 2.96.0 successfully requested `@copilot`. |
| **The REST fallback used the wrong reviewer identity.** | The same run attempted `copilot-pull-request-reviewer` through the REST collaborator endpoint; attempts returned HTTP 422 because that is the bot’s output identity, not a requestable collaborator. |
| **Could return failure after a mutation succeeded.** | The reports note that `gh pr edit` may complete the reviewer mutation and then fail during its deprecated Projects Classic query. Positive API state, not process status alone, is required. |
| **Assumed an unavailable merge method.** | In the 2026-07-30 21:34 run, `gh pr merge --merge` failed three times because merge commits were disabled; `--squash` succeeded. |
| **Was otherwise a useful independent verifier.** | The orchestrator uses `gh` to verify PR linkage, base branch, CI, unresolved threads, merge state, and issue closure rather than trusting Copilot exit codes. |

## Cross-cutting conclusions

1. **The dominant failure mode is asynchronous state ambiguity.** CCA correction pushes, CCRA requests/reviews, CI, and Copilot CLI sessions have different completion signals.
2. **Review coverage is not equivalent to review completion.** A zero-comment review can mean convergence, no reviewable files, or a file-count refusal.
3. **Phase boundaries were sometimes violated during recovery.** The 21:41 report says phase 2 proceeded even though phase 1 had failed its CCA correction wait.
4. **Independent state verification is the strongest design choice.** Actual PR, CI, review-thread, reviewer-request, and merge state are more reliable than session status alone.

## Recommended priorities

1. Preflight `gh` version and repository merge settings before starting a campaign.
2. Treat reviewer acknowledgement, review completion, and review content as separate states with distinct retries and timeouts.
3. Persist resumable state containing issue, PR, target head, review ID, request timestamps, resolved threads, and CI status.
4. Propagate semantic shepherd failure into a machine-readable nonzero result.
5. Detect CCRA file-limit and no-reviewable-files responses explicitly.
6. Make batch progress explicit (`merged`, `failed`, `resumable`, `not-started`) and record fail-fast skips.

## Sources

- [Java real-estate post-mortem](https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/blob/edburns/2-build-out-demo/dd-3017826-java-real-estate-demo-remove-before-merge/dd-3029269-post-mortem-report.md)
- [Python demo post-mortem](https://github.com/edburns/Build26-BRK206-your-agent-anywhere-multiclient-multidevice-with-github-copilot-sdk/blob/edburns/28-python-agent-demo/28-python-agent-demo-remove-before-merge/28-python-agent-demo-post-mortem.md)
- [Java runtime run 2144-2151](https://github.com/github/copilot-sdk/blob/edburns/1917-java-embed-rust-cli-runtime-dd-3039924-agentic-run-02/1917-java-embed-rust-cli-runtime-remove-before-merge/shepherd-tasks-20260730-0156/20260730-0200-post-mortem.md)
- [Java runtime run 2167-2168](https://github.com/github/copilot-sdk/blob/edburns/1917-java-embed-rust-cli-runtime-dd-3039924-agentic-run-02/1917-java-embed-rust-cli-runtime-remove-before-merge/shepherd-tasks-20260730-1726/20260730-2032-post-mortem.md)
- [Java runtime run 2169-2175](https://github.com/github/copilot-sdk/blob/edburns/1917-java-embed-rust-cli-runtime-dd-3039924-agentic-run-02/1917-java-embed-rust-cli-runtime-remove-before-merge/shepherd-tasks-20260730-2141/20260730-2247-post-mortem.md)
- [Java runtime retry](https://github.com/github/copilot-sdk/blob/edburns/1917-java-embed-rust-cli-runtime-dd-3039924-agentic-run-02/1917-java-embed-rust-cli-runtime-remove-before-merge/shepherd-tasks-20260730-2115/20260730-2128-post-mortem.md)
- [Java runtime successful merge](https://github.com/github/copilot-sdk/blob/edburns/1917-java-embed-rust-cli-runtime-dd-3039924-agentic-run-02/1917-java-embed-rust-cli-runtime-remove-before-merge/shepherd-tasks-20260730-2134/20260730-2135-post-mortem.md)