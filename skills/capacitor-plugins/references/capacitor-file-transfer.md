# File Transfer

File upload and download with progress tracking.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/file-transfer
npx cap sync
```

## Usage

```typescript
import { FileTransfer } from '@capacitor/file-transfer';

const result = await FileTransfer.downloadFile({
  url: 'https://example.com/file.pdf',
  path: 'file:///data/user/0/com.example/files/file.pdf',
  progress: true,
});

await FileTransfer.uploadFile({
  url: 'https://example.com/upload',
  path: 'file:///data/user/0/com.example/files/photo.jpg',
  method: 'POST',
  progress: true,
});

FileTransfer.addListener('progress', (event) => {
  console.log(`${event.bytes} / ${event.contentLength}`);
});
```

## Notes

- Common options: `url`, `path`, `method`, `headers`, `params`, `readTimeout`/`connectTimeout` (default 60s), `progress`, `disableRedirects`.
- Upload-specific: `chunkedMode`, `mimeType`, `fileKey`.
