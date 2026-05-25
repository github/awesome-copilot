---
name: pptify-deck-generation
description: "Generate PPTX decks end to end with pptify. Use when creating PowerPoint slides from prompts, source material, reference PPTX analysis, coordinate-explicit layout trees, or pptify JSON specs."
---

# PPTify Deck Generation

Use this skill when a Copilot or coding agent needs to generate PPTX slides with `pptify`.

## Intake

1. Before creating workflow artifacts, collect any missing required inputs with the VS Code prompt input dialog (`vscode_askQuestions` or equivalent). Batch concise questions, offer sensible defaults for optional fields, and continue after the user answers.
2. Identify the audience, decision, business framework, core narrative, required language, target slide count, source material, reference PPTX, branding constraints, output artifact paths, and delivery deadline.
3. If the user gives only a topic, create a reasonable executive narrative and mark assumptions in the generated spec summary. When the request asks for web research, source-backed content, or data enrichment, persist source material and run the source pipeline before authoring slides.
4. If the user provides source files, URLs, research material, or a reference deck, prepare them before generating the slide spec.
5. If the user requests text-to-image or generated images with OpenAI, Azure OpenAI, or Azure AI Foundry, create `.env` from `.env.template` when needed and have the user fill provider settings or secrets directly in `.env`. Do not ask for API keys or tokens in chat or in the dialog.
6. Do not claim an infographic is model-generated until provider, model or deployment, auth mode, prompt, output path, and attempt status are known. The image helper has no local fallback provider.

## Required Input Dialog

- Use the prompt input dialog for missing required workflow values such as audience, slide count, source material, design/reference context, output filenames, and artifact destinations.
- Use `.env` for missing text-to-image provider values such as provider, model or deployment, endpoint, auth method, timeout, and required API keys. Collect only non-secret prompt, image size, and output path values through the dialog when needed.
- Treat API keys, tokens, connection strings, and passphrases as secrets. Do not collect them through chat or the dialog; the user must enter them directly in `.env` or authenticate with a managed tool such as `az login`.

## Prepare Sources and References

Follow `pptify-context-prep` to convert source documents, build RAPTOR summaries, analyze reference PPTX files, and select and load a design profile. Record results in `summary.source_enrichment` and `summary.design_context` before authoring `deck-spec.json`.

## Confirm Business Framework

The business framework is defined by the user, not by the assistant. If the user has already specified a framework, use it directly. If no framework has been specified, present the available options and ask which one to use before planning the deck. Include `custom` when the user wants to provide their own structure, naming convention, or slide sequence. Do not auto-select a framework on the user's behalf.

| Framework | Best for |
|---|---|
| `mckinsey` | Executive proposals, consulting deliverables, strategic recommendations |
| `scqa` | Problem-solving presentations, situation analysis, incident reports |
| `pyramid` | Complex arguments requiring strong logical structure |
| `mece` | Issue decomposition, audits, multi-workstream analysis |
| `action-title` | Executive communications where every slide must drive action |
| `assertion-evidence` | Technical or academic presentations, research findings |
| `exec-summary-first` | C-suite briefings, board decks, press releases |
| `custom` | User-defined structures, organization-specific playbooks, hybrid narrative patterns |

## Framework Story Templates

Use the selected framework as the starting narrative spine, then adapt slide count and evidence density to the user's source material and requested deliverable.

### McKinsey Structure (`mckinsey`)

1. Title (`title`) - Conclusion in one sentence.
2. Executive Summary (`agenda`) - Three bullets: situation, insight, recommendation.
3. Situation (`bullets`) - Context that audience already knows.
4. Complication (`bullets`) - What changed or what problem emerged.
5. Key Question (`section`) - The central question this deck answers.
6. Recommendation (`cards`) - The answer, clearly stated.
7. Evidence 1 (`stats` or `cards`) - Data supporting the recommendation.
8. Evidence 2 (`comparison` or `timeline`) - Further evidence.
9. Evidence 3 (`bullets` or `diagram`) - Additional support.
10. Options Considered (`comparison`) - Why this option versus alternatives.
11. Implementation Roadmap (`timeline`) - Next steps with owners.
12. Appendix (`section`) - Label for backup slides.

### SCQA Structure (`scqa`)

1. Title (`title`).
2. Situation (`bullets`) - Agreed context.
3. Complication (`stats`) - What disrupted the situation.
4. Question (`section`) - What question this raises.
5. Answer / Recommendation (`cards`) - Direct answer to the question.
6. Supporting Evidence (`stats` or `comparison`).
7. Implementation Plan (`timeline`).
8. Summary (`summary`).

### Pyramid Structure (`pyramid`)

1. Title (`title`).
2. Main Answer (`agenda`) - Top of pyramid: the governing thought.
3. Argument 1 (`cards` or `bullets`) - First key line of reasoning.
4. Argument 2 (`cards` or `bullets`) - Second key line of reasoning.
5. Argument 3 (`cards` or `bullets`) - Third key line of reasoning.
6. Evidence (`stats`) - Data underpinning the arguments.
7. Summary (`summary`) - Pyramid restated.

### MECE Structure (`mece`)

1. Title (`title`).
2. Problem Decomposition (`diagram`) - The MECE issue tree.
3. Workstream 1 (`bullets` or `cards`) - Sub-issue and findings.
4. Workstream 2 (`bullets` or `cards`).
5. Workstream 3 (`bullets` or `cards`).
6. Synthesis (`summary`) - Integrated conclusion.

### Action-Title Structure (`action-title`)

Rule: every slide title must be an action statement or concluded insight.

1. Title (`title`) - Action-oriented title.
2. Summary of Actions (`agenda`).
3. Content slides (`any supported slide form`) - Title follows the pattern "We must X" or "X increased by Y%."
4. Next Steps (`timeline`) - Owners and dates.

### Assertion-Evidence Structure (`assertion-evidence`)

Rule: each slide has an assertion title in one sentence and an evidence body with visual or data support.

1. Title (`title`).
2. Overview Assertion (`bullets`).
3. Assertion slides (`stats`, `cards`, or `comparison`).
4. Conclusion (`summary`).

### Exec-Summary-First Structure (`exec-summary-first`)

1. Title (`title`).
2. Executive Summary (`agenda`) - Full answer on slide 2.
3. Supporting Detail (`any supported slide form`) - For readers who want depth.
4. Appendix Section (`section`).

### Custom Structure (`custom`)

Use `custom` only when the user supplies or explicitly requests a user-defined framework. Before planning slides, collect the framework name, objective, required slide sequence, title rules, layout preferences, evidence expectations, and any mandatory sections. If the custom framework is incomplete, ask for the missing structure rather than filling it in silently.

Record the resolved custom framework in `summary.business_framework`, including its name, source, slide sequence, title rules, and any assumptions approved by the user.

## Storytelling Principles

- Apply the Pyramid Principle: put the conclusion first, make each slide title state the slide's conclusion or assertion, and avoid questions or vague labels.
- Make every `keyMessage` answer "So what?" for the audience.
- Keep topics MECE: mutually exclusive and collectively exhaustive.
- Write specific slide titles, such as "Azure AI cuts development costs by 40%" or "3 implementation patterns enable rapid onboarding," instead of generic labels like "About Azure AI" or "Implementation Patterns Overview."
- Include concrete data, numbers, dates, owners, sources, or quantified directional signals in bullets when the source material supports them.
- Keep speaker notes useful: two to three sentences, never empty and never just a dash.
- Avoid generic statements; every bullet should be specific, defensible, and tied to the selected framework's role in the story.

## Plan the Deck

1. Produce one clear message per slide before choosing visuals.
2. Map the selected business framework to the deck outline and document the selected framework in `summary.business_framework`.
3. Choose a slide form for each message: title, agenda, comparison, process, metrics, roadmap, risk, architecture, evidence, decision, infographic, dashboard-style overview, or appendix.
4. Use charts and dashboard-style slides only when source evidence contains relevant quantitative or structured data. Represent them as explicit tables, labels, shapes, lines, or image-backed exhibits.
5. Keep each slide to three to five major content groups.
6. Preserve user-provided terminology, names, metrics, dates, and executive tone.
7. Decide the exact coordinates, dimensions, z-order, colors, fonts, and font sizes before building. Current plugin scripts will not generate layout or resize text for you.
8. Record the selected profile ID, source URL, style lock, palette, typography, spacing rhythm, and signature elements in `summary.design_context` and translate source signals into explicit primitives in `layout_tree`.
9. Every normal content slide should include at least one style-derived design element such as an accent band, card shell, grid, divider, shape motif, image treatment, or pattern. Plain white title-plus-bullet slides are not production-ready.

## Build and Validate

1. Current workspace reality check: no importable `pptify/` package or `python -m pptify` CLI is present in this snapshot. Restore the core renderer package before relying on renderer-specific commands.
2. Every generated slide must include `layout_tree`. Follow `pptify-slide-spec` for the full coordinate contract.
3. If the core renderer is restored, render the authored spec with `uv run python -m pptify deck-spec.json --out deck.pptx --audit deck-audit.json`. Otherwise create the PPTX through direct PowerPoint generation and keep plugin evidence/audits alongside it. Direct `python-pptx` generation must still implement the locked design context; default placeholders and bullet-only slides are failures.
4. For reference-guided generation, include analysis/source summaries and the extracted `styles`, `brands`, `template`, and `layout` context before writing `deck-spec.json`.
5. Include the selected `pptify-design` context before writing `deck-spec.json` for every new deck unless a user-provided brand guide or reference PPTX is the primary style source.
6. Inspect the audit for content collisions, text overflows, and warnings.
7. Verify workflow gates: source-backed decks include source corpus and RAPTOR summary metadata; requested generated images include a provider attempt manifest; successful generated raster infographics include a final hidden SVG appendix slide; generated decks include `summary.design_context` and style-derived visual elements.
8. Rebuild after each repair until generated slides have zero collisions, zero overflows, and no default-theme design failures, or clearly report the residual issue.

## Response Contract

1. When asked to author the deck spec, write strict JSON with no markdown fences unless the user explicitly asks for prose.
2. When required workflow or artifact inputs are missing, prompt for them with the input dialog before authoring or building.
3. When acting as a coding agent in the workspace, create or update the spec or generation script, produce the PPTX with the available PowerPoint path, validate the audit and PPTX package, and report the generated artifact paths.
