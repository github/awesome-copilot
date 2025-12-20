# State Management Conversion

A guide for converting from Vue state management libraries (Vuex, Pinia) to React state management solutions.

## Table of Contents

1. [Vuex → Redux Toolkit](#vuex--redux-toolkit)
2. [Pinia → Zustand](#pinia--zustand)
3. [Pinia → Jotai](#pinia--jotai)
4. [State Management with Context API](#state-management-with-context-api)

## Vuex → Redux Toolkit

Redux Toolkit is the official recommended approach for Redux, providing patterns similar to Vuex.

### Basic Store

**Vuex:**
```javascript
// store/index.js
import { createStore } from 'vuex'

export default createStore({
  state: {
    count: 0,
    user: null
  },
  getters: {
    doubleCount: state => state.count * 2,
    isLoggedIn: state => !!state.user
  },
  mutations: {
    INCREMENT(state) {
      state.count++
    },
    SET_USER(state, user) {
      state.user = user
    }
  },
  actions: {
    async fetchUser({ commit }, userId) {
      const response = await fetch(`/api/users/${userId}`)
      const user = await response.json()
      commit('SET_USER', user)
    }
  }
})
```

**Redux Toolkit:**
```javascript
// store/index.js
import { configureStore, createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    count: 0,
    user: null
  },
  reducers: {
    increment: state => {
      state.count++
    },
    setUser: (state, action) => {
      state.user = action.payload
    }
  }
})

export const { increment, setUser } = counterSlice.actions

export const store = configureStore({
  reducer: {
    counter: counterSlice.reducer
  }
})

// Thunk for async actions
export const fetchUser = (userId) => async (dispatch) => {
  const response = await fetch(`/api/users/${userId}`)
  const user = await response.json()
  dispatch(setUser(user))
}
```

### Usage in Components

**Vuex:**
```vue
<script setup>
import { useStore } from 'vuex'
import { computed } from 'vue'

const store = useStore()

const count = computed(() => store.state.count)
const doubleCount = computed(() => store.getters.doubleCount)

function increment() {
  store.commit('INCREMENT')
}

function loadUser() {
  store.dispatch('fetchUser', 123)
}
</script>
```

**Redux Toolkit:**
```jsx
import { useSelector, useDispatch } from 'react-redux'
import { increment, fetchUser } from './store'

function MyComponent() {
  const count = useSelector(state => state.counter.count)
  const doubleCount = useSelector(state => state.counter.count * 2)
  const dispatch = useDispatch()

  function handleIncrement() {
    dispatch(increment())
  }

  function loadUser() {
    dispatch(fetchUser(123))
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={handleIncrement}>Increment</button>
      <button onClick={loadUser}>Load User</button>
    </div>
  )
}
```

### Module Splitting

**Vuex:**
```javascript
// store/modules/auth.js
export default {
  namespaced: true,
  state: {
    user: null,
    token: null
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user
    },
    SET_TOKEN(state, token) {
      state.token = token
    }
  },
  actions: {
    async login({ commit }, credentials) {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      })
      const { user, token } = await response.json()
      commit('SET_USER', user)
      commit('SET_TOKEN', token)
    }
  }
}

// store/index.js
import auth from './modules/auth'

export default createStore({
  modules: {
    auth
  }
})
```

**Redux Toolkit:**
```javascript
// store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const login = createAsyncThunk(
  'auth/login',
  async (credentials) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    return await response.json()
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    loading: false
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    },
    setToken: (state, action) => {
      state.token = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.loading = false
      })
      .addCase(login.rejected, (state) => {
        state.loading = false
      })
  }
})

export const { setUser, setToken } = authSlice.actions
export default authSlice.reducer

// store/index.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer
  }
})
```

## Pinia → Zustand

Zustand is a lightweight and simple state management library that provides an API similar to Pinia.

### Basic Store

**Pinia:**
```javascript
// stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  getters: {
    doubleCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    },
    async fetchData() {
      const response = await fetch('/api/data')
      this.count = await response.json()
    }
  }
})
```

**Zustand:**
```javascript
// stores/counterStore.js
import { create } from 'zustand'

export const useCounterStore = create((set, get) => ({
  count: 0,
  name: 'Counter',

  // Getter implemented as computed property
  get doubleCount() {
    return get().count * 2
  },

  increment: () => set(state => ({ count: state.count + 1 })),

  fetchData: async () => {
    const response = await fetch('/api/data')
    const data = await response.json()
    set({ count: data })
  }
}))
```

### Pinia Composition API Style → Zustand

**Pinia (Composition API Style):**
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const name = ref('Counter')

  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  async function fetchData() {
    const response = await fetch('/api/data')
    count.value = await response.json()
  }

  return {
    count,
    name,
    doubleCount,
    increment,
    fetchData
  }
})
```

**Zustand:**
```javascript
import { create } from 'zustand'

export const useCounterStore = create((set) => ({
  count: 0,
  name: 'Counter',

  increment: () => set(state => ({ count: state.count + 1 })),

  fetchData: async () => {
    const response = await fetch('/api/data')
    const data = await response.json()
    set({ count: data })
  }
}))

// Computed values are calculated on use
function MyComponent() {
  const count = useCounterStore(state => state.count)
  const doubleCount = count * 2

  return <div>Double: {doubleCount}</div>
}
```

### Usage in Components

**Pinia:**
```vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()

function handleIncrement() {
  counter.increment()
}
</script>

<template>
  <div>
    <p>Count: {{ counter.count }}</p>
    <p>Double: {{ counter.doubleCount }}</p>
    <button @click="handleIncrement">Increment</button>
  </div>
</template>
```

**Zustand:**
```jsx
import { useCounterStore } from './stores/counterStore'

function MyComponent() {
  // Select only needed state (automatically optimized)
  const count = useCounterStore(state => state.count)
  const increment = useCounterStore(state => state.increment)

  // Or get everything
  // const { count, increment } = useCounterStore()

  const doubleCount = count * 2

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

### Store Persistence

**Pinia:**
```javascript
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: useLocalStorage('user', null)
  })
})
```

**Zustand (persist middleware):**
```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user })
    }),
    {
      name: 'user-storage'
    }
  )
)
```

## Pinia → Jotai

Jotai provides an atomic state management approach, adopting a method of combining small stores.

### Basic Atoms

**Pinia:**
```javascript
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  actions: {
    increment() {
      this.count++
    }
  }
})
```

**Jotai:**
```javascript
// stores/atoms.js
import { atom } from 'jotai'

export const countAtom = atom(0)

export const incrementAtom = atom(
  null,
  (get, set) => {
    set(countAtom, get(countAtom) + 1)
  }
)
```

### Derived State (Getters)

**Pinia:**
```javascript
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubleCount: (state) => state.count * 2
  }
})
```

**Jotai:**
```javascript
import { atom } from 'jotai'

export const countAtom = atom(0)
export const doubleCountAtom = atom((get) => get(countAtom) * 2)
```

### Usage in Components

**Pinia:**
```vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
</script>

<template>
  <div>
    <p>Count: {{ counter.count }}</p>
    <button @click="counter.increment">Increment</button>
  </div>
</template>
```

**Jotai:**
```jsx
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { countAtom, doubleCountAtom, incrementAtom } from './stores/atoms'

function MyComponent() {
  // Read and write
  const [count, setCount] = useAtom(countAtom)

  // Read only
  const doubleCount = useAtomValue(doubleCountAtom)

  // Write only
  const increment = useSetAtom(incrementAtom)

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

### Async Actions

**Pinia:**
```javascript
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false
  }),
  actions: {
    async fetchUser(id) {
      this.loading = true
      try {
        const response = await fetch(`/api/users/${id}`)
        this.user = await response.json()
      } finally {
        this.loading = false
      }
    }
  }
})
```

**Jotai:**
```javascript
import { atom } from 'jotai'

export const userIdAtom = atom(null)
export const userAtom = atom(null)
export const loadingAtom = atom(false)

export const fetchUserAtom = atom(
  null,
  async (get, set, userId) => {
    set(loadingAtom, true)
    try {
      const response = await fetch(`/api/users/${userId}`)
      const user = await response.json()
      set(userAtom, user)
    } finally {
      set(loadingAtom, false)
    }
  }
)

// Or use async atom
export const asyncUserAtom = atom(async (get) => {
  const userId = get(userIdAtom)
  if (!userId) return null

  const response = await fetch(`/api/users/${userId}`)
  return await response.json()
})
```

## State Management with Context API

For small applications, you can manage state using only the Context API without external libraries.

### Vuex/Pinia → Context API

**Pinia:**
```javascript
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null
  }),
  actions: {
    login(user, token) {
      this.user = user
      this.token = token
    },
    logout() {
      this.user = null
      this.token = null
    }
  }
})
```

**React Context API:**
```jsx
// contexts/AuthContext.jsx
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  function login(newUser, newToken) {
    setUser(newUser)
    setToken(newToken)
  }

  function logout() {
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**Usage Example:**
```jsx
// App.jsx
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <MyComponent />
    </AuthProvider>
  )
}

// MyComponent.jsx
import { useAuth } from './contexts/AuthContext'

function MyComponent() {
  const { user, login, logout } = useAuth()

  return (
    <div>
      {user ? (
        <>
          <p>Welcome, {user.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login({ name: 'John' }, 'token123')}>
          Login
        </button>
      )}
    </div>
  )
}
```

## Selection Guide

### Choose Redux Toolkit when:

- Large-scale applications
- Complex state management logic
- Debug tools (Redux DevTools) are important
- Team has Redux experience
- Migrating from Vuex

### Choose Zustand when:

- Small to medium-scale applications
- Simple and intuitive API is preferred
- Want to minimize boilerplate
- Migrating from Pinia
- Need a lighter solution than Redux

### Choose Jotai when:

- Atomic state management is preferred
- Need fine-grained state splitting
- Want to integrate with React Suspense
- Want to manage with small independent state units

### Choose Context API when:

- Small-scale applications
- Want to avoid external dependencies
- State management is simple
- Only need simple global state like themes or user info
