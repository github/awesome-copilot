# Web Protocols & Standards Reference

Organizations, specifications, and standards that govern the web.

## Standards Organizations

### W3C (World Wide Web Consortium)

International community developing web standards.

**Key Standards**:
- HTML
- CSS
- XML
- SVG
- WCAG (Accessibility)
- Web APIs

**Website**: https://www.w3.org/

### WHATWG (Web Hypertext Application Technology Working Group)

Community maintaining HTML and DOM Living Standards.

**Key Standards**:
- HTML Living Standard
- DOM Living Standard
- Fetch Standard
- URL Standard

**Website**: https://whatwg.org/

### IETF (Internet Engineering Task Force)

Develops internet standards.

**Key Standards**:
- HTTP
- TLS
- TCP/IP
- DNS
- WebRTC protocols

**Website**: https://www.ietf.org/

### ECMA International

Standards organization for information systems.

**Key Standards**:
- ECMAScript (JavaScript)
- JSON

**Website**: https://www.ecma-international.org/

### TC39 (Technical Committee 39)

ECMAScript standardization committee.

**Proposal Stages**:
- **Stage 0**: Strawperson
- **Stage 1**: Proposal
- **Stage 2**: Draft
- **Stage 3**: Candidate
- **Stage 4**: Finished (included in next version)

### IANA (Internet Assigned Numbers Authority)

Coordinates internet protocol resources.

**Responsibilities**:
- MIME types
- Port numbers
- Protocol parameters
- TLDs (Top-Level Domains)

### ICANN (Internet Corporation for Assigned Names and Numbers)

Coordinates DNS and IP addresses.

## Web Standards

### HTML Standards

**HTML5 Features**:
- Semantic elements (`<article>`, `<section>`, etc.)
- Audio and video elements
- Canvas and SVG
- Form enhancements
- LocalStorage and SessionStorage
- Web Workers
- Geolocation API

### CSS Specifications

**CSS Modules** (each specification is a module):
- CSS Selectors Level 4
- CSS Flexbox Level 1
- CSS Grid Level 2
- CSS Animations
- CSS Transitions
- CSS Custom Properties

### JavaScript Standards

**ECMAScript Versions**:
- **ES5** (2009): Strict mode, JSON
- **ES6/ES2015**: Classes, modules, arrow functions, promises
- **ES2016**: Array.includes(), **
- **ES2017**: async/await, Object.values/entries
- **ES2018**: Rest/spread for objects, async iteration
- **ES2019**: Array.flat(), Object.fromEntries
- **ES2020**: Optional chaining, nullish coalescing, BigInt
- **ES2021**: Logical assignment, Promise.any
- **ES2022**: Top-level await, class fields
- **ES2023**: Array.findLast(), Object.groupBy

### Web API Specifications

**Common APIs**:
- DOM (Document Object Model)
- Fetch API
- Service Workers
- Web Storage
- IndexedDB
- WebRTC
- WebGL
- Web Audio API
- Payment Request API
- Web Authentication API

## Specifications

### Normative vs Non-Normative

- **Normative**: Required for compliance
- **Non-normative**: Informative only (examples, notes)

### Specification Lifecycle

1. **Editor's Draft**: Work in progress
2. **Working Draft**: Community review
3. **Candidate Recommendation**: Implementation and testing
4. **Proposed Recommendation**: Final review
5. **W3C Recommendation**: Official standard

## Browser Compatibility

### Feature Detection

```javascript
// Check feature support
if ('serviceWorker' in navigator) {
  // Use service workers
}

if (window.IntersectionObserver) {
  // Use Intersection Observer
}

if (CSS.supports('display', 'grid')) {
  // Use CSS Grid
}
```

### Baseline Compatibility

Newly standardized features achieving widespread browser support.

**Widely Available**: Firefox, Chrome, Edge, Safari support

### Polyfills

Code providing modern functionality in older browsers:

```javascript
// Promise polyfill
if (!window.Promise) {
  window.Promise = PromisePolyfill;
}

// Fetch polyfill
if (!window.fetch) {
  window.fetch = fetchPolyfill;
}
```

### Progressive Enhancement

Build for basic browsers, enhance for modern ones:

```css
/* Base styles */
.container {
  display: block;
}

/* Enhanced for Grid support */
@supports (display: grid) {
  .container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## IDL (Interface Definition Language)

**WebIDL**: Defines Web APIs

```webidl
interface Element : Node {
  readonly attribute DOMString? tagName;
  DOMString? getAttribute(DOMString qualifiedName);
  undefined setAttribute(DOMString qualifiedName, DOMString value);
};
```

## Specifications to Know

- **HTML Living Standard**
- **CSS Specifications** (modular)
- **ECMAScript Language Specification**
- **HTTP/1.1 (RFC 7230-7237)**
- **HTTP/2 (RFC 7540)**
- **HTTP/3 (RFC 9114)**
- **TLS 1.3 (RFC 8446)**
- **WebSocket Protocol (RFC 6455)**
- **CORS (Fetch Standard)**
- **Service Workers**
- **Web Authentication (WebAuthn)**

## Glossary Terms

**Key Terms Covered**:
- Baseline (compatibility)
- BCP 47 language tag
- ECMA
- ECMAScript
- HTML5
- IANA
- ICANN
- IDL
- IETF
- ISO
- ITU
- Non-normative
- Normative
- Polyfill
- Shim
- Specification
- W3C
- WAI
- WCAG
- WHATWG
- Web standards
- WebIDL

## Additional Resources

- [W3C Standards](https://www.w3.org/TR/)
- [WHATWG Living Standards](https://spec.whatwg.org/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Can I Use](https://caniuse.com/)
- [TC39 Proposals](https://github.com/tc39/proposals)
