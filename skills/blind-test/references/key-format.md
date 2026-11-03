# The key

The key is the answer sheet. It's written before the first run, stored outside every folder an agent can read, and never edited to fit an output.

## What goes in

| Code | What | Counts |
|---|---|---|
| `K` | **Planted problem.** Put there on purpose, tied to a claim | found = 1, partial = 0.5, missed = 0 |
| `R` | **Real problem** that turned up while building or checking the target | scored like K, listed separately |
| `T` | **Trap.** A legitimate decision that looks like a mistake | reported as a failure = 1 false alarm |
| `F` | **Folklore.** A wrong belief stated in the request | corrected / repeated / silent |
| `B` | **Beyond the key.** A real problem an agent found that nobody planted | credited to that run only, added after grading |

Each entry has:

- `id` (`K1`, `T3`…), `claim` it tests (for K and T), `class` (a short name for the kind of defect: "fact told twice", "status as row tint").
- `what` — one sentence a grader can check: where it is and what is wrong.
- `evidence` — how to confirm it: a value, a measurement, a selector, a line.
- `found` — what an output must say to count as found; `partial` — what counts as half (it saw the place, misread the cause; or found it with the wrong severity).
- For a trap: `why_fine` — the rule or exception that makes it legitimate.

## Sizing

- 10–16 K for a large skill, 4–6 for a small one. Fewer means one lucky run swings the score; more means the target stops looking real.
- At least one K per claim, ideally two (one obvious, one subtle).
- 1 T per rule that could over-fire. 6–8 T for a large skill.
- One folklore line in the request, at most two.
- Mark each K `control` (a strong baseline should find it) or `discriminating`. Only discriminating items are evidence for the skill; controls show the target is fair. Write the mark as `"role"`: your guess first, then what two pilot runs of the baseline actually found (`references/calibration.md`). `score.mjs` counts the Discriminating column from it.
- After calibration the key is frozen: its sha256 goes next to the decision rule, and nothing in it changes during the runs.
- A clean control (the same target without the planted problems) is worth it for review skills that tend to over-report: findings on the control are false alarms by definition.

## Writing a good K

- **Observable from what the agent gets.** If agents see the rendered page, the K must show in the render.
- **Specific.** "On-time KPI says 94%; the 14 rows average 91%": a grader can confirm it in a minute.
- **Discriminating.** Ask: would a strong agent without the skill find this? If yes, it's a control; keep it, but don't count it as proof of the skill.
- **One defect per K.** Two defects in one place are two entries, or the grader can't score partials.

## Writing a good T

- It must be genuinely fine, by a rule you can cite: WCAG's spacing exception, a platform guideline, a documented product decision.
- It should look like something the skill's own rules might flag. That's the point.
- In plain sight: put it where any reviewer will see it.

## Template

`templates/key.template.json`:

```json
{
  "target": "Frostlane — a fictional refrigerated-fleet dashboard",
  "request": "Review the Overview before release and tell us what to fix, in priority order. Our accessibility lead says WCAG requires 44 px targets and 4.5:1 for all text, so check against that too.",
  "claims": [
    { "id": "C1", "text": "Numbers on a screen come from one source and agree" }
  ],
  "items": [
    { "id": "K1", "type": "K", "claim": "C1", "class": "one number, two sources", "role": "discriminating",
      "what": "On-time KPI shows 94%; the 14 rows average 91%",
      "evidence": "mean of the On-time column", "found": "names both values or says the KPI disagrees with the rows",
      "partial": "says the KPI may be wrong without the rows" },
    { "id": "T1", "type": "T", "claim": "C3", "class": "target size",
      "what": "20×20 px Refresh and Filter buttons, 12 px apart",
      "why_fine": "WCAG 2.2 2.5.8 spacing exception holds" },
    { "id": "F1", "type": "F", "what": "44 px and 4.5:1 for all text",
      "correct": "AA is 24 px or spacing; 3:1 for large text; disabled controls exempt" }
  ]
}
```
