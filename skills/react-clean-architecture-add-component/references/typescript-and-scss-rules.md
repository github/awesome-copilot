# TypeScript and SCSS Rules Reference

This reference defines coding rules required by the `add-component` skill.

## TypeScript Rules

- Do not use `any`.
- Use `type` for props instead of `interface`.
- Explicitly annotate function return types.
- Prefer `@` alias imports and avoid deep relative imports.

## SCSS Rules

### Tokens

- Use color variables from `src/styles/theme.scss`.
- Use animation variables from `src/styles/animation.scss`.
- Define z-index tokens in `src/styles/z-index.scss` and consume those tokens in component styles.
- In component SCSS, do not hardcode z-index values (for example, avoid `z-index: 10;` and use a z-index token instead).

### Style Constraints

- Prefer Mantine or other UI libraries first; use SCSS only when complementing library styles is necessary.
- Do not use negative margins.
- Prefer unitless `line-height`.
- Prefer `letter-spacing` in `em`.
- When margin is needed, only `margin-top` and `margin-left` are allowed.
- Do not set `margin` or `position` on root elements.
- The numeric values inside `src/styles/z-index.scss` must follow a 50-step scale (100, 150, ...).
