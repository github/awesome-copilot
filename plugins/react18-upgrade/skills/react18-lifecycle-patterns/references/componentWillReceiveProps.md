# componentWillReceiveProps Migration Reference

## The Core Decision

```
Does componentWillReceiveProps trigger async work or side effects?
  YES → componentDidUpdate
  NO (pure state derivation only) → getDerivedStateFromProps
```

When in doubt: use `componentDidUpdate`. It's always safe.
`getDerivedStateFromProps` has traps (see bottom of this file) that make it the wrong choice when the logic is anything other than purely synchronous state derivation.

---

## Case A - Async Side Effects / Fetch on Prop Change {#case-a}

The method fetches data, cancels requests, updates external state, or runs any async operation when a prop changes.

**Before:**

```jsx
class UserProfile extends React.Component {
  componentWillReceiveProps(nextProps) {
    if (nextProps.userId !== this.props.userId) {
      this.setState({ loading: true, profile: null });
      fetchProfile(nextProps.userId)
        .then(profile => this.setState({ profile, loading: false }))
        .catch(err => this.setState({ error: err, loading: false }));
    }
  }
}
```

**After - componentDidUpdate:**

```jsx
class UserProfile extends React.Component {
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      // Use this.props (not nextProps - the update already happened)
      this.setState({ loading: true, profile: null });
      fetchProfile(this.props.userId)
        .then(profile => this.setState({ profile, loading: false }))
        .catch(err => this.setState({ error: err, loading: false }));
    }
  }
}
```

**Key difference:** `componentDidUpdate` receives `prevProps` - you compare `prevProps.x !== this.props.x` instead of `this.props.x !== nextProps.x`. The update has already applied.

**Cancellation pattern** (important for async):

```jsx
class UserProfile extends React.Component {
  _requestId = 0;

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      const requestId = ++this._requestId;
      this.setState({ loading: true });
      fetchProfile(this.props.userId).then(profile => {
        // Ignore stale responses if userId changed again
        if (requestId === this._requestId) {
          this.setState({ profile, loading: false });
        }
      });
    }
  }
}
```

---

## Case B - Pure State Derivation from Props {#case-b}

The method only derives state values from the new props synchronously. No async work, no side effects, no external calls.

**Before:**

```jsx
class SortedList extends React.Component {
  componentWillReceiveProps(nextProps) {
    if (nextProps.items !== this.props.items) {
      this.setState({
        sortedItems: [...nextProps.items].sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }
}
```

**After - getDerivedStateFromProps:**

```jsx
class SortedList extends React.Component {
  // Must track previous prop to detect changes
  static getDerivedStateFromProps(props, state) {
    if (props.items !== state.prevItems) {
      return {
        sortedItems: [...props.items].sort((a, b) => a.name.localeCompare(b.name)),
        prevItems: props.items, // ← always store the prop you're comparing
      };
    }
    return null; // null = no state change
  }

  constructor(props) {
    super(props);
    this.state = {
      sortedItems: [...props.items].sort((a, b) => a.name.localeCompare(b.name)),
      prevItems: props.items, // ← initialize in constructor too
    };
  }
}
```

---

## getDerivedStateFromProps - Traps and Warnings

### Trap 1: It fires on EVERY render, not just prop changes

Unlike `componentWillReceiveProps`, `getDerivedStateFromProps` is called before every render - including `setState` calls. Always compare against previous values stored in state.

```jsx
// WRONG - fires on every render, including setState triggers
static getDerivedStateFromProps(props, state) {
  return { sortedItems: sort(props.items) }; // re-sorts on every setState!
}

// CORRECT - only updates when items reference changes
static getDerivedStateFromProps(props, state) {
  if (props.items !== state.prevItems) {
    return { sortedItems: sort(props.items), prevItems: props.items };
  }
  return null;
}
```

### Trap 2: It cannot access `this`

`getDerivedStateFromProps` is a static method. No `this.props`, no `this.state`, no instance methods.

```jsx
// WRONG - no this in static method
static getDerivedStateFromProps(props, state) {
  return { value: this.computeValue(props) }; // ReferenceError
}

// CORRECT - pure function of props + state
static getDerivedStateFromProps(props, state) {
  return { value: computeValue(props) }; // standalone function
}
```

### Trap 3: Don't use it for side effects

If you need to fetch when a prop changes - use `componentDidUpdate`. `getDerivedStateFromProps` must be pure.

### When getDerivedStateFromProps is actually the wrong tool

If you find yourself doing complex logic in `getDerivedStateFromProps`, consider whether the consuming component should receive pre-processed data as a prop instead. The pattern exists for narrow use cases, not general prop-to-state syncing.
