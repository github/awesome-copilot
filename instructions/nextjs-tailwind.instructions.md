---
description: 'Next.js + Tailwind development standards and instructions'
applyTo: '**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css'
---

# Next.js + Tailwind Development Instructions

Instructions for high-quality Next.js applications with Tailwind CSS styling and TypeScript.

## Project Context

- Follow the Next.js, React, and Tailwind versions installed in `package.json` and the lockfile; do not upgrade dependencies as a side effect of a feature or fix.
- Use the project's existing router and build configuration. The guidance below targets the App Router.
- TypeScript for type safety
- Tailwind CSS for styling

### Version-Specific Behavior
- For Next.js 15+, handle request APIs such as `cookies`, `headers`, `draftMode`, route `params`, and page `searchParams` asynchronously. Next.js 16 removes their temporary synchronous compatibility.
- For Next.js 15+, do not assume `fetch` or `GET` Route Handlers are cached by default. Select caching and revalidation deliberately for the installed version and test freshness after mutations.
- Next.js 16 uses Turbopack for development and builds by default. Check custom Webpack configuration before changing build scripts; retain an explicit Webpack build when the project requires it.
- For Tailwind v4, use the CSS-first setup (`@import "tailwindcss"` and theme variables) and the appropriate Vite or PostCSS integration. Preserve a v3 project's configuration and browser support requirements unless migration is requested.

References: [Next.js 15 upgrade guide](https://nextjs.org/docs/15/app/guides/upgrading/version-15), [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

## Development Standards

### Architecture
- App Router with server and client components
- Group routes by feature/domain
- Implement proper error boundaries
- Use React Server Components by default
- Leverage static optimization where possible

### TypeScript
- Strict mode enabled
- Clear type definitions
- Proper error handling with type guards
- Zod for runtime type validation

### Styling
- Tailwind CSS with consistent color palette
- Responsive design patterns
- Dark mode support
- Follow container queries best practices
- Maintain semantic HTML structure

### State Management
- React Server Components for server state
- React hooks for client state
- Proper loading and error states
- Optimistic updates where appropriate

### Data Fetching
- Server Components for direct database queries
- React Suspense for loading states
- Proper error handling and retry logic
- Cache invalidation strategies

### Security
- Input validation and sanitization
- Proper authentication checks
- CSRF protection
- Rate limiting implementation
- Secure API route handling

### Performance
- Image optimization with next/image
- Font optimization with next/font
- Route prefetching
- Proper code splitting
- Bundle size optimization

## Implementation Process
1. Plan component hierarchy
2. Define types and interfaces
3. Implement server-side logic
4. Build client components
5. Add proper error handling
6. Implement responsive styling
7. Add loading states
8. Write tests
