# SearchD AEO Audit Report Design System

## 0. Research Log

- Embedded references: shortlisted Notion, Wired, and Claude; selected
  `minimalist-skill` + Notion for warm document structure, restrained rules,
  and evidence-first reading.
- Report concept: the independent design lane proposed “The Citation Ledger,”
  an editorial research memo organized as numbered exhibits rather than a SaaS
  dashboard.
- Layout research: the report is a normal-flow reading document, so it avoids
  app-shell navigation and gives wide tables explicit horizontal-scroll owners.
- Image concepts: omitted because the report must remain deterministic,
  data-variable, and fully legible without decorative images.

## 1. Atmosphere & Identity

The report should feel like a dated research dossier: calm, inspectable, and
more interested in evidence than performance theater. Its signature is the
evidence rail—numbered exhibits that let every headline claim resolve into
questions, sources, and run records.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Canvas | `--paper` | `#f3f0e8` | Browser and print-like page background |
| Sheet | `--sheet` | `#faf8f2` | Report surface |
| Primary text | `--ink` | `#191a18` | Headings and body |
| Secondary text | `--muted` | `#66675f` | Notes and metadata |
| Rule | `--rule` | `#c9c5b8` | Borders and table rules |
| Signal | `--signal` | `#a13f32` | SearchD emphasis and links |
| Signal surface | `--signal-soft` | `#ead7d1` | Measurement-boundary callout |
| Positive | `--positive` | `#2f6250` | Explicit named status |
| Neutral surface | `--neutral` | `#e7e3d8` | Unmeasured and secondary cells |

Color never communicates status alone; every state also has a text label.

## 3. Typography

| Level | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| Display | `clamp(2.5rem, 7vw, 5.25rem)` | 500 | 0.95 | Named rate |
| H1 | `clamp(2rem, 5vw, 3.5rem)` | 500 | 1.05 | Report title |
| H2 | `clamp(1.5rem, 3vw, 2.25rem)` | 500 | 1.15 | Exhibit title |
| H3 | `1.125rem` | 650 | 1.35 | Evidence heading |
| Body | `1rem` | 400 | 1.65 | Reading copy |
| Small | `0.875rem` | 400 | 1.5 | Captions and metadata |
| Label | `0.75rem` | 700 | 1.35 | Uppercase labels |

- Display and headings: `Georgia, "Times New Roman", serif`.
- Body and UI: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Evidence IDs and URLs: `"SFMono-Regular", Consolas, monospace`.
- Numeric tables use tabular figures.

## 4. Spacing & Layout

The base unit is 4px. Main tokens are 8, 12, 16, 24, 32, 48, 64, and 96px.

- Report maximum width: 1180px.
- Primary reading column: 760px.
- Desktop page inset: 48px.
- Mobile page inset: 20px.
- Major exhibit gap: 72px desktop and 48px mobile.
- Tables own their horizontal scrolling; the page itself must not overflow.

## 5. Components

### Report Masthead

- Structure: overline, title, scope sentence, metadata grid.
- Variants: screen and print.
- States: static.
- Accessibility: one visible H1 and semantic definition list.

### Metric Statement

- Structure: large named rate, numerator/denominator, supporting measures.
- Variants: measured and no-valid-runs.
- Accessibility: values exist as text, never chart-only.

### Boundary Callout

- Structure: label plus plain-language limitation.
- Variants: methodology and warning.
- Accessibility: border and label reinforce color.

### Exhibit

- Structure: numbered heading, explanation, table or ledger, caption.
- Variants: question, competitor, domain, evidence, action.
- Accessibility: semantic headings and table headers.

### Evidence Record

- Structure: ID, run metadata, excerpt, citations, analyst note.
- Variants: named, not named, failed.
- Accessibility: source text and analyst commentary are visually distinct.

## 6. Motion & Interaction

The report uses no decorative motion. Interactive links use a 150ms color
transition. Evidence disclosure controls rely on native `<details>` behavior
and remain expanded when printing. Reduced-motion preferences remove all
transitions.

## 7. Depth & Surface

Strategy: borders-only.

- Sheet boundary: one-pixel rule.
- Exhibits: top rules and whitespace, not cards.
- Callouts: tonal fill plus one strong left rule.
- No gradients, glass, or box shadows.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA contrast.
- Full report readable with JavaScript and external assets disabled.
- Focus outlines visible on links and disclosure controls.
- Status never depends on color alone.
- At 320px, prose does not clip; only comparison tables may scroll.
- Print stylesheet expands evidence and repeats table headers.

### Accepted Debt

None.
