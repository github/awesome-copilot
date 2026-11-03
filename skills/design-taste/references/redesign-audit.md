# Redesign Audit

Use this when improving an existing UI. Work with the current stack and design system. Do not rewrite from scratch unless the user asks.

## Workflow

1. **Scan:** Identify framework, styling method, component library, tokens, current layout patterns, and interaction primitives.
2. **Diagnose:** Find weak hierarchy, generic patterns, missing states, accessibility issues, and implementation risks.
3. **Fix:** Apply focused upgrades with the existing stack.
4. **Verify:** Check responsive behavior, states, contrast, and no broken imports.

## Typography

Look for:

- Browser defaults or a generic font used where personality matters.
- Headings with no presence or poor line breaks.
- Body text wider than 65-75 characters.
- Only 400 and 700 weights, with no subtle hierarchy.
- Proportional figures in dense data UI.
- All-caps labels everywhere.
- Orphaned words in headings.

Better:

- Respect project fonts if they are established.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs where supported.
- Use tabular figures for metrics, prices, timers, tables, and dashboards.
- Use type scale contrast intentionally: one dominant element, not many.

## Color And Surfaces

Look for:

- Pure black or pure white where a slightly tinted neutral would feel better.
- Oversaturated accents.
- More than one accent color competing in the same view.
- Warm and cool grays mixed accidentally.
- Purple/blue AI-gradient aesthetics.
- Generic black shadows at low opacity.
- Sudden dark sections inside otherwise light pages.
- Flat sections that feel empty because hierarchy or content is weak.

Better:

- One coherent neutral family.
- One accent per view unless semantics require more.
- Tinted shadows that match the environment.
- Subtle texture, image, or atmospheric depth only when it supports the content.
- Gradients at section scale, not on text or controls.

## Layout

Look for:

- Everything centered and symmetrical.
- Generic three equal feature cards.
- `height: 100vh` full-screen sections that break mobile browser chrome.
- Complex flexbox percentage math.
- Missing max-width constraints.
- Forced equal-height cards with uneven content.
- Uniform radii everywhere.
- Awkward gaps or baselines in side-by-side elements.
- Dashboard layouts that default to a left sidebar without considering workflow.

Better:

- `min-height: 100dvh` or `min-h-dvh` for viewport-height sections.
- CSS Grid for real multi-column structures.
- Optical alignment for icons, button text, and visual centers.
- Mobile collapse planned explicitly.
- Cards only where containment helps.

## Interaction And States

Look for:

- No hover, active, focus, loading, empty, or error states.
- Generic circular spinners where skeletons would match the layout.
- `window.alert()` for errors.
- Buttons linked to `#`.
- No active navigation state.
- Instant state changes that feel broken.
- Layout-triggering animation.

Better:

- Pressed feedback on buttons and tappable surfaces.
- Skeletons that match final content dimensions.
- Helpful empty states with one clear next action.
- Inline, actionable errors.
- Active navigation visible enough to scan.
- Transform/opacity animation.

## Content And Data

Look for:

- Generic names: John Doe, Jane Smith, Acme, Nexus, SmartFlow.
- Fake-perfect numbers: `99.99%`, `50%`, `$100.00`.
- AI copy cliches: Elevate, Seamless, Unleash, Next-Gen, Game-changer, Delve, Tapestry.
- Lorem ipsum.
- All dates identical.
- Same avatar reused for multiple people.
- Title Case on every heading.

Better:

- Specific, believable names and examples.
- Organic values: `47.2%`, `$99.00`, realistic phone numbers, varied dates.
- Plain verbs and concrete product language.
- Sentence case unless the brand system says otherwise.

## Component Patterns

Look for:

- Border + shadow + white background on every card.
- One filled button plus one ghost button on every section.
- Generic pill badges.
- FAQ accordions for everything.
- Three testimonial cards with dots.
- Modals for simple inline edits.
- Avatar circles everywhere.
- Footer link farms.

Better:

- Use spacing, dividers, and typography before adding containers.
- Use tertiary text links where actions are not peers.
- Use inline editing, slide-overs, or expansion before modals.
- Make navigation and footer match actual user paths.

## Code Quality

Look for:

- Div soup instead of semantic HTML.
- Inline styles mixed into a styled system.
- Hardcoded fixed widths where responsive constraints are needed.
- Missing alt text.
- Arbitrary z-index values.
- Commented-out dead code.
- Import hallucinations.
- Missing title, description, and social metadata on pages where sharing matters.

## Fix Priority

1. Clarify hierarchy.
2. Clean color palette and accents.
3. Add missing interaction states.
4. Fix layout, spacing, max-width, and responsive behavior.
5. Replace generic component patterns.
6. Add loading, empty, and error states.
7. Polish type, alignment, and micro-details.
