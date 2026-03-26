# Dialog

Triggers native dialog windows for alerts, confirmations, and prompts.

**Platforms:** Android, iOS, Web

## Installation

```bash
npm install @capacitor/dialog
npx cap sync
```

## Usage

```typescript
import { Dialog } from '@capacitor/dialog';

await Dialog.alert({ title: 'Error', message: 'Something went wrong' });

const { value } = await Dialog.confirm({ title: 'Confirm', message: 'Are you sure?' });

const { value: name, cancelled } = await Dialog.prompt({
  title: 'Name',
  message: 'Enter your name',
  inputPlaceholder: 'John Doe',
});
```
