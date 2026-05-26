---
name: pptify-tooling
description: "Command reference for pptify plugin tools. Use when looking up install commands, plugin script syntax, or the workspace reality check."
---

# PPTify Tooling

## Workflow

1. Run the workspace detection check before invoking any plugin script.
2. If `pptify-plugin/` is missing, read `references/toolkit-setup.md` before responding.
3. Ask before cloning or installing the optional external toolkit.
4. Run helper scripts only after dependencies are present.
5. Treat the renderer import check as diagnostic; current external toolkit installs helper scripts, not `python -m pptify`.

## Install

```powershell
uv sync                    # base project
uv sync --extra plugins    # add source ingestion and image helpers
```

## Workspace Detection

Run this check **before** invoking any plugin script. Do not assume the toolkit is present.

```powershell
# PowerShell
Test-Path "pptify-plugin\README.md"
```
```bash
# bash / macOS / Linux
test -f pptify-plugin/README.md && echo "present" || echo "missing"
```

**Decision table — act on the result before continuing:**

| `pptify-plugin/` found | `pyproject.toml` found | Action |
|---|---|---|
| Yes | Yes | Proceed: run `uv run python pptify-plugin/...` commands normally |
| Yes | No | Run `uv sync --extra plugins` in the repo root, then retry |
| No | — | **Read [`references/toolkit-setup.md`](references/toolkit-setup.md) now** (before responding), then ask the user whether to install the optional toolkit or apply graceful fallbacks |

**Optional toolkit install:**

Do not clone or install the external toolkit automatically. Ask the user before fetching code from `https://github.com/kimtth/agent-pptify-kit`.

If the user approves installation:

```powershell
# Clone into the workspace root (or a subdirectory if another project already occupies it)
git clone https://github.com/kimtth/agent-pptify-kit .
uv sync --extra plugins
```

If the workspace root already belongs to a different project, ask the user where to place the toolkit before cloning.

**Graceful degradation — if install is not possible, apply these fallbacks:**

| Affected skill | Blocked capability | Fallback |
|---|---|---|
| `pptify-context-prep` | Document-to-markdown conversion, RAPTOR summary, design profile loading | Ask the user to paste source content directly; load `references/design-profiles.md` from `pptify-context-prep` for bundled design profile guidance |
| `pptify-visual-assets` | Icon search, image search, raster→SVG, infographic generation | Use `bbox` placeholder objects with descriptive `content.alt`; omit image objects rather than leaving them empty |
| `pptify-quality-gates` | Spec audit via `audit.py` | Apply the manual checklist rules in that skill; skip the `audit.py` output check |
| `pptify-deck-generation` | End-to-end PPTX render via `pptify` CLI | Stop and inform the user — PPTX generation requires the renderer; do not produce a partial artifact |

**Renderer reality check:**

```powershell
# Diagnostic only; this currently fails in the external toolkit
uv run python -c "import pptify; print('renderer present')"
```

If the import fails with `ModuleNotFoundError: No module named 'pptify'`, the `python -m pptify` render command is unavailable. This is expected for the current external toolkit. Use standalone plugin scripts for all non-render steps, and do not claim that `uv sync` restores the renderer.

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
