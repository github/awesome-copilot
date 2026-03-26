---
name: tailwind-capacitor
description: Guide to using Tailwind CSS in Capacitor mobile apps. Covers mobile-first design, touch targets, safe areas, dark mode, and performance optimization. Use this skill when users want to style Capacitor apps with Tailwind.
---

# Tailwind CSS for Capacitor Apps

Build beautiful mobile apps with Tailwind CSS and Capacitor.

## When to Use This Skill

- User is using Tailwind in Capacitor app
- User asks about mobile styling
- User needs responsive mobile design
- User wants dark mode with Tailwind
- User needs safe area handling

## Getting Started

### Installation

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,vue,svelte}',
  ],
  theme: {
    extend: {
      // Mobile-first spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Minimum touch targets (44px)
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
};
```

### Import Styles

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Mobile-specific base styles */
@layer base {
  html {
    /* Prevent text size adjustment on orientation change */
    -webkit-text-size-adjust: 100%;
    /* Smooth scrolling */
    scroll-behavior: smooth;
    /* Prevent pull-to-refresh on overscroll */
    overscroll-behavior: none;
  }

  body {
    /* Prevent text selection on long press */
    -webkit-user-select: none;
    user-select: none;
    /* Disable callout on long press */
    -webkit-touch-callout: none;
    /* Prevent elastic scrolling on iOS */
    position: fixed;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Enable text selection in inputs */
  input, textarea {
    -webkit-user-select: text;
    user-select: text;
  }
}
```

## Safe Area Handling

### Utility Classes

```javascript
// tailwind.config.js
theme: {
  extend: {
    padding: {
      'safe': 'env(safe-area-inset-bottom)',
      'safe-t': 'env(safe-area-inset-top)',
      'safe-b': 'env(safe-area-inset-bottom)',
      'safe-l': 'env(safe-area-inset-left)',
      'safe-r': 'env(safe-area-inset-right)',
    },
    margin: {
      'safe': 'env(safe-area-inset-bottom)',
      'safe-t': 'env(safe-area-inset-top)',
      'safe-b': 'env(safe-area-inset-bottom)',
    },
  },
},
```

### Usage in Components

```tsx
// Header with safe area
function Header() {
  return (
    <header className="
      fixed top-0 left-0 right-0
      pt-safe-t  /* Padding for notch */
      bg-white dark:bg-gray-900
      border-b border-gray-200
    ">
      <div className="px-4 h-14 flex items-center">
        <h1 className="font-semibold">App Title</h1>
      </div>
    </header>
  );
}

// Footer with safe area
function Footer() {
  return (
    <footer className="
      fixed bottom-0 left-0 right-0
      pb-safe-b  /* Padding for home indicator */
      bg-white dark:bg-gray-900
      border-t border-gray-200
    ">
      <div className="px-4 h-14 flex items-center justify-around">
        <button className="min-h-touch min-w-touch">Home</button>
        <button className="min-h-touch min-w-touch">Search</button>
        <button className="min-h-touch min-w-touch">Profile</button>
      </div>
    </footer>
  );
}

// Main content
function Main() {
  return (
    <main className="
      pt-safe-t  /* Account for header + notch */
      pb-safe-b  /* Account for footer + home indicator */
      h-screen
      overflow-y-auto
      overscroll-none
    ">
      {/* Content */}
    </main>
  );
}
```

## Touch-Friendly Design

### Minimum Touch Targets

```tsx
// Apple HIG recommends 44x44pt minimum
function TouchableButton() {
  return (
    <button className="
      min-h-[44px] min-w-[44px]
      px-4 py-3
      flex items-center justify-center
      active:bg-gray-100
      rounded-lg
    ">
      Tap Me
    </button>
  );
}

// Icon button with proper touch target
function IconButton() {
  return (
    <button className="
      h-11 w-11  /* 44px */
      flex items-center justify-center
      rounded-full
      active:bg-gray-100
    ">
      <svg className="w-6 h-6" />  {/* Icon smaller than touch area */}
    </button>
  );
}
```

### Touch Feedback

```css
/* Add to index.css */
@layer utilities {
  .touch-feedback {
    @apply transition-colors duration-75;
  }

  .touch-feedback:active {
    @apply bg-black/5 dark:bg-white/5;
  }
}
```

```tsx
<button className="touch-feedback p-4 rounded-lg">
  With Feedback
</button>
```

### Disable Hover on Touch

```javascript
// tailwind.config.js
module.exports = {
  future: {
    hoverOnlyWhenSupported: true, // Disables hover on touch devices
  },
};
```

Or use media query:

```css
@media (hover: hover) {
  .hover-only:hover {
    @apply bg-gray-100;
  }
}
```

## Dark Mode

### System Dark Mode

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'media', // or 'class' for manual control
};
```

### Manual Dark Mode

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
};
```

```typescript
// theme.ts
import { Preferences } from '@capacitor/preferences';

type Theme = 'light' | 'dark' | 'system';

async function setTheme(theme: Theme) {
  await Preferences.set({ key: 'theme', value: theme });

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    const theme = await Preferences.get({ key: 'theme' });
    if (theme.value === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
```

### Dark Mode Components

```tsx
function Card() {
  return (
    <div className="
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700
      rounded-xl
      shadow-sm dark:shadow-none
    ">
      <h3 className="text-gray-900 dark:text-white">
        Card Title
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Card content
      </p>
    </div>
  );
}
```

## Mobile Patterns

### Pull to Refresh Container

```tsx
function PullToRefresh({ onRefresh, children }) {
  return (
    <div className="
      h-full
      overflow-y-auto
      overscroll-contain
      touch-pan-y
    ">
      {children}
    </div>
  );
}
```

### Bottom Sheet

```tsx
function BottomSheet({ isOpen, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0
          bg-black/50
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          fixed left-0 right-0 bottom-0
          bg-white dark:bg-gray-900
          rounded-t-2xl
          pb-safe-b
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {children}
      </div>
    </>
  );
}
```

### Swipe Actions

```tsx
function SwipeableItem({ children, onDelete }) {
  return (
    <div className="relative overflow-hidden">
      {/* Background action */}
      <div className="
        absolute inset-y-0 right-0
        flex items-center
        bg-red-500
        px-4
      ">
        <span className="text-white">Delete</span>
      </div>

      {/* Foreground content */}
      <div className="
        relative
        bg-white dark:bg-gray-800
        transform transition-transform
        active:cursor-grabbing
      ">
        {children}
      </div>
    </div>
  );
}
```

### Fixed Header with Blur

```tsx
function BlurHeader() {
  return (
    <header className="
      fixed top-0 left-0 right-0
      pt-safe-t
      bg-white/80 dark:bg-gray-900/80
      backdrop-blur-lg
      border-b border-gray-200/50
      z-50
    ">
      <div className="h-14 px-4 flex items-center">
        <h1 className="font-semibold">Title</h1>
      </div>
    </header>
  );
}
```

## Performance Optimization

### Reduce Bundle Size

```javascript
// tailwind.config.js
module.exports = {
  content: [/* ... */],
  // Only include used utilities
  safelist: [], // Add dynamic classes here if needed
};
```

### GPU Acceleration

```tsx
// Use transform for animations (GPU accelerated)
<div className="
  transform transition-transform duration-200
  hover:scale-105
  will-change-transform
">
  Animated Element
</div>
```

### Avoid Layout Thrashing

```tsx
// BAD: Causes reflow
<div className="w-full h-auto">

// GOOD: Fixed dimensions
<div className="w-full h-48">
```

## Component Examples

### Mobile List Item

```tsx
function ListItem({ title, subtitle, image, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        w-full
        flex items-center gap-4
        px-4 py-3
        min-h-[60px]
        active:bg-gray-50 dark:active:bg-gray-800
        text-left
      "
    >
      {image && (
        <img
          src={image}
          className="w-12 h-12 rounded-full object-cover"
          alt=""
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate">
            {subtitle}
          </p>
        )}
      </div>
      <svg className="w-5 h-5 text-gray-400" />
    </button>
  );
}
```

### Mobile Button

```tsx
function MobileButton({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-blue-500 text-white active:bg-blue-600',
    secondary: 'bg-gray-100 text-gray-900 active:bg-gray-200',
    danger: 'bg-red-500 text-white active:bg-red-600',
  };

  return (
    <button
      className={`
        w-full
        min-h-[48px]
        px-6 py-3
        font-semibold
        rounded-xl
        transition-colors duration-75
        disabled:opacity-50
        ${variants[variant]}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Mobile Input

```tsx
function MobileInput({ label, error, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
          {label}
        </span>
      )}
      <input
        className={`
          w-full
          px-4 py-3
          text-base  /* Prevents iOS zoom */
          bg-gray-50 dark:bg-gray-800
          border rounded-xl
          placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${error
            ? 'border-red-500'
            : 'border-gray-200 dark:border-gray-700'
          }
        `}
        {...props}
      />
      {error && (
        <span className="text-sm text-red-500 mt-1 block">{error}</span>
      )}
    </label>
  );
}
```

## Resources

- Tailwind CSS Documentation: https://tailwindcss.com/docs
- Tailwind Mobile Patterns: https://tailwindui.com/
- CSS Safe Area Guide: https://webkit.org/blog/7929/designing-websites-for-iphone-x/
