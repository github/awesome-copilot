# Adding CSS Styling to HTML

Complete guide to integrating CSS (Cascading Style Sheets) with HTML for presentation and layout.

## Methods of Adding CSS

### 1. External Stylesheet (Recommended)

**Best for**: Production websites, reusable styles, maintainable code

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Heading</h1>
  <p>Content</p>
</body>
</html>
```

**Advantages**:
- ✅ Separates content from presentation
- ✅ Reusable across multiple pages
- ✅ Cached by browser (faster page loads)
- ✅ Easier to maintain
- ✅ Can be developed separately

**Multiple stylesheets**:
```html
<link rel="stylesheet" href="reset.css">
<link rel="stylesheet" href="layout.css">
<link rel="stylesheet" href="theme.css">
```

### 2. Internal Stylesheet

**Best for**: Single-page applications, unique page-specific styles, email HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
      margin: 0;
      padding: 20px;
    }
    
    h1 {
      color: #333;
      border-bottom: 2px solid #0066cc;
    }
    
    .highlight {
      background-color: yellow;
    }
  </style>
</head>
<body>
  <h1>Heading</h1>
  <p class="highlight">Highlighted text</p>
</body>
</html>
```

**Advantages**:
- ✅ No external HTTP request
- ✅ Good for critical above-the-fold CSS
- ✅ Useful for email templates

**Disadvantages**:
- ❌ Not reusable across pages
- ❌ Not cached separately
- ❌ Increases HTML file size

### 3. Inline Styles

**Best for**: Dynamic styles, urgent overrides, email HTML (when required)

```html
<p style="color: red; font-weight: bold;">Important text</p>

<div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
  <h2 style="margin-top: 0;">Box Title</h2>
  <p style="color: #666;">Box content</p>
</div>
```

**Advantages**:
- ✅ Highest specificity (overrides other styles)
- ✅ No class/ID needed
- ✅ Works in HTML emails

**Disadvantages**:
- ❌ Hard to maintain
- ❌ Not reusable
- ❌ Mixes content and presentation
- ❌ Increases HTML file size
- ❌ Can't use pseudo-classes/elements

**When to use**:
- Dynamically generated styles via JavaScript
- Email HTML templates
- Quick testing (remove before production)

## Link Element Attributes

### Basic Link Element

```html
<link rel="stylesheet" href="styles.css">
```

### Complete Link Element

```html
<link rel="stylesheet" 
      href="styles.css" 
      type="text/css"
      media="screen"
      title="Main Styles">
```

### Important Attributes

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `rel` | Relationship | `stylesheet` (required) |
| `href` | File location | URL or path |
| `type` | MIME type | `text/css` (optional, default) |
| `media` | Media query | `screen`, `print`, `all`, custom query |
| `title` | Stylesheet name | Text (for alternate stylesheets) |
| `crossorigin` | CORS mode | `anonymous`, `use-credentials` |
| `integrity` | SRI hash | Hash value for security |

## Media Queries in HTML

### Responsive Stylesheets

Load different CSS files for different devices:

```html
<!-- Mobile-first approach -->
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="tablet.css" media="(min-width: 768px)">
<link rel="stylesheet" href="desktop.css" media="(min-width: 1024px)">

<!-- Print styles -->
<link rel="stylesheet" href="print.css" media="print">

<!-- Dark mode support -->
<link rel="stylesheet" href="light.css" media="(prefers-color-scheme: light)">
<link rel="stylesheet" href="dark.css" media="(prefers-color-scheme: dark)">
```

### Common Media Queries

```html
<!-- Screen size -->
<link rel="stylesheet" href="mobile.css" media="(max-width: 767px)">
<link rel="stylesheet" href="desktop.css" media="(min-width: 768px)">

<!-- Orientation -->
<link rel="stylesheet" href="portrait.css" media="(orientation: portrait)">
<link rel="stylesheet" href="landscape.css" media="(orientation: landscape)">

<!-- High resolution displays -->
<link rel="stylesheet" href="retina.css" media="(-webkit-min-device-pixel-ratio: 2)">

<!-- Combined conditions -->
<link rel="stylesheet" href="tablet-portrait.css" 
      media="(min-width: 768px) and (max-width: 1023px) and (orientation: portrait)">
```

## CSS Loading Strategies

### Critical CSS

Inline critical above-the-fold CSS:

```html
<head>
  <style>
    /* Critical CSS for initial render */
    body { margin: 0; font-family: sans-serif; }
    .header { background: #333; color: white; padding: 1rem; }
    .hero { min-height: 400px; background: #f0f0f0; }
  </style>
  
  <!-- Load full stylesheet asynchronously -->
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="styles.css"></noscript>
</head>
```

### Async CSS Loading

Load non-critical CSS asynchronously:

```html
<!-- Method 1: Using preload -->
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">

<!-- Method 2: Using media query trick -->
<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">
```

### Deferred Loading

Load CSS after page load:

```html
<script>
  // Load CSS after page load
  window.addEventListener('load', function() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'deferred.css';
    document.head.appendChild(link);
  });
</script>
```

## CSS with Classes and IDs

### Using Classes

**HTML**:
```html
<div class="card">
  <h2 class="card-title">Card Title</h2>
  <p class="card-content">Card content goes here.</p>
  <button class="btn btn-primary">Action</button>
</div>
```

**CSS (external file)**:
```css
.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card-title {
  font-size: 1.5rem;
  margin-top: 0;
}

.card-content {
  color: #666;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}
```

### Using IDs

**HTML**:
```html
<header id="main-header">
  <nav id="primary-nav">
    <!-- Navigation -->
  </nav>
</header>
```

**CSS**:
```css
#main-header {
  background-color: #333;
  color: white;
  padding: 1rem;
}

#primary-nav {
  display: flex;
  gap: 1rem;
}
```

**When to use**:
- **Classes**: Reusable styles (preferred for styling)
- **IDs**: Unique elements, JavaScript selection, anchor links

## CSS Frameworks Integration

### Bootstrap

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bootstrap Page</title>
  
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <!-- Custom CSS (after Bootstrap) -->
  <link rel="stylesheet" href="custom.css">
</head>
<body>
  <div class="container">
    <h1 class="text-primary">Hello Bootstrap</h1>
    <button class="btn btn-success">Click Me</button>
  </div>
  
  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

### Tailwind CSS

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tailwind Page</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="container mx-auto px-4">
    <h1 class="text-3xl font-bold text-blue-600">Hello Tailwind</h1>
    <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
      Click Me
    </button>
  </div>
</body>
</html>
```

## CSS Variables in HTML

Define CSS custom properties inline:

```html
<div style="--primary-color: #007bff; --spacing: 20px;">
  <p style="color: var(--primary-color); padding: var(--spacing);">
    Text using CSS variables
  </p>
</div>
```

**Better approach** (in `<style>` or external CSS):
```html
<style>
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
  }
  
  .button {
    background-color: var(--primary-color);
    padding: var(--spacing-md);
  }
</style>
```

## Import Statements

### @import in HTML

```html
<style>
  @import url('reset.css');
  @import url('typography.css');
  @import url('layout.css');
  
  /* Additional styles */
  body {
    background: white;
  }
</style>
```

**Note**: `@import` is slower than `<link>` because it blocks parallel downloads. Prefer multiple `<link>` tags.

## Conditional CSS

### Browser-Specific Styles

```html
<!--[if IE]>
  <link rel="stylesheet" href="ie.css">
<![endif]-->

<!--[if lt IE 9]>
  <script src="html5shiv.js"></script>
<![endif]-->
```

**Note**: Conditional comments only work in IE ≤ 9 (obsolete).

### Modern Feature Detection

Use CSS feature queries in stylesheets:

```css
/* Modern grid layout */
@supports (display: grid) {
  .container {
    display: grid;
  }
}

/* Fallback for older browsers */
@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

## CSS Reset/Normalize

Include before custom styles:

```html
<head>
  <!-- CSS Reset -->
  <link rel="stylesheet" href="reset.css">
  
  <!-- OR Normalize.css -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css">
  
  <!-- Custom styles -->
  <link rel="stylesheet" href="styles.css">
</head>
```

## Performance Optimization

### Resource Hints

```html
<!-- Preconnect to font/CDN servers -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload critical CSS -->
<link rel="preload" href="critical.css" as="style">

<!-- DNS prefetch for later resources -->
<link rel="dns-prefetch" href="https://cdn.example.com">
```

### Font Loading

```html
<!-- Google Fonts optimized -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">

<!-- Self-hosted fonts -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

## Best Practices

### ✅ Do

1. **Use external stylesheets** for reusable styles
2. **Place `<link>` in `<head>`** for proper rendering
3. **Use meaningful class names** (descriptive, not presentational)
4. **Group related styles** in separate files
5. **Minimize CSS file size** (minify for production)
6. **Use CSS variables** for consistent theming
7. **Implement mobile-first** responsive design
8. **Load critical CSS inline** for faster initial render
9. **Use `preload` for critical resources**
10. **Version your CSS files** for cache busting (`styles.css?v=1.2`)

### ❌ Don't

1. **Don't use inline styles** extensively (hard to maintain)
2. **Don't use `@import`** in production (blocks parallel downloads)
3. **Don't override styles excessively** (indicates poor architecture)
4. **Don't use !important** unless absolutely necessary
5. **Don't write non-semantic class names** (`red-text`, `big-margin`)
6. **Don't load unused CSS** (remove unused framework code)
7. **Don't forget print styles** if printing is relevant
8. **Don't mix CSS with HTML** attributes (use classes instead)
9. **Don't use deprecated CSS** prefixes without autoprefixer
10. **Don't forget to minify** CSS for production

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete CSS Integration Example</title>
  
  <!-- Preconnect to external resources -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Critical CSS inline -->
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }
    .header {
      background: #333;
      color: white;
      padding: 1rem;
    }
  </style>
  
  <!-- External stylesheets -->
  <link rel="stylesheet" href="normalize.css">
  <link rel="stylesheet" href="layout.css">
  <link rel="stylesheet" href="components.css">
  <link rel="stylesheet" href="utilities.css">
  
  <!-- Media-specific styles -->
  <link rel="stylesheet" href="print.css" media="print">
  
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <header class="header">
    <h1>Website Title</h1>
  </header>
  
  <main class="container">
    <article class="card">
      <h2 class="card-title">Article Title</h2>
      <p class="card-content">Article content goes here.</p>
    </article>
  </main>
  
  <footer class="footer">
    <p>&copy; 2024 Website Name</p>
  </footer>
</body>
</html>
```

## Resources

- **MDN CSS Reference**: https://developer.mozilla.org/en-US/docs/Web/CSS
- **CSS Tricks**: https://css-tricks.com/
- **Can I Use**: https://caniuse.com/ (browser support)
- **CSS Validator**: https://jigsaw.w3.org/css-validator/
- **Google Fonts**: https://fonts.google.com/
- **Normalize.css**: https://necolas.github.io/normalize.css/
