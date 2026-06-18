# pptify-slides-creation

Generate production-ready, **editable** PowerPoint (PPTX) decks with GitHub Copilot — from narrative strategy to coordinate-explicit slide specifications and audit-driven quality gates.

The `pptify-slides-creation` plugin bundles one agent and five skills that cover the full deck-creation workflow: framing the business story, selecting a design direction, authoring collision-safe layout trees, planning visual assets, analyzing reference decks, and validating the final package.

## Install

```bash
copilot plugin install pptify-slides-creation@awesome-copilot
```

If the marketplace isn't registered yet:

```bash
copilot plugin marketplace add github/awesome-copilot
copilot plugin install pptify-slides-creation@awesome-copilot
```

## What's included

### Agent

- **pptify-slides-builder** — Guides the end-to-end deck workflow, from narrative strategy to production-ready, coordinate-explicit JSON specifications and build scripts.

### Skills

- **pptify-context-prep** — Choose a business/storytelling framework, convert and summarize source material, analyze reference PPTX decks, and load bundled design profiles before authoring a spec.
- **pptify-slide-spec** — Author or repair coordinate-explicit JSON deck specs: layout-tree groups, objects, bounding boxes, tables, images, lines, shapes, and a type scale that avoids collisions and overflow.
- **pptify-visual-assets** — Plan and place icons, images, SVGs, infographics, and asset-backed slide objects with placement and decision guidance.
- **pptify-tooling** — Import-only PPTX extraction and style-analysis helpers for reference-deck analysis and package inspection, without heavy runtime scripts.
- **pptify-quality-gates** — Validate and repair deck specs and PPTX packages against an 11-dimension audit checklist (collisions, overflows, hierarchy, asset layering, reference alignment).

## Typical workflow

1. **Context prep** — pick a narrative framework, ingest sources, select a design profile.
2. **Slide spec** — write a coordinate-explicit `layout_tree` JSON spec.
3. **Visual assets** — plan icons/images/infographics and bind them to slide objects.
4. **Tooling** — analyze a reference deck or inspect a generated package when needed.
5. **Quality gates** — run the audit checklist and repair issues before sign-off.

## Notes

- The plugin is **standalone**: it provides guidance, design context, and import-only analysis APIs — there is no install step and no bundled setup scripts.
- LLM access for source summarization is user-managed (bring your own OpenAI, Azure OpenAI, etc.).

## Credits

Upstream project: [kimtth/agent-pptify-kit](https://github.com/kimtth/agent-pptify-kit). Licensed under MIT.
