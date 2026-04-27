---
title: React 19 Suspense for Data Fetching Pattern Reference
---

# React 19 Suspense for Data Fetching Pattern Reference

React 19's new Suspense integration for **data fetching** is a preview feature that allows components to suspend (pause rendering) until data is available, without `useEffect + state`.

**Important:** This is a **preview**  it requires specific setup and is not yet stable for production, but you should know the pattern for React 19 migration planning.

---

## What Changed in React 19?

React 18 Suspense only supported **code splitting** (lazy components). React 19 extends it to **data fetching** if certain conditions are met:

- **Lib usage**  the data fetching library must implement Suspense (e.g., React Query 5+, SWR, Remix loaders)
- **Or your own promise tracking**  wrap promises in a way React can track their suspension
- **No more "no hook after suspense"**  you can use Suspense directly in components with `use()`

---

## React 18 Suspense (Code Splitting Only)

```jsx
// React 18  Suspense for lazy imports only:
const LazyComponent = React.lazy(() => import('./Component'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyComponent />
    </Suspense>
  );
}
```

Trying to suspend for data in React 18 required hacks or libraries:

```jsx
// React 18 hack  not recommended:
const dataPromise = fetchData();
const resource = {
  read: () => {
    throw dataPromise; // Throw to suspend
  }
};

function Component() {
  const data = resource.read(); // Throws promise → Suspense catches it
  return <div>{data}</div>;
}
```

---

## React 19 Suspense for Data Fetching (Preview)

React 19 provides **first-class support** for Suspense with promises via the `use()` hook:

```jsx
// React 19  Suspense for data fetching:
function UserProfile({ userId }) {
  const user = use(fetchUser(userId)); // Suspends if promise pending
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userId={123} />
    </Suspense>
  );
}
```

**Key differences from React 18:**

- `use()` unwraps the promise, component suspends automatically
- No need for `useEffect + state` trick
- Cleaner code, less boilerplate

---

## Pattern 1: Simple Promise Suspense

```jsx
// Raw promise (not recommended in production):
function DataComponent() {
  const data = use(fetch('/api/data').then(r => r.json()));
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <DataComponent />
    </Suspense>
  );
}
```

**Problem:** Promise is recreated every render. Solution: wrap in `useMemo`.

---

## Pattern 2: Memoized Promise (Better)

```jsx
function DataComponent({ id }) {
  // Only create promise once per id:
  const dataPromise = useMemo(() => 
    fetch(`/api/data/${id}`).then(r => r.json()),
    [id]
  );
  
  const data = use(dataPromise);
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function App() {
  const [id, setId] = useState(1);
  
  return (
    <Suspense fallback={<Spinner />}>
      <DataComponent id={id} />
      <button onClick={() => setId(id + 1)}>Next</button>
    </Suspense>
  );
}
```

---

## Pattern 3: Library Integration (React Query)

Modern data libraries support Suspense directly. React Query 5+ example:

```jsx
// React Query 5+ with Suspense:
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  // useSuspenseQuery throws promise if suspended
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userId={123} />
    </Suspense>
  );
}
```

**Advantage:** Library handles caching, retries, and cache invalidation.

---

## Pattern 4: Error Boundary Integration

Combine Suspense with Error Boundary to handle both loading and errors:

```jsx
function UserProfile({ userId }) {
  const user = use(fetchUser(userId)); // Suspends while loading
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorScreen />}>
      <Suspense fallback={<Spinner />}>
        <UserProfile userId={123} />
      </Suspense>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component {
  state = { error: null };
  
  static getDerivedStateFromError(error) {
    return { error };
  }
  
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}
```

---

## Nested Suspense Boundaries

Use multiple Suspense boundaries to show partial UI while waiting for different data:

```jsx
function App({ userId }) {
  return (
    <div>
      <Suspense fallback={<UserSpinner />}>
        <UserProfile userId={userId} />
      </Suspense>
      
      <Suspense fallback={<PostsSpinner />}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}

function UserProfile({ userId }) {
  const user = use(fetchUser(userId));
  return <h1>{user.name}</h1>;
}

function UserPosts({ userId }) {
  const posts = use(fetchUserPosts(userId));
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

Now:

- User profile shows spinner while loading
- Posts show spinner independently
- Both can render as they complete

---

## Sequential vs Parallel Suspense

### Sequential (wait for first before fetching second)

```jsx
function App({ userId }) {
  const user = use(fetchUser(userId)); // Must complete first
  
  return (
    <Suspense fallback={<PostsSpinner />}>
      <UserPosts userId={user.id} /> {/* Depends on user */}
    </Suspense>
  );
}

function UserPosts({ userId }) {
  const posts = use(fetchUserPosts(userId));
  return <ul>{posts.map(p => <li>{p.title}</li>)}</ul>;
}
```

### Parallel (fetch both at once)

```jsx
function App({ userId }) {
  return (
    <div>
      <Suspense fallback={<UserSpinner />}>
        <UserProfile userId={userId} />
      </Suspense>
      
      <Suspense fallback={<PostsSpinner />}>
        <UserPosts userId={userId} /> {/* Fetches in parallel */}
      </Suspense>
    </div>
  );
}
```

---

## Migration Strategy for React 18 → React 19

### Phase 1  No changes required

Suspense is still optional and experimental for data fetching. All existing `useEffect + state` patterns continue to work.

### Phase 2  Wait for stability

Before adopting Suspense data fetching in production:

- Wait for React 19 to ship (not preview)
- Verify your data library supports Suspense
- Plan migration after app stabilizes on React 19 core

### Phase 3  Refactor to Suspense (optional, post-preview)

Once stable, profile candidates:

```bash
grep -rn "useEffect.*fetch\|useEffect.*axios\|useEffect.*graphql" src/ --include="*.js" --include="*.jsx"
```

```jsx
// Before (React 18):
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <Spinner />;
  return <div>{user.name}</div>;
}

// After (React 19 with Suspense):
function UserProfile({ userId }) {
  const user = use(fetchUser(userId));
  return <div>{user.name}</div>;
}

// Must be wrapped in Suspense:
<Suspense fallback={<Spinner />}>
  <UserProfile userId={123} />
</Suspense>
```

---

## Important Warnings

1. **Still Preview**  Suspense for data is marked experimental, behavior may change
2. **Performance**  promises are recreated on every render without memoization; use `useMemo`
3. **Cache**  `use()` doesn't cache; use React Query or similar for production apps
4. **SSR**  Suspense SSR support is limited; check Next.js version requirements
