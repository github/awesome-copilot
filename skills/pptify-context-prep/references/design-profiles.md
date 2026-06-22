# PPTify Design Profile Catalog

**This is the bundled reference for design profiles.** Use it for all new decks. Design context is built-in and always available.

## Quick-Select Guide

| Profile ID | Best for |
|---|---|
| `fluent-ui-design-tokens` | Microsoft, M365, Teams, Power Platform, enterprise — **default for new decks** |
| `getdesign-md-design-systems` | **Live fetch** — brand-accurate DESIGN.md analyses (Apple, Stripe, Linear, Notion, …) from getdesign.md when matching a real product's look |
| `corazzon-pptx-design-styles` | 30 modern style catalog; use when visual variety or multiple direction options are needed |
| `likaku-mck-ppt-design-skill` | Consulting, strategy, governance, operations — strict action-title discipline |
| `sunbigfly-ppt-agent-skills` | Source-backed, stage-gated delivery pipelines with human approval at each phase |
| `awesome-copilot-design-agents` | Prompting agent for design review, UX discovery, visual hierarchy reasoning |
| `nexu-io-open-design` | Direction-picker workflows with explicit style-lock and artifact-lint gates |
| `alchaincyf-huashu-design` | Brand-constrained enterprise decks requiring exact color/type fidelity |
| `pptwork-oh-my-slides` | HTML-prototype-first workflows; raster fidelity + constrained PPTX editability as separate deliverables |
| `erickittelson-slidemason` | Cautionary reference: JSX primitive composition — auto-layout incompatibility |
| `gabberflast-academic-pptx-skill` | High-stakes governance, board, or investor presentations needing narrative rigour |
| `primer-primitives` | GitHub-style, developer products, token-driven UI reviews, engineering docs |

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

### `getdesign-md-design-systems`
**Name:** getdesign.md — Production-grade DESIGN.md Brand Analyses (Live Fetch)  
**Kind:** live-design-reference-context  
**License:** Per-entry; independent analyses published by VoltAgent. Reference/inspiration only — **not** official, not affiliated with or endorsed by the brands, and not redistributable assets. All trademarks belong to their owners.  
**Source:** [getdesign.md](https://getdesign.md/) · catalog: [getdesign.md/design-md](https://getdesign.md/design-md) · spec basis: Google Stitch's DESIGN.md · awesome list: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)  
**Catalog size:** 300+ brand/product DESIGN.md analyses (e.g., Apple, Stripe, Linear, Notion, Vercel, Figma, Airbnb, Spotify, Tesla, IBM/Carbon, NVIDIA)  

**What getdesign.md is:** A browsable frontend for the open-source `awesome-design-md` collection. Each catalog entry is a single `DESIGN.md` file — a structured Markdown document (the format introduced by Google Stitch) that captures the *publicly observable* design language of a real website so a coding agent can use it as reference while building original UI. They are analyses of patterns, not pixel-exact reproductions of the source sites.

**Anatomy of a DESIGN.md entry** (consistent section taxonomy across the catalog):
- **01 — Colors:** Core palette as named tokens with hex + role (e.g., `Primary #533afd`, `Ink #0d253d`, `Canvas #ffffff`, `Canvas Alt`, `Hairline`, `Muted`, `Accent`), plus an extended brand/accent and gradient-stop set.
- **02 — Typography:** A type scale split into display and body tiers; each token lists size / weight / line-height / letter-spacing and its role (e.g., `display-xxl 56px/300/1.12/-1.4px`, `body-md 16/400/1.55`, `micro-cap 12/700` eyebrow).
- **03–05 — Components:** Button variants (primary/secondary/outline/on-dark), card examples (incl. inverted/featured tiers), and form-element conventions (input borders, focus treatment).
- **06–08 — Foundations:** Spacing scale (typically an 8px base with sub-units), border-radius scale (input → pill `9999px`), and elevation/shadow stacks (L0 flat → L3 toast).
- **09 — Responsive:** Breakpoint stair (mobile/tablet/desktop/wide), touch-target minimums (≥44×44px), and collapsing strategy.
- Plus a short prose intro describing the brand's "signature" (mood, motifs, hero treatment) and an Additional Links/preview block.

**How users consume it (outside this skill):** `npx getdesign@latest add {slug}` drops the file into a project, or "Download DESIGN.md"; some entries also offer a full website starter kit at `…/design-md/kit`. Inside this skill, treat the page as a *read-only reference* — fetch and extract signals; do not run the installer.

**Fetch contract:** Each entry is reachable at `https://getdesign.md/{slug}/design-md` (e.g., `https://getdesign.md/stripe/design-md`, `https://getdesign.md/linear.app/design-md`). Some slugs include the TLD (`linear.app`, `mistral.ai`, `x.ai`, `opencode.ai`). Browse `https://getdesign.md/design-md` to resolve the correct `{slug}`.  
**Agent rule:** Use this profile only when the user asks for a deck that should match a specific real-world brand or product aesthetic. Fetch the matching DESIGN.md entry, extract the color tokens, type scale, spacing/radius/elevation foundations, and signature motifs, then lock them in `summary.design_context`. Translate signals into explicit `layout_tree` primitives — do not embed scraped images, screenshots, or copy proprietary brand assets/logos. Record the entry URL and the "independent analysis, not affiliated" disclaimer as the design source. If the fetch fails or no slug matches, fall back to a bundled profile and note the fallback.  
**Best for:** Decks that must visually echo a known product or company; brand-accurate palette/typography/foundation sourcing without maintaining a local copy

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

Use the entries above to:

1. Select the profile ID that best matches the user's audience, topic, and delivery context.
2. Lock the palette, typography, and signature element conventions described in the profile's `source_signals`.
3. Record the selected profile ID, source URL, and license in `summary.design_context` before building the deck spec.
4. Translate the style signals directly into explicit `layout_tree` primitives — colors, fills, rules, card shells, accent bands, and bboxes.

### Fetching Live References from getdesign.md

When the user wants a deck that mirrors a specific real brand or product, use the `getdesign-md-design-systems` profile to pull a live analysis:

1. Browse the catalog at `https://getdesign.md/design-md` to find the brand and its `{slug}` (some slugs carry a TLD, e.g. `linear.app`, `mistral.ai`).
2. Fetch the entry at `https://getdesign.md/{slug}/design-md` (e.g., `https://getdesign.md/apple/design-md`).
3. Read the DESIGN.md sections and map them onto deck decisions:
   - **Colors (01)** → deck palette: `Primary`/`Accent` for emphasis and CTAs, `Ink`/`Muted` for text, `Canvas`/`Canvas Alt` for backgrounds and bands, `Hairline` for rules and dividers.
   - **Typography (02)** → title vs. body type roles, weights, and relative size hierarchy (display tier for slide titles/kickers, body tier for content).
   - **Foundations (06–08)** → spacing rhythm, corner radii for card shells/buttons, and elevation cues for layered cards.
   - **Components (03–05)** + **signature motifs** (intro prose) → card/pill/divider styling and the brand's hallmark accents (e.g., gradient bands).
4. Record the entry URL, the "independent analysis / not affiliated" disclaimer, and the extracted tokens in `summary.design_context`, then translate the signals into explicit `layout_tree` primitives.
5. Never embed scraped imagery, screenshots, logos, or other proprietary brand assets; use the signals as design guidance only. If the fetch fails or no slug matches, fall back to a bundled profile and flag the fallback in `summary.design_context`.
