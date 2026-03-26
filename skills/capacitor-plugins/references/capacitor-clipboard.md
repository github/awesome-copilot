# Clipboard

System clipboard API for copy/paste operations.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/clipboard
npx cap sync
```

## Usage

```typescript
import { Clipboard } from '@capacitor/clipboard';

await Clipboard.write({ string: 'Hello World' });
const { value, type } = await Clipboard.read();
```

## Notes

- `write()` accepts `string`, `image` (data URL), `url`, or `label` (Android only).
