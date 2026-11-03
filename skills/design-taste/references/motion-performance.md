# Motion Performance

Use this when animation could affect frame rate, input latency, scroll performance, or battery life.

## Critical Rules

- Animate `transform` and `opacity` by default.
- Do not continuously animate `width`, `height`, `top`, `left`, `margin`, `padding`, grid tracks, or layout position.
- Do not interleave layout reads and writes in the same frame.
- Do not drive animation from `scrollTop`, `scrollY`, or raw scroll event polling.
- Do not run `requestAnimationFrame` loops without a clear stop condition.
- Do not mix animation systems inside the same component surface when they both measure or mutate layout.
- Respect `prefers-reduced-motion`.

## Choosing The Mechanism

- CSS transitions are best for simple hover, active, opacity, and transform changes.
- CSS keyframes are fine for simple one-shot or carefully scoped loops.
- Motion/Framer Motion is useful for shared layout transitions, springs, gesture interactions, and presence transitions.
- GSAP is appropriate for isolated scrolltelling, canvas-like sequences, or complex timelines. Keep it out of ordinary form and dashboard UI unless justified.
- View Transitions are useful for route-level or large state transitions, not for interaction-heavy controls that must be interruptible.

## Measurement And FLIP

For layout-like animation:

1. Measure the first position.
2. Apply the final layout.
3. Measure the last position.
4. Invert with transform.
5. Play back to identity.

Batch all reads before writes. Never read layout repeatedly during an animation.

## Scroll

- Prefer CSS Scroll/View Timelines when available for simple scroll-linked reveals.
- Use `IntersectionObserver` for reveal-on-scroll and for pausing work when off-screen.
- Avoid scroll hijacking unless the task is explicitly a cinematic marketing experience.
- Pause looping animation, video, canvas, and expensive effects when off-screen.

## Paint, Blur, And Layers

- Paint-triggering animation is acceptable only on small, isolated elements.
- Do not animate blur continuously.
- Keep blur animation small, ideally 8px or less.
- Do not apply `backdrop-filter` or heavy `filter: blur()` to large scrolling surfaces.
- Use `will-change` only immediately before or during animation. Remove it afterward when possible.
- Avoid many large promoted layers. Layer promotion is a cost, not a free win.

## Infinite Or Ambient Motion

Use loops only when they communicate live status, loading, progress, or a deliberate brand moment.

If a loop is needed:

- Keep the animated surface small.
- Use transform/opacity.
- Pause off-screen.
- Avoid parent re-renders.
- Keep it visually subordinate to the primary task.

## Review Checklist

- Are all animated properties compositor-friendly?
- Is there any scroll polling?
- Are expensive effects fixed, tiny, or off-screen-paused?
- Is reduced motion handled?
- Can the interaction be interrupted without snapping?
- Does the animation improve comprehension or perceived speed?
