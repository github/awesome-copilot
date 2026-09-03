# Treatment-Control Post-Mortem: Arrival-Deadline Lesson Propagation

**Repository:** `edburns/dd-3058828-01-cargotracker`  
**Baseline:** `9b9f311b2a3a2854bdac947593950d9edb6bca7d`  
**Treatment:** campaign lesson propagation on, issues [#5](https://github.com/edburns/dd-3058828-01-cargotracker/issues/5)-[#9](https://github.com/edburns/dd-3058828-01-cargotracker/issues/9)  
**Control:** campaign lesson propagation off, issues [#10](https://github.com/edburns/dd-3058828-01-cargotracker/issues/10)-[#14](https://github.com/edburns/dd-3058828-01-cargotracker/issues/14)  
**Period covered:** 2026-09-03 01:02:53Z to 2026-09-03 22:28:07Z  
**Report generated:** 2026-09-03

## Executive conclusion

The experiment proves that the lesson-propagation **mechanism can capture, merge, and deliver prior-task lessons**, but it does **not** show a net velocity or first-review-quality benefit. The treatment merged all five tasks, as did the recovered control, and one forward-propagation observation is consistent with useful reuse: after [#6](https://github.com/edburns/dd-3058828-01-cargotracker/issues/6) taught fail-fast test doubles, [#7](https://github.com/edburns/dd-3058828-01-cargotracker/issues/7) used that pattern in its initial implementation. That is not proof of cognitive use, however, because the corrected test code merged at the same time as the prose lesson and no CCA transcript was captured.

The treatment incurred **20 distinct CCRA rounds and 11 findings**, versus **7 rounds and 2 findings** on the failure-normalized control path. More than half of the treatment review activity was lesson governance: **11/20 rounds, 6/11 findings, and 7/11 shepherd commits**. Treatment session time was **11h 39m 36s**, dominated by an unexplained **8h 45m 15.480s** stage-40 inactivity gap. Even after removing that anomaly and removing the failed control attempt, treatment used **2h 54m 20.520s**, **53m 01.994s (43.7%)** more than the control's **2h 01m 18.526s**. Both arms reached 5/5 merges, but treatment merged one unresolved locale-dependent date-format concern and deleted a previously validated JDK/Open Liberty lesson over a reviewer objection.

**Recommended decision:** do **not** adopt the current lesson mode as a default velocity feature. Continue it as a revised experiment only after eliminating candidate/validated lifecycle conflict, publishing lessons outside feature PR review, making the lesson store append-safe, and promoting reusable knowledge into tests, CI, or repository instructions. The mechanism is viable; the present workflow is not yet cost-effective or sufficiently durable.

## 1. Scope, evidence, and accounting rules

### 1.1 Authoritative artifacts

Path aliases used below:

- `TROOT`: `C:\Users\edburns\workareas\dd-3058828-01-cargotracker-shepherd-treatment\3-arrival-deadline-treatment-remove-before-merge`
- `TRUN`: `TROOT\shepherd-tasks-5426f64c-a653-4ff1-ba39-00209a83cdb4-20260902-1802`
- `CROOT`: `C:\Users\edburns\workareas\dd-3058828-01-cargotracker-shepherd-control\4-arrival-deadline-control-remove-before-merge`
- `CRUN-A`: `CROOT\shepherd-tasks-48f8a98a-83f9-466b-aa2e-14edbb4449e9-20260903-0555`
- `CRUN-B`: `CROOT\shepherd-tasks-48f8a98a-83f9-466b-aa2e-14edbb4449e9-20260903-1438`

Every file under those campaign directories was examined, including run manifests, task and OTEL JSONL, Markdown session exports, stage-20 issue bodies and ledgers, experiment manifests, both lesson files, the ignorance-reduction plans, and all three prior post-mortems. The four explicitly designated post-first-stage-30 treatment sessions are:

- `TRUN\phase1-task-20260902-1847-6.md`
- `TRUN\phase1-task-20260903-0400-7.md`
- `TRUN\phase1-task-20260903-0435-8.md`
- `TRUN\phase1-task-20260903-0520-9.md`

Structured JSON/OTEL supplies exact timing and local-CLI usage. Markdown exports supply semantic content because assistant text is redacted in task JSONL. GitHub API payloads embedded in those exports supply review IDs, comments, states, and SHAs. No CCA or CCRA cloud-side credit ledger and no CCA transcript exists.

### 1.2 Three control accounting units

The control is not one uninterrupted successful run:

1. **Original control attempt A:** `CRUN-A`, five tasks, outer exit 1, 4/5 merged.
2. **Recovery attempt B:** `CRUN-B`, issue [#14](https://github.com/edburns/dd-3058828-01-cargotracker/issues/14) only, outer exit 0, required an out-of-band owner comment before it could proceed.
3. **Observed control:** A+B, including duplicated issue-14 work, failure, recovery, and the seven-hour gap between attempts.

The **failure-normalized control** retains successful A work for issues 10-13, replaces failed A work for issue 14 with recovery B, and reports A's issue-14 work as failure/rework overhead. This normalization does not erase the observed cost.

### 1.3 System responsibilities

| Component | Responsibility | Evidence limitation |
|---|---|---|
| Copilot Coding Agent (CCA) | Initial implementation and requested-change follow-up | No CCA transcript or cloud usage; behavior inferred from commits, diffs, lifecycle events, and comments |
| Copilot Code Review Agent (CCRA) | Iterative feature and lesson-document review | Review IDs/findings captured; cloud usage absent |
| Local Copilot CLI shepherd | Stage 30 readiness/acceptance, stage 40 fixes/rereviews/merge, lesson validation/publication | Exact local session duration, AIU, calls, and tool events captured |

## 2. Run-level results and exact arithmetic

### 2.1 Attempt ledger

| Run | Mode | Tasks | Manifest window | Elapsed | Captured task sessions | Outcome |
|---|---|---:|---|---:|---:|---|
| Treatment | campaign | 5 | 01:02:53Z-12:48:42Z | **11h 45m 49s** | **11h 39m 36s** | 5/5 merged |
| Control A | off | 5 | 12:55:11Z-14:37:44Z | **1h 42m 33s** | **1h 38m 44.294s** | 4/5 merged; issue 14 failed |
| Control B | off | 1 | 21:38:42Z-22:28:07Z | **49m 25s** | **48m 45.251s** | issue 14 merged |
| Control A+B, orchestrated | off | 6 task executions | elapsed sums | **2h 31m 58s** | **2h 27m 29.545s** | 5 final merges |
| Control A+B, calendar | off | 6 task executions | 12:55:11Z-22:28:07Z | **9h 32m 56s** | same | includes **7h 00m 58s** inter-run idle |

Treatment arithmetic from export headers:

```text
Stage 30 = 22:51 + 11:43 + 12:50 + 24:02 + 15:39
         = 5,225s = 1h 27m 05s
Stage 40 = 20:43 + 541:06 + 20:15 + 20:07 + 10:20
         = 36,751s = 10h 12m 31s
Sessions = 41,976s = 11h 39m 36s
Elapsed  = 42,349s = 11h 45m 49s
Handoffs = 373s = 6m 13s
```

Control observed arithmetic:

```text
Sessions = 5,924,294ms + 2,925,251ms
         = 8,849,545ms = 2h 27m 29.545s
Elapsed  = 6,153s + 2,965s
         = 9,118s = 2h 31m 58s
Calendar = 34,376s = 9h 32m 56s
```

### 2.2 Observed and normalized comparison

| Metric | Treatment observed | Control observed A+B | Failure-normalized control | Treatment minus normalized control |
|---|---:|---:|---:|---:|
| Final tasks merged | 5/5 | 5/5 after 6 executions | 5/5 | equal |
| Orchestrated elapsed | 11h 45m 49s | 2h 31m 58s | not reconstructable as one contiguous run | — |
| Captured task-session time | 11h 39m 36s | 2h 27m 29.545s | **2h 01m 18.526s** | **+9h 38m 17.474s; 5.77x** |
| Stage 30 | 1h 27m 05s | 1h 52m 06.706s | **1h 32m 22.213s** | **-5m 17.213s; 5.7% faster** |
| Stage 40 | 10h 12m 31s | 35m 22.839s | **28m 56.313s** | **+9h 43m 34.687s; 21.17x** |
| Distinct CCRA rounds | 20 | 8 | **7** | **+13; 2.86x** |
| Actionable findings | 11 | 2 | **2** | **+9; 5.5x** |
| Finding-free final reviews | 5/5 | 5/5 | 5/5 | equal by recorded header |
| Local fix/publication commits | 11 | 2 | 2 | +9 |
| Local CLI AIU | 659.91325 | 465.50702 | **408.50658** | **+251.40667; 61.5%** |
| Premium requests | 10 | 12 | **10** | equal |

The treatment stage-40 number includes the unexplained 31,515.480-second gap in `TRUN\phase2-task-20260902-1859-6.jsonl`. Removing only that gap gives:

```text
Treatment anomaly-normalized sessions = 41,976.000s - 31,515.480s
                                      = 10,460.520s = 2h 54m 20.520s
Delta vs failure-normalized control    = 10,460.520s - 7,278.526s
                                      = 3,181.994s = 53m 01.994s
Relative increase                     = 3,181.994 / 7,278.526 = 43.72%
```

This sensitivity view is the fairest velocity comparison available, but it is not a randomized replay. It removes one treatment anomaly and one control failure while retaining normal lesson-publication work.

### 2.3 Failure and recovery costs retained

| Cost bucket | Session time | API time | AIU | Premium | Model calls | Productive result |
|---|---:|---:|---:|---:|---:|---|
| Control A issue-14 semantic failure, stage 30 | **19m 44.493s** | 1m 19.347s | **23.04788** | 1 | 12 | none |
| Control A observability defect, stage 40 | **6m 26.526s** | 1m 29.276s | **33.95256** | 1 | 19 | none; draft-ready-draft churn and wasted review |
| **Control A issue-14 total failure/rework** | **26m 11.019s** | **2m 48.623s** | **57.00044** | **2** | **31** | none |
| Control B issue-14 recovery | **48m 45.251s** | **7m 02.556s** | **117.51704** | **2** | **63** | merged |

Failure/rework was **17.7526%** of observed control session time and **12.2448%** of observed control AIU. The two control post-mortem sessions are excluded from task comparisons but cost another **6m 34.271s, 124.67915 AIU, and 2 premium requests**. Including them, control consumed **2h 34m 03.816s and 590.18617 AIU** locally.

## 3. All five paired tasks

Task 1 is not a forward-propagation test: treatment issue 5 had no validated prior campaign lesson. Tasks 2-5 are the four forward observations.

| Pair | Feature | Treatment issue/PR | T stage 30 / 40 / total | T rounds; findings | Control issue/PR | C successful-path stage 30 / 40 / total | C rounds; findings | Interpretation |
|---:|---|---|---:|---:|---|---:|---:|---|
| 1 | Application service | [#5](https://github.com/edburns/dd-3058828-01-cargotracker/issues/5)/[#15](https://github.com/edburns/dd-3058828-01-cargotracker/pull/15) | 22:51 / 20:43 / **43:34** | 5; 3 | [#10](https://github.com/edburns/dd-3058828-01-cargotracker/issues/10)/[#20](https://github.com/edburns/dd-3058828-01-cargotracker/pull/20) | 9:03.051 / 3:35.504 / **12:38.555** | 1; 0 | Baseline treatment overhead, not lesson benefit |
| 2 | Booking facade | [#6](https://github.com/edburns/dd-3058828-01-cargotracker/issues/6)/[#16](https://github.com/edburns/dd-3058828-01-cargotracker/pull/16) | 11:43 / 541:06 / **9:12:49** | 4; 2 | [#11](https://github.com/edburns/dd-3058828-01-cargotracker/issues/11)/[#21](https://github.com/edburns/dd-3058828-01-cargotracker/pull/21) | 8:45.445 / 3:35.280 / **12:20.725** | 1; 0 | No plausible use of issue-5 lessons; treatment dominated by idle anomaly |
| 3 | Backing model | [#7](https://github.com/edburns/dd-3058828-01-cargotracker/issues/7)/[#17](https://github.com/edburns/dd-3058828-01-cargotracker/pull/17) | 12:50 / 20:15 / **33:05** | 4; 3 | [#12](https://github.com/edburns/dd-3058828-01-cargotracker/issues/12)/[#22](https://github.com/edburns/dd-3058828-01-cargotracker/pull/22) | 10:37.390 / 10:34.172 / **21:11.562** | 2; 1 | One strong but confounded lesson-transfer signal |
| 4 | Deadline dialog | [#8](https://github.com/edburns/dd-3058828-01-cargotracker/issues/8)/[#18](https://github.com/edburns/dd-3058828-01-cargotracker/pull/18) | 24:02 / 20:07 / **44:09** | 4; 2 | [#13](https://github.com/edburns/dd-3058828-01-cargotracker/issues/13)/[#23](https://github.com/edburns/dd-3058828-01-cargotracker/pull/23) | 22:11.769 / 4:10.664 / **26:22.433** | 1; 0 | Prior prose did not prevent dialog defect; control shepherd found a separate acceptance defect in stage 30 |
| 5 | Dashboard integration | [#9](https://github.com/edburns/dd-3058828-01-cargotracker/issues/9)/[#19](https://github.com/edburns/dd-3058828-01-cargotracker/pull/19) | 15:39 / 10:20 / **25:59** | 3; 1 | [#14](https://github.com/edburns/dd-3058828-01-cargotracker/issues/14)/[#24](https://github.com/edburns/dd-3058828-01-cargotracker/pull/24) | 41:44.558 / 7:00.693 / **48:45.251** | 2; 1 | Treatment faster, but control recovery did much deeper acceptance and needed human unblocking |

### 3.1 Pair 1: no prior-lesson benefit

Treatment [#5](https://github.com/edburns/dd-3058828-01-cargotracker/issues/5) produced feature head `7c20562fcfa26a9b08596f73039bca0203b06f62`, code fix `751172c`, three lesson-publication commits (`e0f87c8`, `9f6a464`, `7ce4a04`), and merge `315d06d`. Its five reviews contained one code finding and two lesson-document findings; four fix cycles followed. Control [#10](https://github.com/edburns/dd-3058828-01-cargotracker/issues/10) merged cleanly at `044a0bc5fd70e050bb6c2bc473fd0b75368ce0d0` after one finding-free review.

This pair estimates initial mechanism burden, not propagation value: treatment was **30m 55.445s** slower and added three lesson-only corrective commits.

### 3.2 Pair 2: no observable forward use

Treatment [#6](https://github.com/edburns/dd-3058828-01-cargotracker/issues/6) could read issue-5 lessons, but those application-layer and mutable-logging lessons were not directly relevant to the thin facade. It produced code fix `f8456db`, lesson publication `b01c314`, and merge `ad56c7a`. Its four distinct reviews include review `5097048476`, rendered twice in the transcript; counting rendered blocks would incorrectly report five rounds.

The treatment session's **8h 45m 15.480s** event gap ran from 02:06:24.211Z to 10:51:39.691Z. The artifacts do not distinguish host suspension, CLI suspension, or delayed notification. Control [#11](https://github.com/edburns/dd-3058828-01-cargotracker/issues/11) merged at `db5f17227d83ca96db8daf2f1df9d892caade7c8` with no findings. This pair supplies no lesson-value evidence.

### 3.3 Pair 3: strongest propagation observation

Treatment [#7](https://github.com/edburns/dd-3058828-01-cargotracker/issues/7) began 38 seconds after [#6](https://github.com/edburns/dd-3058828-01-cargotracker/issues/6)'s merge delivered this validated lesson:

> "Make every operation outside the expected delegation fail fast so the test detects accidental extra service calls rather than silently accepting them."

The initial `ChangeArrivalDeadlineDateTest` at `8e4c4cd8dcca8179b67c4ebb470569aad5abc1ea` made every unexpected facade method throw `AssertionError`, unlike issue 6's original permissive fake. The task's own candidate then paraphrased the fail-fast rule. This is observable behavioral consistency with the lesson. It is not causal proof: corrected test code `f8456db` was also present on the base, so CCA could have copied the executable exemplar without cognitively using the prose.

Treatment still required code correction `26862c7a2b4f399e05aa6b555f8a6ee1c9b156b7`, lesson publication `8d968392bb3dbfc4cdc985c16644792e1e61e8c5`, four reviews, and merge `4918df178a5b11e35e58cc2e029f05e3e7c9463f`. Control [#12](https://github.com/edburns/dd-3058828-01-cargotracker/issues/12) needed one stale-state fix, `a91e2329b838919941d64f3a418966a52312f256`, then merged at `5e78ed7d5ed4e9957503a8c0c7573229f1fd511d`.

### 3.4 Pair 4: lesson availability did not prevent rework

Treatment [#8](https://github.com/edburns/dd-3058828-01-cargotracker/issues/8) had three validated sections available, yet CCRA found Cancel could be blocked by required-field validation. Commit `4d70a02` added `process="@this"`; lesson commit `e415e2855988fff86321adbfc67b03a7ec249bfc` followed; merge was `c43f288f4f6ca2f7620fe3cb443b07c7de471762`.

A later "Needs a closer look" review warned that `p:datePicker` lacked an explicit pattern and was locale-dependent, but its structured header said `Findings: None`. The gate did not act on it, and the concern merged unresolved. Thus a finding-free terminal header does not establish final semantic quality.

Control [#13](https://github.com/edburns/dd-3058828-01-cargotracker/issues/13) had no CCRA finding, but stage 30 itself found missing visible validation feedback. The shepherd requested changes; CCA added `process="@form"` and `update="deadlineMessage"` in `8f248b8e152750cc8a233e3917408db02b115d6b`, and the task merged at `f02c007c44499ae7c97e17dc3f534831ed3360f3`. This is a reminder that review counts cover only CCRA, not acceptance defects found before review.

### 3.5 Pair 5: treatment velocity win with governance loss

Treatment [#9](https://github.com/edburns/dd-3058828-01-cargotracker/issues/9) required no code correction and merged at `f52c8ddc43cbedc411491d56582c459656678442`. Its mirrored table action was already specified by the issue, so it cannot be attributed to prior lessons. Lesson commit `8075334e3bd1df5f585eb219f96ea26914a2c9c8` inserted issue 9 out of order and deleted the validated JDK/Open Liberty lesson. CCRA explicitly requested restoration; the shepherd declined, resolved the thread, rereviewed unchanged content, and merged.

Control [#14](https://github.com/edburns/dd-3058828-01-cargotracker/issues/14) is not a clean comparator. Recovery stage 30 performed the full Liberty/HTTP/browser `DEF789` flow, rewrote the PR body, and approved it. Stage 40 then fixed spacing in `4e413e8a32b042ef68c3abeafeda47b9460edde6` and merged at `6448e709623bbfbe843913bd19e82f355ae89fa1`. Treatment was **22m 46.251s** faster on captured successful-path session time, but the control evidence was materially deeper and recovery was not autonomous.

## 4. Review, retry, and fix-cycle accounting

### 4.1 Reviews and findings

| Task | Treatment rounds | Treatment findings | Code / lesson | Control rounds on successful path | Control findings |
|---:|---:|---:|---:|---:|---:|
| 1 | 5 | 3 | 1 / 2 | 1 | 0 |
| 2 | 4 | 2 | 1 / 1 | 1 | 0 |
| 3 | 4 | 3 | 2 / 1 | 2 | 1 |
| 4 | 4 | 2 | 1 / 1 | 1 | 0 |
| 5 | 3 | 1 | 0 / 1 | 2 | 1 |
| **Total** | **20** | **11** | **5 / 6** | **7** | **2** |

Treatment lesson-attributable rounds are [#5](https://github.com/edburns/dd-3058828-01-cargotracker/issues/5) rounds 3-5 and tasks 6-9's final two rounds each: **11/20 (55%)**. Lesson findings are **6/11 (54.5%)**. The first-review code-finding comparison is not favorable to treatment: paired counts were **1-0, 1-0, 2-1, 1-0, 0-0**, while control also found pre-review acceptance defects on tasks 4 and 5.

Control had eight distinct CCRA reviews across both attempts, not nine: review `5103242809` was created in attempt A and merely used as the `previous` watermark in B. Failure normalization excludes that wasted A review, yielding seven productive-path rounds.

### 4.2 Treatment publication and fix cycles

| PR | Code fix commits | Lesson commits | Lesson rereviews | Lifecycle outcome |
|---|---|---|---:|---|
| [#15](https://github.com/edburns/dd-3058828-01-cargotracker/pull/15) | `751172c` | `e0f87c8`, `9f6a464`, `7ce4a04` | 3 | content and heading corrected |
| [#16](https://github.com/edburns/dd-3058828-01-cargotracker/pull/16) | `f8456db` | `b01c314` | 2 | conflict argued; unchanged lesson head accepted |
| [#17](https://github.com/edburns/dd-3058828-01-cargotracker/pull/17) | `26862c7` | `8d96839` | 2 | conflict argued; unchanged lesson head accepted |
| [#18](https://github.com/edburns/dd-3058828-01-cargotracker/pull/18) | `4d70a02` | `e415e28` | 2 | conflict argued; unchanged lesson head accepted |
| [#19](https://github.com/edburns/dd-3058828-01-cargotracker/pull/19) | none | `8075334` | 2 | conflict argued; prior lesson deletion retained |

There were **4 code-fix commits and 7 lesson-only commits**. Lesson Markdown was 47 added lines, **9.7%** of the initial treatment production/test-plus-lesson additions; on the small final task it was **40%** of the CCA diff.

### 4.3 Recoverable retries and soft failures

Treatment had no outer hard failure, but successful tool wrappers conceal in-command retries:

- JDK 25 could not compile the Java-7 target; JDK 17 or compiler target overrides were rediscovered repeatedly.
- Spotless was absent.
- CRLF-sensitive lesson guards required reruns.
- PowerShell quoting and GraphQL interpolation errors were reconciled from API state.
- Issue 8's direct HTTP acceptance encountered `ViewExpiredException`.
- Issue 6's stage-40 wait returned a partial buffer, followed by the unexplained 8h45m gap.

Control recorded **19 recoverable non-zero command exits**: 13 in A and 6 in B. These included readiness-gate reruns, absent Spotless, JDK mismatch, failed browser selectors/overlay interactions, an expected 404 probe, and an FFDC regex error. They did not cause the outer failure; issue 14's semantic and orchestration defects did.

## 5. Control failure and recovery analysis

### 5.1 Stage-30 semantic failure

CCA implemented [#14](https://github.com/edburns/dd-3058828-01-cargotracker/issues/14) at head `1d3986ebcb8d5eeaae999dd4789fded0a207390d`, but its PR body lacked mandatory Liberty, HTTP, browser, persistence, cancel, regression, log, and final-build evidence. Stage 30 submitted requested-changes review `5103084089`.

CCA then emitted a follow-up lifecycle cycle (14:20:01Z-14:21:13Z) and claimed it had updated the evidence, but neither HEAD nor the 1,238-character body changed. Stage 30 watched only HEAD and waited approximately 10m18s before failing. A body-only update would also have appeared as no progress, so the comparator was semantically incomplete even if CCA had made the correct kind of edit.

### 5.2 Orchestration observability defect

The failed stage-30 task JSONL still reported `result.exitCode: 0`; only the outer run manifest reported exit 1. Stage 40 therefore started, marked [#24](https://github.com/edburns/dd-3058828-01-cargotracker/pull/24) ready, requested review `5103242809`, and obtained zero CCRA findings before discovering the stage-30 failure by ripgrepping the prior Markdown transcript. It restored draft state and refused merge.

That avoidable stage-40 session cost **6m 26.526s, 33.95256 AIU, one premium request, and 19 model calls**. It also created lifecycle churn and an orphan `copilot_work_started` at 14:33:31Z with no matching finish.

These costs are not lesson-mode costs. Every control manifest says `lessonPropagation: off`; `CROOT\campaign-lessons.md` remained "No validated lessons have been recorded yet"; no control session published lessons.

### 5.3 Recovery was successful but not autonomous

Attempt B spent roughly 30 minutes polling the orphaned lifecycle start. At 22:04:53Z, repository owner `edburns` posted an out-of-band `@copilot` resume comment. No command in either run created that comment. CCA then ran 22:05:11Z-22:09:53Z and stated browser OAuth was unavailable on its runner.

The local shepherd, not CCA, generated the missing acceptance evidence: JDK 17/Open Liberty startup, HTTP 200 checks, `DEF789` deadline `11/04/2026` to `11/05/2026`, Ajax update, reload persistence, dialog reinitialization, cancel no-change, destination-dialog regression, logs/FFDC/JMS checks, clean stop, and final build of 97 main and 12 test sources. It updated the PR body and approved at 22:19:48Z.

Recovery CCRA round `5107393045` found one low-severity spacing issue, fixed in `4e413e8`; rereview `5107413156` was finding-free; merge `6448e709623bbfbe843913bd19e82f355ae89fa1` completed at 22:27:48Z.

## 6. Lesson lifecycle and propagation

### 6.1 Capture, validation, merge, and delivery

| Source task | Lessons captured | Validated/published | Merge delivering lessons | Available to later tasks | Final state |
|---:|---:|---|---|---|---|
| 1 / issue 5 | 2 | yes | `315d06d` | tasks 2-5 | both retained |
| 2 / issue 6 | 3 | yes | `ad56c7a` | tasks 3-5 | 2 retained; JDK/Liberty lesson later deleted |
| 3 / issue 7 | 2 | yes | `4918df1` | tasks 4-5 | retained |
| 4 / issue 8 | 2 | yes | `c43f288` | task 5 | retained, but no applicable consumer |
| 5 / issue 9 | 1 | yes | `f52c8dd` | no task remained | retained |

Delivery is proven at the artifact level:

1. Every treatment issue body instructed CCA to read `campaign-lessons.md`, and stage-20 verified all bodies.
2. Stage 30 fetched the current base file before assignment for later tasks.
3. Every CCA PR read and edited the lesson file at offsets requiring current content.
4. Issue 9's patch context quoted issue-6 lesson lines.

This proves **delivery into the work context**, not mental reliance. Only CCA transcripts could prove explicit reasoning from a lesson, and none were captured.

### 6.2 Lesson inventory and value

| Lesson | Origin | Downstream evidence | Assessment |
|---|---|---|---|
| Replace whole route specification, invoke aggregate, store | issue 5 code | implementation and `BookingServiceTest` | durable in code/test; no distinct later consumer |
| Log defensively copied date | issue-5 CCRA | one corrected line | useful but untested |
| Keep facade thin | issue 6 code | facade test | encoded; issue 7 did not need facade implementation |
| Fail unexpected test-double calls fast | issue-6 CCRA | initial issue-7 fake uses `AssertionError` | strongest propagation signal, confounded by merged code exemplar |
| Use JDK 17/Open Liberty compile gate | issue 6 execution | repeatedly rediscovered; CI already encodes JDK 17 | high reuse value, but deleted from prose |
| Parse DTO date once, strictly, and wrap failure | issue 7 code/review | focused test | durable in test; little remaining applicability |
| Container-free CDI fake with strict fixtures | issue 7 code/review | test | durable; no later bean task |
| Place `<f:metadata>` under root | issue 8 | already literal in issue body | specification echo; zero remaining consumers |
| Cancel with `process="@this"` | issue-8 CCRA | corrected XHTML | useful but no test and no later form consumer |
| Mirror adjacent dialog action and table update | issue 9 | already required by issue body | generalized too late; zero campaign consumers |

The final file contains nine lessons because the JDK/Open Liberty lesson was lost. Section order is `#5, #6, #9, #7, #8`, not chronological. Issue 9's insertion landed mid-section, orphaned the environment lesson beneath its candidate heading, and stage 40's replacement deleted it.

### 6.3 Candidate/validated lifecycle conflict

Every issue required a `Candidate lessons for issue #N` section and preservation of validated lessons. Stage 40 required replacing that heading with `Validated lessons from issue #N (PR #M)` and forbade candidate sections at merge. CCRA reviewed against the issue contract. The result was a conflict on **5/5 treatment PRs**.

For PRs [#16](https://github.com/edburns/dd-3058828-01-cargotracker/pull/16)-[#19](https://github.com/edburns/dd-3058828-01-cargotracker/pull/19), the shepherd replied that stage 40 overrode the issue wording, resolved the thread, and requested rereview without changing the heading. On [#19](https://github.com/edburns/dd-3058828-01-cargotracker/pull/19), it also rejected the reviewer's correct request to restore the deleted environment lesson.

Consequently, the final finding-free rereviews are evidence of thread convergence, not independent proof that lesson metadata was correct.

### 6.4 Stale applicability and overgeneralization

- Six of nine retained lessons cite transient "finding-free review" evidence that cannot be verified from the repository alone and will decay.
- The `<f:metadata>` and table-action lessons repeat their issue bodies and arrived after their last plausible consumer.
- The issue-9 table-action lesson was generalized from one dashboard row to all PrimeFaces table actions without a second validating use.
- The broadest operational lesson, JDK 17/Open Liberty, was judged non-reusable and deleted even though multiple sessions rediscovered it.
- The unresolved date-picker locale concern was neither fixed nor captured.

## 7. Prose versus durable knowledge

| Knowledge | Prose lesson | Code/test/CI/API encoding | Durable conclusion |
|---|---|---|---|
| Route-spec replacement | yes | production code and regression test | test is authoritative |
| Thin facade / fail-fast fake | yes | focused tests; pattern replicated | tests provide durable reuse |
| Strict date parsing | yes | implementation and malformed-date test | test is authoritative |
| JDK 17/Open Liberty | deleted | workflow uses JDK 17 | CI preserved the fact despite prose loss |
| `<f:metadata>` placement | yes | current XHTML only | fragile; no regression gate |
| Cancel bypasses validation | yes | XHTML attribute only | fragile; no regression gate |
| Dialog/table integration | yes | current XHTML only | fragile; no automated acceptance |
| `DEF789` end-to-end flow | no durable lesson | temporary scripts deleted | expensive knowledge evaporated |
| CCA lifecycle/body progress | control artifact narrative | no machine-readable stage result | orchestration knowledge remains fragile |

The durable-knowledge result is therefore mixed. Lesson prose added discoverability, but code, tests, CI, and API contracts carried most reliable knowledge. The most expensive runtime verification did not become a committed test, and the lesson store itself lost validated content.

## 8. Value assessment

| Value dimension | Result | Evidence |
|---|---|---|
| **Mechanism value** | **Positive but defective** | Lessons were captured, validated, merged, fetched, and edited by later CCA runs; append safety and lifecycle semantics failed |
| **Immediate velocity value** | **Negative** | Anomaly-normalized treatment remained 53m01.994s/43.7% slower than failure-normalized control; stage 40 carried publication overhead |
| **First-review-quality value** | **Not demonstrated** | Treatment had 5 code findings in first review sequences versus fewer control CCRA findings; issue complexity and pre-review stage-30 catches confound the count |
| **Final-quality value** | **No advantage; possible treatment regression** | Both arms merged 5/5 and ended with finding-free headers, but treatment retained an unaddressed locale concern and deleted a validated lesson |
| **Durable-knowledge value** | **Limited** | One plausible propagation, several useful prose entries, but reusable facts were already in tests/CI or were not promoted there |

Local usage reinforces the cost result: treatment used **659.91325 AIU** versus **408.50658 AIU** on the normalized control path. Treatment OTEL also exposes approximately **16,558,681 local model tokens** across 333 calls, but control token labels/counts are redacted in the supplied control artifacts, so no valid token delta is reported. CCA/CCRA cloud costs are absent for both arms.

## 9. Timeline

| UTC | Event |
|---|---|
| 01:02:53 | Treatment begins |
| 01:46:50 | Treatment task 1 merged; first lessons delivered |
| 01:59:18 | Treatment task 2 stage 40 begins |
| 02:06:24-10:51:39 | Unexplained treatment inactivity gap |
| 11:00:24 | Treatment task 2 merged; fail-fast and environment lessons delivered |
| 11:34:26 | Treatment task 3 merged |
| 12:20:12 | Treatment task 4 merged |
| 12:47:46 | Treatment task 5 merged; environment lesson deleted |
| 12:48:42 | Treatment run succeeds |
| 12:55:11 | Original control A begins |
| 13:08:04-14:09:55 | Control tasks 1-4 merge |
| 14:19:26 | Control issue 14 receives requested changes for absent acceptance evidence |
| 14:30:17 | Stage 30 ends semantically failed despite process exit 0 |
| 14:34:29 | Wasted CCRA review on prematurely readied PR |
| 14:37:44 | Control A exits failed; PR restored to draft |
| 21:38:42 | Control recovery B begins |
| 22:04:53 | Out-of-band owner comment unblocks CCA lifecycle |
| 22:19:48 | Shepherd publishes acceptance evidence and approves |
| 22:27:48 | Control issue 14 merges |
| 22:28:07 | Recovery succeeds |

## 10. Confounders and limits

1. **n=1 campaign pair.** Five serial paired tasks do not provide independent samples; each task differs in implementation surface and inherits prior merged code.
2. **Stochastic agents and reviewers.** CCA implementation choices, CCRA findings, latency, and rereview outcomes can differ across runs even with identical inputs.
3. **No CCA transcript.** Delivery is proven, cognitive use is inferred. The strongest apparent reuse is inseparable from the corrected code exemplar merged with the lesson.
4. **No cloud usage.** Local AIU excludes CCA and CCRA. Treatment's 13 extra review rounds therefore have an unmeasured additional cost.
5. **Different acceptance histories.** Control task 5 required a recovery and deeper shepherd-owned browser evidence; treatment task 5 did not receive equivalent durable acceptance work.
6. **Human intervention.** Recovery depended on an out-of-band owner comment, so it is not evidence of autonomous convergence.
7. **Treatment timing anomaly.** The 8h45m gap is real but unexplained. Reporting both observed and anomaly-normalized values avoids assigning it to lesson mode without evidence.
8. **Semantic counts differ by layer.** Review overview headers can omit documentation-only comments; duplicated render blocks can inflate rounds. This report counts distinct review IDs and separately classifies findings.
9. **Finding-free does not mean concern-free.** PR [#18](https://github.com/edburns/dd-3058828-01-cargotracker/pull/18)'s blue locale warning had `Findings: None`; resolved threads can make unchanged lesson content appear clean.
10. **Snapshot chronology.** Treatment campaign files were copied after the run. The prior post-mortem's observation that the local lesson file was stale is no longer reproducible; the current copy contains the merged lessons.
11. **Serialization.** One stalled stage-40 session blocked every later treatment task, magnifying latency.
12. **Issue text overlap.** Several "lessons" repeated explicit later issue requirements, preventing attribution.

## 11. Recommendations

1. **Separate lesson publication from feature PR review.** Capture candidates in a machine-readable run artifact, merge the feature, then publish validated lessons in one append-only campaign commit or dedicated PR. Do not force CCRA to reconcile contradictory candidate and validated headings.
2. **Make the lesson store append-safe and ordered.** Address entries by stable issue/PR identity, preserve all prior sections structurally, reject deletion or reordering unless an explicit supersession record names the removed lesson and reason.
3. **Require reusable evidence, not transient approval prose.** Cite tests, code symbols, workflow paths, API contracts, or stable commit SHAs. Reject "passing CI" and "finding-free review" as primary evidence.
4. **Promote lessons to executable controls.** Commit the DEF789 acceptance flow; add tests for Cancel validation bypass and explicit date-picker formatting; encode JDK/runtime constraints in repository instructions and CI.
5. **Fix stage-result observability.** Emit a machine-readable stage result containing `semanticStatus`, reason, issue, PR, HEAD SHA, body hash, and acceptance-gate outcomes. Stage 40 must require stage-30 success rather than infer it from process exit or grep Markdown.
6. **Observe all progress surfaces.** Compare HEAD, PR-body hash/update timestamp, comments, and lifecycle events. Treat orphan starts as stale after a bounded interval and permit an explicit retry/reassignment path.
7. **Normalize timestamps to UTC.** Persist ISO-8601 values and match lifecycle starts/finishes by event identity before polling.
8. **Gate on review semantics, not only finding count.** Treat "Needs a closer look," refusal, or non-approval verdicts as non-clean even when structured finding count is zero.
9. **Count review IDs, not rendered blocks.** Store review ID, commit ID, verdict, findings, and request lineage once to avoid duplicate partial-buffer renders.
10. **Instrument lesson overhead directly.** Record lesson-read, candidate-write, validation, publication, conflict-resolution, and rereview durations so mechanism cost does not need to be estimated from whole sessions.
11. **Run a larger crossover replication.** Use multiple campaigns, randomize arm/order where possible, replay equivalent issue bodies, capture CCA reasoning and cloud usage, and predefine primary metrics: anomaly-normalized elapsed, first-review code findings, review rounds, and executable knowledge retained.
12. **Adopt only high-value lesson classes during the next trial.** Prefer cross-task environment constraints and review-derived bug patterns with at least one future consumer. Suppress issue-local specification echoes and lessons generated after their last consumer.

## 12. Final decision

**Decision: revise and re-run; do not roll out the current campaign lesson mode.** Keep the capture/delivery mechanism behind an experimental flag. The next experiment should test an append-only, post-merge publisher that turns reusable lessons into executable repository knowledge and has machine-readable stage outcomes. Success should require a statistically repeated reduction in anomaly-normalized elapsed time or first-review code findings without lesson-governance rereview inflation or knowledge loss.
