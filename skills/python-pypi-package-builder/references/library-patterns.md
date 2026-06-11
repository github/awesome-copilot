# Library Core Patterns, OOP/SOLID, and Type Hints

## Table of Contents
1. [OOP & SOLID Principles](#1-oop--solid-principles)
2. [Type Hints Best Practices](#2-type-hints-best-practices)
3. [Core Class Design](#3-core-class-design)
4. [Factory / Builder Pattern](#4-factory--builder-pattern)
5. [Configuration Pattern](#5-configuration-pattern)
6. [`__init__.py` — explicit public API](#6-__init__py--explicit-public-api)
7. [Optional Backends (Plugin Pattern)](#7-optional-backends-plugin-pattern)

---

## 1. OOP & SOLID Principles

Apply these principles to produce maintainable, testable, extensible packages.
**Do not over-engineer** — apply the principle that solves a real problem, not all of them
at once.

### S — Single Responsibility Principle

Each class/module should have **one reason to change**.

```python
# BAD: one class handles data, validation, AND persistence
class UserManager:
    def validate(self, user): ...
    def save_to_db(self, user): ...
    def send_email(self, user): ...

# GOOD: split responsibilities
class UserValidator:
    def validate(self, user: User) -> None: ...

class UserRepository:
    def save(self, user: User) -> None: ...

class UserNotifier:
    def notify(self, user: User) -> None: ...
```

### O — Open/Closed Principle

Open for extension, closed for modification. Use **protocols or ABCs** as extension points.

```python
from abc import ABC, abstractmethod

class StorageBackend(ABC):
    """Define the interface once; never modify it for new implementations."""
    @abstractmethod
    def get(self, key: str) -> str | None: ...
    @abstractmethod
    def set(self, key: str, value: str) -> None: ...

class MemoryBackend(StorageBackend):    # Extend by subclassing
    ...

class RedisBackend(StorageBackend):     # Add new impl without touching StorageBackend
    ...
```

### L — Liskov Substitution Principle

Subclasses must be substitutable for their base. Never narrow a contract in a subclass.

```python
class BaseProcessor:
    def process(self, data: dict) -> dict: ...

# BAD: raises TypeError for valid dicts — breaks substitutability
class StrictProcessor(BaseProcessor):
    def process(self, data: dict) -> dict:
        if not data:
            raise TypeError("Must have data")  # Base never raised this

# GOOD: accept what base accepts, fulfill the same contract
class StrictProcessor(BaseProcessor):
    def process(self, data: dict) -> dict:
        if not data:
            return {}   # Graceful — same return type, no new exceptions
```

### I — Interface Segregation Principle

Prefer **small, focused protocols** over large monolithic ABCs.

```python
# BAD: forces all implementers to handle read+write+delete+list
class BigStorage(ABC):
    @abstractmethod
    def read(self): ...
    @abstractmethod
    def write(self): ...
    @abstractmethod
    def delete(self): ...
    @abstractmethod
    def list_all(self): ...   # Not every backend needs this

# GOOD: separate protocols — clients depend only on what they need
from typing import Protocol

class Readable(Protocol):
    def read(self, key: str) -> str | None: ...

class Writable(Protocol):
    def write(self, key: str, value: str) -> None: ...

class Deletable(Protocol):
    def delete(self, key: str) -> None: ...
```

### D — Dependency Inversion Principle

High-level modules depend on **abstractions** (protocols/ABCs), not concrete implementations.
Pass dependencies in via `__init__` (constructor injection).

```python
# BAD: high-level class creates its own dependency
class ApiClient:
    def __init__(self) -> None:
        self._cache = RedisCache()   # Tightly coupled to Redis

# GOOD: depend on the abstraction; inject the concrete at call site
class ApiClient:
    def __init__(self, cache: CacheBackend) -> None:  # CacheBackend is a Protocol
        self._cache = cache

# User code (or tests):
client = ApiClient(cache=RedisCache())    # Real
client = ApiClient(cache=MemoryCache())  # Test
```

### Composition Over Inheritance

Prefer delegating to contained objects over deep inheritance chains.

```python
# Prefer this (composition):
class YourClient:
    def __init__(self, backend: StorageBackend, http: HttpTransport) -> None:
        self._backend = backend
        self._http = http

# Avoid this (deep inheritance):
class YourClient(BaseClient, CacheMixin, RetryMixin, LoggingMixin):
    ...    # Fragile, hard to test, MRO confusion
```

### Exception Hierarchy

Always define a base exception for your package; layer specifics below it.

```python
# your_package/exceptions.py
class YourPackageError(Exception):
    """Base exception — catch this to catch any package error."""

class ConfigurationError(YourPackageError):
    """Raised when package is misconfigured."""

class AuthenticationError(YourPackageError):
    """Raised on auth failure."""

class RateLimitError(YourPackageError):
    """Raised when rate limit is exceeded."""
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after}s.")
```

---

## 2. Type Hints Best Practices

Follow PEP 484 (type hints), PEP 526 (variable annotations), PEP 544 (protocols),
PEP 561 (typed packages). These are not optional for a quality library.

```python
from __future__ import annotations    # Enables PEP 563 deferred evaluation — always add this

# For ARGUMENTS: prefer abstract / protocol types (more flexible for callers)
from collections.abc import Iterable, Mapping, Sequence, Callable

def process_items(items: Iterable[str]) -> list[int]: ...   # ✓ Accepts any iterable
def process_items(items: list[str]) -> list[int]: ...       # ✗ Too restrictive

# For RETURN TYPES: prefer concrete types (callers know exactly what they get)
def get_names() -> list[str]: ...                           # ✓ Concrete
def get_names() -> Iterable[str]: ...                       # ✗ Caller can't index it

# Use X | Y syntax (Python 3.10+), not Union[X, Y] or Optional[X]
def find(key: str) -> str | None: ...                       # ✓ Modern
def find(key: str) -> Optional[str]: ...                    # ✗ Old style

# None should be LAST in unions
def get(key: str) -> str | int | None: ...                  # ✓

# Avoid Any — it disables type checking entirely
def process(data: Any) -> Any: ...                          # ✗ Loses all safety
def process(data: dict[str, object]) -> dict[str, object]:  # ✓

# Use object instead of Any when a param accepts literally anything
def log(value: object) -> None: ...                         # ✓

# Avoid Union return types — they require isinstance() checks at every call site
def get_value() -> str | int: ...                           # ✗ Forces callers to branch
```

### Protocols vs ABCs

```python
from typing import Protocol, runtime_checkable
from abc import ABC, abstractmethod

# Use Protocol when you don't control the implementer classes (duck typing)
@runtime_checkable    # Makes isinstance() checks work at runtime
class Serializable(Protocol):
    def to_dict(self) -> dict[str, object]: ...

# Use ABC when you control the class hierarchy and want default implementations
class BaseBackend(ABC):
    @abstractmethod
    async def get(self, key: str) -> str | None: ...

    def get_or_default(self, key: str, default: str) -> str:
        result = self.get(key)
        return result if result is not None else default
```

### TypeVar and Generics

```python
from typing import TypeVar, Generic

T = TypeVar("T")
T_co = TypeVar("T_co", covariant=True)   # For read-only containers

class Repository(Generic[T]):
    """Type-safe generic repository."""
    def __init__(self, model_class: type[T]) -> None:
        self._store: list[T] = []

    def add(self, item: T) -> None:
        self._store.append(item)

    def get_all(self) -> list[T]:
        return list(self._store)
```

### dataclasses for data containers

```python
from dataclasses import dataclass, field

@dataclass(frozen=True)   # frozen=True → immutable, hashable (good for configs/keys)
class Config:
    api_key: str
    timeout: int = 30
    headers: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.api_key:
            raise ValueError("api_key must not be empty")
```

### TYPE_CHECKING guard (avoid circular imports)

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from your_package.models import HeavyModel    # Only imported during type checking

def process(model: "HeavyModel") -> None:
    ...
```

### Overload for multiple signatures

```python
from typing import overload

@overload
def get(key: str, default: None = ...) -> str | None: ...
@overload
def get(key: str, default: str) -> str: ...
def get(key: str, default: str | None = None) -> str | None:
    ...    # Single implementation handles both
```

---

## 3. Core Class Design

The main class of your library should have a clear, minimal `__init__`, sensible defaults for all
parameters, and raise `TypeError` / `ValueError` early for invalid inputs. This prevents confusing
errors at call time rather than at construction.

```python
# your_package/core.py
from __future__ import annotations

from your_package.exceptions import YourPackageError


class YourClient:
    """
    Main entry point for <your purpose>.

    Args:
        api_key: Required authentication credential.
        timeout: Request timeout in seconds. Defaults to 30.
        retries: Number of retry attempts. Defaults to 3.

    Raises:
        ValueError: If api_key is empty or timeout is non-positive.

    Example:
        >>> from your_package import YourClient
        >>> client = YourClient(api_key="sk-...")
        >>> result = client.process(data)
    """

    def __init__(
        self,
        api_key: str,
        timeout: int = 30,
        retries: int = 3,
    ) -> None:
        if not api_key:
            raise ValueError("api_key must not be empty")
        if timeout <= 0:
            raise ValueError("timeout must be positive")
        self._api_key = api_key
        self.timeout = timeout
        self.retries = retries

    def process(self, data: dict) -> dict:
        """
        Process data and return results.

        Args:
            data: Input dictionary to process.

        Returns:
            Processed result as a dictionary.

        Raises:
            YourPackageError: If processing fails.
        """
        ...
```

### Design rules

- Accept all config in `__init__`, not scattered across method calls.
- Validate at construction time — fail fast with a clear message.
- Keep `__init__` signatures stable. Adding new **keyword-only** args with defaults is backwards
  compatible. Removing or reordering positional args is a breaking change.

---

## 4. Factory / Builder Pattern

Use a factory function when users need to create pre-configured instances. This avoids cluttering
`__init__` with a dozen keyword arguments and keeps the common case simple.

```python
# your_package/factory.py
from __future__ import annotations

from your_package.core import YourClient
from your_package.backends.memory import MemoryBackend


def create_client(
    api_key: str,
    *,
    timeout: int = 30,
    retries: int = 3,
    backend: str = "memory",
    backend_url: str | None = None,
) -> YourClient:
    """
    Factory that returns a configured YourClient.

    Args:
        api_key: Required API key.
        timeout: Request timeout in seconds.
        retries: Number of retry attempts.
        backend: Storage backend type. One of 'memory' or 'redis'.
        backend_url: Connection URL for the chosen backend.

    Example:
        >>> client = create_client(api_key="sk-...", backend="redis", backend_url="redis://localhost")
    """
    if backend == "redis":
        from your_package.backends.redis import RedisBackend
        _backend = RedisBackend(url=backend_url or "redis://localhost:6379")
    else:
        _backend = MemoryBackend()

    return YourClient(api_key=api_key, timeout=timeout, retries=retries, backend=_backend)
```

**Why a factory, not a class method?** Both work. A standalone factory function is easier to
mock in tests and avoids coupling the factory logic into the class itself.

---

## 5. Configuration Pattern

Use a dataclass (or Pydantic `BaseModel`) to hold configuration. This gives you free validation,
helpful error messages, and a single place to document every option.

```python
# your_package/config.py
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class YourSettings:
    """
    Configuration for YourClient.

    Attributes:
        timeout: HTTP timeout in seconds.
        retries: Number of retry attempts on transient errors.
        base_url: Base API URL.
    """
    timeout: int = 30
    retries: int = 3
    base_url: str = "https://api.example.com"
    extra_headers: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")
        if self.retries < 0:
            raise ValueError("retries must be non-negative")
```

If you need environment variable loading, use `pydantic-settings` as an **optional** dependency —
declare it in `[project.optional-dependencies]`, not as a required dep.

---

## 6. `__init__.py` — Explicit Public API

A well-defined `__all__` is not just style — it tells users (and IDEs) exactly what's part of your
public API, and prevents accidental imports of internal helpers as part of your contract.

```python
# your_package/__init__.py
"""your-package: <one-line description>."""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"

from your_package.core import YourClient
from your_package.config import YourSettings
from your_package.exceptions import YourPackageError

__all__ = [
    "YourClient",
    "YourSettings",
    "YourPackageError",
    "__version__",
]
```

Rules:
- Only export what users are supposed to use. Internal helpers go in `_utils.py` or submodules.
- Keep imports at the top level of `__init__.py` shallow — avoid importing heavy optional deps
  (like `redis`) at module level. Import them lazily inside the class or function that needs them.
- `__version__` is always part of the public API — it enables `your_package.__version__` for
  debugging.

---

## 7. Optional Backends (Plugin Pattern)

This pattern lets your package work out-of-the-box (no extra deps) with an in-memory backend,
while letting advanced users plug in Redis, a database, or any custom storage.

### 5.1 Abstract base class — defines the interface

```python
# your_package/backends/__init__.py
from abc import ABC, abstractmethod


class BaseBackend(ABC):
    """Abstract storage backend interface.

    Implement this to add a custom backend (database, cache, etc.).
    """

    @abstractmethod
    async def get(self, key: str) -> str | None:
        """Retrieve a value by key. Returns None if not found."""
        ...

    @abstractmethod
    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        """Store a value. Optional TTL in seconds."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a key."""
        ...
```

### 5.2 Memory backend — zero extra deps

```python
# your_package/backends/memory.py
from __future__ import annotations

import asyncio
import time
from your_package.backends import BaseBackend


class MemoryBackend(BaseBackend):
    """Thread-safe in-memory backend. Works out of the box — no extra dependencies."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float | None]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> str | None:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if expires_at is not None and time.time() > expires_at:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        async with self._lock:
            expires_at = time.time() + ttl if ttl is not None else None
            self._store[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)
```

### 5.3 Redis backend — raises clear ImportError if not installed

The key design: import `redis` lazily inside `__init__`, not at module level. This way,
`import your_package` never fails even if `redis` isn't installed.

```python
# your_package/backends/redis.py
from __future__ import annotations
from your_package.backends import BaseBackend

try:
    import redis.asyncio as aioredis
except ImportError as exc:
    raise ImportError(
        "Redis backend requires the redis extra:\n"
        "  pip install your-package[redis]"
    ) from exc


class RedisBackend(BaseBackend):
    """Redis-backed storage for distributed/multi-process deployments."""

    def __init__(self, url: str = "redis://localhost:6379") -> None:
        self._client = aioredis.from_url(url, decode_responses=True)

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)
```

### 5.4 How users choose a backend

```python
# Default: in-memory, no extra deps needed
from your_package import YourClient
client = YourClient(api_key="sk-...")

# Redis: pip install your-package[redis]
from your_package.backends.redis import RedisBackend
client = YourClient(api_key="sk-...", backend=RedisBackend(url="redis://localhost:6379"))
```
