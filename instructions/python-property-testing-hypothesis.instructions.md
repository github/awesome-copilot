---
description: 'Best practices for property-based testing in Python using Hypothesis framework'
applyTo: '**/test_*.py, **/*_test.py, **/tests/**/*.py'
---

# Python Property Testing with Hypothesis

Use property-based testing to discover edge cases automatically by testing universal properties instead of specific examples.

## Installation

```bash
pip install "hypothesis[cli]"
```

## Configuration

```python
# conftest.py
from hypothesis import settings
import os

settings.register_profile("dev", max_examples=100)
settings.register_profile("ci", max_examples=1000)
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
```

```ini
# pytest.ini
[pytest]
markers = property: Property-based tests
hypothesis-show-statistics = true
```

## Common Property Patterns

```python
from hypothesis import given, strategies as st, example

# Idempotency: f(f(x)) == f(x)
@given(st.lists(st.integers()))
def test_reverse_twice(xs):
    assert reverse(reverse(xs)) == xs

# Round-trip: decode(encode(x)) == x
@given(st.dictionaries(st.text(), st.integers()))
def test_json_roundtrip(data):
    assert json.loads(json.dumps(data)) == data

# Invariant: property always holds
@given(st.lists(st.integers(), min_size=1))
def test_max_in_list(xs):
    assert max(xs) in xs

# Oracle: compare with known implementation
@given(st.lists(st.integers()))
def test_sort_matches_builtin(xs):
    assert custom_sort(xs) == sorted(xs)

# Commutativity: f(a, b) == f(b, a)
@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a
```

## Strategies

```python
# Built-in strategies
st.integers(min_value=0, max_value=100)
st.text(min_size=1, max_size=100)
st.lists(st.integers(), max_size=50)
st.dictionaries(st.text(), st.integers())
st.dates(min_value=date(2000, 1, 1))
st.emails()

# Composite strategies
from hypothesis.strategies import composite

@composite
def user_strategy(draw):
    return User(
        username=draw(st.text(min_size=3)),
        age=draw(st.integers(min_value=18, max_value=120)),
        email=draw(st.emails())
    )
```

## Stateful Testing

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class StackMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.stack = []
    
    @rule(value=st.integers())
    def push(self, value):
        self.stack.append(value)
    
    @rule()
    def pop(self):
        if self.stack:
            self.stack.pop()
    
    @invariant()
    def size_non_negative(self):
        assert len(self.stack) >= 0

TestStack = StackMachine.TestCase
```

## Migration from Example Tests

```python
# Keep critical edge cases
@given(st.lists(st.integers()))
@example([])              # Empty
@example([1])             # Single
@example([1, 1, 1])       # Duplicates
def test_sort(xs):
    result = sort(xs)
    assert sorted(result) == sorted(xs)
```

## Debugging

```python
from hypothesis import seed, note

# Reproduce failure
@seed(1234567890)  # From failure output
@given(st.integers())
def test_reproduce(x):
    note(f"Input: {x}")
    assert process(x) is not None
```

## Settings

```python
from hypothesis import settings
from datetime import timedelta

@settings(
    max_examples=50,
    deadline=timedelta(milliseconds=100)
)
@given(st.lists(st.integers()))
def test_with_settings(xs):
    assert process(xs) is not None
```

## Best Practices

**DO:**
- Test universal properties, not specific examples
- Use strategy constraints over `assume()`
- Keep critical edge cases with `@example()`
- Run CI with `max_examples=1000`

**AVOID:**
- Test implementation details
- Use `random.random()` (breaks reproducibility)
- Over-use `assume()` (prefer constraints)

## Common Patterns

```python
# Prefer strategy constraints
@given(st.integers().map(lambda x: x * 2))
def test_even(n):
    assert n % 2 == 0

# Avoid heavy filtering
@given(st.integers())
def test_even_bad(n):
    assume(n % 2 == 0)  # Not recommended
```

## Resources

- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/posts/property-based-testing/)
