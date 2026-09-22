---
description: 'Astro 7 development standards and best practices for content-driven websites'
applyTo: '**/*.astro, **/*.ts, **/*.js, **/*.md, **/*.mdx'
---

# Astro Development Instructions

Instructions for building high-quality Astro applications following the content-driven, server-first architecture with modern best practices.

> [!NOTE]
> Examples and APIs in this guide target Astro 7.x.

## Project Context
- Astro 7.x with Islands Architecture and the Content Layer API
- TypeScript for type safety and better DX with auto-generated types
- Content-driven websites (blogs, marketing, e-commerce, documentation)
- Server-first rendering with selective client-side hydration
- Support for multiple UI frameworks (React, Vue, Svelte, Solid, etc.)
- Static site generation (SSG) by default with optional server-side rendering (SSR)

## Development Standards

### Architecture
- Embrace the Islands Architecture: server-render by default, hydrate selectively
- Organize content with Content Collections for type-safe Markdown/MDX management
- Structure projects by feature or content type for scalability
- Use component-based architecture with clear separation of concerns
- Implement progressive enhancement patterns
- Follow Multi-Page App (MPA) approach over Single-Page App (SPA) patterns

### TypeScript Integration
- Extend Astro's base config in `tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```
- Types are auto-generated in `.astro/types.d.ts`; run `astro sync` after changing collections or config
- Define component props with TypeScript interfaces
- Leverage auto-generated types for content collections and the Content Layer API

### Component Design
- Use `.astro` components for static, server-rendered content
- Import framework components (React, Vue, Svelte) only when interactivity is needed
- Follow Astro's component script structure: frontmatter at top, template below
- Use meaningful component names following PascalCase convention
- Keep components focused and composable
- Implement proper prop validation and default values
- Write valid, fully-closed HTML: the compiler errors on unclosed tags and does not auto-correct invalid nesting (e.g. block elements inside `<p>`)

### Content Collections
- Define collections in `src/content.config.ts` with the Content Layer API
- Use built-in loaders: `glob()` for file-based content, `file()` for a single data file
- Import `z` from `astro/zod` (not from `astro:content`) and prefer top-level Zod helpers such as `z.email()` and `z.url()`
- Query content with type-safe `getCollection()` and `getEntry()`
- Example collection definition:
```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

### View Transitions & Client-Side Routing
- Enable with the `<ClientRouter />` component in your layout `<head>`
- Import from `astro:transitions`: `import { ClientRouter } from 'astro:transitions'`
- Provides SPA-like navigation without full page reloads
- Customize transition animations with CSS and view-transition-name
- Maintain state across page navigations with persistent islands
- Use `transition:persist` directive to preserve component state

### Performance Optimization
- Default to zero JavaScript - only add interactivity where needed
- Use client directives strategically (`client:load`, `client:idle`, `client:visible`)
- Implement lazy loading for images and components
- Optimize static assets with Astro's built-in optimization
- Leverage Content Layer API for faster content loading and builds
- Minimize bundle size by avoiding unnecessary client-side JavaScript

### Styling
- Use scoped styles in `.astro` components by default
- Implement CSS preprocessing (Sass, Less) when needed
- Use CSS custom properties for theming and design systems
- Follow mobile-first responsive design principles
- Ensure accessibility with semantic HTML and proper ARIA attributes
- Consider utility-first frameworks (Tailwind CSS) for rapid development
- Astro strips whitespace using JSX rules by default (`compressHTML: 'jsx'`); add an explicit `{" "}` between inline elements when a visible space is required

### Client-Side Interactivity
- Use framework components (React, Vue, Svelte) for interactive elements
- Choose the right hydration strategy based on user interaction patterns
- Implement state management within framework boundaries
- Handle client-side routing carefully to maintain MPA benefits
- Use Web Components for framework-agnostic interactivity
- Share state between islands using stores or custom events

### Server Islands
- Use `server:defer` to render a server island on demand without blocking the rest of the page
- Provide fallback content for the loading state via a `slot="fallback"`
- Requires an SSR adapter (on-demand rendering) to be configured
- Example:
```astro
---
import Avatar from '../components/Avatar.astro';
---
<Avatar server:defer>
  <div slot="fallback">Loading…</div>
</Avatar>
```

### Actions
- Define type-safe server functions in `src/actions/index.ts` and prefer them over ad-hoc API routes for mutations and form handling
- Validate input with a Zod schema; set `accept: 'form'` to handle HTML form submissions
- Call actions from the client via the `astro:actions` module and handle the `{ data, error }` result
- Example:
```typescript
// src/actions/index.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  subscribe: defineAction({
    accept: 'form',
    input: z.object({ email: z.email() }),
    handler: async ({ email }) => {
      // persist the subscription
      return { success: true };
    },
  }),
};
```

### Sessions
- Read and write server-side state with `Astro.session` (`get`, `set`) instead of overloading cookies
- Requires an SSR adapter with session storage configured
- Useful for carts, flash messages, and other per-visitor data that should not live on the client

### API Routes and SSR
- Create API routes in `src/pages/api/` for dynamic functionality
- Use proper HTTP methods and status codes
- Implement request validation and error handling
- Enable SSR mode for dynamic content requirements
- Use middleware for authentication and request processing
- Handle environment variables securely

### SEO and Meta Management
- Use Astro's built-in SEO components and meta tag management
- Implement proper Open Graph and Twitter Card metadata
- Generate sitemaps automatically for better search indexing
- Use semantic HTML structure for better accessibility and SEO
- Implement structured data (JSON-LD) for rich snippets
- Optimize page titles and descriptions for search engines

### Image Optimization
- Use Astro's `<Image />` component for automatic optimization
- Implement responsive images with proper srcset generation
- Use WebP and AVIF formats for modern browsers
- Lazy load images below the fold
- Provide proper alt text for accessibility
- Optimize images at build time for better performance

### Data Fetching
- Fetch data at build time in component frontmatter
- Use dynamic imports for conditional data loading
- Implement proper error handling for external API calls
- Cache expensive operations during build process
- Use Astro's built-in fetch with automatic TypeScript inference
- Handle loading states and fallbacks appropriately
