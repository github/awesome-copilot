---
description: 'Svelte 5 and SvelteKit 2 development standards and best practices for component-based user interfaces and full-stack applications'
applyTo: '**/*.svelte, **/*.ts, **/*.js, **/*.css, **/*.scss, **/*.json'
---

# Svelte 5 and SvelteKit Development Instructions

Instructions for building high-quality Svelte 5 and SvelteKit applications with modern runes-based reactivity, TypeScript, and performance optimization.

> [!NOTE]
> Examples and APIs in this guide target Svelte 5.x and SvelteKit 2.x. Features noted as experimental (`await` expressions and remote functions) require opt-in config flags and may change before they stabilize.

## Project Context
- Svelte 5.x with runes system ($state, $derived, $effect, $props, $bindable)
- SvelteKit 2.x for full-stack applications with file-based routing
- TypeScript for type safety and better developer experience
- Component-scoped styling with CSS custom properties
- Progressive enhancement and performance-first approach
- Modern build tooling (Vite) with optimizations

## Core Concepts

### Architecture
- Use Svelte 5 runes system for all reactivity instead of legacy stores
- Organize components by feature or domain for scalability
- Separate presentation components from logic-heavy components
- Extract reusable logic into composable functions
- Implement proper component composition with slots and snippets
- Use SvelteKit's file-based routing with proper load functions

### Component Design
- Follow single responsibility principle for components
- Use `<script lang="ts">` with runes syntax as default
- Keep components small and focused on one concern
- Implement proper prop validation with TypeScript annotations
- Use `{#snippet}` blocks for reusable template logic within components
- Use slots for component composition and content projection
- Pass `children` snippet for flexible parent-child composition
- Design components to be testable and reusable
- Prefer attachments (`{@attach}`, Svelte 5.29+) over actions (`use:`) for DOM interaction and third-party library integration — attachments react to state and compose cleanly
- Follow naming conventions: PascalCase for components, camelCase for functions and variables
- Document complex components and logic with JSDoc comments

## Reactivity and State

### Svelte 5 Runes System
- Use `$state()` for reactive local state management
- Implement `$derived()` for computed values and expensive calculations
- Use `$derived.by()` for complex computations beyond simple expressions
- Use `$effect()` sparingly - prefer `$derived` or function bindings for state sync
- Implement `$effect.pre()` for running code before DOM updates
- Use `untrack()` to prevent infinite loops when reading/writing same state in effects
- Define component props with `$props()` and destructuring with TypeScript annotations
- Use `$bindable()` for two-way data binding between components
- Use function bindings (`bind:value={() => value, (v) => (value = v)}`) when a binding needs to derive or validate the value
- Migrate from legacy stores to runes for better performance
- Override derived values directly for optimistic UI patterns (Svelte 5.25+)

### State Management
- Use `$state()` for local component state
- Implement type-safe context with `createContext()` helper over raw `setContext`/`getContext`
- Use context API for sharing reactive state down component trees
- Avoid global `$state` modules for SSR - use context to prevent cross-request data leaks
- Read SvelteKit app and navigation state from `$app/state` (`page`, `navigating`, `updated`); `$app/stores` is the legacy equivalent for SvelteKit < 2.12
- Keep state normalized for complex data structures
- Prefer `$derived()` over `$effect()` for computed values
- Implement proper state persistence for client-side data

### Effect Best Practices
- **Avoid** using `$effect()` to synchronize state - use `$derived()` instead
- **Do** use `$effect()` for side effects: analytics, logging, DOM manipulation
- **Do** return cleanup functions from effects for proper teardown
- Use `$effect.pre()` when code must run before DOM updates (e.g., scroll position)
- Use `$effect.root()` for manually controlled effects outside component lifecycle
- Use `untrack()` to read state without creating dependencies in effects
- Remember: async code in effects doesn't track dependencies after `await`

## SvelteKit Patterns

### Routing and Layouts
- Use `+page.svelte` for page components with proper SEO
- Implement `+layout.svelte` for shared layouts and navigation
- Handle routing with SvelteKit's file-based system

### Data Loading and Mutations
- Use `+page.server.ts` for server-side data loading and API calls
- Implement form actions in `+page.server.ts` for data mutations
- Use `+server.ts` for API endpoints and server-side logic
- Use SvelteKit's load functions for server-side and universal data fetching
- Implement proper loading, error, and success states
- Handle streaming data with promises in server load functions
- Use `invalidate()` and `invalidateAll()` for cache management
- Implement optimistic updates for better user experience
- Handle offline scenarios and network errors gracefully

### Remote Functions (experimental)
- Use remote functions (SvelteKit 2.27+) for type-safe client-server calls that always run on the server; define them in `.remote.ts` files as one of `query`, `form`, `command`, or `prerender`
- Opt in by setting `kit.experimental.remoteFunctions` and `compilerOptions.experimental.async` in `svelte.config.js`
- Read data with `query` and resolve it directly in markup with `await getPosts()`:
```ts
// src/routes/blog/data.remote.ts
import { query } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = query(async () => {
  return await db.sql`SELECT title, slug FROM post ORDER BY published_at DESC`;
});
```
- Remote files may import `$lib/server` modules for secrets and DB access, but must not live inside `src/lib/server`

### Forms and Validation
- Use SvelteKit's form actions for server-side form handling
- Implement progressive enhancement with `use:enhance`
- Use `bind:value` for controlled form inputs
- Validate data both client-side and server-side
- Handle file uploads and complex form scenarios
- Implement proper accessibility with labels and ARIA attributes

## UI and Styling

### Styling
- Use component-scoped styles with `<style>` blocks
- Implement CSS custom properties for theming and design systems
- Use `class:` directive for conditional styling
- Follow BEM or utility-first CSS conventions
- Implement responsive design with mobile-first approach
- Use `:global()` sparingly for truly global styles

### Transitions and Animations
- Use `transition:` directive for enter/exit animations (fade, slide, scale, fly)
- Use `in:` and `out:` for separate enter/exit transitions
- Implement `animate:` directive with `flip` for smooth list reordering
- Create custom transitions for branded motion design
- Use `|local` modifier to trigger transitions only on direct changes
- Combine transitions with keyed `{#each}` blocks for list animations

## TypeScript Integration
- Enable strict mode in `tsconfig.json` for maximum type safety
- Annotate props with TypeScript: `let { name }: { name: string } = $props()`
- Type event handlers, refs, and SvelteKit's generated types
- Use generic types for reusable components
- Leverage `$types.ts` files generated by SvelteKit
- Implement proper type checking with `svelte-check`
- Use type inference where possible to reduce boilerplate

## Code Quality

### Performance Optimization
- Use keyed `{#each}` blocks for efficient list rendering
- Implement lazy loading with dynamic `import()`; in Svelte 5 components are dynamic by default — assign the imported component to a capitalized variable and render `<Component />` (`<svelte:component>` is no longer needed in runes mode)
- Use `$derived()` for expensive computations to avoid unnecessary recalculations
- Use `$derived.by()` for complex derived values that require multiple statements
- Avoid `$effect()` for derived state - it's less efficient than `$derived()`
- Leverage SvelteKit's automatic code splitting and preloading
- Optimize bundle size with tree shaking and proper imports
- Use `$effect.tracking()` in abstractions to conditionally create reactive listeners

### Error Handling
- Implement `+error.svelte` pages for route-level error boundaries
- Use `<svelte:boundary>` (Svelte 5.3+) to contain rendering and effect errors at the component level, providing a `failed` snippet (with `reset`) or an `onerror` handler for fallback UI
- Use try/catch blocks in load functions and form actions
- Provide meaningful error messages and fallback UI
- Log errors appropriately for debugging
- Handle validation errors in forms with proper user feedback
- Use SvelteKit's `error()` and `redirect()` helpers for proper responses
- With the experimental `await` syntax (Svelte 5.36+, opt-in via `experimental.async`), show first-render UI with a `<svelte:boundary>` `pending` snippet and later loading states with `$effect.pending()`

### Security
- Sanitize user inputs to prevent XSS attacks
- Use `@html` directive carefully and validate HTML content
- Validate and sanitize data in load functions and form actions

### Accessibility
- Use semantic HTML elements and proper heading hierarchy
- Implement keyboard navigation for all interactive elements
- Provide proper ARIA labels and descriptions
- Ensure color contrast meets WCAG guidelines
- Implement focus management for dynamic content
