# Screen Reader

Access TalkBack/VoiceOver and text-to-speech for accessibility.

**Platforms:** Android, iOS, Web (partial)

## Installation

```bash
npm install @capacitor/screen-reader
npx cap sync
```

## Usage

```typescript
import { ScreenReader } from '@capacitor/screen-reader';

// Native only: iOS and Android.
const { value } = await ScreenReader.isEnabled();
console.log('Screen reader active:', value);

// `language` is Android-only.
await ScreenReader.speak({ value: 'Hello World', language: 'en' });

const handle = await ScreenReader.addListener('stateChange', ({ value }) => {
  console.log('Screen reader active:', value);
});

await handle.remove();
```

## Notes

- `isEnabled()` not available on Web.
- `speak()` and `addListener()` are also native-only.
- `language` parameter (ISO 639-1) is Android-only.
