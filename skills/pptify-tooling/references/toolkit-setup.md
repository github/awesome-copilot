# PPTify Toolkit Reference

This directory is for lightweight guidance that preserves tooling abilities without reintroducing heavy scripts.

## Scope

- Keep only static guidance and notes.
- Do not place runtime setup scripts, model assets, importable Python modules, or generated artifacts here.
- This skill ships no importable code; implement the extraction/style-analysis contract on demand with `python-pptx`.
- `python-snippets.md` may preserve historical Python snippets as documentation-only reference material. Do not import from it or recreate packaged `.py` resources from it.

## Core Tooling Recipes

### 1. Prompt Context Recipe

Build compact LLM-ready context from a reference deck.

Expected result:

- `slide_count`, `slide_size`
- `styles`, `brands`, `template`, `layout`
- Per-slide title/text snippets and shape counts

### 2. Full Extraction Recipe

Produce a full JSON extraction including:

- `summary` complexity metrics
- `slides[*].layout_tree` with groups/objects
- `ooxml_elements` for render-aware inspection

### 3. Folder Batch Recipe

Process a folder of decks to produce:

- One `.pptify.json` file per deck
- A `manifest.json` to track outputs

### 4. Style Master Recipe

Run style-only analysis when you need design lock signals:

- Palette and accent colors
- Typography and font-size distribution
- Master/layout usage and flow patterns

## Adapter Guidance

When document summarization or image generation is needed, use external adapters and pass normalized outputs into the deck-spec contract. Keep provenance fields explicit (`provider`, `model_or_deployment`, `status`, `error`).
