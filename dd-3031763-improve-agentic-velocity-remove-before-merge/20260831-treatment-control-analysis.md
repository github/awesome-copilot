# Treatment-control analysis: value of campaign lesson propagation

## Executive conclusion

The experiment proves that shepherd-task can collect, validate, persist, and deliver lessons from one issue to the next. It does **not** show a velocity or first-review-quality benefit from doing so in this two-task campaign.

The treatment produced five durable, evidence-backed lessons. The three lessons from issue #9 were present when issue #10 began, and issue #10 retained several of the practices they described. This is a successful mechanism result.

The outcome result is different:

- The treatment campaign required two stage-25 attempts. Their task-execution windows totaled **77m 55s**, versus **42m 52s** for control: treatment consumed **35m 03s more observed execution time**, or **81.8%**.
- The treatment's captured task-session time totaled **76m 13s**, versus **41m 31s** for control: **34m 42s more**, or **83.6%**.
- One **8m 06s** treatment stage-40 session failed because shepherd requested reviewer `Copilot` instead of the required `@copilot`. Excluding that unrelated orchestration defect, treatment still consumed **69m 49s**, **26m 57s more than control**, or **62.9%**.
- The treatment used **9 review rounds**, versus **6** for control: **50% more**.
- The treatment generated **8 review comments**, versus **5** for control: **60% more**.
- The downstream treatment task, issue #10, took **33m 37s**, versus **9m 51s** for the corresponding control task, issue #13: treatment was **23m 46s slower**, or **3.41 times as long**.
- Treatment issue #10 required **5 review rounds and 4 actionable corrections**. Control issue #13 passed its **first review with no findings**.

The strongest interpretation is:

> The experiment demonstrated durable explicit learning, but the explicit lessons did not add measurable short-term value beyond the learning already embodied in the merged code, tests, and acceptance gates. One lesson was overgeneralized and directly contributed to downstream correction work, while lesson publication itself added a deterministic review tail.

This is a result from one paired campaign, not a statistically reliable rejection of lesson propagation. It does show that the current lesson format and publication lifecycle need refinement before lesson mode can be claimed to improve agentic velocity.

## Sources

This analysis compares:

- Earlier treatment attempt artifacts:
  `C:\Users\edburns\workareas\dd-3056162-shepherd-treatment\1-math-treatment-remove-before-merge\shepherd-tasks-083cc76e-92d7-42a1-bb16-b1b4f769cbd0-20260831-1240`
- Earlier treatment attempt post-mortem:
  `C:\Users\edburns\workareas\dd-3056162-shepherd-treatment\1-math-treatment-remove-before-merge\shepherd-tasks-083cc76e-92d7-42a1-bb16-b1b4f769cbd0-20260831-1240\20260831-1306-post-mortem.md`
- Treatment post-mortem:
  `C:\Users\edburns\workareas\dd-3056162-shepherd-treatment\1-math-treatment-remove-before-merge\shepherd-tasks-083cc76e-92d7-42a1-bb16-b1b4f769cbd0-20260831-1325\20260831-1422-post-mortem.md`
- Control post-mortem:
  `C:\Users\edburns\workareas\dd-3056162-shepherd-control\2-math-control-remove-before-merge\shepherd-tasks-7257b1e8-3b2d-4f1e-9298-81f1c0ac1f17-20260831-1453\20260831-1536-post-mortem.md`
- Final treatment lesson file on `experiment/shepherd-treatment`
- Final control lesson file on `experiment/shepherd-control`

The treatment task pair was issue #9 / PR #14 followed by issue #10 / PR #15. The corresponding control pair was issue #12 / PR #16 followed by issue #13 / PR #17.

The earlier treatment directory does contain a generated post-mortem even though the stage-25 run failed. That report was created before the run manifest was finalized, so its statement that the manifest remained `running` is stale. Its phase timings, failure boundary, and issue-#9 stage-30 observations are corroborated by `phase1-task-20260831-1240-9.md`, `phase2-task-20260831-1256-9.md`, and the now-finalized failed run manifest.

## Experiment comparability

The campaigns exercised the same two-step feature sequence:

1. Add Fibonacci with pure-function and isolated CLI tests.
2. Add factorial and operation dispatch while preserving Fibonacci behavior.

Both campaigns:

- used repository-owned Pester acceptance checks;
- ran the tasks serially;
- merged the first task before starting the second;
- used Copilot Coding Agent for initial implementation;
- used Copilot code review for convergence;
- ended with both pull requests merged and both issues closed;
- had no terminal timeout, idle kill, or merge failure.

The principal experimental difference was lesson mode:

- Treatment: `lessonPropagation: campaign`
- Control: `lessonPropagation: off`

There are important limits to direct comparison:

1. **Treatment spans two stage-25 attempts.** The first attempt contains issue #9's complete stage-30 session and an unsuccessful stage-40 session. The second resumes issue #9 at stage 40, merges it, and completes issue #10. Summing task-execution windows excludes the human/reinstallation delay between attempts.
2. **Treatment incurred an unrelated orchestration defect.** Its first stage-40 attempt spent 8m 06s failing to request Copilot review because the reviewer token was wrong. Total observed cost should include this real campaign cost, but lesson-efficacy analysis should also show a normalized value excluding it.
3. **The agents are stochastic.** The treatment and control generated materially different first-task implementations, which created different bases for the second task.
4. **The second task inherited merged code in both campaigns.** Control had no textual lessons, but it still inherited the corrected implementation, tests, CI contract, and public API produced by issue #12.
5. **The sample contains one downstream task.** It can reveal mechanisms and failure modes, but not establish a general effect size.
6. **Token cost cannot be compared.** The successful treatment run reports 4,373,818 combined local tokens, while control token values are redacted and unavailable. The earlier treatment attempt adds additional AI usage, making the unavailable comparison even less favorable to a precise cost claim.

Because of these limits, the most informative comparisons are:

- stage-40 convergence for the paired first tasks;
- full stage-30/stage-40 behavior for the paired second tasks;
- implementation-review rounds separately from lesson-publication rounds;
- the content and observed application of the lessons.

## Quantitative comparison

### Campaign totals

| Metric | Treatment | Control | Treatment difference |
|---|---:|---:|---:|
| Task-execution time across stage-25 attempts | 77m 55s | 42m 52s | +35m 03s (+81.8%) |
| Captured active task-session time | 76m 13s | 41m 31s | +34m 42s (+83.6%) |
| Failure-normalized task-execution time | 69m 49s | 42m 52s | +26m 57s (+62.9%) |
| Stage-25 attempts | 2 | 1 | +1 |
| Task Copilot sessions | 5 | 4 | +1 |
| CCRA review rounds | 9 | 6 | +3 (+50.0%) |
| Review comments | 8 | 5 | +3 (+60.0%) |
| Actionable implementation comments | 6 | 5 | +1 (+20.0%) |
| Nonmeritorious lesson-lifecycle comments | 2 | 0 | +2 |
| Pre-review shepherd change-request cycles on first task | 2 | 0 reported | +2 |
| Tasks approved on first review | 0/2 | 1/2 | -1 task |
| Tasks requiring local fixes | 2/2 | 1/2 | +1 task |
| Tasks merged | 2/2 | 2/2 | no difference |
| Final unresolved comments | 0 | 0 | no difference |

The observed treatment total includes the failed reviewer-request session because it was part of the actual campaign cost. The failure-normalized row removes only that 8m 06s deterministic orchestration defect. It does not remove lesson capture, lesson publication, lesson-content fixes, or rereviews. Treatment remains 62.9% slower after this normalization.

### Paired task comparison

| Feature step | Treatment | Control | Main difference |
|---|---|---|---|
| Fibonacci | Issue #9 / PR #14 | Issue #12 / PR #16 | Treatment stage 40 converged faster, before any prior campaign lesson could exist |
| Factorial and dispatch | Issue #10 / PR #15 | Issue #13 / PR #17 | Control passed first review; treatment required multiple corrections and lesson-publication rounds |

#### First task: Fibonacci

| Metric | Treatment #9 | Control #12 | Treatment difference |
|---|---:|---:|---:|
| Stage-30 time | 15m 57s | 6m 54s | +9m 03s (+131.2%) |
| Failed stage-40 attempt | 8m 06s | none | +8m 06s |
| Successful stage-40 time | 18m 33s | 24m 46s | -6m 13s (-25.1%) |
| Total observed active time | 42m 36s | 31m 40s | +10m 56s (+34.5%) |
| Failure-normalized active time | 34m 30s | 31m 40s | +2m 50s (+8.9%) |
| Pre-review shepherd change-request cycles | 2 | 0 reported | +2 |
| Total review rounds | 4 | 5 | -1 |
| Actionable findings | 2 | 5 | -3 |
| Lesson-lifecycle findings | 1 | 0 | +1 |
| Review-fix commits reported | not directly reported | 4 | not comparable |

Treatment #9's first stage-25 attempt provides the previously missing stage-30 evidence:

1. Stage 30 ran from 12:40:32 to 12:56:29 PDT, **15m 57s**.
2. Shepherd caused two CCA correction cycles:
   - correct the exact candidate-lesson heading;
   - initialize the shared script path in Pester's run phase rather than discovery scope.
3. The final stage-30 head passed six canonical tests and two substantive workflow checks.
4. The first stage-40 session then ran for **8m 06s** and failed before any CCRA review because `gh pr edit --add-reviewer Copilot` could not resolve login `copilot`.
5. The later `1325` run resumed the already-ready PR and completed the **18m 33s** successful stage-40 convergence.

Treatment #9's successful review sequence reached a clean implementation review after two rounds. Control #12 required five rounds and four correction commits.

This difference **cannot be credited to propagated lessons**, because #9 and #12 were each the first task in their campaign. No earlier campaign lesson was available to either one. It instead demonstrates ordinary variance in initial implementation and review convergence.

The full first-task comparison is less favorable to treatment than the earlier report showed. Treatment consumed 42m 36s of active task sessions versus 31m 40s for control. Removing the unrelated 8m 06s reviewer-token failure narrows the difference to 2m 50s, or 8.9%.

The stage-30 correction categories also matter. One treatment correction fixed product-test execution scope. The other fixed lesson metadata required only because lesson mode was active. Lesson collection therefore imposed measurable work before CCRA review began.

Treatment #9 then incurred two additional rounds after implementation convergence:

1. a review of the validated-lesson publication commit that incorrectly requested restoration of the earlier candidate heading;
2. a final clean review after that nonmeritorious thread was explained and resolved.

Therefore the first task shows the cost of collecting and publishing lessons, but cannot show a benefit from applying prior lessons.

#### Second task: factorial and dispatch

This is the direct test of forward lesson application.

| Metric | Treatment #10 | Control #13 | Treatment difference |
|---|---:|---:|---:|
| Stage-30 time | 11m 28s | 6m 21s | +5m 07s (+80.6%) |
| Stage-40 time | 22m 09s | 3m 30s | +18m 39s (+532.9%) |
| Total active time | 33m 37s | 9m 51s | +23m 46s (+241.3%) |
| Total review rounds | 5 | 1 | +4 |
| Implementation rounds before publication | 3 | 1 | +2 |
| Actionable findings | 4 | 0 | +4 |
| Lesson-lifecycle findings | 1 | 0 | +1 |
| First-review approval | No | Yes | control advantage |

Treatment #10 received the three validated lessons from #9. Nevertheless, its first two reviews found four actionable problems:

1. Factorial was incorrectly constrained by Fibonacci's `0..46` range.
2. Lesson evidence cited a local Pester version rather than the pinned repository version.
3. The factorial loop counter could wrap because it used `Int32`.
4. The lesson applicability text still described the obsolete shared numeric range.

Control #13 received no textual campaign lessons and passed its first review with no findings.

This is the clearest experimental result: **explicit lesson propagation did not improve downstream first-review quality or velocity in this trial.**

## What the lesson mechanism successfully added

The absence of a velocity win does not mean the mechanism added no value. It added a form of durable knowledge that the control deliberately lacked.

### 1. It produced an auditable knowledge artifact

The final treatment branch contains five structured, high-confidence lessons with:

- applicability;
- a concise lesson;
- evidence;
- source;
- confidence.

The control file contains only:

```text
No validated lessons have been recorded yet.
```

The treatment therefore has explicit organizational memory that can be inspected independently of source-code archaeology.

### 2. It proved forward delivery

Issue #10 began after PR #14 merged. Its stage-30 invocation recorded campaign lesson mode and a nonempty lesson file. The issue instructions required it to treat only `Validated lessons` as advisory context.

This proves that the system:

1. captured observations from issue #9;
2. promoted selected observations to validated lessons;
3. merged them into the campaign base;
4. delivered them to the next task.

That is an important mechanism milestone even though the downstream outcome was not better.

### 3. It preserved useful testing discipline

Issue #9's second lesson required:

- dot-sourced pure-function tests;
- CLI tests in child `pwsh` processes;
- assertions for exit code zero;
- empty stderr;
- exact stdout.

Issue #10 retained these patterns. The treatment post-mortem records 17 passing canonical tests at convergence.

This is evidence of behavioral consistency with the propagated lesson. It is not conclusive evidence of incremental value, because the existing test suite and implementation also encoded those requirements.

### 4. It converted a failed generalization into a better lesson

Issue #9's numeric lesson said to align parameter validation with the largest input representable by the declared numeric type.

Issue #10 initially applied the concrete Fibonacci `0..46` boundary too broadly to factorial. Review corrected the implementation, and the final issue-#10 lesson became more precise:

> Enforce each algorithm's bound in its function, keep shared dispatch validation no narrower than the broadest operation, and use exact result and loop-counter types across the accepted domain.

The lesson system therefore captured a real refinement from a narrower rule to a more reusable design principle.

This is valuable as knowledge development, but it was achieved through additional review work rather than by avoiding that work.

## Why control performed better on the downstream task

The control did not have explicit textual memory, but it was not memoryless.

Issue #12's five review rounds changed the control codebase before issue #13 began. Those changes included:

1. replacing overflow-prone 32-bit Fibonacci arithmetic;
2. removing an overly specific numeric-type assertion;
3. decoupling dot-sourcing from direct CLI execution;
4. constraining impractical public inputs;
5. aligning script and function input contracts.

Issue #13 inherited all of this through the merged source and tests. The corrected codebase constrained the next implementation directly:

- existing functions showed the accepted design;
- existing tests demonstrated invocation patterns;
- CI enforced the repository contract;
- the merged public interface defined the extension point.

This is **implicit learning encoded in executable artifacts**. It is often stronger than prose because it is concrete, local, and enforced.

The control result indicates that, for a tightly coupled follow-on task in the same files, merged code and tests supplied sufficient context. Explicit lessons were largely redundant.

The treatment lesson that was not redundant -- the numeric-boundary advice -- was insufficiently scoped and became counterproductive when applied to a different algorithm.

## Costs introduced by treatment

### 1. Retry and orchestration cost

The treatment campaign required two stage-25 attempts.

The first attempt completed issue #9 stage 30, then spent 8m 06s in stage 40 before failing to request Copilot review. This failure was caused by shepherd's reviewer-token defect, not lesson content:

```text
gh pr edit --add-reviewer Copilot
```

The installed GitHub CLI required the special token `@copilot`. The failed attempt left PR #14 open and resumable, so the second run preserved useful work rather than restarting stage 30.

This demonstrates both a cost and a strength:

- **Cost:** 8m 06s of active failed stage-40 work plus another stage-25 invocation.
- **Strength:** resumability prevented repetition of the 15m 57s stage-30 implementation and validation session.

The failure should not be attributed to lesson efficacy, which is why the quantitative comparison reports a failure-normalized total. It remains part of total observed campaign cost because the treatment campaign actually consumed it.

### 2. Deterministic publication and rereview cost

Each treatment task reached a clean implementation review, then changed the PR head to publish validated lessons. That required another head-specific review.

On both PRs, the publication review produced the same nonmeritorious comment: restore the issue-time `Candidate lessons` heading even though stage 40 correctly required `Validated lessons from issue ...`.

Each task then needed:

1. lesson publication;
2. a review of the new head;
3. explanation and resolution of the lifecycle-conflict finding;
4. another clean review;
5. final checks and merge.

The post-mortem timelines show approximately:

- #9: 7m 21s from the first clean implementation review to merge;
- #10: approximately 7m 46s from the clean implementation review to merge.

This is roughly 15 minutes of treatment tail across the campaign. It is not all pure overhead -- it includes publication, tests, review waits, and merge checks -- but none of it exists in the control lesson-off lifecycle.

Four of treatment's nine review rounds occurred after implementation had already reached a clean review. Two of those rounds contained the lifecycle false positive, and two were the final clean rereviews.

### 3. Additional specification surface

Treatment added another artifact with its own lifecycle:

- candidate heading;
- validation;
- publication;
- applicability wording;
- evidence wording;
- source attribution;
- review of the published form.

Issue #10 had two actionable findings in this metadata itself:

- noncanonical Pester evidence;
- stale applicability language.

The artifact can preserve knowledge, but it also creates new correctness obligations.

Issue #9 also required a stage-30 correction to restore the exact candidate-lesson heading before it could be declared ready. This correction was neither product behavior nor test correctness; it was work introduced solely by the lesson artifact contract.

### 4. Overgeneralization risk

The issue-#9 numeric lesson combined a general principle with evidence tied to Fibonacci's 32-bit boundary.

The next implementation generalized the concrete boundary rather than the abstract rule, constraining factorial to `0..46`. This is a classic transfer failure:

- source context: bounded `Int32` Fibonacci;
- target context: factorial requiring a different numeric domain;
- erroneous transfer: reuse the source algorithm's bound;
- correction: use algorithm-specific validation and exact types.

The lesson was marked `Confidence: high`, but confidence in the source observation did not guarantee transferability to a new target.

### 5. Increased review noise

Raw treatment review counts overstate implementation defects because two comments were lifecycle conflicts. Even after removing them, however, treatment had six actionable findings versus five in control.

For the downstream pair specifically, treatment had four actionable findings versus zero in control. The negative downstream signal remains after removing publication noise.

## Net value assessment

### Mechanism value: high

The experiment demonstrates that shepherd-task can create a durable learning loop:

```text
task observation
  -> candidate lesson
  -> review and evidence
  -> validated lesson
  -> merge to campaign base
  -> delivery to next task
  -> refinement from later evidence
```

This is a real capability that the control lacks.

### Immediate velocity value: negative in this run

The measured campaign and downstream-task results do not support a velocity benefit:

- observed treatment task-execution time across both attempts was 81.8% higher;
- failure-normalized treatment task-execution time was still 62.9% higher;
- treatment issue #9 active time was 34.5% higher as observed and 8.9% higher after excluding the reviewer-token failure;
- downstream treatment active time was 241.3% higher;
- downstream treatment stage 40 was 532.9% higher;
- downstream treatment needed five reviews instead of one;
- lesson publication added four review rounds across the campaign.

### Immediate quality-at-first-review value: negative in this run

The downstream treatment task had four actionable findings. The downstream control task had none.

Final quality was high in both campaigns: all PRs merged with passing checks, clean terminal reviews, and no unresolved comments. Lesson mode did not improve the final outcome because shepherd's ordinary review convergence already brought both modes to the same terminal quality bar.

### Durable knowledge value: positive but not yet monetized

Treatment ended with five reusable lessons; control ended with none. That difference may matter when:

- future work occurs in different files where prior tests do not provide direct guidance;
- the same failure pattern recurs months later;
- a new agent cannot efficiently infer repository history;
- the lesson describes orchestration or process behavior not encoded in product code;
- multiple campaigns need to share operational knowledge.

The two-task experiment ended too soon to measure that longer-term value.

## Causal interpretation

The evidence supports these claims with different confidence levels.

### Proven

- Lessons were captured, validated, merged, and delivered forward.
- Issue #10's implementation retained practices described by issue #9's testing lesson.
- A numeric lesson was overgeneralized in issue #10 and required review correction.
- Lesson publication caused additional head changes and reviews.
- The reviewer produced the same lifecycle-conflict false positive on both treatment PRs.
- Control issue #13 passed first review without explicit lessons.

### Strongly indicated

- Existing code and tests provided enough implicit context for the tightly coupled control follow-on task.
- The current lesson format did not improve downstream convergence.
- Concrete source-task details in a lesson can dominate its abstract applicability statement.

### Not established

- That lesson propagation is generally harmful.
- That control would remain better over a longer or more varied campaign.
- That the agent consciously used a specific lesson rather than independently following the code and tests.
- A comparative token or financial cost.
- A stable effect size from one treatment/control pair.

## Recommendations

### 1. Separate repository invariants from task-specific observations

Classify each lesson explicitly:

```text
Scope: repository-invariant | component | language-pattern | algorithm-specific
Transfer risk: low | medium | high
```

Issue #9's test-isolation lesson is close to a repository or language-pattern invariant. Its Fibonacci `46/47` evidence is algorithm-specific. They should not be presented with equivalent transfer expectations.

### 2. Add an explicit non-applicability statement

For lessons with narrow evidence, require:

```text
Does not imply:
- Other algorithms share this input bound.
- Shared dispatch must use the narrowest operation's bound.
```

This would have directly guarded against the issue-#10 `0..46` factorial error.

### 3. Require target-context adaptation

The consuming stage should not merely say “read the lessons.” It should require a short pre-implementation mapping:

```text
Lesson:
Target component:
Applicable aspect:
Non-applicable source-specific detail:
Implementation consequence:
```

This makes transfer an explicit reasoning step and creates auditable evidence of how a lesson was interpreted.

### 4. Prefer executable lessons when possible

If a lesson can be encoded as:

- a test;
- a reusable helper;
- a validator;
- a type contract;
- a lint rule;
- a fixture;

then implement that enforcement and keep the prose as explanation.

The control shows why: executable artifacts constrained issue #13 more effectively than treatment prose constrained issue #10.

### 5. Eliminate the lesson-publication review loop

The current lifecycle adds a predictable tail and exposes CCRA to conflicting issue-time and stage-40 instructions.

Options, in preferred order:

1. Include the stage-40 publication contract explicitly in the post-publication review request.
2. Mark the lesson file with a machine-readable lifecycle state that CCRA can recognize.
3. Publish validated lessons through a separate post-merge campaign-metadata commit, with its own validation but without reopening product-code review convergence.
4. If lessons remain in the task PR, avoid requiring a second clean CCRA round when the only head change is a validated transformation of already-reviewed candidate lessons and a deterministic validator proves the transformation.

Any relaxation must preserve reviewed-head safety for product code.

### 6. Measure implementation convergence separately from lesson lifecycle

Future reports should separate:

- implementation review rounds;
- lesson-publication review rounds;
- actionable product findings;
- lesson-content findings;
- lifecycle-conflict findings;
- time from implementation-clean to merge.

Without this separation, lesson mode appears to have a higher defect density than it actually does, while its real publication cost remains obscured.

### 7. Run a longer replicated experiment

Use at least several campaigns with three or more tasks each.

Include:

- a closely related second task, where code/tests may make prose redundant;
- a later task in different files that can benefit from a repository-level lesson;
- a task where the learned behavior is process-oriented and cannot be encoded directly in product tests;
- repeated treatment/control runs to average agent stochasticity.

Predefine primary measures:

- time to first clean implementation review;
- actionable findings before first clean review;
- total implementation fix commits;
- lesson lifecycle overhead;
- recurrence rate of previously observed defect classes;
- token or request cost when capture policy permits.

The most meaningful success criterion is not fewer raw comments. It is:

> A validated lesson prevents recurrence of a defect class in a context where merged code and tests alone would not have prevented it.

### 8. Add a “novel information” gate before publication

Before publishing a lesson, ask:

1. Is this already obvious from nearby code?
2. Is it already enforced by tests or tooling?
3. Will a future task encounter it outside the current implementation context?
4. Is its applicability broader than the evidence?
5. Can it be stated without carrying a source-specific constant into unrelated work?

Lessons that add no information beyond executable artifacts should be omitted or shortened. This reduces context load and overfitting risk.

## Recommended decision

Keep the lesson mechanism, because the experiment proves it can create durable, auditable campaign memory. Do not yet claim that it improves velocity.

Before the next efficacy trial:

1. add scope and transfer-risk metadata;
2. require target-context adaptation;
3. add non-applicability guidance for narrow lessons;
4. remove or reduce the post-publication review tail;
5. report implementation and lesson-lifecycle metrics separately.

The current result is best summarized as:

> **Collection worked. Propagation worked. Durable knowledge increased. Immediate downstream velocity and first-review quality did not improve, because executable code/tests already carried much of the useful learning and one textual lesson transferred too literally.**
