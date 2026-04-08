---
name: react19-source-patterns
description: Provides exact before/after migration patterns for all React 19 source code breaking changes and removed APIs. Use this skill whenever migrating source files (not test files) to React 19  forwardRef removal, defaultProps on function components, ReactDOM.render, ReactDOM.hydrate, unmountComponentAtNode, findDOMNode, legacy context, string refs, useRef() without initial value, and unnecessary React default imports. Always read this skill before writing any React 19 source migration code  do not guess patterns from memory, especially for forwardRef and getDerivedStateFromProps edge cases.
---

# React 19 Source Migration Patterns

Reference for every source-file migration required for React 19.

## Quick Reference Table

| Pattern | Action | Reference |
|---|---|---|
| `ReactDOM.render(...)` | → `createRoot().render()` | [→ api-migrations.md#root-api](references/api-migrations.md#root-api) |
| `ReactDOM.hydrate(...)` | → `hydrateRoot(...)` | [→ api-migrations.md#root-api](references/api-migrations.md#root-api) |
| `unmountComponentAtNode` | → `root.unmount()` | [→ api-migrations.md#root-api](references/api-migrations.md#root-api) |
| `ReactDOM.findDOMNode` | → direct ref | [→ api-migrations.md#finddomnode](references/api-migrations.md#finddomnode) |
| `forwardRef(...)` wrapper | → ref as direct prop | [→ api-migrations.md#forwardref](references/api-migrations.md#forwardref) |
| `Component.defaultProps = {}` | → ES6 default params | [→ api-migrations.md#defaultprops](references/api-migrations.md#defaultprops) |
| `useRef()` no arg | → `useRef(null)` | Inline fix  add `null` |
| Legacy Context | → `createContext` | [→ api-migrations.md#legacy-context](references/api-migrations.md#legacy-context) |
| String refs `this.refs.x` | → `createRef()` | [→ api-migrations.md#string-refs](references/api-migrations.md#string-refs) |
| `import React from 'react'` (unused) | Remove | Only if no `React.` usage in file |

## PropTypes Rule

Do **not** remove `.propTypes` assignments. The `prop-types` package still works as a standalone validator. React 19 only removes the built-in runtime checking from the React package  the package itself remains valid.

Add this comment above any `.propTypes` block:
```jsx
// NOTE: React 19 no longer runs propTypes validation at runtime.
// PropTypes kept for documentation and IDE tooling only.
```

## Read the Reference

For full before/after code for each migration, read **`references/api-migrations.md`**. It contains the complete patterns including edge cases for `forwardRef` with `useImperativeHandle`, `defaultProps` null vs undefined behavior, and legacy context provider/consumer cross-file migrations.
