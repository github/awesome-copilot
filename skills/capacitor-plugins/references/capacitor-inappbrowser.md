# InAppBrowser

Opens URLs in WebView, in-app system browser, or external browser.

**Platforms:** Android (minimum SDK 26), iOS

## Installation

```bash
npm install @capacitor/inappbrowser
npx cap sync
```

## Usage

```typescript
import { InAppBrowser } from '@capacitor/inappbrowser';

await InAppBrowser.openInWebView({ url: 'https://example.com' });
await InAppBrowser.openInSystemBrowser({ url: 'https://example.com' });
await InAppBrowser.openInExternalBrowser({ url: 'https://example.com' });
await InAppBrowser.close();

InAppBrowser.addListener('browserClosed', () => {});
InAppBrowser.addListener('browserPageLoaded', () => {});
```

## Notes

- WebView supports toolbar positioning, navigation buttons, cache management, user agent, zoom.
- Events: `browserClosed`, `browserPageLoaded`, `browserPageNavigationCompleted`.
