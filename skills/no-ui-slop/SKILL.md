---
name: no-ui-slop
description: 'Build UI that fits the product instead of generic AI defaults. Use whenever building, restyling or reviewing screens, pages, components, flows or design systems: work from the existing design system, design every state, check the rendered result, and look up real app and website references with the optional UXKIN MCP tools when a decision needs evidence.'
license: MIT
---

# No UI slop

Interfaces made without context drift to the same look: a centered
hero with a purple-to-blue gradient, three identical feature cards,
oversized rounded corners, soft shadows everywhere and filler copy.
This skill replaces that guesswork with the product's own evidence
first, real references when they help, and a check of the rendered
result before calling the work done.

It works on its own, with no account, token or server. If the UXKIN
MCP tools are connected, it can also use:

- `find_ui_references`: real apps, screens, journeys and websites
- `find_ui_materials`: colors, typography, components and DESIGN.md
  content from real web design systems

The tools add context; they never block the task. If they are not
available, or a search returns nothing useful, carry on without them.

## 1. Understand

Before changing any UI, read what is already there: the target
components, shared styles and design tokens, instruction files such as
DESIGN.md, and the screens around the change. Name the one task the
person using the screen is trying to do, and what done looks like for
them. Keep good existing work and follow the existing design system.

If something important is missing (who the screen is for, what must
not change), ask once before building rather than guessing.

## 2. Reference

When a real example can settle a specific decision (how to lay out a
checkout, when to ask for a permission, what an empty state says),
look for one. Start inside the product: another screen that already
solves it. If UXKIN is connected, search `find_ui_references` with
plain words: product type, screen or flow, and platform, for example
"fintech onboarding identity check mobile". One or two strong matches
are enough.

References guide decisions; they are not templates. Learn the pattern,
then fit it to this product. Never copy another product's branding,
logos, illustrations or copy.

## 3. Materials

Work from one consistent set of choices: the project's existing colors,
type scale, spacing and components. Don't invent new ones per screen,
and never stack a second set of design rules on top of the existing
system.

For a new web project with no design foundation, you may suggest up to
three starting points (from `find_ui_materials` if UXKIN is connected)
and wait for the user to choose one or decline. A chosen starting point
becomes the project's DESIGN.md. Never replace an existing DESIGN.md
without asking.

## 4. Build

Make the interface feel specific to this product and make the main task
obvious and easy.

- Use a small palette with one accent color, a real type scale and
  consistent spacing steps.
- Put navigation where people expect it; make the primary action clear
  and secondary actions quieter.
- Write real, specific copy in the product's words. No lorem ipsum, no
  empty slogans, no "Submit" or "Get started" where a specific label
  fits.
- Design every state: empty or first use, loading, error with a way to
  recover, long text, many items, small screens.
- Don't invent features, data, prices or backend behavior the product
  doesn't have.
- The product's requirements, existing system, accessibility, platform
  conventions and explicit user requests always win over references.

Avoid: decorative gradients, glassmorphism and glow; grids of identical
icon-title-sentence cards; emoji as icons; fake stats or testimonials;
mixing unrelated styles on one screen.

## 5. Review

Once the UI renders, look at the real result in its environment, not
just the code. Check a phone width and a desktop width (for example
390px and 1440px) and use it by keyboard. Fix broken layouts,
regressions, contrast and focus problems (4.5:1 text contrast, visible
focus, 44px touch targets, labelled inputs), private data showing on
screen, and anything that gets in the way of the main task.

When you report back, say what you actually checked and what you
couldn't. Don't call something checked from reading the code alone.
