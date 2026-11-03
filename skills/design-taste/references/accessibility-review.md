# Accessibility Review

Use this when working on interactive UI, forms, dialogs, menus, tabs, dropdowns, focus states, icon-only controls, hidden content, or screen reader behavior.

## Priority Order

1. Accessible names.
2. Keyboard access.
3. Focus management.
4. Semantics.
5. Forms and errors.
6. Announcements.
7. Contrast and state clarity.
8. Media and motion.

## Accessible Names

- Every interactive control needs an accessible name.
- Icon-only buttons need `aria-label` or `aria-labelledby`.
- Inputs, selects, and textareas need visible labels or programmatic labels.
- Links need meaningful text. Avoid "click here".
- Decorative icons should be hidden from assistive tech.
- Meaningful images need accurate alt text. Decorative images use empty alt text.

## Keyboard Access

- Use native `button`, `a`, `input`, `select`, and `textarea` before role-based workarounds.
- Every interactive element must be reachable by keyboard.
- Focus must be visible for keyboard users.
- Do not use `tabindex` greater than 0.
- Escape should close dialogs, menus, popovers, and overlays when applicable.
- Hover-only content needs a keyboard path.

## Focus And Dialogs

- Modals must trap focus while open.
- Restore focus to the trigger on close.
- Set an intentional initial focus inside dialogs.
- Opening a dialog should not unexpectedly scroll the page.
- Route or major view changes should move focus to the main content area when appropriate.

## Semantics

- Use landmarks: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`.
- Do not skip heading levels for visual styling.
- Lists should use `ul`/`ol` with `li`.
- Data tables need table semantics and header cells.
- Do not add ARIA when native semantics already solve the problem.

## Forms And Errors

- Place errors next to the field.
- Link error text with `aria-describedby`.
- Set `aria-invalid` when a field is invalid.
- Required fields should be announced.
- Helper text should be associated with the input.
- Disabled submit actions should explain what is missing.
- After submit failure, focus the first invalid field or provide an error summary.

## Announcements

- Critical form errors should use `aria-live` or `role="alert"`.
- Loading regions can use `aria-busy` or visible status text.
- Toasts should not be the only way to communicate critical information.
- Expandable controls need `aria-expanded` and, when applicable, `aria-controls`.

## Contrast And States

- Normal text needs at least 4.5:1 contrast. Large text (24 px, or 18.7 px bold) needs 3:1.
- Icons, input borders and focus indicators that carry meaning need 3:1 against what's next to them.
- Disabled controls, decorative text and logos are exempt. A disabled control still explains why it's disabled.
- Measure each text style on each surface it appears on: hover backgrounds, tinted rows, cards on cards.

## Targets

- WCAG 2.2 AA (2.5.8): at least 24×24 CSS px, or enough spacing that a 24 px circle centred on each target doesn't touch another. Inline links in text are exempt.
- 44×44 is Apple's HIG and WCAG AAA (2.5.5): use it for primary actions on touch screens, not as a rule for every icon in a dense tool.
- Don't report a 20 px icon button with room around it as an AA failure; report it as a touch comfort issue if the screen is touch-first.
- Focus, hover, selected, disabled, loading, and error states must be distinguishable.
- Do not communicate state by color alone.
- Never remove focus outlines without an equally visible replacement.

## Motion And Media

- Respect `prefers-reduced-motion`.
- Avoid autoplaying media with sound.
- Video with speech should provide captions when relevant.
- Do not rely on motion alone to convey information.

## Tool Boundaries

Prefer minimal targeted fixes. Do not refactor unrelated UI or migrate primitive libraries unless the user asked for that.
