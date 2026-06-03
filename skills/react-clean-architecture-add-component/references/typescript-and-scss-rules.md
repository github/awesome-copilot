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
- Do not hardcode z-index values; use variables from `src/styles/z-index.scss`.

### Style Constraints

- Prefer Mantine first; use SCSS for gaps only.
- Do not use negative margins.
- Prefer unitless `line-height`.
- Prefer `letter-spacing` in `em`.
- When margin is needed, only `margin-top` and `margin-left` are allowed.
- Do not set `margin` or `position` on root elements.
- Keep z-index values in 50-step scale (100, 150, ...).
