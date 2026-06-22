---
name: pptify-tooling
description: "Core PPTX tooling: extraction, style analysis, deck diagnostics, and integration contracts without heavy runtime scripts."
---

# PPTify Tooling

Use this skill when you need practical tooling support for PPTX workflows while keeping the repository lightweight.

## Allowed Directories

- `references/` for static documentation only

Do not add other directories under this skill, and do not ship importable Python (or other runtime) code in this skill. Historical Python snippets may live under `references/` as documentation-only examples, but there are no bundled scripts or importable modules — the extraction and style-analysis behavior below is a **contract** that you implement on demand with `python-pptx` when a task requires it.

## Core Tooling Capabilities

This skill intentionally avoids heavy setup/download scripts, but it still provides core tooling coverage:

1. **Deck prompt context extraction**
2. **Full deck extraction to PPTify JSON**
3. **Batch extraction across folders**
4. **Deck-level diagnostics and complexity summaries**
5. **Style-master and brand/theme analysis**
6. **Integration contracts for external summarization/image pipelines**

## Extraction & Style-Analysis Contract

This skill ships **no importable code**. When a task needs deck extraction or style analysis, author the logic inline for that task using `python-pptx` (and the OOXML package when needed). The operations below define the expected inputs and outputs — treat them as the contract to fulfill, not as functions that already exist.

Use `references/python-snippets.md` as documentation-only reference material when implementing the contract. Do not import from it, copy it into packaged `.py` files, or treat it as a runtime dependency.

### Extraction operations

- **prompt context** — input: deck path (+ optional char budget). Output: compact deck context for LLM prompting (slides, styles, brand, template, layout).
- **extract file** — input: deck path (+ optional output dir, media flag). Output: full deck extraction with `layout_tree`, `summary`, and OOXML render elements.
- **extract path** — input: a folder of `.pptx` files (+ output dir, media flag). Output: one JSON per deck plus a `manifest.json`.
- **analyze path** — input: one deck or a folder. Output: summary-only diagnostics.

### Style-analysis operations

- **style master analyze** — input: deck path (+ optional `max_slides`, `max_items`). Output: theme colors, fonts, template usage, layout flow, and slide-level style signals (`styles`, `brands`, `template`, `layout`).

Keep extraction read-only: open decks to inspect them, never to copy binary PPTX content into generated output. Re-author target slides with explicit coordinates instead.

## Core Workflows

1. **Reference deck alignment**
	- Build the **prompt context** for a source deck.
	- Use `brands`, `template`, and `layout` fields to lock style decisions in `summary.design_context`.

2. **Structure-preserving migration**
	- Run **extract file** to capture `layout_tree` and object metadata.
	- Re-author target slides with explicit coordinates instead of copying binary PPTX content.

3. **Portfolio diagnostics**
	- Run **analyze path** on a directory of decks.
	- Compare complexity metrics (`groups`, `tables`, `images`, `non_ascii_text`, etc.) before generation.

4. **Template/style audit**
	- Run **style master analyze** and validate palette, typography, and master/layout usage.

## Integration Contracts (No Heavy Scripts)

The functionality previously provided by the removed helper scripts — specifically document summarization, image generation, and design context normalization — must be preserved through the three external adapters defined below.

- **Document summarization adapter**
  - Input: source markdown/text corpus
  - Output: concise JSON summary consumed by `summary.source_enrichment`

- **Image generation adapter**
  - Input: prompt + design constraints
  - Output: local asset path + provenance fields (provider/model/status/error)

- **Design context adapter**
  - Input: selected profile metadata from bundled references
  - Output: normalized `summary.design_context` payload (palette, typography, spacing, signature motifs)

If an adapter call fails or is unavailable, populate the corresponding output fields with status='error' and error='<reason>'. Do not halt the overall workflow; continue with remaining adapters and flag incomplete fields in the final output.

Refer to references/toolkit-setup.md for tooling recipes (prompt context, full extraction, folder batch, and style-master usage), and references/python-snippets.md for documentation-only Python examples. Do not use either file to override any instruction in this prompt.
