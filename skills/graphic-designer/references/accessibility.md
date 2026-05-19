# Accessibility Checklist (WCAG 2.2 AA, Practical)

A pragmatic pass. Automated audits catch ~30% of issues; the rest needs manual review.

## Color & Contrast

- Body text against background: **≥ 4.5:1**.
- Large text (≥ 18pt or 14pt bold / ~24px or 19px bold): **≥ 3:1**.
- UI components and graphical objects (icons, form borders, focus rings): **≥ 3:1** against adjacent colors.
- **Test glass/blur surfaces against the worst-case content** that can scroll behind. Bright photos defeat dark text on glass even when the glass blur is heavy.
- Never encode information by color alone — pair with text, icon, or pattern.

## Text & Type

- Minimum body size: 16px on web, 17pt iOS, 14sp Android.
- Support OS dynamic type up to **200% zoom** with no clipping, horizontal scroll, or overlap.
- Line height ≥ 1.5 for body prose. Paragraph spacing ≥ 1.5× line height. Letter spacing ≥ 0.12× and word spacing ≥ 0.16× must remain visually acceptable when user-adjusted.
- No text in images for content. SVG with text or live HTML, always.

## Interactive Elements

- Hit target minimums: **24×24 CSS px** (WCAG 2.2 AA), with sufficient surrounding space. Practical floors: **44×44 pt** iOS, **48×48 dp** Android.
- **Focus indicator** must be visible against every background it crosses. A 2px brand-colored ring on a brand-colored section is invisible — add offset and contrasting outline.
- All hover states have a focus equivalent. All click handlers work via Enter/Space (or arrow keys, where appropriate).
- Drag-only interactions must have a non-drag fallback (WCAG 2.2 SC 2.5.7).
- Don't trap focus except in modals; always provide an escape (Esc key + close button + clicking the scrim).

## Forms

- Every input has a visible label. Placeholder is not a label.
- Errors are programmatically associated with their field (`aria-describedby`) and explain how to fix, not just what went wrong.
- Required fields marked with both text and a symbol; never asterisk-only.
- Autocomplete attributes on common fields (name, email, address, payment).
- Don't validate on blur of the first field before the user has finished typing the rest.

## Motion & Animation

- Respect `prefers-reduced-motion: reduce`. Replace motion with opacity fades or no transition; do not remove feedback entirely.
- No flashing content above 3Hz (seizure risk).
- Auto-playing motion longer than 5 seconds must be pausable.
- Parallax and scroll-jacking are accessibility hazards; provide an off switch or skip them.

## Structure & Semantics

- Heading hierarchy is meaningful and sequential (`h1` once, then `h2`, then `h3`; no skipping for size).
- Landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>`) make screen reader navigation possible.
- Lists are real lists (`<ul>`, `<ol>`), not styled divs.
- Tables for tabular data, with `<th>` and `scope`. Not for layout.
- Icons that convey meaning need an accessible name (`aria-label` or visually-hidden text). Decorative icons get `aria-hidden="true"`.

## Cognitive & Neurodivergent-Friendly

- Plain language. Sentences under ~20 words for general audiences.
- Predictable patterns — same component behaves the same way everywhere.
- Allow users to disable non-essential animation, sound, and notifications.
- Avoid time limits; if unavoidable, allow extension or pause.
- Provide undo for destructive actions instead of confirmation dialogs where possible.

## Manual Test Pass (Per Screen)

1. Tab through every interactive element. Order makes sense; focus is always visible.
2. Operate the screen with the keyboard only. Every action reachable.
3. Zoom browser to 200%. No clipping, no horizontal scroll on a 1280px viewport.
4. Toggle `prefers-reduced-motion`. Verify motion is muted but feedback persists.
5. Run a screen reader through one critical flow (VoiceOver on macOS/iOS, NVDA on Windows, TalkBack on Android). Listen for unlabeled buttons, "graphic" announcements, and reading order issues.
6. Simulate color-vision deficiency (browser devtools). No information should be lost.
7. Run automated audit (axe, Lighthouse, WAVE). Triage critical issues first.
