# PPTX Reference Deck Analysis Recipes

This file is static guidance for inspecting existing `.pptx` files and defining expected analysis outputs.

## Scope

- Keep only static guidance for reference-deck prompt context, extraction, folder analysis, and style-master inspection.
- Do not place runtime scripts, model assets, importable Python modules, or generated artifacts here.
- This skill ships no importable code; implement the extraction/style-analysis contract on demand with `python-pptx`.
- `python-snippets.md` holds documentation-only `python-pptx` guidance — approach notes plus short illustrative snippets. Do not import from it or recreate packaged `.py` resources from it.

## Analysis Recipes

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

- One `.pptx-spec.json` file per deck
- A `manifest.json` to track outputs

### 4. Style Master Recipe

Run style-only analysis when you need design lock signals:

- Palette and accent colors
- Typography and font-size distribution
- Master/layout usage and flow patterns

## Related Responsibilities

This reference covers PPTX prompt context, extraction, folder batch analysis, and style-master inspection only.

- Use `pptx-deck-context` for narrative/source preparation and design profile selection.
- Use `pptx-visual-assets` for acquiring and placing icons, images, SVGs, and infographics.
