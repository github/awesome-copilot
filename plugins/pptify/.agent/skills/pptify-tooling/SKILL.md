---
name: pptify-tooling
description: "Command reference for pptify plugin tools. Use when looking up install commands, plugin script syntax, or the workspace reality check."
---

# PPTify Tooling

## Install

```powershell
uv sync                    # base project
uv sync --extra plugins    # add source ingestion and image helpers
```

## Workspace Reality Check

No importable `pptify/` package or `python -m pptify` CLI is present in this snapshot. Use the standalone plugin scripts below, or restore the core renderer package before using documented render/analyze/extract CLI commands.

If the core renderer is restored:

```powershell
uv run python -m pptify deck-spec.json --out deck.pptx --audit deck-audit.json
```

## Plugin Scripts

| Purpose | Command |
|---|---|
| Convert document to markdown | `uv run python pptify-plugin/documents/document_to_markdown.py --source <file> --output-path out.md` |
| Build RAPTOR summary tree | `uv run python pptify-plugin/documents/document_to_raptor_tree.py --markdown-path source.md --output-path summary.json --title "Title" --pretty` |
| List design profiles | `uv run python pptify-plugin/design/design_context_catalog.py --list --pretty` |
| Load design profile context | `uv run python pptify-plugin/design/design_context_catalog.py --profile fluent-ui-design-tokens --include-context --pretty` |
| Search web images | `uv run python pptify-plugin/images/web_image_search.py --query "topic" --max-num 8 --pretty` |
| Search Iconify icons | `uv run python pptify-plugin/images/iconfy_search.py --query governance --collection fluent --color 0078D4 --max-num 8 --pretty` |
| Raster to SVG | `uv run python pptify-plugin/images/raster_image_to_svg.py --source logo.png --output-path logo.svg --pretty` |
| Generate infographic | `uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider azure-openai --size "1024x1024" --prompt "..." --output-path out.png --pretty` |
| Audit spec | `uv run python pptify-plugin/audit/audit.py deck-spec.json --json` |
| Run tests | `uv run python -m unittest discover -s tests -v` |
