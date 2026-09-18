---
name: poka-yoke-retro
description: 'Turn a bug, outage or repeated mistake into a device that makes the whole class impossible. Use when something already broke: "make sure this never happens again", "this is the third time", "postmortem", "how did this get through". Root-causes to the missing constraint, then sweeps every other site where the mistake is still available. For a pipeline use data, a deploy use ops, cross-tenant use authz, an AI feature use llm.'
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

Conflating these is why incidents repeat.

- **The defect**: what was experienced. "Customers were charged twice."
- **The mistake**: the action that produced it. "The retry path called `charge()` again without
  an idempotency key."
- **The hazard**: the property that made that mistake possible and silent. "`charge()` accepts
  an optional idempotency key and succeeds without one."

Fixing the defect ships today. Fixing the mistake helps one code path. **Only fixing the hazard
prevents recurrence** — and the hazard is almost always a missing constraint, not a missing
piece of knowledge. Write all three out before proposing anything. If you cannot state the
hazard as a property of the system, you have not found it yet.

## 2. Ask why until you reach a constraint

One discipline: **an acceptable terminal answer is a missing constraint, never a missing human
quality.** If a chain ends in "they forgot", "they didn't know", or "it wasn't documented", you
stopped one step early — ask why forgetting was possible.

> Double charge → the retry called `charge()` twice → the retry path passed no idempotency key
> → **the key is an optional parameter** → it was added later and made optional to avoid
> breaking callers → **nothing requires a charge to be idempotent.**

That last line is the hazard, and it is fixable: make the parameter required, or add a unique
constraint on `(account_id, idempotency_key)`. "The engineer should have passed the key" is
fixable only by hiring different humans.

Ask the escape question separately: **what should have caught this and didn't?** Usually a
device existed and was absent, disabled, or too weak. That gap is a second finding.

## 3. Sweep for the class — the step that gets skipped

A device that fixes one call site is not a device. Before proposing anything, find **every
other place the same mistake is still available.** Search by the shape of the hazard, not the
text of the bug: every other caller of the function; every other signature with the same shape
(optional-when-it-should-be-required, same-type adjacent arguments, unguarded bulk operations);
the same pattern in sibling services, scripts, jobs and infrastructure code. Then
`python3 scripts/detect_hazards.py --paths <repo> --id <hazard-id>`, using the ID printed with
each finding, to catch instances you would not have thought to grep for.

Report the count plainly: *"the same hazard exists at 6 other call sites"* changes the
conversation about what the fix is worth.

## 4. Choose the device by rung

For an incident that already cost something, push hard for **Control**: you have the strongest
evidence you will ever have that this mistake happens.

| Rung | For this incident, that would mean |
|---|---|
| **Control** | Required parameter · unique constraint · a type that cannot hold the bad state · unmergeable CI check |
| **Warning** | Lint rule · runtime assertion · alert at the moment of the action |
| **Detection** | Regression test · monitor · reconciliation job |
| **None** | "Added a note to the runbook" · "reminded the team" · a new checklist item |

Write the regression test — it proves the fix. But be honest that it is rung 3: it catches the
mistake after someone makes it, and only on the path you thought of. If the retro produces
*only* a test, say what a Control-rung device would have required.

Beware rung zero in a costume: more documentation, a checklist item, a training session, an
extra required reviewer. If that is genuinely all that is possible, name it as an accepted risk
rather than a resolution.

## 5. Write it up

```markdown
# Retro · <short title> · <YYYY-MM-DD>

**Defect**: <what was experienced, with blast radius: how many, how much, how long>
**Mistake**: <the specific action taken>
**Hazard**: <the system property that made it possible and quiet>

## The write-up, five headings

**Why it was possible** — the property of the system that made the mistake available, not the
person who made it. **Why nothing caught it** — which rung was missing. **Class sweep** — every
other place the same shape exists, listed. **Devices** — one per hazard, with its rung.
**Accepted risk** — what you are choosing to leave open, and why.

## 6. Verify the device before you close it

Prove the fix. Reproduce the original mistake against the new device and show it being
refused, then show the correct path still working. A device that was never observed to fire is
a belief, not a control, and after an incident, a false sense of protection is the most
expensive thing you can ship.

