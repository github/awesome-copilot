# HTML Event Attributes Glossary

Complete reference for HTML event handler attributes (inline event handlers).

## What Are Event Attributes?

Event attributes (also called inline event handlers) are HTML attributes that execute JavaScript code when specific events occur. They all start with `on` followed by the event name (e.g., `onclick`, `onload`, `onsubmit`).

## ⚠️ Important Note

**Modern best practice**: Use JavaScript `.addEventListener()` instead of inline event attributes for better:
- **Separation of concerns** (HTML structure vs behavior)
- **Multiple handlers** per event
- **Easier maintenance**
- **Content Security Policy (CSP) compatibility**

```html
<!-- ❌ Avoid: Inline handler -->
<button onclick="alert('Clicked')">Click</button>

<!-- ✅ Prefer: Event listener -->
<button id="myBtn">Click</button>
<script>
  document.getElementById('myBtn').addEventListener('click', function() {
    alert('Clicked');
  });
</script>
```

## Window Events

Events that occur on the window object:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onafterprint` | After print dialog closes | `<body onafterprint="handleAfterPrint()">` |
| `onbeforeprint` | Before print dialog opens | `<body onbeforeprint="handleBeforePrint()">` |
| `onbeforeunload` | Before page unload | `<body onbeforeunload="return 'Leave page?'">` |
| `onerror` | When error occurs | `<body onerror="handleError()">` |
| `onhashchange` | When URL hash changes | `<body onhashchange="handleHashChange()">` |
| `onload` | When page/element loads | `<body onload="init()">` |
| `onmessage` | When message received (postMessage) | `<body onmessage="handleMessage()">` |
| `onoffline` | When browser goes offline | `<body onoffline="handleOffline()">` |
| `ononline` | When browser goes online | `<body ononline="handleOnline()">` |
| `onpagehide` | When navigating away | `<body onpagehide="handlePageHide()">` |
| `onpageshow` | When navigating to page | `<body onpageshow="handlePageShow()">` |
| `onpopstate` | When history state changes | `<body onpopstate="handlePopState()">` |
| `onresize` | When window is resized | `<body onresize="handleResize()">` |
| `onstorage` | When storage changes | `<body onstorage="handleStorage()">` |
| `onunload` | When page is unloaded | `<body onunload="cleanup()">` |

**Example**:
```html
<body onload="console.log('Page loaded')" onresize="console.log('Window resized')">
  <h1>Welcome</h1>
</body>
```

## Mouse Events

Events triggered by mouse actions:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onclick` | Element is clicked | `<button onclick="handleClick()">Click</button>` |
| `oncontextmenu` | Right-click (context menu) | `<div oncontextmenu="return false">No right-click</div>` |
| `ondblclick` | Element is double-clicked | `<div ondblclick="handleDoubleClick()">Double-click</div>` |
| `onmousedown` | Mouse button pressed down | `<button onmousedown="handleMouseDown()">Press</button>` |
| `onmouseenter` | Mouse enters element | `<div onmouseenter="highlight()">Hover</div>` |
| `onmouseleave` | Mouse leaves element | `<div onmouseleave="unhighlight()">Hover</div>` |
| `onmousemove` | Mouse moves over element | `<div onmousemove="trackMouse()">Move mouse</div>` |
| `onmouseout` | Mouse moves out (bubbles) | `<div onmouseout="handleOut()">Hover out</div>` |
| `onmouseover` | Mouse moves over (bubbles) | `<div onmouseover="handleOver()">Hover over</div>` |
| `onmouseup` | Mouse button released | `<button onmouseup="handleMouseUp()">Release</button>` |

**Mouse Event Differences**:
- **`onmouseenter` vs `onmouseover`**: `enter` doesn't bubble, `over` does
- **`onmouseleave` vs `onmouseout`**: `leave` doesn't bubble, `out` does
- **`onclick`**: Fires on mousedown + mouseup

**Example**:
```html
<button 
  onmouseenter="this.style.backgroundColor='blue'"
  onmouseleave="this.style.backgroundColor=''">
  Hover me
</button>
```

## Keyboard Events

Events triggered by keyboard actions:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onkeydown` | Key is pressed down | `<input onkeydown="handleKeyDown(event)">` |
| `onkeypress` | Key is pressed (deprecated) | `<input onkeypress="handleKeyPress(event)">` |
| `onkeyup` | Key is released | `<input onkeyup="handleKeyUp(event)">` |

**Note**: `onkeypress` is deprecated. Use `onkeydown` instead.

**Example**:
```html
<input 
  type="text" 
  onkeydown="if(event.key === 'Enter') submitForm()"
  placeholder="Press Enter to submit">
```

## Form Events

Events related to forms and form controls:

| Event Attribute | When It Fires | Applies To |
|-----------------|---------------|------------|
| `onblur` | Element loses focus | Input, textarea, select |
| `onchange` | Value changes and loses focus | Input, textarea, select |
| `onfocus` | Element gains focus | Input, textarea, select |
| `onfocusin` | Element about to gain focus (bubbles) | Input, textarea, select |
| `onfocusout` | Element about to lose focus (bubbles) | Input, textarea, select |
| `oninput` | Value changes (immediately) | Input, textarea |
| `oninvalid` | Input validation fails | Input, textarea, select |
| `onreset` | Form is reset | Form |
| `onsearch` | User initiates search | Input type="search" |
| `onselect` | Text is selected | Input, textarea |
| `onsubmit` | Form is submitted | Form |

**Event Differences**:
- **`oninput`**: Fires immediately on every change
- **`onchange`**: Fires when value changes AND element loses focus
- **`onblur` vs `onfocusout`**: `blur` doesn't bubble, `focusout` does
- **`onfocus` vs `onfocusin`**: `focus` doesn't bubble, `focusin` does

**Example**:
```html
<form onsubmit="return validateForm()">
  <input 
    type="text" 
    name="username"
    oninput="checkAvailability(this.value)"
    onblur="validateUsername(this.value)"
    onfocus="showHint()"
    required>
  <button type="submit">Submit</button>
</form>

<input 
  type="search" 
  onsearch="performSearch(this.value)"
  placeholder="Search...">
```

## Clipboard Events

Events triggered by clipboard operations:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `oncopy` | Content is copied | `<p oncopy="alert('Copied!')">Copy this</p>` |
| `oncut` | Content is cut | `<input oncut="handleCut()">` |
| `onpaste` | Content is pasted | `<input onpaste="handlePaste(event)">` |

**Example**:
```html
<input 
  type="text" 
  onpaste="event.preventDefault(); alert('Paste disabled')"
  placeholder="Cannot paste here">
```

## Drag Events

Events for drag-and-drop operations:

| Event Attribute | When It Fires | Target |
|-----------------|---------------|--------|
| `ondrag` | Element is being dragged | Draggable element |
| `ondragend` | Drag operation ends | Draggable element |
| `ondragenter` | Dragged element enters drop target | Drop target |
| `ondragleave` | Dragged element leaves drop target | Drop target |
| `ondragover` | Dragged element is over drop target | Drop target |
| `ondragstart` | Drag operation starts | Draggable element |
| `ondrop` | Element is dropped | Drop target |

**Example**:
```html
<div 
  draggable="true" 
  ondragstart="event.dataTransfer.setData('text', this.id)">
  Drag me
</div>

<div 
  ondragover="event.preventDefault()"
  ondrop="handleDrop(event)">
  Drop here
</div>
```

## Media Events

Events for audio and video elements:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `onabort` | Media loading aborted |
| `oncanplay` | Media can start playing |
| `oncanplaythrough` | Media can play without buffering |
| `ondurationchange` | Duration changes |
| `onemptied` | Media becomes empty |
| `onended` | Media playback ends |
| `onerror` | Error loading media |
| `onloadeddata` | Media data loaded |
| `onloadedmetadata` | Metadata loaded |
| `onloadstart` | Browser starts loading |
| `onpause` | Media is paused |
| `onplay` | Media starts playing |
| `onplaying` | Media is playing after pause/buffer |
| `onprogress` | Browser is downloading media |
| `onratechange` | Playback speed changes |
| `onseeked` | Seeking completes |
| `onseeking` | Seeking starts |
| `onstalled` | Browser trying to get media data |
| `onsuspend` | Browser stops getting media data |
| `ontimeupdate` | Current playback time changes |
| `onvolumechange` | Volume changes |
| `onwaiting` | Media paused waiting for data |

**Example**:
```html
<video 
  src="video.mp4" 
  controls
  onplay="console.log('Playing')"
  onpause="console.log('Paused')"
  onended="console.log('Finished')">
</video>

<audio 
  src="audio.mp3"
  onloadedmetadata="showDuration()"
  ontimeupdate="updateProgress()">
</audio>
```

## Miscellaneous Events

Other useful event attributes:

| Event Attribute | When It Fires | Applies To |
|-----------------|---------------|------------|
| `onscroll` | Element is scrolled | Scrollable elements |
| `ontoggle` | Details element toggled | `<details>` |
| `onwheel` | Mouse wheel scrolled | Any element |

**Example**:
```html
<div onscroll="handleScroll()" style="height: 200px; overflow: auto;">
  <p>Scrollable content...</p>
</div>

<details ontoggle="console.log('Toggled')">
  <summary>Click to toggle</summary>
  <p>Hidden content</p>
</details>
```

## Animation and Transition Events

CSS animation and transition events:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `onanimationend` | CSS animation completes |
| `onanimationiteration` | CSS animation repeats |
| `onanimationstart` | CSS animation starts |
| `ontransitionend` | CSS transition completes |
| `ontransitioncancel` | CSS transition cancelled |
| `ontransitionrun` | CSS transition starts |

**Example**:
```html
<div 
  class="animated"
  onanimationend="console.log('Animation finished')"
  onanimationstart="console.log('Animation started')">
  Animated element
</div>
```

## Touch Events (Mobile)

Touch events for mobile devices:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `ontouchcancel` | Touch interrupted |
| `ontouchend` | Touch ends |
| `ontouchmove` | Touch moves |
| `ontouchstart` | Touch starts |

**Example**:
```html
<div 
  ontouchstart="handleTouchStart(event)"
  ontouchmove="handleTouchMove(event)"
  ontouchend="handleTouchEnd(event)">
  Touch me (mobile)
</div>
```

## Event Object

All event handlers receive an event object with useful properties:

```html
<button onclick="handleClick(event)">Click</button>

<script>
function handleClick(event) {
  console.log('Event type:', event.type);           // 'click'
  console.log('Target element:', event.target);     // <button>
  console.log('Mouse X:', event.clientX);           // X coordinate
  console.log('Mouse Y:', event.clientY);           // Y coordinate
  
  event.preventDefault();  // Prevent default action
  event.stopPropagation(); // Stop event bubbling
}
</script>
```

## Common Patterns

### Prevent Default Behavior

```html
<!-- Prevent form submission -->
<form onsubmit="return false">...</form>
<form onsubmit="event.preventDefault()">...</form>

<!-- Prevent link navigation -->
<a href="#" onclick="return false">Don't navigate</a>

<!-- Prevent right-click menu -->
<div oncontextmenu="return false">No right-click</div>
```

### Access Element

```html
<!-- Using 'this' keyword -->
<button onclick="console.log(this.textContent)">Click</button>

<!-- Using event.target -->
<button onclick="console.log(event.target.textContent)">Click</button>

<!-- Passing 'this' explicitly -->
<button onclick="handleClick(this)">Click</button>
```

### Conditional Execution

```html
<!-- Check key pressed -->
<input onkeydown="if(event.key === 'Enter') submitForm()">

<!-- Check Ctrl key -->
<div onclick="if(event.ctrlKey) console.log('Ctrl + Click')">Click</div>

<!-- Check button (0=left, 1=middle, 2=right) -->
<div onmousedown="if(event.button === 2) console.log('Right click')">Click</div>
```

## Best Practices

### ✅ Do

1. **Use `addEventListener()` instead** of inline handlers
2. **Call `preventDefault()`** to stop default behavior
3. **Call `stopPropagation()`** to prevent bubbling when needed
4. **Pass `event` object** to handlers for access to event details
5. **Return false** to prevent default (works for some events)
6. **Use semantic events** (onclick for clickable, onsubmit for forms)

### ❌ Don't

1. **Don't use inline handlers in production** (violates CSP, hard to maintain)
2. **Don't use `onkeypress`** (deprecated, use `onkeydown`)
3. **Don't forget to prevent default** when needed (links, forms)
4. **Don't mix inline and addEventListener** (confusing)
5. **Don't put complex logic inline** (use external functions)
6. **Don't use `onclick` on non-interactive elements** (use buttons/links)

## Modern Alternative: addEventListener()

**Why addEventListener is better**:

```html
<!-- ❌ Inline: Limited to one handler -->
<button onclick="doA()">Click</button>

<!-- ✅ addEventListener: Multiple handlers -->
<button id="btn">Click</button>
<script>
  const btn = document.getElementById('btn');
  btn.addEventListener('click', doA);
  btn.addEventListener('click', doB);  // Both run!
  btn.addEventListener('click', doC);  // All three run!
</script>
```

**Separation of concerns**:

```html
<!-- ❌ Inline: Mixed HTML and JavaScript -->
<button onclick="alert('Clicked')">Click</button>

<!-- ✅ Separate: Clean HTML, JS in script -->
<button id="myBtn">Click</button>
<script>
  document.getElementById('myBtn').addEventListener('click', function() {
    alert('Clicked');
  });
</script>
```

**CSP compatibility**:

```html
<!-- ❌ Inline: Blocked by strict CSP -->
<button onclick="alert('Blocked')">Click</button>

<!-- ✅ External: Allowed by CSP -->
<button id="btn">Click</button>
<script src="app.js"></script>
<!-- app.js: document.getElementById('btn').addEventListener('click', ...) -->
```

## Quick Reference Table

### Most Common Events

| Event | Use For | Example |
|-------|---------|---------|
| `onclick` | Click actions | Buttons, links |
| `onsubmit` | Form submission | Forms |
| `oninput` | Real-time input | Search, validation |
| `onchange` | Final value change | Select, checkbox |
| `onload` | Page/image load | Body, images |
| `onkeydown` | Keyboard shortcuts | Inputs, body |
| `onmouseenter` | Hover effects | Any element |
| `onfocus` | Input focus | Form fields |
| `onblur` | Input unfocus | Form fields |

### Event Order

**Mouse Click**:
1. `onmousedown`
2. `onmouseup`
3. `onclick`

**Form Submission**:
1. `onsubmit` (can prevent)
2. Form submits

**Input Change**:
1. `oninput` (every keystroke)
2. `onchange` (on blur)

**Page Load**:
1. `DOMContentLoaded` (not an attribute)
2. `onload`

## Debugging Events

```html
<!-- Log all event details -->
<button onclick="console.log(event)">Debug Event</button>

<!-- See event properties -->
<div onclick="console.table({
  type: event.type,
  target: event.target.tagName,
  x: event.clientX,
  y: event.clientY,
  ctrlKey: event.ctrlKey,
  shiftKey: event.shiftKey
})">Click to inspect</div>
```

## Resource

For complete reference, see:
- **MDN Event Reference**: https://developer.mozilla.org/en-US/docs/Web/Events
- **addEventListener()**: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
