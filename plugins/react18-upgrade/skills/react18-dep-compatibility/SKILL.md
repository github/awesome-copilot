---
name: react18-dep-compatibility
description: 'React 18.3.1 and React 19 dependency compatibility matrix.'
---

# React Dependency Compatibility Matrix

Minimum versions required for React 18.3.1 and React 19 compatibility.

Use this skill whenever checking whether a dependency supports a target React version, resolving peer dependency conflicts, deciding whether to upgrade or use `legacy-peer-deps`, or assessing the risk of a `react-router` v5 to v6 migration.

Review this matrix before running `npm install` during a React upgrade and before accepting an npm dependency conflict resolution, especially where concurrent mode compatibility may be affected.
## Core Upgrade Targets

| Package | React 17 (current) | React 18.3.1 (min) | React 19 (min) | Notes |
|---|---|---|---|---|
| `react` | 17.x | **18.3.1** | **19.0.0** | Pin exactly to 18.3.1 for the R18 orchestra |
| `react-dom` | 17.x | **18.3.1** | **19.0.0** | Must match react version exactly |

## Testing Libraries

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `@testing-library/react` | **14.0.0** | **16.0.0** | RTL 13 uses ReactDOM.render internally - broken in R18 |
| `@testing-library/jest-dom` | **6.0.0** | **6.0.0** | v5 works but v6 has React 18 matcher updates |
| `@testing-library/user-event` | **14.0.0** | **14.0.0** | v13 is sync, v14 is async - API change required |
| `jest` | **27.x** | **27.x** | jest 27+ with jsdom 16+ for React 18 |
| `jest-environment-jsdom` | **27.x** | **27.x** | Must match jest version |

## Apollo Client

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `@apollo/client` | **3.8.0** | **3.11.0** | 3.8 adds `useSyncExternalStore` for concurrent mode |
| `graphql` | **15.x** | **16.x** | Apollo 3.8+ peer requires graphql 15 or 16 |

Read **`references/apollo-details.md`** for concurrent mode issues and MockedProvider changes.

## Emotion

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `@emotion/react` | **11.10.0** | **11.13.0** | 11.10 adds React 18 concurrent mode support |
| `@emotion/styled` | **11.10.0** | **11.13.0** | Must match @emotion/react version |
| `@emotion/cache` | **11.10.0** | **11.13.0** | If used directly |

## React Router

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `react-router-dom` | **v6.0.0** | **v6.8.0** | v5 → v6 is a breaking migration - see details below |
| `react-router-dom` v5 | 5.3.4 (workaround) | ❌ Not supported | See legacy peer deps note |

**react-router v5 → v6 is a SEPARATE migration sprint.** Read `references/router-migration.md`.

## Redux

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `react-redux` | **8.0.0** | **9.0.0** | v7 works on R18 legacy root only - breaks on concurrent mode |
| `redux` | **4.x** | **5.x** | Redux itself is framework-agnostic - react-redux version matters |
| `@reduxjs/toolkit` | **1.9.0** | **2.0.0** | RTK 1.9 tested against React 18 |

## Other Common Packages

| Package | React 18 Min | React 19 Min | Notes |
|---|---|---|---|
| `react-query` / `@tanstack/react-query` | **4.0.0** | **5.0.0** | v3 doesn't support concurrent mode |
| `react-hook-form` | **7.0.0** | **7.43.0** | v6 has concurrent mode issues |
| `formik` | **2.2.9** | **2.4.0** | v2.2.9 patched for React 18 |
| `react-select` | **5.0.0** | **5.8.0** | v4 has peer dep conflicts with R18 |
| `react-datepicker` | **4.8.0** | **6.0.0** | v4.8+ added React 18 support |
| `react-dnd` | **16.0.0** | **16.0.0** | v15 and below have R18 concurrent mode issues |
| `prop-types` | any | any | Standalone - unaffected by React version |

---

## Conflict Resolution Decision Tree

```
npm ls shows peer conflict for package X
         │
         ▼
Does package X have a version that supports React 18?
  YES → npm install X@[min-compatible-version]
  NO  ↓
         │
Is the package critical to the app?
  YES → check GitHub issues for React 18 branch/fork
      → check if maintainer has a PR open
      → last resort: --legacy-peer-deps (document why)
  NO  → consider removing the package
```

## --legacy-peer-deps Rules

Only use `--legacy-peer-deps` when:
- The package has no React 18 compatible release
- The package is actively maintained (not abandoned)
- The conflict is only a peer dep declaration mismatch (not actual API incompatibility)

**Document every `--legacy-peer-deps` usage** in a comment at the top of package.json or in a MIGRATION.md file explaining why it was necessary.
