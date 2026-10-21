---
name: react18-batching-patterns
description: 'Provides exact patterns for diagnosing and fixing automatic batching regressions in React 18 class components. Use this skill whenever a class component has multiple setState calls in an async method, inside setTimeout, inside a Promise .then() or .catch(), or in a native event handler. Use it before writing any flushSync call - the decision tree here prevents unnecessary flushSync overuse. Also use this skill when fixing test failures caused by intermediate state assertions that break after React 18 upgrade.'
---

# React 18 Automatic Batching Patterns

Reference for diagnosing and fixing the most dangerous silent breaking change in React 18 for class-component codebases.

## The Core Change

| Location of setState | React 17 | React 18 |
|---|---|---|
| React event handler | Batched | Batched (same) |
| setTimeout | **Immediate re-render** | **Batched** |
| Promise .then() / .catch() | **Immediate re-render** | **Batched** |
| async/await | **Immediate re-render** | **Batched** |
| Native addEventListener callback | **Immediate re-render** | **Batched** |

**Batched** means: all setState calls within that execution context flush together in a single re-render at the end. No intermediate renders occur.

## Quick Diagnosis

Read every async class method. Ask: does any code after an `await` read `this.state` to make a decision?

```
Code reads this.state after await?
  YES → Category A (silent state-read bug)
  NO, but intermediate render must be visible to user?
    YES → Category C (flushSync needed)
    NO → Category B (refactor, no flushSync)
```

For the full pattern for each category, read:
- **`references/batching-categories.md`** - Category A, B, C with full before/after code
- **`references/flushSync-guide.md`** - when to use flushSync, when NOT to, import syntax

## The flushSync Rule

**Use `flushSync` sparingly.** It forces a synchronous re-render, bypassing React 18's concurrent scheduler. Overusing it negates the performance benefits of React 18.

Only use `flushSync` when:
- The user must see an intermediate UI state before an async operation begins
- A spinner/loading state must render before a fetch starts
- Sequential UI steps have distinct visible states (progress wizard, multi-step flow)

In most cases, the fix is a **refactor** - restructuring the code to not read `this.state` after `await`. Read `references/batching-categories.md` for the correct approach per category.
