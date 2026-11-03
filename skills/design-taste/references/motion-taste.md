# Motion Taste

Use this when designing or reviewing animation, transitions, hover states, popovers, sheets, drawers, toasts, gestures, or spring behavior.

## Decision Order

1. **Should this animate at all?** Frequent actions should feel instant. Keyboard-driven, command-palette, toolbar, and repeated navigation actions should usually skip animation or use only tiny feedback.
2. **What does the motion explain?** Good motion clarifies state, spatial origin, causality, hierarchy, or feedback. If the only reason is "it looks cool," use restraint.
3. **How often will users see it?** The more often it appears, the shorter and quieter it should be.
4. **Can it be interrupted?** Gesture-driven or reversible UI benefits from springs or state-aware animation that can reverse smoothly.
5. **Does it respect reduced motion?** Non-essential motion must have a reduced alternative.

## Timing

- Button press: 100-160ms.
- Tooltip or small popover: 125-200ms.
- Dropdown, select, tabs, toast: 150-250ms.
- Modal, drawer, sheet: 200-400ms.
- Marketing or explanatory moments can run longer, but should be rare.

UI motion should usually complete under 300ms. Longer motion needs a clear narrative or spatial purpose.

## Easing

- Entrances should start fast and settle: strong ease-out.
- Exits should be shorter than entrances, often 60-70% of the duration.
- On-screen movement or morphing can use ease-in-out or a subtle spring.
- Hover color changes can use a simple ease.
- Constant motion, progress indicators, and marquees use linear motion.

Good default curves:

```css
--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Avoid weak default easing when the animation needs polish. Avoid `ease-in` for visible UI entrances because it delays the first pixels of movement and feels sluggish.

## Details That Compound

- Buttons need immediate pressed feedback: `scale(0.97)` or a tiny translate is enough.
- Do not animate from `scale(0)`. Start near the final shape, such as `scale(0.95)` plus opacity.
- Popovers should scale from their trigger when the primitive exposes a transform origin. Modals stay centered.
- Tooltips should delay on the first hover, then appear instantly when moving across adjacent tooltip targets.
- Toasts should enter and exit from the same side so dismiss gestures make spatial sense.
- A tab indicator that slides between tabs often feels better than replacing the active style instantly.
- Avoid bounce except for playful, rare, or gesture-driven interactions. Most product UI should decelerate cleanly.

## Springs

Use springs for:

- Drag, swipe, pull, toss, and dismiss gestures.
- Shared element transitions where interruption matters.
- Small UI that should feel physically responsive.
- Decorative pointer-following effects when they are appropriate to the product.

Good starting point:

```js
{ type: "spring", duration: 0.5, bounce: 0.15 }
```

Keep bounce subtle. If the interface is operational, financial, medical, admin, or data-heavy, use even less bounce or none.

## Motion Restraint

- Do not animate everything on page load. One orchestrated reveal is better than every card performing.
- Avoid perpetual motion in productivity UI unless it communicates live status or loading.
- Avoid scroll hijacking for ordinary product pages.
- Motion should make the interface feel faster, not more theatrical.
