# Keyboard

Keyboard display/visibility control and event tracking.

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/keyboard
npx cap sync
```

## Configuration

Config options in `capacitor.config.ts`:
- `resize`: Controls app resizing when keyboard appears (default: `native`). Values: `body`, `ionic`, `native`, `none`.
- `style`: Override keyboard styling (Dark/Light/Default).
- `resizeOnFullScreen`: Android workaround for full-screen keyboard resizing.

## Usage

```typescript
import { Keyboard } from '@capacitor/keyboard';

Keyboard.addListener('keyboardWillShow', (info) => {
  console.log('Keyboard height:', info.keyboardHeight);
});
Keyboard.addListener('keyboardDidHide', () => {
  console.log('Keyboard hidden');
});

await Keyboard.hide();
await Keyboard.setAccessoryBarVisible({ isVisible: false });
```

## Notes

- `show()` is Android-only.
- `setAccessoryBarVisible()` is iPhone-only.
- `setScroll()`, `setStyle()`, `setResizeMode()`, `getResizeMode()` are iOS-only.
