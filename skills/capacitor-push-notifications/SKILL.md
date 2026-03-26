---
name: capacitor-push-notifications
description: Complete guide to implementing push notifications in Capacitor apps using Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs). Covers setup, handling, and best practices. Use this skill when users need to add push notifications.
---

# Push Notifications in Capacitor

Implement push notifications for iOS and Android using Firebase and APNs.

## When to Use This Skill

- User wants push notifications
- User needs FCM setup
- User asks about APNs
- User has notification issues
- User wants rich notifications

## Quick Start

### Install Plugin

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Basic Implementation

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

async function initPushNotifications() {
  // Request permission
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive === 'granted') {
    // Register for push
    await PushNotifications.register();
  }

  // Get FCM token
  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
    // Send token to your server
    sendTokenToServer(token.value);
  });

  // Handle registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Registration error:', error);
  });

  // Handle incoming notification (foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notification received:', notification);
    // Show in-app notification
    showInAppNotification(notification);
  });

  // Handle notification tap
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Notification action:', action);
    // Navigate based on notification data
    handleNotificationTap(action.notification);
  });
}
```

## Firebase Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create new project
3. Add iOS and Android apps

### 2. Android Configuration

Download `google-services.json` to `android/app/`

```groovy
// android/build.gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

```groovy
// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### 3. iOS Configuration

Download `GoogleService-Info.plist` to `ios/App/App/`

```ruby
# ios/App/Podfile
pod 'Firebase/Messaging'
```

```swift
// ios/App/App/AppDelegate.swift
import Firebase
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Messaging.messaging().apnsToken = deviceToken
    }
}
```

### 4. iOS Capabilities

In Xcode:
1. Select App target
2. Signing & Capabilities
3. Add "Push Notifications"
4. Add "Background Modes" > "Remote notifications"

## APNs Key Setup (iOS)

### Create APNs Key

1. Go to https://developer.apple.com/account
2. Certificates, IDs & Profiles
3. Keys > Create Key
4. Enable Apple Push Notifications service (APNs)
5. Download .p8 file

### Add to Firebase

1. Firebase Console > Project Settings
2. Cloud Messaging tab
3. iOS app configuration
4. Upload APNs Authentication Key (.p8)
5. Enter Key ID and Team ID

## Sending Notifications

### Firebase Admin SDK (Node.js)

```typescript
import admin from 'firebase-admin';

// Initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Send to single device
async function sendToDevice(token: string) {
  await admin.messaging().send({
    token,
    notification: {
      title: 'Hello!',
      body: 'You have a new message',
    },
    data: {
      type: 'message',
      messageId: '123',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'messages',
        icon: 'ic_notification',
        color: '#4285f4',
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
        },
      },
    },
  });
}

// Send to topic
async function sendToTopic(topic: string) {
  await admin.messaging().send({
    topic,
    notification: {
      title: 'Breaking News',
      body: 'Something important happened',
    },
  });
}

// Send to multiple devices
async function sendToMultiple(tokens: string[]) {
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Update',
      body: 'New features available',
    },
  });
}
```

### HTTP v1 API

```bash
curl -X POST \
  'https://fcm.googleapis.com/v1/projects/YOUR_PROJECT/messages:send' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "token": "DEVICE_TOKEN",
      "notification": {
        "title": "Hello",
        "body": "World"
      }
    }
  }'
```

## Advanced Features

### Notification Channels (Android)

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Create channel
await PushNotifications.createChannel({
  id: 'messages',
  name: 'Messages',
  description: 'Message notifications',
  importance: 5, // Max importance
  visibility: 1, // Public
  sound: 'notification.wav',
  vibration: true,
  lights: true,
  lightColor: '#FF0000',
});

// Delete channel
await PushNotifications.deleteChannel({ id: 'old-channel' });

// List channels
const channels = await PushNotifications.listChannels();
```

### Topic Subscription

```typescript
// Subscribe to topic
await PushNotifications.addListener('registration', async () => {
  // Subscribe to topics based on user preferences
  const messaging = getMessaging();
  await subscribeToTopic(messaging, 'news');
  await subscribeToTopic(messaging, 'promotions');
});
```

### Rich Notifications (iOS)

```swift
// ios/App/NotificationService/NotificationService.swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        guard let mutableContent = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }

        // Add image
        if let imageUrl = request.content.userInfo["image"] as? String,
           let url = URL(string: imageUrl) {
            downloadImage(url: url) { attachment in
                if let attachment = attachment {
                    mutableContent.attachments = [attachment]
                }
                contentHandler(mutableContent)
            }
        } else {
            contentHandler(mutableContent)
        }
    }
}
```

### Notification Actions

```typescript
// Handle action buttons
PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  switch (action.actionId) {
    case 'reply':
      // Handle reply action
      const input = action.inputValue;
      sendReply(input);
      break;
    case 'dismiss':
      // Handle dismiss
      break;
    default:
      // Handle tap
      navigateToContent(action.notification.data);
  }
});
```

## Background Handling

### Data-Only Notifications

```typescript
// Server-side: Send data-only message
{
  "to": "DEVICE_TOKEN",
  "data": {
    "type": "sync",
    "action": "refresh"
  }
  // No "notification" key = data-only
}
```

```kotlin
// android/app/src/main/java/.../FirebaseService.kt
class FirebaseService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // Handle data message in background
        message.data["type"]?.let { type ->
            when (type) {
                "sync" -> performBackgroundSync()
                "update" -> checkForUpdates()
            }
        }
    }
}
```

## Local Notifications Fallback

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Show local notification when in foreground
PushNotifications.addListener('pushNotificationReceived', async (notification) => {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now(),
        title: notification.title || '',
        body: notification.body || '',
        extra: notification.data,
      },
    ],
  });
});
```

## Best Practices

### Permission Handling

```typescript
async function requestNotificationPermission() {
  const { receive } = await PushNotifications.checkPermissions();

  if (receive === 'prompt') {
    // Show explanation first
    const shouldRequest = await showPermissionExplanation();

    if (shouldRequest) {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    }
    return false;
  }

  if (receive === 'denied') {
    // Guide user to settings
    showSettingsPrompt();
    return false;
  }

  return receive === 'granted';
}
```

### Token Refresh

```typescript
// Handle token refresh
PushNotifications.addListener('registration', async (token) => {
  const oldToken = await getStoredToken();

  if (oldToken !== token.value) {
    // Token changed, update server
    await updateServerToken(oldToken, token.value);
    await storeToken(token.value);
  }
});
```

### Error Handling

```typescript
PushNotifications.addListener('registrationError', (error) => {
  console.error('Push registration failed:', error);

  // Log to analytics
  analytics.logEvent('push_registration_failed', {
    error: error.error,
  });

  // Retry with backoff
  scheduleRetry();
});
```

## Troubleshooting

### iOS Not Receiving

1. Check APNs key in Firebase
2. Verify Push Notifications capability
3. Check provisioning profile
4. Verify device token format
5. Test with Firebase Console

### Android Not Receiving

1. Verify google-services.json
2. Check notification channel exists
3. Verify FCM token
4. Check battery optimization
5. Test with Firebase Console

### Common Issues

| Issue | Solution |
|-------|----------|
| No token | Check permissions, network |
| Foreground only | Implement background handler |
| Delayed delivery | Use high priority, data-only |
| No sound | Configure notification channel |
| Badge not updating | Set badge in payload |

## Resources

- Capacitor Push Notifications: https://capacitorjs.com/docs/apis/push-notifications
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- APNs Documentation: https://developer.apple.com/documentation/usernotifications
