# Cookies

Native cookie management by patching `document.cookie` to use native libraries.

**Platforms:** Android, iOS, Web

## Installation

Bundled with `@capacitor/core`. No separate install needed.

## Configuration

Enable in `capacitor.config.ts` (or `.json`):

```json
{
  "plugins": {
    "CapacitorCookies": {
      "enabled": true
    }
  }
}
```

### iOS

iOS 14+ third-party cookies require domain whitelisting via `WKAppBoundDomains` in `ios/App/App/Info.plist` (up to 10 domains).

## Usage

```typescript
import { CapacitorCookies } from '@capacitor/core';

await CapacitorCookies.setCookie({
  url: 'https://example.com',
  key: 'token',
  value: 'abc123',
});
const cookies = await CapacitorCookies.getCookies({ url: 'https://example.com' });
await CapacitorCookies.deleteCookie({ url: 'https://example.com', key: 'token' });
await CapacitorCookies.clearAllCookies();
```
