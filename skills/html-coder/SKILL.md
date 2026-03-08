---
name: html-coder
description: 'Expert HTML development skill for building web pages, forms, and interactive content. Use when creating HTML documents, structuring web content, implementing semantic markup, adding forms and media, working with HTML5 APIs, or needing HTML templates, best practices, and accessibility guidance. Supports modern HTML5 standards and responsive design patterns.'
---

# HTML Coder Skill

Expert skill for professional HTML development, covering everything from basic page structure to advanced HTML5 features, semantic markup, forms, multimedia, and web APIs. This skill provides comprehensive guidance, code templates, and best practices for building modern, accessible, and standards-compliant web content.

## When to Use This Skill

- Creating new HTML documents or web pages
- Structuring content with semantic HTML elements
- Building HTML forms with validation and accessibility
- Adding multimedia content (images, audio, video)
- Implementing responsive and accessible markup
- Using HTML5 APIs (Canvas, SVG, Geolocation, Web Storage, etc.)
- Applying HTML templates for common website types
- Learning HTML syntax, attributes, and best practices
- Troubleshooting HTML validation or accessibility issues
- Understanding HTML standards and specifications

## Core Capabilities

### HTML Fundamentals
- Document structure and DOCTYPE declarations
- Semantic elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- Text formatting and content organization
- Links, navigation, and page relationships
- Lists (ordered, unordered, description)
- Tables with proper structure and accessibility

### Forms and Input
- Form elements and structure
- Input types (text, email, number, date, file, etc.)
- Form validation (client-side and HTML5 validation)
- Form attributes (required, pattern, min, max, etc.)
- Labels, fieldsets, and accessibility
- Form submission and methods

### Media and Graphics
- Images with responsive techniques
- Image maps and hotspots
- Audio and video elements
- Canvas for drawing and graphics
- SVG for vector graphics
- Picture element and responsive images
- Background images and optimization

### Advanced Features
- HTML5 APIs (Geolocation, Web Storage, Web Workers, SSE)
- Drag and drop functionality
- Custom data attributes
- Microdata and structured data
- CORS for cross-origin resources
- Iframes and embedded content

### Accessibility and Standards
- ARIA attributes and roles
- Semantic markup for screen readers
- Keyboard navigation support
- Color contrast and text sizing
- Alt text and descriptive content
- WCAG compliance guidelines

## Quick Reference

### Getting Started
For beginners and quick starts, see:
- `references/getting-started.md` - First website and basic HTML structure
- `references/quickstart.md` - HTML cheatsheet for common tasks

### Essential Topics
For core HTML concepts:
- `references/essentials.md` - Comments, validation, content categories, responsive images, media formats
- `references/how-to.md` - Practical guides for specific tasks
- `references/reference.md` - Complete HTML element and attribute reference

### HTML Attributes
For working with attributes:
- `references/attributes.md` - Input types, script types, meta names, rel keywords
- `references/glossary-attributes.md` - Complete attribute reference
- `references/glossary-global-attributes.md` - Global attributes available on all elements

### Integration with CSS and JavaScript
- `references/add-css-style.md` - Applying styles and colors to HTML
- `references/add-javascript.md` - Adding interactivity with JavaScript

### UI/UX Considerations
- `references/ui-ux.md` - User interface and user experience best practices
- `references/glossary-ui-ux.md` - UX terminology and concepts

### Complete References
- `references/glossary-tags.md` - All HTML tags organized by category
- `references/glossary-events.md` - HTML and DOM event attributes
- `references/standards.md` - HTML specifications and standards

## HTML Templates

Pre-built templates for common website types (located in `assets/`):

### Business and Professional
- `group-template.md` - Team or organization website
- `construction-company-template.md` - Construction or contractor site
- `retail-store-template.md` - E-commerce or retail storefront
- `furniture-design-template.md` - Interior design or furniture showcase

### Food and Hospitality
- `food-service-template.md` - Food service or catering site
- `restaurant-template.md` - Restaurant website with menu
- `restaurant-blog-template.md` - Restaurant with blog integration
- `hotel-template.md` - Hotel or accommodation booking site

### Creative and Portfolio
- `portfolio-template.md` - Professional portfolio site
- `graphic-design-portfolio-template.md` - Design portfolio showcase
- `art-template.md` - Artist or gallery website
- `gallery-template.md` - Photo or image gallery

### Blog and Content
- `blog-template.md` - Standard blog layout
- `style-blog-template.md` - Fashion or lifestyle blog
- `social-media-template.md` - Social media style layout

### Technology and Startup
- `assets/startup-template.html` - Startup landing page
- `assets/app-splashpage-template.html` - App splash or launch page
- `assets/app-template.html` - Application showcase site
- `assets/marketing-template.html` - Marketing or promotional page
- `assets/analytics-template.html` - Analytics dashboard layout

### Travel and Lifestyle
- `assets/travel-template.html` - Travel blog or guide
- `assets/travel-agency-template.html` - Travel booking or agency site
- `assets/rental-template.html` - Rental property or vacation site
- `assets/home-design-template.html` - Home design or real estate

### Utility and Special Purpose
- `assets/resume-template.html` - Professional resume or CV
- `assets/under-construction-template.html` - Coming soon or maintenance page
- `assets/start-page-template.html` - Personal start page or dashboard
- `assets/parallax-template.html` - Parallax scrolling design
- `assets/responsive-template.html` - Responsive layout example
- `assets/email-template.html` - HTML email template
- `assets/documentation-template.html` - Documentation site layout

## Best Practices

### Semantic HTML
Always use semantic elements that convey meaning:
```html
<!-- Good: Semantic structure -->
<article>
  <header>
    <h1>Article Title</h1>
    <time datetime="2026-03-08">March 8, 2026</time>
  </header>
  <p>Article content...</p>
  <footer>
    <p>Author information</p>
  </footer>
</article>

<!-- Avoid: Non-semantic divs everywhere -->
<div class="article">
  <div class="header">
    <div class="title">Article Title</div>
  </div>
</div>
```

### Accessibility First
- Use proper heading hierarchy (h1 → h2 → h3)
- Include alt text for all images
- Use labels with form inputs
- Ensure keyboard navigation works
- Provide ARIA attributes when needed
- Test with screen readers

### Form Validation
Leverage HTML5 validation before JavaScript:
```html
<form>
  <label for="email">Email:</label>
  <input 
    type="email" 
    id="email" 
    name="email" 
    required 
    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
    aria-describedby="email-help"
  >
  <span id="email-help">Enter a valid email address</span>
</form>
```

### Responsive Images
Use modern responsive image techniques:
```html
<picture>
  <source media="(min-width: 1200px)" srcset="large.jpg">
  <source media="(min-width: 768px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Description" loading="lazy">
</picture>
```

### Performance Optimization
- Use `loading="lazy"` for images below the fold
- Minimize DOM depth and complexity
- Use semantic elements to reduce div soup
- Optimize images before adding to HTML
- Defer non-critical scripts
- Use modern formats (WebP for images, etc.)

## Common Patterns

### Page Structure Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description for SEO">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <nav><!-- Navigation --></nav>
  </header>
  
  <main>
    <article><!-- Main content --></article>
  </main>
  
  <aside><!-- Sidebar content --></aside>
  
  <footer><!-- Footer content --></footer>
  
  <script src="script.js"></script>
</body>
</html>
```

### Accessible Form Pattern
```html
<form method="post" action="/submit">
  <fieldset>
    <legend>Contact Information</legend>
    
    <div class="form-group">
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required>
    </div>
    
    <div class="form-group">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
    </div>
    
    <div class="form-group">
      <label for="message">Message:</label>
      <textarea id="message" name="message" rows="5" required></textarea>
    </div>
    
    <button type="submit">Send</button>
  </fieldset>
</form>
```

## Troubleshooting

### Validation Errors
- Use W3C Validator: https://validator.w3.org/
- Check for unclosed tags
- Verify attribute syntax
- Ensure proper nesting of elements
- Check DOCTYPE declaration

### Accessibility Issues
- Run Lighthouse audit in Chrome DevTools
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard navigation
- Check color contrast ratios
- Validate ARIA usage

### Browser Compatibility
- Check Can I Use: https://caniuse.com/
- Use feature detection, not browser detection
- Provide fallbacks for older browsers
- Test in multiple browsers and devices
- Use polyfills when necessary

## References

All detailed reference materials are located in the `references/` directory:

- **getting-started.md** - HTML fundamentals and first steps
- **quickstart.md** - Quick reference cheatsheet
- **essentials.md** - Core concepts and techniques
- **how-to.md** - Task-specific guides
- **reference.md** - Complete element reference
- **attributes.md** - Attribute types and values
- **standards.md** - Official HTML specifications
- **add-css-style.md** - CSS integration guide
- **add-javascript.md** - JavaScript integration guide
- **ui-ux.md** - UI/UX best practices
- **glossary-tags.md** - HTML elements reference
- **glossary-attributes.md** - HTML attributes reference
- **glossary-global-attributes.md** - Global attributes reference
- **glossary-events.md** - Event attributes reference
- **glossary-ui-ux.md** - UX terminology

## External Resources

### Official Standards
- WHATWG HTML Living Standard: https://html.spec.whatwg.org/
- W3C HTML Specifications: https://www.w3.org/TR/html/
- MDN Web Docs: https://developer.mozilla.org/en-US/docs/Web/HTML

### Learning Resources
- W3Schools HTML Tutorial: https://www.w3schools.com/html/
- MDN Learning HTML: https://developer.mozilla.org/en-US/docs/Learn/HTML

### Tools
- W3C Markup Validator: https://validator.w3.org/
- HTML5 Outliner: https://gsnedders.html5.org/outliner/
- Can I Use: https://caniuse.com/

### Accessibility
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- WAI-ARIA Practices: https://www.w3.org/WAI/ARIA/apg/

---

**Note**: This skill includes a curated set of reference files and templates listed above. It is designed to grow and evolve, and additional templates and examples may be added over time as needed.
