---
name: capgo-live-updates
description: Complete guide to implementing live updates in Capacitor apps using Capgo. Covers account creation, plugin installation, configuration, update strategies, and CI/CD integration. Use this skill when users want to deploy updates without app store review.
---

# Capgo Live Updates for Capacitor

Deploy updates to your Capacitor app instantly without waiting for app store review.

## When to Use This Skill

- User wants live/OTA updates
- User asks about Capgo
- User wants to skip app store review
- User needs to push hotfixes quickly
- User wants A/B testing or staged rollouts

## What is Capgo?

Capgo is a live update service for Capacitor apps that lets you:

- Push JavaScript/HTML/CSS updates instantly
- Skip app store review for web layer changes
- Roll back bad updates automatically
- A/B test features with channels
- Monitor update analytics

**Note**: Native code changes (Swift/Kotlin/Java) still require app store submission.

## Getting Started

### Step 1: Create a Capgo Account

1. Go to **https://capgo.app**
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with GitHub, Google, or email
4. Choose a plan:
   - **Free**: 1 app, 500 updates/month
   - **Solo**: $14/mo, unlimited updates
   - **Team**: $49/mo, team features
   - **Enterprise**: Custom pricing

### Step 2: Install the CLI

```bash
npm install -g @capgo/cli
```

### Step 3: Login to Capgo

```bash
capgo login
# Opens browser to authenticate
```

Or use API key:
```bash
capgo login --apikey YOUR_API_KEY
```

### Step 4: Initialize Your App

```bash
cd your-capacitor-app
capgo init
```

This will:
- Create app in Capgo dashboard
- Add `@capgo/capacitor-updater` to your project
- Configure capacitor.config.ts
- Set up your first channel

### Step 5: Install the Plugin

If not installed automatically:

```bash
npm install @capgo/capacitor-updater
npx cap sync
```

## Configuration

### Basic Configuration

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourapp.id',
  appName: 'Your App',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,  // Enable automatic updates
    },
  },
};

export default config;
```

### Advanced Configuration

```typescript
// capacitor.config.ts
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
    // Update behavior
    resetWhenUpdate: true,           // Reset to built-in on native update
    updateUrl: 'https://api.capgo.app/updates', // Default
    statsUrl: 'https://api.capgo.app/stats',    // Analytics

    // Channels
    defaultChannel: 'production',

    // Update timing
    periodCheckDelay: 600,           // Check every 10 minutes (seconds)
    delayConditionsFail: false,      // Don't delay on condition fail

    // Private updates (enterprise)
    privateKey: 'YOUR_PRIVATE_KEY',  // For encrypted updates
  },
},
```

## Implementing Updates

### Automatic Updates (Recommended)

With `autoUpdate: true`, updates are automatic:

```typescript
// app.ts - Just notify when ready
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Tell Capgo the app loaded successfully
// This MUST be called within 10 seconds of app start
CapacitorUpdater.notifyAppReady();
```

**Important**: Always call `notifyAppReady()`. If not called within 10 seconds, Capgo assumes the update failed and rolls back.

### Manual Updates

For more control:

```typescript
// capacitor.config.ts
plugins: {
  CapacitorUpdater: {
    autoUpdate: false,  // Disable auto updates
  },
},
```

```typescript
// update-service.ts
import { CapacitorUpdater } from '@capgo/capacitor-updater';

class UpdateService {
  async checkForUpdate() {
    // Check for available update
    const update = await CapacitorUpdater.getLatest();

    if (!update.url) {
      console.log('No update available');
      return null;
    }

    console.log('Update available:', update.version);
    return update;
  }

  async downloadUpdate(update: any) {
    // Download the update bundle
    const bundle = await CapacitorUpdater.download({
      url: update.url,
      version: update.version,
    });

    console.log('Downloaded:', bundle.id);
    return bundle;
  }

  async installUpdate(bundle: any) {
    // Set as next version (applies on next app start)
    await CapacitorUpdater.set(bundle);
    console.log('Update will apply on next restart');
  }

  async installAndReload(bundle: any) {
    // Set and reload immediately
    await CapacitorUpdater.set(bundle);
    await CapacitorUpdater.reload();
  }
}
```

### Update with User Prompt

```typescript
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Dialog } from '@capacitor/dialog';

async function checkUpdate() {
  const update = await CapacitorUpdater.getLatest();

  if (!update.url) return;

  const { value } = await Dialog.confirm({
    title: 'Update Available',
    message: `Version ${update.version} is available. Update now?`,
  });

  if (value) {
    // Show loading indicator
    showLoading('Downloading update...');

    const bundle = await CapacitorUpdater.download({
      url: update.url,
      version: update.version,
    });

    hideLoading();

    // Apply and reload
    await CapacitorUpdater.set(bundle);
    await CapacitorUpdater.reload();
  }
}
```

### Listen for Update Events

```typescript
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Update downloaded
CapacitorUpdater.addListener('updateAvailable', (info) => {
  console.log('Update available:', info.bundle.version);
});

// Download progress
CapacitorUpdater.addListener('downloadProgress', (progress) => {
  console.log('Download:', progress.percent, '%');
});

// Update failed
CapacitorUpdater.addListener('updateFailed', (info) => {
  console.error('Update failed:', info.bundle.version);
});

// App ready
CapacitorUpdater.addListener('appReady', () => {
  console.log('App is ready');
});
```

## Deploying Updates

### Deploy via CLI

```bash
# Build your web app
npm run build

# Upload to Capgo
capgo upload

# Upload to specific channel
capgo upload --channel beta

# Upload with version
capgo upload --bundle 1.2.3
```

### Deploy via CI/CD

#### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Capgo

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Capgo
        run: npx @capgo/cli bundle upload
        env:
          CAPGO_TOKEN: ${{ secrets.CAPGO_TOKEN }}
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: node:20
  script:
    - npm install
    - npm run build
    - npx @capgo/cli bundle upload
  only:
    - main
  variables:
    CAPGO_TOKEN: $CAPGO_TOKEN
```

## Channels and Staged Rollouts

### Create Channels

```bash
# Create beta channel
capgo channel create beta

# Create staging channel
capgo channel create staging
```

### Deploy to Channels

```bash
# Deploy to beta (internal testing)
capgo upload --channel beta

# Promote to production
capgo upload --channel production
```

### Staged Rollout

In Capgo dashboard:
1. Go to Channels > production
2. Set rollout percentage (e.g., 10%)
3. Monitor analytics
4. Increase to 50%, then 100%

### Device-Specific Channels

```typescript
// Assign device to channel
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// For beta testers
await CapacitorUpdater.setChannel({ channel: 'beta' });

// For production users
await CapacitorUpdater.setChannel({ channel: 'production' });
```

## Rollback and Version Management

### Automatic Rollback

If `notifyAppReady()` isn't called within 10 seconds, Capgo automatically rolls back to the previous working version.

### Manual Rollback

```bash
# List available versions
capgo bundle list

# Rollback to specific version
capgo bundle revert --bundle 1.2.2 --channel production
```

### In-App Rollback

```typescript
// Get list of downloaded bundles
const bundles = await CapacitorUpdater.list();

// Rollback to built-in version
await CapacitorUpdater.reset();

// Delete a specific bundle
await CapacitorUpdater.delete({ id: 'bundle-id' });
```

## Self-Hosted Option

For enterprise or privacy requirements:

```bash
# Install self-hosted Capgo
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL=postgres://... \
  capgo/capgo-server
```

Configure app to use self-hosted:

```typescript
// capacitor.config.ts
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
    updateUrl: 'https://your-server.com/updates',
    statsUrl: 'https://your-server.com/stats',
  },
},
```

## Security

### Encrypted Updates

For sensitive apps, enable encryption:

```bash
# Generate key pair
capgo key create

# Upload with encryption
capgo upload --key-v2
```

Configure in app:

```typescript
// capacitor.config.ts
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
    privateKey: 'YOUR_PRIVATE_KEY',
  },
},
```

### Code Signing

Verify updates are from trusted source:

```bash
# Sign bundle
capgo upload --sign

# Verify signature in app
capgo key verify
```

## Monitoring and Analytics

### Dashboard Metrics

In Capgo dashboard, view:
- Active devices
- Update success rate
- Rollback rate
- Version distribution
- Error logs

### Custom Analytics

```typescript
// Track custom events
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Get current bundle info
const current = await CapacitorUpdater.current();
console.log('Current version:', current.bundle.version);

// Get download stats
const stats = await CapacitorUpdater.getBuiltinVersion();
```

## Troubleshooting

### Issue: Updates Not Applying

1. Check `notifyAppReady()` is called
2. Verify app ID matches Capgo dashboard
3. Check channel assignment
4. Review Capgo dashboard logs

### Issue: Rollback Loop

1. App crashes before `notifyAppReady()`
2. Fix: Ensure `notifyAppReady()` is called early
3. Temporarily disable updates to debug

### Issue: Slow Downloads

1. Enable delta updates (automatic)
2. Optimize bundle size
3. Use CDN (enterprise)

## Best Practices

1. **Always call `notifyAppReady()`** - First thing after app initializes
2. **Test updates on beta channel first** - Never push untested to production
3. **Use semantic versioning** - Makes rollback easier
4. **Monitor rollback rate** - High rate indicates quality issues
5. **Implement error boundary** - Catch crashes before rollback
6. **Keep native code stable** - Native changes need app store

## Resources

- Capgo Documentation: https://capgo.app/docs
- Capgo Dashboard: https://web.capgo.app
- Plugin GitHub: https://github.com/Cap-go/capacitor-updater
- Discord Community: https://discord.gg/capgo
