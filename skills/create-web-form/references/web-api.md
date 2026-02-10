# Web API Reference

> Source: <https://developer.mozilla.org/en-US/docs/Web/API>

## Overview

Web APIs are programming interfaces available to developers for web applications, typically used with JavaScript. They enable building modern web applications with capabilities previously restricted to native apps (camera access, offline support, background processing, and more).

## API Categories

### Audio and Accessibility

- **Audio Output Devices API** -- Select audio output devices (Experimental).

### Background and Bluetooth

- **Background Fetch API** -- Manage long-running downloads.
- **Background Synchronization API** -- Sync data in the background.
- **Badging API** -- Display badges on app icons.
- **Beacon API** -- Send analytics data.
- **Web Bluetooth API** -- Connect to Bluetooth devices.

### Canvas, CSS, and Communication

- **Canvas API** -- 2D drawing on web pages.
- **CSS APIs** (Painting, Font Loading, Typed Object Model).
- **Clipboard API** -- Access clipboard data.
- **Console API** -- Debugging tools.
- **Cookie Store API** -- Manage cookies.
- **Credential Management API** -- Handle authentication.

### DOM and Device

- **Document Object Model (DOM)** -- Core web API for manipulating page structure.
- **Device Motion/Orientation Events** -- Access device sensors.
- **Device Memory API** -- Detect device capabilities.

### Fetch and File System

- **Fetch API** -- Modern HTTP requests.
- **File API** -- Access file data.
- **File System API** -- Work with local files.
- **Fullscreen API** -- Enter fullscreen mode.

### Geolocation and Graphics

- **Geolocation API** -- Get user location.
- **Gamepad API** -- Connect game controllers.
- **WebGL** -- 3D graphics rendering.
- **WebGPU API** -- GPU computing.

### History and HTML

- **History API** -- Navigate browser history.
- **HTML DOM API** -- Manipulate HTML elements.
- **HTML Drag and Drop API** -- Native drag-and-drop support.

### Input and IndexedDB

- **IndexedDB API** -- Client-side structured database.
- **Intersection Observer API** -- Track element visibility.

### Media and MediaStream

- **Media Capture and Streams API** -- Access camera and microphone.
- **MediaStream Recording API** -- Record audio and video.
- **Media Session API** -- Control playback.
- **Media Source Extensions** -- Stream media content.

### Navigation and Network

- **Navigation API** -- Client-side routing.
- **Network Information API** -- Detect connection type.

### Payment and Performance

- **Payment Request API** -- Checkout processing.
- **Performance APIs** -- Monitor application performance.
- **Permissions API** -- Request feature permissions.
- **Picture-in-Picture API** -- Float video players.
- **Pointer Events** -- Handle input devices.
- **Push API** -- Receive push notifications.

### Storage and Sensors

- **Service Worker API** -- Offline functionality.
- **Storage API** -- Persistent storage.
- **Streams API** -- Work with data streams.
- **Screen Capture API** -- Record screen content.

### Video and Virtual Reality

- **ViewTransition API** -- Animate page transitions.
- **WebXR Device API** -- VR/AR experiences.

### WebSocket and Web Workers

- **WebSocket API** -- Real-time bidirectional communication.
- **Web Workers API** -- Background processing.
- **Web Audio API** -- Audio processing and synthesis.
- **Web Authentication API** -- WebAuthn support.
- **Web Storage API** -- `localStorage` and `sessionStorage`.

### XML

- **XMLHttpRequest API** -- Legacy HTTP requests (largely superseded by Fetch).

## Key Interface Examples

### Core DOM Interfaces

```javascript
Document, Element, HTMLElement
Node, NodeList
DocumentFragment
Attr, NamedNodeMap
```

### Event Handling

```javascript
Event, EventTarget, CustomEvent
MouseEvent, KeyboardEvent, TouchEvent
PointerEvent, DragEvent
```

### Async Operations

```javascript
// Promise-based APIs
AbortController, AbortSignal
Fetch, Request, Response
```

### Media and Graphics

```javascript
HTMLMediaElement, AudioContext
Canvas, CanvasRenderingContext2D
WebGL2RenderingContext, GPU
```

### Storage and Databases

```javascript
Storage             // localStorage, sessionStorage
IndexedDB           // IDBDatabase, IDBTransaction
CacheStorage        // Service Worker caching
```

## Key Concepts

1. **Progressive Enhancement** -- APIs gracefully degrade on older browsers.
2. **Standards-based** -- Follow W3C and WHATWG specifications.
3. **Experimental APIs** -- Marked for features still in development; may change or be removed.
4. **Deprecated APIs** -- Legacy features being phased out; avoid in new projects.
5. **Non-standard APIs** -- Browser-specific implementations; use with caution.

## Important Notes

- Web APIs are typically used with JavaScript but are not limited to it.
- Many APIs require **user permission** (Geolocation, Camera, Microphone).
- Some APIs are **experimental** and may change or be removed.
- Browser support varies by API -- always check compatibility before use.
- Older deprecated APIs should be avoided in new projects.
