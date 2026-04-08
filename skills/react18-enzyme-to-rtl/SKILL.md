---
name: react18-enzyme-to-rtl
description: 'Provides exact Enzyme → React Testing Library migration patterns for React 18 upgrades. Use this skill whenever Enzyme tests need to be rewritten - shallow, mount, wrapper.find(), wrapper.simulate(), wrapper.prop(), wrapper.state(), wrapper.instance(), Enzyme configure/Adapter calls, or any test file that imports from enzyme. This skill covers the full API mapping and the philosophy shift from implementation testing to behavior testing. Always read this skill before rewriting Enzyme tests - do not translate Enzyme APIs 1:1, that produces brittle RTL tests.'
---

# React 18 Enzyme → RTL Migration

Enzyme has no React 18 adapter and no React 18 support path. All Enzyme tests must be rewritten using React Testing Library.

## The Philosophy Shift (Read This First)

Enzyme tests implementation. RTL tests behavior.

```jsx
// Enzyme: tests that the component has the right internal state
expect(wrapper.state('count')).toBe(3);
expect(wrapper.instance().handleClick).toBeDefined();
expect(wrapper.find('Button').prop('disabled')).toBe(true);

// RTL: tests what the user actually sees and can do
expect(screen.getByText('Count: 3')).toBeInTheDocument();
expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
```

This is not a 1:1 translation. Enzyme tests that verify internal state or instance methods don't have RTL equivalents - because RTL intentionally doesn't expose internals. **Rewrite the test to assert the visible outcome instead.**

## API Map

For complete before/after code for each Enzyme API, read:
- **`references/enzyme-api-map.md`** - full mapping: shallow, mount, find, simulate, prop, state, instance, configure
- **`references/async-patterns.md`** - waitFor, findBy, act(), Apollo MockedProvider, loading states, error states

## Core Rewrite Template

```jsx
// Every Enzyme test rewrites to this shape:
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('does the thing', async () => {
    // 1. Render (replaces shallow/mount)
    render(<MyComponent prop="value" />);

    // 2. Query (replaces wrapper.find())
    const button = screen.getByRole('button', { name: /submit/i });

    // 3. Interact (replaces simulate())
    await userEvent.setup().click(button);

    // 4. Assert on visible output (replaces wrapper.state() / wrapper.prop())
    expect(screen.getByText('Submitted!')).toBeInTheDocument();
  });
});
```

## RTL Query Priority (use in this order)

1. `getByRole` - matches accessible roles (button, textbox, heading, checkbox, etc.)
2. `getByLabelText` - form fields linked to labels
3. `getByPlaceholderText` - input placeholders
4. `getByText` - visible text content
5. `getByDisplayValue` - current value of input/select/textarea
6. `getByAltText` - image alt text
7. `getByTitle` - title attribute
8. `getByTestId` - `data-testid` attribute (last resort)

Prefer `getByRole` over `getByTestId`. It tests accessibility too.

## Wrapping with Providers

```jsx
// Enzyme with context:
const wrapper = mount(
  <ApolloProvider client={client}>
    <ThemeProvider theme={theme}>
      <MyComponent />
    </ThemeProvider>
  </ApolloProvider>
);

// RTL equivalent (use your project's customRender or wrap inline):
import { render } from '@testing-library/react';
render(
  <MockedProvider mocks={mocks} addTypename={false}>
    <ThemeProvider theme={theme}>
      <MyComponent />
    </ThemeProvider>
  </MockedProvider>
);
// Or use the project's customRender helper if it wraps providers
```
