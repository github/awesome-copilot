# Share

Share content through the system share sheet.

**Platforms:** Android, iOS, Web (via Web Share API)

## Installation

```bash
npm install @capacitor/share
npx cap sync
```

## Usage

```typescript
import { Share } from '@capacitor/share';

await Share.share({
  title: 'Check this out',
  text: 'Really cool thing I found',
  url: 'https://example.com/',
  dialogTitle: 'Share with friends',
});

await Share.share({ files: ['file:///path/to/image.png'] });

const { value } = await Share.canShare();
```

## Notes

- `files` sharing is iOS/Android only.
- `dialogTitle` is Android-only.
- Android: Only cache folder files shareable by default. For additional folders, configure `android/app/src/main/res/xml/file_paths.xml`.
