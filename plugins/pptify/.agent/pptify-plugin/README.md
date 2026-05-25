# pptify-plugin

Standalone plugin scripts for source ingestion, design context, image assets, extraction, and audit helpers used by pptify workflows. CLI-style tools can be called directly by path and write a JSON payload to stdout. Extraction helpers are import APIs.

## Optional Dependencies

The base `pptify` package stays lightweight. Install plugin dependencies only when these integrations are needed:

```powershell
uv sync --extra plugins
```

Some scripts also work without optional packages:

- `documents/document_to_raptor_tree.py` uses stable local embeddings and requires only the standard library.
- `design/design_context_catalog.py` reads local `pptify-design` metadata and requires only the standard library.
- `images/raster_image_to_svg.py` defaults to wrapping raster bytes in an SVG and requires only the standard library. Its `--mode vector-trace` path uses optional `vtracer`.

## External Assets

Large optional runtime assets are restored on demand instead of being maintained as source files. Run the downloader from the repository root when you need local ONNX embeddings or other optional helper assets:

```powershell
.\pptify-plugin\download-external-assets.ps1
```

The script downloads MiniLM tokenizer files plus the selected ONNX model into `pptify-plugin/external/all-MiniLM-L6-v2`. The default MiniLM model is `onnx/model_quint8_avx2.onnx`, saved locally as `model_quantized.onnx`; pass `-MiniLmModelPath onnx/model.onnx` for the larger non-quantized model.

## Image Provider Access

`images/text_prompt_to_infographic.py` loads image-provider settings from `.env` before it runs. When image generation needs credentials or provider configuration, copy `.env.template` to `.env`, ask the user to fill the required values directly in that file, then run the helper. Do not ask the user to paste API keys, tokens, or connection strings into chat or a prompt input dialog.

The helper does not provide a built-in local fallback image provider. If `--provider auto` is used and neither OpenAI nor Azure OpenAI is configured, the command fails with `missing_provider_config` instead of generating a substitute asset.

For OpenAI text-to-image generation, configure these values in `.env`:

- `PPTIFY_IMAGE_PROVIDER=openai` or pass `--provider openai`.
- `OPENAI_API_KEY`.
- `OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1` when unspecified.
- Image size: default to `1024x1024` when unspecified.
- Text prompt and output path.

For Azure `gpt-image-2` or `gpt-image-2.0` deployments, configure these values in `.env`:

- `PPTIFY_IMAGE_PROVIDER=azure-openai` or pass `--provider azure-openai`.
- `AZURE_OPENAI_ENDPOINT`, for example `https://<resource>.services.ai.azure.com/openai/v1`.
- `AZURE_OPENAI_IMAGE_DEPLOYMENT`, for example `gpt-image-2` or the user's exact deployment name.
- Image size: default to `1024x1024` when unspecified.
- Auth method: Azure CLI/Entra auth or API-key auth.
- `AZURE_OPENAI_TIMEOUT`, optional, default `300` seconds for large image generations.

For Azure CLI/Entra auth, run `az login`. For API-key auth, fill `AZURE_OPENAI_API_KEY` or `AZURE_AI_API_KEY` in `.env`. `.env` is git-ignored; never commit it.

Example:

```powershell
Copy-Item .env.template .env
# Edit .env, then run:
uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider azure-openai --size "1024x1024" --prompt "Cloud governance roadmap" --output-path infographic.png --pretty
```

For OpenAI image generation, fill `OPENAI_API_KEY` in `.env` and run the helper.

Example:

```powershell
uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider openai --size "1024x1024" --prompt "Cloud governance roadmap" --output-path infographic.png --pretty
```

## Scripts

- `documents/document_to_markdown.py` - convert PDF, DOCX, PPTX, XLSX, HTML, or TXT with MarkItDown.
- `documents/document_to_raptor_tree.py` - split markdown, embed sections, and build a RAPTOR-style JSON tree.
- `design/design_context_catalog.py` - list or emit source-backed predefined design template and agent-prompt context from `pptify-design`.
- `images/web_image_search.py` - search Google when `icrawler` is available, then fall back to Bing HTML candidates.
- `images/iconfy_search.py` - search Iconify and return candidate SVG URLs. The filename keeps the existing `iconfy` spelling.
- `images/raster_image_to_svg.py` - create an SVG wrapper around a raster image, or trace it into vector paths with optional `vtracer`.
- `images/text_prompt_to_infographic.py` - generate an infographic via OpenAI or Azure OpenAI.
- `extraction/pptx_extractor.py` - importable helper for PPTX prompt context and extraction.
- `extraction/pptx_style_master.py` - importable helper for compact style, theme, and layout-rhythm analysis.

`images/notebooklm_infographic.py` is not present in this workspace snapshot. Do not document or call a NotebookLM bridge unless that script is restored.

## Examples

```powershell
uv run python pptify-plugin/documents/document_to_markdown.py --source source.pdf --output-path source.md
uv run python pptify-plugin/documents/document_to_raptor_tree.py --markdown-path source.md --output-path source.structured-summary.json --title "Source"
uv run python pptify-plugin/design/design_context_catalog.py --profile primer-primitives --include-context --pretty
uv run python pptify-plugin/images/web_image_search.py --query "Power Platform governance" --max-num 8
uv run python pptify-plugin/images/iconfy_search.py --query governance --collection fluent --color 0078D4
uv run python pptify-plugin/images/raster_image_to_svg.py --source logo.png --mode vector-trace --output-path logo.svg
uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider openai --prompt "Cloud governance roadmap" --output-path infographic.png
```