# Browsers & Engines Reference

Web browsers, rendering engines, and browser-specific information.

## Major Browsers

### Google Chrome

**Engine**: Blink (rendering), V8 (JavaScript)  
**Released**: 2008  
**Market Share**: ~65% (desktop)  

**Developer Tools**: 
- Elements panel
- Console
- Network tab
- Performance profiler
- Lighthouse audits

### Mozilla Firefox

**Engine**: Gecko (rendering), SpiderMonkey (JavaScript)  
**Released**: 2004  
**Market Share**: ~3% (desktop)  

**Features**:
- Strong privacy focus
- Container tabs
- Enhanced tracking protection
- Developer Edition

### Apple Safari

**Engine**: WebKit (rendering), JavaScriptCore (JavaScript)  
**Released**: 2003  
**Market Share**: ~20% (desktop), dominant on iOS  

**Features**:
- Energy efficient
- Privacy-focused
- Intelligent Tracking Prevention
- Only browser allowed on iOS

### Microsoft Edge

**Engine**: Blink (Chromium-based since 2020)  
**Released**: 2015 (EdgeHTML), 2020 (Chromium)  

**Features**:
- Windows integration
- Collections
- Vertical tabs
- IE Mode (compatibility)

### Opera

**Engine**: Blink  
**Based on**: Chromium  

**Features**:
- Built-in VPN
- Ad blocker
- Sidebar

## Rendering Engines

### Blink

**Used by**: Chrome, Edge, Opera, Vivaldi  
**Forked from**: WebKit (2013)  
**Language**: C++  

### WebKit

**Used by**: Safari  
**Origin**: KHTML (KDE)  
**Language**: C++  

### Gecko

**Used by**: Firefox  
**Developed by**: Mozilla  
**Language**: C++, Rust  

### Legacy Engines

- **Trident**: Internet Explorer (deprecated)
- **EdgeHTML**: Original Edge (deprecated)
- **Presto**: Old Opera (deprecated)

## JavaScript Engines

| Engine | Browser | Language |
|--------|---------|----------|
| V8 | Chrome, Edge | C++ |
| SpiderMonkey | Firefox | C++, Rust |
| JavaScriptCore | Safari | C++ |
| Chakra | IE/Edge (legacy) | C++ |

### V8 Features

- JIT compilation
- Inline caching
- Hidden classes
- Garbage collection
- WASM support

## Browser DevTools

### Chrome DevTools

```javascript
// Console API
console.log('message');
console.table(array);
console.time('label');
console.timeEnd('label');

// Command Line API
$() // document.querySelector()
$$() // document.querySelectorAll()
$x() // XPath query
copy(object) // Copy to clipboard
monitor(function) // Log function calls
```

**Panels**:
- Elements: DOM inspection
- Console: JavaScript console
- Sources: Debugger
- Network: HTTP requests
- Performance: Profiling
- Memory: Heap snapshots
- Application: Storage, service workers
- Security: Certificate  info
- Lighthouse: Audits

### Firefox DevTools

**Unique Features**:
- CSS Grid Inspector
- Font Editor
- Accessibility Inspector
- Network throttling

## Cross-Browser Compatibility

### Browser Prefixes (Vendor Prefixes)

```css
/* Legacy - use autoprefixer instead */
.element {
  -webkit-transform: rotate(45deg); /* Chrome, Safari */
  -moz-transform: rotate(45deg); /* Firefox */
  -ms-transform: rotate(45deg); /* IE */
  -o-transform: rotate(45deg); /* Opera */
  transform: rotate(45deg); /* Standard */
}
```

**Modern approach**: Use build tools (Autoprefixer)

### User Agent String

```javascript
// Check browser
const userAgent = navigator.userAgent;

if (userAgent.includes('Firefox')) {
  // Firefox-specific code
} else if (userAgent.includes('Chrome')) {
  // Chrome-specific code
}

// Better: Feature detection
if ('serviceWorker' in navigator) {
  // Modern browser
}
```

### Graceful Degradation vs Progressive Enhancement

**Graceful Degradation**: Build for modern, degrade for old

```css
.container {
  display: grid; /* Modern browsers */
  display: block; /* Fallback */
}
```

**Progressive Enhancement**: Build base, enhance for modern

```css
.container {
  display: block; /* Base */
}

@supports (display: grid) {
  .container {
    display: grid; /* Enhancement */
  }
}
```

## Browser Features

### Service Workers

Background scripts for offline functionality

**Supported**: All modern browsers

### WebAssembly

Binary instruction format for web

**Supported**: All modern browsers

### Web Components

Custom HTML elements

**Supported**: All modern browsers (with polyfills)

### WebRTC

Real-time communication

**Supported**: All modern browsers

## Browser Storage

| Storage | Size | Expiration | Scope |
|---------|------|------------|-------|
| Cookies | 4KB | Configurable | Domain |
| LocalStorage | 5-10MB | Never | Origin |
| SessionStorage | 5-10MB | Tab close | Origin |
| IndexedDB | 50MB+ | Never | Origin |

## Mobile Browsers

### iOS Safari

- Only browser allowed on iOS
- All iOS browsers use WebKit
- Different from desktop Safari

### Chrome Mobile (Android)

- Blink engine
- Similar to desktop Chrome

### Samsung Internet

- Based on Chromium
- Popular on Samsung devices

## Browser Market Share (2026)

**Desktop**:
- Chrome: ~65%
- Safari: ~20%
- Edge: ~5%
- Firefox: ~3%
- Other: ~7%

**Mobile**:
- Chrome: ~65%
- Safari: ~25%
- Samsung Internet: ~5%
- Other: ~5%

## Testing Browsers

### Tools

- **BrowserStack**: Cloud browser testing
- **Sauce Labs**: Automated testing
- **CrossBrowserTesting**: Live testing
- **LambdaTest**: Cross-browser testing

### Virtual Machines

- **VirtualBox**: Free virtualization
- **Parallels**: Mac virtualization
- **Windows Dev VMs**: Free Windows VMs

## Developer Features

### Chromium-based Developer Features

- **Remote Debugging**: Debug mobile devices
- **Workspaces**: Edit files directly
- **Snippets**: Reusable code snippets
- **Coverage**: Unused code detection

### Firefox Developer Edition

- **CSS Grid Inspector**
- **Flexbox Inspector**
- **Font Panel**
- **Accessibility Audits**

## Browser Extensions

### Manifest V3 (Modern)

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

## Glossary Terms

**Key Terms Covered**:
- Apple Safari
- Blink
- blink element
- Browser
- Browsing context
- Chrome
- Developer tools
- Engine
- Firefox OS
- Gecko
- Google Chrome
- JavaScript engine
- Microsoft Edge
- Microsoft Internet Explorer
- Mozilla Firefox
- Netscape Navigator
- Opera browser
- Presto
- Rendering engine
- Trident
- User agent
- Vendor prefix
- WebKit

## Additional Resources

- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [Safari Web Inspector](https://developer.apple.com/safari/tools/)
- [Can I Use](https://caniuse.com/)
- [Browser Market Share](https://gs.statcounter.com/)
