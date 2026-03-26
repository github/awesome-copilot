# Browser

Opens an in-app browser. Uses SFSafariViewController on iOS (OAuth-compliant).

**Platforms:** Android, iOS, Web (partial)

## Installation

```bash
npm install @capacitor/browser
npx cap sync
```

## Configuration

### Android

Set `androidxBrowserVersion` in `variables.gradle` (default: `1.9.0`).

## Usage

```typescript
import { Browser } from '@capacitor/browser';

await Browser.open({ url: 'https://capacitorjs.com/', toolbarColor: '#ffffff' });

Browser.addListener('browserFinished', () => {
  console.log('Browser closed');
});
```

## Notes

- `presentationStyle` (fullscreen/popover) is iOS-only.
- `windowName` is Web-only.
