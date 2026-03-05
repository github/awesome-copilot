# Performance & Optimization Reference

Comprehensive reference for web performance metrics, optimization techniques, and Core Web Vitals.

## Core Web Vitals

Google's metrics for measuring user experience.

### Largest Contentful Paint (LCP)

Measures loading performance - when largest content element becomes visible.

**Target**: < 2.5 seconds

**Optimization**:
- Reduce server response time
- Optimize images
- Remove render-blocking resources
- Use CDN
- Implement lazy loading
- Preload critical resources

```html
<link rel="preload" href="hero-image.jpg" as="image">
```

### First Input Delay (FID) → Interaction to Next Paint (INP)

FID (deprecated) measured input responsiveness. INP is the new metric.

**INP Target**: < 200ms

**Optimization**:
- Minimize JavaScript execution time
- Break up long tasks
- Use web workers
- Optimize third-party scripts
- Use `requestIdleCallback`

### Cumulative Layout Shift (CLS)

Measures visual stability - unexpected layout shifts.

**Target**: < 0.1

**Optimization**:
- Specify image/video dimensions
- Avoid inserting content above existing content
- Use CSS aspect-ratio
- Reserve space for dynamic content

```html
<img src="image.jpg" width="800" height="600" alt="Photo">

<style>
  .video-container {
    aspect-ratio: 16 / 9;
  }
</style>
```

## Other Performance Metrics

### First Contentful Paint (FCP)
Time when first content element renders.  
**Target**: < 1.8s

### Time to First Byte (TTFB)
Time for browser to receive first byte of response.  
**Target**: < 600ms

### Time to Interactive (TTI)
When page becomes fully interactive.  
**Target**: < 3.8s

### Speed Index
How quickly content is visually displayed.  
**Target**: < 3.4s

### Total Blocking Time (TBT)
Sum of blocking time for all long tasks.  
**Target**: < 200ms

## Image Optimization

### Format Selection

| Format | Best For | Pros | Cons |
|--------|----------|------|------|
| JPEG | Photos | Small size, widely supported | Lossy, no transparency |
| PNG | Graphics, transparency | Lossless, transparency | Larger size |
| WebP | Modern browsers | Small size, transparency | Limited old browser support |
| AVIF | Newest format | Best compression | Limited support |
| SVG | Icons, logos | Scalable, small | Not for photos |

### Responsive Images

```html
<!-- Picture element for art direction -->
<picture>
  <source media="(min-width: 1024px)" srcset="large.webp" type="image/webp">
  <source media="(min-width: 768px)" srcset="medium.webp" type="image/webp">
  <source media="(min-width: 1024px)" srcset="large.jpg">
  <source media="(min-width: 768px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Responsive image">
</picture>

<!-- Srcset for resolution switching -->
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w,
          image-800.jpg 800w,
          image-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 1000px) 800px,
         1200px"
  alt="Image">

<!-- Lazy loading -->
<img src="image.jpg" loading="lazy" alt="Lazy loaded">
```

### Image Compression

- Use tools like ImageOptim, Squoosh, or Sharp
- Target 80-85% quality for JPEGs
- Use progressive JPEGs
- Strip metadata

## Code Optimization

### Minification

Remove whitespace, comments, shorten names:

```javascript
// Before
function calculateTotal(price, tax) {
  const total = price + (price * tax);
  return total;
}

// After minification
function t(p,x){return p+p*x}
```

**Tools**: Terser (JS), cssnano (CSS), html-minifier

### Code Splitting

Split code into smaller chunks loaded on demand:

```javascript
// Dynamic import
button.addEventListener('click', async () => {
  const module = await import('./heavy-module.js');
  module.run();
});

// React lazy loading
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Webpack code splitting
import(/* webpackChunkName: "lodash" */ 'lodash').then(({ default: _ }) => {
  // Use lodash
});
```

### Tree Shaking

Remove unused code during bundling:

```javascript
// Only imports what's used
import { debounce } from 'lodash-es';

// ESM exports enable tree shaking
export { function1, function2 };
```

### Compression

Enable gzip or brotli compression:

```nginx
# nginx config
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# brotli (better compression)
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

## Caching Strategies

### Cache-Control Headers

```http
# Immutable assets (versioned URLs)
Cache-Control: public, max-age=31536000, immutable

# HTML (always revalidate)
Cache-Control: no-cache

# API responses (short cache)
Cache-Control: private, max-age=300

# No caching
Cache-Control: no-store
```

### Service Workers

Advanced caching con trol:

```javascript
// Cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Stale-while-revalidate
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('dynamic').then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return response || fetchPromise;
      });
    })
  );
});
```

## Loading Strategies

### Critical Rendering Path

1. Construct DOM from HTML
2. Construct CSSOM from CSS
3. Combine DOM + CSSOM into render tree
4. Calculate layout
5. Paint pixels

### Resource Hints

```html
<!-- DNS prefetch -->
<link rel="dns-prefetch" href="//example.com">

<!-- Preconnect (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Prefetch (low priority for next page) -->
<link rel="prefetch" href="next-page.js">

<!-- Preload (high priority for current page) -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

<!-- Prerender (next page in background) -->
<link rel="prerender" href="next-page.html">
```

### Lazy Loading

```javascript
// Images - native lazy loading
<img src="image.jpg" loading="lazy">

// Intersection Observer for custom lazy loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

### Critical CSS

Inline above-the-fold CSS, defer the rest:

```html
<head>
  <style>
    /* Critical CSS inlined */
    body { margin: 0; font-family: sans-serif; }
    .header { height: 60px; background: #333; }
  </style>
  
  <!-- Non-critical CSS deferred -->
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="styles.css"></noscript>
</head>
```

## JavaScript Performance

### Debouncing & Throttling

```javascript
// Debounce - execute after delay
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage
const handleSearch = debounce((query) => {
  // Search logic
}, 300);

// Throttle - execute at most once per interval
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage
const handleScroll = throttle(() => {
  // Scroll logic
}, 100);
```

### Long Tasks

Break up with `requestIdleCallback`:

```javascript
function processLargeArray(items) {
  let index = 0;
  
  function processChunk() {
    const deadline = performance.now() + 50; // 50ms budget
    
    while (index < items.length && performance.now() < deadline) {
      // Process item
      processItem(items[index]);
      index++;
    }
    
    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }
  
  requestIdleCallback(processChunk);
}
```

### Web Workers

Offload heavy computation:

```javascript
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: largeDataset });

worker.onmessage = (event) => {
  console.log('Result:', event.data);
};

// worker.js
self.onmessage = (event) => {
  const result = heavyComputation(event.data);
  self.postMessage(result);
};
```

## Performance Monitoring

### Performance API

```javascript
// Navigation timing
const navTiming = performance.getEntriesByType('navigation')[0];
console.log('DOM loaded:', navTiming.domContentLoadedEventEnd);
console.log('Page loaded:', navTiming.loadEventEnd);

// Resource timing
const resources = performance.getEntriesByType('resource');
resources.forEach(resource => {
  console.log(resource.name, resource.duration);
});

// Mark and measure custom timings
performance.mark('start-task');
// Do work
performance.mark('end-task');
performance.measure('task-duration', 'start-task', 'end-task');

const measure = performance.getEntriesByName('task-duration')[0];
console.log('Task took:', measure.duration, 'ms');

// Observer for performance entries
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance entry:', entry);
  }
});
observer.observe({ entryTypes: ['measure', 'mark', 'resource'] });
```

### Web Vitals Library

```javascript
import { getLCP, getFID, getCLS } from 'web-vitals';

getLCP(console.log);
getFID(console.log);
getCLS(console.log);
```

## CDN (Content Delivery Network)

Distribute content across global servers for faster delivery.

**Benefits**:
- Reduced latency
- Improved load times
- Better availability
- Reduced bandwidth costs

**Popular CDNs**:
- Cloudflare
- Amazon CloudFront
- Fastly
- Akamai

## Best Practices

### Do's
- ✅ Optimize images (format, compression, size)
- ✅ Minify and compress code
- ✅ Implement caching strategies
- ✅ Use CDN for static assets
- ✅ Lazy load non-critical resources
- ✅ Defer non-critical JavaScript
- ✅ Inline critical CSS
- ✅ Use HTTP/2 or HTTP/3
- ✅ Monitor Core Web Vitals
- ✅ Set performance budgets

### Don'ts
- ❌ Serve unoptimized images
- ❌ Block rendering with scripts
- ❌ Cause layout shifts
- ❌ Make excessive HTTP requests
- ❌ Load unused code
- ❌ Use synchronous operations on main thread
- ❌ Ignore performance metrics
- ❌ Forget mobile performance

## Glossary Terms

**Key Terms Covered**:
- bfcache
- Bandwidth
- Brotli compression
- Code splitting
- Compression Dictionary Transport
- Cumulative Layout Shift (CLS)
- Delta
- First Contentful Paint (FCP)
- First CPU idle
- First Input Delay (FID)
- First Meaningful Paint (FMP)
- First Paint (FP)
- Graceful degradation
- gzip compression
- Interaction to Next Paint (INP)
- Jank
- Jitter
- Largest Contentful Paint (LCP)
- Latency
- Lazy load
- Long task
- Lossless compression
- Lossy compression
- Minification
- Network throttling
- Page load time
- Page prediction
- Perceived performance
- Prefetch
- Prerender
- Progressive enhancement
- RAIL
- Real User Monitoring (RUM)
- Reflow
- Render-blocking
- Repaint
- Resource Timing
- Round Trip Time (RTT)
- Server Timing
- Speed index
- Speculative parsing
- Synthetic monitoring
- Time to First Byte (TTFB)
- Time to Interactive (TTI)
- Tree shaking
- Web performance
- Zstandard compression

## Additional Resources

- [Web.dev Performance](https://web.dev/performance/)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [WebPageTest](https://www.webpagetest.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
