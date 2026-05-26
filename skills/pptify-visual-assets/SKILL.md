---
name: pptify-visual-assets
description: "Find, generate, and place visual assets for pptify PPTX decks. Use when adding icons, images, SVGs, raster conversions, infographics, image placeholders, or asset-backed slide objects."
---

# PPTify Visual Assets

> **Prerequisite:** Before running any plugin script in this skill, run the workspace detection check in `pptify-tooling`. If `pptify-plugin/` is absent, apply the graceful-degradation fallbacks documented there.

Use this skill when a deck needs icons, images, diagrams, infographics, or media-backed slide objects.

## Workflow

1. Run the workspace detection check from `pptify-tooling`.
2. Choose the asset type: icon, web image, raster/SVG conversion, or generated infographic.
3. Run the relevant helper script and save its output path or result JSON.
4. Add the asset to `layout_tree.objects` with final bbox, `z_index`, `content.alt`, and `classification`.
5. Recheck layering so assets do not cover readable text.

```powershell
uv run python pptify-plugin/images/iconfy_search.py --query governance --collection fluent --color 0078D4 --max-num 8 --pretty
uv run python pptify-plugin/images/web_image_search.py --query "factory traceability dashboard" --max-num 8 --pretty
uv run python pptify-plugin/images/raster_image_to_svg.py --source logo.png --output-path logo.svg --pretty
```

## Icons

- Search Iconify when an icon improves scanning: `uv run python pptify-plugin/images/iconfy_search.py --query governance --collection fluent --color 0078D4 --max-num 8 --pretty`.
- Prefer simple, single-color SVG icons that match the theme accent.
- Use icons as supporting visual cues, not as replacements for required text.

## Images

- Search candidate images with `uv run python pptify-plugin/images/web_image_search.py --query "factory traceability dashboard" --max-num 8 --pretty`.
- Use local file paths in image objects when an image is selected: `content.path` plus `content.alt`.
- Give images an explicit `bbox` and use concise adjacent text.
- Do not use image placeholders as fallback assets; select an approved asset or omit the image object.

## SVG and Raster Handling

- Convert raster images to SVG wrappers with `uv run python pptify-plugin/images/raster_image_to_svg.py --source logo.png --output-path logo.svg --pretty`.
- Use `--mode vector-trace` only when optional tracing dependencies are installed and a true vector result is needed.
- Keep generated SVGs simple and readable when they are intended for PowerPoint editing.
- Vector tracing raster infographics can lose or distort text. Keep the original generated raster on visible slides when text fidelity matters, and place the traced SVG on a separate hidden final appendix slide for editability/reference.

## Infographics

- Generate text-to-image infographics only through OpenAI or Azure OpenAI providers configured by the user.
- Do not substitute a local fallback image provider when user-managed provider access is missing.
- Before generating any text-to-image artifact, collect missing required values with the VS Code prompt input dialog (`vscode_askQuestions` or equivalent): provider, prompt, model or deployment, image size, output path, and any non-secret access settings.
- For OpenAI image generation, create `.env` from `.env.template` when needed and have the user fill `PPTIFY_IMAGE_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_IMAGE_MODEL` directly in `.env`.
- For Azure `gpt-image-2` or `gpt-image-2.0` requests, create `.env` from `.env.template` when needed and have the user fill `PPTIFY_IMAGE_PROVIDER=azure-openai`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_IMAGE_DEPLOYMENT`, optional timeout, and any required key auth value directly in `.env`.
- Never ask the user to paste API keys, tokens, or connection strings into chat or into the prompt input dialog. If Entra auth is preferred, tell them to run `az login` in a terminal.
- The image helper loads `.env` automatically before generation. Example: `uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider azure-openai --size "1024x1024" --prompt "Cloud governance roadmap" --output-path infographic.png --pretty`.
- Save an attempt manifest beside the image output with provider, model or deployment, auth mode, prompt path, output path, success status, and error details on failure. A failed model call should be reported as failed, not replaced by a local placeholder and described as generated.
- If a provider call times out after authentication succeeds, retry once with a longer timeout when the user has already provided non-secret provider details.
- NotebookLM bridge commands are unavailable in this workspace snapshot because `pptify-plugin/images/notebooklm_infographic.py` is absent. Do not call a NotebookLM bridge unless that script is restored.
- For generated infographics, prefer the raster output as the visible slide asset. Add any raster-to-SVG vector trace as `hidden: true` on the final slide rather than replacing the visible infographic.

## Asset Placement

- Put decorative asset containers in `layout_tree.objects` with `classification: "layout_design"`.
- Put meaningful icons, diagrams, images, and infographics in `layout_tree.objects` with `classification: "content"`.
- Every asset object needs final inch-based `bbox` coordinates and a deliberate `z_index`.
- Use `z_index` so assets do not cover readable text.