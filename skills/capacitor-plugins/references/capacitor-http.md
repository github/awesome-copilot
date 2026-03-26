# Http

Native HTTP support by patching `fetch` and `XMLHttpRequest` to use native libraries.

**Platforms:** Android, iOS, Web

## Installation

Bundled with `@capacitor/core`. No separate install needed.

## Configuration

Enable in `capacitor.config.ts` (or `.json`):

```json
{
  "plugins": {
    "CapacitorHttp": {
      "enabled": true
    }
  }
}
```

## Usage

```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: 'https://api.example.com/data',
  headers: { Authorization: 'Bearer token' },
});

const postResponse = await CapacitorHttp.post({
  url: 'https://api.example.com/data',
  data: { key: 'value' },
});
```

## Notes

- Methods: `request()`, `get()`, `post()`, `put()`, `patch()`, `delete()`.
- Data can only be string or JSON on Android/iOS. For large files use `@capacitor/file-transfer`.
