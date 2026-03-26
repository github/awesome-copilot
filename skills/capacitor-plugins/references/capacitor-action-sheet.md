# Action Sheet

Provides access to native Action Sheets.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/action-sheet
npx cap sync
```

## Configuration

### Android

Set `androidxMaterialVersion` in `variables.gradle`.

- Use `1.12.0` as the baseline default for older setups.
- Use `1.13.0` for Capacitor 8 or current projects.

### Web

Requires PWA Elements (`@ionic/pwa-elements`).

Install it and register the loader during app startup:

```bash
npm install @ionic/pwa-elements
```

```typescript
import { defineCustomElements } from '@ionic/pwa-elements/loader';

defineCustomElements(window);
```

## Usage

```typescript
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

const result = await ActionSheet.showActions({
  title: 'Photo Options',
  message: 'Select an option to perform',
  options: [
    { title: 'Upload' },
    { title: 'Share' },
    { title: 'Remove', style: ActionSheetButtonStyle.Destructive },
  ],
});
console.log('Action index:', result.index);
```

## Notes

- `ActionSheetButtonStyle` (Default, Destructive, Cancel) is iOS-only.
- `message` property is iOS-only.
- `icon` property is Web-only (Ionicons).
