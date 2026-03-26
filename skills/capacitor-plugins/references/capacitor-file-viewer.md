# File Viewer

Open files and preview media on mobile devices.

**Platforms:** Android, iOS (no Web)

## Installation

```bash
npm install @capacitor/file-viewer
npx cap sync
```

## Usage

```typescript
import { FileViewer } from '@capacitor/file-viewer';

await FileViewer.openDocumentFromLocalPath({ path: 'path/to/file.pdf' });
await FileViewer.openDocumentFromUrl({ url: 'https://example.com/document.pdf' });
await FileViewer.previewMediaContentFromUrl({ url: 'https://example.com/video.mp4' });
```

## Notes

- Media preview methods (`previewMediaContentFromUrl`, etc.) are iOS-only. On Android, they fall back to standard document opening.
- No Web support.
