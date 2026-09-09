# Python Devices

Python's type hints are optional and unenforced at runtime, which splits every device into two
questions: what the checker catches, and what actually holds when the code runs.

**Prerequisite**: `mypy --strict` (or `pyright` in strict mode) as a *required* CI check.
Without it, annotations are documentation, rung zero. Pair it with `ruff` at error level.

## Contact, NewType for cheap distinctness

```python
from typing import NewType

UserId = NewType("UserId", str)
OrderId = NewType("OrderId", str)

def transfer(src: UserId, dst: UserId) -> None: ...

transfer(order_id, user_id)  # mypy: error: zero runtime cost
```

`NewType` is free at runtime and stops the mix-up at check time. It does not validate, use it
when the concepts differ but the shape doesn't need checking.

## Contact, parse at the boundary with Pydantic

When the value needs checking, parse into a model and let the type carry the proof:

```python
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class CreateUser(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    email: EmailStr
    age: int = Field(ge=0, le=150)
```

Two settings do most of the work. `extra="forbid"` turns a typo'd field into an error instead
of a silently ignored key: the difference between a 400 and a user whose preference never
saved. `frozen=True` blocks reassignment of the model's fields, so nothing downstream can
quietly replace what you verified. It is shallow, though: a `list` or `dict` field is still
mutable in place, so reach for `tuple`, `frozenset`, or a nested frozen model where that
matters.

Apply at every edge: request bodies, queue messages, third-party responses, file loads.

## Contact, keyword-only arguments

Python's answer to swapped parameters, and it costs one character:

```python
def transfer(*, source: AccountId, dest: AccountId, amount: Money) -> None: ...

transfer(source=a, dest=b, amount=m)   # the only legal form
transfer(a, b, m)                      # TypeError
```

Force keyword-only for anything with more than two parameters, and always when two share a
type. This is Warning-rung. It makes the mistake visible rather than impossible, but it is
the highest-value one-character change in the language.

## Fixed-value, exhaustiveness

```python
from typing import assert_never, Literal

Status = Literal["pending", "active", "closed"]

def label(s: Status) -> str:
    match s:
        case "pending": return "Pending"
        case "active":  return "Active"
        case "closed":  return "Closed"
        case _: assert_never(s)   # mypy errors here if a variant is unhandled
```

`assert_never` turns "someone added a status" into a build failure at every site that must
change. Works with `Literal`, `Enum`, and tagged dataclass unions.

## Fixed-value, config validated at startup

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    stripe_key: str
    region: str            # no default: an unset value should stop the deploy

settings = Settings()      # raises at import, before the service reports healthy
```

Import this once at startup and pass the object down. Every `os.getenv` buried in a handler is
a 3am page waiting for the one request that reaches it.

## Contact, immutable value objects

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True, kw_only=True)
class Money:
    cents: int
    currency: str

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"cannot add {self.currency} to {other.currency}")
        return Money(cents=self.cents + other.cents, currency=self.currency)
```

`frozen=True` prevents mutation after validation, `slots=True` makes a typo'd attribute
assignment an `AttributeError` rather than a silently-created new attribute, and `kw_only=True`
kills positional swaps. Three flags, three hazard classes closed.

## Motion-step, context managers

Any acquire/release pair belongs in a context manager. Never expose `open()`/`close()` as
separate public methods: the error path will leak, and only under load.

```python
from contextlib import contextmanager

@contextmanager
def transaction(conn):
    tx = conn.begin()
    try:
        yield tx
        tx.commit()
    except Exception:
        tx.rollback()
        raise          # re-raise: swallowing here would be X1
```

## Python-specific traps worth checking every time

- **Mutable default arguments**: `def f(items=[])` shares one list across every call. Use
  `None` and construct inside. Caught by ruff `B006`.
- **Bare `except:`** catches `KeyboardInterrupt` and `SystemExit` too. Caught by `E722`.
- **`assert` for validation** is stripped under `python -O`. Never use it for anything
  security- or correctness-critical; raise instead.
- **Naive `datetime.now()`**: use `datetime.now(timezone.utc)`, and inject a clock so time
  is testable. Caught by ruff `DTZ`.
- **Float money**: use `int` cents or `decimal.Decimal`, never `float`.
- **`==` vs `is`** on strings and ints works by accident via interning and breaks in
  production on longer values. Caught by `F632`.
- **`asyncio.create_task` without keeping a reference**: the task can be garbage collected
  mid-flight, so the work silently doesn't happen. Caught by ruff `RUF006`.

## Ruff rule sets that are poka-yoke

Style rules aren't mistake-proofing; these are, which is why `E` appears only as its
bug-shaped subsets and not whole. Select at error level:

```toml
[tool.ruff.lint]
select = [
  "F",                 # pyflakes: undefined names, unused imports
  "E4", "E7", "E9",    # pycodestyle's bug-shaped rules: bare except, `== None`, syntax errors
  "B",                 # bugbear: mutable defaults, loop variable capture, assert-on-tuple
  "S",                 # bandit: hardcoded secrets, unsafe subprocess, weak crypto
  "DTZ",               # naive datetimes
  "ASYNC",             # blocking calls inside async functions
  "RUF006",            # dangling asyncio tasks
  "PLE",               # pylint errors: genuine bugs only
  "T20",               # stray print/pprint
]
```

## Known limits

- **Annotations are not enforced at runtime.** Anything crossing a boundary, or reachable
  from unchecked code, needs a real runtime parse. Pydantic is how you get Control; mypy
  alone gives you Control only over code mypy actually checks.
- **`Any` is contagious** and an untyped dependency reintroduces it silently. Set
  `disallow_any_unimported` and `warn_return_any`; audit `# type: ignore` comments and require
  a reason on each.
- **No affine types**, so use-after-close isn't preventable; context managers are the answer.
- **Monkey-patching means no encapsulation is absolute.** Push invariants that truly must hold
  into the database rather than into a class.
