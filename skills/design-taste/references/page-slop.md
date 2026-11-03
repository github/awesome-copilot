# Slop on pages

What makes a landing page, a marketing site or a consumer web page look generated, how to find it, and what to put instead. Each marker is common in AI output because it is the statistical average of thousands of templates. One instance is a choice; the same instance in every section is slop.

## Layout and composition

| Marker | How to find it | Instead |
|---|---|---|
| **An eyebrow pill above every heading** — a small rounded badge ("✦ Features", "NEW") over each section title | Count headings with a pill or an uppercase label right above them (`slop-scan.js` `eyebrows`) | Let the heading carry the section. Keep a kicker only where it adds a fact (a date, a version, a category the reader filters by) |
| **Every section is an island** — each block in its own rounded card with a glow or gradient border, all the same size | Squint: do all sections have the same shape and weight? | Vary the weight: the main route gets scale and air, secondary sections sit quieter on the page itself. At least one scene that isn't a centred card |
| **The template triple** — three feature cards with an icon, a two-word title and one sentence | Look for rows of three identical cards | Fewer, specific claims with proof (a screenshot, a number, a quote). If there are three things, they rarely deserve equal weight |
| **Icon on a tinted square** in every card | Small boxes with a translucent or gradient fill holding one glyph (`iconChips`) | A plain glyph, or none; colour goes to what matters |
| **Everything centred** — headings, paragraphs, buttons, cards | Count left-aligned text blocks longer than two lines | Centre only short, single-purpose blocks (a hero line, a final CTA). Long text reads left-aligned |
| **Equal weight for unequal things** — the help centre looks as important as the product | Compare the visual weight of the main route with the footer links | Weight by importance: scale, position and space, not decoration |
| **The fake proof band** — "Trusted by" with generic logos, "10,000+ teams", star ratings without a source | Every number and logo: where does it come from? | Real logos with permission, real numbers with a date, or nothing |
| **Floating UI fragments** around the hero — tilted cards, chat bubbles, toasts that aren't the product | Elements in the hero that aren't screenshots of the real product | One real screenshot or a short recording of the product doing its main job |

## Colour and type

| Marker | How to find it | Instead |
|---|---|---|
| **A gradient half in the headline** — the last words in a purple-to-pink gradient | `background-clip: text` (`slop-scan.js` `gradientText`) | One colour for the headline; emphasis by weight, size or word choice |
| **Glow under everything** — coloured shadows behind cards, buttons and screenshots | Coloured `box-shadow` with a large blur (`glows`) | Neutral, soft shadows, or none; glow, if any, on one focal element |
| **A rainbow of accents** — every section a new hue | Distinct saturated hues on the page (`hues`) | One accent, plus semantic colours where they mean something |
| **Uppercase, tracked labels everywhere** | `text-transform: uppercase` counts (`uppercase`) | Sentence case; uppercase only for short, quiet labels in dense tables or as a brand voice used consistently |
| **Too many type sizes** | Distinct font sizes in use (`fontSizes`) | A scale of five or six steps; one dominant size per view |

## Copy

- **Template triples:** "Fast. Simple. Powerful." "Create. Share. Grow." Three adjectives say nothing; one concrete claim says more.
- **The em dash in every line.** One per paragraph at most.
- **Inflated promises:** "Unlock your creative potential", "Supercharge your workflow", "Revolutionize". Say what the product does, to what, how fast.
- **Promises the product doesn't keep:** "Unlimited", "Instant", "No credit card" — check each against the product before shipping the page.
- **Raw API or model text as copy:** feature names, enum values or prompt fragments shown to users.

## Motion

- Hover: 150–250 ms, ease-out, a colour or elevation change. Not a 500 ms scale-up of every card.
- Endless motion (breathing, pulsing, floating) only for something live: a running job, a recording, a live price.
- Things animate in once, when they first appear; scrolling back up doesn't replay them.
- Video: `preload="none"` and a poster; play when visible, pause when not.

## Mobile traps

- Inputs at 16 px or more, or iOS zooms the page on focus.
- Never `user-scalable=no` or `maximum-scale=1`: it breaks pinch zoom (WCAG 1.4.4).
- Don't hide the important content in a carousel; people rarely swipe past the first card.
- Check the page at 375 px for horizontal overflow: a fixed-width element forces the whole page wider.

## Counting

`scripts/slop-scan.js` counts the markers on a rendered page. Paste it into the browser console, or run it with your browser tool, and keep the JSON:

- `accent`, `hues`, `accentRoles` — how much the main colour is used, and for what
- `uppercase`, `eyebrows` — uppercase text and labels sitting right above headings
- `gradients`, `gradientText`, `glows` — decorative gradients and coloured shadows
- `iconChips`, `pills`, `nestedCards` — tinted icon boxes, rounded badges, cards inside cards
- `fontSizes`, `radii`, `transitionAll`, `backdropFilter` — values in use

The counts are not a verdict; they point at where to look. Compare before and after a change, not against a universal threshold. A brand that is uppercase across its product and site can keep uppercase labels; a page with eleven eyebrow pills is slop.

## Not slop

- A gradient that belongs to the brand, used at section scale, at low intensity.
- An uppercase label in a dense table header.
- A dot-separated line that carries live facts ("12 min · 3 stops · €4.20").
- Glass or blur on a header that floats over scrolling content.
- One expressive hero moment, if everything around it is calm.
