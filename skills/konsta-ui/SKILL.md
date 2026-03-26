---
name: konsta-ui
description: Guide to using Konsta UI for pixel-perfect iOS and Material Design components in Capacitor apps. Works with React, Vue, and Svelte. Use this skill when users want native-looking UI without Ionic, or prefer a lighter framework.
---

# Konsta UI Design Guide

Build pixel-perfect iOS and Material Design apps with Konsta UI.

## When to Use This Skill

- User wants native-looking UI without Ionic
- User asks about Konsta UI
- User wants iOS/Material Design components
- User is using React/Vue/Svelte
- User wants lightweight UI framework

## What is Konsta UI?

Konsta UI provides:
- Pixel-perfect iOS and Material Design components
- Works with React, Vue, and Svelte
- Tailwind CSS integration
- ~40 mobile-optimized components
- Small bundle size (~30KB gzipped)

## Getting Started

### Installation

```bash
# React
npm install konsta

# Vue
npm install konsta

# Svelte
npm install konsta

# Required: Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Tailwind Configuration

```javascript
// tailwind.config.js
const konstaConfig = require('konsta/config');

module.exports = konstaConfig({
  content: [
    './src/**/*.{js,ts,jsx,tsx,vue,svelte}',
  ],
  // Extend or override Konsta config
  theme: {
    extend: {},
  },
});
```

### Setup (React)

```tsx
// App.tsx
import { App, Page, Navbar, Block } from 'konsta/react';

export default function MyApp() {
  return (
    <App theme="ios"> {/* or theme="material" */}
      <Page>
        <Navbar title="My App" />
        <Block>
          <p>Hello Konsta UI!</p>
        </Block>
      </Page>
    </App>
  );
}
```

### Setup (Vue)

```vue
<!-- App.vue -->
<template>
  <k-app theme="ios">
    <k-page>
      <k-navbar title="My App" />
      <k-block>
        <p>Hello Konsta UI!</p>
      </k-block>
    </k-page>
  </k-app>
</template>

<script setup>
import { kApp, kPage, kNavbar, kBlock } from 'konsta/vue';
</script>
```

## Core Components

### Page Structure

```tsx
import {
  App,
  Page,
  Navbar,
  NavbarBackLink,
  Block,
  BlockTitle,
} from 'konsta/react';

function MyPage() {
  return (
    <App theme="ios">
      <Page>
        <Navbar
          title="Page Title"
          subtitle="Subtitle"
          left={<NavbarBackLink onClick={() => history.back()} />}
        />

        <BlockTitle>Section Title</BlockTitle>
        <Block strong inset>
          <p>Block content with rounded corners and padding.</p>
        </Block>
      </Page>
    </App>
  );
}
```

### Lists

```tsx
import {
  List,
  ListItem,
  ListInput,
  ListButton,
} from 'konsta/react';
import { ChevronRight } from 'framework7-icons/react';

function MyList() {
  return (
    <>
      {/* Simple list */}
      <List>
        <ListItem title="Item 1" />
        <ListItem title="Item 2" />
        <ListItem title="Item 3" />
      </List>

      {/* List with details */}
      <List strong inset>
        <ListItem
          title="John Doe"
          subtitle="Designer"
          text="Additional info text"
          media={<img src="/avatar.jpg" className="w-10 h-10 rounded-full" />}
          link
        />
        <ListItem
          title="Settings"
          after="On"
          link
        />
      </List>

      {/* Form list */}
      <List strongIos insetIos>
        <ListInput
          label="Email"
          type="email"
          placeholder="Enter email"
        />
        <ListInput
          label="Password"
          type="password"
          placeholder="Enter password"
        />
        <ListButton>Login</ListButton>
      </List>
    </>
  );
}
```

### Forms

```tsx
import {
  List,
  ListInput,
  Toggle,
  Radio,
  Checkbox,
  Stepper,
  Range,
} from 'konsta/react';
import { useState } from 'react';

function MyForm() {
  const [toggle, setToggle] = useState(false);
  const [gender, setGender] = useState('male');

  return (
    <List strongIos insetIos>
      {/* Text inputs */}
      <ListInput
        label="Name"
        type="text"
        placeholder="Your name"
        clearButton
      />

      <ListInput
        label="Email"
        type="email"
        placeholder="Email address"
      />

      <ListInput
        label="Bio"
        type="textarea"
        placeholder="About yourself"
        inputClassName="!h-20 resize-none"
      />

      {/* Toggle */}
      <ListItem
        title="Notifications"
        after={
          <Toggle
            checked={toggle}
            onChange={() => setToggle(!toggle)}
          />
        }
      />

      {/* Radio */}
      <ListItem
        title="Male"
        media={
          <Radio
            checked={gender === 'male'}
            onChange={() => setGender('male')}
          />
        }
      />
      <ListItem
        title="Female"
        media={
          <Radio
            checked={gender === 'female'}
            onChange={() => setGender('female')}
          />
        }
      />

      {/* Checkbox */}
      <ListItem
        title="Agree to terms"
        media={<Checkbox />}
      />

      {/* Stepper */}
      <ListItem
        title="Quantity"
        after={<Stepper value={1} min={1} max={10} />}
      />

      {/* Range */}
      <ListItem
        title="Volume"
        innerChildren={<Range value={50} />}
      />
    </List>
  );
}
```

### Buttons

```tsx
import { Button, Segmented, SegmentedButton } from 'konsta/react';
import { useState } from 'react';

function Buttons() {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4 p-4">
      {/* Button variants */}
      <Button>Default</Button>
      <Button large>Large</Button>
      <Button small>Small</Button>
      <Button rounded>Rounded</Button>
      <Button outline>Outline</Button>
      <Button clear>Clear</Button>
      <Button tonal>Tonal</Button>

      {/* Colors */}
      <Button colors={{ fillBg: 'bg-red-500', fillText: 'text-white' }}>
        Custom Color
      </Button>

      {/* Disabled */}
      <Button disabled>Disabled</Button>

      {/* Segmented control */}
      <Segmented strong>
        <SegmentedButton active={active === 0} onClick={() => setActive(0)}>
          Tab 1
        </SegmentedButton>
        <SegmentedButton active={active === 1} onClick={() => setActive(1)}>
          Tab 2
        </SegmentedButton>
        <SegmentedButton active={active === 2} onClick={() => setActive(2)}>
          Tab 3
        </SegmentedButton>
      </Segmented>
    </div>
  );
}
```

### Cards

```tsx
import { Card, Button } from 'konsta/react';

function Cards() {
  return (
    <Card>
      <img
        src="/card-image.jpg"
        className="w-full h-48 object-cover"
        alt=""
      />
      <div className="p-4">
        <h3 className="font-bold text-lg">Card Title</h3>
        <p className="text-gray-500 mt-2">
          Card description text goes here. This is a standard
          card with image, title, and content.
        </p>
        <div className="flex gap-2 mt-4">
          <Button small>Action 1</Button>
          <Button small outline>Action 2</Button>
        </div>
      </div>
    </Card>
  );
}
```

### Dialogs and Sheets

```tsx
import {
  Dialog,
  DialogButton,
  Sheet,
  Popup,
  Button,
  Page,
  Navbar,
  Block,
} from 'konsta/react';
import { useState } from 'react';

function Dialogs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
      <Button onClick={() => setSheetOpen(true)}>Open Sheet</Button>
      <Button onClick={() => setPopupOpen(true)}>Open Popup</Button>

      {/* Alert dialog */}
      <Dialog
        opened={dialogOpen}
        onBackdropClick={() => setDialogOpen(false)}
        title="Dialog Title"
        content="Dialog content goes here."
        buttons={
          <>
            <DialogButton onClick={() => setDialogOpen(false)}>
              Cancel
            </DialogButton>
            <DialogButton strong onClick={() => setDialogOpen(false)}>
              OK
            </DialogButton>
          </>
        }
      />

      {/* Bottom sheet */}
      <Sheet
        opened={sheetOpen}
        onBackdropClick={() => setSheetOpen(false)}
      >
        <div className="p-4">
          <h2 className="font-bold text-lg mb-4">Sheet Title</h2>
          <p>Sheet content</p>
          <Button onClick={() => setSheetOpen(false)} className="mt-4">
            Close
          </Button>
        </div>
      </Sheet>

      {/* Full page popup */}
      <Popup opened={popupOpen} onBackdropClick={() => setPopupOpen(false)}>
        <Page>
          <Navbar
            title="Popup"
            right={
              <Button clear onClick={() => setPopupOpen(false)}>
                Close
              </Button>
            }
          />
          <Block>Popup content</Block>
        </Page>
      </Popup>
    </>
  );
}
```

### Tabbar Navigation

```tsx
import { App, Page, Tabbar, TabbarLink, Icon } from 'konsta/react';
import { Home, Search, Person } from 'framework7-icons/react';
import { useState } from 'react';

function TabsApp() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <App theme="ios">
      <Page>
        {/* Page content based on active tab */}
        {activeTab === 'home' && <HomeContent />}
        {activeTab === 'search' && <SearchContent />}
        {activeTab === 'profile' && <ProfileContent />}

        {/* Tabbar */}
        <Tabbar labels className="left-0 bottom-0 fixed">
          <TabbarLink
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
            icon={<Home />}
            label="Home"
          />
          <TabbarLink
            active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
            icon={<Search />}
            label="Search"
          />
          <TabbarLink
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={<Person />}
            label="Profile"
          />
        </Tabbar>
      </Page>
    </App>
  );
}
```

## Theming

### Theme Selection

```tsx
import { App } from 'konsta/react';

// Auto-detect platform
<App theme="parent">

// Force iOS style
<App theme="ios">

// Force Material style
<App theme="material">
```

### Dark Mode

```tsx
import { App } from 'konsta/react';

// Auto dark mode (follows system)
<App dark>

// Explicit dark mode
<App dark={true}>

// Explicit light mode
<App dark={false}>
```

### Custom Colors with Tailwind

```javascript
// tailwind.config.js
const konstaConfig = require('konsta/config');

module.exports = konstaConfig({
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
      },
    },
  },
  // Override Konsta's primary color
  konpistaConfig: {
    colors: {
      primary: '#6366f1',
    },
  },
});
```

### Component-Level Styling

```tsx
// Override individual component colors
<Button
  colors={{
    fillBg: 'bg-indigo-500',
    fillActiveBg: 'bg-indigo-600',
    fillText: 'text-white',
  }}
>
  Custom Button
</Button>

<Toggle
  colors={{
    bgChecked: 'bg-green-500',
  }}
/>
```

## With Capacitor

### Safe Area Handling

```tsx
import { App, Page } from 'konsta/react';

function MyApp() {
  return (
    <App
      theme="ios"
      safeAreas  // Enable safe area handling
    >
      <Page>
        {/* Content respects safe areas */}
      </Page>
    </App>
  );
}
```

### Capacitor Integration

```tsx
import { App, Page, Button } from 'konsta/react';
import { Capacitor } from '@capacitor/core';

function MyApp() {
  const isNative = Capacitor.isNativePlatform();

  return (
    <App
      theme={Capacitor.getPlatform() === 'ios' ? 'ios' : 'material'}
      safeAreas={isNative}
    >
      <Page>
        <Button onClick={handleNativeAction}>
          Native Action
        </Button>
      </Page>
    </App>
  );
}
```

## Comparison: Konsta vs Ionic

| Feature | Konsta UI | Ionic |
|---------|-----------|-------|
| Bundle Size | ~30KB | ~200KB |
| Components | ~40 | ~100+ |
| Tailwind Integration | Native | Possible |
| Routing | External | Built-in |
| Framework Support | React, Vue, Svelte | React, Vue, Angular |
| Native Features | UI only | UI + Plugins |

**Choose Konsta when:**
- You want Tailwind-first approach
- You need smaller bundle size
- You're using Svelte
- You want simpler setup

**Choose Ionic when:**
- You need comprehensive component library
- You want built-in routing
- You need more complex components
- You prefer all-in-one solution

## Best Practices

### Performance

```tsx
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Accessibility

```tsx
// Konsta components are accessible by default
// Add labels for screen readers
<ListInput
  label="Email"
  type="email"
  placeholder="Enter email"
  // aria-label is automatically set from label
/>

// For icon-only buttons
<Button aria-label="Close menu">
  <Icon name="close" />
</Button>
```

## Resources

- Konsta UI Documentation: https://konstaui.com/
- Konsta React Docs: https://konstaui.com/react
- Konsta Vue Docs: https://konstaui.com/vue
- Konsta Svelte Docs: https://konstaui.com/svelte
- GitHub: https://github.com/konstaui/konsta
