# sunbigfly/ppt-agent-skills — Design Context

**Source repo:** sunbigfly/ppt-agent-skills  
**Style reference:** Staged deck-generation pipeline (interview → plan → build → QA → export)  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`sunbigfly/ppt-agent-skills` provides the most rigorous staged generation pipeline of any public PPTX skill repo. It enforces explicit handoffs between six phases: audience interview, source compression, outline, style lock, per-slide planning, and dual export (raster + editable). Each phase is a separate agent turn with a defined input, output schema, and gate condition before the next phase begins.

---

## Pipeline stages

### Stage 1 — Audience interview (`interview`)
Before any content work, collect:
- **Audience:** role, seniority, prior context
- **Goal:** decision to be made or information to be conveyed
- **Tone:** formal/informal, data-heavy/narrative
- **Constraints:** slide count, time limit, branding requirements

Output: structured brief JSON that gates entry to stage 2.

### Stage 2 — Source compression (`research-outline`, `source-compression`)
Ingest source materials (documents, URLs, data files). For each source:
1. Summarise key claims and evidence
2. Tag each claim with its source and confidence level
3. Identify the 3–5 most decision-relevant signals
4. Discard anything that doesn't serve the stated audience goal

Output: compressed source summary, ≤ 800 words, structured by decision relevance.

### Stage 3 — Outline (`outline`)
From the compressed source and the audience brief, build a slide-by-slide outline:
- Slide number, slide form, action title, one-sentence content description
- Explicit "so-what" statement per slide (what decision or belief should change?)
- Flag slides that depend on data that needs verification

Output: outline JSON. Agent must not proceed to stage 4 without explicit outline approval.

### Stage 4 — Style lock (`style-lock`)
Choose a visual direction and emit a locked `style_lock` block:
```json
{
  "background": "#F7FAFC",
  "surface": "#FFFFFF",
  "dark": "#17233A",
  "primary": "#0F6CBD",
  "secondary": "#009C9C",
  "tertiary": "#6B5DD3",
  "font": "Segoe UI"
}
```
The style lock is immutable for the rest of the pipeline. No per-slide overrides.

### Stage 5 — Per-slide planning (`slide-plan`)
For each slide in the outline, emit a full slide spec with:
- `layout_tree`: complete pptify layout tree with explicit coordinates
- `title`, `subtitle`, `kicker`, `takeaway` represented as editable text objects
- items, rows, metrics, and exhibits represented as explicit editable primitives
- All content pre-populated from the compressed source (no placeholders)

Output: complete `spec.json` ready to pass to `DeckBuilder.build()`.

### Stage 6 — Dual export + visual QA (`visual-qa`, `dual-export`, `export-check`, `qa-report`)
After render:
1. Run pptify render and audit checks; zero collisions, overflows, or unexpected warnings allowed
2. Check collision and overflow counts in audit — must both be zero
3. Verify slide count matches outline
4. Confirm every slide has an action title (not a descriptive label)
5. If any check fails, return to stage 5 and patch the affected slides

---

## Agent-level lessons for pptify

1. **Never skip the interview.** Decks built without a structured brief produce the wrong content for the wrong audience.
2. **Source compression before outline.** Raw source material is too noisy for direct slide mapping. Compress first; then outline.
3. **Style lock is stage-gated.** Emit style_lock once, early. Treat any mid-deck color change as a pipeline failure.
4. **Per-slide plans are full specs.** The slide plan stage should produce a `spec.json` that requires zero editing before `DeckBuilder.build()`.
5. **Dual export is the quality gate.** A deck is not done until both the pptify quality gate and a visual review have passed.
6. **Action titles are mandatory.** Every content slide title must answer "so what?" not just label the content.

---

## Slide count guidelines (from pipeline experience)

| Audience | Recommended slide count | Max density |
|---|---|---|
| Board / C-suite | 8–12 | 1 decision per slide |
| Senior leadership | 12–18 | 1 insight per slide |
| Working-level review | 18–30 | 1 data exhibit per slide |
| Technical deep-dive | No limit | 1 concept per slide |

---

## Best for

- Decks that must be grounded in specific source documents or data
- High-stakes presentations where source provenance matters
- Workflows requiring explicit human approval at each phase
- Quality-controlled delivery pipelines for enterprise clients
