---
name: vue-to-react-converter
description: Convert Vue.js components (Composition API and Script Setup) to React components with functional components and Hooks. Use when users request converting Vue code to React, migrating Vue projects to React, or translating Vue syntax to React equivalents. Handles single components, multiple files, and dependency tracking. Supports conversion to both JavaScript and TypeScript React components based on user preference.
---

# Vue to React Converter

This skill converts Vue.js components (Composition API and Script Setup) to React functional components with Hooks.

## When to Use This Skill

Use this skill when users request:

- "Convert this Vue component to React"
- "I want to migrate a Vue project to React"
- "Rewrite this file in React"
- "Convert Vue Composition API to React Hooks"
- Converting single .vue files to React components
- Migrating entire Vue codebases to React
- Translating Vue patterns to React equivalents

## Conversion Workflow

### Step 1: Analyze the Vue Code

1. **Read the Vue component(s)** to understand:
   - Vue style used (Options API, Composition API, or Script Setup)
   - Component structure and dependencies
   - State management approach (local state, Vuex, Pinia)
   - Routing usage (Vue Router)
   - External dependencies and libraries

2. **Identify conversion scope**:
   - Single component conversion
   - Multiple related components
   - Full project migration with dependencies

3. **Check for complex patterns** that need special handling:
   - State management (Vuex/Pinia)
   - Routing (Vue Router)
   - Slots (especially scoped slots)
   - Provide/Inject
   - Transitions/Animations
   - Custom directives

### Step 2: Determine Output Format

Ask user about output preferences (if not specified):

- **Language**: JavaScript or TypeScript
- **Styling**: Keep existing styles or convert (CSS Modules, styled-components, etc.)
- **State management**: If using Vuex/Pinia, which React solution to use (Redux Toolkit, Zustand, Jotai, Context API)
- **File structure**: Maintain similar structure or follow React conventions

### Step 3: Convert the Component

1. **Convert the script section**:
   - Transform reactive state (ref → useState, reactive → useState with object)
   - Convert lifecycle hooks (onMounted → useEffect, etc.)
   - Transform computed properties (computed → useMemo or direct calculation)
   - Convert watchers (watch/watchEffect → useEffect)
   - Transform composables to custom hooks
   - Handle props (defineProps → function parameters)
   - Handle emits (defineEmits → callback props)

2. **Convert the template section**:
   - Transform template syntax to JSX
   - Convert directives (v-if → ternary, v-for → map, v-model → value + onChange)
   - Handle event listeners (@click → onClick)
   - Convert slots to children or render props
   - Transform :class and :style bindings

3. **Handle styles**:
   - Extract <style> section to separate file or keep inline
   - Convert scoped styles if necessary
   - Update class name references

4. **Update imports and exports**:
   - Convert Vue imports to React imports
   - Update component imports
   - Handle default exports

### Step 4: Handle Dependencies and Related Files

For multi-file conversions:

1. **Identify component dependencies**:
   - Find all imported child components
   - Track parent-child relationships
   - Map out shared utilities and composables

2. **Convert in dependency order**:
   - Start with leaf components (no dependencies)
   - Move up to parent components
   - Convert shared utilities/composables to hooks

3. **Update import paths**:
   - Change .vue extensions to .jsx/.tsx
   - Update relative paths if file structure changes

### Step 5: Review and Validate

1. **Check for common issues**:
   - Missing useState setters
   - Incorrect useEffect dependencies
   - Improper event handler binding
   - Missing key props in lists
   - Reactivity issues (direct mutation vs. setState)

2. **Verify patterns are idiomatic**:
   - Use functional updates for setState when needed
   - Avoid unnecessary useMemo/useCallback
   - Ensure proper cleanup in useEffect
   - Check for memory leaks

3. **Inform user about manual adjustments needed**:
   - Complex animations requiring libraries
   - Custom directives needing different approach
   - Performance optimizations specific to React

## Reference Files

This skill includes detailed reference documentation:

- **[conversion-guide.md](references/conversion-guide.md)**: Comprehensive guide for converting Vue Composition API and Script Setup to React Hooks
  - Basic structure conversion
  - Reactive data transformation (ref → useState, reactive → state object)
  - Lifecycle hooks mapping (onMounted → useEffect, etc.)
  - Computed properties and watchers (computed → useMemo, watch → useEffect)
  - Event handling and props/emit patterns
  - Template syntax to JSX conversion
  - Composables to custom hooks

- **[common-patterns.md](references/common-patterns.md)**: Advanced patterns and complex conversions
  - Slots and children (including scoped slots and render props)
  - Provide/Inject to Context API
  - Teleport to Portal
  - Transitions and animations
  - Form handling (v-model to controlled components)
  - Routing (Vue Router to React Router)
  - Async components and code splitting

- **[state-management.md](references/state-management.md)**: State management library conversions
  - Vuex to Redux Toolkit (stores, modules, actions)
  - Pinia to Zustand (both Options and Composition styles)
  - Pinia to Jotai (atomic state management)
  - Context API patterns for simple global state
  - Selection guide for choosing the right solution

## Reading References

Load reference files as needed based on the conversion requirements:

- For basic conversions of standard components: Start without loading references, as the main patterns are well-known
- For lifecycle hooks, computed properties, or watchers: Load `conversion-guide.md`
- For slots, provide/inject, routing, or forms: Load `common-patterns.md`
- For Vuex or Pinia stores: Load `state-management.md`

## Key Conversion Principles

### 1. Reactivity Model Differences

**Vue**: Automatic dependency tracking with .value access
```javascript
const count = ref(0)
count.value++ // Automatically reactive
```

**React**: Explicit state updates with setter functions
```javascript
const [count, setCount] = useState(0)
setCount(count + 1) // Must use setter
```

### 2. Immutability

**Vue**: Direct mutation is allowed
```javascript
state.items.push(newItem)
```

**React**: Create new objects/arrays
```javascript
setItems([...items, newItem])
```

### 3. Re-rendering

**Vue**: Fine-grained reactivity, only affected parts update
**React**: Entire component function re-runs on state change

### 4. Dependencies

**Vue**: Automatic dependency tracking in watchEffect/computed
**React**: Manual dependency arrays in useEffect/useMemo

## Common Pitfalls to Avoid

1. **Forgetting to use setters**: `count++` instead of `setCount(count + 1)`
2. **Missing dependencies in useEffect**: Can cause stale closures
3. **Unnecessary useMemo/useCallback**: Simple calculations don't need memoization
4. **Direct state mutation**: Must create new objects/arrays
5. **Incorrect event handler binding**: Need arrow functions for inline handlers with arguments
6. **Missing keys in lists**: React requires key prop for mapped elements

## TypeScript Conversion

When converting to TypeScript:

1. **Props**: Convert defineProps to interface or type
```typescript
interface Props {
  title: string
  count?: number
}

function MyComponent({ title, count = 0 }: Props) {
  // ...
}
```

2. **State**: Add type parameters to useState
```typescript
const [user, setUser] = useState<User | null>(null)
```

3. **Events**: Type event handlers properly
```typescript
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  // ...
}
```

4. **Refs**: Type useRef based on element
```typescript
const inputRef = useRef<HTMLInputElement>(null)
```

## Output Format

Always provide:

1. **Converted code** with clear file names and structure
2. **Explanation of key changes** and patterns used
3. **Dependencies needed** (npm packages to install)
4. **Manual adjustments required** (if any)
5. **Testing recommendations** (what to verify)

## Example Conversion

**Input (Vue):**
```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

**Output (React):**
```jsx
import { useState, useMemo } from 'react'

function MyComponent() {
  const [count, setCount] = useState(0)
  const doubled = useMemo(() => count * 2, [count])

  function increment() {
    setCount(count + 1)
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Doubled: {doubled}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}

export default MyComponent
```

**Key changes:**
- `ref(0)` → `useState(0)`
- `computed()` → `useMemo()`
- `count.value` → `count` (no .value in React)
- `count.value++` → `setCount(count + 1)` (use setter)
- Template interpolation `{{ }}` → JSX `{ }`
- `@click` → `onClick`

## Notes

- Always preserve the original component's behavior and logic
- Maintain code readability and React best practices
- Provide clear explanations for non-obvious transformations
- Warn about potential runtime differences between Vue and React
- Suggest testing strategies for critical functionality
