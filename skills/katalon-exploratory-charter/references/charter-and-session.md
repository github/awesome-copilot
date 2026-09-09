# Charter and Session

## The six-field charter template

Copy this verbatim. All six fields are required. The hard rule first: **no oracle, no charter.**

```text
CHARTER      <id, e.g. CH-01>
Mission      <what you are exploring, and what information you want out of it>
Areas        <the surfaces in scope, named concretely>
Oracles      <the rules a finding could break, each one checkable>
Tours        <the two or three tours you will use>
Timebox      <45, 60, or 90 minutes, how many testers, which environment>
Out of scope <the adjacent things you will not chase>
Done when    <the observable condition that ends the session>
```

| Field | The one rule |
|---|---|
| Mission | A target plus an information goal. If it does not say what you want to *learn*, it is not a mission. |
| Areas | Named surfaces, not the whole feature. Four is a session, twelve is a release. |
| Oracles | Each one must be checkable by a second person. Point at an acceptance line, a covered flow, a published behavior, or a stated purpose. |
| Tours | Named in advance so another tester can reproduce the session, not just the bugs. |
| Timebox | Includes the environment. A charter that does not say where it runs will be run in the wrong place. |
| Out of scope | Written down so a tempting detour becomes a note instead of a lost 20 minutes. |
| Done when | An observable condition. "When I have looked at it enough" is not one. |

## Good versus bad missions

The difference is always the same: a target plus an information goal.

| Bad | Good | What changed |
|---|---|---|
| Test checkout. | Explore guest checkout payment with declined, expired, and mistyped cards, to discover error-handling and cart-state defects. | Named the surface, named the inputs, named what you want to learn. |
| Have a look at the new search. | Explore search filters with empty, single, and conflicting selections, to discover result-count and reset defects. | Replaced "have a look" with the conditions that could break it. |
| Check the mobile layout works. | Explore the order history screen at 320px and on a slow network, to discover truncation, overflow, and loading-state defects. | Gave the vague quality bar concrete conditions and an information goal. |

## The session sheet

One line per note. Timestamped, typed, written as you go and never reconstructed afterwards.

| Type | Means | Rule |
|---|---|---|
| `SETUP` | Getting the environment ready | Counts against the timebox. Log it honestly. |
| `OBS` | Something observed, no rule broken | The default. Most notes are this. |
| `Q` | A question no oracle answers | Names the missing rule, and who should answer. |
| `BUG` | An oracle was broken | **Carries its repro, or it is an `OBS`.** |
| `RISK` | A plausible failure not reproduced in the timebox | Says what would confirm it. |
| `IDEA` | A charter worth running later | Feeds the next-charter field of the debrief. |

Rules that make the sheet worth keeping:

- **Timestamp every line** as `MM:SS` from the session start. The timestamps are what produce the accounting below.
- **Write the repro before moving on.** The state is on screen now and gone in 90 seconds. Steps, the data used, and how many times out of how many it reproduced.
- **Name the broken oracle inside the `BUG` note**, not later. A `BUG` that cannot name its oracle is an `OBS` that got excited.
- **Log out-of-scope discoveries as `OBS` and keep going.** That is what the out-of-scope field is for.
- **Evidence capture is on the tester.** The MCP has no attachment upload, so screenshots and recordings go in the ALM ticket, not the platform.

## Timebox accounting

Three buckets, reported every time:

| Bucket | What counts |
|---|---|
| On charter | Actually exploring the mission |
| Bug investigation and writeup | Reproducing, narrowing, and writing findings |
| Setup | Environment, accounts, data, tooling |

Read the shape, do not just report the numbers:

- **Setup over 25 percent is an environment finding.** Report it as one. The next tester will pay the same tax.
- **Bug writeup over 50 percent means the session found one thing** and should have been split into an investigation and a fresh charter.
- **On charter under 50 percent means the session did not really happen.** Say so rather than presenting the survivors as a full sweep.

## The debrief checklist

Six questions. Each has a weak answer to avoid.

| Question | Weak answer looks like |
|---|---|
| What was the mission? | Restating the feature name instead of the information goal. |
| What was covered? | "Checkout" instead of the specific paths actually walked. |
| What was not reached? | Silence. Unreached areas are the most useful line in the debrief. |
| What was found, by class? | An undifferentiated bug list with no oracle named per item. |
| Where did the time go? | No accounting, or accounting with no reading of its shape. |
| What charter would you run next? | "More of the same." The next charter is part of the deliverable. |

## The promotion rubric

A finding becomes a scripted case when **all three** hold:

1. It is **reproducible**, with steps that work from a stated starting state.
2. It maps to a **rule someone will defend**, an oracle a product owner would stand behind.
3. It **would not be caught by existing coverage**, checked with `find_test_cases` before proposing it.

Otherwise it stays where it is:

- **No oracle covers it** -> it stays a question. Ask the product owner; do not invent the rule and write a case that enforces your invention.
- **Not reproducible inside the timebox** -> it stays a risk. Propose it as the next charter with what would confirm it.
- **Already covered** -> it is a duplicate. Say so and move on.

**The handoff contract to `katalon-create-test-cases`** is four fields per promoted finding and nothing else:

```text
<charter id> <title, no colon>   <priority>   <requirement key or none>
Expected: <one line>
```

`katalon-create-test-cases` owns duplicate checking, the atomic-case rules, and import. Do not pre-write steps here and do not reimplement those rules.

## Charter sizing

- **45 minutes** for a narrow surface with a known oracle.
- **60 minutes** is the default and the one to reach for when unsure.
- **90 minutes** only with a second tester or a heavy setup cost, and only when the mission genuinely cannot be split.
- **A charter that needs more than 90 minutes is two charters.** Split it on the mission, not on the clock.
