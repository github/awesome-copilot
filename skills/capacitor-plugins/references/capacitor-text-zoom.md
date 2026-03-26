# Text Zoom

Change WebView text size for visual accessibility.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/text-zoom
npx cap sync
```

## Usage

```typescript
import { TextZoom } from '@capacitor/text-zoom';

const { value: currentZoom } = await TextZoom.get();
const { value: preferred } = await TextZoom.getPreferred();
await TextZoom.set({ value: 1.5 });
```

## Notes

- Values are decimals (1.0 = 100%, 1.5 = 150%).
- iPad: Requires `preferredContentMode` set to `mobile` in Capacitor config.
