---
description: 'Astro development standards and best practices for content-driven websites'
applyTo: '**/*.astro, **/*.ts, **/*.js, **/*.md, **/*.mdx'
---

# Astro Development Instructions

Instructions for building high-quality Astro applications following the content-driven, server-first architecture with modern best practices.

## Project Context
- Astro 5.x with Islands Architecture and Content Layer API
- TypeScript for type safety and better DX with auto-generated types
- Content-driven websites (blogs, marketing, e-commerce, documentation)
- Server-first rendering with selective client-side hydration
- Support for multiple UI frameworks (React, Vue, Svelte, Solid, etc.)
- Static site generation (SSG) by default with optional server-side rendering (SSR)
- Enhanced performance with modern content loading and build optimizations

## Development Standards

### Architecture
- Embrace the Islands Architecture: server-render by default, hydrate selectively
- Organize content with Content Collections for type-safe Markdown/MDX management
- Structure projects by feature or content type for scalability
- Use component-based architecture with clear separation of concerns
- Implement progressive enhancement patterns
- Follow Multi-Page App (MPA) approach over Single-Page App (SPA) patterns

### TypeScript Integration
- Configure `tsconfig.json` with recommended v5.0 settings:
```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```
- Types auto-generated in `.astro/types.d.ts` (replaces `src/env.d.ts`)
- Run `astro sync` to generate/update type definitions
- Define component props with TypeScript interfaces
- Leverage auto-generated types for content collections and Content Layer API

### Component Design
- Use `.astro` components for static, server-rendered content
- Import framework components (React, Vue, Svelte) only when interactivity is needed
- Follow Astro's component script structure: frontmatter at top, template below
- Use meaningful component names following PascalCase convention
- Keep components focused and composable
- Implement proper prop validation and default values

### Content Collections

#### Modern Content Layer API (v5.0+)
- Define collections in `src/content.config.ts` using the new Content Layer API
- Use built-in loaders: `glob()` for file-based content, `file()` for single files
- Leverage enhanced performance and scalability with the new loading system
- Example with Content Layer API:
```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional()
  })
});
```

#### Legacy Collections (backward compatible)
- Legacy `type: 'content'` collections still supported via automatic glob() implementation
- Migrate existing collections by adding explicit `loader` configuration
- Use type-safe queries with `getCollection()` and `getEntry()`
- Structure content with frontmatter validation and auto-generated types

### View Transitions & Client-Side Routing
- Enable with `<ClientRouter />` component in layout head (renamed from `<ViewTransitions />` in v5.0)
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

### Client-Side Interactivity
- Use framework components (React, Vue, Svelte) for interactive elements
- Choose the right hydration strategy based on user interaction patterns
- Implement state management within framework boundaries
- Handle client-side routing carefully to maintain MPA benefits
- Use Web Components for framework-agnostic interactivity
- Share state between islands using stores or custom events

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

### Build & Deployment
- Optimize static assets with Astro's built-in optimizations
- Configure deployment for static (SSG) or hybrid (SSR) rendering
- Use environment variables for configuration management
- Enable compression and caching for production builds

## Key Astro v5.0 Updates

### Breaking Changes
- **ClientRouter**: Use `<ClientRouter />` instead of `<ViewTransitions />`
- **TypeScript**: Auto-generated types in `.astro/types.d.ts` (run `astro sync`)
- **Content Layer API**: New `glob()` and `file()` loaders for enhanced performance

### Migration Example
```typescript
// Modern Content Layer API
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({ title: z.string(), pubDate: z.date() })
});
```

## Implementation Guidelines

### Development Workflow
1. Use `npm create astro@latest` with TypeScript template
2. Configure Content Layer API with appropriate loaders
3. Set up TypeScript with `astro sync` for type generation
4. Create layout components with Islands Architecture
5. Implement content pages with SEO and performance optimization

### Astro-Specific Best Practices
- **Islands Architecture**: Server-first with selective hydration using client directives
- **Content Layer API**: Use `glob()` and `file()` loaders for scalable content management
- **Zero JavaScript**: Default to static rendering, add interactivity only when needed
- **View Transitions**: Enable SPA-like navigation with `<ClientRouter />`
- **Type Safety**: Leverage auto-generated types from Content Collections
- **Performance**: Optimize with built-in image optimization and minimal client bundles
