# Deck Generation E2E Workflow

Use this workflow when a Copilot or coding agent needs to generate PPTX slides with `pptify`.

## 1. Intake

1. Before creating workflow artifacts, collect any missing required inputs with the VS Code prompt input dialog (`vscode_askQuestions` or equivalent). Batch concise questions, offer sensible defaults for optional fields, and continue after the user answers.
2. Identify the audience, decision, core narrative, required language, target slide count, source material, reference PPTX, branding constraints, output artifact paths, and delivery deadline.
3. If the user gives only a topic, create a reasonable executive narrative and mark assumptions in the generated spec summary. When the user asks for web images, sources, data enrichment, or a source-backed deck, gather and persist source material before authoring slides.
4. If the user provides source files, URLs, research material, or a reference deck, prepare them before generating the slide spec.
5. If the user requests text-to-image or generated images with OpenAI, Azure OpenAI, or Azure AI Foundry, create `.env` from `.env.template` when it is missing and have the user fill provider settings or secrets directly in `.env`. Never ask for API keys, tokens, or connection strings in chat or in the dialog.
6. Do not author a slide or summary that claims a model-generated infographic exists until provider, model or deployment, auth mode, prompt, output path, and attempt status are known.

## 1A. Image Access Intake

For any text-to-image request, prepare `.env` before invoking `pptify-plugin/images/text_prompt_to_infographic.py`.

The infographic helper has no local fallback provider. If OpenAI or Azure OpenAI access is missing, record `missing_provider_config` or the provider failure in an attempt manifest and do not describe placeholder artwork as generated.

For OpenAI image generation, configure these values in `.env`:

1. `PPTIFY_IMAGE_PROVIDER=openai` or pass `--provider openai`.
2. `OPENAI_API_KEY`.
3. `OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1` when unspecified.
4. Image size, defaulting to `1024x1024` when unspecified.
5. Text prompt and output path.
6. Run image generation after `.env` is filled, for example `uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider openai --size "1024x1024" --prompt "Cloud governance roadmap" --output-path infographic.png --pretty`.

For Azure OpenAI / Azure AI Foundry image generation, configure these values in `.env`:

1. `PPTIFY_IMAGE_PROVIDER=azure-openai` or pass `--provider azure-openai`.
2. `AZURE_OPENAI_ENDPOINT`, for example `https://<resource>.services.ai.azure.com/openai/v1`.
3. `AZURE_OPENAI_IMAGE_DEPLOYMENT`, for example `gpt-image-2` or the user's exact `gpt-image-2.0` deployment name.
4. Ask whether the user wants Azure CLI/Entra auth or API-key auth.
5. `AZURE_OPENAI_TIMEOUT`, defaulting to `300` when unspecified.
6. For Azure CLI/Entra auth, tell the user to run `az login`; for API-key auth, have the user fill `AZURE_OPENAI_API_KEY` or `AZURE_AI_API_KEY` in `.env`.
7. Run image generation after `.env` is filled, for example `uv run python pptify-plugin/images/text_prompt_to_infographic.py --provider azure-openai --size "1024x1024" --prompt "Cloud governance roadmap" --output-path infographic.png --pretty`.
8. Save a small attempt manifest next to the asset with provider, endpoint or model name, auth mode, prompt path, output path, status, and error details when generation fails. Do not silently replace a failed or missing model output with local artwork.

## 2. Prepare Sources and References

1. Convert long documents and downloaded HTML pages with `pptify-plugin/documents/document_to_markdown.py`.
2. For URL-based, topic-plus-research, source-backed, or multi-source decks, build a combined markdown corpus and run `pptify-plugin/documents/document_to_raptor_tree.py` before planning slides. This is required even when the source files are individually short, because the deck should use synthesized evidence rather than a few searched keywords.
3. Record the source corpus path, RAPTOR summary path, source count, and source URLs in `summary.source_enrichment` in the generated spec.
4. When a reference deck should influence content or style, use the importable helpers in `pptify-plugin/extraction` or package inspection to collect style, brand, template, and layout-rhythm context. The `python -m pptify --analyze-pptx` command is unavailable unless the core renderer package is restored.
5. Use the analysis facts as LLM context when the new deck should preserve language, slide count, topic sequence, executive tone, colors, fonts, template conventions, and layout rhythm.
6. Use extraction helpers only when the task is preservation or reconstruction of the source deck.

## 2A. Prepare Design Context (Required)

1. Every new deck must choose a design direction before slide planning. Do not wait for the user to explicitly ask for `pptify-design`.
2. If the user supplies a brand guide or reference PPTX, use that as the primary style source and optionally add a compatible `pptify-design` profile for layout vocabulary.
3. If the user does not supply a style source, load at least one source-backed profile from `pptify-design/sources.json` with `uv run python pptify-plugin/design/design_context_catalog.py --profile <id> --include-context --pretty`.
4. Default profile selection:
	- Default, general modern, stylish, product, app, pitch, Microsoft, M365, Teams, Power Platform, or enterprise product decks: `fluent-ui-design-tokens`.
	- Developer, GitHub, code, or engineering-system decks: `primer-primitives`.
	- Consulting, strategy, governance, or operations reviews: `likaku-mck-ppt-design-skill` plus a conservative `corazzon-pptx-design-styles` style such as Swiss International, Monochrome Minimal, Editorial Magazine, or Architectural Blueprint.
	- Broader modern style exploration or explicitly visual direction selection: `corazzon-pptx-design-styles`.
	- Design reasoning or preflight critique: add `awesome-copilot-design-agents` as a secondary prompt context.
5. Lock exactly one visual style or design system before authoring slide coordinates. Record the selected profile ID, style name when applicable, palette, typography, spacing rhythm, signature elements, and source URLs in `summary.design_context`.
6. Include the returned context payload in the LLM context before writing `deck-spec.json`; do not summarize it away into a vague phrase such as "modern design".
7. A deck that uses default PowerPoint theme colors, Calibri-only text boxes, plain white backgrounds, or bullet-only layouts without a selected `summary.design_context` is not production-ready.

## 3. Plan the Deck

1. Produce one clear message per slide before choosing visuals.
2. Choose a slide form for each message, such as title, agenda, comparison, process, metrics, roadmap, risk, architecture, evidence, decision, infographic, dashboard-style overview, or appendix.
3. Use charts and dashboard-style slides only when the source corpus contains relevant quantitative or structured evidence. Represent them as explicit editable primitives or image-backed exhibits.
4. Keep each slide to three to five major content groups.
5. Preserve user-provided terminology, names, metrics, dates, and executive tone.
6. Decide the slide composition, hierarchy, coordinates, object sizes, z-order, colors, fonts, and font sizes during planning. The available plugin scripts will not do this later.
7. Every normal content slide should contain at least one visible design element derived from the locked style: a color band, card system, grid, rule, accent shape, diagram primitive, image treatment, pattern, or data exhibit. Avoid text-only slides unless the locked style is explicitly typographic.

## 4. Author the JSON Spec

1. Return a top-level object with `slides` and optional `summary`.
2. For each generated slide, include `id`, `title`, and `layout_tree`.
3. Do not use `pattern`, `layout_pattern`, `composition.pattern`, `layout`, `sections`, `bullets`, `objects`, `theme`, chart placeholders, or browser layout requests as render-time shorthand.
4. Each `layout_tree` must include `slide_size`, `root_group_id`, `groups`, `objects`, and optional `notes`.
5. Each group must include `id`, `role`, `layout_mode`, `object_ids`, `group_ids`, and a `bbox` when it represents a visible or bounded region.
6. Each object must include `id`, `kind`, `role`, `classification`, `content`, `style`, `bbox`, and `z_index`.
7. Treat decorative shapes as `layout_design`; treat meaningful text, tables, lines, and media as `content`.
8. Give every text-bearing object and table explicit `style.font_size` and `style.color`; do not rely on a later tool to shrink text to fit or infer contrast. Body and evidence text must be at least 10 pt; labels and captions at least 9 pt; footers at least 8 pt.
9. Give every line object explicit `content.x1`, `content.y1`, `content.x2`, and `content.y2`.
10. Give every line object explicit `style.line` and `style.line_width`.
11. Give every shape object explicit `content.shape`, `style.fill`, and `style.line`.
12. Translate the locked design context into explicit objects, colors, spacing, typography, and coordinates; do not rely on runtime pattern selection.
13. If a generated raster infographic is created, use that raster on the visible slide for fidelity, convert it with `raster_image_to_svg.py`, and add the SVG as a final `hidden: true` appendix slide. Record both paths in `summary.text_to_image`.

## 5. Build the PPTX

Current workspace reality check: this snapshot does not contain an importable `pptify/` package or `python -m pptify` CLI. Restore the core renderer package before using core render commands, or produce PPTX artifacts through direct PowerPoint generation plus standalone plugin evidence.

1. As the Copilot CLI or VS Code agent, author or update `deck-spec.json` or a generation script directly; plugin scripts do not perform prompt-to-spec generation or full-deck rendering.
2. If the core renderer is restored, render the authored spec with `uv run python -m pptify deck-spec.json --out deck.pptx --audit deck-audit.json`. Otherwise build with the available PowerPoint generation path and keep plugin evidence/audits alongside the PPTX. Using `python-pptx` is only a serialization path; it must still implement the locked `pptify-design` coordinates, colors, typography, and decorative primitives.
3. For reference-guided generation, include analysis/source summaries and extracted `styles`, `brands`, `template`, and `layout` context in the agent prompt before writing `deck-spec.json`.
4. For predefined-template generation, include selected `pptify-design` context in the agent prompt before writing `deck-spec.json`.
5. Never copy, mutate, or save over a referenced PPTX as the deck generation strategy.

## 6. Validate and Repair

1. Inspect the audit for content collisions, text overflows, and warnings.
2. If collisions remain, move or resize objects, reduce density, split slides, or change the coordinate plan.
3. If text overflows, shorten copy, split content across slides, or enlarge object bboxes. Lower explicit font sizes only as a last resort and never below 9 pt for content objects.
4. Verify source and image workflow gates before final response: source-backed decks have `summary.source_enrichment` with corpus and RAPTOR paths; generated-image requests have an attempt manifest; successful raster infographics have a hidden SVG appendix slide.
5. Verify design-context gates before final response: `summary.design_context` exists, names the selected profile/style, and every visible content slide has at least one style-derived design element.
6. Treat plain white Calibri slides, default theme placeholders, unstyled bullet lists, and missing `summary.design_context` as quality failures even when collision audit passes.
7. Rebuild after each repair until generated slides have zero collisions, zero overflows, no unexpected warnings, and pass the design-context gate, or clearly report the residual issue.
8. For important deliverables, inspect the produced PPTX package with `python-pptx` or zip checks in addition to unit tests.

## 7. Response Contract

1. When asked to author the deck spec, write strict JSON with no markdown fences unless the user explicitly asks for prose.
2. When required workflow or artifact inputs are missing, prompt for them with the input dialog before authoring or building.
3. When acting as a coding agent in the workspace, create or update the spec or generation script, build with the available PowerPoint path, validate the audit and produced PPTX package, and report the generated artifact paths.
