# Push Notifications

Native push notifications via FCM (Android) and APNs (iOS).

**Platforms:** Android, iOS

## Installation

```bash
npm install @capacitor/push-notifications
npx cap sync
```

## Configuration

### iOS

Enable Push Notifications capability in Xcode. Add two delegate methods to `ios/App/App/AppDelegate.swift` for registration callbacks.

### Android

- Add `google-services.json` to `android/app/`.
- Android 13+: `checkPermissions()` / `requestPermissions()`.
- Set `firebaseMessagingVersion` in `variables.gradle` (default: `25.0.1`).
- Notification icon in `android/app/src/main/AndroidManifest.xml` (white on transparent):

```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@mipmap/push_icon_name" />
```

### Capacitor Config

```json
{
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

## Usage

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

let permStatus = await PushNotifications.checkPermissions();
if (permStatus.receive === 'prompt') {
  permStatus = await PushNotifications.requestPermissions();
}

if (permStatus.receive !== 'granted') {
  console.warn('Push notification permission not granted');
} else {
  await PushNotifications.register();
}

PushNotifications.addListener('registration', (token) => {
  console.log('FCM/APNs token:', token.value);
});

PushNotifications.addListener('registrationError', (error) => {
  console.error('Registration failed:', error);
});

PushNotifications.addListener('pushNotificationReceived', (notification) => {
  console.log('Received:', notification.title, notification.body);
});

PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  console.log('Action:', action.actionId);
});
```

## Notes

- iOS does not support silent/background push via this plugin.
- Android won't trigger callbacks for data-only notifications if app is killed.
