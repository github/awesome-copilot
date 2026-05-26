# PPTify Design Profile Catalog

Source: `pptify-design/sources.json` — updated 2026-05-20.  
Load this file when `pptify-plugin/design/design_context_catalog.py` is unavailable.

## Quick-Select Guide

| Profile ID | Best for |
|---|---|
| `fluent-ui-design-tokens` | Microsoft, M365, Teams, Power Platform, enterprise — **default for new decks** |
| `primer-primitives` | GitHub-style, developer products, token-driven UI reviews, engineering docs |
| `corazzon-pptx-design-styles` | 30 modern style catalog; use when visual variety or multiple direction options are needed |
| `likaku-mck-ppt-design-skill` | Consulting, strategy, governance, operations — strict action-title discipline |
| `sunbigfly-ppt-agent-skills` | Source-backed, stage-gated delivery pipelines with human approval at each phase |
| `awesome-copilot-design-agents` | Prompting agent for design review, UX discovery, visual hierarchy reasoning |
| `nexu-io-open-design` | Direction-picker workflows with explicit style-lock and artifact-lint gates |
| `alchaincyf-huashu-design` | Brand-constrained enterprise decks requiring exact color/type fidelity |
| `pptwork-oh-my-slides` | HTML-prototype-first workflows; raster fidelity + constrained PPTX editability as separate deliverables |
| `erickittelson-slidemason` | Cautionary reference: JSX primitive composition — auto-layout incompatibility |
| `gabberflast-academic-pptx-skill` | High-stakes governance, board, or investor presentations needing narrative rigour |

## Profiles

### `fluent-ui-design-tokens`
**Name:** Fluent UI Design Token Guidance  
**Kind:** design-system-context  
**License:** MIT — Copyright (c) Microsoft Corporation  
**Source:** [microsoft/fluentui](https://github.com/microsoft/fluentui/blob/master/docs/architecture/design-tokens.md)  
**Token categories:** color, spacing, border radius, font, line height, stroke, shadow, duration, easing  
**Themes:** webLightTheme, webDarkTheme, teamsLightTheme, teamsDarkTheme, teamsHighContrastTheme  
**Agent rule:** Use design tokens instead of hardcoded colors, spacing, or typography values.  
**Best for:** Microsoft-aligned decks, Teams, M365, Power Platform governance, enterprise product reviews

---

### `primer-primitives`
**Name:** Primer Primitives Design Tokens  
**Kind:** design-system-context  
**License:** MIT — Copyright (c) 2018 GitHub Inc.  
**Source:** [primer/primitives](https://github.com/primer/primitives)  
**Token categories:** color, spacing, typography, motion, z-index  
**Spacing scale:** xxs, xs, sm, md, lg, xl  
**Typography roles:** display, title, subtitle, body, caption, codeBlock, codeInline  
**Color examples:** `#ffffff`, `#1f2328`, `#F6F8FA`, `#0969da`, `#1a7f37`, `#cf222e`  
**Best for:** GitHub-style decks, developer products, token-driven UI reviews, engineering documentation

---

### `corazzon-pptx-design-styles`
**Name:** corazzon/pptx-design-styles — 30 Modern PPTX Style Templates  
**Kind:** pptx-style-template-context  
**License:** MIT — Copyright TodayCode / corazzon contributors  
**Source:** [corazzon/pptx-design-styles](https://github.com/corazzon/pptx-design-styles)  
**30 styles:** Glassmorphism, Neo-Brutalism, Bento Grid, Dark Academia, Gradient Mesh, Claymorphism, Swiss International, Aurora Neon Glow, Retro Y2K, Nordic Minimalism, Typographic Bold, Duotone Color Split, Monochrome Minimal, Cyberpunk Outline, Editorial Magazine, Pastel Soft UI, Dark Neon Miami, Hand-crafted Organic, Isometric 3D Flat, Vaporwave, Art Deco Luxe, Brutalist Newspaper, Stained Glass Mosaic, Liquid Blob Morphing, Memphis Pop Pattern, Dark Forest Nature, Architectural Blueprint, Maximalist Collage, SciFi Holographic Data, Risograph Print  
**Style families:** modern-ui, editorial, retro, technical, luxury, organic, experimental  
**Source inputs per style:** hex colors, font pairings, layout rules, signature elements, avoid lists  
**Agent rule:** Pick one style, lock its palette and typography, then translate visual effects into explicit pptify `layout_tree` primitives or documented raster accents. Do not mix styles accidentally.  
**Best for:** Choosing a predefined modern style from a broad catalog; generating multiple visual direction options before deck production

---

### `likaku-mck-ppt-design-skill`
**Name:** likaku/Mck-ppt-design-skill — McKinsey-Style Native PPTX Layout Runtime  
**Kind:** pptx-pattern-context  
**License:** MIT — Copyright likaku contributors  
**Source:** [likaku/Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill)  
**Pattern count:** ~70 consulting-style layout patterns  
**Pattern families:** structure-navigation, data-metrics, frameworks-matrices, content-narrative  
**Action title discipline:** required on every content slide  
**Geometry norms (inches):** kicker_y=0.48, title_y=0.72, rule_y=1.12, content_top_y=1.30  
**Agent rule:** Use the source taxonomy as design inspiration only. Author exact `layout_tree` coordinates, sizes, and primitives. Action titles on every content slide.  
**Best for:** Consulting decks for strategy, governance, or operations reviews; strict action-title discipline

---

### `sunbigfly-ppt-agent-skills`
**Name:** sunbigfly/ppt-agent-skills — Staged Deck Generation Pipeline  
**Kind:** agent-pipeline-context  
**License:** MIT — Copyright sunbigfly contributors  
**Source:** [sunbigfly/ppt-agent-skills](https://github.com/sunbigfly/ppt-agent-skills)  
**Pipeline stages:** interview → source-compression → outline → style-lock → slide-plan → visual-qa → dual-export  
**Stage outputs:** structured brief JSON, compressed source ≤800 words, outline JSON, style_lock JSON, complete spec.json, qa-report, pptx + raster  
**Agent rule:** Never skip the interview. Source compression before outline. Style lock is stage-gated. Per-slide plans are full specs. Action titles mandatory.  
**Best for:** Source-grounded decks; high-stakes presentations; workflows requiring explicit human approval at each phase

---

### `awesome-copilot-design-agents`
**Name:** Awesome Copilot Design Agent and Prompt Context  
**Kind:** agent-prompt-context  
**License:** MIT — Copyright GitHub, Inc.  
**Source:** [github/awesome-copilot](https://github.com/github/awesome-copilot)  
**Key files:** `agents/gem-designer.agent.md`, `agents/se-ux-ui-designer.agent.md`, `skills/penpot-uiux-design/SKILL.md`, `skills/prompt-optimizer/SKILL.md`  
**Prompt focus:** existing design systems, visual hierarchy, UX discovery, accessibility, slides and reports design intentionality  
**Best for:** Prompting an LLM to reason about deck design; UX discovery before deck planning; design review checklists; visual hierarchy guidance

---

### `nexu-io-open-design`
**Name:** nexu-io/open-design — Claude Design Style  
**Kind:** agent-skill-context  
**License:** MIT — Copyright nexu-io contributors  
**Source:** [nexu-io/open-design](https://github.com/nexu-io/open-design)  
**Key patterns:** direction-picker, sandbox-preview, artifact-lint, design-critique  
**Stage gates:** direction selection → style lock → preview approval → artifact lint → critique gate  
**Agent rule:** Never start layout without a locked direction. Run artifact lint after every build. Preview before full deck.  
**Best for:** Reasoning about deck design direction before committing; parallel design options for selection; lint and critique gates on generated decks

---

### `alchaincyf-huashu-design`
**Name:** alchaincyf/huashu-design — HTML-Native Brand Design Pipeline  
**Kind:** agent-skill-context  
**License:** MIT — Copyright alchaincyf contributors  
**Source:** [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)  
**Key patterns:** brand-asset-protocol, visual-directions, html-to-editable-pptx, playwright-check  
**Brand lock fields:** primary_palette, neutral_palette, typeface_display, typeface_body, tone  
**Agent rule:** Brand lock is non-negotiable. Parallel directions before deck plan. Every text frame must be individually editable.  
**Best for:** Brand-constrained enterprise decks requiring exact color/type fidelity; multi-direction style exploration before committing

---

### `pptwork-oh-my-slides`
**Name:** PPTWork/oh-my-slides — HTML-as-Source PPTX Build Artifact Pipeline  
**Kind:** pptx-export-context  
**License:** MIT — Copyright PPTWork contributors  
**Source:** [PPTWork/oh-my-slides](https://github.com/PPTWork/oh-my-slides)  
**Key patterns:** html-source, preset-picker, mini-preview, raster-export, constrained-editable  
**Export model:** HTML (design source) → raster export (fidelity) + constrained PPTX (editability)  
**Forbidden in editable PPTX:** background images, raster embeds of slide content, CSS transform rotate, SVG filter effects  
**Agent rule:** Never promise both pixel fidelity and full editability from the same export path. Raster embeds in editable PPTX are a quality failure.  
**Best for:** HTML-prototype-first workflows; design fidelity and PowerPoint editability as separate deliverables; Playwright-in-the-loop generation

---

### `erickittelson-slidemason`
**Name:** erickittelson/slidemason — JSX Primitive Composition (Cautionary Reference)  
**Kind:** agent-skill-context  
**License:** MIT — Copyright erickittelson contributors  
**Source:** [erickittelson/slidemason](https://github.com/erickittelson/slidemason)  
**Key patterns:** jsx-primitives, jsx-bento, bespoke-slide, primitive-composition  
**Primitive map:** Card→`_shape(round_rect)`, Text→`_text()`, Line→`_line()`, Image→`_image()`, Oval→`_shape(oval)`  
**Editability failure modes:** nested flex containers, auto-sized text frames, SVG filter effects, rotated text boxes, image fills on shapes  
**Agent rule:** Auto-layout is the enemy of editability. All coordinates are in inches. Bespoke layout is a last resort.  
**Best for:** Understanding limits of programmatic slide composition; cautionary reference for auto-layout / PPTX editability incompatibility

---

### `gabberflast-academic-pptx-skill`
**Name:** Gabberflast/academic-pptx-skill — Narrative Discipline Gates  
**Kind:** agent-skill-context  
**License:** MIT — Copyright Gabberflast contributors  
**Source:** [Gabberflast/academic-pptx-skill](https://github.com/Gabberflast/academic-pptx-skill)  
**Key patterns:** action-title, ghost-deck-test, one-exhibit-discipline, evidence-slide, citation-slide  
**Narrative gates:** action title on every content slide; ghost deck test passes; one exhibit per slide; last slide names a specific next action; every quantitative claim has a source  
**Agent rule:** Run ghost deck test before building slides. Rewrite descriptive titles as action titles. One exhibit per slide is a hard rule. The closing slide must name a decision, deadline, and owner.  
**Best for:** High-stakes governance or board presentations requiring narrative rigour; decks reviewed by investors, regulators, or boards

---

## Using This Catalog

**When the toolkit is present**, load full style context with:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --profile <profile-id> --include-context --pretty
```

**When the toolkit is absent**, use the entries above to:

1. Select the profile ID that best matches the user's audience, topic, and delivery context.
2. Lock the palette, typography, and signature element conventions described in the profile's `source_signals`.
3. Record the selected profile ID, source URL, and license in `summary.design_context` before building the deck spec.
4. Translate the style signals directly into explicit `layout_tree` primitives — colors, fills, rules, card shells, accent bands, and bboxes.
