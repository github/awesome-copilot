# Single Context Migration - Complete Before/After

## Full Example: ThemeContext

This covers the most common pattern - one context with one provider and multiple consumers.

---

### Step 1 - Before State (Legacy)

**ThemeProvider.js (provider):**

```jsx
import PropTypes from 'prop-types';

class ThemeProvider extends React.Component {
  static childContextTypes = {
    theme: PropTypes.string,
    toggleTheme: PropTypes.func,
  };

  state = { theme: 'light' };

  toggleTheme = () => {
    this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  };

  getChildContext() {
    return {
      theme: this.state.theme,
      toggleTheme: this.toggleTheme,
    };
  }

  render() {
    return this.props.children;
  }
}
```

**ThemedButton.js (class consumer):**

```jsx
import PropTypes from 'prop-types';

class ThemedButton extends React.Component {
  static contextTypes = {
    theme: PropTypes.string,
    toggleTheme: PropTypes.func,
  };

  render() {
    const { theme, toggleTheme } = this.context;
    return (
      <button className={`btn btn-${theme}`} onClick={toggleTheme}>
        Toggle Theme
      </button>
    );
  }
}
```

**ThemedHeader.js (function consumer - if any):**

```jsx
// Function components couldn't use legacy context cleanly
// They had to use a class wrapper or render prop
```

---

### Step 2 - Create Context File

**src/contexts/ThemeContext.js (new file):**

```jsx
import React from 'react';

// Default value matches the shape of getChildContext() return
export const ThemeContext = React.createContext({
  theme: 'light',
  toggleTheme: () => {},
});

// Named export for the context - both provider and consumers import from here
```

---

### Step 3 - Update Provider

**ThemeProvider.js (after):**

```jsx
import React from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

class ThemeProvider extends React.Component {
  state = { theme: 'light' };

  toggleTheme = () => {
    this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  };

  render() {
    // React 19 JSX shorthand: <ThemeContext value={...}>
    // React 18: <ThemeContext.Provider value={...}>
    return (
      <ThemeContext.Provider
        value={{
          theme: this.state.theme,
          toggleTheme: this.toggleTheme,
        }}
      >
        {this.props.children}
      </ThemeContext.Provider>
    );
  }
}

export default ThemeProvider;
```

> **React 19 note:** In React 19 you can write `<ThemeContext value={...}>` directly (no `.Provider`). For React 18.3.1 use `<ThemeContext.Provider value={...}>`.

---

### Step 4 - Update Class Consumer

**ThemedButton.js (after):**

```jsx
import React from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

class ThemedButton extends React.Component {
  // singular contextType (not contextTypes)
  static contextType = ThemeContext;

  render() {
    const { theme, toggleTheme } = this.context;
    return (
      <button className={`btn btn-${theme}`} onClick={toggleTheme}>
        Toggle Theme
      </button>
    );
  }
}

export default ThemedButton;
```

**Key differences from legacy:**

- `static contextType` (singular) not `contextTypes` (plural)
- No PropTypes declaration needed
- `this.context` is the full value object (not a partial - whatever you passed to `value`)
- Only ONE context per class component via `contextType` - use `Context.Consumer` render prop for multiple

---

### Step 5 - Update Function Consumer

**ThemedHeader.js (after - now straightforward with hooks):**

```jsx
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

function ThemedHeader({ title }) {
  const { theme } = useContext(ThemeContext);
  return <h1 className={`header-${theme}`}>{title}</h1>;
}
```

---

### Step 6 - Multiple Contexts in One Class Component

If a class component consumed more than one legacy context, it gets complex. Class components can only have one `static contextType`. For multiple contexts, use the render prop form:

```jsx
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

class Dashboard extends React.Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {({ theme }) => (
          <AuthContext.Consumer>
            {({ user }) => (
              <div className={`dashboard-${theme}`}>
                Welcome, {user.name}
              </div>
            )}
          </AuthContext.Consumer>
        )}
      </ThemeContext.Consumer>
    );
  }
}
```

Or consider migrating the class component to a function component to use `useContext` cleanly.

---

### Verification Checklist

After migrating one context:

```bash
# Provider - no legacy context exports remain
grep -n "childContextTypes\|getChildContext" src/ThemeProvider.js

# Consumers - no legacy context consumption remains
grep -rn "contextTypes\s*=" src/ --include="*.js" --include="*.jsx" | grep -v "ThemeContext\|\.test\."

# this.context usage - confirm it reads from contextType not legacy
grep -rn "this\.context\." src/ --include="*.js" | grep -v "\.test\."
```

Each should return zero hits for the migrated context.
