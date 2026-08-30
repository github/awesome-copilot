"""Recursive ``alias_of`` resolver for Registry v2 selectors.

The resolver follows ``alias_of`` chains iteratively with a visited set
and a depth bound (see :data:`MAX_ALIAS_DEPTH`).  Once the chain is
exhausted, the final product's ``profile_templates`` entry (or
``default_profile``) supplies the resolved profile id when the user did
not specify one.

The resolver returns a :class:`ResolvedSelector` so callers can preserve
the original user input (``requested``), the resolved target
(``resolved_product`` / ``resolved_profile``), the traversal trace
(``chain``), and a deprecation flag aggregated across the chain.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from registry.exceptions import (
    AliasCycleError,
    AliasDepthExceededError,
    UnknownSelectorError,
)

MAX_ALIAS_DEPTH = 16


@dataclass(frozen=True)
class ResolvedSelector:
    """Outcome of resolving a user-provided selector through ``alias_of``."""

    requested: str
    resolved_product: str
    resolved_profile: str
    chain: tuple[str, ...]
    deprecated: bool


def resolve(selector: str, registry_data: dict[str, Any]) -> ResolvedSelector:
    """Resolve a user selector to its target product/profile.

    Parameters
    ----------
    selector:
        ``"<product>"`` or ``"<product>/<profile>"`` form.  When the user
        provides a profile id and the chain defines one, the chain's
        profile id wins (aliases are authoritative).
    registry_data:
        Parsed Registry v2 JSON document.

    Raises
    ------
    UnknownSelectorError
        Initial or chained product is not present in ``registry_data``.
    AliasCycleError
        The ``alias_of`` chain returns to a visited product.
    AliasDepthExceededError
        The chain exceeds :data:`MAX_ALIAS_DEPTH`.
    """
    if not isinstance(selector, str) or not selector:
        raise UnknownSelectorError(product=str(selector))

    products = registry_data.get("products", {})
    profile_templates = registry_data.get("profile_templates", {})

    requested = selector
    product_id, separator, profile_id = selector.partition("/")
    requested_profile = profile_id if separator else None

    if product_id not in products:
        raise UnknownSelectorError(product=product_id)

    chain: list[str] = [product_id]
    visited: set[str] = {product_id}

    # Follow alias_of iteratively with explicit depth/visited guards.
    depth = 0
    while True:
        product = products[product_id]
        alias_of = product.get("alias_of")
        if not isinstance(alias_of, dict) or not alias_of:
            break
        target_product = alias_of.get("product")
        target_profile = alias_of.get("profile")
        if not isinstance(target_product, str) or not target_product:
            break
        if target_product in visited:
            raise AliasCycleError(chain=tuple(chain))
        depth += 1
        if depth > MAX_ALIAS_DEPTH:
            raise AliasDepthExceededError(
                chain=tuple(chain), limit=MAX_ALIAS_DEPTH
            )
        product_id = target_product
        if isinstance(target_profile, str) and target_profile:
            # Alias-specified profile overrides the user-requested one.
            profile_id = target_profile
        elif not profile_id and requested_profile:
            profile_id = requested_profile
        if product_id not in products:
            raise UnknownSelectorError(product=product_id)
        visited.add(product_id)
        chain.append(
            f"{product_id}/{profile_id}" if profile_id else product_id
        )

    # Final product has no alias_of; pick a profile if not already set.
    if not profile_id:
        product = products[product_id]
        template_id = product.get("template")
        if isinstance(template_id, str) and template_id in profile_templates:
            template = profile_templates[template_id]
            profile_id = str(template.get("profile", template_id))
        else:
            default_profile = product.get("default_profile")
            if isinstance(default_profile, str):
                profile_id = default_profile

    # Always record the final resolved form in the trace for consistency.
    final_label = (
        f"{product_id}/{profile_id}" if profile_id else product_id
    )
    if not chain or chain[-1] != final_label:
        chain.append(final_label)

    deprecated = any(
        bool(products.get(name, {}).get("deprecated"))
        for name in visited
    )

    return ResolvedSelector(
        requested=requested,
        resolved_product=product_id,
        resolved_profile=profile_id or "",
        chain=tuple(chain),
        deprecated=deprecated,
    )