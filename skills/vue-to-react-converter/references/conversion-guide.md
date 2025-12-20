# Vue to React Conversion Guide

This guide provides a comprehensive reference for converting Vue.js components (Composition API and Script Setup) to React components.

## Table of Contents

1. [Basic Structure Conversion](#basic-structure-conversion)
2. [Reactive Data Conversion](#reactive-data-conversion)
3. [Lifecycle Conversion](#lifecycle-conversion)
4. [Computed Properties and Watchers](#computed-properties-and-watchers)
5. [Event Handling](#event-handling)
6. [Props and Emit](#props-and-emit)
7. [Template Syntax](#template-syntax)
8. [Composables and Custom Hooks](#composables-and-custom-hooks)

## Basic Structure Conversion

### Script Setup → Function Component

**Vue (Script Setup):**
```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

**React (Hooks):**
```jsx
import { useState, useMemo } from 'react'

function MyComponent() {
  const [count, setCount] = useState(0)
  const doubleCount = useMemo(() => count * 2, [count])

  function increment() {
    setCount(count + 1)
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}

export default MyComponent
```

### Composition API → Function Component

**Vue (Composition API):**
```vue
<script>
import { ref, computed } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)

    function increment() {
      count.value++
    }

    return {
      count,
      doubleCount,
      increment
    }
  }
}
</script>
```

**React (Hooks):**
```jsx
import { useState, useMemo } from 'react'

export default function MyComponent() {
  const [count, setCount] = useState(0)
  const doubleCount = useMemo(() => count * 2, [count])

  function increment() {
    setCount(count + 1)
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

## Reactive Data Conversion

### ref → useState

**Vue:**
```javascript
const count = ref(0)
count.value++ // Access with .value
```

**React:**
```javascript
const [count, setCount] = useState(0)
setCount(count + 1) // Use setter function
// Or functional form
setCount(prev => prev + 1)
```

### reactive → useState (Object)

**Vue:**
```javascript
const state = reactive({
  name: 'John',
  age: 30
})
state.age++ // Direct mutation allowed
```

**React:**
```javascript
const [state, setState] = useState({
  name: 'John',
  age: 30
})
// Update entire object
setState({ ...state, age: state.age + 1 })
// Or functional form
setState(prev => ({ ...prev, age: prev.age + 1 }))
```

### Multiple refs → Multiple useState

**Vue:**
```javascript
const firstName = ref('John')
const lastName = ref('Doe')
const email = ref('john@example.com')
```

**React:**
```javascript
const [firstName, setFirstName] = useState('John')
const [lastName, setLastName] = useState('Doe')
const [email, setEmail] = useState('john@example.com')
```

## Lifecycle Conversion

### onMounted → useEffect

**Vue:**
```javascript
import { onMounted } from 'vue'

onMounted(() => {
  console.log('Component mounted')
  fetchData()
})
```

**React:**
```javascript
import { useEffect } from 'react'

useEffect(() => {
  console.log('Component mounted')
  fetchData()
}, []) // Empty dependency array = mount only
```

### onUnmounted → useEffect cleanup

**Vue:**
```javascript
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  const interval = setInterval(() => {
    console.log('tick')
  }, 1000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
```

**React:**
```javascript
import { useEffect } from 'react'

useEffect(() => {
  const interval = setInterval(() => {
    console.log('tick')
  }, 1000)

  return () => {
    clearInterval(interval)
  }
}, [])
```

### watchEffect → useEffect

**Vue:**
```javascript
import { watchEffect, ref } from 'vue'

const count = ref(0)

watchEffect(() => {
  console.log('Count is:', count.value)
})
```

**React:**
```javascript
import { useEffect, useState } from 'react'

const [count, setCount] = useState(0)

useEffect(() => {
  console.log('Count is:', count)
}, [count]) // Add count to dependency array
```

## Computed Properties and Watchers

### computed → useMemo

**Vue:**
```javascript
const count = ref(0)
const doubleCount = computed(() => count.value * 2)
```

**React:**
```javascript
const [count, setCount] = useState(0)
const doubleCount = useMemo(() => count * 2, [count])
```

**Note:** For simple calculations, useMemo is often unnecessary:

```javascript
const [count, setCount] = useState(0)
const doubleCount = count * 2 // No useMemo needed
```

### watch → useEffect

**Vue:**
```javascript
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})
```

**React:**
```javascript
useEffect(() => {
  console.log(`Count changed to ${count}`)
  // Use useRef to track oldVal if needed
}, [count])
```

**To track previous values:**
```javascript
const prevCountRef = useRef()

useEffect(() => {
  if (prevCountRef.current !== undefined) {
    console.log(`Count changed from ${prevCountRef.current} to ${count}`)
  }
  prevCountRef.current = count
}, [count])
```

## Event Handling

### @click → onClick

**Vue:**
```vue
<template>
  <button @click="handleClick">Click me</button>
  <button @click="count++">Increment</button>
  <button @click="handleClick($event, 'arg')">With args</button>
</template>
```

**React:**
```jsx
<button onClick={handleClick}>Click me</button>
<button onClick={() => setCount(count + 1)}>Increment</button>
<button onClick={(e) => handleClick(e, 'arg')}>With args</button>
```

### Event Modifier Conversion

**Vue's .prevent, .stop:**
```vue
<form @submit.prevent="onSubmit">
  <button @click.stop="onClick">Click</button>
</form>
```

**React:**
```jsx
<form onSubmit={(e) => {
  e.preventDefault()
  onSubmit()
}}>
  <button onClick={(e) => {
    e.stopPropagation()
    onClick()
  }}>Click</button>
</form>
```

## Props and Emit

### defineProps → props parameter

**Vue (Script Setup):**
```vue
<script setup>
const props = defineProps({
  title: String,
  count: {
    type: Number,
    default: 0
  }
})
</script>
```

**React:**
```jsx
function MyComponent({ title, count = 0 }) {
  return <div>{title}: {count}</div>
}

// Or with TypeScript
interface Props {
  title: string
  count?: number
}

function MyComponent({ title, count = 0 }: Props) {
  return <div>{title}: {count}</div>
}
```

### defineEmits → callback props

**Vue:**
```vue
<script setup>
const emit = defineEmits(['update', 'delete'])

function handleUpdate() {
  emit('update', { id: 1 })
}
</script>
```

**React:**
```jsx
function MyComponent({ onUpdate, onDelete }) {
  function handleUpdate() {
    onUpdate({ id: 1 })
  }

  return <button onClick={handleUpdate}>Update</button>
}
```

### v-model → value + onChange

**Vue (Parent):**
```vue
<MyInput v-model="text" />
```

**Vue (Child):**
```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input :value="modelValue" @input="emit('update:modelValue', $event.target.value)" />
</template>
```

**React (Parent):**
```jsx
<MyInput value={text} onChange={setText} />
```

**React (Child):**
```jsx
function MyInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
```

## Template Syntax

### v-if / v-else-if / v-else → Conditional operator

**Vue:**
```vue
<template>
  <div v-if="type === 'A'">A</div>
  <div v-else-if="type === 'B'">B</div>
  <div v-else>Other</div>
</template>
```

**React:**
```jsx
{type === 'A' ? (
  <div>A</div>
) : type === 'B' ? (
  <div>B</div>
) : (
  <div>Other</div>
)}

// Or early return pattern
function renderContent() {
  if (type === 'A') return <div>A</div>
  if (type === 'B') return <div>B</div>
  return <div>Other</div>
}

return <div>{renderContent()}</div>
```

### v-for → map

**Vue:**
```vue
<template>
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

**React:**
```jsx
{items.map(item => (
  <div key={item.id}>
    {item.name}
  </div>
))}
```

### v-show → style display

**Vue:**
```vue
<div v-show="isVisible">Content</div>
```

**React:**
```jsx
<div style={{ display: isVisible ? 'block' : 'none' }}>Content</div>

// Or control with className
<div className={isVisible ? '' : 'hidden'}>Content</div>
```

### :class → className

**Vue:**
```vue
<div :class="{ active: isActive, 'text-danger': hasError }">
<div :class="['btn', isActive && 'active']">
```

**React:**
```jsx
<div className={`${isActive ? 'active' : ''} ${hasError ? 'text-danger' : ''}`}>
<div className={`btn ${isActive ? 'active' : ''}`}>

// Or use classnames library
import classNames from 'classnames'
<div className={classNames({ active: isActive, 'text-danger': hasError })}>
```

### :style → style

**Vue:**
```vue
<div :style="{ color: activeColor, fontSize: fontSize + 'px' }">
```

**React:**
```jsx
<div style={{ color: activeColor, fontSize: `${fontSize}px` }}>
```

## Composables and Custom Hooks

### Composable → Custom Hook

**Vue (useCounter.js):**
```javascript
import { ref } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return {
    count,
    increment,
    decrement
  }
}
```

**React (useCounter.js):**
```javascript
import { useState } from 'react'

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue)

  function increment() {
    setCount(c => c + 1)
  }

  function decrement() {
    setCount(c => c - 1)
  }

  return {
    count,
    increment,
    decrement
  }
}
```

### Async Composable → Async Hook

**Vue:**
```javascript
import { ref, onMounted } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function fetchData() {
    loading.value = true
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchData)

  return { data, error, loading, refetch: fetchData }
}
```

**React:**
```javascript
import { useState, useEffect } from 'react'

export function useFetch(url) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const response = await fetch(url)
      const json = await response.json()
      setData(json)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [url])

  return { data, error, loading, refetch: fetchData }
}
```

## Important Differences and Considerations

### 1. Reactivity Differences

- **Vue**: Directly mutating `ref.value` or `reactive` objects triggers reactive updates
- **React**: Must use setState functions to update state

### 2. Re-rendering Differences

- **Vue**: Automatically tracks dependencies and only re-renders necessary parts
- **React**: Entire component function re-runs when state changes

### 3. Immutability

- **Vue**: Objects can be directly mutated
- **React**: State must be treated as immutable; create new objects/arrays

```javascript
// Correct state updates in React
setItems([...items, newItem]) // Create new array
setUser({ ...user, name: 'New Name' }) // Create new object
```

### 4. Dependency Arrays

- **Vue**: watchEffect automatically tracks dependencies
- **React**: useEffect dependency arrays must be manually managed

### 5. Memoization

- **Vue**: computed properties are automatically memoized
- **React**: Explicitly memoize using useMemo or useCallback

### 6. TypeScript Support

**Vue (Script Setup + TypeScript):**
```vue
<script setup lang="ts">
import { ref } from 'vue'

interface User {
  name: string
  age: number
}

const user = ref<User>({ name: 'John', age: 30 })
</script>
```

**React (TypeScript):**
```tsx
import { useState } from 'react'

interface User {
  name: string
  age: number
}

function MyComponent() {
  const [user, setUser] = useState<User>({ name: 'John', age: 30 })

  return <div>{user.name}</div>
}
```
