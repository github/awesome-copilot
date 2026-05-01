# Apollo Client - React 18 Compatibility Details

## Why Apollo 3.8+ is Required

Apollo Client 3.7 and below use an internal subscription model that is not compatible with React 18's concurrent rendering. In concurrent mode, React can interrupt and replay renders, which causes Apollo's store subscriptions to fire at incorrect times - producing stale data or missed updates.

Apollo 3.8 was the first version to adopt `useSyncExternalStore`, which React 18 requires for external stores to work correctly under concurrent rendering.

## Version Summary

| Apollo Version | React 18 Support | React 19 Support | Notes |
|---|---|---|---|
| < 3.7 | ❌ | ❌ | Concurrent mode data tearing |
| 3.7.x | ⚠️ | ⚠️ | Works with legacy root only (ReactDOM.render) |
| **3.8.x** | ✅ | ✅ | First fully compatible version |
| 3.9+ | ✅ | ✅ | Recommended |
| 3.11+ | ✅ | ✅ (confirmed) | Explicit React 19 testing added |

## If You're on Apollo 3.7 Using Legacy Root

If the app still uses `ReactDOM.render` (legacy root) and hasn't migrated to `createRoot` yet, Apollo 3.7 will technically work - but this means you're not getting any React 18 concurrent features (including automatic batching). This is a partial upgrade only.

As soon as `createRoot` is used, upgrade Apollo to 3.8+.

## MockedProvider in Tests - React 18

Apollo's `MockedProvider` works with React 18 but async behavior changed:

```jsx
// Old pattern - flushing with setTimeout:
await new Promise(resolve => setTimeout(resolve, 0));
wrapper.update();

// React 18 pattern - use waitFor or findBy:
await waitFor(() => {
  expect(screen.getByText('Alice')).toBeInTheDocument();
});
// OR:
expect(await screen.findByText('Alice')).toBeInTheDocument();
```

## Upgrading Apollo

```bash
npm install @apollo/client@latest graphql@latest
```

If graphql peer dep conflicts with other packages:

```bash
npm ls graphql  # check what version is being used
npm info @apollo/client peerDependencies  # check what apollo requires
```

Apollo 3.8+ supports both `graphql@15` and `graphql@16`.

## InMemoryCache - No Changes Required

`InMemoryCache` configuration is unaffected by the React 18 upgrade. No migration needed for:

- `typePolicies`
- `fragmentMatcher`
- `possibleTypes`
- Custom field policies

## useQuery / useMutation / useSubscription - No Changes

Apollo hooks are unchanged in their API. The upgrade is entirely internal to how Apollo integrates with React's rendering model.
