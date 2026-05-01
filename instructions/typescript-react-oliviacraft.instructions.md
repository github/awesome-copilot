# Project: TypeScript + React

These are GitHub Copilot custom instructions for a TypeScript + React codebase (React 18+, strict TypeScript, Vite or Next.js, Vitest + Testing Library). When you generate or modify code, follow the rules below. They exist because the same anti-patterns keep showing up in AI-generated PRs and they are expensive to clean up later.

## Coding conventions

- TypeScript runs in strict mode. `tsconfig.json` has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. Treat any type error as a build failure, not a warning.
- Use `unknown` instead of `any`. Narrow with type guards or with a Zod schema. The only acceptable cast is `as const` for literal narrowing — never `as Foo` to silence a real type error.
- All exported functions have explicit return types. Inference is fine for internal helpers, never for module boundaries.
- Prefer `type` aliases over `interface` for object shapes. Use `interface` only when you genuinely need declaration merging.
- File and folder names are kebab-case. Component files are `PascalCase.tsx`. Hooks start with `use` and live in `src/hooks/`.
- Imports are ordered: node builtins, third-party, internal absolute (`@/...`), relative (`./...`), with a blank line between groups.
- Constant collections use `as const` so element types are literal unions, not `string[]`. Derive types via `typeof TIERS[number]`.

## React patterns to enforce

- Function components only. No class components in new code.
- Define props as a named `type ButtonProps = { ... }` above the component. Never inline `({ a, b }: { a: string; b: number })` in the signature.
- Source data from a fetcher (TanStack Query, SWR, or RSC) rather than `useEffect` + `setState`. Pure server data does not belong in component state.
- Memoize only when there is a measured render cost. `useMemo` and `useCallback` are not free; do not wrap every value.
- Keys on lists are stable IDs from the data, never the array index.
- Side effects belong in event handlers or `useEffect`, never in the render body. No mutations to props or to module-level state during render.
- Forms use a single source of truth (React Hook Form or controlled state) — never mix uncontrolled refs with controlled values on the same field.
- Context is for genuinely cross-cutting state (auth, theme). For everything else, lift state or use a store — `useContext` re-renders the entire subtree.

## Patterns to avoid

- No non-null assertions (`!`). Replace with a type guard or an explicit `throw new Error(...)` so failures are loud.
- No `useEffect` that only calls `setState` based on a prop — derive the value during render instead.
- No fetching inside `useEffect` without an abort signal; race conditions on unmount are a real bug, not a theoretical one.
- No `dangerouslySetInnerHTML` unless the content is sanitized at the boundary by `DOMPurify` or equivalent, with a comment explaining why.
- No `console.log` left behind in committed code. Use the project logger or remove the line.
- No CSS-in-JS string templates with user input — they become injection vectors the day someone forgets to escape.
- No `any` cast to bypass a third-party type. Add a `Protocol` or a narrow type guard, or open an issue against the upstream types.

## Testing requirements

- Vitest + `@testing-library/react` for components and hooks. Tests live next to the file: `Button.tsx` ships with `Button.test.tsx`.
- Query the DOM by accessible name (`getByRole`, `getByLabelText`) — never by class name or test ID unless there is no accessible alternative.
- Test behavior, not implementation. No shallow rendering. No assertions on internal hook return values when a user-visible effect exists.
- Mock at the network boundary with MSW, not by mocking the fetch wrapper. This catches real serialization bugs.
- Every component PR adds at least one test for the happy path and one for an error or empty state.
- CI runs `vitest run`, `tsc --noEmit`, and `eslint .` and fails on any warning. A green type-check is not enough — the test suite must pass.

## Accessibility and performance

- Every interactive element is reachable by keyboard. Buttons are `<button>`, links are `<a>`. No `<div onClick>` without `role`, `tabIndex`, and key handlers.
- Images have `alt` (empty string for decorative). Form inputs have associated `<label>` or `aria-label`.
- Lazy-load route-level chunks with `React.lazy` + `<Suspense>`. Do not lazy-load tiny components; the network round trip costs more than the bundle savings.
- Avoid prop drilling more than two levels deep. Lift state to a parent or use a store.
- Use `React.memo` only on components that re-render frequently with stable props. Wrapping every component costs more in shallow-compare overhead than it saves.
- Server state (fetched data) lives in TanStack Query / SWR / RSC; client state (forms, UI toggles) lives in `useState` or a store. Don't conflate them.

## Error handling

- Wrap route-level UI in an Error Boundary. Show a recovery affordance (retry, go back), never a blank screen.
- Network errors get user-visible feedback: a toast, an inline error, or a fallback UI. Never silently swallow a failed fetch.
- Form errors come from the validation library (Zod + React Hook Form). Don't roll your own message strings inline.

## Code review checklist for AI-generated PRs

- Did Copilot add `any` or a non-null assertion? Replace with `unknown` + narrowing or an explicit guard.
- Did it inline a prop type in the component signature? Extract to a named `type` above the component.
- Did it write a `useEffect` that just `setState`s from a prop? Derive during render instead.
- Did it forget the `key` on a `.map()` render or use the index? Use a stable ID.
- Did it test by querying class names or test IDs? Switch to `getByRole` / `getByLabelText`.
