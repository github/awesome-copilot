# Component Architecture Reference

This reference defines classification, file layout, and dependency direction in `src/components`.

## Design Intent and Principles

The goal of this skill is not only to add React components, but to apply the Container/Presentation pattern consistently with clear separation of responsibilities and dependency direction.

This reference does not define full application-wide architecture. It focuses on design quality at the component boundary.

- Separate rendering responsibilities from logic responsibilities.
- Do not place state management, side effects, or business decisions in the presentation layer.
- Avoid mixing responsibilities across boundaries and keep dependency direction explicit.

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

## Layer Responsibilities

This skill defines layers in two stages.

### 1. Component Type Layer

| Type       | Responsibility                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `ui`       | Reusable render-only component. Must not include business logic, side effects, or state management.    |
| `features` | Use-case-oriented component. Handles state transitions, event interpretation, and async orchestration. |

### 2. Internal Layer in `features`

| Layer          | Responsibility                                                                      | Primary files                                                              |
| -------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `container`    | Handles state management, side effects, event handling, and data fetching.          | `index.tsx`, `use<ComponentName>.tsx`, `types.ts`                          |
| `presentation` | Receives props and renders UI only. Must not perform external I/O or state updates. | `presentation.tsx`, `presentation.module.scss`, `presentation.stories.tsx` |

Notes:

- `ui` is composed of presentation only.
- `features` must separate container and presentation.

## Implementation Rules

### ui

- Keep components stateless.
- Accept data and callbacks via props.
- Do not add side effects or data fetching.
- Prefer primitives from Mantine or other UI libraries first; use custom JSX/SCSS only when needed.

### features

- Use the Container/Presentation pattern.
- Keep logic in `use<ComponentName>.tsx`.
- Follow `Container/Presentation Separation Rules (Anti-patterns and Decision Examples)` below for detailed responsibility boundaries and anti-patterns.

### Container/Presentation Separation Rules (Anti-patterns and Decision Examples)

Principles:

- Container is responsible for state management, side effects, event interpretation, and async processing.
- Presentation is responsible only for rendering from received props.
- Keep business decisions and data transformation in container-side code, not in presentation.

Placement rules:

- Place in container: `useState` / `useReducer` / `useEffect`, API calls, context/store read-write, business rule application.
- Place in presentation: JSX rendering and display-only branching (for example: empty, loading, error views).
- Use `types.ts` to define I/O contracts between container and presentation.

Anti-patterns:

- Calling APIs or mutations from presentation.
- Updating context/store directly from presentation.
- Implementing business decisions (authorization checks, state transition decisions, data shaping) in presentation.
- Splitting files formally while keeping practical logic in presentation.

Good / Bad examples:

- Bad: `presentation.tsx` fetches data and manages loading state directly.
- Good: `use<ComponentName>.tsx` manages data fetching and state, and `presentation.tsx` renders only from props such as `isLoading`, `items`, and `onAction`.

## Dependency Direction

- `features` -> `ui`: allowed.
- `ui` -> `features`: forbidden.

## File Structure

### ui

- `index.tsx`
- `presentation.tsx`
- `presentation.stories.tsx`
- `presentation.module.scss`

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
