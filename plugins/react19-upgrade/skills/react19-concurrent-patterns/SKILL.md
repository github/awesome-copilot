---
name: react19-concurrent-patterns
description: 'Preserve React 18 concurrent patterns and adopt React 19 APIs (useTransition, useDeferredValue, Suspense, use(), useOptimistic, Actions) during migration.'
---

# React 19 Concurrent Patterns

React 19 introduced new APIs that complement the migration work. This skill covers two concerns:

1. **Preserve**  existing React 18 concurrent patterns that must not be broken during migration
2. **Adopt**  new React 19 APIs worth introducing after migration stabilizes

## Part 1  Preserve: React 18 Concurrent Patterns That Must Survive the Migration

These patterns exist in React 18 codebases and must not be accidentally removed or broken:

### createRoot  Already Migrated by the R18 Orchestra

If the R18 orchestra already ran, `ReactDOM.render` → `createRoot` is done. Verify it's correct:

```jsx
// CORRECT React 19 root (same as React 18):
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### useTransition  No Migration Needed

`useTransition` from React 18 works identically in React 19. Do not touch these patterns during migration:

```jsx
// React 18 useTransition  unchanged in React 19:
const [isPending, startTransition] = useTransition();

function handleClick() {
  startTransition(() => {
    setFilteredResults(computeExpensiveFilter(input));
  });
}
```

### useDeferredValue  No Migration Needed

```jsx
// React 18 useDeferredValue  unchanged in React 19:
const deferredQuery = useDeferredValue(query);
```

### Suspense for Code Splitting  No Migration Needed

```jsx
// React 18 Suspense with lazy  unchanged in React 19:
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyComponent />
    </Suspense>
  );
}
```

---

## Part 2  React 19 New APIs

These are worth adopting in a post-migration cleanup sprint. Do not introduce these DURING the migration  stabilize first.

For full patterns on each new API, read:
- **`references/react19-use.md`**  the `use()` hook for promises and context
- **`references/react19-actions.md`**  Actions, useActionState, useFormStatus, useOptimistic
- **`references/react19-suspense.md`**  Suspense for data fetching (the new pattern)

## Migration Safety Rules

During the React 19 migration itself, these concurrent-mode patterns must be **left completely untouched**:

```bash
# Verify nothing touched these during migration:
grep -rn "useTransition\|useDeferredValue\|Suspense\|startTransition" \
  src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
```

If the migrator touched any of these files, review the changes  the migration should only have modified React API surface (forwardRef, defaultProps, etc.), never concurrent mode logic.
