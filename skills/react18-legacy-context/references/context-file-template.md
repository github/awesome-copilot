# Context File Template

Standard template for a new context module. Copy and fill in the name.

## Template

```jsx
// src/contexts/[Name]Context.js
import React from 'react';

// ─── 1. Default Value ───────────────────────────────────────────────────────
// Shape must match what the provider will pass as `value`
// Used when a consumer renders outside any provider (edge case protection)
const defaultValue = {
  // fill in the shape
};

// ─── 2. Create Context ──────────────────────────────────────────────────────
export const [Name]Context = React.createContext(defaultValue);

// ─── 3. Display Name (for React DevTools) ───────────────────────────────────
[Name]Context.displayName = '[Name]Context';

// ─── 4. Optional: Custom Hook (strongly recommended) ────────────────────────
// Provides a clean import path and a helpful error if used outside provider
export function use[Name]() {
  const context = React.useContext([Name]Context);
  if (context === defaultValue) {
    // Only throw if defaultValue is a sentinel - skip if a real default makes sense
    // throw new Error('use[Name] must be used inside a [Name]Provider');
  }
  return context;
}
```

## Filled Example - AuthContext

```jsx
// src/contexts/AuthContext.js
import React from 'react';

const defaultValue = {
  user: null,
  isAuthenticated: false,
  login: () => Promise.resolve(),
  logout: () => {},
};

export const AuthContext = React.createContext(defaultValue);
AuthContext.displayName = 'AuthContext';

export function useAuth() {
  return React.useContext(AuthContext);
}
```

## Filled Example - ThemeContext

```jsx
// src/contexts/ThemeContext.js
import React from 'react';

const defaultValue = {
  theme: 'light',
  toggleTheme: () => {},
};

export const ThemeContext = React.createContext(defaultValue);
ThemeContext.displayName = 'ThemeContext';

export function useTheme() {
  return React.useContext(ThemeContext);
}
```

## Where to Put Context Files

```
src/
  contexts/           ← preferred: dedicated folder
    AuthContext.js
    ThemeContext.js
```

Alternative acceptable locations:

```
src/context/          ← singular is also fine
src/store/contexts/   ← if co-located with state management
```

Do NOT put context files inside a component folder - contexts are cross-cutting and shouldn't be owned by any one component.

## Provider Placement in the App

Context providers wrap the components that need access. Place as low in the tree as possible, not always at root:

```jsx
// App.js
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';

function App() {
  return (
    // Auth wraps everything - login state is needed everywhere
    <AuthProvider>
      {/* Theme wraps only the UI shell - not needed in pure data providers */}
      <ThemeProvider>
        <Router>
          <AppShell />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
```
