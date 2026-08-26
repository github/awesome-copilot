---
name: poka-yoke-retro
description: >-
  Turn a bug, outage or repeated mistake into a device that makes the whole class impossible. Use when something already broke: "make sure this never happens again", "this is the third time", "postmortem", "how did this get through". Root-causes to the missing constraint, then sweeps every other site where the mistake is still available. For a pipeline use data, a deploy use ops, cross-tenant use authz, an AI feature use llm.
license: MIT
---

# Poka-Yoke Retro

A defect got out. The fix for the defect is the easy part and is usually already done or
obvious. This mode is about the harder and more valuable question: **what made the mistake
available, and what device removes it for good?**

Shingo's framing is the whole method here. Do not ask why the person erred, people err, that
is a constant. Ask why the *process permitted* the error to become a defect, and what would
have physically stopped it.

## 1. Separate the three things

People conflate these, and conflating them is why incidents repeat.

- **The defect**: what the user or system experienced. "Customers were charged twice."
- **The mistake**: the specific human action that produced it. "The retry path called
  `charge()` again without an idempotency key."
- **The hazard**: the property of the system that made that mistake possible and silent.
  "`charge()` accepts an optional idempotency key and succeeds without one."

Fixing the defect ships today. Fixing the mistake helps one code path. **Only fixing the
hazard prevents recurrence**, and the hazard is almost always a missing constraint, not a
missing piece of knowledge.

Write all three out explicitly before proposing anything. If you cannot state the hazard as a
property of the system, you have not found it yet.

## 2. Ask why until you reach a constraint

Run the whys, with one discipline: **an acceptable terminal answer is a missing constraint,
never a missing human quality.** If a chain ends in "they forgot," "they didn't know," "they
were rushing," or "it wasn't documented," you stopped one step early, keep going and ask why
forgetting was possible, why the knowledge was needed at all, why the system accepted the
result.

> Double charge → retry called `charge()` twice → the retry path didn't pass an idempotency
> key → **the key is an optional parameter** → *why is it optional?* → it was added later and
> made optional to avoid breaking callers → **there is no compile-time or database-level
> requirement that a charge be idempotent.**

That last line is the hazard, and it is fixable: make the parameter required, or add a unique
constraint on `(account_id, idempotency_key)`. Compare it to "the engineer should have passed
the key," which is fixable only by hiring different humans.

Also ask the escape question separately: **what should have caught this and didn't?** Usually
there was a device: a test, a review, a type, and it was absent, disabled, or too weak.
That gap is a second finding in its own right.

## 3. Sweep for the class. This is the step that gets skipped

A poka-yoke that fixes one call site is not a poka-yoke. Before proposing anything, find
**every other place the same mistake is still available.** This is almost always where the
real value of a retro sits, and it is the step people omit under time pressure.

Search by the shape of the hazard, not by the text of the bug:

- Every other caller of the same function or endpoint.
- Every other function with the same dangerous signature shape, other optional-when-it-should-
  be-required parameters, other same-type adjacent arguments, other unguarded bulk operations.
- The same pattern in sibling services, other languages in the monorepo, scripts, jobs, and
  infrastructure code.
- Run `python3 scripts/detect_hazards.py --paths <repo> --id <hazard-id>`: the ID is the
  one printed with each finding, to catch instances you would not have thought to grep for.

Report the count plainly: *"the same hazard exists at 6 other call sites"* changes the
conversation about how much the fix is worth.

## 4. Choose the device by rung

Now propose, using the ladder from the router skill. For an incident that already cost
something real, push hard for **Control**: you have the strongest evidence you will ever
have that this mistake happens.

| Rung | For this incident, that would mean |
|---|---|
| **Control** | Required parameter · database unique constraint · type that cannot represent the bad state · CI check that cannot be merged past |
| **Warning** | Lint rule · runtime assertion · alert at the moment of the action |
| **Detection** | Regression test · monitor · reconciliation job |
| **None** | "Added a note to the runbook" · "reminded the team" · "added a review checklist item" |

A regression test is genuinely valuable and you should write one. It proves the fix and stops
this exact path regressing. But be honest that it is rung 3: it catches the mistake after
someone makes it, and only on the path you thought of. If the retro produces *only* a test,
say so, and say what a Control-rung device would have required.

Beware the fix that is really rung zero wearing a costume: more documentation, a new checklist
item, a Slack reminder, a training session, an extra required reviewer. These feel like
action and change nothing. If that is genuinely all that is possible, name it as an accepted
risk rather than a resolution.

## 5. Write it up

```markdown
# Retro · <short title> · <YYYY-MM-DD>

**Defect**: <what was experienced, with blast radius: how many, how much, how long>
**Mistake**: <the specific action taken>
**Hazard**: <the system property that made it possible and quiet>

## Why it was possible
<the chain, ending at a missing constraint>

## Why nothing caught it
<the device that should have existed, was disabled, or was too weak>

## Class sweep
<n other sites where this mistake is still available, list them>

## Devices
| Device | Rung | Covers | Status |
|---|---|---|---|
| <change> | Control | all N sites | proposed |
| <regression test> | Detection | the original path | done |

## Accepted risk
<what remains possible, and why that is acceptable>
```

Save to `docs/poka-yoke/retro-YYYY-MM-DD-<slug>.md`, and put a `poka-yoke:` marker comment at each
installed device naming the mistake it prevents. That is what stops a future engineer
removing it as dead weight, since by then it will never have fired. See the recording section
in `audit`; do not ask anyone to hand-maintain a registry file.

## 6. Verify the device before you close it

Prove the fix. Reproduce the original mistake against the new device and show it being
refused, then show the correct path still working. A device that was never observed to fire is
a belief, not a control, and after an incident, a false sense of protection is the most
expensive thing you can ship.

## Tone

Write about the system, never the person. Not because it is polite, but because it is more
accurate and it is the only version that produces a fix: "the engineer should have been more
careful" has no implementation. Shingo's argument was that blaming the operator is
precisely how organizations avoid improving the process. Names belong in the timeline if at
all; the analysis is about affordances.
