---
name: framework-to-capacitor
description: Guide for integrating modern web frameworks with Capacitor. Covers Next.js static export, React, Vue, Angular, Svelte, and others. Use this skill when converting framework apps to mobile apps with Capacitor.
---

# Framework to Capacitor Integration

Comprehensive guide for integrating web frameworks with Capacitor to build mobile apps.

## When to Use This Skill

- Converting a Next.js app to a mobile app
- Integrating React, Vue, Angular, or Svelte with Capacitor
- Configuring static exports for Capacitor
- Setting up routing for mobile apps
- Optimizing framework builds for native platforms

## Framework Support Matrix

| Framework | Static Export | SSR Support | Recommended Approach |
|-----------|--------------|-------------|---------------------|
| Next.js | ✅ Yes | ❌ No | Static export (output: 'export') |
| React | ✅ Yes | N/A | Create React App or Vite |
| Vue | ✅ Yes | ❌ No | Vite or Vue CLI |
| Angular | ✅ Yes | ❌ No | Angular CLI |
| Svelte | ✅ Yes | ❌ No | SvelteKit with adapter-static |
| Remix | ✅ Yes | ❌ No | SPA mode |
| Solid | ✅ Yes | ❌ No | Vite |
| Qwik | ✅ Yes | ❌ No | Static site mode |

**CRITICAL**: Capacitor requires **static HTML/CSS/JS files**. SSR (Server-Side Rendering) does not work in native apps.

---

## Next.js + Capacitor

Next.js is popular for React apps. Capacitor requires static export.

### Step 1: Create or Update next.config.js

**For Next.js 13+ (App Router):**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Helps with routing on mobile
};

module.exports = nextConfig;
```

**For Next.js 12 (Pages Router):**
```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};
```

### Step 2: Build Static Files

```bash
npm run build
```

This creates an `out/` directory with static files.

### Step 3: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**Configuration:**
- **App name**: Your app name
- **App ID**: com.company.app
- **Web directory**: `out` (Next.js static export output)

### Step 4: Configure Capacitor

**Create capacitor.config.ts:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'out', // Next.js static export directory
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

### Step 5: Add Platforms

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### Step 6: Build and Sync

```bash
# Build Next.js
npm run build

# Sync with native projects
npx cap sync
```

### Step 7: Run on Device

**iOS:**
```bash
npx cap open ios
# Build and run in Xcode
```

**Android:**
```bash
npx cap open android
# Build and run in Android Studio
```

### Next.js Routing Considerations

**Use hash routing for complex apps:**

```typescript
// next.config.js
const nextConfig = {
  output: 'export',
  basePath: '',
  assetPrefix: '',
};
```

**Or use Next.js's built-in routing** (works with `trailingSlash: true`).

### Next.js Image Optimization

**next/image doesn't work with static export. Use alternatives:**

**Option 1: Use standard img tag**
```jsx
// Instead of next/image
<img src="/images/photo.jpg" alt="Photo" />
```

**Option 2: Use a custom Image component**
```tsx
// components/CapacitorImage.tsx
import { Capacitor } from '@capacitor/core';

export const CapacitorImage = ({ src, alt, ...props }) => {
  const isNative = Capacitor.isNativePlatform();
  const imageSrc = isNative ? src : src;
  
  return <img src={imageSrc} alt={alt} {...props} />;
};
```

### Next.js API Routes

**API routes don't work in static export.** Use alternatives:

1. **External API**: Call a separate backend
2. **Capacitor plugins**: Use native features
3. **Local storage**: Use `@capacitor/preferences`

```typescript
import { Preferences } from '@capacitor/preferences';

// Save data
await Preferences.set({
  key: 'user',
  value: JSON.stringify(userData),
});

// Load data
const { value } = await Preferences.get({ key: 'user' });
const userData = JSON.parse(value || '{}');
```

### Next.js Middleware

**Middleware doesn't work in static export.** Handle logic client-side:

```typescript
// In your React components
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProtectedPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { value } = await Preferences.get({ key: 'token' });
      if (!value) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  return <div>Protected content</div>;
}
```

### Complete Next.js + Capacitor Example

**package.json:**
```json
{
  "name": "my-capacitor-app",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:mobile": "next build && cap sync",
    "ios": "cap open ios",
    "android": "cap open android"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@capacitor/camera": "^6.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## React + Capacitor

React works great with Capacitor using Vite or Create React App.

### Option 1: Vite (Recommended)

**Create new project:**
```bash
npx create-vite@latest my-app --template react-ts
cd my-app
npm install
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**Configure vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Capacitor webDir
  },
});
```

**capacitor.config.ts:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'dist',
};

export default config;
```

**Add platforms and build:**
```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

### Option 2: Create React App

**Create new project:**
```bash
npx create-react-app my-app --template typescript
cd my-app
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'build', // CRA outputs to build/
};
```

**Build and sync:**
```bash
npm run build
npx cap sync
```

### React Router Configuration

**Use HashRouter for mobile:**
```tsx
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}
```

---

## Vue + Capacitor

Vue works seamlessly with Capacitor.

### Create Vue + Capacitor Project

**Using Vite:**
```bash
npx create-vite@latest my-app --template vue-ts
cd my-app
npm install
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
  },
});
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'dist',
};
```

**Add platforms:**
```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

### Vue Router Configuration

**Use hash mode for mobile:**
```typescript
// router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

export default router;
```

---

## Angular + Capacitor

Angular has excellent Capacitor integration.

### Create Angular + Capacitor Project

**Create Angular app:**
```bash
npx @angular/cli new my-app
cd my-app
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'dist/my-app/browser', // Angular 17+ output
};
```

**For Angular 16 and below:**
```typescript
webDir: 'dist/my-app',
```

**Add platforms:**
```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

### Angular Router Configuration

**HashLocationStrategy for mobile:**
```typescript
// app.config.ts (Angular 17+)
import { provideRouter, withHashLocation } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
  ],
};
```

**For Angular 16 and below:**
```typescript
// app.module.ts
import { LocationStrategy, HashLocationStrategy } from '@angular/common';

@NgModule({
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],
})
export class AppModule {}
```

---

## Svelte + Capacitor

Svelte and SvelteKit work great with Capacitor.

### SvelteKit + Capacitor

**Create SvelteKit app:**
```bash
npx create-svelte my-app
cd my-app
npm install
```

**Install adapter-static:**
```bash
npm install -D @sveltejs/adapter-static
```

**Configure svelte.config.js:**
```javascript
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
    }),
  },
};

export default config;
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'build',
};
```

**Build and sync:**
```bash
npm run build
npx cap sync
```

### Vite + Svelte (Simpler Option)

**Create with Vite:**
```bash
npx create-vite@latest my-app --template svelte-ts
cd my-app
npm install
```

**Install Capacitor:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.company.app',
  appName: 'My App',
  webDir: 'dist',
};
```

---

## Common Patterns Across Frameworks

### 1. Environment Detection

**Detect if running in native app:**
```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

if (isNative) {
  // Use native plugins
} else {
  // Use web APIs
}
```

### 2. Deep Linking

**Handle deep links in your app:**
```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (data) => {
  // Handle deep link
  const slug = data.url.split('.app').pop();
  // Navigate to route
});
```

### 3. Live Updates with Capgo

**Add live updates to any framework:**
```bash
npm install @capgo/capacitor-updater
```

```typescript
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Check for updates
const { id } = await CapacitorUpdater.download({
  url: 'https://api.capgo.app/updates',
});

// Apply update
await CapacitorUpdater.set({ id });
```

### 4. Native UI Components

**Use Ionic Framework for any framework:**
```bash
npm install @ionic/core
```

**React:**
```bash
npm install @ionic/react @ionic/react-router
```

**Vue:**
```bash
npm install @ionic/vue @ionic/vue-router
```

**Angular:**
```bash
npm install @ionic/angular
```

### 5. Storage

**Use Capacitor Preferences for all frameworks:**
```typescript
import { Preferences } from '@capacitor/preferences';

// Set value
await Preferences.set({ key: 'theme', value: 'dark' });

// Get value
const { value } = await Preferences.get({ key: 'theme' });

// Remove value
await Preferences.remove({ key: 'theme' });

// Clear all
await Preferences.clear();
```

### 6. Camera Access

**Same API across all frameworks:**
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Uri,
});

const imageUrl = photo.webPath;
```

---

## Build Scripts for All Frameworks

**Add these to package.json:**
```json
{
  "scripts": {
    "dev": "vite", // or next dev, ng serve, etc.
    "build": "vite build", // or next build, ng build, etc.
    "build:mobile": "vite build && cap sync",
    "ios": "cap run ios",
    "android": "cap run android",
    "sync": "cap sync"
  }
}
```

---

## Routing Best Practices

### Hash vs. History Mode

**Hash mode (recommended for mobile):**
- Works without server configuration
- URLs look like: `#/about`
- No server-side routing needed

**History mode (requires server):**
- Clean URLs: `/about`
- Requires server fallback to index.html
- Can have issues on mobile

**Recommendation**: Use hash mode for Capacitor apps.

---

## Common Issues and Solutions

### Issue: Blank Screen on Mobile

**Cause**: Incorrect `webDir` or build output.

**Solution:**
1. Check build output directory matches `webDir` in capacitor.config.ts
2. Rebuild: `npm run build`
3. Sync: `npx cap sync`
4. Check browser console in device

### Issue: Routing Doesn't Work

**Cause**: Using history mode without proper configuration.

**Solution:**
Switch to hash routing:
- React: `HashRouter`
- Vue: `createWebHashHistory()`
- Angular: `HashLocationStrategy`
- SvelteKit: Configure fallback

### Issue: Environment Variables Not Working

**Cause**: Build-time variables not being replaced.

**Solution:**
Use framework-specific env variable patterns:
- Next.js: `NEXT_PUBLIC_`
- Vite: `VITE_`
- Create React App: `REACT_APP_`
- Angular: `environment.ts`

### Issue: API Calls Fail on Device

**Cause**: CORS or localhost URLs.

**Solution:**
1. Use production API URLs
2. Configure CORS on backend
3. Use Capacitor HTTP plugin for native requests:

```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.get({
  url: 'https://api.example.com/data',
});
```

---

## Framework-Specific Plugins

**Ionic Framework provides native UI components:**

- **@ionic/react** - React components
- **@ionic/vue** - Vue components
- **@ionic/angular** - Angular components

**Konsta UI for Tailwind CSS:**

- Works with React, Vue, Svelte
- iOS and Material Design themes

See `ionic-design` and `konsta-ui` skills for details.

---

## Deployment Checklist

- [ ] Configure static export (Next.js: `output: 'export'`)
- [ ] Set correct `webDir` in capacitor.config.ts
- [ ] Use hash routing for mobile
- [ ] Disable image optimization (Next.js)
- [ ] Remove SSR/API routes dependencies
- [ ] Add native permissions (Info.plist, AndroidManifest.xml)
- [ ] Test on physical devices
- [ ] Configure splash screen and icons
- [ ] Set up live updates with Capgo (optional)
- [ ] Build and test on iOS and Android

---

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Ionic Framework**: https://ionicframework.com
- **Capgo Blog**: https://capgo.app/blog
- **Community Forum**: https://forum.ionicframework.com

---

## Framework-Specific Guides

For detailed guides on specific frameworks:
- **Next.js + Capacitor**: https://capgo.app/blog/how-to-use-capacitor-with-nextjs
- **Ionic Framework**: See `ionic-design` skill
- **Konsta UI**: See `konsta-ui` skill

---

## Next Steps

1. Choose your framework and follow the setup above
2. Configure static export/build
3. Install and configure Capacitor
4. Add platforms (iOS/Android)
5. Build and sync
6. Test on devices
7. Add native features with plugins
8. Set up live updates with Capgo
