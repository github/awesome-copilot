# String Refs - All Migration Patterns

## Single Ref on a DOM Element {#single-ref}

The most common case - one ref to one DOM node.

```jsx
// Before:
class SearchBox extends React.Component {
  handleSearch() {
    const value = this.refs.searchInput.value;
    this.props.onSearch(value);
  }

  focusInput() {
    this.refs.searchInput.focus();
  }

  render() {
    return (
      <div>
        <input ref="searchInput" type="text" placeholder="Search..." />
        <button onClick={() => this.handleSearch()}>Search</button>
      </div>
    );
  }
}
```

```jsx
// After:
class SearchBox extends React.Component {
  searchInputRef = React.createRef();

  handleSearch() {
    const value = this.searchInputRef.current.value;
    this.props.onSearch(value);
  }

  focusInput() {
    this.searchInputRef.current.focus();
  }

  render() {
    return (
      <div>
        <input ref={this.searchInputRef} type="text" placeholder="Search..." />
        <button onClick={() => this.handleSearch()}>Search</button>
      </div>
    );
  }
}
```

---

## Multiple Refs in One Component {#multiple-refs}

Each string ref becomes its own named `createRef()` field.

```jsx
// Before:
class LoginForm extends React.Component {
  handleSubmit(e) {
    e.preventDefault();
    const email = this.refs.emailField.value;
    const password = this.refs.passwordField.value;
    this.props.onSubmit({ email, password });
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input ref="emailField" type="email" />
        <input ref="passwordField" type="password" />
        <button type="submit">Log in</button>
      </form>
    );
  }
}
```

```jsx
// After:
class LoginForm extends React.Component {
  emailFieldRef = React.createRef();
  passwordFieldRef = React.createRef();

  handleSubmit(e) {
    e.preventDefault();
    const email = this.emailFieldRef.current.value;
    const password = this.passwordFieldRef.current.value;
    this.props.onSubmit({ email, password });
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input ref={this.emailFieldRef} type="email" />
        <input ref={this.passwordFieldRef} type="password" />
        <button type="submit">Log in</button>
      </form>
    );
  }
}
```

---

## Refs in a List / Dynamic Refs {#list-refs}

String refs in a map/loop - the most tricky case. Each item needs its own ref.

```jsx
// Before:
class TabPanel extends React.Component {
  focusTab(index) {
    this.refs[`tab_${index}`].focus();
  }

  render() {
    return (
      <div>
        {this.props.tabs.map((tab, i) => (
          <button key={tab.id} ref={`tab_${i}`}>
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
}
```

```jsx
// After - use a Map to store refs dynamically:
class TabPanel extends React.Component {
  tabRefs = new Map();

  getOrCreateRef(id) {
    if (!this.tabRefs.has(id)) {
      this.tabRefs.set(id, React.createRef());
    }
    return this.tabRefs.get(id);
  }

  focusTab(index) {
    const tab = this.props.tabs[index];
    this.tabRefs.get(tab.id)?.current?.focus();
  }

  render() {
    return (
      <div>
        {this.props.tabs.map((tab) => (
          <button key={tab.id} ref={this.getOrCreateRef(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
}
```

**Alternative - callback ref for lists (simpler):**

```jsx
class TabPanel extends React.Component {
  tabRefs = {};

  focusTab(index) {
    this.tabRefs[index]?.focus();
  }

  render() {
    return (
      <div>
        {this.props.tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={el => { this.tabRefs[i] = el; }}  // callback ref stores DOM node directly
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
}
// Note: callback refs store the DOM node directly (not wrapped in .current)
// this.tabRefs[i] is the element, not this.tabRefs[i].current
```

---

## Callback Refs (Alternative to createRef) {#callback-refs}

Callback refs are an alternative to `createRef()`. They're useful for lists (above) and when you need to run code when the ref attaches/detaches.

```jsx
// Callback ref syntax:
class MyComponent extends React.Component {
  // Callback ref - called with the element when it mounts, null when it unmounts
  setInputRef = (el) => {
    this.inputEl = el; // stores the DOM node directly (no .current needed)
  };

  focusInput() {
    this.inputEl?.focus(); // direct DOM node access
  }

  render() {
    return <input ref={this.setInputRef} />;
  }
}
```

**When to use callback refs vs createRef:**

- `createRef()` - for a fixed number of refs known at component definition time (most cases)
- Callback refs - for dynamic lists, when you need to react to attach/detach, or when the ref might change

**Important:** Inline callback refs (defined in render) re-create a new function on every render, which causes the ref to be called with `null` then the element on each render cycle. Use a bound method or class field arrow function instead:

```jsx
// AVOID - new function every render, causes ref flicker:
render() {
  return <input ref={(el) => { this.inputEl = el; }} />;  // inline - bad
}

// PREFER - stable reference:
setInputRef = (el) => { this.inputEl = el; };  // class field - good
render() {
  return <input ref={this.setInputRef} />;
}
```

---

## Ref Passed to a Child Component {#forwarded-refs}

If a string ref was passed to a custom component (not a DOM element), the migration also requires updating the child.

```jsx
// Before:
class Parent extends React.Component {
  handleClick() {
    this.refs.myInput.focus(); // Parent accesses child's DOM node
  }
  render() {
    return (
      <div>
        <MyInput ref="myInput" />
        <button onClick={() => this.handleClick()}>Focus</button>
      </div>
    );
  }
}

// MyInput.js (child - class component):
class MyInput extends React.Component {
  render() {
    return <input className="my-input" />;
  }
}
```

```jsx
// After:
class Parent extends React.Component {
  myInputRef = React.createRef();

  handleClick() {
    this.myInputRef.current.focus();
  }

  render() {
    return (
      <div>
        {/* React 18: forwardRef needed. React 19: ref is a direct prop */}
        <MyInput ref={this.myInputRef} />
        <button onClick={() => this.handleClick()}>Focus</button>
      </div>
    );
  }
}

// MyInput.js (React 18 - use forwardRef):
import { forwardRef } from 'react';
const MyInput = forwardRef(function MyInput(props, ref) {
  return <input ref={ref} className="my-input" />;
});

// MyInput.js (React 19 - ref as direct prop, no forwardRef):
function MyInput({ ref, ...props }) {
  return <input ref={ref} className="my-input" />;
}
```

---
