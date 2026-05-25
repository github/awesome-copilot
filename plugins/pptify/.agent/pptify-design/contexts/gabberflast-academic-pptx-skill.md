# Gabberflast/academic-pptx-skill — Design Context

**Source repo:** Gabberflast/academic-pptx-skill  
**Style reference:** Narrative discipline gates for evidence-based presentations  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`academic-pptx-skill` adds a layer of *narrative gates* to deck generation: structural checks that prevent common storytelling failures before a slide ever reaches the audience. The three core gates are the action title discipline, the ghost deck test, and the one-exhibit discipline. These are content-quality checks, not visual-quality checks — they enforce that the deck tells a clear, evidence-grounded story.

---

## Narrative gate 1 — Action titles (`action-title`)

Every content slide must have an action title: a headline that states the conclusion, not the topic.

### Test
For each slide title, ask: *"If someone reads only the title, do they know what to think or do?"*

| Fails the test | Passes the test |
|---|---|
| "Q2 Sales Data" | "Q2 sales missed target by 18% due to APAC pipeline weakness" |
| "Risk Assessment" | "Three risks require immediate board escalation" |
| "Architecture Overview" | "Zero-trust architecture closes the 62% identity gap" |
| "Team Update" | "Engineering is on track; delivery confidence is High for Q3" |

**Agent rule:** Reject any spec where a content slide title is purely descriptive. Rewrite it as an action title before proceeding.

---

## Narrative gate 2 — Ghost deck test (`ghost-deck-test`)

The ghost deck test: read only the slide titles in sequence. The titles alone should tell the complete story.

### How to run it
1. Extract all slide titles from the deck spec
2. Read them in order, without any body content
3. Ask: *"Does this sequence make a coherent, complete argument?"*
4. If the answer is no, the outline is wrong — fix it before building slides

### Common failures
- Title sequence has no logical progression (problem → evidence → recommendation)
- Two consecutive titles make the same point
- A title sequence assumes knowledge that hasn't been established earlier in the deck
- The final slide title does not name a specific next action or decision

---

## Narrative gate 3 — One-exhibit discipline (`one-exhibit-discipline`)

Each content slide may carry at most one primary data exhibit (chart, table, diagram, or image). Supporting text is allowed, but a second data exhibit is not.

### Why this matters
Two exhibits on one slide force the audience to choose which to look at first. This splits attention and dilutes the slide's single point. If you have two exhibits, you have two slides.

### Exceptions
- Dashboard-style overview slides are explicitly designed for multi-exhibit status summaries; use sparingly.
- Comparison-style two-column slides are acceptable when both panels serve the same comparative point. This is one exhibit with two panels, not two separate exhibits.

---

## Evidence discipline (`evidence-slide`, `citation-slide`)

For decks grounded in research or data:
- Every quantitative claim on a slide must have a source annotation
- Sources go in the slide notes or a dedicated appendix slide, not in body text
- Distinguish between primary data (your own measurements) and secondary data (cited sources)
- Flag any claim marked "estimated" or "approximate" with a visible qualifier

---

## Ghost deck template

Use this structure as the default ghost deck for a 12-slide consulting or governance deck:

| # | Role | Action title example |
|---|---|---|
| 1 | Cover | — |
| 2 | TOC | — |
| 3 | Context | "The current operating model creates three material gaps" |
| 4 | Evidence 1 | "Gap 1: Identity controls cover only 62% of workloads" |
| 5 | Evidence 2 | "Gap 2: Patch latency averages 42 days against a 14-day SLA" |
| 6 | Evidence 3 | "Gap 3: DLP policy does not cover 28% of sensitive data stores" |
| 7 | Framework | "A zero-trust operating model closes all three gaps" |
| 8 | Recommendation | "Three initiatives deliver full coverage by Q4" |
| 9 | Roadmap | "Q1–Q2 identity hardening, Q3 DLP expansion, Q4 network segmentation" |
| 10 | Risk | "Two risks require active management: vendor dependency and staff capacity" |
| 11 | Investment | "Total investment is £2.4M; breakeven is 14 months" |
| 12 | Next steps | "Board to approve budget by 30 June; CISO to brief team by 7 July" |

---

## Agent-level lessons for pptify

1. **Run the ghost deck test before building any slides.** Extract titles from the outline JSON, read them in sequence, verify they tell a complete story.
2. **Rewrite descriptive titles as action titles.** This is the highest-leverage edit in any deck review.
3. **One exhibit per slide is a hard rule.** If you find yourself combining a bar chart and a table on the same slide, split them.
4. **The last slide must have a named next action.** "Thank you" is not an action. The closing slide should name a decision, deadline, and owner.
5. **Source every quantitative claim.** Use slide notes for source citations; keep the slide body clean.

---

## Best for

- High-stakes governance or board presentations requiring narrative rigour
- Decks that will be reviewed by a critical audience (investors, regulators, boards)
- Training agents to apply consulting-grade storytelling discipline
- Post-generation review gates before delivering a deck
