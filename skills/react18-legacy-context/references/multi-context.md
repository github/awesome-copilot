# Multiple Legacy Contexts - Migration Reference

## Identifying Multiple Contexts

A React 16/17 codebase often has several legacy contexts used for different concerns:

```bash
# Find distinct context names used in childContextTypes
grep -rn "childContextTypes" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\."
# Each hit is a separate context to migrate
```

Common patterns in class-heavy codebases:

- **Theme context** - dark/light mode, color palette
- **Auth context** - current user, login/logout functions
- **Router context** - current route, navigation (if using older react-router)
- **Store context** - Redux store, dispatch (if using older connect patterns)
- **Locale/i18n context** - language, translation function
- **Toast/notification context** - show/hide notifications

---

## Migration Order

Migrate contexts one at a time. Each is an independent migration:

```
For each legacy context:
  1. Create src/contexts/[Name]Context.js
  2. Update the provider
  3. Update all consumers
  4. Run the app - verify no warning for this context
  5. Move to the next context
```

Do not migrate all providers first then all consumers - it leaves the app in a broken intermediate state.

---

## Multiple Contexts in the Same Provider

Some apps combined multiple contexts in one provider component:

```jsx
// Before - one provider exports multiple context values:
class AppProvider extends React.Component {
  static childContextTypes = {
    theme: PropTypes.string,
    user: PropTypes.object,
    locale: PropTypes.string,
    notifications: PropTypes.array,
  };

  getChildContext() {
    return {
      theme: this.state.theme,
      user: this.state.user,
      locale: this.state.locale,
      notifications: this.state.notifications,
    };
  }
}
```

**Migration approach - split into separate contexts:**

```jsx
// src/contexts/ThemeContext.js
export const ThemeContext = React.createContext('light');

// src/contexts/AuthContext.js
export const AuthContext = React.createContext({ user: null, login: () => {}, logout: () => {} });

// src/contexts/LocaleContext.js
export const LocaleContext = React.createContext('en');

// src/contexts/NotificationContext.js
export const NotificationContext = React.createContext([]);
```

```jsx
// AppProvider.js - now wraps with multiple providers
import { ThemeContext } from './contexts/ThemeContext';
import { AuthContext } from './contexts/AuthContext';
import { LocaleContext } from './contexts/LocaleContext';
import { NotificationContext } from './contexts/NotificationContext';

class AppProvider extends React.Component {
  render() {
    const { theme, user, locale, notifications } = this.state;
    return (
      <ThemeContext.Provider value={theme}>
        <AuthContext.Provider value={{ user, login: this.login, logout: this.logout }}>
          <LocaleContext.Provider value={locale}>
            <NotificationContext.Provider value={notifications}>
              {this.props.children}
            </NotificationContext.Provider>
          </LocaleContext.Provider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    );
  }
}
```

---

## Consumer With Multiple Contexts (Class Component)

Class components can only use ONE `static contextType`. For multiple, use `Consumer` render props or convert to a function component.

### Option A - Render Props (keep as class component)

```jsx
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

class UserPanel extends React.Component {
  render() {
    return (
      <ThemeContext.Consumer>
        {(theme) => (
          <AuthContext.Consumer>
            {({ user, logout }) => (
              <div className={`panel panel-${theme}`}>
                <span>{user?.name}</span>
                <button onClick={logout}>Sign out</button>
              </div>
            )}
          </AuthContext.Consumer>
        )}
      </ThemeContext.Consumer>
    );
  }
}
```

### Option B - Convert to Function Component (preferred)

```jsx
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';

function UserPanel() {
  const theme = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);

  return (
    <div className={`panel panel-${theme}`}>
      <span>{user?.name}</span>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

If converting to a function component is out of scope for this migration sprint - use Option A. If the class component is simple (mostly just render), Option B is worth the minor rewrite.

---

## Context File Naming Conventions

Use consistent naming across the codebase:

```
src/
  contexts/
    ThemeContext.js      → exports: ThemeContext, ThemeProvider (optional)
    AuthContext.js       → exports: AuthContext, AuthProvider (optional)
    LocaleContext.js     → exports: LocaleContext
```

Each file exports the context object. The provider can stay in its original file and just import the context.

---

## Verification After All Contexts Migrated

```bash
# Should return zero hits for legacy context patterns
echo "=== childContextTypes ==="
grep -rn "childContextTypes" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "=== contextTypes (legacy) ==="
grep -rn "^\s*static contextTypes\s*=\|contextTypes\.propTypes" src/ --include="*.js" | grep -v "\.test\." | wc -l

echo "=== getChildContext ==="
grep -rn "getChildContext" src/ --include="*.js" --include="*.jsx" | grep -v "\.test\." | wc -l

echo "All three should be 0"
```

Note: `static contextType` (singular) is the MODERN API - that's correct. Only `contextTypes` (plural) is legacy.
