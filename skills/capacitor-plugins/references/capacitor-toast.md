# Toast

Display a notification popup.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/toast
npx cap sync
```

## Usage

```typescript
import { Toast } from '@capacitor/toast';

await Toast.show({
  text: 'Hello!',
  duration: 'short',
  position: 'bottom',
});
```

## Notes

- `duration`: 'short' (2000ms) or 'long' (3500ms).
- `position`: 'top', 'center', 'bottom'.
- Android 12+: All toasts display at the bottom regardless of `position` setting.
- Web requires PWA Elements (`@ionic/pwa-elements`).
