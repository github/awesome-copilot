# Network

Network and connectivity information.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/network
npx cap sync
```

## Usage

```typescript
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
console.log('Connected:', status.connected, 'Type:', status.connectionType);

const handle = await Network.addListener('networkStatusChange', (status) => {
  console.log('Network changed:', status.connectionType);
});

// Cleanup when the listener is no longer needed.
await handle.remove();
```

## Notes

- `connected`: boolean connectivity flag. It is usually `false` when `connectionType` is `'none'`, `true` for `'wifi'` or `'cellular'`, and should be treated as undetermined when the type is `'unknown'`.
- `connectionType`: `'wifi' | 'cellular' | 'none' | 'unknown'`.
