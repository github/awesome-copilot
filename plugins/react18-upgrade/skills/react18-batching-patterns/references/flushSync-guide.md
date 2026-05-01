# flushSync Guide

## Import

```jsx
import { flushSync } from 'react-dom';
// NOT from 'react' - it lives in react-dom
```

If the file already imports from `react-dom`:

```jsx
import ReactDOM from 'react-dom';
// Add named import:
import ReactDOM, { flushSync } from 'react-dom';
```

## Syntax

```jsx
flushSync(() => {
  this.setState({ ... });
});
// After this line, the re-render has completed synchronously
```

Multiple setState calls inside one flushSync batch together into ONE synchronous render:

```jsx
flushSync(() => {
  this.setState({ step: 'loading' });
  this.setState({ progress: 0 });
  // These batch together → one render
});
```

## When to Use

✅ Use when the user must see a specific UI state BEFORE an async operation starts:

```jsx
flushSync(() => this.setState({ loading: true }));
await expensiveAsyncOperation();
```

✅ Use in multi-step progress flows where each step must visually complete before the next:

```jsx
flushSync(() => this.setState({ status: 'validating' }));
await validate();
flushSync(() => this.setState({ status: 'processing' }));
await process();
```

✅ Use in tests that must assert an intermediate UI state synchronously (avoid when possible - prefer `waitFor`).

## When NOT to Use

❌ Don't use it to "fix" a reading-this.state-after-await bug - that's Category A (refactor instead):

```jsx
// WRONG - flushSync doesn't fix this
flushSync(() => this.setState({ loading: true }));
const data = await fetchData();
if (this.state.loading) { ... } // still a race condition
```

❌ Don't use it for every setState to "be safe" - it defeats React 18 concurrent rendering:

```jsx
// WRONG - excessive flushSync
async handleClick() {
  flushSync(() => this.setState({ clicked: true }));   // unnecessary
  flushSync(() => this.setState({ processing: true })); // unnecessary
  const result = await doWork();
  flushSync(() => this.setState({ result, done: true })); // unnecessary
}
```

❌ Don't use it inside a `useEffect` or `componentDidMount` to trigger immediate state - it causes nested render cycles.

## Performance Note

`flushSync` forces a synchronous render, which blocks the browser thread until the render completes. On slow devices or complex component trees, multiple `flushSync` calls in an async method will cause visible jank. Use sparingly.

If you find yourself adding more than 2 `flushSync` calls to a single method, reconsider whether the component's state model needs redesign.
