---
title: React 19 use() Hook Pattern Reference
---

# React 19 use() Hook Pattern Reference

The `use()` hook is React 19's answer for unwrapping promises and context within React components. It enables cleaner async patterns directly in your component body, avoiding the architectural complexity that previously required separate lazy components or complex state management.

## What is use()?

`use()` is a hook that:

- **Accepts** a promise or context object
- **Returns** the resolved value or context value
- **Handles** Suspense automatically for promises
- **Can be called conditionally** inside components (not at top level for promises)
- **Throws errors**, which Suspense + error boundary can catch

## use() with Promises

### React 18 Pattern

```jsx
// React 18 approach 1  lazy load a component module:
const UserComponent = React.lazy(() => import('./User'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserComponent />
    </Suspense>
  );
}

// React 18 approach 2  fetch data with state + useEffect:
function App({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <Spinner />;
  return <User user={user} />;
}
```

### React 19 use() Pattern

```jsx
// React 19  use() directly in component:
function App({ userId }) {
  const user = use(fetchUser(userId)); // Suspends automatically
  return <User user={user} />;
}

// Usage:
function Root() {
  return (
    <Suspense fallback={<Spinner />}>
      <App userId={123} />
    </Suspense>
  );
}
```

**Key differences:**

- `use()` unwraps the promise directly in the component body
- Suspense boundary is still needed, but can be placed at app root (not per-component)
- No state or useEffect needed for simple async data
- Conditional wrapping allowed inside components

## use() with Promises -- Conditional Fetching

```jsx
// React 18  conditional with state
function SearchResults() {
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    if (query) {
      search(query).then(setResults);
    } else {
      setResults(null);
    }
  }, [query]);
  
  if (!results) return null;
  return <Results items={results} />;
}

// React 19  use() with conditional
function SearchResults() {
  const [query, setQuery] = useState('');
  
  if (!query) return null;
  
  const results = use(search(query)); // Only fetches if query is truthy
  return <Results items={results} />;
}
```

## use() with Context

`use()` can unwrap context without being at component root. Less common than promise usage, but useful for conditional context reading:

```jsx
// React 18  always in component body, only works at top level
const theme = useContext(ThemeContext);

// React 19  can be conditional
function Button({ useSystemTheme }) {
  const theme = useSystemTheme ? use(ThemeContext) : defaultTheme;
  return <button style={theme}>Click</button>;
}
```

---

## Migration Strategy

### Phase 1  No changes required

React 19 `use()` is opt-in. All existing Suspense + component splitting patterns continue to work:

```jsx
// Keep this as-is if it's working:
const Lazy = React.lazy(() => import('./Component'));
<Suspense fallback={<Spinner />}><Lazy /></Suspense>
```

### Phase 2  Post-migration cleanup (optional)

After React 19 migration stabilizes, profile codebases for `useEffect + state` async patterns. These are good candidates for `use()` refactoring:

Identify patterns:

```bash
grep -rn "useEffect.*\(.*fetch\|async\|promise" src/ --include="*.js" --include="*.jsx"
```

Target:

- Simple fetch-on-mount patterns
- No complex dependency arrays
- Single promise per component
- Suspense already in use elsewhere in the app

Example refactor:

```jsx
// Before:
function Post({ postId }) {
  const [post, setPost] = useState(null);
  
  useEffect(() => {
    fetchPost(postId).then(setPost);
  }, [postId]);
  
  if (!post) return <Spinner />;
  return <PostContent post={post} />;
}

​// After:
function Post({ postId }) {
  const post = use(fetchPost(postId));
  return <PostContent post={post} />;
}

// And ensure Suspense at app level:
<Suspense fallback={<AppSpinner />}>
  <Post postId={123} />
</Suspense>
```

---

## Error Handling

`use()` throws errors, which Suspense error boundaries catch:

```jsx
function Root() {
  return (
    <ErrorBoundary fallback={<ErrorScreen />}>
      <Suspense fallback={<Spinner />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

function DataComponent() {
  const data = use(fetchData()); // If fetch rejects, error boundary catches it
  return <Data data={data} />;
}
```

---

## When NOT to use use()

- **Avoid during migration**  stabilize React 19 first
- **Complex dependencies**  if multiple promises or complex ordering logic, stick with `useEffect`
- **Retry logic**  `use()` doesn't handle retry; `useEffect` with state is clearer
- **Debounced updates**  `use()` refetches on every prop change; `useEffect` with cleanup is better
