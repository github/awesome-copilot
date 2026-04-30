# Architecture Patterns — Backend System, Config, Transport, CLI

## Table of Contents
1. [Backend System (Plugin/Strategy Pattern)](#1-backend-system-pluginstrategy-pattern)
2. [Config Layer (Settings Dataclass)](#2-config-layer-settings-dataclass)
3. [Transport Layer (HTTP Client Abstraction)](#3-transport-layer-http-client-abstraction)
4. [CLI Support](#4-cli-support)
5. [Backend Injection in Core Client](#5-backend-injection-in-core-client)
6. [Decision Rules](#6-decision-rules)

---

## 1. Backend System (Plugin/Strategy Pattern)

Structure your `backends/` sub-package with a clear base protocol, a zero-dependency default
implementation, and optional heavy implementations behind extras.

### Directory Layout

```
your_package/
  backends/
    __init__.py    # Exports BaseBackend + factory; holds the Protocol/ABC
    base.py        # Abstract base class (ABC) or Protocol definition
    memory.py      # Default, zero-dependency in-memory implementation
    redis.py       # Optional, heavier implementation (guarded by extras)
```

### `backends/base.py` — Abstract Interface

```python
# your_package/backends/base.py
from __future__ import annotations

from abc import ABC, abstractmethod


class BaseBackend(ABC):
    """Abstract storage/processing backend.

    All concrete backends must implement these methods.
    Never import heavy dependencies at module level — guard them inside the class.
    """

    @abstractmethod
    def get(self, key: str) -> str | None:
        """Retrieve a value by key. Return None when the key does not exist."""
        ...

    @abstractmethod
    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        """Store a value with an optional TTL (seconds)."""
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove a key. No-op when the key does not exist."""
        ...

    def close(self) -> None:  # noqa: B027  (intentionally non-abstract)
        """Optional cleanup hook. Override in backends that hold connections."""
```

### `backends/memory.py` — Default Zero-Dep Implementation

```python
# your_package/backends/memory.py
from __future__ import annotations

import time
from collections.abc import Iterator
from contextlib import contextmanager
from threading import Lock

from .base import BaseBackend


class MemoryBackend(BaseBackend):
    """Thread-safe in-memory backend. No external dependencies required."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float | None]] = {}
        self._lock = Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if expires_at is not None and time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        expires_at = time.monotonic() + ttl if ttl is not None else None
        with self._lock:
            self._store[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)
```

### `backends/redis.py` — Optional Heavy Implementation

```python
# your_package/backends/redis.py
from __future__ import annotations

from .base import BaseBackend


class RedisBackend(BaseBackend):
    """Redis-backed implementation. Requires: pip install your-package[redis]"""

    def __init__(self, url: str = "redis://localhost:6379/0") -> None:
        try:
            import redis as _redis
        except ImportError as exc:
            raise ImportError(
                "RedisBackend requires redis. "
                "Install it with: pip install your-package[redis]"
            ) from exc
        self._client = _redis.from_url(url, decode_responses=True)

    def get(self, key: str) -> str | None:
        return self._client.get(key)  # type: ignore[return-value]

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        if ttl is not None:
            self._client.setex(key, ttl, value)
        else:
            self._client.set(key, value)

    def delete(self, key: str) -> None:
        self._client.delete(key)

    def close(self) -> None:
        self._client.close()
```

### `backends/__init__.py` — Public API + Factory

```python
# your_package/backends/__init__.py
from __future__ import annotations

from .base import BaseBackend
from .memory import MemoryBackend

__all__ = ["BaseBackend", "MemoryBackend", "get_backend"]


def get_backend(backend_type: str = "memory", **kwargs: object) -> BaseBackend:
    """Factory: return the requested backend instance.

    Args:
        backend_type: "memory" (default) or "redis".
        **kwargs: Forwarded to the backend constructor.
    """
    if backend_type == "memory":
        return MemoryBackend()
    if backend_type == "redis":
        from .redis import RedisBackend  # Late import — redis is optional
        return RedisBackend(**kwargs)  # type: ignore[arg-type]
    raise ValueError(f"Unknown backend type: {backend_type!r}")
```

---

## 2. Config Layer (Settings Dataclass)

Centralise all configuration in one `config.py` module. Avoid scattering magic values and
`os.environ` calls across the codebase.

### `config.py`

```python
# your_package/config.py
from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """All runtime configuration for your package.

    Attributes:
        api_key:  Authentication credential. Never log or expose this.
        timeout:  HTTP request timeout in seconds.
        retries:  Maximum number of retry attempts on transient failures.
        base_url: API base URL. Override in tests with a local server.
    """

    api_key: str
    timeout: int = 30
    retries: int = 3
    base_url: str = "https://api.example.com/v1"

    def __post_init__(self) -> None:
        if not self.api_key:
            raise ValueError("api_key must not be empty")
        if self.timeout < 1:
            raise ValueError("timeout must be >= 1")
        if self.retries < 0:
            raise ValueError("retries must be >= 0")

    @classmethod
    def from_env(cls) -> "Settings":
        """Construct Settings from environment variables.

        Required env var: YOUR_PACKAGE_API_KEY
        Optional env vars: YOUR_PACKAGE_TIMEOUT, YOUR_PACKAGE_RETRIES
        """
        api_key = os.environ.get("YOUR_PACKAGE_API_KEY", "")
        timeout = int(os.environ.get("YOUR_PACKAGE_TIMEOUT", "30"))
        retries = int(os.environ.get("YOUR_PACKAGE_RETRIES", "3"))
        return cls(api_key=api_key, timeout=timeout, retries=retries)
```

### Using Pydantic (optional, for larger projects)

```python
# your_package/config.py  — Pydantic v2 variant
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_key: str = Field(..., min_length=1)
    timeout: int = Field(30, ge=1)
    retries: int = Field(3, ge=0)
    base_url: str = "https://api.example.com/v1"

    model_config = {"env_prefix": "YOUR_PACKAGE_"}
```

---

## 3. Transport Layer (HTTP Client Abstraction)

Isolate all HTTP concerns — headers, retries, timeouts, error parsing — in a dedicated
`transport/` sub-package. The core client depends on the transport abstraction, not on `httpx`
or `requests` directly.

### Directory Layout

```
your_package/
  transport/
    __init__.py    # Re-exports HttpTransport
    http.py        # Concrete httpx-based transport
```

### `transport/http.py`

```python
# your_package/transport/http.py
from __future__ import annotations

from typing import Any

import httpx

from ..config import Settings
from ..exceptions import YourPackageError, RateLimitError, AuthenticationError


class HttpTransport:
    """Thin httpx wrapper that centralises auth, retries, and error mapping."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.Client(
            base_url=settings.base_url,
            timeout=settings.timeout,
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send an HTTP request and return the parsed JSON body.

        Raises:
            AuthenticationError: on 401.
            RateLimitError: on 429.
            YourPackageError: on all other non-2xx responses.
        """
        response = self._client.request(method, path, json=json, params=params)
        self._raise_for_status(response)
        return response.json()

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code == 401:
            raise AuthenticationError("Invalid or expired API key.")
        if response.status_code == 429:
            raise RateLimitError("Rate limit exceeded. Back off and retry.")
        if response.is_error:
            raise YourPackageError(
                f"API error {response.status_code}: {response.text[:200]}"
            )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "HttpTransport":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
```

### Async variant

```python
# your_package/transport/async_http.py
from __future__ import annotations

from typing import Any

import httpx

from ..config import Settings
from ..exceptions import YourPackageError, RateLimitError, AuthenticationError


class AsyncHttpTransport:
    """Async httpx wrapper. Use with `async with AsyncHttpTransport(...) as t:`."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.base_url,
            timeout=settings.timeout,
            headers={"Authorization": f"Bearer {settings.api_key}"},
        )

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        response = await self._client.request(method, path, json=json, params=params)
        self._raise_for_status(response)
        return response.json()

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code == 401:
            raise AuthenticationError("Invalid or expired API key.")
        if response.status_code == 429:
            raise RateLimitError("Rate limit exceeded. Back off and retry.")
        if response.is_error:
            raise YourPackageError(
                f"API error {response.status_code}: {response.text[:200]}"
            )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncHttpTransport":
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()
```

---

## 4. CLI Support

Add a CLI entry point via `[project.scripts]` in `pyproject.toml`.

### `pyproject.toml` entry

```toml
[project.scripts]
your-cli = "your_package.cli:main"
```

After installation, the user can run `your-cli --help` directly from the terminal.

### `cli.py` — Using Click

```python
# your_package/cli.py
from __future__ import annotations

import sys

import click

from .config import Settings
from .core import YourClient


@click.group()
@click.version_option()
def main() -> None:
    """your-package CLI — interact with the API from the command line."""


@main.command()
@click.option("--api-key", envvar="YOUR_PACKAGE_API_KEY", required=True, help="API key.")
@click.option("--timeout", default=30, show_default=True, help="Request timeout (s).")
@click.argument("query")
def search(api_key: str, timeout: int, query: str) -> None:
    """Search the API and print results."""
    settings = Settings(api_key=api_key, timeout=timeout)
    client = YourClient(settings=settings)
    try:
        results = client.search(query)
        for item in results:
            click.echo(item)
    except Exception as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)
```

### `cli.py` — Using Typer (modern alternative)

```python
# your_package/cli.py
from __future__ import annotations

import typer

from .config import Settings
from .core import YourClient

app = typer.Typer(help="your-package CLI.")


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query."),
    api_key: str = typer.Option(..., envvar="YOUR_PACKAGE_API_KEY"),
    timeout: int = typer.Option(30, help="Request timeout (s)."),
) -> None:
    """Search the API and print results."""
    settings = Settings(api_key=api_key, timeout=timeout)
    client = YourClient(settings=settings)
    results = client.search(query)
    for item in results:
        typer.echo(item)


def main() -> None:
    app()
```

---

## 5. Backend Injection in Core Client

**Critical:** always accept `backend` as a constructor argument. Never instantiate the backend
inside the constructor without a fallback parameter — that makes testing impossible.

```python
# your_package/core.py
from __future__ import annotations

from .backends.base import BaseBackend
from .backends.memory import MemoryBackend
from .config import Settings


class YourClient:
    """Primary client. Accepts an injected backend for testability.

    Args:
        settings: Resolved configuration. Use Settings.from_env() for production.
        backend:  Storage/processing backend. Defaults to MemoryBackend when None.
        timeout:  Deprecated — pass a Settings object instead.
        retries:  Deprecated — pass a Settings object instead.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        settings: Settings | None = None,
        backend: BaseBackend | None = None,
        timeout: int = 30,
        retries: int = 3,
    ) -> None:
        if settings is None:
            if api_key is None:
                raise ValueError("Provide either 'api_key' or 'settings'.")
            settings = Settings(api_key=api_key, timeout=timeout, retries=retries)
        self._settings = settings
        # CORRECT — default injected, not hardcoded
        self.backend: BaseBackend = backend if backend is not None else MemoryBackend()

    # ... methods
```

### Anti-Pattern — Never Do This

```python
# BAD: hardcodes the backend; impossible to swap in tests
class YourClient:
    def __init__(self, api_key: str) -> None:
        self.backend = MemoryBackend()          # ← no injection possible

# BAD: hardcodes the package name literal in imports
from your_package.backends.memory import MemoryBackend   # only fine in your_package itself
# use relative imports inside the package:
from .backends.memory import MemoryBackend               # ← correct
```

---

## 6. Decision Rules

```
Does the package interact with external state (cache, DB, queue)?
├── YES → Add backends/ with BaseBackend + MemoryBackend
│         Add optional heavy backends behind extras_require
│
└── NO → Skip backends/ entirely; keep core.py simple

Does the package call an external HTTP API?
├── YES → Add transport/http.py; inject via Settings
│
└── NO → Skip transport/

Does the package need a command-line interface?
├── YES, simple (1–3 commands) → Use argparse or click
│   Add [project.scripts] in pyproject.toml
│
├── YES, complex (sub-commands, plugins) → Use click or typer
│
└── NO → Skip cli.py

Does runtime behaviour depend on user-supplied config?
├── YES → Add config.py with Settings dataclass
│   Expose Settings.from_env() for production use
│
└── NO → Accept params directly in the constructor
```
