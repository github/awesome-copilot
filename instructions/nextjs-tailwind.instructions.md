---
description: 'Next.js 15+ App Router and Tailwind CSS v4 development standards'
applyTo: 'app/**/*.{ts,tsx,js,jsx}, src/app/**/*.{ts,tsx,js,jsx}, components/**/*.{ts,tsx,js,jsx}, lib/**/*.{ts,tsx,js,jsx}, **/*.css'
---

# Next.js 15+ and Tailwind CSS v4 Development Instructions

Technical standards and guidelines for building production-ready Next.js applications using the App Router, React 19, and Tailwind CSS v4.

## Project Context

- Next.js 15+ / 16 (App Router)
- React 19 (Server Components by default)
- Tailwind CSS v4 (CSS-first configuration)

## Core Architectural Standards

### 1. Server and Client Component Boundaries
- Treat all components inside `app/` as React Server Components (RSC) by default.
- Place `'use client'` only at the boundary of interactive leaf nodes (event handlers, browser APIs, React client state).
- Keep data fetching, secrets, and database access strictly on the server.
- Pass server data to client components as serializable props.

### 2. Asynchronous Request APIs (Next.js 15+)
- In Next.js 15+, `params`, `searchParams`, `cookies()`, and `headers()` are asynchronous and must be awaited.
- Standard page signature:
  ```typescript
  interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }

  export default async function Page({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { query } = await searchParams;
    // render logic
  }
  ```
- Server Action and Route Handler context:
  ```typescript
  import { cookies, headers } from 'next/headers';

  export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    return token;
  }
  ```

### 3. Server Actions and Forms (React 19)
- Declare mutation actions in dedicated server files with `'use server'` or inline inside Server Components.
- Use React 19 `useActionState` instead of deprecated `useFormState`.
- Maintain validation safety using Zod or standard schema parsers on all form data before database writes.

## Tailwind CSS v4 Guidelines

### 1. CSS-First Configuration
- Do not generate `tailwind.config.js`. Tailwind CSS v4 uses native CSS imports and directives in the root stylesheet (e.g. `globals.css`):
  ```css
  @import "tailwindcss";

  @theme {
    --color-brand-primary: #0969da;
    --color-brand-muted: #57606a;
    --font-sans: var(--font-inter), system-ui, sans-serif;
  }
  ```

### 2. Class Merging Utility (`lib/utils.ts`)
- Use a dedicated class helper combining `clsx` and `tailwind-merge` for conditional styling and prop overrides:
  ```typescript
  import { type ClassValue, clsx } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

### 3. Utility Class Conventions
- Use Tailwind v4 standard utilities: `size-*` for equal width and height (`size-4` instead of `w-4 h-4`).
- Rely on native CSS container queries (`@container` and `@min-[...]`) for modular component styling.

## Performance and Reliability

- Image optimization: Always use `next/image` with explicit `width`, `height`, and `sizes`. For above-the-fold Largest Contentful Paint (LCP) images, use `preload` in Next.js 16+ (or `priority` in Next.js 15.x).
- Font optimization: Load web fonts through `next/font/google` or `next/font/local` using CSS variables to prevent layout shifts.
- Route boundaries: Colocate `loading.tsx` for React Suspense fallbacks and `error.tsx` (client component) for error isolation.
- Caching architecture: Refer to `instructions/nextjs.instructions.md` for Next.js 16 Cache Components (`cacheComponents` + `use cache`) and revalidation strategies.
