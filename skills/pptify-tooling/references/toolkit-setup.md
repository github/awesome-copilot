# PPTify Toolkit Reference

This directory is for lightweight guidance that preserves tooling abilities without reintroducing heavy scripts.

## Scope

- Keep only static guidance and notes.
- Do not place runtime setup scripts, model assets, or generated artifacts here.
- Keep implementation centered on the bundled `references/` import APIs.

## Core Tooling Recipes

### 1. Prompt Context Recipe

Use `PptxExtractor.prompt_context(...)` to build compact LLM-ready context from a reference deck.

Expected result:

- `slide_count`, `slide_size`
- `styles`, `brands`, `template`, `layout`
- Per-slide title/text snippets and shape counts

### 2. Full Extraction Recipe

Use `PptxExtractor.extract_file(...)` for full JSON extraction including:

- `summary` complexity metrics
- `slides[*].layout_tree` with groups/objects
- `ooxml_elements` for render-aware inspection

### 3. Folder Batch Recipe

Use `PptxExtractor.extract_path(...)` on a folder to produce:

- One `.pptify.json` file per deck
- A `manifest.json` to track outputs

### 4. Style Master Recipe

Use `extract_pptx_style_master(...)` when you need style-only analysis for design lock:

- Palette and accent colors
- Typography and font-size distribution
- Master/layout usage and flow patterns

## Adapter Guidance

When document summarization or image generation is needed, use external adapters and pass normalized outputs into the deck-spec contract. Keep provenance fields explicit (`provider`, `model_or_deployment`, `status`, `error`).
