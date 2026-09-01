# Treatment-Control Post-Mortem: Shepherd-Task Lesson Propagation

**Repository:** `edburns/dd-3057440-03`  
**Experiment baseline:** `cf09e8557dcf51728eae44f07ff73da074319fee`  
**Treatment:** campaign `2b20be48-566f-4919-9a0d-f120ab0d6d4a`, branch `experiment/shepherd-treatment`, lesson propagation `campaign`  
**Control:** campaign `59428cec-37c0-4963-a454-c92d6e2b5a12`, branch `experiment/shepherd-control`, lesson propagation `off`  
**Report generated:** 2026-09-01 15:54 PT

## Executive conclusion

The experiment proves that the treatment mechanism can capture a candidate lesson, validate and publish it, merge it, and deliver it to the next serial task. It does **not** prove that prose lessons improved immediate velocity, first-review quality, or final quality.

The strongest direct observation is the paired second task. Before treatment [#4](https://github.com/edburns/dd-3057440-03/issues/4) was assigned, stage 30 fetched a nonempty, 849-character `campaign-lessons.md` containing the validated lesson from [#3](https://github.com/edburns/dd-3057440-03/issues/3). The resulting implementation used the lesson's root-level Pester `BeforeAll` pattern and passed its first review with no findings. That establishes delivery and behavioral consistency, but not cognitive causation: the same `BeforeAll` pattern was already visible in the merged task-1 test file, enforced by CI, and independently present in the control arm.

Observed treatment costs were materially higher:

- Campaign elapsed time was `55m25s` versus `35m54s`: `3,325 - 2,154 = 1,171s` slower, or **54.36% above control**.
- Captured session time was `53m56s` versus `34m33s`: `3,236 - 2,073 = 1,163s` slower, or **56.10% above control**.
- Stage 30 was slightly faster in treatment (`19m31s` versus `20m50s`, **6.32% lower**), while stage 40 was much slower (`34m25s` versus `13m43s`, **150.91% higher**).
- Treatment used 7 review rounds versus 3 (**133.33% more**) and received 5 actionable inline comments versus 2 (**150% more**). Three treatment comments were lesson-content or lesson-lifecycle findings; implementation-related inline findings were therefore 2 versus 2.
- Both arms merged both tasks, closed both issues, passed their final current-head reviews, and passed repository CI. Final-quality outcomes were tied on the observable gates.

**Recommended decision:** retain lesson propagation as an experimental mechanism, but do not enable the current publication lifecycle by default for short serial campaigns. First move validation before the first stage-40 review, eliminate the candidate/validated schema conflict, require transfer-risk and non-applicability metadata, and preferentially convert lessons into executable checks. Run replicated experiments before claiming a velocity or quality benefit.

## 1. Experiment design and comparability

Both arms began from baseline `cf09e8557dcf51728eae44f07ff73da074319fee`, used the same two-task plan, canonical command (`pwsh -NoLogo -NoProfile -File ./eng/test-math-tool.ps1`), pinned Pester 5.7.1 workflow, output contracts, and serial ordering. The paired tasks were:

| Pair | Treatment | Control | Scope |
|---|---|---|---|
| First | [#3](https://github.com/edburns/dd-3057440-03/issues/3) / [#7](https://github.com/edburns/dd-3057440-03/pull/7) | [#5](https://github.com/edburns/dd-3057440-03/issues/5) / [#9](https://github.com/edburns/dd-3057440-03/pull/9) | Create Fibonacci function, CLI, unit tests, and isolated CLI tests |
| Second | [#4](https://github.com/edburns/dd-3057440-03/issues/4) / [#8](https://github.com/edburns/dd-3057440-03/pull/8) | [#6](https://github.com/edburns/dd-3057440-03/issues/6) / [#10](https://github.com/edburns/dd-3057440-03/pull/10) | Add factorial and operation dispatch while preserving Fibonacci |

The treatment issues additionally required reading and updating `campaign-lessons.md`. The control issues contained no lesson workflow.

The **first treatment task cannot benefit from prior campaign lessons**: its lesson file began with "No validated lessons have been recorded yet." It measures lesson-capture and publication overhead, not forward transfer. The paired second tasks are the direct forward-propagation observation because each began only after its first task merged.

## 2. Run inventory, retries, failures, and cost normalization

All `shepherd-task-25-given-list-run.json` files under both campaign directories were inspected. Exactly one manifest exists in each arm.

| Arm | Manifest | Window (UTC) | Attempt result | Exit |
|---|---|---|---|---:|
| Treatment | `1-math-treatment-remove-before-merge\shepherd-tasks-2b20be48-566f-4919-9a0d-f120ab0d6d4a-20260901-1414\shepherd-task-25-given-list-run.json` | 21:14:44-22:10:09 | `succeeded` | 0 |
| Control | `2-math-control-remove-before-merge\shepherd-tasks-59428cec-37c0-4963-a454-c92d6e2b5a12-20260901-1514\shepherd-task-25-given-list-run.json` | 22:14:46-22:50:40 | `succeeded` | 0 |

Neither campaign required a stage-25 retry. There are therefore no omitted retry sessions or task-execution costs.

### 2.1 Every attempt's captured session cost

| Attempt / session | Time | Calls | Input tokens | Output tokens | AIU | Premium requests |
|---|---:|---:|---:|---:|---:|---:|
| Treatment attempt 1, stage 30, [#3](https://github.com/edburns/dd-3057440-03/issues/3) | 13m12s | 16 | 639,278 | 12,928 | 38.34805 | 1 |
| Treatment attempt 1, stage 40, [#3](https://github.com/edburns/dd-3057440-03/issues/3) | 22m00s | 36 | 1,629,341 | 19,022 | 65.73439 | 1 |
| Treatment attempt 1, stage 30, [#4](https://github.com/edburns/dd-3057440-03/issues/4) | 6m19s | 12 | 412,855 | 7,591 | 25.83727 | 1 |
| Treatment attempt 1, stage 40, [#4](https://github.com/edburns/dd-3057440-03/issues/4) | 12m25s | 19 | 674,797 | 11,000 | 35.16233 | 1 |
| **Treatment total** | **53m56s** | **83** | **3,356,271** | **50,541** | **165.08204** | **4** |
| Control attempt 1, stage 30, [#5](https://github.com/edburns/dd-3057440-03/issues/5) | 14m21s | 24 | 1,115,219 | 17,882 | 55.27883 | 1 |
| Control attempt 1, stage 40, [#5](https://github.com/edburns/dd-3057440-03/issues/5) | 10m02s | 24 | 874,641 | 11,266 | 39.79614 | 1 |
| Control attempt 1, stage 30, [#6](https://github.com/edburns/dd-3057440-03/issues/6) | 6m29s | 13 | 457,411 | 8,684 | 28.19108 | 1 |
| Control attempt 1, stage 40, [#6](https://github.com/edburns/dd-3057440-03/issues/6) | 3m41s | 9 | 263,947 | 4,795 | 17.94066 | 1 |
| **Control total** | **34m33s** | **70** | **2,711,218** | **42,627** | **141.20671** | **4** |

Treatment minus control was `645,053` input tokens (**23.79%**), `7,914` output tokens (**18.57%**), 13 model calls (**18.57%**), and `23.87533` AIU (**16.91%**). CCA and CCRA billing totals were not captured, so these local-session measurements understate total system cost.

### 2.2 Observed versus failure-normalized comparison

| View | Treatment | Control | Interpretation |
|---|---:|---:|---|
| Observed elapsed | 55m25s | 35m54s | Includes all work and recoveries |
| Observed captured sessions | 53m56s | 34m33s | Includes all four task sessions per arm |
| Campaign-attempt-normalized elapsed | 55m25s | 35m54s | Same: neither arm retried |
| Campaign-attempt-normalized sessions | 53m56s | 34m33s | Same: no failed attempt can validly be removed |

The treatment logs contain recoverable orchestration errors: a default-method content API call was corrected to explicit GET, the issue-3 publication guard initially mishandled CRLF, and the issue-4 publication guard initially over-escaped its heading check. These did not create new stage-25 attempts or separate sessions. Their token and time costs are inseparable from the corresponding sessions and are retained rather than estimated away.

The treatment also experienced a real post-publication CI failure after making `N` mandatory; cross-platform invocation was then corrected. This was implementation validation discovered during a lesson-triggered rereview tail, not an unrelated campaign failure. The control had its own pre-ready correction cycles on [#9](https://github.com/edburns/dd-3057440-03/pull/9), including Pester-scope and stderr-assertion fixes (`bb815d0`, then `0a136cbc66a564dab397a7477fd714cd8917a5ac`). Removing only treatment recoveries would bias the comparison.

Consequently, the only defensible failure normalization is the attempt-level normalization above. A lesson-only counterfactual cost cannot be calculated exactly from these artifacts; review rounds and stage-40 deltas are the sound proxies.

## 3. Aggregate outcome and arithmetic

| Metric | Treatment | Control | Exact comparison |
|---|---:|---:|---|
| Tasks merged | 2/2 | 2/2 | Equal, 100% |
| Campaign elapsed | 55m25s (3,325s) | 35m54s (2,154s) | `+1,171s`; **+54.36%** |
| Captured session time | 53m56s (3,236s) | 34m33s (2,073s) | `+1,163s`; **+56.10%** |
| Orchestration gaps | 1m29s | 1m21s | `+8s`; **+9.88%** |
| Stage 30 total | 19m31s (1,171s) | 20m50s (1,250s) | `-79s`; **-6.32%** |
| Stage 40 total | 34m25s (2,065s) | 13m43s (823s) | `+1,242s`; **+150.91%** |
| Review rounds | 7 | 3 | `+4`; **+133.33%** |
| Actionable inline findings | 5 | 2 | `+3`; **+150%** |
| Lesson-only/lifecycle findings | 3 | 0 | `+3`; control has no percentage denominator |
| Implementation-related inline findings | 2 | 2 | Equal |
| Stage-40 review-response cycles | 3 | 1 | `+2`; **+200%** |
| Stage-25 retries | 0 | 0 | Equal |
| Final unresolved threads | 0 | 0 | Equal |
| Final outcomes | Both merged and issues closed | Both merged and issues closed | Equal |

"Lesson-only/lifecycle" includes the treatment task-1 request to replace environment-specific lesson evidence, the post-publication candidate-versus-validated heading finding on [#7](https://github.com/edburns/dd-3057440-03/pull/7), and the heading/stale-review-evidence finding on [#8](https://github.com/edburns/dd-3057440-03/pull/8). The latter combined two lesson concerns in one inline comment. This classification separates prose defects from product-code defects.

Three of seven treatment rounds were specifically attributable to lesson publication or correction. The observed stage-40 excess, `2,065 - 823 = 1,242s`, is a useful upper bound on treatment lifecycle overhead, not a pure causal estimate: review stochasticity and implementation fixes also contributed.

## 4. Paired first tasks: capture cost, not transfer

### 4.1 Time, cost, and review comparison

| Metric | Treatment [#3](https://github.com/edburns/dd-3057440-03/issues/3) / [#7](https://github.com/edburns/dd-3057440-03/pull/7) | Control [#5](https://github.com/edburns/dd-3057440-03/issues/5) / [#9](https://github.com/edburns/dd-3057440-03/pull/9) | Treatment versus control |
|---|---:|---:|---:|
| Stage 30 | 13m12s (792s) | 14m21s (861s) | `-69s`; **-8.01%** |
| Stage 40 | 22m00s (1,320s) | 10m02s (602s) | `+718s`; **+119.27%** |
| Captured total | 35m12s (2,112s) | 24m23s (1,463s) | `+649s`; **+44.36%** |
| Review rounds | 4 | 2 | **+100%** |
| Inline findings | 4 | 2 | **+100%** |
| Implementation-related inline findings | 2 | 2 | Equal |
| Input tokens | 2,268,619 | 1,989,860 | `+278,759`; **+14.01%** |
| Output tokens | 31,950 | 29,148 | `+2,802`; **+9.61%** |
| Calls | 52 | 48 | `+4`; **+8.33%** |
| AIU | 104.08244 | 95.07497 | `+9.00747`; **+9.47%** |

The treatment's first review produced three findings: weak string-based `N` validation, missing direct negative-input test coverage, and stale/environment-specific lesson evidence. The first two were implementation quality findings; the third existed only because lessons were enabled. After correction, round 2 was clean.

Publication commit `dcd62d517cff4868642b5f0f5de1db9a8b63ed64` changed only `campaign-lessons.md` and triggered CI and a new review. That review produced a lifecycle-conflict comment demanding the issue's `Candidate lessons for issue #3` heading even though stage 40 required promotion to `Validated lessons from issue #3 (PR #7)`. It also surfaced previously suppressed missing-argument defects. The shepherd retained the validated heading, documented the conflict, made `N` mandatory in `e8355ee7a4145607bfdc8820c89f265f21da0292`, added regression tests, corrected cross-platform invocation after CI failed, rereviewed, and merged as `8c5bf4170683eedc9f83ec4f4ff1b6bf9a1523c3`.

Control [#9](https://github.com/edburns/dd-3057440-03/pull/9) had two medium implementation findings in its first review: unbounded/undisposed child-process waiting and advanced binding that could expand output streams. Both were fixed in `29545a47a4b9bb5ca3d9fbee622d084fb2aba208`; the second review was clean; merge commit was `6d4e9b61cedb527ff7d985316aa726a21869143d`.

### 4.2 First-review-quality interpretation

Raw first-review findings were 3 treatment versus 2 control, but lesson-normalized implementation findings were 2 versus 2. The treatment did not improve first-review product quality on task 1 and could not have done so through prior lessons. Its additional first-review finding was metadata quality work.

## 5. Paired second tasks: direct forward propagation

### 5.1 Time, cost, and review comparison

| Metric | Treatment [#4](https://github.com/edburns/dd-3057440-03/issues/4) / [#8](https://github.com/edburns/dd-3057440-03/pull/8) | Control [#6](https://github.com/edburns/dd-3057440-03/issues/6) / [#10](https://github.com/edburns/dd-3057440-03/pull/10) | Treatment versus control |
|---|---:|---:|---:|
| Stage 30 | 6m19s (379s) | 6m29s (389s) | `-10s`; **-2.57%** |
| Stage 40 | 12m25s (745s) | 3m41s (221s) | `+524s`; **+237.10%** |
| Captured total | 18m44s (1,124s) | 10m10s (610s) | `+514s`; **+84.26%** |
| First-review findings | 0 | 0 | Equal |
| Total review rounds | 3 | 1 | `+2`; **+200%** |
| Total inline findings | 1 | 0 | Treatment's finding was lesson-only |
| Product-code fix cycles after review | 0 | 0 | Equal |
| Lesson-metadata fix cycles | 1 | 0 | Treatment only |
| Input tokens | 1,087,652 | 721,358 | `+366,294`; **+50.78%** |
| Output tokens | 18,591 | 13,479 | `+5,112`; **+37.93%** |
| Calls | 31 | 22 | `+9`; **+40.91%** |
| AIU | 60.99960 | 46.13174 | `+14.86786`; **+32.23%** |

Both second tasks were clean on their first current-head review. Treatment stage 30 was only 10 seconds faster, within ordinary run noise; treatment end-to-end time was 8m34s slower because stage 40 published, retested, fixed, and rereviewed lesson metadata.

Treatment publication commit `466ea97e9a1d8cfd4728c20a8fa03cff7f99a28b` promoted the issue-4 candidate. The next review objected to the validated heading and to evidence that cited a Copilot review. The stable-evidence portion was corrected in `54f4a1f2c5d938dac7b4996a7c195665a1841f68` by citing the `rejects unsupported operations` Pester test and repository runner; the lifecycle-required validated heading remained. The final review had no actionable findings but repeated the heading mismatch as a suppressed comment. [#8](https://github.com/edburns/dd-3057440-03/pull/8) merged as `d06849d825c99f8facb9fdce90755b6bec8d77df`.

Control [#10](https://github.com/edburns/dd-3057440-03/pull/10) passed its sole review with no findings and merged as `97ab007ab29e7ce76adc6978d6c97eb94336befb`.

### 5.2 Delivery and observable use

| Mechanism step | Status | Evidence |
|---|---|---|
| Captured from task 1 | Proven | [#7](https://github.com/edburns/dd-3057440-03/pull/7) contained candidate `BeforeAll`/runner lessons |
| Validated | Proven | Stage 40 replaced incidental Pester 5.9.0 and sandbox-installation claims with pinned-runner evidence |
| Published | Proven | `dcd62d517cff4868642b5f0f5de1db9a8b63ed64` created the validated section |
| Merged to treatment base | Proven | [#7](https://github.com/edburns/dd-3057440-03/pull/7) merged as `8c5bf4170683eedc9f83ec4f4ff1b6bf9a1523c3` |
| Delivered before issue 2 assignment | Proven | `phase1-task-20260901-1450-4.md` fetched lessons from the base branch and reported `LessonsLength: 849` before assignment |
| Present in issue-2 PR | Proven | [#8](https://github.com/edburns/dd-3057440-03/pull/8) preserved the validated issue-3 lesson |
| Reflected in implementation/tests | Observed | Initial issue-2 test diff used a root-level `BeforeAll`; 20 tests passed |
| Read and cognitively used by CCA | Not proven | The issue required reading the file, but logs expose no reliable internal causal trace |
| Caused the clean first review | Not proven | Control task 2 was also clean; merged code/tests already embodied the pattern |

## 6. Implicit executable knowledge versus prose novelty

Before either campaign began, the plan, issue text, canonical runner, workflow, and API contracts already carried substantial knowledge:

- `eng/test-math-tool.ps1` pinned and imported Pester 5.7.1.
- `.github/workflows/shepherd-task-math-tool.yml` enforced the repository runner.
- Issue text specified non-negative integers, exact single-line stdout, pure numeric functions, isolated CLI tests, serial task order, and unsupported-operation rejection.
- Task 2 inherited task-1 production code and tests from the campaign base branch.
- CI and current-head review gates rejected incompatible behavior.

After task 1, both arms carried additional implicit knowledge in executable artifacts:

- The merged test file showed the Pester setup location and exact assertion style.
- The merged implementation exposed parameter-binding and output contracts.
- Regression tests constrained any task-2 extension.
- The control's child-process helper additionally encoded timeout/disposal behavior after review.

The treatment's issue-3 prose lesson added an explanation of **why** setup belongs in root-level `BeforeAll` under this Pester execution model and warned against ambient Pester validation. That explanation may help a future task that does not inspect the existing tests. For immediate task 2, however, it was largely redundant with the merged `math-tool.Tests.ps1`, pinned runner, and CI.

The issue-4 lesson - "Use `ValidateSet` on the script-level operation parameter so unsupported operations fail before any result is written" - was already embodied in the same PR's code and `rejects unsupported operations` test. The issue itself required unsupported operations to fail. Because issue 4 was the last campaign task, this lesson had no opportunity for measured forward propagation.

Thus the prose added some durable rationale, but little novel immediate information beyond executable artifacts. Its marginal value would be higher for distant, structurally similar work where the original implementation is not an obvious template.

## 7. Lesson quality and lifecycle findings

### 7.1 Overgeneralization and stale applicability

The initial task-1 candidate overfit transient environment details: it cited ambient Pester 5.9.0 and a sandbox with no registered module repository. Review correctly removed those facts because the repository contract was pinned Pester 5.7.1 through the canonical runner.

The final `BeforeAll` lesson is materially better scoped - "PowerShell tests run with Pester 5 through a repository-owned acceptance runner" - but still needs negative applicability guidance. It should say that it is not a blanket rule for all Pester files and should not override an existing repository-specific fixture pattern.

The `ValidateSet` lesson is safe for a closed, static operation set but can overgeneralize to extensible/plugin-driven APIs, aliases, localized values, or compatibility surfaces where validation belongs elsewhere. The current metadata has an `Applies to` field but no explicit transfer-risk or "do not apply when" field.

### 7.2 Metadata burden and publication commits

Each lesson carries applicability, evidence, source, and confidence. These fields improved reviewability, but preparing and policing them generated three lesson-related actionable comments.

Publication occurred after an initially clean or converged implementation review:

- [#7](https://github.com/edburns/dd-3057440-03/pull/7): `dcd62d5...` published issue 3, changed HEAD, triggered CI/review, and contributed to an additional implementation correction tail.
- [#8](https://github.com/edburns/dd-3057440-03/pull/8): `466ea97...` published issue 4, changed HEAD, triggered CI/review, then `54f4a1f...` corrected evidence and triggered another review.

This ordering guaranteed post-publication rereview even where product code was already clean.

### 7.3 Lifecycle conflict

Treatment issue bodies required `Candidate lessons for issue #N`; stage 40 required replacing candidates with `Validated lessons from issue #N (PR #M)` and leaving no candidate section. CCRA followed the earlier issue wording and commented on both PRs. Shepherd followed the later lifecycle rule, replied with rationale, and resolved the comments. The final review of [#8](https://github.com/edburns/dd-3057440-03/pull/8) still repeated the mismatch as a suppressed concern.

These comments did not reveal product defects. They were caused by inconsistent schema ownership across stages 20, 30, and 40.

## 8. Value assessment

| Value dimension | Assessment | Evidence |
|---|---|---|
| Mechanism value | **Demonstrated** | Capture, validation, publication, merge, delivery, and preservation all worked |
| Immediate velocity value | **Not demonstrated; observed negative** | Treatment was 54.36% slower overall and 84.26% slower on the direct second-task pair |
| First-review-quality value | **No observed advantage** | Second tasks were both clean; first-task implementation findings were 2 versus 2 after removing lesson-only findings |
| Final-quality value | **No observed difference** | All four PRs ended with clean current-head review, green CI, merge, and issue closure |
| Durable-knowledge value | **Plausible but unmeasured** | Prose preserves rationale beyond code, but no third/later task tested reuse |

The mechanism is viable. The current lifecycle is not yet efficient. The experiment offers no evidence that the mechanism should be rejected permanently, but it also does not justify a claim that lessons improved agentic velocity.

## 9. Confounders and limits

1. **Sample size is n=1 campaign pair.** Two tasks per arm and one direct transfer opportunity cannot establish general causality.
2. **Stochastic agents and reviews.** CCA implementation choices, CCRA findings, review latency, and suppressed-comment behavior vary between runs.
3. **Sequential time-of-day execution.** Treatment ran before control, so service load and caching were not randomized.
4. **Implementation divergence.** Treatment and control produced different test organization and types; treatment ended with 20 tests, control with 13. Test count is not a quality measure.
5. **Control learned through executable state.** Serial merging transferred code and tests in both arms, reducing the incremental information available to prose.
6. **Review discovery timing differed.** Treatment's post-publication head change caused CCRA to surface previously missed missing-input gaps. That improved final code but also shows review stochasticity, not necessarily lesson value.
7. **Pre-ready correction cycles differed.** Control task 1 required multiple CCA/CI corrections before stage 40; treatment task 1 also corrected a Pester setup failure. Stage-30 duration therefore measures more than lesson reading.
8. **No CCA/CCRA billing telemetry.** Local AIU and tokens exclude hosted coding-agent and review-agent costs.
9. **No exact lesson-time spans.** Lesson publication, implementation fixes, CI, and review waits share stage-40 sessions; subtracting a guessed duration would be misleading.
10. **No delayed-retention observation.** The experiment ended immediately after task 2; durable reuse, staleness, and maintenance burden remain unknown.

## 10. Recommendations

1. **Unify lesson schema ownership.** Stage 20 should state that `Candidate lessons` is provisional and stage 40 will replace it with `Validated lessons`; CCRA instructions must recognize both lifecycle states.
2. **Validate before first stage-40 review.** Promote or reject candidate lessons before requesting the first current-head CCRA review so product code and final lesson metadata are reviewed together.
3. **Add transfer-risk metadata.** Require fields such as `Transfer risk: low|medium|high`, `Assumptions`, and `Expires/revalidate when` alongside confidence.
4. **Require non-applicability guidance.** Every lesson should include `Do not apply when`, especially for framework conventions such as `BeforeAll` and API constraints such as `ValidateSet`.
5. **Prefer executable enforcement.** If a lesson can be expressed as a test, linter, type constraint, CI assertion, or reusable helper, make that artifact authoritative and keep prose to rationale and scope.
6. **Deduplicate against existing artifacts.** Before publication, compare a candidate with issue text, tests, CI, runner configuration, APIs, and prior lessons. Reject or shorten lessons that merely restate an executable invariant.
7. **Separate publication commits from product PR review accounting.** Record `implementationRounds`, `lessonRounds`, `implementationFindings`, and `lessonFindings` explicitly. Consider publishing after merge through a dedicated, automatically validated metadata commit if same-PR atomicity is not required.
8. **Avoid review evidence as durable evidence.** Cite stable test names, runner paths, CI run IDs, and commit SHAs. The correction in `54f4a1f...` is the preferred pattern.
9. **Refresh consumers from the campaign base.** The treatment post-mortem observed a stale orchestrator worktree even though lessons were merged. Delivery checks should always fetch the base-branch blob and record its SHA.
10. **Improve metrics.** Add per-step timestamps and cost counters for lesson read, candidate creation, validation, publication, CI wait, review wait, metadata correction, and product correction. Record hosted CCA/CCRA usage when available.
11. **Run replicated, randomized experiments.** Use multiple repositories and task families, alternate arm order, repeat identical fixtures, and include at least three serial tasks so task 2 and task 3 can test immediate and repeated transfer.
12. **Test novelty explicitly.** Include one follow-on task where the lesson is not readily inferable from adjacent merged code, and one negative-transfer task where the lesson should be ignored.
13. **Predefine success thresholds.** For example: no more than 10% stage-40 overhead, at least 20% fewer implementation findings on downstream tasks, and no increase in final regressions.
14. **Retain raw and normalized reporting.** Always report all attempts and costs, then separately exclude only clearly unrelated failed attempts with a documented rule. Never remove recoveries embedded in successful sessions by estimate.

## 11. Authoritative local evidence

- Treatment post-mortem: `C:\Users\edburns\workareas\dd-3057440-03-shepherd-treatment\1-math-treatment-remove-before-merge\shepherd-tasks-2b20be48-566f-4919-9a0d-f120ab0d6d4a-20260901-1414\20260901-1510-post-mortem.md`
- Control post-mortem: `C:\Users\edburns\workareas\dd-3057440-03-shepherd-control\2-math-control-remove-before-merge\shepherd-tasks-59428cec-37c0-4963-a454-c92d6e2b5a12-20260901-1514\20260901-1550-post-mortem.md`
- Treatment final lessons: `C:\Users\edburns\workareas\dd-3057440-03-shepherd-treatment\1-math-treatment-remove-before-merge\campaign-lessons.md`
- Control final lessons: `C:\Users\edburns\workareas\dd-3057440-03-shepherd-control\2-math-control-remove-before-merge\campaign-lessons.md`
- Direct issue-2 delivery/session evidence: `C:\Users\edburns\workareas\dd-3057440-03-shepherd-treatment\1-math-treatment-remove-before-merge\shepherd-tasks-2b20be48-566f-4919-9a0d-f120ab0d6d4a-20260901-1414\phase1-task-20260901-1450-4.md`
- Treatment task session exports: the four `phase1-task-*` / `phase2-task-*` Markdown and JSONL pairs under the treatment run directory
- Control task session exports: the four `phase1-task-*` / `phase2-task-*` Markdown and JSONL pairs under the control run directory
- Treatment and control plans: each campaign directory's `math-tool-ignorance-reduction-plan.md`
- Treatment and control issue bodies: each campaign directory's `prompts\shepherd-task-20-*\issue-bodies\` directory
