# Install Scenarios

## Package selection

| Host app | Package |
|----------|---------|
| Vue 3 / Nuxt 3 or 4 | `markstream-vue` |
| Vue 2.6 / 2.7 | `markstream-vue2` |
| React 18+ / Next.js | `markstream-react` |
| Angular 20+ | `markstream-angular` |
| Svelte 5 | `markstream-svelte` |

## Peer selection

| Feature | Peer |
|---------|------|
| Lightweight highlighted code blocks | `stream-markdown` |
| Monaco-powered code blocks | `stream-monaco` |
| Mermaid diagrams | `mermaid` |
| D2 diagrams | `@terrastruct/d2` |
| KaTeX math | `katex` |

## CSS checklist

- Load reset styles first.
- Load the framework-specific Markstream CSS after the reset.
- In Tailwind or UnoCSS projects, use `@import '...' layer(components)`.
- Import KaTeX CSS when math is enabled.
- When rendering standalone node components directly, wrap them with the relevant package root class such as `.markstream-vue`, `.markstream-react`, or `.markstream-svelte`.

## Input choice

- `content`: static documents, low-frequency updates, and most SSE or token-streaming chat surfaces.
- `content` with built-in smooth streaming: irregular AI streams whose visible output should be paced independently from raw chunk cadence.
  - `smoothStreaming="auto"` or `smooth-streaming="auto"` is the default.
  - Auto pacing activates when `typewriter=true` or `maxLiveNodes <= 0` / `max-live-nodes <= 0`.
  - `typewriter` controls the cursor and defaults to `false`.
  - `fade` controls node-entry and streamed-text fade effects.
- `nodes` plus `final`: worker-preparsed content, shared AST stores, custom AST transforms, or cases where another layer already owns parsing.
