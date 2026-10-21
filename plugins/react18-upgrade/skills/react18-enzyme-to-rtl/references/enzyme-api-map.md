# Enzyme API Map - Complete Before/After

## Setup / Configure

```jsx
// Enzyme:
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
Enzyme.configure({ adapter: new Adapter() });

// RTL: delete this entirely - no setup needed
// (jest.config.js setupFilesAfterFramework handles @testing-library/jest-dom matchers)
```

---

## Rendering

```jsx
// Enzyme - shallow (no children rendered):
import { shallow } from 'enzyme';
const wrapper = shallow(<MyComponent prop="value" />);

// RTL - render (full render, children included):
import { render } from '@testing-library/react';
render(<MyComponent prop="value" />);
// No wrapper variable needed - query via screen
```

```jsx
// Enzyme - mount (full render with DOM):
import { mount } from 'enzyme';
const wrapper = mount(<MyComponent />);

// RTL - same render() call handles this
render(<MyComponent />);
```

---

## Querying

```jsx
// Enzyme - find by component type:
const button = wrapper.find('button');
const comp = wrapper.find(ChildComponent);
const items = wrapper.find('.list-item');

// RTL - query by accessible attributes:
const button = screen.getByRole('button');
const button = screen.getByRole('button', { name: /submit/i });
const heading = screen.getByRole('heading', { name: /title/i });
const input = screen.getByLabelText('Email');
const items = screen.getAllByRole('listitem');
```

```jsx
// Enzyme - find by text:
wrapper.find('.message').text() === 'Hello'

// RTL:
screen.getByText('Hello')
screen.getByText(/hello/i)  // case-insensitive regex
```

---

## User Interaction

```jsx
// Enzyme:
wrapper.find('button').simulate('click');
wrapper.find('input').simulate('change', { target: { value: 'hello' } });
wrapper.find('form').simulate('submit');

// RTL - fireEvent (synchronous, low-level):
import { fireEvent } from '@testing-library/react';
fireEvent.click(screen.getByRole('button'));
fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
fireEvent.submit(screen.getByRole('form'));

// RTL - userEvent (preferred, simulates real user behavior):
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(screen.getByRole('button'));
await user.type(screen.getByRole('textbox'), 'hello');
await user.selectOptions(screen.getByRole('combobox'), 'option1');
```

**Use `userEvent` for most interactions** - it fires the full event sequence (pointerdown, mousedown, focus, click, etc.) like a real user. Use `fireEvent` only when testing specific event properties.

---

## Assertions on Props and State

```jsx
// Enzyme - prop assertion:
expect(wrapper.find('input').prop('disabled')).toBe(true);
expect(wrapper.prop('className')).toContain('active');

// RTL - assert on visible attributes:
expect(screen.getByRole('textbox')).toBeDisabled();
expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
expect(screen.getByRole('listitem')).toHaveClass('active');
```

```jsx
// Enzyme - state assertion (NO RTL EQUIVALENT):
expect(wrapper.state('count')).toBe(3);
expect(wrapper.state('loading')).toBe(false);

// RTL - assert on what the state renders:
expect(screen.getByText('Count: 3')).toBeInTheDocument();
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
```

**Key principle:** Don't test state values - test what the state produces in the UI. If the component renders `<span>Count: {this.state.count}</span>`, test that span.

---

## Instance Methods

```jsx
// Enzyme - direct method call (NO RTL EQUIVALENT):
wrapper.instance().handleSubmit();
wrapper.instance().loadData();

// RTL - trigger through the UI:
await userEvent.setup().click(screen.getByRole('button', { name: /submit/i }));
// Or if no UI trigger exists, reconsider: should internal methods be tested directly?
// Usually the answer is no - test the rendered outcome instead.
```

---

## Existence Checks

```jsx
// Enzyme:
expect(wrapper.find('.error')).toHaveLength(1);
expect(wrapper.find('.error')).toHaveLength(0);
expect(wrapper.exists('.error')).toBe(true);

// RTL:
expect(screen.getByText('Error message')).toBeInTheDocument();
expect(screen.queryByText('Error message')).not.toBeInTheDocument();
// queryBy returns null instead of throwing when not found
// getBy throws if not found - use in positive assertions
// findBy returns a promise - use for async elements
```

---

## Multiple Elements

```jsx
// Enzyme:
expect(wrapper.find('li')).toHaveLength(5);
wrapper.find('li').forEach((item, i) => {
  expect(item.text()).toBe(expectedItems[i]);
});

// RTL:
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(5);
items.forEach((item, i) => {
  expect(item).toHaveTextContent(expectedItems[i]);
});
```

---

## Before/After: Complete Component Test

```jsx
// Enzyme version:
import { shallow } from 'enzyme';

describe('LoginForm', () => {
  it('submits with credentials', () => {
    const mockSubmit = jest.fn();
    const wrapper = shallow(<LoginForm onSubmit={mockSubmit} />);

    wrapper.find('input[name="email"]').simulate('change', {
      target: { value: 'user@example.com' }
    });
    wrapper.find('input[name="password"]').simulate('change', {
      target: { value: 'password123' }
    });
    wrapper.find('button[type="submit"]').simulate('click');

    expect(wrapper.state('loading')).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });
});
```

```jsx
// RTL version:
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('submits with credentials', async () => {
    const mockSubmit = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Assert on visible output - not on state
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled(); // loading state
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });
});
```
