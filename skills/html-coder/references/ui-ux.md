# HTML UI/UX Best Practices

Comprehensive guide to creating accessible, usable, and user-friendly HTML interfaces.

## Core UI/UX Principles

### 1. Accessibility First

Design for all users, including those with disabilities.

**Screen Reader Support**:
```html
<!-- Proper heading hierarchy -->
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

<!-- Descriptive link text -->
<a href="products.html">View our products</a>
<!-- NOT: <a href="products.html">Click here</a> -->

<!-- Image alt text -->
<img src="product.jpg" alt="Red leather handbag with gold chain strap">

<!-- Form labels -->
<label for="email">Email Address:</label>
<input type="email" id="email" name="email" required>
```

**Keyboard Navigation**:
```html
<!-- All interactive elements should be keyboard accessible -->
<button>Click Me</button>
<a href="#section">Jump to Section</a>

<!-- Custom interactive elements need tabindex and ARIA -->
<div role="button" tabindex="0" aria-label="Custom button">
  Click
</div>

<!-- Skip to main content link -->
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main">
  <!-- Content -->
</main>
```

### 2. Semantic HTML

Use meaningful HTML elements that convey structure and purpose.

```html
<!-- ✅ Good: Semantic structure -->
<article>
  <header>
    <h1>Article Title</h1>
    <time datetime="2024-01-15">January 15, 2024</time>
  </header>
  
  <p>Article content...</p>
  
  <footer>
    <p>Author: John Doe</p>
  </footer>
</article>

<!-- ❌ Bad: Generic divs -->
<div class="article">
  <div class="header">
    <div class="title">Article Title</div>
    <div class="date">January 15, 2024</div>
  </div>
  <div class="content">Article content...</div>
</div>
```

### 3. Mobile-First Design

Design for mobile devices first, then enhance for larger screens.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- Essential viewport meta tag -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile-First Page</title>
</head>
<body>
  <!-- Touch-friendly button sizes (minimum 44x44px) -->
  <button style="min-width: 44px; min-height: 44px;">Tap Me</button>
  
  <!-- Readable text (minimum 16px) -->
  <p style="font-size: 16px;">Easy to read on mobile</p>
  
  <!-- Mobile-friendly navigation -->
  <nav>
    <button id="menuToggle" aria-label="Toggle menu">☰</button>
    <ul id="menu">
      <li><a href="#home">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</body>
</html>
```

## Form UI/UX Best Practices

### Well-Designed Forms

```html
<form action="/submit" method="post">
  <!-- Group related fields -->
  <fieldset>
    <legend>Personal Information</legend>
    
    <!-- Always associate labels with inputs -->
    <div class="form-group">
      <label for="firstName">First Name</label>
      <input 
        type="text" 
        id="firstName" 
        name="firstName" 
        required
        aria-required="true"
        autocomplete="given-name">
    </div>
    
    <div class="form-group">
      <label for="email">Email Address</label>
      <input 
        type="email" 
        id="email" 
        name="email" 
        required
        aria-required="true"
        aria-describedby="emailHelp"
        autocomplete="email">
      <small id="emailHelp">We'll never share your email.</small>
    </div>
  </fieldset>
  
  <!-- Clear call-to-action -->
  <button type="submit">Submit Application</button>
  <button type="reset">Clear Form</button>
</form>
```

### Input Types for Better UX

```html
<!-- Use appropriate input types for mobile keyboards -->
<input type="tel" placeholder="Phone number">
<input type="email" placeholder="Email address">
<input type="url" placeholder="Website URL">
<input type="number" placeholder="Age" min="18" max="120">
<input type="date" placeholder="Birth date">
<input type="search" placeholder="Search...">
```

### Form Validation Feedback

```html
<form>
  <div class="form-group">
    <label for="username">Username</label>
    <input 
      type="text" 
      id="username" 
      name="username"
      required
      minlength="3"
      maxlength="20"
      pattern="[a-zA-Z0-9]+"
      aria-describedby="usernameError">
    
    <!-- Error message (shown when invalid) -->
    <span id="usernameError" class="error" role="alert" style="display: none;">
      Username must be 3-20 alphanumeric characters
    </span>
  </div>
  
  <button type="submit">Register</button>
</form>
```

### Placeholder vs Label

```html
<!-- ✅ Good: Label + placeholder -->
<label for="search">Search</label>
<input type="search" id="search" placeholder="Enter keyword...">

<!-- ❌ Bad: Placeholder only (inaccessible) -->
<input type="text" placeholder="Email address">
```

## Navigation Best Practices

### Clear Navigation Structure

```html
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="#home" aria-current="page">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
```

### Breadcrumb Navigation

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/products/electronics">Electronics</a></li>
    <li aria-current="page">Laptops</li>
  </ol>
</nav>
```

### Mobile Navigation

```html
<!-- Hamburger menu pattern -->
<header>
  <button 
    id="menuToggle" 
    aria-expanded="false" 
    aria-controls="mainMenu"
    aria-label="Toggle navigation menu">
    ☰
  </button>
  
  <nav id="mainMenu" hidden>
    <ul>
      <li><a href="#home">Home</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
```

## Content Layout Best Practices

### Visual Hierarchy

```html
<!-- Clear hierarchy with headings -->
<article>
  <h1>Main Topic</h1>
  
  <section>
    <h2>Subtopic A</h2>
    <p>Content for subtopic A...</p>
    
    <h3>Detail A1</h3>
    <p>Detailed information...</p>
    
    <h3>Detail A2</h3>
    <p>More details...</p>
  </section>
  
  <section>
    <h2>Subtopic B</h2>
    <p>Content for subtopic B...</p>
  </section>
</article>
```

### Scannable Content

```html
<!-- Use lists for scannable content -->
<article>
  <h2>Product Features</h2>
  <ul>
    <li>Fast performance</li>
    <li>Easy to use</li>
    <li>Secure encryption</li>
    <li>24/7 support</li>
  </ul>
  
  <!-- Use paragraphs for readable content -->
  <h2>Description</h2>
  <p>Our product offers the best solution for your needs...</p>
</article>
```

### White Space

```html
<!-- Use semantic elements that naturally create spacing -->
<section>
  <h2>Section Title</h2>
  <p>First paragraph of content.</p>
  <p>Second paragraph with proper spacing.</p>
</section>

<section>
  <h2>Another Section</h2>
  <p>Content visually separated from previous section.</p>
</section>
```

## Interactive Elements

### Buttons vs Links

```html
<!-- ✅ Button: For actions -->
<button type="button" onclick="saveData()">Save</button>
<button type="submit">Submit Form</button>

<!-- ✅ Link: For navigation -->
<a href="page.html">Go to Page</a>
<a href="#section">Jump to Section</a>

<!-- ❌ Bad: Link styled as button for actions -->
<a href="#" onclick="saveData()">Save</a>

<!-- ❌ Bad: Button for navigation -->
<button onclick="location.href='page.html'">Go to Page</button>
```

### Call-to-Action (CTA)

```html
<!-- Clear, action-oriented CTA buttons -->
<section>
  <h2>Get Started Today</h2>
  <p>Join thousands of satisfied customers.</p>
  
  <!-- Primary CTA -->
  <button class="btn-primary">Start Free Trial</button>
  
  <!-- Secondary CTA -->
  <a href="#learn-more" class="btn-secondary">Learn More</a>
</section>
```

### Loading States

```html
<!-- Button with loading state -->
<button type="submit" id="submitBtn">
  <span class="btn-text">Submit</span>
  <span class="btn-spinner" hidden aria-hidden="true">⏳</span>
</button>

<!-- Loading indicator for content -->
<div id="content" aria-busy="false" aria-live="polite">
  <p>Content loading...</p>
</div>
```

## Tables for Data

### Accessible Data Tables

```html
<table>
  <caption>Quarterly Sales Report 2024</caption>
  <thead>
    <tr>
      <th scope="col">Quarter</th>
      <th scope="col">Revenue</th>
      <th scope="col">Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Q1</th>
      <td>$125,000</td>
      <td>+12%</td>
    </tr>
    <tr>
      <th scope="row">Q2</th>
      <td>$140,000</td>
      <td>+15%</td>
    </tr>
  </tbody>
</table>
```

### Responsive Tables

```html
<!-- Option 1: Horizontal scroll -->
<div style="overflow-x: auto;">
  <table>
    <!-- Table content -->
  </table>
</div>

<!-- Option 2: Stacked layout with data attributes -->
<table class="responsive-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Phone</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Name">John Doe</td>
      <td data-label="Email">john@example.com</td>
      <td data-label="Phone">(555) 123-4567</td>
    </tr>
  </tbody>
</table>
```

## Media and Images

### Responsive Images

```html
<!-- Responsive image with srcset -->
<img 
  src="image-800w.jpg"
  srcset="image-400w.jpg 400w,
          image-800w.jpg 800w,
          image-1200w.jpg 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 1000px) 800px,
         1200px"
  alt="Product showcase">

<!-- Art direction with picture -->
<picture>
  <source media="(min-width: 800px)" srcset="wide.jpg">
  <source media="(min-width: 400px)" srcset="medium.jpg">
  <img src="narrow.jpg" alt="Responsive design example">
</picture>
```

### Context-Aware Alt Text

```html
<!-- ✅ Good: Descriptive alt text -->
<img src="sunset.jpg" alt="Golden sunset over mountain peaks">

<!-- ✅ Good: Decorative image (empty alt) -->
<img src="decorative-line.png" alt="" role="presentation">

<!-- ✅ Good: Functional image -->
<button>
  <img src="search-icon.svg" alt="Search">
</button>

<!-- ❌ Bad: Generic alt text -->
<img src="photo.jpg" alt="Image">
<img src="pic.jpg" alt="Picture of something">
```

### Video Best Practices

```html
<video 
  controls 
  preload="metadata"
  poster="video-poster.jpg"
  width="640" 
  height="360">
  
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  
  <!-- Subtitles for accessibility -->
  <track 
    kind="subtitles" 
    src="subtitles-en.vtt" 
    srclang="en" 
    label="English"
    default>
  
  <track 
    kind="subtitles" 
    src="subtitles-es.vtt" 
    srclang="es" 
    label="Español">
  
  <!-- Fallback text -->
  <p>Your browser doesn't support HTML5 video. 
     <a href="video.mp4">Download the video</a>.</p>
</video>
```

## Error Handling and Feedback

### Error Messages

```html
<!-- Form with error feedback -->
<form>
  <div class="form-group" aria-invalid="true">
    <label for="username">Username</label>
    <input 
      type="text" 
      id="username" 
      name="username"
      aria-describedby="usernameError"
      class="invalid">
    
    <div id="usernameError" role="alert" class="error-message">
      ❌ Username must be at least 3 characters
    </div>
  </div>
  
  <button type="submit">Submit</button>
</form>
```

### Success Messages

```html
<!-- Success notification -->
<div role="status" aria-live="polite" class="success-message">
  ✅ Your changes have been saved successfully!
</div>

<!-- Success state for forms -->
<form>
  <div class="form-group">
    <label for="email">Email</label>
    <input 
      type="email" 
      id="email" 
      aria-describedby="emailSuccess"
      class="valid">
    
    <div id="emailSuccess" class="success-feedback">
      ✓ Valid email address
    </div>
  </div>
</form>
```

### 404 Error Pages

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 - Page Not Found</title>
</head>
<body>
  <main>
    <h1>404 - Page Not Found</h1>
    <p>Sorry, the page you're looking for doesn't exist.</p>
    
    <!-- Helpful navigation -->
    <nav aria-label="Error page navigation">
      <ul>
        <li><a href="/">Go to Homepage</a></li>
        <li><a href="/sitemap">View Sitemap</a></li>
        <li><a href="/search">Search</a></li>
        <li><a href="/contact">Contact Support</a></li>
      </ul>
    </nav>
  </main>
</body>
</html>
```

## Progress Indicators

### Progress Bar

```html
<!-- Determinate progress -->
<label for="uploadProgress">Upload Progress:</label>
<progress id="uploadProgress" value="70" max="100">70%</progress>

<!-- Indeterminate progress (no value) -->
<progress>Loading...</progress>
```

### Step Indicators

```html
<nav aria-label="Progress">
  <ol class="steps">
    <li class="completed" aria-current="false">
      <span class="step-number">1</span>
      <span class="step-label">Account Info</span>
    </li>
    <li class="active" aria-current="step">
      <span class="step-number">2</span>
      <span class="step-label">Payment</span>
    </li>
    <li class="pending" aria-current="false">
      <span class="step-number">3</span>
      <span class="step-label">Confirmation</span>
    </li>
  </ol>
</nav>
```

## Modals and Dialogs

### Accessible Modal

```html
<!-- Trigger button -->
<button id="openModal" aria-haspopup="dialog">Open Modal</button>

<!-- Modal dialog -->
<div 
  id="modal" 
  role="dialog" 
  aria-labelledby="modalTitle"
  aria-describedby="modalDesc"
  aria-modal="true"
  hidden>
  
  <div class="modal-content">
    <header>
      <h2 id="modalTitle">Confirm Action</h2>
      <button 
        id="closeModal" 
        aria-label="Close modal"
        type="button">✕</button>
    </header>
    
    <div id="modalDesc">
      <p>Are you sure you want to proceed?</p>
    </div>
    
    <footer>
      <button type="button" class="btn-primary">Confirm</button>
      <button type="button" class="btn-secondary">Cancel</button>
    </footer>
  </div>
</div>
```

## Search UI

### Search Form

```html
<form role="search" action="/search" method="get">
  <label for="siteSearch">Search this site:</label>
  <input 
    type="search" 
    id="siteSearch" 
    name="q"
    placeholder="Enter keywords..."
    autocomplete="off"
    aria-label="Search">
  
  <button type="submit">
    <span class="visually-hidden">Search</span>
    <svg aria-hidden="true"><!-- Search icon --></svg>
  </button>
</form>
```

### Search Results

```html
<section aria-label="Search results">
  <h2>Search Results for "keyword"</h2>
  <p role="status">Found 42 results in 0.15 seconds</p>
  
  <ul class="results-list">
    <li>
      <article>
        <h3><a href="/page1">Result Title 1</a></h3>
        <p>Result description...</p>
      </article>
    </li>
    <li>
      <article>
        <h3><a href="/page2">Result Title 2</a></h3>
        <p>Result description...</p>
      </article>
    </li>
  </ul>
  
  <!-- Pagination -->
  <nav aria-label="Search results pages">
    <ul class="pagination">
      <li><a href="?page=1" aria-label="Page 1" aria-current="page">1</a></li>
      <li><a href="?page=2" aria-label="Page 2">2</a></li>
      <li><a href="?page=3" aria-label="Page 3">3</a></li>
    </ul>
  </nav>
</section>
```

## Cards and Content Blocks

### Card Component

```html
<article class="card">
  <img src="product.jpg" alt="Product name" class="card-image">
  
  <div class="card-content">
    <h3 class="card-title">Product Name</h3>
    <p class="card-description">Brief description of the product...</p>
    
    <div class="card-meta">
      <span class="price">$29.99</span>
      <span class="rating" aria-label="Rating: 4.5 out of 5 stars">
        ★★★★☆ 4.5
      </span>
    </div>
  </div>
  
  <div class="card-actions">
    <button class="btn-primary">Add to Cart</button>
    <button class="btn-secondary">Learn More</button>
  </div>
</article>
```

## Performance Considerations

### Lazy Loading

```html
<!-- Lazy load images below the fold -->
<img 
  src="placeholder.jpg" 
  data-src="actual-image.jpg"
  loading="lazy"
  alt="Description">

<!-- Lazy load iframes -->
<iframe 
  src="video.html"
  loading="lazy"
  title="Video player"></iframe>
```

### Critical Content First

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fast Loading Page</title>
  
  <!-- Critical CSS inline -->
  <style>
    /* Above-the-fold styles */
    .hero { /* styles */ }
  </style>
  
  <!-- Defer non-critical CSS -->
  <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
</head>
<body>
  <!-- Critical content first -->
  <header>
    <h1>Main Heading</h1>
  </header>
  
  <!-- Non-critical content can load later -->
  <section>
    <!-- Content -->
  </section>
</body>
</html>
```

## Accessibility Checklist

### ✅ Essential Accessibility Features

- [ ] **All images have alt text** (or `alt=""` for decorative)
- [ ] **Form inputs have labels** (using `<label>` with `for`)
- [ ] **Headings follow logical hierarchy** (H1 → H2 → H3)
- [ ] **Links have descriptive text** (not "click here")
- [ ] **Color contrast meets WCAG AA** (4.5:1 for normal text)
- [ ] **Keyboard navigation works** (Tab, Enter, Space, Arrows)
- [ ] **Focus visible on interactive elements**
- [ ] **ARIA used correctly** (roles, states, properties)
- [ ] **Skip navigation link provided**
- [ ] **Language declared** (`<html lang="en">`)
- [ ] **Viewport meta tag included** (for mobile)
- [ ] **Forms have proper validation** (with clear error messages)
- [ ] **Videos have captions/subtitles**
- [ ] **Tables have proper headers** (`<th scope>`)
- [ ] **Page title is descriptive**

## Common UX Mistakes to Avoid

### ❌ Don't Do These

1. **Tiny tap targets** (minimum 44x44px for touch)
2. **Disabled form submit buttons** (show errors instead)
3. **Poor error messages** ("Error 402" vs "Email format invalid")
4. **Fake loading spinners** (be honest about loading states)
5. **Confusing navigation** (inconsistent menu locations)
6. **Hiding important info** (critical data in tooltips)
7. **Auto-playing media** (audio/video without user action)
8. **Captchas that are impossible** (use accessible alternatives)
9. **Required field only marked with color** (use text/symbol too)
10. **Removing focus outline** without alternative
11. **Infinite scroll without pagination** (accessibility issue)
12. **Modal without keyboard trap** (can't escape with ESC or Tab)
13. **Links that open in new tab** without warning
14. **Justifying text** (creates irregular spacing, hard to read)
15. **Using placeholders as labels** (disappear when typing)

## Best Practices Summary

### ✅ Always Do

1. **Test with keyboard only** (no mouse)
2. **Test with screen reader** (NVDA, JAWS, VoiceOver)
3. **Use semantic HTML** (not divs for everything)
4. **Provide visible focus states**
5. **Write descriptive error messages**
6. **Make clickable areas large enough** (44x44px minimum)
7. **Use proper heading hierarchy**
8. **Provide text alternatives** for non-text content
9. **Test on mobile devices**
10. **Ensure sufficient color contrast**
11. **Allow users to control motion** (respect `prefers-reduced-motion`)
12. **Provide clear feedback** for all user actions
13. **Make forms easy to complete**
14. **Use loading indicators** for async operations
15. **Test across different browsers**

## Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **A11y Project**: https://www.a11yproject.com/
- **WebAIM**: https://webaim.org/
- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **WAVE Tool**: https://wave.webaim.org/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **Material Design**: https://material.io/design
- **Nielsen Norman Group**: https://www.nngroup.com/
- **Inclusive Components**: https://inclusive-components.design/
