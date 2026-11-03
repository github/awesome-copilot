# Designing the target

The target is a small fictional product the agents work on: a page, a set of screens, a code folder, a document, a brief with data. It has to feel real enough that agents treat it seriously, and be controlled enough that you know every problem in it.

## Pick the form from the skill

| The skill works on | The target is |
|---|---|
| Live pages or apps | A local server (`scripts/target-server.mjs`) serving one to five pages |
| Source code | A small repo copy that builds and runs; defects planted in the copy, the original left untouched |
| Documents (PRDs, contracts, copy) | A set of files with planted contradictions and gaps |
| Builds from a brief | A brief and data files (`build-tests.md`) |

## Realism

- **A fictional name and domain** that fits the skill: a fleet dashboard, an image studio, a home energy app. Invent it outright, with no real brand or lookalike behind it.
- **Plausible data**: names, numbers, dates that hang together. Planted contradictions stand out only if the rest agrees.
- **The normal amount of mess.** A target where every element is either perfect or planted reads as a puzzle. Ordinary choices, some good, some merely fine.
- **Rebuild what you've seen in real work.** The kind of defect you've met with clients, recreated in the fictional product; their material stays out.

## Planting problems

- **One defect per spot.** Two problems in one element make grading ambiguous.
- **No tells.** No comments like `// bug: wrong total`, no class names like `.planted`, no variable names that describe the defect. Agents read source.
- **Spread them.** Across the page or screens, and across difficulty: some obvious (controls that any agent should find), some that only the skill's rules catch.
- **Make each observable** in whatever the agent gets. If agents get a rendered page, a defect visible only in an unused CSS rule doesn't count.
- **Write the evidence as you plant**: the selector, the value, the line. The grader needs it, and you'll forget.

## Traps

Place each trap where the skill's rules are most tempted to fire, and make it clearly legitimate by a rule you can cite:

- a quiet uppercase label in a dense table (fine) next to a rule against uppercase eyebrows;
- a 20 px icon button with spacing (passes WCAG 2.2 AA) next to a rule about touch targets;
- glass on a header that floats over scrolling content (correct) next to a rule against glass on cards;
- a disabled button with low contrast (exempt) next to a contrast rule;
- a deliberate exception documented in the product's own conventions file.

## Folklore in the request

One common wrong belief the skill should correct, phrased the way a stakeholder would say it: "our accessibility lead says WCAG requires 44 px targets", "our designer says glass on the cards is what makes it native". It tests whether the agent follows the request or the truth, and it's the same in every arm.

## Side effects

The target must make side effects visible:

- the server logs every non-GET request (`posts.log`); the review agents must leave it empty unless the skill is supposed to submit something;
- code targets live in a copy; diff the copy after the run;
- nothing points at a real API, a real account or a real payment provider.

## Check before the first run

1. Open the target the way an agent will (same viewport, same tools).
2. Tick every K: present, observable, and matches the key's `what`.
3. Tick every T: present and genuinely fine.
4. Look for accidental problems. Fix them, or add them to the key as `R` before any run.
5. Run the target-server in its folder and confirm 404s, the log, and that `key.json` and the log itself aren't served.
6. Freeze anything that changes between runs: dates, random content, live data.
