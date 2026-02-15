# Web Performance Reference

A consolidated reference guide covering web performance concepts, optimization techniques, and the Performance API, sourced from the Mozilla Developer Network (MDN).

---

## Table of Contents

1. [Web Performance Overview](#1-web-performance-overview)
2. [Performance Fundamentals](#2-performance-fundamentals)
3. [Performance Best Practices](#3-performance-best-practices)
4. [HTML Performance](#4-html-performance)
5. [JavaScript Performance](#5-javascript-performance)
6. [CSS Performance](#6-css-performance)
7. [Performance API](#7-performance-api)
8. [Performance Data](#8-performance-data)
9. [Server Timing](#9-server-timing)
10. [User Timing](#10-user-timing)

---

## 1. Web Performance Overview

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/Performance>

### Definition

**Web performance** encompasses:

- Objective measurements (load time, frames per second, time to interactive)
- Perceived user experience of load and response times
- Smoothness during user interactions (scrolling, animations, button responsiveness)

### Recommended Timings

| Target | Threshold |
|--------|-----------|
| Page load indication | 1 second |
| Idling | 50ms |
| Animations | 16.7ms (60 FPS) |
| User input response | 50-200ms |

Users abandon sites that respond slowly. The goal is to minimize loading and response times while adding features that conceal latency by maximizing availability and interactivity as soon as possible.

### Key Performance Metrics

| Metric | Full Name | Definition |
|--------|-----------|------------|
| **FCP** | First Contentful Paint | First time any content appears |
| **LCP** | Largest Contentful Paint | Largest content element visible |
| **CLS** | Cumulative Layout Shift | Visual stability during interactions |
| **INP** | Interaction to Next Paint | Responsiveness to user input |
| **TTFB** | Time to First Byte | Server response time |
| **TTI** | Time to Interactive | Page becomes fully interactive |
| **Jank** | -- | Non-smooth animation or scrolling |

### Performance API Categories

- **High-precision timing**: Sub-millisecond monitoring via stable monotonic clock
- **Navigation Timing**: Metrics for page navigation (DOMContentLoaded, load time)
- **Resource Timing**: Detailed network timing for individual resources
- **User Timing**: Custom marks and measures
- **Long Animation Frames (LoAF)**: Identifies janky animations
- **Server Timing**: Backend performance metrics

### Related Browser APIs

- **Page Visibility API**: Track document visibility state
- **Background Tasks API** (`requestIdleCallback()`): Queue non-blocking tasks
- **Intersection Observer API**: Asynchronously monitor element visibility
- **Network Information API**: Detect connection type for adaptive content
- **Battery Status API**: Optimize for power-constrained devices
- **Beacon API**: Send performance data to analytics
- **Media Capabilities API**: Check device media support

### Resource Loading Hints

- **DNS-prefetch**: Pre-resolve domain names
- **Preconnect**: Establish early connections
- **Prefetch**: Load resources before needed
- **Preload**: Load critical resources early

### Monitoring Approaches

- **Real User Monitoring (RUM)**: Long-term trend analysis from actual users
- **Synthetic Monitoring**: Controlled regression testing during development

---

## 2. Performance Fundamentals

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance>

### Why Web Performance Matters

- Promotes accessibility and inclusive design
- Enhances user experience and retention
- Directly impacts business goals and conversions

### Core Components

- Web page loading performance
- Content rendering in browsers
- User agent capabilities and constraints
- Performance across different user groups

### Perceived Performance

Metrics focused on user perception rather than raw milliseconds:

- **Page load time** -- initial content availability
- **Responsiveness** -- interaction feedback speed
- **Animation smoothness** -- visual fluidity
- **Scrolling smoothness** -- scroll interaction quality

### Optimization Areas

| Area | Focus | Impact |
|------|-------|--------|
| **Multimedia (Images)** | Media optimization based on device capability, size, pixel density | Reduces bytes per image |
| **Multimedia (Video)** | Video compression, audio track removal from background videos | Reduces file size |
| **JavaScript** | Best practices for interactive experiences | Improves responsiveness, battery life |
| **HTML** | DOM node minimization, optimal attribute ordering | Improves load and render time |
| **CSS** | Feature-specific optimization | Prevents negative performance impact |

### Performance Strategy

- **Performance budgets**: Set limits on asset sizes
- **Performance culture**: Organizational commitment
- **Regression prevention**: Avoid bloat over time
- **Mobile-first approaches**: Responsive images and adaptive media delivery

---

## 3. Performance Best Practices

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Best_practices>

### Core Best Practices

1. **Learn the Critical Rendering Path** -- Understand how browsers render pages to optimize performance
2. **Use Resource Hints** -- `rel=preconnect`, `rel=dns-prefetch`, `rel=prefetch`, `rel=preload`
3. **Minimize JavaScript** -- Only load JavaScript needed for the current page
4. **Optimize CSS** -- Address CSS performance factors, load CSS asynchronously when possible
5. **Use HTTP/2** -- Deploy HTTP/2 on your server or CDN
6. **Use a CDN** -- Significantly reduces resource load times
7. **Compress Resources** -- Use gzip, Brotli, or Zopfli compression
8. **Optimize Images** -- Use CSS animations or SVG when possible
9. **Implement Lazy Loading** -- Load content outside viewport lazily; use the `loading` attribute on `<img>` elements
10. **Focus on User Perception** -- Perceived performance matters as much as actual timing

### Asynchronous CSS Loading

```html
<link
  id="my-stylesheet"
  rel="stylesheet"
  href="/path/to/my.css"
  media="print" />
<noscript><link rel="stylesheet" href="/path/to/my.css" /></noscript>
```

```javascript
const stylesheet = document.getElementById("my-stylesheet");
stylesheet.addEventListener("load", () => {
  stylesheet.media = "all";
});
```

### Critical CSS Inlining

- Inline CSS for above-the-fold content using `<style>` tags
- Prevents Flash of Unstyled Text (FOUT)
- Improves perceived performance

### JavaScript Loading

- Use `async` or `defer` attributes on script tags
- JavaScript only blocks rendering for elements after the script tag in the DOM

### Web Font Best Practices

1. **Font Format Selection**: Use WOFF and WOFF2 (built-in compression); compress EOT and TTF with gzip or Brotli
2. **Font Loading Strategy**: Use `font-display: swap` to prevent rendering blocks; optimize `font-weight` to match the web font closely
3. **Avoid Icon Fonts**: Use compressed SVG instead; inline SVG data in HTML to avoid additional HTTP requests

### Tools and Measurement

- [Firefox Dev Tools](https://firefox-source-docs.mozilla.org/devtools-user/performance/index.html)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [WebPageTest.org](https://www.webpagetest.org/)
- [Chrome User Experience Report](https://developer.chrome.com/docs/crux/)
- `window.performance.timing` (native Performance API)

### Practices to Avoid

- Downloading everything unnecessarily
- Using uncompressed media files

---

## 4. HTML Performance

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/HTML>

### Main HTML-Related Performance Bottlenecks

- Image and video file sizes (replaced elements)
- Embedded content delivery (`<iframe>` elements)
- Resource loading order

### Responsive Image Handling

**Using `srcset` and `sizes` for different screen widths:**

```html
<img
  srcset="480w.jpg 480w, 800w.jpg 800w"
  sizes="(width <= 600px) 480px, 800px"
  src="800w.jpg"
  alt="Family portrait" />
```

**Using `srcset` for different device resolutions:**

```html
<img
  srcset="320w.jpg, 480w.jpg 1.5x, 640w.jpg 2x"
  src="640w.jpg"
  alt="Family portrait" />
```

**Using the `<picture>` element:**

```html
<picture>
  <source media="(width < 800px)" srcset="narrow-banner-480w.jpg" />
  <source media="(width >= 800px)" srcset="wide-banner-800w.jpg" />
  <img src="large-banner-800w.jpg" alt="Dense forest scene" />
</picture>
```

### Lazy Loading

**Images:**

```html
<img src="800w.jpg" alt="Family portrait" loading="lazy" />
```

**Video (disable preload):**

```html
<video controls preload="none" poster="poster.jpg">
  <source src="video.webm" type="video/webm" />
  <source src="video.mp4" type="video/mp4" />
</video>
```

**Iframes:**

```html
<iframe src="https://example.com" loading="lazy" width="600" height="400"></iframe>
```

### Iframe Best Practices

Avoid embedded `<iframe>` elements unless absolutely necessary. Problems include:

- Extra HTTP requests required
- Creates a separate page instance (expensive)
- Cannot share cached assets
- Separate CSS and JavaScript handling required

**Alternative:** Use `fetch()` and DOM scripting to load content into the same page.

### JavaScript Loading in HTML

**`async` attribute** -- fetches in parallel with DOM parsing, does not block rendering:

```html
<script async src="index.js"></script>
```

**`defer` attribute** -- executes after document parsing but before `DOMContentLoaded` event.

**Module loading** -- split code into modules and load parts as needed.

### Resource Preloading

```html
<link rel="preload" href="sintel-short.mp4" as="video" type="video/mp4" />
```

Other `rel` attributes for performance:

- `rel="dns-prefetch"` -- prefetch DNS lookups
- `rel="preconnect"` -- pre-establish connections
- `rel="modulepreload"` -- preload JavaScript modules
- `rel="prefetch"` -- load resources for future navigation

### Resource Loading Order

1. **HTML** is parsed first in source order
2. **CSS** is parsed; linked assets (images, fonts) start fetching
3. **JavaScript** is parsed and executed (blocks subsequent HTML parsing by default)
4. **Styling** is computed for HTML elements
5. **Rendering** of styled content to the screen

### Key Takeaway

HTML is simple and fast by default. Focus on:

- Minimizing bytes downloaded (images and videos)
- Controlling asset loading order (async, defer, preload)
- Reducing unnecessary embedded content (iframes)
- Responsive serving of replaced elements (srcset, picture, media queries)

HTML file size minification provides negligible benefits compared to optimizing media assets.

---

## 5. JavaScript Performance

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript>

### Core Principle

**Measure first.** Use browser network and performance tools to identify what actually needs optimizing before implementing techniques.

### Optimizing Downloads

- **Use minimal JavaScript** -- avoid frameworks for static experiences
- **Remove unused code** -- delete functionality not being used
- **Leverage built-in browser features**: built-in form validation, native `<video>` players, CSS animations instead of JavaScript libraries
- **Minification** -- reduces file character count and bytes
- **Compression** -- gzip (standard) or Brotli (generally outperforms gzip)
- **Module bundlers** -- use webpack for optimization and code splitting

### Loading Critical Assets Early

```html
<!-- Preload standard JavaScript -->
<link rel="preload" href="important-js.js" as="script" />

<!-- Preload JavaScript module -->
<link rel="modulepreload" href="important-module.js" />
```

### Deferring Non-Critical JavaScript

**Async:**

```html
<script async src="main.js"></script>
```

**Defer:**

```html
<script defer src="main.js"></script>
```

**Dynamic loading:**

```javascript
const scriptElem = document.createElement("script");
scriptElem.src = "index.js";
scriptElem.addEventListener("load", () => {
  init();
});
document.head.append(scriptElem);
```

**Dynamic module import:**

```javascript
import("./modules/myModule.js").then((module) => {
  // Use the loaded module
});
```

### Breaking Down Long Tasks

Tasks taking more than 50ms are "long tasks" that block the main thread. Use task yielding:

```javascript
function yieldFunc() {
  if ("scheduler" in window && "yield" in scheduler) {
    return scheduler.yield();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function main() {
  const tasks = [a, b, c, d, e];
  while (tasks.length > 0) {
    const task = tasks.shift();
    task();
    await yieldFunc();
  }
}
```

### Animation Best Practices

- Reduce non-essential animations
- Provide an opt-out for users on low-power devices
- Prefer CSS animations over JavaScript (much faster and more efficient)
- For canvas animations, use `requestAnimationFrame()`:

```javascript
function loop() {
  ctx.fillStyle = "rgb(0 0 0 / 25%)";
  ctx.fillRect(0, 0, width, height);
  for (const ball of balls) {
    ball.draw();
    ball.update();
  }
  requestAnimationFrame(loop);
}
loop();
```

### Event Performance

- Remove unnecessary event listeners with `removeEventListener()`
- Use event delegation (single listener on parent instead of multiple on children):

```javascript
parent.addEventListener("click", (event) => {
  if (event.target.matches(".child")) {
    // Handle child click
  }
});
```

### Efficient Code Patterns

**Batch DOM changes:**

```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < items.length; i++) {
  const li = document.createElement("li");
  li.textContent = items[i];
  fragment.appendChild(li);
}
ul.appendChild(fragment); // Single DOM operation
```

**Exit loops early:**

```javascript
for (let i = 0; i < array.length; i++) {
  if (array[i] === toFind) {
    processMatchingArray(array);
    break;
  }
}
```

**Move work outside loops:**

```javascript
// Fetch once, iterate in-memory
const response = await fetch(`/results?number=${number}`);
const results = await response.json();
for (let i = 0; i < number; i++) {
  processResult(results[i]);
}
```

### Offload Computation

- **Asynchronous JavaScript** -- `async`/`await` for non-blocking I/O
- **Web Workers** -- offload heavy computation to a separate thread
- **WebGPU** -- use the system GPU for high-performance computations

---

## 6. CSS Performance

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS>

### Rendering and CSSOM Optimization

**Remove unnecessary styles:**

- Parse only used CSS rules
- Clean up unused styles added during development

**Split CSS into separate modules:**

```html
<!-- Render-blocking -->
<link rel="stylesheet" href="styles.css" />

<!-- Non-blocking with media queries -->
<link rel="stylesheet" href="print.css" media="print" />
<link rel="stylesheet" href="mobile.css" media="screen and (width <= 480px)" />
```

**Minify and compress CSS** as part of the build process with gzip compression on servers.

**Simplify selectors:**

```css
/* Avoid overly complex selectors */
body div#main-content article.post h2.headline {
  font-size: 24px;
}

/* Prefer simple selectors */
.headline {
  font-size: 24px;
}
```

**Avoid universal over-application:**

```css
/* Problematic */
body * {
  font-size: 14px;
  display: flex;
}
```

**Reduce HTTP requests with CSS sprites** -- combine multiple small images into one file and use `background-position`.

**Preload critical assets:**

```html
<link rel="preload" href="style.css" as="style" />
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
```

### Animation Performance

**Properties that cause reflow/repaint (avoid animating):**

- Dimensions: `width`, `height`, `border`, `padding`
- Position: `margin`, `top`, `bottom`, `left`, `right`
- Layout: `align-content`, `align-items`, `flex`
- Visual effects: `box-shadow`

**Safe properties to animate (GPU-accelerated):**

- `transform`
- `opacity`
- `filter`

**Respect user preferences:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Advanced Optimization

**`will-change` property** (use as a last resort only):

```css
.element {
  will-change: opacity, transform;
}
```

**CSS Containment:**

```css
article {
  contain: content;
}
```

**`content-visibility` (skip rendering until needed):**

```css
article {
  content-visibility: auto;
  contain-intrinsic-size: 1000px;
}
```

### Font Performance

**Load important fonts early:**

```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
```

**Load only required glyphs:**

```css
@font-face {
  font-family: "Open Sans";
  src: url("font.woff2") format("woff2");
  unicode-range: U+0025-00FF;
}
```

**Define font display behavior:**

```css
@font-face {
  font-family: "someFont";
  src: url("font.woff") format("woff");
  font-display: fallback;
}
```

**Font tips:**

- Use only 2-3 fonts maximum
- Prefer web-safe fonts when possible
- Consider `rel="preconnect"` for third-party font providers

---

## 7. Performance API

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API>

### Overview

The Performance API is a group of standards used to measure web application performance. It provides built-in metrics and enables developers to add custom measurements to the browser's performance timeline with high-precision timestamps.

Available in both `Window` and `Worker` global scopes via `Window.performance` and `WorkerGlobalScope.performance`.

### Core Concepts

Each performance metric is represented by a `PerformanceEntry` with: `name`, `duration`, `startTime`, and `type`.

Most entries are automatically recorded and accessible via:

- `Performance.getEntries()`
- `PerformanceObserver` (preferred method)

### Main Interfaces

**Performance Management:**

- `Performance` -- main interface for accessing performance measurements
- `PerformanceEntry` -- base interface for all performance metrics
- `PerformanceObserver` -- listens for new performance entries as they are recorded

**Custom Measurements:**

- `PerformanceMark` -- custom markers on the performance timeline
- `PerformanceMeasure` -- custom measurements between two entries

**Built-in Metrics:**

| Interface | Purpose |
|-----------|---------|
| `PerformanceNavigationTiming` | Document navigation timings (load time, etc.) |
| `PerformanceResourceTiming` | Network metrics for resources (images, scripts, CSS, fetch calls) |
| `PerformancePaintTiming` | Render operations during page construction |
| `PerformanceEventTiming` | Event latency and Interaction to Next Paint (INP) |
| `LargestContentfulPaint` | Render time of largest visible content |
| `LayoutShift` | Page layout stability metrics |
| `PerformanceLongTaskTiming` | Long-running tasks blocking rendering |
| `PerformanceLongAnimationFrameTiming` | Long animation frame metrics |
| `PerformanceServerTiming` | Server metrics from `Server-Timing` HTTP header |

### Usage Pattern

```javascript
// Using PerformanceObserver (recommended)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({ entryTypes: ["navigation", "resource", "paint"] });

// Custom measurements
performance.mark("start-operation");
// ... perform work ...
performance.mark("end-operation");
performance.measure("operation-duration", "start-operation", "end-operation");
```

---

## 8. Performance Data

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data>

### Types of Performance Entries

| Entry Type | Interface | Purpose |
|------------|-----------|---------|
| `"element"` | PerformanceElementTiming | Load and render time for specific DOM elements |
| `"event"` | PerformanceEventTiming | Browser response time to event triggers |
| `"first-input"` | PerformanceEventTiming | First Input Delay measurement |
| `"largest-contentful-paint"` | LargestContentfulPaint | Largest paint during page load |
| `"layout-shift"` | LayoutShift | Page layout shift metrics |
| `"longtask"` | PerformanceLongTaskTiming | Tasks taking 50ms or more |
| `"mark"` | PerformanceMark | Custom developer timestamps |
| `"measure"` | PerformanceMeasure | Custom measurements between timestamps |
| `"navigation"` | PerformanceNavigationTiming | Navigation and initial page load metrics |
| `"paint"` | PerformancePaintTiming | Key rendering moments during page load |
| `"resource"` | PerformanceResourceTiming | Resource fetch duration |
| `"visibility-state"` | VisibilityStateEntry | Tab visibility state changes |

### Accessing Performance Data

**Method 1: PerformanceObserver (preferred)**

```javascript
function logEventDuration(entries) {
  const events = entries.getEntriesByType("event");
  for (const event of events) {
    console.log(
      `Event handler took: ${event.processingEnd - event.processingStart} milliseconds`
    );
  }
}

const observer = new PerformanceObserver(logEventDuration);
observer.observe({ type: "event", buffered: true });
```

Advantages of PerformanceObserver:

- Automatically filters duplicate entries
- Asynchronous delivery during idle time
- Required for some entry types
- Lower performance impact

**Method 2: Direct query methods**

```javascript
performance.getEntries();              // All entries
performance.getEntriesByType(type);    // Entries of specific type
performance.getEntriesByName(name);    // Entries with specific name
```

### Performance Entry Buffer Sizes

| Entry Type | Max Buffer Size |
|------------|----------------|
| `"resource"` | 250 (adjustable) |
| `"longtask"` | 200 |
| `"element"` | 150 |
| `"event"` | 150 |
| `"layout-shift"` | 150 |
| `"largest-contentful-paint"` | 150 |
| `"visibility-state"` | 50 |
| `"mark"` | Infinite |
| `"measure"` | Infinite |
| `"navigation"` | Infinite |
| `"paint"` | 2 (fixed) |
| `"first-input"` | 1 (fixed) |

### Handling Dropped Entries

```javascript
function perfObserver(list, observer, droppedEntriesCount) {
  list.getEntries().forEach((entry) => {
    // process entries
  });
  if (droppedEntriesCount > 0) {
    console.warn(
      `${droppedEntriesCount} entries were dropped because the buffer was full.`
    );
  }
}
const observer = new PerformanceObserver(perfObserver);
observer.observe({ type: "resource", buffered: true });
```

### JSON Serialization

All performance entries provide a `toJSON()` method:

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.toJSON());
  });
});
observer.observe({ type: "event", buffered: true });
```

### Opt-In Metrics

Some metrics require explicit configuration:

- **Element Timing** -- add `elementtiming` attribute to elements
- **User Timing** -- call Performance API methods at relevant points
- **Server Timing** -- server sends `Server-Timing` HTTP header

---

## 9. Server Timing

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Server_timing>

### What is Server Timing?

Server Timing is part of the Performance API and allows servers to communicate metrics about the request-response cycle to the user agent. It surfaces backend server timing metrics such as database read/write times, CPU time, and file system access.

### Server-Timing HTTP Header Examples

```http
// Single metric without value
Server-Timing: missedCache

// Single metric with value
Server-Timing: cpu;dur=2.4

// Single metric with description and value
Server-Timing: cache;desc="Cache Read";dur=23.2

// Two metrics with values
Server-Timing: db;dur=53, app;dur=47.2

// Server-Timing as trailer
Trailer: Server-Timing
--- response body ---
Server-Timing: total;dur=123.4
```

### Retrieving Server Metrics in JavaScript

Server timing metrics are stored as `PerformanceServerTiming` entries, accessed within `"navigation"` and `"resource"` performance entries via the `PerformanceResourceTiming.serverTiming` property.

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    entry.serverTiming.forEach((serverEntry) => {
      console.log(
        `${serverEntry.name} (${serverEntry.description}) duration: ${serverEntry.duration}`
      );
      // Logs "cache (Cache Read) duration: 23.2"
      // Logs "db () duration: 53"
      // Logs "app () duration: 47.2"
    });
  });
});

["navigation", "resource"].forEach((type) =>
  observer.observe({ type, buffered: true })
);
```

### Privacy and Security Considerations

- The `Server-Timing` header may expose sensitive application and infrastructure information; metrics should only be returned to authenticated users
- `PerformanceServerTiming` is restricted to the same origin by default
- Use the `Timing-Allow-Origin` header to specify allowed cross-origin domains
- Only available in secure contexts (HTTPS) in some browsers
- There is no clock synchronization between server, client, and intermediate proxies; server timestamps may not meaningfully map to the client timeline `startTime`

---

## 10. User Timing

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing>

### Overview

User Timing is part of the Performance API and allows you to measure application performance using high-precision timestamps. It consists of two main components:

- **`PerformanceMark`** entries -- named marks at any location in an application
- **`PerformanceMeasure`** entries -- time measurements between two marks

### Adding Performance Markers

```javascript
// Basic marks
performance.mark("login-started");
performance.mark("login-finished");

// Advanced mark with options
performance.mark("login-started", {
  startTime: 12.5,
  detail: { htmlElement: myElement.id },
});
```

### Measuring Duration Between Markers

```javascript
const loginMeasure = performance.measure(
  "login-duration",
  "login-started",
  "login-finished"
);
console.log(loginMeasure.duration);
```

**Advanced measurement from an event timestamp to a mark:**

```javascript
loginButton.addEventListener("click", (clickEvent) => {
  fetch(loginURL).then((data) => {
    renderLoggedInUser(data);
    const marker = performance.mark("login-finished");
    performance.measure("login-click", {
      detail: { htmlElement: myElement.id },
      start: clickEvent.timeStamp,
      end: marker.startTime,
    });
  });
});
```

### Observing Performance Measures

```javascript
function perfObserver(list, observer) {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === "mark") {
      console.log(`${entry.name}'s startTime: ${entry.startTime}`);
    }
    if (entry.entryType === "measure") {
      console.log(`${entry.name}'s duration: ${entry.duration}`);
    }
  });
}
const observer = new PerformanceObserver(perfObserver);
observer.observe({ entryTypes: ["measure", "mark"] });
```

### Retrieving Markers and Measures

```javascript
// All entries
const entries = performance.getEntries();

// Filter by type
const marks = performance.getEntriesByType("mark");
const measures = performance.getEntriesByType("measure");

// Retrieve by name
const debugMarks = performance.getEntriesByName("debug-mark", "mark");
```

### Removing Markers and Measures

```javascript
// Clear all marks
performance.clearMarks();

// Remove specific mark
performance.clearMarks("myMarker");

// Clear all measures
performance.clearMeasures();

// Remove specific measure
performance.clearMeasures("myMeasure");
```

### Advantages Over Date.now() and performance.now()

- Meaningful names for better organization
- Integrates with browser developer tools (Performance Panels)
- Works seamlessly with other Performance APIs like `PerformanceObserver`
- Better tooling integration overall
