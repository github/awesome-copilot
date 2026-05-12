---
title: React 19 API Migrations Reference
---

# React 19 API Migrations Reference

Complete before/after patterns for all React 19 breaking changes and removed APIs.

---

## ReactDOM Root API Migration

React 19 requires `createRoot()` or `hydrateRoot()` for all apps. If the React 18 migration already ran, this is done. Verify it's correct.

### Pattern 1: createRoot()  CSR App

```jsx
// Before (React 18 or earlier):
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// After (React 19):
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

### Pattern 2: hydrateRoot()  SSR/Static App

```jsx
// Before (React 18 server-rendered app):
import ReactDOM from 'react-dom';
ReactDOM.hydrate(<App />, document.getElementById('root'));

// After (React 19):
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

### Pattern 3: unmountComponentAtNode() Removed

```jsx
// Before (React 18):
import ReactDOM from 'react-dom';
ReactDOM.unmountComponentAtNode(container);

// After (React 19):
const root = createRoot(container); // Save the root reference
// later:
root.unmount();
```

**Caveat:** If the root reference was never saved, you must refactor to pass it around or use a global registry.

---

## findDOMNode() Removed

### Pattern 1: Direct ref

```jsx
// Before (React 18):
import { findDOMNode } from 'react-dom';
const domNode = findDOMNode(componentRef);

// After (React 19):
const domNode = componentRef.current; // refs point directly to DOM
```

### Pattern 2: Class Component ref

```jsx
// Before (React 18):
import { findDOMNode } from 'react-dom';
class MyComponent extends React.Component {
  render() {
    return <div ref={ref => this.node = ref}>Content</div>;
  }
  
  getWidth() {
    return findDOMNode(this).offsetWidth;
  }
}

// After (React 19):
// Note: findDOMNode() is removed in React 19. Eliminate the call entirely
// and use direct refs to access DOM nodes instead.
class MyComponent extends React.Component {
  nodeRef = React.createRef();
  
  render() {
    return <div ref={this.nodeRef}>Content</div>;
  }
  
  getWidth() {
    return this.nodeRef.current.offsetWidth;
  }
}
```

---

## forwardRef() - Optional Modernization

### Pattern 1: Function Component Direct ref

```jsx
// Before (React 18):
import { forwardRef } from 'react';

const Input = forwardRef((props, ref) => (
  <input ref={ref} {...props} />
));

function App() {
  const inputRef = useRef(null);
  return <Input ref={inputRef} />;
}

// After (React 19):
// Simply accept ref as a regular prop:
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

function App() {
  const inputRef = useRef(null);
  return <Input ref={inputRef} />;
}
```

### Pattern 2: forwardRef + useImperativeHandle

```jsx
// Before (React 18):
import { forwardRef, useImperativeHandle } from 'react';

const TextInput = forwardRef((props, ref) => {
  const inputRef = useRef();
  
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; }
  }));
  
  return <input ref={inputRef} {...props} />;
});

function App() {
  const textRef = useRef(null);
  return (
    <>
      <TextInput ref={textRef} />
      <button onClick={() => textRef.current.focus()}>Focus</button>
    </>
  );
}

// After (React 19):
function TextInput({ ref, ...props }) {
  const inputRef = useRef(null);
  
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; }
  }));
  
  return <input ref={inputRef} {...props} />;
}

function App() {
  const textRef = useRef(null);
  return (
    <>
      <TextInput ref={textRef} />
      <button onClick={() => textRef.current.focus()}>Focus</button>
    </>
  );
}
```

**Note:** `useImperativeHandle` is still valid; only the `forwardRef` wrapper is removed.

---

## defaultProps Removed

### Pattern 1: Function Component with defaultProps

```jsx
// Before (React 18):
function Button({ label = 'Click', disabled = false }) {
  return <button disabled={disabled}>{label}</button>;
}

// WORKS BUT is removed in React 19:
Button.defaultProps = {
  label: 'Click',
  disabled: false
};

// After (React 19):
// ES6 default params are now the ONLY way:
function Button({ label = 'Click', disabled = false }) {
  return <button disabled={disabled}>{label}</button>;
}

// Remove all defaultProps assignments
```

### Pattern 2: Class Component defaultProps

```jsx
// Before (React 18):
class Button extends React.Component {
  static defaultProps = {
    label: 'Click',
    disabled: false
  };
  
  render() {
    return <button disabled={this.props.disabled}>{this.props.label}</button>;
  }
}

// After (React 19):
// Use default params in constructor or class field:
class Button extends React.Component {
  constructor(props) {
    super(props);
    this.label = props.label || 'Click';
    this.disabled = props.disabled || false;
  }
  
  render() {
    return <button disabled={this.disabled}>{this.label}</button>;
  }
}

// Or simplify to function component with ES6 defaults:
function Button({ label = 'Click', disabled = false }) {
  return <button disabled={disabled}>{label}</button>;
}
```

### Pattern 3: defaultProps with null

```jsx
// Before (React 18):
function Component({ value }) {
  // defaultProps can set null to reset a parent-passed value
  return <div>{value}</div>;
}

Component.defaultProps = {
  value: null
};

// After (React 19):
// Use explicit null checks or nullish coalescing:
function Component({ value = null }) {
  return <div>{value}</div>;
}

// Or:
function Component({ value }) {
  return <div>{value ?? null}</div>;
}
```

---

## useRef Without Initial Value

### Pattern 1: useRef()

```jsx
// Before (React 18):
const ref = useRef(); // undefined initially

// After (React 19):
// Explicitly pass null as initial value:
const ref = useRef(null);

// Then use current:
ref.current = someElement; // Set it manually later
```

### Pattern 2: useRef with DOM Elements

```jsx
// Before:
function Component() {
  const inputRef = useRef();
  return <input ref={inputRef} />;
}

// After:
function Component() {
  const inputRef = useRef(null); // Explicit null
  return <input ref={inputRef} />;
}
```

---

## Legacy Context API Removed

### Pattern 1: React.createContext vs contextTypes

```jsx
// Before (React 18  not recommended but worked):
// Using contextTypes (old PropTypes-style context):
class MyComponent extends React.Component {
  static contextTypes = {
    theme: PropTypes.string
  };
  
  render() {
    return <div style={{ color: this.context.theme }}>Text</div>;
  }
}

// Provider using getChildContext (old API):
class App extends React.Component {
  static childContextTypes = {
    theme: PropTypes.string
  };
  
  getChildContext() {
    return { theme: 'dark' };
  }
  
  render() {
    return <MyComponent />;
  }
}

// After (React 19):
// Use createContext (modern API):
const ThemeContext = React.createContext(null);

function MyComponent() {
  const theme = useContext(ThemeContext);
  return <div style={{ color: theme }}>Text</div>;
}

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <MyComponent />
    </ThemeContext.Provider>
  );
}
```

### Pattern 2: Class Component Consuming createContext

```jsx
// Before (class component consuming old context):
class MyComponent extends React.Component {
  static contextType = ThemeContext;
  
  render() {
    return <div style={{ color: this.context }}>Text</div>;
  }
}

// After (still works in React 19):
// No change needed for static contextType
// Continue using this.context
```

**Important:** If you're still using the old `contextTypes` + `getChildContext` pattern (not modern `createContext`), you **must** migrate to `createContext`  the old pattern is completely removed.

---

## String Refs Removed

### Pattern 1: this.refs String Refs

```jsx
// Before (React 18):
class Component extends React.Component {
  render() {
    return (
      <>
        <input ref="inputRef" />
        <button onClick={() => this.refs.inputRef.focus()}>Focus</button>
      </>
    );
  }
}

// After (React 19):
class Component extends React.Component {
  inputRef = React.createRef();
  
  render() {
    return (
      <>
        <input ref={this.inputRef} />
        <button onClick={() => this.inputRef.current.focus()}>Focus</button>
      </>
    );
  }
}
```

### Pattern 2: Callback Refs (Recommended)

```jsx
// Before (React 18):
class Component extends React.Component {
  render() {
    return (
      <>
        <input ref="inputRef" />
        <button onClick={() => this.refs.inputRef.focus()}>Focus</button>
      </>
    );
  }
}

// After (React 19  callback is more flexible):
class Component extends React.Component {
  constructor(props) {
    super(props);
    this.inputRef = null;
  }
  
  render() {
    return (
      <>
        <input ref={(el) => { this.inputRef = el; }} />
        <button onClick={() => this.inputRef?.focus()}>Focus</button>
      </>
    );
  }
}
```

---

## Unused React Import Removal

### Pattern 1: React Import After JSX Transform

```jsx
// Before (React 18):
import React from 'react'; // Needed for JSX transform

function Component() {
  return <div>Text</div>;
}

// After (React 19 with new JSX transform):
// Remove the React import if it's not used:
function Component() {
  return <div>Text</div>;
}

// BUT keep it if you use React.* APIs:
import React from 'react';

function Component() {
  return <div>{React.useState ? 'yes' : 'no'}</div>;
}
```

### Scan for Unused React Imports

```bash
# Find imports that can be removed:
grep -rn "^import React from 'react';" src/ --include="*.js" --include="*.jsx"
# Then check if the file uses React.*, useContext, etc.
```

---

## Complete Migration Checklist

```bash
# 1. Find all ReactDOM.render calls:
grep -rn "ReactDOM.render" src/ --include="*.js" --include="*.jsx"
# Should be converted to createRoot

# 2. Find all ReactDOM.hydrate calls:
grep -rn "ReactDOM.hydrate" src/ --include="*.js" --include="*.jsx"
# Should be converted to hydrateRoot

# 3. Find all forwardRef usages:
grep -rn "forwardRef" src/ --include="*.js" --include="*.jsx"
# Check each one to see if it can be removed (most can)

# 4. Find all .defaultProps assignments:
grep -rn "\.defaultProps\s*=" src/ --include="*.js" --include="*.jsx"
# Replace with ES6 default params

# 5. Find all useRef() without initial value:
grep -rn "useRef()" src/ --include="*.js" --include="*.jsx"
# Add null: useRef(null)

# 6. Find old context (contextTypes):
grep -rn "contextTypes\|childContextTypes\|getChildContext" src/ --include="*.js" --include="*.jsx"
# Migrate to createContext

# 7. Find string refs (ref="name"):
grep -rn 'ref="' src/ --include="*.js" --include="*.jsx"
# Migrate to createRef or callback ref

# 8. Find unused React imports:
grep -rn "^import React from 'react';" src/ --include="*.js" --include="*.jsx"
# Check if React is used in the file
```
