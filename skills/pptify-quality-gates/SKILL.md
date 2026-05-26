---
name: pptify-quality-gates
description: "Validate and repair pptify PPTX artifacts. Use when checking deck specs, PPTX packages, audits, coordinate-explicit layout trees, collisions, text overflows, warnings, visual hierarchy, asset layering, or reference deck alignment."
---

# PPTify Quality Gates

> **Prerequisite:** Before running `audit.py`, run the workspace detection check in `pptify-tooling`. If `pptify-plugin/` is absent, load [`references/audit-checklist.md`](references/audit-checklist.md) and apply the manual checklist — it covers all 8 audit dimensions without requiring the script.

Use this skill before considering a generated PPTX complete.

## Workflow

1. Confirm required artifacts exist or collect missing paths before validating.
2. Run the workspace detection check from `pptify-tooling`.
3. Run `audit.py` when available; otherwise load `references/audit-checklist.md` and apply the manual checks.
4. Repair the spec or generation script, rebuild the PPTX, and rerun the audit.
5. Stop only when collisions, overflows, small fonts, package checks, and design-context checks are clean or clearly reported.

## Required Artifacts

- If required artifact paths or names are missing, collect them with the VS Code prompt input dialog (`vscode_askQuestions` or equivalent) before building, validating, or repairing.
- Keep the generated spec, PPTX, and audit together: `deck-spec.json`, `deck.pptx`, and `deck-audit.json`.
- Keep the agent-authored JSON spec or generation script on disk so it can be reviewed, repaired, and rebuilt.
- Save analysis or extraction manifests when reference PPTX context was used.
- Save the selected `pptify-design` profile IDs, source URLs, license IDs, and style lock details in `summary.design_context` for every newly generated deck unless a user-provided brand guide or reference PPTX is the primary style source.

## Audit Checks

- A production-ready generated deck should have zero content collisions.
- A production-ready generated deck should have zero text overflows.
- A production-ready generated deck should have zero `classification: "content"` objects with `style.font_size` below 9 pt. Run `uv run python pptify-plugin/audit/audit.py deck-spec.json --json` and check `total_small_fonts`.
- Review audit `warnings` for each slide even when collisions and overflows are zero.
- Check that slide count, language, tone, and major topic sequence match the user request or reference context.
- Check that the selected design context profile matches the user request and that source-backed context was translated into explicit primitives, colors, spacing, typography, and bboxes.
- Fail generated decks that have no `summary.design_context`, plain white backgrounds throughout, Calibri-only text, default theme colors, or placeholder-like title-plus-bullet layouts unless the user explicitly requested that style.
- Confirm every normal content slide contains at least one style-derived visual element such as an accent band, card shell, grid, divider, shape motif, image treatment, or pattern.
- When a deck includes hidden appendix slides, inspect `ppt/presentation.xml` for `p:sldId show="0"` and confirm the hidden slides are last unless the user asked otherwise.
- When a generated infographic has both raster and SVG assets, verify the visible slide uses the raster for text fidelity and the SVG appears only in the hidden appendix slide.
- For important deliverables, open the generated PPTX with `python-pptx` or inspect the zip package to confirm slide count, relationships, media, and hidden-slide metadata.

## Repair Loop

- If content collides, move or resize objects, reduce content density, split slides, or change the coordinate plan.
- If text overflows, shorten bullets, split sections, enlarge target bboxes, or split slides. **Lower explicit `font_size` only as a last resort, and never below 9 pt for content objects.**
- If visual hierarchy is weak, edit explicit colors, type scale, dividers, metric cards, callouts, or whitespace in the layout tree.
- If the deck looks like default `python-pptx`, load a `pptify-design` profile, add `summary.design_context`, choose a style lock, and rebuild with explicit background/accent/card/rule primitives.
- If an asset covers text, lower its `z_index`, move it to `layout_design`, resize it, or change its bbox.
- If coordinates are cramped or inconsistent, repair the agent-authored bboxes directly; current plugin scripts will not run a browser or auto-layout pass.
- Rebuild after each spec repair and inspect the new audit or package checks.

## Verification Commands

- Current workspace reality check: no importable `pptify/` package or `python -m pptify` CLI is present in this snapshot. Use the standalone audit plugin and package inspection unless the core renderer package is restored.
- Audit a layout-tree spec and run the full test suite:

```powershell
uv run python pptify-plugin/audit/audit.py deck-spec.json --json
uv run python -m unittest discover -s tests -v
```

- If the core renderer package is restored, add renderer/CLI smoke tests before considering rendered deck behavior covered.
