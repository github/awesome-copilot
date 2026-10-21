# Batching Categories - Before/After Patterns

## Category A - this.state Read After Await (Silent Bug) {#category-a}

The method reads `this.state` after an `await` to make a conditional decision. In React 18, the intermediate setState hasn't flushed yet - `this.state` still holds the pre-update value.

**Before (broken in React 18):**

```jsx
async handleLoadClick() {
  this.setState({ loading: true });       // batched - not flushed yet
  const data = await fetchData();
  if (this.state.loading) {               // ← still FALSE (old value)
    this.setState({ data, loading: false });  // ← never called
  }
}
```

**After - remove the this.state read entirely:**

```jsx
async handleLoadClick() {
  this.setState({ loading: true });
  try {
    const data = await fetchData();
    this.setState({ data, loading: false }); // always called - no condition needed
  } catch (err) {
    this.setState({ error: err, loading: false });
  }
}
```

**Pattern:** If the condition on `this.state` was always going to be true at that point (you just set it to true), remove the condition. The setState you called before `await` will eventually flush - you don't need to check it.

---

## Category A Variant - Multi-Step Conditional Chain

```jsx
// Before (broken):
async initialize() {
  this.setState({ step: 'auth' });
  const token = await authenticate();
  if (this.state.step === 'auth') {        // ← wrong: still initial value
    this.setState({ step: 'loading', token });
    const data = await loadData(token);
    if (this.state.step === 'loading') {   // ← wrong again
      this.setState({ step: 'ready', data });
    }
  }
}
```

```jsx
// After - use local variables, not this.state, to track flow:
async initialize() {
  this.setState({ step: 'auth' });
  try {
    const token = await authenticate();
    this.setState({ step: 'loading', token });
    const data = await loadData(token);
    this.setState({ step: 'ready', data });
  } catch (err) {
    this.setState({ step: 'error', error: err });
  }
}
```

---

## Category B - Independent setState Calls (Refactor, No flushSync) {#category-b}

Multiple setState calls in a Promise chain where order matters but no intermediate state reading occurs. The calls just need to be restructured.

**Before:**

```jsx
handleSubmit() {
  this.setState({ submitting: true });
  submitForm(this.state.formData)
    .then(result => {
      this.setState({ result });
      this.setState({ submitting: false });  // two setState in .then()
    });
}
```

**After - consolidate setState calls:**

```jsx
async handleSubmit() {
  this.setState({ submitting: true, result: null, error: null });
  try {
    const result = await submitForm(this.state.formData);
    this.setState({ result, submitting: false });
  } catch (err) {
    this.setState({ error: err, submitting: false });
  }
}
```

Rule: Multiple `setState` calls in the same async context already batch in React 18. Consolidating into fewer calls is cleaner but not strictly required.

---

## Category C - Intermediate Render Must Be Visible (flushSync) {#category-c}

The user must see an intermediate UI state (loading spinner, progress step) BEFORE an async operation starts. This is the only case where `flushSync` is the right answer.

**Diagnostic question:** "If the loading spinner didn't appear until after the fetch returned, would the UX be wrong?"

- YES → `flushSync`
- NO → refactor (Category A or B)

**Before:**

```jsx
async processOrder() {
  this.setState({ status: 'validating' });   // user must see this
  await validateOrder(this.props.order);
  this.setState({ status: 'charging' });     // user must see this
  await chargeCard(this.props.card);
  this.setState({ status: 'complete' });
}
```

**After - flushSync for each required intermediate render:**

```jsx
import { flushSync } from 'react-dom';

async processOrder() {
  flushSync(() => {
    this.setState({ status: 'validating' });  // renders immediately
  });
  await validateOrder(this.props.order);

  flushSync(() => {
    this.setState({ status: 'charging' });    // renders immediately
  });
  await chargeCard(this.props.card);

  this.setState({ status: 'complete' });      // last - no flushSync needed
}
```

**Simple loading spinner case** (most common):

```jsx
import { flushSync } from 'react-dom';

async handleSearch() {
  // User must see spinner before the fetch begins
  flushSync(() => this.setState({ loading: true }));
  const results = await searchAPI(this.state.query);
  this.setState({ results, loading: false });
}
```

---

## setTimeout Pattern

```jsx
// Before (React 17 - setTimeout fired immediate re-renders):
handleAutoSave() {
  setTimeout(() => {
    this.setState({ saving: true });
    // React 17: re-render happened here
    saveToServer(this.state.formData).then(() => {
      this.setState({ saving: false, lastSaved: Date.now() });
    });
  }, 2000);
}
```

```jsx
// After (React 18 - all setState inside setTimeout batches):
handleAutoSave() {
  setTimeout(async () => {
    // If loading state must show before fetch - flushSync
    flushSync(() => this.setState({ saving: true }));
    await saveToServer(this.state.formData);
    this.setState({ saving: false, lastSaved: Date.now() });
  }, 2000);
}
```

---

## Test Patterns That Break Due to Batching

```jsx
// Before (React 17 - intermediate state was synchronously visible):
it('shows saving indicator', () => {
  render(<AutoSaveForm />);
  fireEvent.change(input, { target: { value: 'new text' } });
  expect(screen.getByText('Saving...')).toBeInTheDocument(); // ← sync check
});

// After (React 18 - use waitFor for intermediate states):
it('shows saving indicator', async () => {
  render(<AutoSaveForm />);
  fireEvent.change(input, { target: { value: 'new text' } });
  await waitFor(() => expect(screen.getByText('Saving...')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
});
```
