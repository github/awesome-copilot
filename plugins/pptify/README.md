# PPTify Plugin

Generate production-ready PowerPoint decks with pptify skills, source ingestion, design context, coordinate-explicit slide specs, visual assets, runtime tooling, and audit-driven quality gates.

## Installation

```bash
copilot plugin install pptify@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
| --- | --- |
| `pptify-context-prep` | Prepare source material and design context before authoring a pptify deck spec. |
| `pptify-deck-generation` | Generate PPTX decks end to end from prompts, source material, reference PPTX analysis, coordinate-explicit layout trees, or pptify JSON specs. |
| `pptify-quality-gates` | Validate and repair PPTX artifacts by checking specs, PPTX packages, audits, layout trees, collisions, text overflows, warnings, visual hierarchy, asset layering, and reference deck alignment. |
| `pptify-slide-spec` | Author or repair coordinate-explicit pptify JSON deck specs with layout tree groups, objects, bounding boxes, tables, images, lines, shapes, type scale, and collision-safe content. |
| `pptify-tooling` | Look up pptify install commands, plugin script syntax, and workspace reality checks. |
| `pptify-visual-assets` | Find, generate, and place icons, images, SVGs, raster conversions, infographics, image placeholders, and asset-backed slide objects. |

## Optional Toolkit

The bundled skills include reference material for design profile selection and manual quality checks. To run helper scripts for source prep, design context, visual assets, extraction, or audits, users can optionally install the PPTify toolkit from its source repository. The current external toolkit does not provide an importable `pptify` renderer module.

Do not clone or install the external toolkit automatically. Install it only when the user explicitly asks to use helper scripts:

```powershell
git clone https://github.com/kimtth/agent-pptify-kit
cd agent-pptify-kit
uv sync                   # base project
uv sync --extra plugins   # add source ingestion and image helpers
```

## Usage

Ask Copilot to create or repair a deck and mention `pptify`. The plugin guides the agent to collect required deck inputs, prepare source and reference context, select a design profile, author a coordinate-explicit JSON spec, build through the available PowerPoint path, and repair audit findings before reporting artifact paths.

## Source

Plugin skills are sourced from [kimtth/agent-pptify-kit](https://github.com/kimtth/agent-pptify-kit) for submission to [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT