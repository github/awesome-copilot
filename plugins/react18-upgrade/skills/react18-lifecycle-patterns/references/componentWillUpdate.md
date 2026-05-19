# componentWillUpdate Migration Reference

## The Core Decision

```
Does componentWillUpdate read the DOM (scroll, size, position, selection)?
  YES → getSnapshotBeforeUpdate (paired with componentDidUpdate)
  NO (side effects, request cancellation, etc.) → componentDidUpdate
```

---

## Case A - Reads DOM Before Re-render {#case-a}

The method captures a DOM measurement (scroll position, element size, cursor position) before React applies the next update, so it can be restored or adjusted after.

**Before:**

```jsx
class MessageList extends React.Component {
  componentWillUpdate(nextProps) {
    if (nextProps.messages.length > this.props.messages.length) {
      this.savedScrollHeight = this.listRef.current.scrollHeight;
      this.savedScrollTop = this.listRef.current.scrollTop;
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.messages.length < this.props.messages.length) {
      const scrollDelta = this.listRef.current.scrollHeight - this.savedScrollHeight;
      this.listRef.current.scrollTop = this.savedScrollTop + scrollDelta;
    }
  }
}
```

**After - getSnapshotBeforeUpdate + componentDidUpdate:**

```jsx
class MessageList extends React.Component {
  // Called right before DOM updates are applied - perfect timing to read DOM
  getSnapshotBeforeUpdate(prevProps, prevState) {
    if (prevProps.messages.length < this.props.messages.length) {
      return {
        scrollHeight: this.listRef.current.scrollHeight,
        scrollTop: this.listRef.current.scrollTop,
      };
    }
    return null; // Return null when snapshot is not needed
  }

  // Receives the snapshot as the third argument
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (snapshot !== null) {
      const scrollDelta = this.listRef.current.scrollHeight - snapshot.scrollHeight;
      this.listRef.current.scrollTop = snapshot.scrollTop + scrollDelta;
    }
  }
}
```

**Why this is better than componentWillUpdate:** In React 18 concurrent mode, there can be a gap between when `componentWillUpdate` runs and when the DOM actually updates. DOM reads in `componentWillUpdate` may be stale. `getSnapshotBeforeUpdate` runs synchronously right before the DOM is committed - the reads are always accurate.

**The contract:**

- Return a value from `getSnapshotBeforeUpdate` → that value becomes `snapshot` in `componentDidUpdate`
- Return `null` → `snapshot` in `componentDidUpdate` is `null`
- Always check `if (snapshot !== null)` in `componentDidUpdate`
- `getSnapshotBeforeUpdate` MUST be paired with `componentDidUpdate`

---

## Case B - Side Effects Before Update {#case-b}

The method cancels an in-flight request, clears a timer, or runs some preparatory side effect when props or state are about to change.

**Before:**

```jsx
class SearchResults extends React.Component {
  componentWillUpdate(nextProps) {
    if (nextProps.query !== this.props.query) {
      this.currentRequest?.cancel();
      this.setState({ loading: true, results: [] });
    }
  }
}
```

**After - move to componentDidUpdate (run AFTER the update):**

```jsx
class SearchResults extends React.Component {
  componentDidUpdate(prevProps) {
    if (prevProps.query !== this.props.query) {
      // Cancel the stale request
      this.currentRequest?.cancel();
      // Start the new request for the updated query
      this.setState({ loading: true, results: [] });
      this.currentRequest = searchAPI(this.props.query)
        .then(results => this.setState({ results, loading: false }));
    }
  }
}
```

**Note:** The side effect now runs AFTER the render, not before. In most cases this is correct - you want to react to the state that's actually showing, not the state that was showing. If you truly need to run something synchronously BEFORE a render, reconsider the design - that usually indicates state that should be managed differently.

---

## Both Cases in One Component

If a component had both DOM-reading AND side effects in `componentWillUpdate`:

```jsx
// Before: does both
componentWillUpdate(nextProps) {
  // DOM read
  if (isExpanding(nextProps)) {
    this.savedHeight = this.ref.current.offsetHeight;
  }
  // Side effect
  if (nextProps.query !== this.props.query) {
    this.request?.cancel();
  }
}
```

After: split into both patterns:

```jsx
// DOM read → getSnapshotBeforeUpdate
getSnapshotBeforeUpdate(prevProps, prevState) {
  if (isExpanding(this.props)) {
    return { height: this.ref.current.offsetHeight };
  }
  return null;
}

// Side effect → componentDidUpdate
componentDidUpdate(prevProps, prevState, snapshot) {
  // Handle snapshot if present
  if (snapshot !== null) { /* ... */ }

  // Handle side effect
  if (prevProps.query !== this.props.query) {
    this.request?.cancel();
    this.startNewRequest();
  }
}
```
