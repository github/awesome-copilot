# pptify Plugin

Generate production-ready, editable PowerPoint decks from Copilot chat. The plugin combines narrative planning, design-context selection, coordinate-explicit slide specifications, visual asset planning, reference-deck analysis, and audit-driven quality gates.

## Installation

```bash
copilot plugin install pptify@awesome-copilot
```

## What's Included

### Agent

| Agent | What it does |
| --- | --- |
| [pptify-slides-builder](../../agents/pptify-slides-builder.agent.md) | End-to-end deck generation workflow for PowerPoint presentations. |

### Skills

| Skill | What it does |
| --- | --- |
| [pptify-context-prep](../../skills/pptify-context-prep/SKILL.md) | Prepare audience, narrative, constraints, and design context before slide specification. |
| [pptify-quality-gates](../../skills/pptify-quality-gates/SKILL.md) | Run quality checks for generated decks, specs, and rendered previews. |
| [pptify-reference-deck-analysis](../../skills/pptify-reference-deck-analysis/SKILL.md) | Analyze existing PPTX decks for reusable structure, style, and layout signals. |
| [pptify-slide-spec](../../skills/pptify-slide-spec/SKILL.md) | Author coordinate-explicit slide specs for editable PowerPoint output. |
| [pptify-visual-assets](../../skills/pptify-visual-assets/SKILL.md) | Plan and produce visual assets suitable for deck generation. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
