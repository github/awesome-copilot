---
name: python-hypothesis-property-testing
description: 'Generate and optimize property-based tests for Python using Hypothesis framework with strategies, stateful testing, and test migration patterns.'
---

# Python Property Testing with Hypothesis

Use property-based testing to automatically discover edge cases by testing universal properties rather than specific examples.

## When to Use

- Generate property tests from existing code
- Migrate example-based tests to property tests
- Test systems with complex state transitions
- Create custom strategies for domain models
- Debug and optimize property tests

## Installation

```bash
pip install "hypothesis[cli]"

# With optional extras
pip install "hypothesis[numpy,pandas,django]"
```

## Core Concepts

### Property vs Example Tests

**Example-based** (specific):
```python
def test_sort_specific():
    assert sort([3, 1, 2]) == [1, 2, 3]
```

**Property-based** (universal):
```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_property(xs):
    """Sorted output contains same elements."""
    result = sort(xs)
    assert sorted(result) == sorted(xs)
    assert len(result) == len(xs)
```

## Common Property Patterns

### 1. Idempotency
```python
@given(st.lists(st.integers()))
def test_reverse_twice_is_identity(xs):
    """f(f(x)) == x"""
    assert reverse(reverse(xs)) == xs
```

### 2. Round-Trip
```python
@given(st.dictionaries(st.text(), st.integers()))
def test_json_roundtrip(data):
    """encode(decode(x)) == x"""
    assert json.loads(json.dumps(data)) == data
```

### 3. Invariants
```python
@given(st.lists(st.integers(), min_size=1))
def test_max_in_list(xs):
    """max(xs) is always in xs"""
    assert max(xs) in xs
```

### 4. Commutativity
```python
@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    """a + b == b + a"""
    assert a + b == b + a
```

### 5. Oracle Comparison
```python
@given(st.lists(st.integers()))
def test_custom_sort_matches_builtin(xs):
    """Compare with known-good implementation"""
    assert custom_sort(xs) == sorted(xs)
```

## Strategy Selection

| Type | Strategy | Use Case |
|------|----------|----------|
| Integers | `st.integers(min_value=0, max_value=100)` | IDs, ages |
| Text | `st.text(min_size=1, max_size=100)` | Usernames |
| Lists | `st.lists(st.integers(), max_size=50)` | Collections |
| Dicts | `st.dictionaries(st.text(), st.integers())` | Config |
| Dates | `st.dates(min_value=date(2000, 1, 1))` | Timestamps |
| Emails | `st.emails()` | Email addresses |

## Custom Strategies

### Composite Strategy
```python
from hypothesis.strategies import composite

@composite
def user_strategy(draw):
    """Generate valid User instances."""
    return User(
        username=draw(st.text(min_size=3, max_size=20)),
        age=draw(st.integers(min_value=18, max_value=120)),
        email=draw(st.emails())
    )

@given(user_strategy())
def test_user_validation(user):
    assert 18 <= user.age <= 120
```

### Using st.builds()
```python
user_strategy = st.builds(
    User,
    username=st.text(min_size=3, max_size=20),
    age=st.integers(min_value=18, max_value=120),
    email=st.emails()
)
```

## Stateful Testing

Test systems with complex state:

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class StackStateMachine(RuleBasedStateMachine):
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

TestStack = StackStateMachine.TestCase
```

## Configuration

### conftest.py
```python
from hypothesis import settings, Verbosity
import os

settings.register_profile("dev", max_examples=100)
settings.register_profile("ci", max_examples=1000, verbosity=Verbosity.verbose)
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "dev"))
```

### pytest.ini
```ini
[pytest]
markers =
    property: Property-based tests

hypothesis-show-statistics = true
```

## Migrating Example Tests

**Incremental approach:**

```python
# Step 1: Add property test alongside examples
@given(st.lists(st.integers()))
@example([])              # Keep critical edge cases
@example([1])
@example([1, 1, 1])
def test_sort_comprehensive(xs):
    result = sort(xs)
    assert sorted(result) == sorted(xs)

# Step 2: Remove redundant example tests once property test passes
```

## Debugging Failed Tests

When Hypothesis finds a failing case:

```python
# Hypothesis output shows:
# Falsifying example: test_function(x=42)
# Reproduce with: @seed(1234567890)

from hypothesis import seed

@seed(1234567890)  # Use seed from failure
@given(st.integers())
def test_reproduce(x):
    assert process(x) is not None
```

**Debug helpers:**
```python
from hypothesis import note, event

@given(st.lists(st.integers()))
def test_with_debug(xs):
    note(f"Input: {xs}")
    note(f"Length: {len(xs)}")
    result = process(xs)
    event(f"Result size: {len(result)}")
```

## Settings and Optimization

```python
from hypothesis import settings
from datetime import timedelta

@settings(
    max_examples=50,                      # Reduce for faster tests
    deadline=timedelta(milliseconds=100),  # Performance threshold
)
@given(st.lists(st.integers()))
def test_optimized(xs):
    assert process(xs) is not None
```

## Best Practices

**DO:**
- Test universal properties, not specific examples
- Use strategy constraints instead of `assume()`
- Keep critical edge cases with `@example()`
- Commit `.hypothesis/examples.db` for regression testing
- Run CI with `max_examples=1000`

**AVOID:**
- Test implementation details
- Use `random.random()` (breaks reproducibility)
- Over-use `assume()` (prefer strategy constraints)
- Ignore all exceptions
- Test single specific values

## Common Issues

### "Too much filtering"
```python
# Bad - heavy filtering
@given(st.integers())
def test_even(n):
    assume(n % 2 == 0)

# Better - strategy constraints
@given(st.integers().map(lambda x: x * 2))
def test_even(n):
    assert n % 2 == 0
```

### "Non-deterministic test"
```python
# Bad - uses random
@given(st.integers())
def test_random(n):
    if random.random() > 0.5:  # Non-deterministic!
        assert n > 0

# Better - deterministic
@given(st.integers(), st.booleans())
def test_deterministic(n, condition):
    if condition:
        assert n > 0
```

## CI Integration

```yaml
# .github/workflows/tests.yml
- name: Run property tests
  run: pytest -m property --hypothesis-profile=ci
  env:
    HYPOTHESIS_PROFILE: ci
```

## Quick Reference

```bash
# Run property tests
pytest -m property

# Run with CI profile
pytest -m property --hypothesis-profile=ci

# Reproduce failure
pytest --hypothesis-seed=1234567890

# Show statistics
pytest -m property --hypothesis-show-statistics
```

## Resources

- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Property-Based Testing Guide](https://fsharpforfunandprofit.com/posts/property-based-testing/)
