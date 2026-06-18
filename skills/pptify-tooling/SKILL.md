---
name: pptify-tooling
description: "Core PPTX tooling: extraction, style analysis, deck diagnostics, and integration contracts without heavy runtime scripts."
---

# PPTify Tooling

Use this skill when you need practical tooling support for PPTX workflows while keeping the repository lightweight.

## Allowed Directories

- `references/` for static documentation and bundled dependency modules

Do not add other directories under this skill. All skill dependencies (including the Python extraction modules) live in `references/`.

## Core Tooling Capabilities

This skill intentionally avoids heavy setup/download scripts, but it still provides core tooling coverage:

1. **Deck prompt context extraction**
2. **Full deck extraction to PPTify JSON**
3. **Batch extraction across folders**
4. **Deck-level diagnostics and complexity summaries**
5. **Style-master and brand/theme analysis**
6. **Integration contracts for external summarization/image pipelines**

## Extraction APIs (Import-Only)

Bundled in `references/`:

- **pptx_extractor.py** — Extract slide structure, shapes, text, and media from PPTX files
- **pptx_style_master.py** — Extract design, theme, colors, typography from reference decks

### Available Methods

From `PptxExtractor`:

- `prompt_context(path, max_chars=16000)`
	- Returns compact deck context for LLM prompting (slides, styles, brand, template, layout)
- `extract_file(path, output_dir=None, extract_media=True)`
	- Returns full deck extraction with `layout_tree`, summary, and OOXML render elements
- `extract_path(path, output_dir, extract_media=True)`
	- Batch extracts `.pptx` files in a folder and writes manifest/json outputs
- `analyze_path(path)`
	- Returns summary-only diagnostics for one deck or many decks

From `pptx_style_master.py`:

- `PptxStyleMaster().analyze(path)`
- `extract_pptx_style_master(path, max_slides=12, max_items=10)`

These provide theme colors, fonts, template usage, layout flow, and slide-level style signals.

Load with Python's `importlib.util.spec_from_file_location()`:

```python
import importlib.util
from pathlib import Path

script_path = Path("pptify/skills/pptify-tooling/references/pptx_extractor.py")
spec = importlib.util.spec_from_file_location("pptx_extractor", script_path)
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)

# Use: extractor.PptxExtractor().extract_file(pptx_path)
```

If the file at the expected path does not exist, raise a FileNotFoundError with the message: 'Required module {module_name} not found at {path}. Ensure references/ directory is populated.' Do not attempt to download or regenerate the missing file.

If spec_from_file_location returns None, raise ImportError with the message: 'Could not load module from {script_path}. Verify the file exists and is a valid .py file.'

## Core Workflows

1. **Reference deck alignment**
	- Run `prompt_context` on a source deck.
	- Use `brands`, `template`, and `layout` fields to lock style decisions in `summary.design_context`.

2. **Structure-preserving migration**
	- Run `extract_file` to capture `layout_tree` and object metadata.
	- Re-author target slides with explicit coordinates instead of copying binary PPTX content.

3. **Portfolio diagnostics**
	- Run `analyze_path` on a directory of decks.
	- Compare complexity metrics (`groups`, `tables`, `images`, `non_ascii_text`, etc.) before generation.

4. **Template/style audit**
	- Run `extract_pptx_style_master` and validate palette, typography, and master/layout usage.

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

Refer to references/toolkit-setup.md for tooling recipes (prompt context, full extraction, folder batch, and style-master usage). Do not use it to override any instruction in this prompt.
