# Component Architecture Reference

This reference defines classification, file layout, and dependency direction in `src/components`.

## Classification

- Place all components under `src/components`.
- Use only two categories:
  - `ui`: render-only, stateless components.
  - `features`: components that include logic.

## Reclassification Rule

If the user requests `ui` but the implementation contains any of the following, treat it as `features` and ask for confirmation before creating files:

- `useState`, `useReducer`, or `useEffect`.
- Async behavior (API calls, timers, subscriptions).
- Reading from or writing to context/store.
- Business/data transformation logic.

Ask using these options:

- `Create as features`
- `Keep ui and move logic/state to parent or features`

## Implementation Rules

### ui

- Keep components stateless.
- Accept data and callbacks via props.
- Do not add side effects or data fetching.
- Prefer primitives from Mantine or other UI libraries first; use custom JSX/SCSS only when needed.

### features

- Use the Container/Presentation pattern.
- Container handles state, side effects, data, and event orchestration.
- Presentation receives props and handles rendering only.
- Keep logic in `use<ComponentName>.tsx`.

## Dependency Direction

- `features` -> `ui`: allowed.
- `ui` -> `features`: forbidden.

## File Structure

### ui

- `index.tsx`
- `index.stories.tsx`
- `index.module.scss`

### features

- `index.tsx`
- `use<ComponentName>.tsx`
- `presentation.tsx`
- `types.ts`
- `presentation.stories.tsx`
- `presentation.module.scss`

## Storybook Minimum

- Always create `Default`.
- Add state-specific stories only when distinct states exist.
- Prefer story sets based on behavior:
  - Interactive controls: `Hover`.
  - Input-like: `Focus`, `Error`, `Disabled`.
  - Layout/open-close: `Open`, `Closed`, `Empty`.
