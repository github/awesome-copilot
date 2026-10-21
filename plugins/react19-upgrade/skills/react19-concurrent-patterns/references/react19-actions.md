---
title: React 19 Actions Pattern Reference
---

# React 19 Actions Pattern Reference

React 19 introduces **Actions**  a pattern for handling async operations (like form submissions) with built-in loading states, error handling, and optimistic updates. This replaces the `useReducer + state` pattern with a simpler API.

## What are Actions?

An **Action** is an async function that:

- Can be called automatically when a form submits or button clicks
- Runs with automatic loading/pending state
- Updates the UI automatically when done
- Works with Server Components for direct server mutation

---

## useActionState()

`useActionState` is the client-side Action hook. It replaces `useReducer + useEffect` for form handling.

### React 18 Pattern

```jsx
// React 18  form with useReducer + state:
function Form() {
  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'loading':
          return { ...state, loading: true, error: null };
        case 'success':
          return { ...state, loading: false, data: action.data };
        case 'error':
          return { ...state, loading: false, error: action.error };
      }
    },
    { loading: false, data: null, error: null }
  );
  
  async function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: 'loading' });
    try {
      const result = await submitForm(new FormData(e.target));
      dispatch({ type: 'success', data: result });
    } catch (err) {
      dispatch({ type: 'error', error: err.message });
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      {state.loading && <Spinner />}
      {state.error && <Error msg={state.error} />}
      {state.data && <Success data={state.data} />}
      <button disabled={state.loading}>Submit</button>
    </form>
  );
}
```

### React 19 useActionState() Pattern

```jsx
// React 19  same form with useActionState:
import { useActionState } from 'react';

async function submitFormAction(prevState, formData) {
  // prevState = previous return value from this function
  // formData = FormData from <form action={submitFormAction}>
  
  try {
    const result = await submitForm(formData);
    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

function Form() {
  const [state, formAction, isPending] = useActionState(
    submitFormAction,
    { data: null, error: null } // initial state
  );
  
  return (
    <form action={formAction}>
      <input name="email" />
      {isPending && <Spinner />}
      {state.error && <Error msg={state.error} />}
      {state.data && <Success data={state.data} />}
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```

**Differences:**

- One hook instead of `useReducer` + logic
- `formAction` replaces `onSubmit`, form automatically collects FormData
- `isPending` is a boolean, no dispatch calls
- Action function receives `(prevState, formData)`

---

## useFormStatus()

`useFormStatus` is a **child component hook** that reads the pending state from the nearest form. It acts like a built-in `isPending` signal without prop drilling.

```jsx
// React 18  must pass isPending as prop:
function SubmitButton({ isPending }) {
  return <button disabled={isPending}>Submit</button>;
}

function Form({ isPending, formAction }) {
  return (
    <form action={formAction}>
      <input />
      <SubmitButton isPending={isPending} />
    </form>
  );
}

// React 19  useFormStatus reads it automatically:
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Submit</button>;
}

function Form() {
  const [state, formAction] = useActionState(submitFormAction, {});
  
  return (
    <form action={formAction}>
      <input />
      <SubmitButton /> {/* No prop needed */}
    </form>
  );
}
```

**Key point:** `useFormStatus` only works inside a `<form action={...}>`  regular `<form onSubmit>` won't trigger it.

---

## useOptimistic()

`useOptimistic` updates the UI immediately while an async operation is in-flight. When the operation succeeds, the confirmed data replaces the optimistic value. If it fails, the UI reverts.

### React 18 Pattern

```jsx
// React 18  manual optimistic update:
function TodoList({ todos, onAddTodo }) {
  const [optimistic, setOptimistic] = useState(todos);
  
  async function handleAddTodo(text) {
    const newTodo = { id: Date.now(), text, completed: false };
    
    // Show optimistic update immediately
    setOptimistic([...optimistic, newTodo]);
    
    try {
      const result = await addTodo(text);
      // Update with confirmed result
      setOptimistic(prev => [
        ...prev.filter(t => t.id !== newTodo.id),
        result
      ]);
    } catch (err) {
      // Revert on error
      setOptimistic(optimistic);
    }
  }
  
  return (
    <ul>
      {optimistic.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### React 19 useOptimistic() Pattern

```jsx
import { useOptimistic } from 'react';

async function addTodoAction(prevTodos, formData) {
  const text = formData.get('text');
  const result = await addTodo(text);
  return [...prevTodos, result];
}

function TodoList({ todos }) {
  const [optimistic, addOptimistic] = useOptimistic(
    todos,
    (state, newTodo) => [...state, newTodo]
  );
  
  const [, formAction] = useActionState(addTodoAction, todos);
  
  async function handleAddTodo(formData) {
    const text = formData.get('text');
    // Optimistic update:
    addOptimistic({ id: Date.now(), text, completed: false });
    // Then call the form action:
    formAction(formData);
  }
  
  return (
    <>
      <ul>
        {optimistic.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
      <form action={handleAddTodo}>
        <input name="text" />
        <button>Add</button>
      </form>
    </>
  );
}
```

**Key points:**

- `useOptimistic(currentState, updateFunction)`
- `updateFunction` receives `(state, optimisticInput)` and returns new state
- Call `addOptimistic(input)` to trigger the optimistic update
- The server action's return value replaces the optimistic state when done

---

## Full Example: Todo List with All Hooks

```jsx
import { useActionState, useFormStatus, useOptimistic } from 'react';

// Server action:
async function addTodoAction(prevTodos, formData) {
  const text = formData.get('text');
  if (!text) throw new Error('Text required');
  const newTodo = await api.post('/todos', { text });
  return [...prevTodos, newTodo];
}

// Submit button with useFormStatus:
function AddButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding...' : 'Add Todo'}</button>;
}

// Main component:
function TodoApp({ initialTodos }) {
  const [optimistic, addOptimistic] = useOptimistic(
    initialTodos,
    (state, newTodo) => [...state, newTodo]
  );
  
  const [todos, formAction] = useActionState(
    addTodoAction,
    initialTodos
  );
  
  async function handleAddTodo(formData) {
    const text = formData.get('text');
    // Optimistic: show it immediately
    addOptimistic({ id: Date.now(), text });
    // Then submit the form (which updates when server confirms)
    await formAction(formData);
  }
  
  return (
    <>
      <ul>
        {optimistic.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
      <form action={handleAddTodo}>
        <input name="text" placeholder="Add a todo..." required />
        <AddButton />
      </form>
    </>
  );
}
```

---

## Migration Strategy

### Phase 1  No changes required

Actions are opt-in. All existing `useReducer + onSubmit` patterns continue to work. No forced migration.

### Phase 2  Identify refactor candidates

After React 19 migration stabilizes, profile for `useReducer + async` patterns:

```bash
grep -rn "useReducer.*case.*'loading\|useReducer.*case.*'success" src/ --include="*.js" --include="*.jsx"
```

Patterns worth refactoring:

- Form submissions with loading/error state
- Async operations triggered by user events
- Current code uses `dispatch({ type: '...' })`
- Simple state shape (object with `loading`, `error`, `data`)

### Phase 3  Refactor to useActionState

```jsx
// Before:
function LoginForm() {
  const [state, dispatch] = useReducer(loginReducer, { loading: false, error: null, user: null });
  
  async function handleSubmit(e) {
    e.preventDefault();
    dispatch({ type: 'loading' });
    try {
      const user = await login(e.target);
      dispatch({ type: 'success', data: user });
    } catch (err) {
      dispatch({ type: 'error', error: err.message });
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}

// After:
async function loginAction(prevState, formData) {
  try {
    const user = await login(formData);
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err.message };
  }
}

function LoginForm() {
  const [state, formAction] = useActionState(loginAction, { user: null, error: null });
  
  return <form action={formAction}>...</form>;
}
```

---

## Comparison Table

| Feature | React 18 | React 19 |
|---|---|---|
| Form handling | `onSubmit` + useReducer | `action` + useActionState |
| Loading state | Manual dispatch | Automatic `isPending` |
| Child component pending state | Prop drilling | `useFormStatus` hook |
| Optimistic updates | Manual state dance | `useOptimistic` hook |
| Error handling | Manual in dispatch | Return from action |
| Complexity | More boilerplate | Less boilerplate |
