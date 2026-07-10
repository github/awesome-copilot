---
name: pptx-visual-assets
description: "Plan and place supporting visual assets in editable PPTX decks without flattening slide content."
---

# PPTX Visual Assets

Use this skill when a deck needs icons, images, diagrams, infographics, or media-backed slide objects. This skill provides **placement and decision guidance** plus **runnable how-to guidelines**; the skill itself bundles no helper scripts.

For reference-deck extraction, style analysis, deck diagnostics, or PPTX package inspection, use `pptx-reference-deck-analysis` instead.

Each asset capability has an inline, self-contained guideline in
[references/visual-asset-adapters.md](references/visual-asset-adapters.md) (icon search, web image
search, raster→SVG, text→infographic, NotebookLM bridge). Run the snippet in an ephemeral scratch
file or terminal at request time, then feed the resulting local asset path into `layout_tree.objects`.

## Workflow

1. Choose the asset type: icon, image, SVG, or generated infographic.
2. Run the matching guideline snippet from the reference (do not save it into the skill).
3. Add the asset to `layout_tree.objects` with final `bbox`, `z_index`, `content.alt`, and `classification`.
4. Recheck layering so assets do not cover readable text or replace editable content.

If [references/visual-asset-adapters.md](references/visual-asset-adapters.md) cannot be read — or the specific guideline section required for the current asset type is absent or unreadable — halt that asset's acquisition, report what is missing to the user, and do not attempt to reconstruct guideline snippets from memory.

When replacing an existing asset (for example, swapping an icon for an infographic), remove the existing object from `layout_tree.objects` before inserting the replacement. Remove superseded objects rather than hiding them; the only `hidden: true` objects that should remain are intentional reference copies defined by these guidelines (such as an SVG trace alongside its visible raster — see **SVG and Raster Handling**).

## Icons

- Use simple, single-color SVG icons that match the theme accent.
- Icons must always appear alongside a visible text label or caption; do not use an icon as the sole representation of a concept that the slide outline specifies in words.
- Acquire icons with the **Icon Search** guideline (see [references/visual-asset-adapters.md](references/visual-asset-adapters.md)) and store local paths. If the search returns multiple candidates, prefer the one with the fewest total shape elements (`<path>`, `<circle>`, `<rect>`, `<polyline>`, `<ellipse>`, `<line>`) that still clearly represents the concept, then the closest match to the theme accent color; if candidates are otherwise equal, select the first result. If the Icon Search returns no candidates, omit the icon object and note in the slide outline that a suitable icon could not be found for the concept.

## Images

- Use local file paths in image objects: `content.path` plus `content.alt`.
- Do not create image-only slides. Keep the slide's title, message, metrics, labels, and explanation as native PowerPoint objects.
- Give images an explicit `bbox`. Place a short caption of 10 words or fewer in the space adjacent to the image bbox; do not overlay text on the image itself.
- Match the `bbox` aspect ratio to the image's native aspect ratio (fit, or crop-to-fill); a mismatched bbox stretches the image. Keep captions in adjacent space, not overlaid on the image.
- Acquire candidates with the **Web Image Search** guideline (see [references/visual-asset-adapters.md](references/visual-asset-adapters.md)). Only select images confirmed royalty-free or licensed for commercial reuse. If a candidate's license status cannot be confirmed (license information is missing, ambiguous, or the source does not clearly state reuse terms), treat it as not meeting the bar — do not infer or assume a permissive license. If no candidate meets this bar, omit the image object and note in the slide outline that a licensed asset is needed.
- Never insert placeholder or stand-in graphics (e.g., dummy boxes or "image here" art) as a substitute for a real asset; when no approved asset is available, omit the image object.

## SVG and Raster Handling

- Use a true vector source when an editable visual is required. Do not wrap a
   raster image in an SVG and describe it as editable.
- Keep SVGs suitable for PowerPoint editing: each file contains fewer than 50
   shape elements (`<path>`, `<circle>`, `<rect>`, `<polyline>`, `<ellipse>`,
   `<line>`), contains no embedded raster data or clip paths, and uses named fill
   colors instead of gradients.
- Vector tracing can lose or distort text. If the source image contains essential text, labels, numbers, or legend entries, recreate those elements as editable native PowerPoint objects. Keep the source image only as a supporting visual or hidden reference.
- If an SVG violates any of these constraints, do not use it as the main
   information-bearing object. Keep it only as an optional supporting asset or
   hidden reference, and record the violation in the slide outline.

## Infographics (External Provider)

Infographic generation runs through a user-managed provider; the skill bundles no generation scripts. Follow the **Text → Infographic** and optional **NotebookLM** guidelines in [references/visual-asset-adapters.md](references/visual-asset-adapters.md).

**Infographic generation sequence (follow in order):**

1. **Collect required inputs** via the VS Code prompt input dialog (`vscode_askQuestions` or equivalent): provider, model or deployment, prompt, image size, and output path.
   - On failure (dialog unavailable, or returns without all required fields): do not proceed. List the missing fields in chat, ask the user to supply them, then retry from this step.
2. **Verify provider access.** Generate only through user-managed providers (e.g., OpenAI or Azure OpenAI). The optional NotebookLM bridge (see [references/visual-asset-adapters.md](references/visual-asset-adapters.md)) is available only when the user has configured it.
   - On failure (no provider access): if a NotebookLM bridge is configured (it needs no image-generation provider), use it; otherwise omit the asset and tell the user that infographic generation requires a configured provider. Never silently switch to a model provider the user has not configured, including any on-device or local model.
3. **Never request secrets in chat.** Do not ask the user to paste API keys, tokens, or connection strings into chat or the prompt dialog. If Entra auth is preferred, tell them to run `az login` in a terminal.
4. **Call the provider** to generate the infographic.
   - On failure (call errors or returns no usable output): record the attempt manifest as failed (step 5) and omit the infographic object — never place a local placeholder or stub. If that manifest write also fails, follow step 5's halt rule and report both the provider failure and the write failure in chat.
5. **Record an attempt manifest** beside the image output with provider, model or deployment, auth mode, prompt path, output path, success status, and error details.
   - On failure (manifest cannot be written, e.g., output directory missing or write permission denied): report the write failure and its reason in chat and halt; do not place the asset or skip manifest recording silently.
6. **Place the output.** Use generated art as a supporting visual. Recreate any essential text, metric, legend, or process step with native PowerPoint objects. Add a raster-to-SVG trace only as a hidden reference when it helps later editing.

## Asset Placement

- Put decorative asset containers in `layout_tree.objects` with `classification: "layout_design"`.
- Put meaningful icons, diagrams, images, and infographics in `layout_tree.objects` with `classification: "content"`.
- Every asset object needs final inch-based `bbox` coordinates and a deliberate `z_index`.
- Validate that every `bbox` lies within the slide boundary, from (0, 0) to (slide_width, slide_height) in inches. If a computed `bbox` falls outside this range, clip it to the boundary and note the adjustment in the slide outline. If `slide_width` or `slide_height` cannot be read from the current `layout_tree`, assume standard widescreen dimensions (13.33 × 7.5 inches) and note the assumption in the slide outline. Do not proceed with bbox validation using unresolved dimensions.
- If clipping produces a `bbox` with zero or negative width or height, omit the asset object, note the degenerate bbox in the slide outline, and flag the placement conflict to the user.
- Use `z_index` so assets do not cover readable text.
- When overlapping assets include a `layout_design` (decorative) asset, give it the lower `z_index` so it never covers a `content` asset or readable text.
- When two `content` assets overlap, give the lower `z_index` to whichever is secondary or illustrative (e.g., a background texture or a supplementary icon). If neither is clearly secondary, keep readable text uncovered and flag the overlap to the user for a final decision rather than silently finalizing the order.