# componentWillMount Migration Reference

## Case A - Initializes State {#case-a}

The method only calls `this.setState()` with static or computed values that do not depend on async operations.

**Before:**

```jsx
class UserList extends React.Component {
  componentWillMount() {
    this.setState({ items: [], loading: false, page: 1 });
  }
  render() { ... }
}
```

**After - move to constructor:**

```jsx
class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], loading: false, page: 1 };
  }
  render() { ... }
}
```

**If constructor already exists**, merge the state:

```jsx
class UserList extends React.Component {
  constructor(props) {
    super(props);
    // Existing state merged with componentWillMount state:
    this.state = {
      ...this.existingState,  // whatever was already here
      items: [],
      loading: false,
      page: 1,
    };
  }
}
```

---

## Case B - Runs a Side Effect {#case-b}

The method fetches data, sets up subscriptions, interacts with external APIs, or touches the DOM.

**Before:**

```jsx
class UserDashboard extends React.Component {
  componentWillMount() {
    this.subscription = this.props.eventBus.subscribe(this.handleEvent);
    fetch(`/api/users/${this.props.userId}`)
      .then(r => r.json())
      .then(user => this.setState({ user, loading: false }));
    this.setState({ loading: true });
  }
}
```

**After - move to componentDidMount:**

```jsx
class UserDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true, user: null }; // initial state here
  }

  componentDidMount() {
    // All side effects move here - runs after first render
    this.subscription = this.props.eventBus.subscribe(this.handleEvent);
    fetch(`/api/users/${this.props.userId}`)
      .then(r => r.json())
      .then(user => this.setState({ user, loading: false }));
  }

  componentWillUnmount() {
    // Always pair subscriptions with cleanup
    this.subscription?.unsubscribe();
  }
}
```

**Why this is safe:** In React 18 concurrent mode, `componentWillMount` can be called multiple times before mounting. Side effects inside it can fire multiple times. `componentDidMount` is guaranteed to fire exactly once after mount.

---

## Case C - Derives Initial State from Props {#case-c}

The method reads `this.props` to compute an initial state value.

**Before:**

```jsx
class PriceDisplay extends React.Component {
  componentWillMount() {
    this.setState({
      formattedPrice: `$${this.props.price.toFixed(2)}`,
      isDiscount: this.props.price < this.props.originalPrice,
    });
  }
}
```

**After - constructor with props:**

```jsx
class PriceDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formattedPrice: `$${props.price.toFixed(2)}`,
      isDiscount: props.price < props.originalPrice,
    };
  }
}
```

**Note:** If this initial state needs to UPDATE when props change later, that's a `getDerivedStateFromProps` case - see `componentWillReceiveProps.md` Case B.

---

## Multiple Patterns in One Method

If a single `componentWillMount` does both state init AND side effects:

```jsx
// Mixed - state init + fetch
componentWillMount() {
  this.setState({ loading: true, items: [] });              // Case A
  fetch('/api/items').then(r => r.json())                   // Case B
    .then(items => this.setState({ items, loading: false }));
}
```

Split them:

```jsx
constructor(props) {
  super(props);
  this.state = { loading: true, items: [] }; // Case A → constructor
}

componentDidMount() {
  fetch('/api/items').then(r => r.json())    // Case B → componentDidMount
    .then(items => this.setState({ items, loading: false }));
}
```
