# React Router v5 → v6 - Scope Assessment

## Why This Is a Separate Sprint

React Router v5 → v6 is a complete API rewrite. Unlike most React 18 upgrade steps which touch individual patterns, the router migration affects:

- Every `<Route>` component
- Every `<Switch>` (replaced by `<Routes>`)
- Every `useHistory()` (replaced by `useNavigate()`)
- Every `useRouteMatch()` (replaced by `useMatch()`)
- Every `<Redirect>` (replaced by `<Navigate>`)
- Nested route definitions (entirely new model)
- Route parameters access
- Query string handling

Attempting this as part of the React 18 upgrade sprint will scope-creep the migration significantly.

## Recommended Approach

### Option A - Defer Router Migration (Recommended)

Use `react-router-dom@5.3.4` with `--legacy-peer-deps` during the React 18 upgrade. This is explicitly documented as a supported workaround by the react-router team for React 18 compatibility on legacy root.

```bash
# In the React 18 dep surgeon:
npm install react-router-dom@5.3.4 --legacy-peer-deps
```

Document in package.json:

```json
"_legacyPeerDepsReason": {
  "react-router-dom@5.3.4": "Router v5→v6 migration deferred to separate sprint. React 18 peer dep mismatch only - no API incompatibility on legacy root."
}
```

Then schedule the v5 → v6 migration as its own sprint after the React 18 upgrade is stable.

### Option B - Migrate Router as Part of React 18 Sprint

Only choose this if:

- The app has minimal routing (< 10 routes, no nested routes, no complex navigation logic)
- The team has bandwidth and the sprint timeline allows it

### Scope Assessment Scan

Run this to understand the router migration scope before deciding:

```bash
echo "=== Route definitions ==="
grep -rn "<Route\|<Switch\|<Redirect" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "=== useHistory calls ==="
grep -rn "useHistory()" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "=== useRouteMatch calls ==="
grep -rn "useRouteMatch()" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "=== withRouter HOC ==="
grep -rn "withRouter" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "=== history.push / history.replace ==="
grep -rn "history\.push\|history\.replace\|history\.go" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l
```

**Decision guide:**

- Total hits < 30 → router migration is feasible in this sprint
- Total hits 30–100 → strongly recommend deferring
- Total hits > 100 → must defer - separate sprint required

## v5 → v6 API Changes Summary

| v5 | v6 | Notes |
|---|---|---|
| `<Switch>` | `<Routes>` | Direct replacement |
| `<Route path="/" component={C}>` | `<Route path="/" element={<C />}>` | element prop, not component |
| `<Route exact path="/">` | `<Route path="/">` | exact is default in v6 |
| `<Redirect to="/new">` | `<Navigate to="/new" />` | Component rename |
| `useHistory()` | `useNavigate()` | Returns a function, not an object |
| `history.push('/path')` | `navigate('/path')` | Direct call |
| `history.replace('/path')` | `navigate('/path', { replace: true })` | Options object |
| `useRouteMatch()` | `useMatch()` | Different return shape |
| `match.params` | `useParams()` | Hook instead of prop |
| Nested routes inline | Nested routes in config | Layout routes concept |
| `withRouter` HOC | `useNavigate` / `useParams` hooks | HOC removed |
