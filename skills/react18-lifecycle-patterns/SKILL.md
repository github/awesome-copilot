---
name: react18-lifecycle-patterns
description: 'Provides exact before/after migration patterns for the three unsafe class component lifecycle methods - componentWillMount, componentWillReceiveProps, and componentWillUpdate - targeting React 18.3.1. Use this skill whenever a class component needs its lifecycle methods migrated, when deciding between getDerivedStateFromProps vs componentDidUpdate, when adding getSnapshotBeforeUpdate, or when fixing React 18 UNSAFE_ lifecycle warnings. Always use this skill before writing any lifecycle migration code - do not guess the pattern from memory, the decision trees here prevent the most common migration mistakes.'
---

# React 18 Lifecycle Patterns

Reference for migrating the three unsafe class component lifecycle methods to React 18.3.1 compliant patterns.

## Quick Decision Guide

Before migrating any lifecycle method, identify the **semantic category** of what the method does. Wrong category = wrong migration. The table below routes you to the correct reference file.

### componentWillMount - what does it do?

| What it does | Correct migration | Reference |
|---|---|---|
| Sets initial state (`this.setState(...)`) | Move to `constructor` | [→ componentWillMount.md](references/componentWillMount.md#case-a) |
| Runs a side effect (fetch, subscription, DOM) | Move to `componentDidMount` | [→ componentWillMount.md](references/componentWillMount.md#case-b) |
| Derives initial state from props | Move to `constructor` with props | [→ componentWillMount.md](references/componentWillMount.md#case-c) |

### componentWillReceiveProps - what does it do?

| What it does | Correct migration | Reference |
|---|---|---|
| Async side effect triggered by prop change (fetch, cancel) | `componentDidUpdate` | [→ componentWillReceiveProps.md](references/componentWillReceiveProps.md#case-a) |
| Pure state derivation from new props (no side effects) | `getDerivedStateFromProps` | [→ componentWillReceiveProps.md](references/componentWillReceiveProps.md#case-b) |

### componentWillUpdate - what does it do?

| What it does | Correct migration | Reference |
|---|---|---|
| Reads the DOM before update (scroll, size, position) | `getSnapshotBeforeUpdate` | [→ componentWillUpdate.md](references/componentWillUpdate.md#case-a) |
| Cancels requests / runs effects before update | `componentDidUpdate` with prev comparison | [→ componentWillUpdate.md](references/componentWillUpdate.md#case-b) |

---

## The UNSAFE_ Prefix Rule

**Never use `UNSAFE_componentWillMount`, `UNSAFE_componentWillReceiveProps`, or `UNSAFE_componentWillUpdate` as a permanent fix.**

Prefixing suppresses the React 18.3.1 warning but does NOT:
- Fix concurrent mode safety issues
- Prepare the codebase for React 19 (where these are removed, with or without the prefix)
- Fix the underlying semantic problem the migration is meant to address

The UNSAFE_ prefix is only appropriate as a temporary hold while scheduling the real migration sprint. Mark any UNSAFE_ prefix additions with:
```jsx
// TODO: React 19 will remove this. Migrate before React 19 upgrade.
// UNSAFE_ prefix added temporarily - replace with componentDidMount / getDerivedStateFromProps / etc.
```

---

## Reference Files

Read the full reference file for the lifecycle method you are migrating:

- **`references/componentWillMount.md`** - 3 cases with full before/after code
- **`references/componentWillReceiveProps.md`** - getDerivedStateFromProps trap warnings, full examples
- **`references/componentWillUpdate.md`** - getSnapshotBeforeUpdate + componentDidUpdate pairing

Read the relevant file before writing any migration code.
