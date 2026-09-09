# Estimation model reference

The method behind `katalon-test-estimation`. Five buckets, three points each, one combined band.

## The five buckets

Most people say "estimate the test cycle" and mean bucket B alone. Sizing only B is the most common way a test estimate comes in low.

| # | Bucket | Unit | Countable input | Rate source |
|---|---|---|---|---|
| A | **Design** new coverage | person-hours | uncovered requirements x cases per requirement | team, minutes per new case |
| B | **Manual execution** | person-hours | manual case count x configurations in the manual matrix | team, minutes per case |
| C | **Automated execution and triage** | wall clock + person-hours | automated case count x configurations; failure rate | platform for elapsed, team for triage minutes per failing result |
| D | **Automation authoring** | person-hours | cases selected for automation | team, hours per case |
| E | **Fixed overhead** | percentage of A+B+C+D | none | team, typically 10 to 20 percent |

Rules:

- A bucket that is out of scope is **recorded as zero with the reason**. Silence reads as forgetting.
- Rework is not a sixth bucket. Retest of failures lives inside B, triage of failures inside C. Modelling it separately double-counts.
- Exploratory or session-based testing, when the cycle includes it, is timeboxed rather than estimated. Add the timebox as a stated line, not as a derived figure.

## Three-point arithmetic

For each bucket collect optimistic `O`, most likely `M`, pessimistic `P`.

```text
PERT mean   E  = (O + 4M + P) / 6
Deviation   SD = (P - O) / 6
```

Combine independent buckets:

```text
Total mean = sum of the bucket means
Total SD   = sqrt( SD_A^2 + SD_B^2 + SD_C^2 + SD_D^2 )
```

Overhead E is a percentage of the rest, so scale the combined SD by the same factor rather than giving it its own three points.

Report the **80 percent band** as `mean +/- 1.28 x SD`, rounded outward to whole hours. Use 90 percent (`1.64 x SD`) only when the ask is a commitment date rather than a plan figure, and say which multiplier you used.

Setting the three points honestly:

- `M` comes from count x rate. It is the only one with arithmetic behind it.
- `O` assumes nothing goes wrong and no rework. Usually 0.8 x M.
- `P` is the one that carries the information. Set it from a named risk, not a multiplier - "the 8 uncovered requirements turn out to need 7 cases each, not 4". If you cannot name the risk, `P` is 1.5 x M and confidence cannot be High.

## Lane units, and why they must not be added

| Lane | What consumes it | Unit | What shortens it |
|---|---|---|---|
| Manual | a person, per case, per configuration | person-hours | more people, until design and triage serialize |
| Automated | machines, bounded by session concurrency | wall clock | more parallel sessions - and this changes person-hours by zero |
| Automated, human side | triage of failing results | person-hours | a lower failure rate, or fewer flaky cases |
| Run with AI | platform wall clock, plus a human reviewing the AI session | wall clock + person-hours | nothing the estimator controls; treat the wall clock as fixed and estimate only the review |

**Never add wall clock to person-hours.** They answer different questions - one is "will it fit in the window", the other is "how many people do I need".

## Rework multiplier

Failures generate two costs, and both are already inside a bucket:

```text
failing results   = total results x (1 - pass rate)
triage hours      = failing results x triage minutes / 60          -> bucket C
manual retest     = failing manual cases x execution minutes / 60  -> bucket B
```

Flaky cases inflate the failing count without indicating product defects. Use the unstable-case count as the driver of `P` rather than of `M`, since a flake may or may not fire on any given run.

## Resourcing arithmetic

```text
person-days   = person-hours / productive hours per day
Fixed window  testers  = person-days / working days in the window
Fixed team    days     = person-days / testers
```

Two corrections that stop the naive division from lying:

1. **Serialization.** Triage and reporting cannot start before execution ends. Subtract that tail from the window before dividing, and state it.
2. **Parallelism limits.** Manual execution parallelizes well across cases. Design parallelizes to roughly two people before coordination cost exceeds the gain. Triage of one suite rarely parallelizes at all. Adding people to a late cycle moves B and almost nothing else.

Report both directions - headcount for a fixed date, and a date for a fixed team - because the asker usually has one of them fixed and has not said which.

## Confidence rubric

| Label | Conditions | Typical band width |
|---|---|---|
| **High** | The per-unit rate was measured in this project on a comparable cycle within the last 90 days, scope is frozen, and the platform returned a count for every bucket | under +/- 15% |
| **Medium** | The rate is team-declared, or measured on a different project or an older cycle, or one bucket's count is an estimate rather than a platform figure | +/- 15 to 35% |
| **Low** | No measured rate anywhere, or scope is still moving, or the platform returned nothing for a bucket that matters | wider than +/- 35% |

At **Low**, deliver the model and the shape but refuse the headline number, and name the one measurement that would move it to Medium. That is usually "time 20 real cases".

## Sensitivity

Find the dominant term before publishing. For each team-supplied rate, recompute the total with the rate 25 percent higher and report the delta in hours. Rank the drivers and print the top two or three.

The dominant term is almost always the largest bucket's rate. If a 25 percent miss on one input moves the total by more than the entire 80 percent band, that input is the estimate - say so, and ask for it to be measured before the number is used to commit to anything.

## Re-estimation

An estimate is a snapshot of a scope. When scope changes, re-run the model rather than adjusting the number, and publish the delta with the driver named: "+31.5 h, adding Safari to the manual lane". Never quietly revise a published estimate downward to fit a date; state which lever was pulled - scope, people, or window.
