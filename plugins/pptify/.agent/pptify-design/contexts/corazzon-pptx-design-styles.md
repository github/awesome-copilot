# corazzon/pptx-design-styles - Design Context

**Source repo:** corazzon/pptx-design-styles
**Style reference:** 30 modern PPTX visual style templates with colors, fonts, layouts, signature elements, and anti-patterns
**Retrieved:** 2026-05-20

---

## What this repo teaches

`corazzon/pptx-design-styles` is a curated design-template skill for presentation generation. Its value to pptify is not a runtime theme engine; it is a compact visual vocabulary that agents can translate into explicit `layout_tree` primitives: fills, text boxes, rules, cards, panels, diagrams, grids, and image-backed effects when needed.

The upstream project includes English and Korean README files plus a Korean preview page. This local context is normalized to English and references the English `README.md`, `SKILL.md`, and `references/styles.md` only.

No upstream binary assets are copied into this repository. Treat the upstream preview page and images as reference material only.

---

## Core agent rule for pptify

Choose one style before layout planning, lock its palette and typography, then translate the style into editable PowerPoint primitives wherever possible.

- Use the exact HEX colors listed in the style lock.
- Keep one visual signature element present across the deck.
- Every slide should contain a visual element: shape, color block, card, diagram, rule, pattern, or image-backed exhibit.
- Avoid text-only slides unless the chosen style is explicitly typographic.
- Do not mix multiple styles in one deck unless the user asks for a deliberate contrast.
- CSS effects such as blur, backdrop-filter, blend modes, gradient text, or animated scan lines must be translated into PowerPoint-safe approximations: transparent shapes, raster background accents, layered fills, or editable lines.

---

## Style recommendation matrix

| Deck goal | Recommended styles |
|---|---|
| Tech, AI, startup | Glassmorphism, Aurora Neon Glow, Cyberpunk Outline, SciFi Holographic Data |
| Corporate, consulting, finance | Swiss International, Monochrome Minimal, Editorial Magazine, Architectural Blueprint |
| Education, research, history | Dark Academia, Nordic Minimalism, Brutalist Newspaper |
| Brand or marketing launch | Gradient Mesh, Typographic Bold, Duotone Color Split, Risograph Print |
| Product, app, UX | Bento Grid, Claymorphism, Pastel Soft UI, Liquid Blob Morphing |
| Entertainment or gaming | Retro Y2K, Dark Neon Miami, Vaporwave, Memphis Pop Pattern |
| Eco, wellness, culture | Hand-crafted Organic, Nordic Minimalism, Dark Forest Nature |
| Infrastructure or architecture | Isometric 3D Flat, Cyberpunk Outline, Architectural Blueprint |
| Portfolio, art, creative | Monochrome Minimal, Editorial Magazine, Risograph Print, Maximalist Collage |
| Pitch or strategy | Neo-Brutalism, Duotone Color Split, Bento Grid, Art Deco Luxe |
| Luxury, premium event | Art Deco Luxe, Monochrome Minimal, Dark Academia |
| Science, biotech, innovation | Liquid Blob Morphing, SciFi Holographic Data, Aurora Neon Glow |

---

## Normalized style taxonomy

### 01. Glassmorphism
- Mood: premium, tech, futuristic.
- Best for: SaaS, app launches, AI products.
- Palette: deep gradient `#1A1A4E`, `#6B21A8`, `#1E3A5F`; glass white at 15-20% opacity; border white at 25%; accents `#67E8F9` or `#A78BFA`.
- Typography: Segoe UI Light or Calibri Light titles, 36-44pt; Segoe UI body, 14-16pt; large KPI numbers, 52-64pt.
- Layout: translucent rounded cards, offset layering, dark gradient field, soft glow ellipses.
- Signature: consistent frosted-card treatment.
- Avoid: white backgrounds, opaque cards, saturated solid fills.

### 02. Neo-Brutalism
- Mood: bold, raw, provocative, startup energy.
- Best for: pitch decks, marketing, creative agencies.
- Palette: yellow `#F5F500`, lime `#CCFF00`, hot pink `#FF2D55`, black `#000000`, red `#FF3B30`, blue `#0000FF`.
- Typography: Arial Black, Impact, or Bebas Neue titles, 40-56pt; Courier New or Space Mono body, 13-16pt.
- Layout: thick black borders, hard offset shadows, intentional misalignment, oversized words or numbers.
- Signature: pure-black no-blur shadows on every card.
- Avoid: soft shadows, gradients, rounded corners, muted colors.

### 03. Bento Grid
- Mood: modular, structured, Apple-inspired.
- Best for: feature comparisons, product overviews, data summaries.
- Palette: off-white `#F8F8F2`, navy `#1A1A2E`, yellow `#E8FF3B`, coral `#FF6B6B`, teal `#4ECDC4`, warm yellow `#FFE66D`.
- Typography: SF Pro or Inter titles, 18-24pt; Inter body, 12-14pt; large stats, 48-64pt.
- Layout: asymmetric grid cells with varied spans and 8-12pt gaps.
- Signature: one dark anchor cell with white text plus color-coded supporting cells.
- Avoid: equal-size grids, dense text, more than five colors.

### 04. Dark Academia
- Mood: scholarly, vintage, refined.
- Best for: education, historical research, book or university talks.
- Palette: deep brown `#1A1208`, near-black `#0E0A05`, antique gold `#C9A84C`, parchment `#D4BF9A`, muted gold `#8A7340`.
- Typography: Playfair Display Italic or Georgia Italic titles, 36-48pt; EB Garamond or Georgia body, 13-16pt; Space Mono labels.
- Layout: inset border frames, centered serif title, decorative horizontal rules, generous leading.
- Signature: double gold border and italic serif title.
- Avoid: modern sans-serif display type, bright colors, overly clean minimalism.

### 05. Gradient Mesh
- Mood: artistic, vibrant, brand-forward.
- Best for: brand launches, creative portfolios, music or film promotions.
- Palette: hot pink `#FF6EC7`, violet `#7B61FF`, cyan `#00D4FF`, warm orange `#FFB347`, white text.
- Typography: Bebas Neue or Barlow Condensed ExtraBold titles, 48-72pt; Outfit or Poppins Light body, 14-16pt.
- Layout: full-bleed multi-radial gradient, minimal white text, optional frosted body panel.
- Signature: painterly multi-color mesh with large type.
- Avoid: simple two-color linear gradients, dark text, overcrowding.

### 06. Claymorphism
- Mood: friendly, tactile, soft 3D.
- Best for: product launches, education, app UI decks.
- Palette: peach gradient `#FFECD2` to `#FCB69F`, teal `#A8EDEA`, blush `#FED6E3`, yellow `#FFEAA7`.
- Typography: Nunito ExtraBold or rounded display titles, 32-48pt; Nunito or DM Sans body, 14-16pt.
- Layout: high-radius rounded shapes, colored shadows, top-edge highlights, asymmetric bubbles.
- Signature: color-matched soft shadows and inner highlights.
- Avoid: sharp corners, grey shadows, mixed flat elements.

### 07. Swiss International
- Mood: functional, authoritative, timeless.
- Best for: consulting, finance, government, institutional decks.
- Palette: white `#FFFFFF`, near-black `#111111`, signal red `#E8000D`, dark grey `#444444`, light grey `#DDDDDD`.
- Typography: Helvetica Neue or Arial titles, 32-44pt; Arial body, 12-14pt; Space Mono captions.
- Layout: strict 5-column or 12-column grid, left red rule, horizontal divider, generous margins.
- Signature: left-edge red bar and grid-aligned text blocks.
- Avoid: decorative illustration, rounded corners, more than two fonts.

### 08. Aurora Neon Glow
- Mood: futuristic, electric, AI-oriented.
- Best for: AI products, cybersecurity, innovation summits.
- Palette: deep black `#050510`, neon green `#00FF88`, violet `#7B00FF`, cyan `#00B4FF`, soft white `#D0D0F0`.
- Typography: Bebas Neue or Barlow Condensed titles, 44-60pt; DM Mono or Space Mono body, 12-14pt.
- Layout: dark field, blurred neon circles, gradient title approximation, transparent dark panels.
- Signature: green-cyan-violet glow system.
- Avoid: light backgrounds, flat non-glowing colors, dense body text without panels.

### 09. Retro Y2K
- Mood: nostalgic, pop, chaotic.
- Best for: events, lifestyle marketing, fashion campaigns.
- Palette: navy `#000080`, electric blue `#0020C2`, rainbow stripe, white title, cyan `#00FFFF`, magenta `#FF00FF`, yellow `#FFFF00`.
- Typography: Bebas Neue or Impact titles, 36-52pt; VT323 or Space Mono body, 12-14pt.
- Layout: top and bottom rainbow bars, centered title, sparkle motifs, double-color shadow effects.
- Signature: rainbow stripe bars and cyan/magenta title shadow.
- Avoid: minimalism, muted colors, serif fonts.

### 10. Nordic Minimalism
- Mood: calm, natural, Scandinavian.
- Best for: wellness, lifestyle, nonprofit, sustainable brands.
- Palette: cream `#F4F1EC`, warm grey `#D9CFC4`, dark brown `#3D3530`, taupe `#8A7A6A`.
- Typography: Canela, Freight Display, or DM Serif Display titles, 36-52pt; Inter Light or Lato Light body, 13-15pt.
- Layout: at least 40% negative space, one organic background shape, small dot accent set, bottom rule and caption.
- Signature: organic blob, three-dot accent, letter-spaced monospace caption.
- Avoid: bright colors, dense layouts, sans-serif display type.

### 11. Typographic Bold
- Mood: editorial, impactful, authoritative.
- Best for: manifestos, brand statements, headline announcements.
- Palette: off-white `#F0EDE8`, black `#0A0A0A`, near-black `#1A1A1A`, signal red `#E63030`, light grey `#AAAAAA`.
- Typography: Bebas Neue or Anton, 80-120pt; Space Mono footnotes.
- Layout: type fills the slide; two or three lines maximum; one accent word.
- Signature: oversized display typography as the visual.
- Avoid: images, icons, more than three large text lines, multiple font families.

### 12. Duotone Color Split
- Mood: dramatic, comparative, energetic.
- Best for: strategy, before-after, compare-contrast slides.
- Palette: orange-red `#FF4500`, deep navy `#1A1A2E`, white divider and text.
- Typography: Bebas Neue panel text, 40-56pt; Space Mono captions.
- Layout: exact 50/50 split with white divider; one idea per side.
- Signature: cross-panel color echo.
- Avoid: three or more panels, weak contrast, busy content.

### 13. Monochrome Minimal
- Mood: restrained, luxury, gallery-like.
- Best for: luxury brands, portfolios, high-end consulting.
- Palette: near-white `#FAFAFA`, black `#0A0A0A`, near-black `#1A1A1A`, greys `#E0E0E0`, `#888888`, `#CCCCCC`.
- Typography: Helvetica Neue Thin or Futura Light display, 24-36pt; Helvetica Neue body; Space Mono accent.
- Layout: thin circle focal point, descending-width bars, extreme negative space.
- Signature: pure monochrome with precise thin-line geometry.
- Avoid: color, decorative illustration, crowded layouts.

### 14. Cyberpunk Outline
- Mood: HUD, sci-fi, dark tech.
- Best for: gaming, AI infrastructure, security, data engineering.
- Palette: near-black `#0D0D0D`, neon cyan `#00FFC8` at varied opacities.
- Typography: Bebas Neue outline-style titles, 44-60pt; Space Mono body and labels.
- Layout: subtle grid, four corner brackets, centered outline title, bottom data label.
- Signature: stroke-only title and corner markers.
- Avoid: white backgrounds, filled title text, warm colors.

### 15. Editorial Magazine
- Mood: journalistic, narrative, sophisticated.
- Best for: annual reports, brand stories, long-form deck narratives.
- Palette: white `#FFFFFF`, near-black `#1A1A1A`, signal red `#E63030`, light grey `#BBBBBB`.
- Typography: Playfair Display Italic titles, 34-48pt; Space Mono subheads; Georgia body.
- Layout: asymmetric white/dark split, short red rule, rotated vertical label, column-style body copy.
- Signature: magazine split layout and red rule.
- Avoid: symmetry, sans-serif display type, full-bleed colored backgrounds.

### 16. Pastel Soft UI
- Mood: gentle, app-like, healthcare-friendly.
- Best for: healthcare, beauty, education startups, consumer apps.
- Palette: pink-blue-mint gradient, white cards at 70%, blush `#F9C6E8`, sky blue `#C6E8F9`.
- Typography: Nunito or DM Sans titles, 28-36pt; Nunito or DM Sans body, 13-15pt.
- Layout: floating translucent cards, central pill or circular card, corner blobs, soft colored shadows.
- Signature: frosted white cards over pastel gradient.
- Avoid: dark backgrounds, saturated primaries, hard shadows.

### 17. Dark Neon Miami
- Mood: synthwave, nightlife, 1980s neon.
- Best for: entertainment, music festivals, events.
- Palette: purple-black `#0A0014`, orange `#FF6B35`, hot pink `#FF0080`, purple `#9B00FF`.
- Typography: Bebas Neue titles, 36-52pt; Space Mono body.
- Layout: lower-center sunset semicircle, converging perspective grid, centered top title.
- Signature: sunset semicircle and neon grid.
- Avoid: blue-green dominant palettes, daylight backgrounds, plain body type.

### 18. Hand-crafted Organic
- Mood: artisanal, natural, human.
- Best for: eco brands, food and beverage, craft studios, wellness.
- Palette: craft paper `#FDF6EE`, tan `#C8A882`, brown `#A87850`, dark brown `#6B4C2A`, natural greens.
- Typography: Playfair Display Italic or Cormorant Garamond Italic titles, 22-34pt; EB Garamond body.
- Layout: nested circles, botanical line-art accents, dashed rules, italic serif title.
- Signature: imperfect dashed outer circle and natural accents.
- Avoid: clean geometry, synthetic colors, sans-serif fonts.

### 19. Isometric 3D Flat
- Mood: technical, structured, architectural.
- Best for: IT architecture, data flow, system diagrams.
- Palette: navy `#1E1E2E`, violet faces `#7C6FFF`, `#4A3FCC`, `#6254E8`, highlight `#A594FF`.
- Typography: Space Mono labels, 10-12pt; Bebas Neue or Barlow Condensed titles, 28-40pt.
- Layout: 30-degree isometric block clusters, thin connectors, title upper-right.
- Signature: three-face shading system.
- Avoid: perspective 3D, rounded shapes, light backgrounds.

### 20. Vaporwave
- Mood: dreamy, surreal, internet-nostalgic.
- Best for: creative agencies, music, art portfolios.
- Palette: purple gradient `#1A0533` to `#570038`, sun colors `#FF9F43`, `#FF6B9D`, `#C44DFF`, grid `#FF64C8`.
- Typography: Bebas Neue ghost and gradient text; Space Mono body.
- Layout: perspective grid floor, sliced sunset semicircle, ghost watermark title, bottom gradient text.
- Signature: sliced sun and grid floor.
- Avoid: corporate layouts, muted earth tones, conventional typography.

### 21. Art Deco Luxe
- Mood: gilded, prestigious, 1920s grandeur.
- Best for: luxury brands, gala events, premium reports.
- Palette: black-brown `#0E0A05`, gold `#B8960C`, rich gold `#D4AA2A`, muted gold `#8A7020`.
- Typography: Cormorant Garamond, Trajan, or Didot titles, 26-36pt, all caps and wide-spaced; Space Mono captions.
- Layout: double inset border, side fan ornaments, center rule and diamond, centered uppercase title.
- Signature: gold frame, fan ornaments, diamond divider.
- Avoid: modern sans-serif fonts, colorful or pastel tones, asymmetric layouts.

### 22. Brutalist Newspaper
- Mood: raw journalism, editorial authority.
- Best for: media, research institutes, content industry decks.
- Palette: aged paper `#F2EFE8`, warm black `#1A1208`, body brown `#3A3020`.
- Typography: Space Mono masthead, Georgia or Playfair headline, Georgia body.
- Layout: dark masthead bar, double rules, two columns with divider, photo placeholder and caption.
- Signature: newspaper nameplate and dense two-column editorial layout.
- Avoid: modern sans-serif fonts, colorful elements, sparse white space.

### 23. Stained Glass Mosaic
- Mood: vibrant, artistic, cathedral-rich.
- Best for: museums, culture, arts organizations.
- Palette: grout `#0A0A12`, blue `#1A3A6E`, crimson `#E63030`, yellow `#F5D020`, green `#2A6E1A`, purple `#6E1A4E`.
- Typography: Cormorant Garamond Bold or Trajan overlay titles; Georgia body.
- Layout: 6x4 mosaic grid with dark gaps, varied color rhythm, dark overlay for legibility.
- Signature: stained-glass cells with no matching adjacent colors.
- Avoid: pastel cells, large empty cells, sans-serif overlay text.

### 24. Liquid Blob Morphing
- Mood: organic, fluid, bio-digital.
- Best for: biotech, environmental tech, innovation labs.
- Palette: ocean gradient `#0F2027` to `#2C5364`, teal `#00D2BE`, blue `#0078FF`, violet `#7800FF`, near-white `#F0FFFE`.
- Typography: Bebas Neue titles, 36-48pt; DM Mono or Space Mono body.
- Layout: three overlapping translucent blob shapes, dark ocean field, glowing centered title.
- Signature: overlapped low-opacity blobs and teal halo.
- Avoid: sharp geometry, bright warm backgrounds, dense text.

### 25. Memphis Pop Pattern
- Mood: energetic, geometric, anti-minimalist.
- Best for: fashion, lifestyle, retail, youth marketing.
- Palette: warm off-white `#FFF5E0`, red `#E8344A`, blue `#1E90FF`, mint `#22BB88`, yellow `#FFD700`.
- Typography: Bebas Neue or Futura ExtraBold titles, 32-44pt; Futura or DM Sans body.
- Layout: scattered triangles, circles, dots, zigzag bar, asymmetric balance.
- Signature: all key geometric motifs present on warm background.
- Avoid: minimalism, monochrome palettes, overly clean fonts.

### 26. Dark Forest Nature
- Mood: mysterious, atmospheric, eco-premium.
- Best for: environmental brands, adventure, sustainable luxury.
- Palette: forest gradient `#0D2B14` to `#060E08`, tree greens `#0A3D1A` and `#0D4D20`, moon sage `#E8F4D0` to `#B8CC80`, stars `#D4F0B0`.
- Typography: Playfair Display Italic or DM Serif Display Italic titles, 20-28pt; EB Garamond body; Space Mono captions.
- Layout: layered tree silhouettes, glowing moon top-right, sparse star dots, bottom mist overlay.
- Signature: three-depth forest silhouette plus moon.
- Avoid: bright greens, hard tree edges, sans-serif fonts.

### 27. Architectural Blueprint
- Mood: precise, technical, professional.
- Best for: architecture, planning, engineering, spatial design.
- Palette: blueprint navy `#0D2240`, grid cyan-white `#64B4FF`, line cyan `#64C8FF`, title `#96DCFF`.
- Typography: Space Mono only, 8-13pt.
- Layout: fine and major grid, dimension lines, annotation marks, circular stamp, bottom title label.
- Signature: dual grid and dimension annotations.
- Avoid: decorative color, non-monospace fonts, photography.

### 28. Maximalist Collage
- Mood: chaotic, irreverent, advertising-bold.
- Best for: advertising, fashion, music, editorial.
- Palette: antique cream `#E8DDD0`, red `#E83030`, near-black `#1A1A1A`, acid yellow `#F5D020`, white text.
- Typography: Bebas Neue words, 24-34pt; Playfair Display Italic secondary text; large ghost numbers; Space Mono captions.
- Layout: overlapping rotated color blocks, diagonal background pattern, ghost number, circle outline accent.
- Signature: three or more rotated blocks with vertical text in one block.
- Avoid: symmetry, clean uncluttered layouts, muted backgrounds.

### 29. SciFi Holographic Data
- Mood: military HUD, quantum, precision.
- Best for: defense tech, AI research, quantum, advanced data engineering.
- Palette: space black `#03050D`, cyan `#00C8FF` at varied opacities.
- Typography: Space Mono only, 8-11pt.
- Layout: three concentric rings, one rotated ring, horizontal scan line, glowing horizontal bars, top-left and bottom-right labels.
- Signature: monochrome cyan HUD rings and scan line.
- Avoid: multiple hues, warm colors, decorative illustration.

### 30. Risograph Print
- Mood: indie, analog, artisanal print.
- Best for: publishers, music labels, art zines, boutique studios.
- Palette: aged paper `#F7F2E8`, riso red `#E8344A`, riso blue `#0D5C9E`, riso yellow `#F5D020`.
- Typography: Bebas Neue main title, 34-44pt; Space Mono caption.
- Layout: three overlapping circles in the center third, offset ghost title, bottom monospace caption.
- Signature: CMYK-like overlaps and registration-offset title.
- Avoid: dark backgrounds, overly crisp digital treatment, screen-style blending.

---

## Translation guidance for pptify layout trees

- Cards: represent as `shape` rectangles with explicit fill opacity, border color, radius, and z-order.
- Rules and gridlines: use explicit line objects with consistent stroke width and opacity.
- Background gradients or mesh effects: use raster background only when vector approximation would be misleading; otherwise use large layered translucent shapes.
- Blend modes: approximate with semi-transparent overlapping fills; keep editability where possible.
- Outline text or gradient text: use a nearby editable fallback plus a documented visual approximation; do not depend on unsupported PowerPoint effects.
- Organic blobs, trees, mosaic cells, and Memphis shapes: author as editable primitive shapes when possible.
- Complex previews: keep the deck build source-backed by the style description, not by copied preview images.

---

## Best for

- Quickly selecting a predefined visual direction for a new deck.
- Matching a user request for a modern, trendy, stylish, or visually striking PPTX.
- Teaching agents a palette, typography, and signature-element vocabulary before authoring coordinates.
- Generating diverse style directions for user choice before committing to a full deck.
