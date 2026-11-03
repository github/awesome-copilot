# Frontend Guardrails

Use this when implementing UI code, especially React, Next.js, Tailwind, component libraries, responsive layouts, or motion.

## Dependency Discipline

- Check the project dependency file before importing third-party packages.
- Use existing icon, motion, form, state, and component libraries before adding new ones.
- If a package is missing, either use an installed alternative or explain the install command needed.
- Do not mix motion libraries in the same interaction surface.
- Do not migrate framework, styling system, or primitive library unless the user asked.

## React And Next.js

- Keep Server Components static and push interactivity into small client leaf components.
- Put `"use client"` only where state, effects, browser APIs, or animation hooks require it.
- Use local state for local UI. Reach for global state only when it removes real prop-drilling or coordinates distant surfaces.
- Avoid parent re-renders for high-frequency animation. Use motion values, refs, CSS, or isolated components.
- Clean up effects that subscribe, observe, animate, or listen.

## Tailwind And CSS

- Check Tailwind version before using version-specific syntax.
- Prefer project tokens and utilities before arbitrary values.
- Use CSS Grid for multi-column layout rather than fragile percentage math.
- Use stable constraints: `max-width`, `minmax()`, `aspect-ratio`, `clamp()`, and container-aware layouts.
- Avoid arbitrary z-index values. Use a small layer scale for nav, dropdowns, modals, toasts, tooltips.
- Do not use `transition: all`; name the intended properties.

## Viewport And Responsive

- Use dynamic viewport units for full-height sections: `100dvh`, `min-h-dvh`, or `min-h-[100dvh]`.
- Avoid `h-screen` for mobile browser chrome-sensitive layouts.
- Plan mobile order explicitly for asymmetric desktop layouts.
- Keep targets at least 24x24 CSS px or spaced apart (WCAG 2.2 AA); give primary touch actions 44x44.
- Use `overflow-x-hidden` only after fixing likely overflow sources, not as a blind patch.
- Text must fit in buttons, cards, panels, and nav items at mobile and desktop widths.

## Images And Media

- Use real, generated, or reliable image sources when imagery matters.
- Reserve dimensions with width/height or `aspect-ratio`.
- Do not rely on dark, blurred, cropped, or stock-like media when users need to inspect the object.
- Give meaningful images accurate alt text; decorative images should not be announced.

## Code Quality

- Use semantic HTML landmarks and controls.
- Remove dead comments and placeholder code.
- Keep components reviewable. Small targeted changes beat sweeping rewrites.
- Verify imports, types, responsive behavior, and interaction states after changes.
