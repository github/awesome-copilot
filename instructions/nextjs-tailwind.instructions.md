---
description: 'Next.js 15+ App Router and Tailwind CSS v4 development standards'
applyTo: 'app/**/*.{ts,tsx,js,jsx}, src/app/**/*.{ts,tsx,js,jsx}, components/**/*.{ts,tsx,js,jsx}, lib/**/*.{ts,tsx,js,jsx}, **/*.css'
---

# Next.js 15+ and Tailwind CSS v4 Development Instructions

Technical standards and guidelines for integrating Tailwind CSS v4 within Next.js App Router applications.

## Project Context

- Next.js 15+ / 16 (App Router)
- React 19 (Server Components by default)
- Tailwind CSS v4 (CSS-first configuration)

For general Next.js architecture, server and client component boundaries, async request APIs, and caching models, refer to `instructions/nextjs.instructions.md`.

## Tailwind CSS v4 Configuration

### 1. CSS-First Setup
Do not generate `tailwind.config.js`. Tailwind CSS v4 uses native CSS imports and theme directives in the root stylesheet (e.g. `app/globals.css`):

```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #0969da;
  --color-brand-muted: #57606a;
  --font-sans: var(--font-inter), system-ui, sans-serif;
}
```

### 2. Class Merging Helper (`lib/utils.ts`)
Use a standard utility combining `clsx` and `tailwind-merge` to resolve conditional class logic and avoid conflicting Tailwind utility overrides:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 3. Utility Class Standards
- Use Tailwind v4 standard dimension utilities such as `size-*` for square elements (`size-4` instead of `w-4 h-4`).
- Prefer native CSS container queries (`@container` and `@min-[...]`) for modular UI components that adapt based on parent container width rather than viewport breakpoints.

## Asset and Font Optimization

- Image optimization: Use `next/image` with explicit `width`, `height`, and `sizes`. For above-the-fold Largest Contentful Paint (LCP) images, use `preload` in Next.js 16+ (or `priority` in Next.js 15.x).
- Font optimization: Load web fonts through `next/font/google` or `next/font/local` using CSS variables mapped into `@theme` tokens in `app/globals.css`.

## Reference Documentation

- [Next.js App Router Styling Documentation](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
