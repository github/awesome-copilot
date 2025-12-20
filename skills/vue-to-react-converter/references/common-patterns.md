# Common Conversion Patterns

This document explains complex patterns commonly encountered when converting from Vue to React and how to handle them.

## Table of Contents

1. [Slots and Children](#slots-and-children)
2. [Provide/Inject and Context](#provideinject-and-context)
3. [Teleport and Portal](#teleport-and-portal)
4. [Transitions and Animations](#transitions-and-animations)
5. [Form Handling](#form-handling)
6. [Routing](#routing)
7. [Async Components](#async-components)

## Slots and Children

### Basic slot → children

**Vue:**
```vue
<!-- ParentComponent.vue -->
<template>
  <ChildComponent>
    <p>This is slot content</p>
  </ChildComponent>
</template>

<!-- ChildComponent.vue -->
<template>
  <div class="wrapper">
    <slot></slot>
  </div>
</template>
```

**React:**
```jsx
// ParentComponent.jsx
function ParentComponent() {
  return (
    <ChildComponent>
      <p>This is children content</p>
    </ChildComponent>
  )
}

// ChildComponent.jsx
function ChildComponent({ children }) {
  return (
    <div className="wrapper">
      {children}
    </div>
  )
}
```

### Named slots → Multiple props

**Vue:**
```vue
<!-- Parent -->
<template>
  <Card>
    <template #header>
      <h1>Title</h1>
    </template>
    <template #default>
      <p>Content</p>
    </template>
    <template #footer>
      <button>Action</button>
    </template>
  </Card>
</template>

<!-- Card.vue -->
<template>
  <div class="card">
    <div class="card-header">
      <slot name="header"></slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
    <div class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
```

**React:**
```jsx
// Parent
function ParentComponent() {
  return (
    <Card
      header={<h1>Title</h1>}
      footer={<button>Action</button>}
    >
      <p>Content</p>
    </Card>
  )
}

// Card.jsx
function Card({ header, children, footer }) {
  return (
    <div className="card">
      <div className="card-header">
        {header}
      </div>
      <div className="card-body">
        {children}
      </div>
      <div className="card-footer">
        {footer}
      </div>
    </div>
  )
}
```

### Scoped slots → Render props

**Vue:**
```vue
<!-- Parent -->
<template>
  <DataList :items="users">
    <template #default="{ item }">
      <div>{{ item.name }} - {{ item.email }}</div>
    </template>
  </DataList>
</template>

<!-- DataList.vue -->
<script setup>
defineProps({
  items: Array
})
</script>

<template>
  <div>
    <div v-for="item in items" :key="item.id">
      <slot :item="item"></slot>
    </div>
  </div>
</template>
```

**React:**
```jsx
// Parent
function ParentComponent() {
  return (
    <DataList items={users}>
      {(item) => (
        <div>{item.name} - {item.email}</div>
      )}
    </DataList>
  )
}

// DataList.jsx
function DataList({ items, children }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {children(item)}
        </div>
      ))}
    </div>
  )
}
```

## Provide/Inject and Context

### Simple provide/inject → Context

**Vue:**
```vue
<!-- App.vue -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)
</script>

<!-- ChildComponent.vue -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')
</script>
```

**React:**
```jsx
// ThemeContext.jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// App.jsx
function App() {
  return (
    <ThemeProvider>
      <ChildComponent />
    </ThemeProvider>
  )
}

// ChildComponent.jsx
function ChildComponent() {
  const { theme, setTheme } = useTheme()
  return <div>Current theme: {theme}</div>
}
```

### Multiple provides → Multiple Contexts

**Vue:**
```javascript
// App.vue
provide('user', currentUser)
provide('auth', authMethods)
provide('config', appConfig)
```

**React:**
```jsx
// contexts/index.js
export const UserContext = createContext()
export const AuthContext = createContext()
export const ConfigContext = createContext()

// App.jsx
<UserContext.Provider value={currentUser}>
  <AuthContext.Provider value={authMethods}>
    <ConfigContext.Provider value={appConfig}>
      <ChildComponent />
    </ConfigContext.Provider>
  </AuthContext.Provider>
</UserContext.Provider>

// Or combine Contexts
function AppProviders({ children }) {
  return (
    <UserContext.Provider value={currentUser}>
      <AuthContext.Provider value={authMethods}>
        <ConfigContext.Provider value={appConfig}>
          {children}
        </ConfigContext.Provider>
      </AuthContext.Provider>
    </UserContext.Provider>
  )
}
```

## Teleport and Portal

**Vue:**
```vue
<template>
  <button @click="showModal = true">Open Modal</button>
  <Teleport to="body">
    <div v-if="showModal" class="modal">
      <p>Modal content</p>
      <button @click="showModal = false">Close</button>
    </div>
  </Teleport>
</template>
```

**React (react-dom):**
```jsx
import { useState } from 'react'
import { createPortal } from 'react-dom'

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null

  return createPortal(
    <div className="modal">
      {children}
      <button onClick={onClose}>Close</button>
    </div>,
    document.body
  )
}

function MyComponent() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button onClick={() => setShowModal(true)}>Open Modal</button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <p>Modal content</p>
      </Modal>
    </>
  )
}
```

## Transitions and Animations

Vue's `<Transition>` component has no direct equivalent in React. Here are some approaches:

### Using CSS Transitions

**Vue:**
```vue
<template>
  <Transition name="fade">
    <div v-if="show">Content</div>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```

**React (CSS Transitions):**
```jsx
import { useState } from 'react'
import './transitions.css'

function MyComponent() {
  const [show, setShow] = useState(false)

  return (
    <div className={`fade ${show ? 'fade-enter' : 'fade-leave'}`}>
      Content
    </div>
  )
}
```

```css
/* transitions.css */
.fade {
  transition: opacity 0.5s;
}
.fade-enter {
  opacity: 1;
}
.fade-leave {
  opacity: 0;
}
```

### Using react-transition-group

**React (react-transition-group):**
```jsx
import { CSSTransition } from 'react-transition-group'
import './transitions.css'

function MyComponent() {
  const [show, setShow] = useState(false)

  return (
    <CSSTransition
      in={show}
      timeout={500}
      classNames="fade"
      unmountOnExit
    >
      <div>Content</div>
    </CSSTransition>
  )
}
```

```css
.fade-enter {
  opacity: 0;
}
.fade-enter-active {
  opacity: 1;
  transition: opacity 500ms;
}
.fade-exit {
  opacity: 1;
}
.fade-exit-active {
  opacity: 0;
  transition: opacity 500ms;
}
```

## Form Handling

### v-model → Controlled Components

**Vue:**
```vue
<script setup>
import { ref } from 'vue'

const form = ref({
  username: '',
  email: '',
  password: ''
})

function handleSubmit() {
  console.log(form.value)
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.username" type="text" placeholder="Username" />
    <input v-model="form.email" type="email" placeholder="Email" />
    <input v-model="form.password" type="password" placeholder="Password" />
    <button type="submit">Submit</button>
  </form>
</template>
```

**React:**
```jsx
import { useState } from 'react'

function MyForm() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    console.log(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        type="text"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Checkboxes and Radio Buttons

**Vue:**
```vue
<script setup>
import { ref } from 'vue'

const checked = ref(false)
const selected = ref('option1')
const checkedItems = ref([])
</script>

<template>
  <input v-model="checked" type="checkbox" />

  <input v-model="selected" type="radio" value="option1" />
  <input v-model="selected" type="radio" value="option2" />

  <input v-model="checkedItems" type="checkbox" value="item1" />
  <input v-model="checkedItems" type="checkbox" value="item2" />
</template>
```

**React:**
```jsx
import { useState } from 'react'

function MyForm() {
  const [checked, setChecked] = useState(false)
  const [selected, setSelected] = useState('option1')
  const [checkedItems, setCheckedItems] = useState([])

  function handleCheckboxChange(value) {
    setCheckedItems(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    )
  }

  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />

      <input
        type="radio"
        value="option1"
        checked={selected === 'option1'}
        onChange={(e) => setSelected(e.target.value)}
      />
      <input
        type="radio"
        value="option2"
        checked={selected === 'option2'}
        onChange={(e) => setSelected(e.target.value)}
      />

      <input
        type="checkbox"
        value="item1"
        checked={checkedItems.includes('item1')}
        onChange={() => handleCheckboxChange('item1')}
      />
      <input
        type="checkbox"
        value="item2"
        checked={checkedItems.includes('item2')}
        onChange={() => handleCheckboxChange('item2')}
      />
    </>
  )
}
```

## Routing

### Vue Router → React Router

**Vue Router:**
```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import About from '@/views/About.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user/:id', component: UserProfile }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

**React Router v6:**
```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './views/Home'
import About from './views/About'
import UserProfile from './views/UserProfile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/user/:id" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### Router Links

**Vue:**
```vue
<template>
  <router-link to="/">Home</router-link>
  <router-link :to="`/user/${userId}`">User</router-link>
</template>
```

**React:**
```jsx
import { Link } from 'react-router-dom'

function Navigation() {
  return (
    <>
      <Link to="/">Home</Link>
      <Link to={`/user/${userId}`}>User</Link>
    </>
  )
}
```

### Route Parameters and Navigation

**Vue:**
```vue
<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const userId = route.params.id

function goToHome() {
  router.push('/')
}
</script>
```

**React:**
```jsx
import { useParams, useNavigate } from 'react-router-dom'

function UserProfile() {
  const { id: userId } = useParams()
  const navigate = useNavigate()

  function goToHome() {
    navigate('/')
  }

  return <div>User ID: {userId}</div>
}
```

## Async Components

### defineAsyncComponent → React.lazy

**Vue:**
```javascript
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() =>
  import('./components/HeavyComponent.vue')
)
```

**React:**
```jsx
import { lazy, Suspense } from 'react'

const AsyncComponent = lazy(() => import('./components/HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncComponent />
    </Suspense>
  )
}
```

### Code Splitting

**Vue:**
```javascript
// router/index.js
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue')
  }
]
```

**React:**
```jsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const Dashboard = lazy(() => import('./views/Dashboard'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

## Other Important Patterns

### Template Refs → useRef

**Vue:**
```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref(null)

onMounted(() => {
  inputRef.value.focus()
})
</script>

<template>
  <input ref="inputRef" type="text" />
</template>
```

**React:**
```jsx
import { useRef, useEffect } from 'react'

function MyComponent() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus()
  }, [])

  return <input ref={inputRef} type="text" />
}
```

### nextTick → flushSync or useEffect

**Vue:**
```javascript
import { nextTick } from 'vue'

count.value++
await nextTick()
console.log('DOM updated')
```

**React (flushSync):**
```jsx
import { flushSync } from 'react-dom'

flushSync(() => {
  setCount(count + 1)
})
console.log('DOM updated')
```

**React (useEffect):**
```jsx
useEffect(() => {
  console.log('DOM updated')
}, [count])
```

### KeepAlive → Manual Implementation Required

Vue's `<KeepAlive>` has no direct React equivalent. You need to use a state management library or maintain state in a parent component.

**React (Pattern for maintaining state):**
```jsx
function TabContainer() {
  const [activeTab, setActiveTab] = useState('tab1')
  const [tab1Data, setTab1Data] = useState(null)
  const [tab2Data, setTab2Data] = useState(null)

  return (
    <>
      <button onClick={() => setActiveTab('tab1')}>Tab 1</button>
      <button onClick={() => setActiveTab('tab2')}>Tab 2</button>

      <div style={{ display: activeTab === 'tab1' ? 'block' : 'none' }}>
        <Tab1 data={tab1Data} setData={setTab1Data} />
      </div>
      <div style={{ display: activeTab === 'tab2' ? 'block' : 'none' }}>
        <Tab2 data={tab2Data} setData={setTab2Data} />
      </div>
    </>
  )
}
```
