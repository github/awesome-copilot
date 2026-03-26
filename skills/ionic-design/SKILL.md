---
name: ionic-design
description: Guide to using Ionic Framework components for beautiful native-looking Capacitor apps. Covers component usage, theming, platform-specific styling, and best practices for mobile UI. Use this skill when users need help with Ionic components or mobile UI design.
---

# Ionic Framework Design Guide

Build beautiful, native-looking mobile apps with Ionic Framework and Capacitor.

## When to Use This Skill

- User is using Ionic components
- User wants native-looking UI
- User asks about Ionic theming
- User needs mobile UI patterns
- User wants platform-specific styling

## What is Ionic Framework?

Ionic provides:
- 100+ mobile-optimized UI components
- Automatic iOS/Android platform styling
- Built-in dark mode support
- Accessibility out of the box
- Works with React, Vue, Angular, or vanilla JS

## Getting Started

### Installation

```bash
# For React
npx create-vite@latest my-app --template react-ts
cd my-app
npm install @ionic/react @ionic/react-router

# For Vue
npx create-vite@latest my-app --template vue-ts
cd my-app
npm install @ionic/vue @ionic/vue-router

# Add Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init
```

### Setup (React)

```typescript
// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { IonApp, setupIonicReact } from '@ionic/react';
import App from './App';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme */
import './theme/variables.css';

setupIonicReact();

const root = createRoot(document.getElementById('root')!);
root.render(
  <IonApp>
    <App />
  </IonApp>
);
```

## Core Components

### Page Structure

```tsx
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
} from '@ionic/react';

function MyPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Page Title</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* Large title for iOS */}
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Page Title</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Page content */}
        <div className="ion-padding">
          Your content here
        </div>
      </IonContent>
    </IonPage>
  );
}
```

### Lists

```tsx
import {
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonAvatar,
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/react';
import { chevronForward, trash, archive } from 'ionicons/icons';

function ContactList() {
  return (
    <IonList>
      {/* Simple item */}
      <IonItem>
        <IonLabel>Simple Item</IonLabel>
      </IonItem>

      {/* Item with detail */}
      <IonItem detail button>
        <IonLabel>
          <h2>Item Title</h2>
          <p>Item description text</p>
        </IonLabel>
        <IonNote slot="end">Note</IonNote>
      </IonItem>

      {/* Item with avatar */}
      <IonItem>
        <IonAvatar slot="start">
          <img src="/avatar.jpg" alt="" />
        </IonAvatar>
        <IonLabel>
          <h2>John Doe</h2>
          <p>john@example.com</p>
        </IonLabel>
      </IonItem>

      {/* Sliding item */}
      <IonItemSliding>
        <IonItem>
          <IonLabel>Swipe me</IonLabel>
        </IonItem>
        <IonItemOptions side="end">
          <IonItemOption color="danger">
            <IonIcon slot="icon-only" icon={trash} />
          </IonItemOption>
          <IonItemOption>
            <IonIcon slot="icon-only" icon={archive} />
          </IonItemOption>
        </IonItemOptions>
      </IonItemSliding>
    </IonList>
  );
}
```

### Forms

```tsx
import {
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonCheckbox,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel,
  IonButton,
} from '@ionic/react';

function MyForm() {
  return (
    <form>
      {/* Text input */}
      <IonItem>
        <IonInput
          label="Email"
          labelPlacement="floating"
          type="email"
          placeholder="Enter email"
        />
      </IonItem>

      {/* Password */}
      <IonItem>
        <IonInput
          label="Password"
          labelPlacement="floating"
          type="password"
        />
      </IonItem>

      {/* Textarea */}
      <IonItem>
        <IonTextarea
          label="Bio"
          labelPlacement="floating"
          rows={4}
          placeholder="Tell us about yourself"
        />
      </IonItem>

      {/* Select */}
      <IonItem>
        <IonSelect label="Country" placeholder="Select">
          <IonSelectOption value="us">United States</IonSelectOption>
          <IonSelectOption value="uk">United Kingdom</IonSelectOption>
          <IonSelectOption value="de">Germany</IonSelectOption>
        </IonSelect>
      </IonItem>

      {/* Toggle */}
      <IonItem>
        <IonToggle>Enable notifications</IonToggle>
      </IonItem>

      {/* Checkbox */}
      <IonItem>
        <IonCheckbox slot="start" />
        <IonLabel>I agree to terms</IonLabel>
      </IonItem>

      {/* Radio group */}
      <IonRadioGroup>
        <IonItem>
          <IonRadio value="small">Small</IonRadio>
        </IonItem>
        <IonItem>
          <IonRadio value="medium">Medium</IonRadio>
        </IonItem>
        <IonItem>
          <IonRadio value="large">Large</IonRadio>
        </IonItem>
      </IonRadioGroup>

      <IonButton expand="block" type="submit">
        Submit
      </IonButton>
    </form>
  );
}
```

### Buttons

```tsx
import { IonButton, IonIcon } from '@ionic/react';
import { heart, share, download } from 'ionicons/icons';

function Buttons() {
  return (
    <>
      {/* Fill variants */}
      <IonButton>Solid</IonButton>
      <IonButton fill="outline">Outline</IonButton>
      <IonButton fill="clear">Clear</IonButton>

      {/* Colors */}
      <IonButton color="primary">Primary</IonButton>
      <IonButton color="secondary">Secondary</IonButton>
      <IonButton color="danger">Danger</IonButton>
      <IonButton color="success">Success</IonButton>

      {/* Sizes */}
      <IonButton size="small">Small</IonButton>
      <IonButton size="default">Default</IonButton>
      <IonButton size="large">Large</IonButton>

      {/* With icons */}
      <IonButton>
        <IonIcon slot="start" icon={heart} />
        Like
      </IonButton>

      {/* Icon only */}
      <IonButton>
        <IonIcon slot="icon-only" icon={share} />
      </IonButton>

      {/* Full width */}
      <IonButton expand="block">Block Button</IonButton>
      <IonButton expand="full">Full Width</IonButton>
    </>
  );
}
```

### Cards

```tsx
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonImg,
  IonButton,
} from '@ionic/react';

function Cards() {
  return (
    <IonCard>
      <IonImg src="/card-image.jpg" alt="" />
      <IonCardHeader>
        <IonCardSubtitle>Card Subtitle</IonCardSubtitle>
        <IonCardTitle>Card Title</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        Card content goes here. This is a standard card with
        an image, title, subtitle, and content.
      </IonCardContent>
      <div className="ion-padding-horizontal ion-padding-bottom">
        <IonButton fill="clear">Action 1</IonButton>
        <IonButton fill="clear">Action 2</IonButton>
      </div>
    </IonCard>
  );
}
```

### Modals and Sheets

```tsx
import { IonModal, IonButton, IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/react';
import { useState, useRef } from 'react';

function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const modal = useRef<HTMLIonModalElement>(null);

  return (
    <>
      <IonButton onClick={() => setIsOpen(true)}>Open Modal</IonButton>

      {/* Full page modal */}
      <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Modal Title</IonTitle>
            <IonButton slot="end" onClick={() => setIsOpen(false)}>
              Close
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <p>Modal content</p>
        </IonContent>
      </IonModal>

      {/* Bottom sheet */}
      <IonModal
        ref={modal}
        trigger="open-sheet"
        initialBreakpoint={0.5}
        breakpoints={[0, 0.25, 0.5, 0.75, 1]}
      >
        <IonContent>
          <div className="ion-padding">
            <h2>Sheet Content</h2>
            <p>Drag to resize</p>
          </div>
        </IonContent>
      </IonModal>
      <IonButton id="open-sheet">Open Sheet</IonButton>
    </>
  );
}
```

## Navigation

### Tab Navigation

```tsx
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';
import { home, search, person } from 'ionicons/icons';

function TabsLayout() {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home" component={HomePage} />
        <Route exact path="/tabs/search" component={SearchPage} />
        <Route exact path="/tabs/profile" component={ProfilePage} />
        <Route exact path="/tabs">
          <Redirect to="/tabs/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={home} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="search" href="/tabs/search">
          <IonIcon icon={search} />
          <IonLabel>Search</IonLabel>
        </IonTabButton>
        <IonTabButton tab="profile" href="/tabs/profile">
          <IonIcon icon={person} />
          <IonLabel>Profile</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
```

### Stack Navigation

```tsx
import { IonReactRouter } from '@ionic/react-router';
import { IonRouterOutlet } from '@ionic/react';
import { Route } from 'react-router-dom';

function App() {
  return (
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/" component={Home} />
        <Route exact path="/detail/:id" component={Detail} />
      </IonRouterOutlet>
    </IonReactRouter>
  );
}
```

## Theming

### Theme Variables

```css
/* theme/variables.css */
:root {
  /* Primary */
  --ion-color-primary: #3880ff;
  --ion-color-primary-rgb: 56, 128, 255;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-shade: #3171e0;
  --ion-color-primary-tint: #4c8dff;

  /* Secondary */
  --ion-color-secondary: #3dc2ff;

  /* Custom colors */
  --ion-color-brand: #ff6b35;
  --ion-color-brand-rgb: 255, 107, 53;
  --ion-color-brand-contrast: #ffffff;
  --ion-color-brand-shade: #e05e2f;
  --ion-color-brand-tint: #ff7a49;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --ion-background-color: #121212;
    --ion-text-color: #ffffff;
    --ion-color-step-50: #1e1e1e;
    --ion-color-step-100: #2a2a2a;
  }
}

/* iOS specific */
.ios {
  --ion-toolbar-background: #f8f8f8;
}

/* Android specific */
.md {
  --ion-toolbar-background: #ffffff;
}
```

### Custom Component Styling

```css
/* Global styles */
ion-content {
  --background: var(--ion-background-color);
}

ion-card {
  --background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* Platform-specific */
.ios ion-toolbar {
  --border-width: 0;
}

.md ion-toolbar {
  --border-width: 0 0 1px 0;
}
```

## Platform-Specific Code

### Detect Platform

```typescript
import { isPlatform } from '@ionic/react';

// Check platform
if (isPlatform('ios')) {
  // iOS-specific code
}

if (isPlatform('android')) {
  // Android-specific code
}

if (isPlatform('hybrid')) {
  // Running in native app
}

if (isPlatform('mobileweb')) {
  // Running in mobile browser
}
```

### Conditional Rendering

```tsx
import { isPlatform, IonIcon } from '@ionic/react';
import { chevronBack, arrowBack } from 'ionicons/icons';

function BackButton() {
  return (
    <IonIcon
      icon={isPlatform('ios') ? chevronBack : arrowBack}
    />
  );
}
```

## Best Practices

### Performance

```tsx
// Use IonVirtualScroll for long lists
import { IonVirtualScroll } from '@ionic/react';

<IonVirtualScroll
  items={items}
  renderItem={(item) => (
    <IonItem key={item.id}>
      <IonLabel>{item.name}</IonLabel>
    </IonItem>
  )}
/>

// Lazy load images
<IonImg src={url} />  // Automatically lazy loads
```

### Accessibility

```tsx
// Always provide labels
<IonButton aria-label="Delete item">
  <IonIcon slot="icon-only" icon={trash} />
</IonButton>

// Use semantic elements
<IonItem button role="link">
  <IonLabel>Clickable item</IonLabel>
</IonItem>
```

### Safe Area

```tsx
// Content respects safe areas by default
<IonContent>
  {/* Auto padding for notch/home indicator */}
</IonContent>

// Custom safe area handling
<div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
  Custom header
</div>
```

## Resources

- Ionic Documentation: https://ionicframework.com/docs
- Ionic Components: https://ionicframework.com/docs/components
- Ionicons: https://ionic.io/ionicons
- Color Generator: https://ionicframework.com/docs/theming/color-generator
