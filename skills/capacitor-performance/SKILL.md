---
name: capacitor-performance
description: Performance optimization guide for Capacitor apps covering bundle size, rendering, memory, native bridge, and profiling. Use this skill when users need to optimize their app performance.
---

# Performance Optimization for Capacitor

Make your Capacitor apps fast and responsive.

## When to Use This Skill

- User has slow app
- User wants to optimize
- User has memory issues
- User needs profiling
- User has janky animations

## Quick Wins

### 1. Lazy Load Plugins

```typescript
// BAD - All plugins loaded at startup
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';

// GOOD - Load when needed
async function takePhoto() {
  const { Camera } = await import('@capacitor/camera');
  return Camera.getPhoto({ quality: 90 });
}
```

### 2. Reduce Bundle Size

```bash
# Analyze bundle
npx vite-bundle-visualizer

# Tree-shake imports
import { specific } from 'large-library';  // Good
import * as everything from 'large-library'; // Bad
```

### 3. Optimize Images

```typescript
// Use appropriate quality
const photo = await Camera.getPhoto({
  quality: 80,        // Not 100
  width: 1024,        // Limit size
  resultType: CameraResultType.Uri,  // Not Base64
});

// Lazy load images
<img loading="lazy" src={url} />
```

### 4. Minimize Bridge Calls

```typescript
// BAD - Multiple bridge calls
for (const item of items) {
  await Storage.set({ key: item.id, value: item.data });
}

// GOOD - Single call with batch
await Storage.set({
  key: 'items',
  value: JSON.stringify(items),
});
```

## Rendering Performance

### Use CSS Transforms

```css
/* GPU accelerated */
.animated {
  transform: translateX(100px);
  will-change: transform;
}

/* Avoid - triggers layout */
.animated {
  left: 100px;
}
```

### Virtual Scrolling

```typescript
// Use virtual list for long lists
import { VirtualScroller } from 'your-framework';

<VirtualScroller
  items={items}
  itemHeight={60}
  renderItem={(item) => <ListItem item={item} />}
/>
```

### Debounce Events

```typescript
import { debounce } from 'lodash-es';

const handleScroll = debounce((e) => {
  // Handle scroll
}, 16); // ~60fps
```

## Memory Management

### Cleanup Listeners

```typescript
import { App } from '@capacitor/app';

// Store listener handle
const handle = await App.addListener('appStateChange', callback);

// Cleanup on unmount
onUnmount(() => {
  handle.remove();
});
```

### Avoid Memory Leaks

```typescript
// Clear large data when done
let largeData = await fetchLargeData();
processData(largeData);
largeData = null; // Allow GC
```

## Profiling

### Chrome DevTools

1. Connect via chrome://inspect
2. Performance tab > Record
3. Analyze flame chart

### Xcode Instruments

1. Product > Profile
2. Choose Time Profiler
3. Analyze hot paths

### Android Profiler

1. View > Tool Windows > Profiler
2. Select CPU/Memory/Network
3. Record and analyze

## Metrics to Track

| Metric | Target |
|--------|--------|
| First Paint | < 1s |
| Time to Interactive | < 3s |
| Frame Rate | 60fps |
| Memory | Stable, no growth |
| Bundle Size | < 500KB gzipped |

## Resources

- Chrome DevTools: https://developer.chrome.com/docs/devtools
- Xcode Instruments: https://developer.apple.com/instruments
