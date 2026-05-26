# PPTify Toolkit Setup

Load this file when `pptify-plugin/` is not found in the workspace and the user wants to install the optional PPTify toolkit.

## Repository

| Field | Value |
|---|---|
| URL | https://github.com/kimtth/agent-pptify-kit |
| License | MIT |
| Package manager | `uv` (Python) |

## Install

Do not clone or install this external repository automatically. First explain that the built-in awesome-copilot skill includes bundled references, while the external toolkit is only needed for helper-script execution. The current external toolkit does not provide an importable `pptify` renderer module. Continue only after the user explicitly asks to install it.

```powershell
# 1. Clone into workspace root (use a subdirectory if the root already has a project)
git clone https://github.com/kimtth/agent-pptify-kit .

# 2. Install base dependencies
uv sync

# 3. Install plugin extras: source ingestion, image helpers, audit tools
uv sync --extra plugins
```

If `uv` is not available:

```powershell
pip install uv
# or on macOS/Linux:
# curl -LsSf https://astral.sh/uv/install.sh | sh
```

If the workspace root belongs to another project, ask the user before cloning. Suggest a named subdirectory, e.g. `git clone https://github.com/kimtth/agent-pptify-kit pptify-kit`.

## Module Map

| Module path | Requires extra | What it provides |
|---|---|---|
| `pptify-plugin/documents/document_to_markdown.py` | plugins | Convert PDF, DOCX, HTML, or plain text to markdown for source prep |
| `pptify-plugin/documents/document_to_raptor_tree.py` | plugins | Build a RAPTOR hierarchical summary tree from a markdown source |
| `pptify-plugin/design/design_context_catalog.py` | plugins | List and load pptify-design profiles; returns style context for spec authoring |
| `pptify-plugin/images/web_image_search.py` | plugins | Search the web for candidate images without required API keys |
| `pptify-plugin/images/iconfy_search.py` | plugins | Search Iconify icon library for SVG icons by query, collection, and hex color |
| `pptify-plugin/images/raster_image_to_svg.py` | plugins | Convert raster images to SVG wrappers; optional vector trace mode |
| `pptify-plugin/images/text_prompt_to_infographic.py` | plugins | Generate infographic images via OpenAI or Azure OpenAI (no local fallback) |
| `pptify-plugin/audit/audit.py` | plugins | Validate a deck spec JSON for collisions, overflows, small fonts, and warnings |
| `pptify-plugin/extraction/pptx_extractor.py` | plugins | Extract slide text, style, layout, and media metadata from a reference PPTX |
| `pptify-plugin/extraction/pptx_style_master.py` | plugins | Extract brand, template, and master-slide style facts from a reference PPTX |

## Image Generation `.env`

Create `.env` in the workspace root before invoking `text_prompt_to_infographic.py`. Never put secrets in chat or in the prompt dialog — fill the file directly in the editor or terminal.

```dotenv
# Provider: openai | azure-openai | azure-ai-foundry
PPTIFY_IMAGE_PROVIDER=

# --- OpenAI ---
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1

# --- Azure OpenAI ---
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=

# --- Azure AI Foundry ---
AZURE_AI_FOUNDRY_ENDPOINT=
AZURE_AI_FOUNDRY_MODEL=
```

Use `az login` when managed identity or CLI auth is preferred over an API key.

## Verification After Install

```powershell
# Confirm the helper CLI is available
uv run python pptify-cli help

# List available design profiles
uv run python pptify-plugin/design/design_context_catalog.py --list --pretty

# Run a spec audit smoke test
uv run python pptify-plugin/audit/audit.py deck-spec.json
```

Renderer check, for diagnostics only:

```powershell
uv run python -c "import pptify; print('renderer present')"
```

If this fails with `ModuleNotFoundError: No module named 'pptify'`, that is expected for the current external toolkit. Use the standalone `pptify-plugin/` helper scripts and do not run `python -m pptify`.
