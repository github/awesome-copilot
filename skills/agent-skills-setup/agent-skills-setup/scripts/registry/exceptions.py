"""Typed exceptions for the alias resolver.

Centralized here so :mod:`migration_core` and any future schema tooling
can raise the same exception types without importing each other in a
cycle.
"""

from __future__ import annotations


class AliasError(Exception):
    """Base class for alias resolution failures."""


class UnknownSelectorError(AliasError):
    """Raised when a product selector is not in the registry."""

    def __init__(self, product: str) -> None:
        super().__init__(f"unknown product: {product}")
        self.product = product


class AliasCycleError(AliasError):
    """Raised when an ``alias_of`` chain returns to a visited product."""

    def __init__(self, chain: tuple[str, ...]) -> None:
        message = "alias cycle detected: " + " -> ".join(chain)
        super().__init__(message)
        self.chain = chain


class AliasDepthExceededError(AliasError):
    """Raised when an ``alias_of`` chain exceeds the maximum depth."""

    def __init__(self, chain: tuple[str, ...], limit: int) -> None:
        message = (
            f"alias depth exceeded ({limit}): " + " -> ".join(chain)
        )
        super().__init__(message)
        self.chain = chain
        self.limit = limit