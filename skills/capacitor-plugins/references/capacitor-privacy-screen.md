# Privacy Screen

Prevents sensitive app information from appearing in app switchers/recent apps.

**Platforms:** Android, iOS (no Web)

## Installation

```bash
npm install @capacitor/privacy-screen
npx cap sync
```

## Usage

```typescript
import { PrivacyScreen } from '@capacitor/privacy-screen';

await PrivacyScreen.enable({
  android: { preventScreenshots: true, privacyModeOnActivityHidden: 'dim' },
  ios: { blurEffect: 'dark' },
});

const { enabled } = await PrivacyScreen.isEnabled();
await PrivacyScreen.disable();
```

## Notes

- Android options: `dimBackground` (boolean), `preventScreenshots` (boolean), `privacyModeOnActivityHidden` ('none'|'dim'|'splash').
- iOS options: `blurEffect` ('none'|'light'|'dark').
