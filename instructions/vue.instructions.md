---
description: 'Comprehensive Vue 3 development standards and best practices: Composition API, `<script setup>`, the full reactivity system, compiler macros (defineModel/defineSlots/defineOptions), built-in components (Teleport/Suspense/Transition/KeepAlive), provide/inject, composables, Pinia, Vue Router, TypeScript, testing, performance, SSR, and security.'
applyTo: '**/*.vue, **/*.ts, **/*.js, **/*.css, **/*.scss'
---

# Vue 3 Development Instructions

Authoritative guidance for building production-grade Vue 3 applications. Default to the **Composition API** with `<script setup lang="ts">`, the modern reactivity system, and the official ecosystem (Pinia, Vue Router, Vite, Vitest). Prefer the idioms below over legacy Options API and Vue 2 patterns.

## Project Context
- Vue 3.4+ (use 3.5+ features such as `useTemplateRef`, `useId`, and reactive props destructuring where the project's version allows).
- `<script setup lang="ts">` single-file components (SFCs) as the default authoring style.
- TypeScript everywhere: components, composables, stores, and router.
- Pinia for state management; Vue Router for routing; Vite for build/dev.
- Vitest + Vue Test Utils (or Testing Library for Vue) for tests.

## Authoring Style & Component Design
- Use `<script setup>` — it is more concise, faster, and has better type inference than `setup()` or the Options API.
- One responsibility per component; split large components into smaller focused ones plus composables.
- Order an SFC as `<script setup>`, then `<template>`, then `<style scoped>`.
- Name components in PascalCase; use multi-word names (e.g. `UserCard`, not `Card`) to avoid clashing with native elements.
- Co-locate component-specific types, and lift shared types into a `types/` module.

## Compiler Macros (no imports needed)
- `defineProps<T>()` — declare typed props from a TypeScript interface/type for full inference.
- `withDefaults(defineProps<T>(), { ... })` — provide prop defaults (or use reactive props destructuring with defaults in 3.5+).
- `defineEmits<{ change: [id: number]; update: [value: string] }>()` — declare typed events.
- `defineModel<T>()` (3.4+) — the canonical way to implement `v-model` on a component; supports multiple models, arguments, and modifiers.
- `defineExpose({ ... })` — explicitly expose a public imperative API; expose nothing by default.
- `defineSlots<{ default(props: { item: T }): any }>()` — type named/scoped slots.
- `defineOptions({ name, inheritAttrs })` — set component options inside `<script setup>`.
- Never mutate props directly — emit an event, use `defineModel`, or derive local state with `computed`/`ref`.

## Reactivity System
### Core primitives
- `ref()` for primitives and single replaceable references; access via `.value` in script (auto-unwrapped in templates).
- `reactive()` for deep-reactive objects/collections; never destructure it directly (breaks reactivity) — use `toRefs()`/`toRef()`.
- `computed()` for derived values; keep getters pure and side-effect free. Use writable computed (`get`/`set`) for two-way derived state.
- Prefer `computed` over `watch` whenever you are *deriving* a value rather than performing a side effect.

### Watchers
- `watch(source, cb, options)` for explicit dependencies; `watchEffect(cb)` for auto-tracked dependencies.
- Use watch options deliberately: `{ immediate: true }`, `{ deep: true }`, `{ once: true }` (3.4+), and `flush: 'post'` when you need the DOM updated first.
- Register cleanup with the `onCleanup`/`onWatcherCleanup` callback to cancel stale async work (debounce, fetch, listeners).
- Stop manual watchers via their returned handle when they outlive their natural scope.

### Advanced reactivity (use intentionally)
- `shallowRef` / `shallowReactive` for large or externally-managed data to skip deep tracking.
- `readonly()` to hand out immutable views of shared state.
- `toRef` / `toRefs` to keep reactivity when destructuring; `toRaw`/`markRaw` to opt out for non-reactive objects (e.g. class instances, 3rd-party clients).
- `effectScope()` to group and dispose related effects together (useful in composables/libraries).
- `customRef` for debounced/throttled or storage-backed refs.

## Composables (reusable logic)
- Extract stateful, reusable logic into `useXxx()` functions under `composables/`.
- Accept refs/getters as inputs and return refs/computed; use `toValue()`/`MaybeRefOrGetter` to normalize ref-or-plain inputs.
- Set up and tear down inside the composable (`onMounted`/`onUnmounted` or `tryOnScopeDispose`) so callers don't leak.
- Keep composables synchronous in their setup phase; expose async actions as returned functions.
- Reach for VueUse for common needs instead of re-implementing (e.g. `useStorage`, `useEventListener`, `useDebounceFn`).

## Lifecycle & Effects
- Use `onMounted`, `onBeforeMount`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`/`onDeactivated` (with `<KeepAlive>`), and `onErrorCaptured`.
- Always clean up timers, listeners, observers, and subscriptions in `onUnmounted`.
- Guard browser-only APIs (`window`, `document`) for SSR; run them in `onMounted`.

## Template Best Practices
- Always set a stable, unique `:key` on `v-for`; never use the array index when items can reorder or mutate.
- Never put `v-if` and `v-for` on the same element — filter via a `computed` instead.
- `v-show` for frequently toggled elements; `v-if` for conditional mounting.
- Use `v-memo` to skip re-rendering of expensive static subtrees, and `v-once` for content that renders a single time.
- Use the `:` (v-bind) and `@` (v-on) shorthands consistently; group nodes with `<template>` to avoid wrapper elements.
- Avoid heavy expressions in templates — move them to `computed` or methods.

## Slots
- Use named slots for layout extension and scoped slots (`<slot :item="item" />` + `#default="{ item }"`) to expose data to the parent.
- Provide sensible fallback slot content.
- Use the `v-slot` (`#`) shorthand and dynamic slot names where appropriate.

## Built-in Components
- `<Teleport to="body">` for modals, toasts, and tooltips that must escape overflow/stacking contexts.
- `<Suspense>` with `#default`/`#fallback` for async setup and lazy components; pair with error handling.
- `<Transition>` / `<TransitionGroup>` for enter/leave and list animations (set `:key` on grouped items).
- `<KeepAlive>` (with `include`/`exclude`/`max`) to cache component state across toggles; handle `onActivated`/`onDeactivated`.
- `<component :is="...">` for dynamic components; `defineAsyncComponent(() => import('...'))` for code-split/lazy loading with loading/error components.

## Provide / Inject (dependency injection)
- Type injections with an `InjectionKey<T>` (`Symbol`) for safety: `provide(key, value)` / `inject(key)`.
- Provide a default or assert presence to avoid `undefined`.
- Prefer `readonly()` when providing state that children should not mutate; expose explicit updater functions instead.
- Use injection for cross-cutting concerns; use Pinia for app-wide shared state.

## Custom Directives & Plugins
- Author directives as objects with `mounted`/`updated` (etc.) hooks; keep them DOM-focused (e.g. `v-focus`, `v-click-outside`).
- Encapsulate global setup (router, pinia, i18n, UI libs) as plugins via `app.use(...)`; register global config in `main.ts`.

## State Management with Pinia
- Use Pinia for shared/cross-component state; keep component-only state local with `ref`/`reactive`.
- Prefer **setup stores**: `defineStore('user', () => { const user = ref(...); const isLoggedIn = computed(...); function login(){}; return { user, isLoggedIn, login } })`.
- One store per domain; keep actions for async/side effects and getters pure & synchronous.
- Destructure with `storeToRefs()` to preserve reactivity; use `$patch` for batched mutations, `$reset` to restore state, and `$subscribe`/`$onAction` for cross-cutting concerns.
- Handle SSR hydration correctly and keep stores serializable.

## Routing with Vue Router
- Define routes with lazy `component: () => import('...')` for automatic code splitting.
- Use navigation guards (`beforeEach`, `beforeEnter`, `beforeRouteLeave`) for auth and unsaved-changes checks; always resolve/`next()` exactly once.
- Use `route.meta` (typed) for per-route config like `requiresAuth`.
- Read params/query via `useRoute()` and navigate via `useRouter()`; treat `route.params` as reactive (watch it, don't cache).
- Configure `scrollBehavior` for predictable scroll restoration; enable typed routes where available.

## TypeScript Integration
- Type props/emits/slots through generic compiler macros, not runtime object syntax.
- Type refs explicitly when inference is too narrow: `ref<User | null>(null)`.
- Type template refs with `useTemplateRef<HTMLInputElement>('input')` (3.5+) or `ref<HTMLInputElement | null>(null)`.
- Build generic components with `<script setup lang="ts" generic="T">`.
- Type provide/inject with `InjectionKey<T>`; type Pinia stores via their inferred return types.

## Styling
- Default to `<style scoped>`; use `:deep()`, `:slotted()`, and `:global()` selectors deliberately.
- Use `v-bind()` in `<style>` to drive CSS from reactive state; prefer CSS custom properties for theming.
- Consider CSS Modules (`<style module>`) for class-name isolation in larger teams.

## Forms & Validation
- Bind inputs with `v-model` (and `defineModel` for custom inputs); use modifiers `.lazy`, `.number`, `.trim`.
- Validate with a schema library (Zod/Yup) plus a form library (VeeValidate or FormKit) for non-trivial forms.
- Client validation is for UX only — always validate and sanitize on the server.

## Error Handling
- Use `onErrorCaptured` for component-tree boundaries and `app.config.errorHandler` for a global hook.
- Wrap async/lazy boundaries with `<Suspense>` + an error fallback.
- Surface user-friendly errors; log diagnostics to your monitoring pipeline.

## Performance
- Code-split routes and heavy components (`defineAsyncComponent`, dynamic `import()`).
- Use `computed` for caching, `v-memo`/`v-once` for static subtrees, and `shallowRef`/`shallowReactive` for big datasets.
- Virtualize long lists (e.g. `vue-virtual-scroller`); paginate or window large data.
- Avoid unnecessary deep reactivity and avoid creating new object/array literals inline in templates.
- In 3.5+, consider lazy hydration strategies for SSR to reduce time-to-interactive.

## SSR / Meta-frameworks
- Prefer Nuxt for SSR/SSG/hybrid rendering unless you have a reason to hand-roll SSR.
- Keep code isomorphic: guard browser APIs, avoid module-level shared mutable state across requests, and ensure stores are request-scoped.
- Match server and client output to prevent hydration mismatches.

## Accessibility
- Use semantic HTML first; add ARIA only to fill genuine gaps.
- Ensure full keyboard operability and visible focus states.
- Manage focus on route changes and when opening/closing dialogs (trap focus in modals).
- Give icon-only controls accessible names (`aria-label`); associate labels with inputs.

## Security
- Never render untrusted input with `v-html`; sanitize (e.g. DOMPurify) if it is unavoidable.
- Avoid dynamic `:is`/`:href`/`:src` from untrusted sources; validate URLs (block `javascript:` schemes).
- Keep secrets server-side; only expose `VITE_`-prefixed env vars intentionally meant to be public.
- Apply a Content Security Policy and standard CSRF/XSS protections at the app layer.

## Testing
- Unit-test composables as plain functions; component-test with Vue Test Utils / Testing Library.
- Test observable behavior and rendered output, not internal implementation details.
- Mock stores with `createTestingPinia`; stub router and async boundaries as needed.
- Cover critical user journeys with end-to-end tests (Playwright or Cypress).

## Tooling
- Use Vite with the official Vue plugin; enable `vue-tsc` for type-checking in CI.
- Use ESLint (`eslint-plugin-vue`) and Prettier; enable Volar/Vue official extension for the best DX.
- Manage env via `import.meta.env` with `VITE_`-prefixed variables.

## Anti-Patterns to Avoid
- Mixing Options API and Composition API arbitrarily in the same codebase.
- Mutating props directly, or destructuring `reactive()`/Pinia stores without `toRefs`/`storeToRefs`.
- Using `watch` for values that should be `computed`.
- `v-if` together with `v-for` on one element; using array index as `:key`.
- Heavy logic inside templates; unbounded deep reactivity on large data.
- Leaking timers/listeners by skipping `onUnmounted` cleanup.
- Rendering untrusted HTML via `v-html`.
