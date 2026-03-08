# Adding JavaScript to HTML

Complete guide to integrating JavaScript with HTML for interactivity and dynamic behavior.

## Methods of Adding JavaScript

### 1. External JavaScript File (Recommended)

**Best for**: Production websites, reusable code, maintainable applications

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
</head>
<body>
  <h1 id="heading">Hello World</h1>
  <button id="changeBtn">Change Text</button>
  
  <!-- Script at end of body -->
  <script src="script.js"></script>
</body>
</html>
```

**script.js**:
```javascript
document.getElementById('changeBtn').addEventListener('click', function() {
  document.getElementById('heading').textContent = 'Hello JavaScript!';
});
```

**Advantages**:
- ✅ Separates content from behavior
- ✅ Reusable across multiple pages
- ✅ Cached by browser (faster page loads)
- ✅ Easier to maintain and debug
- ✅ Can be developed separately
- ✅ Cleaner HTML

### 2. Inline JavaScript

**Best for**: Small scripts, event handlers, quick testing

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inline JavaScript</title>
</head>
<body>
  <h1 id="heading">Hello World</h1>
  
  <button onclick="changeText()">Change Text</button>
  <button onclick="alert('Button clicked!')">Show Alert</button>
  
  <script>
    function changeText() {
      document.getElementById('heading').textContent = 'Text Changed!';
    }
  </script>
</body>
</html>
```

**Advantages**:
- ✅ Quick to implement
- ✅ No external HTTP request
- ✅ Good for small, page-specific scripts

**Disadvantages**:
- ❌ Not reusable across pages
- ❌ Harder to maintain
- ❌ Violates Content Security Policy (CSP)
- ❌ Mixes content and behavior

### 3. Inline Event Handlers

**Best for**: Quick prototypes, simple interactions (not recommended for production)

```html
<!-- Inline onclick -->
<button onclick="alert('Clicked!')">Click Me</button>

<!-- Inline with parameters -->
<button onclick="greet('John')">Greet John</button>

<script>
  function greet(name) {
    alert('Hello, ' + name + '!');
  }
</script>

<!-- Multiple statements (avoid) -->
<button onclick="console.log('Log'); alert('Alert');">Click</button>
```

**Better approach** (external event listeners):
```html
<button id="myButton">Click Me</button>

<script>
  document.getElementById('myButton').addEventListener('click', function() {
    alert('Clicked!');
  });
</script>
```

## Script Element Attributes

### Basic Script Element

```html
<script src="script.js"></script>
```

### Important Attributes

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `src` | External file path | URL or relative path |
| `type` | MIME type | `text/javascript` (default), `module` |
| `async` | Async loading | Boolean (no value needed) |
| `defer` | Deferred loading | Boolean (no value needed) |
| `crossorigin` | CORS mode | `anonymous`, `use-credentials` |
| `integrity` | SRI hash | Hash for security verification |
| `nomodule` | Fallback for old browsers | Boolean |
| `referrerpolicy` | Referrer header | `no-referrer`, `origin`, etc. |

## Script Loading Strategies

### 1. Default Loading (Blocking)

```html
<head>
  <script src="script.js"></script>
  <!-- Blocks HTML parsing and rendering -->
</head>
```

**Behavior**:
- Stops HTML parsing
- Downloads script
- Executes script immediately
- Resumes HTML parsing

**When to use**: Never (use `defer` or `async` instead)

### 2. Defer Loading (Recommended for Most Scripts)

```html
<head>
  <script src="script.js" defer></script>
  <!-- HTML parsing continues -->
</head>
```

**Behavior**:
1. HTML parsing continues
2. Script downloads in parallel
3. Script executes after HTML parsing completes
4. Maintains script order

**When to use**:
- ✅ Scripts that manipulate DOM
- ✅ Scripts that depend on full HTML
- ✅ Multiple scripts with dependencies
- ✅ Most common use case

### 3. Async Loading

```html
<head>
  <script src="analytics.js" async></script>
  <!-- HTML parsing continues -->
</head>
```

**Behavior**:
1. HTML parsing continues
2. Script downloads in parallel
3. Script executes as soon as downloaded (pauses HTML parsing)
4. Does NOT maintain script order

**When to use**:
- ✅ Independent scripts (analytics, ads)
- ✅ Scripts that don't depend on DOM
- ✅ Scripts that don't depend on other scripts
- ❌ NOT for scripts with dependencies

### 4. Script at End of Body (Traditional)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Page Title</title>
</head>
<body>
  <h1>Content</h1>
  <p>More content</p>
  
  <!-- Scripts at end -->
  <script src="script.js"></script>
</body>
</html>
```

**When to use**:
- ✅ When `defer` is not available
- ✅ Ensures DOM is fully loaded
- ❌ Less efficient than `defer` in `<head>`

### Comparison Table

| Method | Parsing | Download | Execution | Order | Use Case |
|--------|---------|----------|-----------|-------|----------|
| Default | Blocks | Immediate | Immediate | Yes | ❌ Avoid |
| `defer` | Continues | Parallel | After parse | Yes | ✅ DOM manipulation |
| `async` | Continues | Parallel | ASAP | No | ✅ Independent scripts |
| End of body | Continues | After parse | Immediate | Yes | ✅ Fallback method |

## ES6 Modules

### Module Script

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ES6 Modules</title>
</head>
<body>
  <div id="app"></div>
  
  <!-- ES6 module (automatically deferred) -->
  <script type="module" src="main.js"></script>
</body>
</html>
```

**main.js**:
```javascript
import { greet } from './utils.js';
import { render } from './render.js';

greet('World');
render();
```

**utils.js**:
```javascript
export function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

### Module Features

```html
<!-- Import module -->
<script type="module" src="app.js"></script>

<!-- Inline module -->
<script type="module">
  import { func } from './module.js';
  func();
</script>

<!-- Fallback for old browsers -->
<script type="module" src="modern.js"></script>
<script nomodule src="legacy.js"></script>
```

**Module characteristics**:
- ✅ Automatically in strict mode
- ✅ Automatically deferred
- ✅ Have their own scope (not global)
- ✅ Can use `import` and `export`
- ✅ Only execute once (even if imported multiple times)

## JavaScript Placement Best Practices

### In `<head>` with `defer`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
  
  <!-- Recommended: defer in head -->
  <script src="main.js" defer></script>
  <script src="utils.js" defer></script>
</head>
<body>
  <h1>Content loads without blocking</h1>
</body>
</html>
```

### Multiple Scripts with Dependencies

```html
<head>
  <!-- Load in order (with defer) -->
  <script src="jquery.min.js" defer></script>
  <script src="plugin.js" defer></script>
  <script src="app.js" defer></script>
</head>
```

### Critical vs Non-Critical Scripts

```html
<head>
  <!-- Critical: defer -->
  <script src="critical.js" defer></script>
  
  <!-- Non-critical: async -->
  <script src="analytics.js" async></script>
  <script src="ads.js" async></script>
</head>
```

## Data Attributes for JavaScript

### Storing Data in HTML

```html
<button 
  id="userBtn" 
  data-user-id="12345" 
  data-user-name="John Doe"
  data-user-role="admin">
  View Profile
</button>

<script>
  const btn = document.getElementById('userBtn');
  
  // Access dataset
  console.log(btn.dataset.userId);    // "12345"
  console.log(btn.dataset.userName);  // "John Doe"
  console.log(btn.dataset.userRole);  // "admin"
  
  // Modify dataset
  btn.dataset.userId = '67890';
</script>
```

### Complex Data

```html
<div id="config" data-settings='{"theme":"dark","lang":"en"}'></div>

<script>
  const config = document.getElementById('config');
  const settings = JSON.parse(config.dataset.settings);
  console.log(settings.theme); // "dark"
</script>
```

## Common Integration Patterns

### 1. DOM Content Loaded

Wait for HTML to fully load:

```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // DOM is ready
    console.log('DOM loaded');
    
    const heading = document.getElementById('heading');
    heading.textContent = 'DOM is ready!';
  });
</script>
```

### 2. Window Load Event

Wait for everything (including images):

```html
<script>
  window.addEventListener('load', function() {
    // All resources loaded
    console.log('Page fully loaded');
  });
</script>
```

### 3. Event Delegation

```html
<ul id="list">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

<script>
  // Event delegation on parent
  document.getElementById('list').addEventListener('click', function(e) {
    if (e.target.tagName === 'LI') {
      console.log('Clicked:', e.target.textContent);
    }
  });
</script>
```

### 4. Form Handling

```html
<form id="myForm">
  <input type="text" id="name" name="name" required>
  <input type="email" id="email" name="email" required>
  <button type="submit">Submit</button>
</form>

<script>
  document.getElementById('myForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent default form submission
    
    const formData = new FormData(this);
    const name = formData.get('name');
    const email = formData.get('email');
    
    console.log('Name:', name);
    console.log('Email:', email);
    
    // Send data via AJAX
    // fetch('/api/submit', { method: 'POST', body: formData });
  });
</script>
```

## CDN Integration

### Popular Libraries

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CDN JavaScript</title>
</head>
<body>
  <div id="app"></div>
  
  <!-- jQuery -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" 
          integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" 
          crossorigin="anonymous"></script>
  
  <!-- React -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Vue.js -->
  <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
  
  <!-- Custom script (load after libraries) -->
  <script src="app.js"></script>
</body>
</html>
```

### CDN Best Practices

```html
<!-- Always use integrity for security -->
<script src="https://cdn.example.com/lib.js" 
        integrity="sha384-HASH" 
        crossorigin="anonymous"></script>

<!-- Provide fallback -->
<script src="https://cdn.example.com/jquery.min.js"></script>
<script>
  window.jQuery || document.write('<script src="local/jquery.min.js"><\/script>');
</script>
```

## Script Loading Performance

### Preloading Scripts

```html
<head>
  <!-- Preload critical script -->
  <link rel="preload" href="critical.js" as="script">
  
  <!-- Actual script tag -->
  <script src="critical.js" defer></script>
</head>
```

### DNS Prefetch

```html
<head>
  <!-- Resolve DNS early -->
  <link rel="dns-prefetch" href="https://cdn.example.com">
  
  <!-- Later in page -->
  <script src="https://cdn.example.com/script.js" async></script>
</head>
```

### Preconnect

```html
<head>
  <!-- Establish connection early -->
  <link rel="preconnect" href="https://api.example.com">
  
  <!-- Script will use this connection -->
  <script src="https://api.example.com/sdk.js" async></script>
</head>
```

## Content Security Policy (CSP)

### Strict CSP

```html
<head>
  <!-- Only allow scripts from same origin -->
  <meta http-equiv="Content-Security-Policy" content="script-src 'self'">
</head>
```

### Allowing specific sources

```html
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' https://cdn.example.com https://analytics.example.com">
```

### Using nonce

```html
<head>
  <meta http-equiv="Content-Security-Policy" 
        content="script-src 'nonce-r@nd0m'">
</head>
<body>
  <!-- Only scripts with matching nonce execute -->
  <script nonce="r@nd0m">
    console.log('This script runs');
  </script>
  
  <script>
    console.log('This script is blocked');
  </script>
</body>
```

## JavaScript Framework Integration

### React

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <script type="text/babel">
    function App() {
      return <h1>Hello React!</h1>;
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>
```

### Vue.js

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vue App</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
</head>
<body>
  <div id="app">
    <h1>{{ message }}</h1>
    <button @click="changeMessage">Click Me</button>
  </div>
  
  <script>
    const { createApp } = Vue;
    
    createApp({
      data() {
        return {
          message: 'Hello Vue!'
        };
      },
      methods: {
        changeMessage() {
          this.message = 'Message changed!';
        }
      }
    }).mount('#app');
  </script>
</body>
</html>
```

## Error Handling

### Global Error Handler

```html
<script>
  window.addEventListener('error', function(event) {
    console.error('Error:', event.message);
    console.error('File:', event.filename);
    console.error('Line:', event.lineno);
    
    // Log to error tracking service
    // trackError(event);
  });
</script>
```

### Try-Catch Blocks

```html
<script>
  try {
    // Code that might throw error
    riskyFunction();
  } catch (error) {
    console.error('Caught error:', error.message);
    // Handle error gracefully
  } finally {
    console.log('Cleanup code');
  }
</script>
```

## Best Practices

### ✅ Do

1. **Use `defer` for regular scripts** in `<head>`
2. **Use `async` for independent scripts** (analytics, ads)
3. **Place scripts before closing `</body>`** if `defer` not supported
4. **Use external files** for reusable code
5. **Use event listeners** instead of inline handlers
6. **Validate user input** on both client and server
7. **Use `type="module"`** for modern JavaScript
8. **Implement error handling** for better UX
9. **Minify JavaScript** for production
10. **Use SRI** for CDN scripts (`integrity` attribute)
11. **Separate concerns** (HTML, CSS, JS)
12. **Use data attributes** for passing data from HTML to JS
13. **Implement CSP** for security
14. **Test across browsers** for compatibility
15. **Use descriptive function/variable names**

### ❌ Don't

1. **Don't use inline event handlers** (violates CSP)
2. **Don't block HTML parsing** (avoid scripts in `<head>` without `defer`)
3. **Don't use `document.write()`** (deprecated)
4. **Don't trust user input** (always validate/sanitize)
5. **Don't use global variables excessively** (use modules/closures)
6. **Don't load unnecessary libraries** (increases page size)
7. **Don't ignore browser console errors**
8. **Don't use `eval()`** (security risk)
9. **Don't forget fallbacks** for CDN resources
10. **Don't mix inline and external code** unnecessarily
11. **Don't forget to remove `console.log()`** in production
12. **Don't use deprecated features** (check browser compatibility)
13. **Don't ignore accessibility** (keyboard navigation, screen readers)
14. **Don't forget mobile optimization**
15. **Don't hardcode sensitive data** in JavaScript

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete JavaScript Integration</title>
  
  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" 
        content="script-src 'self' https://cdn.example.com">
  
  <!-- Preconnect to CDN -->
  <link rel="preconnect" href="https://cdn.example.com">
  
  <!-- Preload critical script -->
  <link rel="preload" href="app.js" as="script">
  
  <!-- Critical scripts with defer -->
  <script src="app.js" defer></script>
  <script src="utils.js" defer></script>
  
  <!-- Analytics with async -->
  <script src="https://cdn.example.com/analytics.js" async></script>
</head>
<body>
  <header>
    <h1 id="heading">Hello World</h1>
  </header>
  
  <main>
    <button id="changeBtn" data-text="Hello JavaScript!">
      Change Text
    </button>
    
    <form id="contactForm">
      <input type="text" id="name" name="name" required>
      <input type="email" id="email" name="email" required>
      <button type="submit">Submit</button>
    </form>
  </main>
  
  <!-- Inline script for critical functionality -->
  <script>
    // Global error handler
    window.addEventListener('error', function(event) {
      console.error('Error:', event.message);
    });
  </script>
</body>
</html>
```

**app.js**:
```javascript
// Wait for DOM to be ready (note: defer already ensures this)
document.addEventListener('DOMContentLoaded', function() {
  // Button click handler
  const btn = document.getElementById('changeBtn');
  btn.addEventListener('click', function() {
    const newText = this.dataset.text;
    document.getElementById('heading').textContent = newText;
  });
  
  // Form submission handler
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    console.log('Form submitted:', Object.fromEntries(formData));
    
    // Process form data
    // submitForm(formData);
  });
});
```

## Resources

- **MDN JavaScript Guide**: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **JavaScript.info**: https://javascript.info/
- **Can I Use**: https://caniuse.com/ (browser support)
- **JSHint**: https://jshint.com/ (code quality)
- **ESLint**: https://eslint.org/ (linting)
- **Babel**: https://babeljs.io/ (transpiler)
- **SRI Hash Generator**: https://www.srihash.org/
