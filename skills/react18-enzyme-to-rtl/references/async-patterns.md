# Async Test Patterns - Enzyme → RTL Migration

Reference for rewriting Enzyme async tests to React Testing Library with React 18 compatible patterns.

## The Core Problem

Enzyme's async tests typically used one of these approaches:

- `wrapper.update()` after state changes
- `setTimeout` / `Promise.resolve()` to flush microtasks
- `setImmediate` to flush async queues
- Direct instance method calls followed by `wrapper.update()`

None of these work in RTL. RTL provides `waitFor`, `findBy*`, and `act` instead.

---

## Pattern 1 - wrapper.update() After State Change

Enzyme required `wrapper.update()` to force a re-render after async state changes.

```jsx
// Enzyme:
it('loads data', async () => {
  const wrapper = mount(<UserList />);
  await Promise.resolve(); // flush microtasks
  wrapper.update();        // force Enzyme to sync with DOM
  expect(wrapper.find('li')).toHaveLength(3);
});
```

```jsx
// RTL - waitFor handles re-renders automatically:
import { render, screen, waitFor } from '@testing-library/react';

it('loads data', async () => {
  render(<UserList />);
  await waitFor(() => {
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
```

---

## Pattern 2 - Async Action Triggered by User Interaction

```jsx
// Enzyme:
it('fetches user on button click', async () => {
  const wrapper = mount(<UserCard />);
  wrapper.find('button').simulate('click');
  await new Promise(resolve => setTimeout(resolve, 0));
  wrapper.update();
  expect(wrapper.find('.user-name').text()).toBe('John Doe');
});
```

```jsx
// RTL:
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('fetches user on button click', async () => {
  render(<UserCard />);
  await userEvent.setup().click(screen.getByRole('button', { name: /load/i }));
  // findBy* auto-waits up to 1000ms (configurable)
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});
```

---

## Pattern 3 - Loading State Assertion

```jsx
// Enzyme - asserted loading state synchronously then final state after flush:
it('shows loading then result', async () => {
  const wrapper = mount(<SearchResults query="react" />);
  expect(wrapper.find('.spinner').exists()).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 100));
  wrapper.update();
  expect(wrapper.find('.spinner').exists()).toBe(false);
  expect(wrapper.find('.result')).toHaveLength(5);
});
```

```jsx
// RTL:
it('shows loading then result', async () => {
  render(<SearchResults query="react" />);
  // Loading state - check it appears
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  // Or if loading is text:
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for results to appear (loading disappears, results show)
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
});
```

---

## Pattern 4 - Apollo MockedProvider Async Tests

```jsx
// Enzyme with Apollo - used to flush with multiple ticks:
it('renders user from query', async () => {
  const wrapper = mount(
    <MockedProvider mocks={mocks} addTypename={false}>
      <UserProfile id="1" />
    </MockedProvider>
  );
  await new Promise(resolve => setTimeout(resolve, 0)); // flush Apollo queue
  wrapper.update();
  expect(wrapper.find('.username').text()).toBe('Alice');
});
```

```jsx
// RTL with Apollo:
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';

it('renders user from query', async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <UserProfile id="1" />
    </MockedProvider>
  );

  // Wait for Apollo to resolve the query
  expect(await screen.findByText('Alice')).toBeInTheDocument();
  // OR:
  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

**Apollo loading state in RTL:**

```jsx
it('shows loading then data', async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <UserProfile id="1" />
    </MockedProvider>
  );
  // Apollo loading state - check immediately after render
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  // Then wait for data
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

---

## Pattern 5 - Error State from Async Operation

```jsx
// Enzyme:
it('shows error on failed fetch', async () => {
  server.use(rest.get('/api/user', (req, res, ctx) => res(ctx.status(500))));
  const wrapper = mount(<UserCard />);
  wrapper.find('button').simulate('click');
  await new Promise(resolve => setTimeout(resolve, 0));
  wrapper.update();
  expect(wrapper.find('.error-message').text()).toContain('Something went wrong');
});
```

```jsx
// RTL:
it('shows error on failed fetch', async () => {
  // (assuming MSW or jest.mock for fetch)
  render(<UserCard />);
  await userEvent.setup().click(screen.getByRole('button', { name: /load/i }));
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

---

## Pattern 6 - act() for Manual Async Control

When you need explicit control over async timing (rare with RTL but occasionally needed for class component tests):

```jsx
// RTL with act() for fine-grained async control:
import { act } from 'react';

it('handles sequential state updates', async () => {
  render(<MultiStepForm />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await Promise.resolve(); // flush microtask queue
  });

  expect(screen.getByText('Step 2')).toBeInTheDocument();
});
```

---

## RTL Async Query Guide

| Method | Behavior | Use when |
|---|---|---|
| `getBy*` | Synchronous - throws if not found | Element is always present immediately |
| `queryBy*` | Synchronous - returns null if not found | Checking element does NOT exist |
| `findBy*` | Async - waits up to 1000ms, rejects if not found | Element appears asynchronously |
| `getAllBy*` | Synchronous - throws if 0 found | Multiple elements always present |
| `queryAllBy*` | Synchronous - returns [] if none found | Checking count or non-existence |
| `findAllBy*` | Async - waits for elements to appear | Multiple elements appear asynchronously |
| `waitFor(fn)` | Retries fn until no error or timeout | Custom assertion that needs polling |
| `waitForElementToBeRemoved(el)` | Waits until element disappears | Loading states, removals |

**Default timeout:** 1000ms. Configure globally in `jest.config.js`:

```js
// Increase timeout for slow CI environments
// jest.config.js
module.exports = {
  testEnvironmentOptions: {
    asyncUtilTimeout: 3000,
  },
};
```

---

## Common Migration Mistakes

```jsx
// WRONG - mixing async query with sync assertion:
const el = await screen.findByText('Result');
// el is already resolved here - findBy returns the element, not a promise
expect(await el).toBeInTheDocument(); // unnecessary second await

// CORRECT:
const el = await screen.findByText('Result');
expect(el).toBeInTheDocument();
// OR simply:
expect(await screen.findByText('Result')).toBeInTheDocument();
```

```jsx
// WRONG - using getBy* for elements that appear asynchronously:
fireEvent.click(button);
expect(screen.getByText('Loaded!')).toBeInTheDocument(); // throws before data loads

// CORRECT:
fireEvent.click(button);
expect(await screen.findByText('Loaded!')).toBeInTheDocument(); // waits
```
