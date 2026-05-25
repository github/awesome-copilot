# nexu-io/open-design — Design Context

**Source repo:** nexu-io/open-design  
**Style reference:** Claude Design (Anthropic artifact conventions)  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`nexu-io/open-design` is the closest public approximation to the "Claude Design" artifact pattern. It structures design work through agent skill files, a `DESIGN.md` contract, direction-picker routines, sandboxed preview loops, and artifact lint gates. The central idea is that design decisions are staged through explicit handoffs rather than collapsed into one prompt.

---

## Key patterns

### Direction picker (`design-direction-picker`, `direction-picker`)
Before committing to a visual language, present 2–4 parallel directional options as lightweight thumbnails or descriptive specs. Each option has a name, palette, typographic posture, and layout personality. The user (or an automated gate) selects one, which becomes the `style_lock` for the rest of the deck.

**Agent rule:** Never start layout without a locked direction. Parallel directions should differ in at least two of: palette darkness, type scale, information density, accent geometry.

### Artifact lint (`artifact-lint`, `visual-critique`)
After every render, run a structured lint pass before delivering the artifact:
- No hardcoded hex values that escape the locked design token set
- No placeholder text surviving into final output (`Lorem ipsum`, `TBD`, `TODO`)
- No font-size below 8pt in slides
- No content bounding box that overflows the slide canvas
- Action titles present on every content slide (not descriptive titles)

### Sandbox preview (`sandbox-preview`)
Render a minimal single-slide preview of the proposed design direction before building the full deck. Use it as a visual contract to confirm color, type, and layout feel. Only proceed to full generation after preview approval.

### Design critique gate (`design-critique`)
At the end of a deck generation run, score the output against the original brief:
- Does every slide carry exactly one decision or takeaway?
- Is the visual hierarchy consistent across slides?
- Are all data exhibits editable (not screenshots)?
- Is the action title parallel in grammatical structure across slides?

---

## Design token conventions (from DESIGN.md)

| Token | Role |
|---|---|
| `--color-bg` | Slide background |
| `--color-surface` | Card and panel fill |
| `--color-accent` | Primary interactive / emphasis color |
| `--color-text` | Body text |
| `--color-muted` | Kicker, caption, secondary text |
| `--font-display` | Title typeface |
| `--font-body` | Body copy typeface |
| `--radius-card` | Corner radius for cards and panels |

---

## Agent-level lessons for pptify

1. **Direction picker before deck plan.** Present explicit visual direction options before full slide authoring; only after user selection, proceed to the full coordinate plan.
2. **Style lock is a first-class artefact.** The `style_lock` JSON block (with `background`, `primary`, `secondary`, `tertiary`, `font`) should be emitted and confirmed before any `DeckBuilder.build()` call.
3. **Artifact lint is mandatory.** Run pptify render and audit checks after every build; treat collisions, overflows, or unexpected warnings as blocking failures.
4. **Preview before full deck.** Generate a 2–3 slide cover+section preview to confirm visual direction before rendering all slides.

---

## Best for

- Reasoning about deck design direction before committing to a palette
- Structuring parallel design options for human or automated selection
- Running structured lint and critique gates on generated decks
- Claude-native artifact workflows with explicit handoffs
