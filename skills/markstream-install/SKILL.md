---
name: markstream-install
description: 'Install and configure Markstream streaming Markdown renderers for Vue, React, Svelte, Angular, Nuxt, and Vue 2 applications. Use for package selection, minimal peer dependencies, CSS order, SSR boundaries, streaming mode, and renderer setup.'
license: MIT
compatibility: 'JavaScript or TypeScript frontend project using Vue 3, Nuxt 3/4, Vue 2.6/2.7, React 18+, Next.js, Angular 20+, or Svelte 5.'
metadata:
  source: https://github.com/Simon-He95/markstream-vue
  documentation: https://markstream.simonhe.me/
---

# Markstream Install

Integrate the appropriate [Markstream](https://github.com/Simon-He95/markstream-vue) package into an existing application without installing unnecessary optional dependencies or weakening its security defaults.

Read [references/scenarios.md](references/scenarios.md) before choosing packages or peers.

## When to Use

Use this skill when the user asks to:

- add streaming Markdown rendering to an AI chat or document interface;
- install Markstream in Vue, Nuxt, React, Next.js, Svelte, Angular, or Vue 2;
- repair a broken Markstream installation, missing styles, or SSR failure;
- replace another Markdown renderer with Markstream;
- choose between static, smooth-streaming, and externally parsed AST input.

## Workflow

### 1. Inspect the host application

Before changing dependencies, inspect:

- the framework and version in `package.json`;
- the package manager lockfile;
- whether the application uses SSR;
- reset, Tailwind, UnoCSS, or design-system styles;
- required optional features: code highlighting, Monaco, Mermaid, D2, or KaTeX.

Do not assume the Vue package is correct merely because the source repository is named `markstream-vue`. Select the framework-specific package from the scenario table.

### 2. Install the smallest dependency set

Install exactly one framework package. Add optional peers only when the requested UI uses their feature.

Examples:

```bash
npm install markstream-vue
npm install markstream-react
npm install markstream-svelte
npm install markstream-angular
npm install markstream-vue2
```

Preserve the repository's existing package manager. Do not install every optional peer preemptively.

### 3. Wire styles in the correct order

Import application resets before Markstream styles. Import package CSS explicitly; do not rely on component imports to inject it.

For Tailwind or UnoCSS, use the relevant package subpath in a component layer:

```css
@import 'markstream-vue/index.css' layer(components);
```

Use the matching package name for React, Svelte, Angular, or Vue 2. If math rendering is enabled, also import:

```css
@import 'katex/dist/katex.min.css';
```

Vue CLI 4 and other Webpack 4-based Vue 2 applications cannot resolve package export maps. In those projects, import the published file directly:

```ts
import 'markstream-vue2/dist/index.css'
```

### 4. Add the smallest working renderer

Prefer `content` for static documents and most streaming chat interfaces. Markstream's built-in smooth streaming can pace irregular token delivery without requiring the host to maintain an AST.

For Vue 3 chat surfaces, start with:

```vue
<MarkdownRender
  mode="chat"
  :content="markdown"
  :final="false"
  smooth-streaming="auto"
  :fade="false"
  typewriter
/>
```

For completed chat history, keep the same renderer mode and switch pacing off:

```vue
<MarkdownRender
  mode="chat"
  :content="markdown"
  :final="true"
  :smooth-streaming="false"
  :fade="true"
  :typewriter="false"
/>
```

In React, Svelte, and Angular, use the equivalent camelCase or framework binding syntax. Keep `smoothStreaming="auto"`, `fade=false`, and `typewriter=true` while streaming; use `smoothStreaming=false` and `typewriter=false` for completed history.

Use `nodes` plus `final` only when a worker, shared AST store, custom transform, or another application layer already owns parsing.

### 5. Handle framework-specific boundaries

- In Nuxt, keep browser-only optional peers behind client boundaries.
- In Next.js, use the root `markstream-react` entry inside a `'use client'` component for live SSE or WebSocket streams. Use `markstream-react/next` for SSR-first HTML with hydration, or `markstream-react/server` for server-only rendering.
- Use `markstream-svelte` only with Svelte 5.
- Confirm the Angular application meets the current `markstream-angular` version requirement.
- In Vue 3, use `mode="chat"` for AI chat, `mode="docs"` for rich documents, and `mode="minimal"` for lightweight non-chat surfaces.
- For long Vue 3 conversations or an existing message virtualizer, consult the Markstream performance guide before adding a second virtualizer.

### 6. Preserve safe defaults

HTML policy defaults to `safe`, and Mermaid uses strict mode. Do not broaden either setting unless the user explicitly identifies a trusted legacy surface that requires it. Scope any exception to that surface.

### 7. Validate

Run the smallest relevant build, typecheck, or test command. Confirm:

1. the selected package matches the framework;
2. only requested optional peers were added;
3. styles load after resets;
4. SSR pages do not evaluate browser-only peers on the server;
5. static content and at least one incremental update render correctly.

Report the selected package, added peers, CSS location, streaming input choice, and validation command.

## Official References

- [Installation](https://markstream.simonhe.me/guide/installation)
- [AI chat and streaming](https://markstream.simonhe.me/guide/ai-chat-streaming)
- [Performance](https://markstream.simonhe.me/guide/performance)
- [Troubleshooting](https://markstream.simonhe.me/guide/troubleshooting)
- [Component overrides](https://markstream.simonhe.me/guide/component-overrides)
