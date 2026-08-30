#!/usr/bin/env python3
"""Typed migration core for instructions, Agent Skills, and MCP profiles."""

from __future__ import annotations

import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

_SCRIPT_DIR = str(Path(__file__).resolve().parent)
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from skill_secret_scanner import finding_reason, scan as scan_skill_source_tree

from registry.alias_resolver import ResolvedSelector, resolve as resolve_alias
from registry.exceptions import (
    AliasCycleError,
    AliasDepthExceededError,
    UnknownSelectorError,
)


SENSITIVE_NAME = re.compile(
    r"(?:^|[_-])(token|secret|password|passwd|api[_-]?key|authorization|cookie)(?:$|[_-])",
    re.IGNORECASE,
)
PLACEHOLDER = re.compile(r"^(?:\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*|<[^>]+>)$")
URL_CREDENTIAL = re.compile(r"(?i)://[^/?#\s]+:[^/@\s]+@")
BEARER_LITERAL = re.compile(r"(?i)\bbearer\s+(?!\$\{|<)[A-Za-z0-9._~+/=-]{8,}")
SAFE_BEARER_REFERENCE = re.compile(
    r"(?i)^bearer\s+\$\{(?:env:)?[A-Za-z_][A-Za-z0-9_]*\}$"
)
FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
SKILL_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KNOWN_COMMANDS = {
    "detect",
    "inventory",
    "plan",
    "apply",
    "verify",
    "rollback",
    "migrate",
    "snapshot",
    "bundle-verify",
    "bundle-sign",
    "bundle-keygen",
    "restore",
    "doctor",
}
PLAN_SCHEMA_VERSION = 1
MANIFEST_SCHEMA_VERSION = 2
ADAPTER_VERSIONS = {
    "skills": "1",
    "instructions": "2",
    "mcp-json": "1",
    "mcp-jsonc": "1",
    "mcp-json5": "manual-1",
    "mcp-toml": "manual-1",
    "mcp-yaml": "manual-1",
    "mcp-xml": "manual-1",
    "mcp-lua": "manual-1",
    "mcp-uuid-or-json": "manual-1",
    "cloud-rebuild": "1",
    "git-preview": "2",
    "apply-transaction": "2",
}
AUTOMATIC_MIGRATION_POLICIES = {
    "bidirectional-reviewed",
    "prompt-ir-reviewed",
    "command-ir-reviewed",
    "agent-ir-reviewed",
    "hook-ir-reviewed",
}
# The declared automatic surface is the portable trio:
AUTOMATIC_OBJECT_TYPES = frozenset({
    "skills",
    "instructions",
    "mcp",
})
# Explicit opt-in transfer types
OPT_IN_WRITABLE_OBJECT_TYPES = frozenset({"plugins", "handoff"})
# Object types apply_plan knows how to stage atomically.
AUTO_WRITABLE_OBJECT_TYPES = frozenset({"skills", "instructions", "mcp", "plugins"})
MANUAL_TEMPLATE_OBJECT_TYPES = frozenset({"prompts", "commands"})
DRAFT_ONLY_OBJECT_TYPES = frozenset({
    "agents",
    "hooks",
    "workflows",
    "automation",
    "cron",
    "personas",
    "modes",
})
FORBIDDEN_OBJECT_TYPES = frozenset({
    "config",
    "policy",
    "trust",
    "user_memory",
    "generated_memory",
    "cloud_knowledge",
})
INVENTORY_ONLY_OBJECT_TYPES = (
    MANUAL_TEMPLATE_OBJECT_TYPES
    | DRAFT_ONLY_OBJECT_TYPES
    | FORBIDDEN_OBJECT_TYPES
)
AUTOMATIC_SURFACE_POLICIES = {
    "validate-then-atomic-copy",
    "semantic-ir-with-loss-report",
    "profile-version-adapter",
}
SOURCE_AUTOMATIC_SURFACE_POLICIES = AUTOMATIC_SURFACE_POLICIES | {"source-only"}


class ItemStatus(str, Enum):
    """Plan item state driving the partial safe apply flow.

    Values are stable strings so plan documents remain JSON-friendly.
    The legacy ``"manual"`` and ``"blocked"`` strings are normalized by
    :func:`normalize_status` to keep older saved plans valid.
    """

    READY = "ready"
    READY_LOSSY = "ready-lossy"
    DRAFT_DISABLED = "draft-disabled"
    MANUAL_REBUILD = "manual-rebuild"
    FORBIDDEN = "forbidden"
    CONFLICT = "conflict"
    INVALID = "invalid"


# Legacy aliases accepted from older plan documents.
_LEGACY_STATUS_ALIASES: dict[str, ItemStatus] = {
    "manual": ItemStatus.MANUAL_REBUILD,
    "blocked": ItemStatus.INVALID,
}

# Statuses that imply a write must not happen; they only populate the
# manifest with a reason.
_NON_WRITE_STATUSES: frozenset[ItemStatus] = frozenset(
    {
        ItemStatus.MANUAL_REBUILD,
        ItemStatus.FORBIDDEN,
        ItemStatus.CONFLICT,
        ItemStatus.INVALID,
    }
)


def normalize_status(value: Any) -> ItemStatus:
    """Coerce a string (or enum) value into an :class:`ItemStatus`.

    Accepts the modern enum strings plus the legacy ``"manual"`` and
    ``"blocked"`` strings so older saved plans keep validating.
    """
    if isinstance(value, ItemStatus):
        return value
    if isinstance(value, str):
        for status in ItemStatus:
            if status.value == value:
                return status
        legacy = _LEGACY_STATUS_ALIASES.get(value)
        if legacy is not None:
            return legacy
    raise ValueError(f"unknown plan item status: {value!r}")


def canonical_relative_path(path: Path, boundary: Path) -> str:
    """Return a stable, forward-slash relative path string for hashing."""
    try:
        relative = path.relative_to(boundary)
    except ValueError:
        return str(path)
    return relative.as_posix().strip("/")


def compute_object_id(
    *,
    product: str,
    profile: str,
    scope: str,
    canonical_path: str,
) -> str:
    """Stable 16-hex-char object identifier.

    Derived from the (resolved) product/profile, the scope, and the
    canonical source-relative path.  Alias-equivalent inputs therefore
    produce the same id; collision space is 64 bits.
    """
    payload = f"{product}|{profile}|{scope}|{canonical_path}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return digest[:16]


@dataclass
class InstructionIR:
    text: str
    scope: str = "project"
    activation: str = "always"
    globs: list[str] = field(default_factory=list)
    description: str = ""
    priority: int = 0
    hierarchy: str = "flat"
    imports: list[str] = field(default_factory=list)
    unknown_fields: list[str] = field(default_factory=list)
    source_format: str = "plain-markdown"


@dataclass
class MCPServerIR:
    name: str
    transport: str = "stdio"
    command: str | None = None
    args: list[str] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)
    url: str | None = None
    headers: dict[str, str] = field(default_factory=dict)
    cwd: str | None = None
    timeout_seconds: float | None = None
    startup_timeout_seconds: float | None = None
    enabled: bool = True
    tool_allowlist: list[str] = field(default_factory=list)
    tool_denylist: list[str] = field(default_factory=list)
    auth: dict[str, Any] = field(default_factory=dict)
    mtls: dict[str, Any] = field(default_factory=dict)
    server_instructions_trust: str = "default"
    target_schema_version: str = "1"
    package_requirements: list[str] = field(default_factory=list)
    extra_fields: dict[str, Any] = field(default_factory=dict)
    source_format: str = "json:mcpServers"


@dataclass
class PromptIR:
    name: str
    description: str = ""
    arguments: list[dict[str, str]] = field(default_factory=list)
    body: str = ""
    model: str = ""
    agent: str = ""
    file_references: list[str] = field(default_factory=list)
    scope: str = "user"
    auto_invocation: bool = False
    extra_fields: dict[str, Any] = field(default_factory=dict)
    source_format: str = "plain-prompt"


@dataclass
class CommandIR:
    name: str
    description: str = ""
    arguments: list[dict[str, str]] = field(default_factory=list)
    invocation: str = ""
    body: str = ""
    shell_block: str = ""
    tool_blocks: list[dict[str, str]] = field(default_factory=list)
    file_references: list[str] = field(default_factory=list)
    model: str = ""
    agent: str = ""
    scope: str = "user"
    auto_invocation: bool = False
    extra_fields: dict[str, Any] = field(default_factory=dict)
    source_format: str = "plain-command"


@dataclass
class AgentIR:
    name: str
    description: str = ""
    system_prompt: str = ""
    tools: list[str] = field(default_factory=list)
    tool_groups: list[str] = field(default_factory=list)
    model: str = ""
    permissions: list[str] = field(default_factory=list)
    mcp: list[str] = field(default_factory=list)
    subagents: list[str] = field(default_factory=list)
    handoffs: list[str] = field(default_factory=list)
    isolation: str = ""
    worktree: bool = False
    memory_policy: str = ""
    hooks: list[dict[str, Any]] = field(default_factory=list)
    display_metadata: dict[str, str] = field(default_factory=dict)
    extra_fields: dict[str, Any] = field(default_factory=dict)
    source_format: str = "plain-agent"


@dataclass
class HookIR:
    event: str
    matcher: str = ""
    command: str = ""
    cwd: str = ""
    env: dict[str, str] = field(default_factory=dict)
    stdin_schema: str = ""
    stdout_schema: str = ""
    blocking: bool = True
    exit_code: int | None = None
    timeout_seconds: float | None = None
    async_run: bool = False
    os_overrides: dict[str, dict[str, Any]] = field(default_factory=dict)
    target_script_references: list[str] = field(default_factory=list)
    extra_fields: dict[str, Any] = field(default_factory=dict)
    source_format: str = "plain-hook"


@dataclass
class LossItem:
    object_type: str
    field: str
    reason: str
    value: Any = None


@dataclass
class LossReport:
    items: list[LossItem] = field(default_factory=list)

    @property
    def lossy(self) -> bool:
        return bool(self.items)

    def add(self, object_type: str, field_name: str, reason: str, value: Any) -> None:
        self.items.append(LossItem(object_type, field_name, reason, value))

    def to_dict(self) -> dict[str, Any]:
        return {"lossy": self.lossy, "items": [asdict(item) for item in self.items]}


@dataclass
class SurfacePath:
    product: str
    profile: str
    object_type: str
    scope: str
    storage: str
    path: str
    resolved_path: Path
    boundary: Path
    source_format: str
    policy: str
    location_role: str
    canonical_path: str
    precedence: int

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["resolved_path"] = str(self.resolved_path)
        value["boundary"] = str(self.boundary)
        return value


@dataclass
class PlanItem:
    object_type: str
    status: str
    reason: str
    source: SurfacePath | None = None
    target: SurfacePath | None = None
    manual_actions: list[str] = field(default_factory=list)
    object_id: str = field(default="", repr=False)
    expected_source_state: dict[str, Any] | None = field(default=None, repr=False)
    expected_target_state: dict[str, Any] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        # Compute a stable object_id from the resolved source when not
        # provided.  Alias-equivalent selectors therefore share an id.
        if not self.object_id and self.source is not None:
            self.object_id = compute_object_id(
                product=self.source.product,
                profile=self.source.profile,
                scope=self.source.scope,
                canonical_path=canonical_relative_path(
                    self.source.resolved_path, self.source.boundary
                ),
            )

    @property
    def status_enum(self) -> ItemStatus:
        return normalize_status(self.status)

    @property
    def target_group(self) -> str | None:
        """Logical grouping used to scope conflict/invalid blocking.

        Two items share a target group when their resolved target path
        is the same.  Items without a target fall into a per-item group
        so they never block others.
        """
        target = self.target
        if target is None:
            return None
        return str(target.resolved_path)

    def to_dict(self) -> dict[str, Any]:
        return {
            "object_type": self.object_type,
            "status": self.status,
            "reason": self.reason,
            "source": self.source.to_dict() if self.source else None,
            "target": self.target.to_dict() if self.target else None,
            "manual_actions": self.manual_actions,
            "object_id": self.object_id,
        }


def _expand_path_vars(raw_path: str, home: Path) -> str:
    """Expand Windows %VAR% and POSIX $VAR environment variables.

    Provides safe cross-platform fallback paths for APPDATA, LOCALAPPDATA,
    USERPROFILE, and HOMEPATH when evaluating paths in cross-device/OS contexts.
    """
    def _replace_win_var(match: re.Match) -> str:
        var_name = match.group(1).upper()
        if var_name in os.environ:
            return os.environ[var_name]
        if var_name == "APPDATA":
            return str(home / "AppData" / "Roaming")
        if var_name == "LOCALAPPDATA":
            return str(home / "AppData" / "Local")
        if var_name in ("USERPROFILE", "HOMEPATH"):
            return str(home)
        if var_name == "PROGRAMDATA":
            return "C:/ProgramData"
        return match.group(0)

    expanded = re.sub(r"%([A-Za-z0-9_]+)%", _replace_win_var, raw_path)

    def _replace_posix_var(match: re.Match) -> str:
        var_name = (match.group(1) or match.group(2) or "").upper()
        if var_name in os.environ:
            return os.environ[var_name]
        if var_name == "APPDATA":
            return str(home / "AppData" / "Roaming")
        if var_name == "LOCALAPPDATA":
            return str(home / "AppData" / "Local")
        if var_name in ("USERPROFILE", "HOME"):
            return str(home)
        return match.group(0)

    expanded = re.sub(
        r"\$\{([A-Za-z0-9_]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)",
        _replace_posix_var,
        expanded,
    )
    return expanded.replace("\\", "/")


class Registry:
    """Resolve registry v2 products, profiles, and concrete surface paths."""

    def __init__(self, path: Path, workspace: Path, home: Path | None = None) -> None:
        self.path = path
        self.workspace = workspace.resolve()
        # Honor $HOME when it points at a real directory: Path.home() on
        # native Windows Python reads USERPROFILE only, which silently
        # ignored HOME-injected test fixtures and cross-device restores.
        if home is not None:
            resolved_home = home
        else:
            env_home = os.environ.get("HOME")
            env_candidate = Path(env_home) if env_home else None
            resolved_home = (
                env_candidate
                if env_candidate is not None and env_candidate.is_dir()
                else Path.home()
            )
        self.home = resolved_home.resolve()
        self.data = json.loads(path.read_text(encoding="utf-8"))
        if self.data.get("schema_version") not in (2, 2.1):
            raise ValueError("registry schema_version must be 2 or 2.1")

    @property
    def products(self) -> dict[str, Any]:
        return self.data["products"]

    def _with_support(self, profile: dict[str, Any]) -> dict[str, Any]:
        resolved = dict(profile)
        policy = str(resolved.get("migration_policy", ""))
        contract = self.data.get("support_contract", {}).get(policy, {})
        resolved.setdefault("support_level", contract.get("support_level"))
        resolved.setdefault("confidence", contract.get("confidence"))
        return resolved

    def split_selector(self, selector: str) -> tuple[str, str | None]:
        product_id, separator, profile_id = selector.partition("/")
        if product_id not in self.products:
            raise ValueError(f"unknown product: {product_id}")
        return product_id, profile_id if separator else None

    def profile_raw(self, selector: str) -> tuple[str, str, dict[str, Any]]:
        """Resolve a selector without following ``alias_of``.

        This is the legacy behavior preserved for callers that need the
        raw alias template result (e.g. tests asserting on the
        ``legacy-alias`` profile).  New code should use :meth:`profile`.
        """
        product_id, requested_profile = self.split_selector(selector)
        product = self.products[product_id]
        template_id = product.get("template")
        if template_id:
            template = dict(self.data["profile_templates"][template_id])
            for field_name in (
                "support_level",
                "confidence",
                "verified_at",
                "sources",
                "reason",
            ):
                if field_name in product:
                    template[field_name] = product[field_name]
            profile_id = str(template.get("profile", template_id))
            if requested_profile and requested_profile != profile_id:
                raise ValueError(
                    f"{product_id} is a {template_id} profile, not {requested_profile}"
                )
            return product_id, profile_id, self._with_support(template)

        profiles = product.get("profiles", {})
        profile_id = requested_profile or product.get("default_profile")
        if profile_id not in profiles:
            raise ValueError(f"unknown profile: {product_id}/{profile_id}")
        return (
            product_id,
            profile_id,
            self._with_support(self._resolve_profile(profiles, profile_id, ())),
        )

    def profile(self, selector: str) -> tuple[str, str, dict[str, Any]]:
        """Resolve a selector through the alias chain.

        See :mod:`registry.alias_resolver` for chain semantics.  Returns
        ``(resolved_product, resolved_profile, profile_data)`` using the
        resolved identifiers.  The original user input is preserved via
        :attr:`ResolvedSelector.requested`; callers that need it should
        call :meth:`resolve_selector` directly.
        """
        resolved = resolve_alias(selector, self.data)
        self._log_resolution(resolved)
        return self._load_profile_data(resolved)

    def resolve_selector(self, selector: str) -> ResolvedSelector:
        """Return the :class:`ResolvedSelector` without resolving profile
        data.  Useful for callers that want to preserve ``requested`` vs
        ``resolved_product``/``resolved_profile`` for logs, plans, or
        manifests."""
        resolved = resolve_alias(selector, self.data)
        self._log_resolution(resolved)
        return resolved

    @staticmethod
    def _log_resolution(resolved: ResolvedSelector) -> None:
        # Only log when an alias chain was actually followed.
        if resolved.chain and resolved.chain[0] == resolved.resolved_product:
            return
        chain = " -> ".join(resolved.chain)
        print(
            f"alias: {resolved.requested} -> "
            f"{resolved.resolved_product}/{resolved.resolved_profile} "
            f"({chain})",
            file=sys.stderr,
        )
        if resolved.deprecated:
            print(
                f"alias: {resolved.requested} is deprecated",
                file=sys.stderr,
            )

    def _load_profile_data(
        self, resolved: ResolvedSelector
    ) -> tuple[str, str, dict[str, Any]]:
        """Translate a :class:`ResolvedSelector` into the same tuple shape
        as :meth:`profile_raw` using the resolved product/profile."""
        product = self.products.get(resolved.resolved_product)
        if product is None:
            raise UnknownSelectorError(product=resolved.resolved_product)
        template_id = product.get("template")
        if isinstance(template_id, str) and template_id:
            template = dict(self.data["profile_templates"][template_id])
            for field_name in (
                "support_level",
                "confidence",
                "verified_at",
                "sources",
                "reason",
            ):
                if field_name in product:
                    template[field_name] = product[field_name]
            if not resolved.resolved_profile:
                profile_id = str(template.get("profile", template_id))
            else:
                profile_id = resolved.resolved_profile
            return (
                resolved.resolved_product,
                profile_id,
                self._with_support(template),
            )
        profiles = product.get("profiles", {})
        profile_id = resolved.resolved_profile or product.get("default_profile")
        if profile_id not in profiles:
            raise ValueError(
                f"unknown profile: {resolved.resolved_product}/{profile_id}"
            )
        return (
            resolved.resolved_product,
            profile_id,
            self._with_support(self._resolve_profile(profiles, profile_id, ())),
        )

    def _resolve_profile(
        self,
        profiles: dict[str, Any],
        profile_id: str,
        stack: tuple[str, ...],
    ) -> dict[str, Any]:
        if profile_id in stack:
            raise ValueError(f"profile inheritance cycle at {profile_id}")
        profile = dict(profiles[profile_id])
        parent_id = profile.pop("inherits", None)
        if not parent_id:
            return profile
        if parent_id not in profiles:
            raise ValueError(f"unknown inherited profile: {parent_id}")
        parent = self._resolve_profile(profiles, parent_id, stack + (profile_id,))
        parent.update(profile)
        return parent

    @staticmethod
    def _absolute(path: Path) -> Path:
        return Path(os.path.abspath(path))

    def resolve_path(self, entry: dict[str, Any]) -> tuple[Path, Path]:
        raw_path = str(entry["path"])
        override = entry.get("override_env")
        if override and os.environ.get(str(override)):
            base = Path(os.environ[str(override)]).expanduser()
            if not base.is_absolute():
                raise ValueError(f"{override} must be an absolute path")
            relative = entry.get("override_relative_path")
            boundary = self._absolute(base)
            path = boundary / str(relative) if relative else boundary
            return self._absolute(path), boundary
        # Honour Registry v2 per-surface platform overrides (darwin,
        # linux, windows, wsl, remote-ssh, dev-container, codespaces,
        # vscode-profile, extension-host).
        platforms = entry.get("platforms") or entry.get("platform_paths") or {}
        env_platform = os.environ.get("AGENT_SKILLS_PLATFORM", "")
        if not env_platform:
            if sys.platform == "win32":
                env_platform = "windows"
            elif sys.platform == "darwin":
                env_platform = "darwin"
            elif sys.platform.startswith("linux"):
                env_platform = "linux"
            else:
                env_platform = "linux"

        if platforms and env_platform in platforms:
            candidate = str(platforms[env_platform])
            # Glob overrides (github.copilot-*) express a *probe* location,
            # not a deterministic read/write target; applying to them would
            # either match nothing or fail on literal '*' (WinError 123).
            if not any(ch in candidate for ch in "*?["):
                raw_path = candidate

        expanded_str = _expand_path_vars(raw_path, self.home)

        if expanded_str == "~":
            return self.home, self.home
        if expanded_str.startswith("~/"):
            return self._absolute(self.home / expanded_str[2:]), self.home

        p = Path(expanded_str)
        if p.is_absolute() or re.match(r"^[a-zA-Z]:", expanded_str):
            resolved = self._absolute(p)
            try:
                resolved.relative_to(self.home)
                return resolved, self.home
            except ValueError:
                return resolved, resolved.parent

        return self._absolute(self.workspace / expanded_str), self.workspace

    def surfaces(self, selector: str, object_type: str) -> list[SurfacePath]:
        product_id, profile_id, profile = self.profile(selector)
        profile_platforms = profile.get("platforms") or profile.get("platform_paths") or {}
        entries = profile.get("surfaces", {}).get(object_type, [])
        surfaces: list[SurfacePath] = []
        for entry in entries:
            canonical_path = str(entry["path"])
            candidates = [canonical_path, *entry.get("compatibility_paths", [])]
            seen_paths: set[Path] = set()
            for precedence, candidate_path in enumerate(candidates):
                candidate_entry = dict(entry)
                if not candidate_entry.get("platforms") and profile_platforms:
                    derived_platforms = {}
                    for plat, plat_path in profile_platforms.items():
                        if plat in ("windows", "wsl", "remote-ssh", "dev-container", "codespaces", "vscode-profile", "extension-host"):
                            if object_type == "skills":
                                derived_platforms[plat] = plat_path
                            else:
                                plat_base_str = str(plat_path).rstrip("/\\")
                                if plat_base_str.endswith("/skills") or plat_base_str.endswith("\\skills"):
                                    base = plat_base_str[:-7]
                                else:
                                    base = plat_base_str
                                if candidate_path.startswith("~/.") or candidate_path.startswith("~/"):
                                    rel_sub = candidate_path.split("/", 1)[-1]
                                    if "/" in rel_sub:
                                        sub = rel_sub.split("/", 1)[1]
                                        derived_platforms[plat] = f"{base}/{sub}"
                                    else:
                                        derived_platforms[plat] = base
                    if derived_platforms:
                        candidate_entry["platforms"] = derived_platforms

                candidate_entry["path"] = candidate_path
                if precedence:
                    candidate_entry.pop("override_env", None)
                    candidate_entry.pop("override_relative_path", None)
                resolved_path, boundary = self.resolve_path(candidate_entry)
                if resolved_path in seen_paths:
                    continue
                seen_paths.add(resolved_path)
                compatibility_behavior = str(
                    entry.get("compatibility_behavior", "alternative")
                )
                location_role = "canonical"
                if precedence:
                    location_role = (
                        "precedence"
                        if compatibility_behavior == "precedence"
                        else "compatibility"
                    )
                surfaces.append(SurfacePath(
                    product=product_id,
                    profile=profile_id,
                    object_type=object_type,
                    scope=str(entry["scope"]),
                    storage=str(entry["storage"]),
                    path=str(candidate_path),
                    resolved_path=resolved_path,
                    boundary=boundary,
                    source_format=str(entry.get("format", "unknown")),
                    policy=str(entry["policy"]),
                    location_role=location_role,
                    canonical_path=canonical_path,
                    precedence=precedence,
                ))
        return surfaces

    def inventory(self, selector: str | None = None) -> list[dict[str, Any]]:
        selectors: Iterable[str]
        if selector:
            selectors = (selector,)
        else:
            expanded: list[str] = []
            for product_id, product in self.products.items():
                profiles = product.get("profiles", {})
                if profiles:
                    expanded.extend(
                        f"{product_id}/{profile_id}" for profile_id in profiles
                    )
                else:
                    expanded.append(product_id)
            selectors = expanded
        rows: list[dict[str, Any]] = []
        for candidate in selectors:
            product_id, profile_id, profile = self.profile(candidate)
            surfaces = profile.get("surfaces", {})
            if not surfaces:
                rows.append(
                    {
                        "product": product_id,
                        "profile": profile_id,
                        "kind": profile.get("kind"),
                        "migration_policy": profile.get("migration_policy"),
                        "support_level": profile.get("support_level"),
                        "confidence": profile.get("confidence"),
                        "object_type": None,
                        "exists": False,
                        "detection": profile.get("detection", []),
                        "platforms": profile.get("platforms", {}),
                    }
                )
                continue
            for object_type in surfaces:
                candidates = self.surfaces(
                    f"{product_id}/{profile_id}", object_type
                )
                existing_by_group: dict[tuple[str, str], list[SurfacePath]] = {}
                for surface in candidates:
                    group = (surface.scope, surface.canonical_path)
                    if surface.resolved_path.exists():
                        existing_by_group.setdefault(group, []).append(surface)
                for surface in candidates:
                    row = surface.to_dict()
                    row["kind"] = profile.get("kind")
                    row["migration_policy"] = profile.get("migration_policy")
                    row["support_level"] = profile.get("support_level")
                    row["confidence"] = profile.get("confidence")
                    row["exists"] = surface.resolved_path.exists()
                    row["detection"] = profile.get("detection", [])
                    row["platforms"] = profile.get("platforms", {})
                    existing = existing_by_group.get(
                        (surface.scope, surface.canonical_path), []
                    )
                    row["alias_conflict"] = (
                        len(existing) > 1
                        and not all(
                            candidate.location_role == "precedence"
                            for candidate in existing[1:]
                        )
                    )
                    row["precedence_active"] = bool(existing) and (
                        existing[0].resolved_path == surface.resolved_path
                    )
                    rows.append(row)
        return rows


FORMAT_FEATURES: dict[str, set[str]] = {
    "agents-md": {"text"},
    "amazon-q-rule": {"text"},
    "augment-rule": {"text", "activation", "description"},
    "cline-rule": {"text", "activation", "globs"},
    "cursor-mdc": {"text", "activation", "globs", "description"},
    "continue-rule": {"text", "activation", "globs", "description"},
    "kiro-steering": {
        "text",
        "activation",
        "globs",
        "description",
        "imports",
    },
    "copilot-instructions": {"text", "activation", "globs"},
    "claude-rule": {"text", "activation", "globs"},
    "windsurf-rule": {"text", "activation", "globs", "description"},
    "plain-markdown": {"text"},
    "trae-rule": {"text"},
    "qoder-rule": {"text"},
}


def parse_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _strip_frontmatter_comment(value: str) -> str:
    """Strip a YAML-style inline comment without touching quoted text."""
    quote: str | None = None
    escaped = False
    for index, character in enumerate(value):
        if escaped:
            escaped = False
            continue
        if character == "\\" and quote == '"':
            escaped = True
            continue
        if quote:
            if character == quote:
                quote = None
            continue
        if character in {'"', "'"}:
            quote = character
            continue
        if character == "#" and (index == 0 or value[index - 1].isspace()):
            return value[:index].rstrip()
    return value.rstrip()


def parse_list(value: str) -> list[str]:
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]
    if not value:
        return []
    return [parse_scalar(item.strip()) for item in value.split(",") if item.strip()]


def _parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = FRONTMATTER.match(text)
    if not match:
        return {}, text
    metadata: dict[str, Any] = {}
    current_list: str | None = None
    for raw_line in match.group(1).splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if line.startswith((" ", "\t")):
            if current_list and stripped.startswith("-"):
                item = parse_scalar(stripped[1:].strip())
                if item:
                    metadata[current_list].append(item)
                continue
            raise ValueError("unsupported nested instruction frontmatter")
        if ":" not in line:
            raise ValueError("invalid instruction frontmatter")
        key, raw_value = line.split(":", 1)
        key = key.strip()
        if not key:
            raise ValueError("instruction frontmatter contains an empty key")
        raw_value = _strip_frontmatter_comment(raw_value.strip())
        current_list = None
        if not raw_value:
            metadata[key] = []
            current_list = key
        elif raw_value.startswith("[") and raw_value.endswith("]"):
            metadata[key] = parse_list(raw_value)
        else:
            metadata[key] = parse_scalar(raw_value)
    return metadata, text[match.end() :]


def _metadata_list(metadata: dict[str, Any], key: str) -> list[str]:
    value = metadata.get(key, [])
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        return parse_list(value)
    raise ValueError(f"instruction frontmatter {key} must be a string or list")


def _metadata_bool(metadata: dict[str, Any], key: str) -> bool | None:
    if key not in metadata:
        return None
    value = str(metadata[key]).lower()
    if value in {"true", "yes", "1"}:
        return True
    if value in {"false", "no", "0"}:
        return False
    raise ValueError(f"instruction frontmatter {key} must be a boolean")


def _frontmatter_document(fields: list[tuple[str, Any]], body: str) -> str:
    lines = ["---"]
    for key, value in fields:
        if isinstance(value, list):
            if value:
                lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
            else:
                lines.append(f"{key}: []")
        elif isinstance(value, bool):
            lines.append(f"{key}: {'true' if value else 'false'}")
        else:
            lines.append(f"{key}: {json.dumps(str(value), ensure_ascii=False)}")
    lines.extend(("---", body))
    return "\n".join(lines)


def parse_instruction(
    text: str,
    source_format: str,
    scope: str = "project",
    hierarchy: str = "flat",
) -> InstructionIR:
    if source_format not in FORMAT_FEATURES:
        raise ValueError(
            f"instruction format {source_format} requires a dedicated adapter"
        )
    plain_formats = {"agents-md", "amazon-q-rule", "plain-markdown", "trae-rule", "qoder-rule"}
    metadata, body = ({}, text) if source_format in plain_formats else _parse_frontmatter(text)
    activation = "always"
    globs: list[str] = []
    description = ""
    imports: list[str] = []
    known_fields: set[str] = set()

    if source_format == "augment-rule":
        known_fields = {"type", "description"}
        rule_type = str(metadata.get("type", "always_apply"))
        activation = {
            "always_apply": "always",
            "agent_requested": "model",
            "manual": "manual",
        }.get(rule_type, "unknown")
        description = str(metadata.get("description", ""))
    elif source_format in {"cline-rule", "claude-rule"}:
        known_fields = {"paths"}
        globs = _metadata_list(metadata, "paths")
        activation = "glob" if globs else "always"
    elif source_format == "cursor-mdc":
        known_fields = {"description", "globs", "alwaysApply"}
        globs = _metadata_list(metadata, "globs")
        description = str(metadata.get("description", ""))
        always_apply = _metadata_bool(metadata, "alwaysApply")
        if always_apply:
            activation = "always"
        elif globs:
            activation = "glob"
        elif description:
            activation = "model"
        else:
            activation = "manual"
    elif source_format == "continue-rule":
        known_fields = {"name", "description", "globs", "alwaysApply"}
        globs = _metadata_list(metadata, "globs")
        description = str(metadata.get("description", metadata.get("name", "")))
        always_apply = _metadata_bool(metadata, "alwaysApply")
        if always_apply is True:
            activation = "always"
        elif globs:
            activation = "glob"
        elif always_apply is False and description:
            activation = "model"
        else:
            activation = "always"
    elif source_format == "kiro-steering":
        known_fields = {"inclusion", "fileMatchPattern", "name", "description"}
        inclusion = str(metadata.get("inclusion", "always"))
        activation = {
            "always": "always",
            "fileMatch": "glob",
            "manual": "manual",
            "auto": "model",
        }.get(inclusion, "unknown")
        globs = _metadata_list(metadata, "fileMatchPattern")
        description = str(metadata.get("description", ""))
        import_pattern = re.compile(r"\A(?:#\[\[file:([^\]\r\n]+)\]\]\s*\n)+")
        import_match = import_pattern.match(body)
        if import_match:
            imports = re.findall(
                r"^#\[\[file:([^\]\r\n]+)\]\]\s*$",
                import_match.group(0),
                re.MULTILINE,
            )
            body = body[import_match.end() :]
    elif source_format == "copilot-instructions":
        known_fields = {"applyTo"}
        globs = _metadata_list(metadata, "applyTo")
        activation = "glob" if globs and globs != ["**"] else "always"
    elif source_format == "windsurf-rule":
        known_fields = {"trigger", "globs", "description"}
        trigger = str(metadata.get("trigger", "always_on"))
        activation = {
            "always_on": "always",
            "glob": "glob",
            "model_decision": "model",
            "manual": "manual",
        }.get(trigger, "unknown")
        globs = _metadata_list(metadata, "globs")
        description = str(metadata.get("description", ""))

    if activation == "unknown":
        raise ValueError(f"unsupported {source_format} activation mode")
    return InstructionIR(
        text=body.rstrip() + "\n",
        scope=scope,
        activation=activation,
        globs=globs,
        description=description,
        priority=0,
        hierarchy=hierarchy,
        imports=imports,
        unknown_fields=sorted(set(metadata) - known_fields),
        source_format=source_format,
    )


def emit_instruction(
    instruction: InstructionIR,
    target_format: str,
) -> tuple[str, LossReport]:
    features = FORMAT_FEATURES.get(target_format)
    if features is None:
        raise ValueError(
            f"instruction format {target_format} requires a dedicated adapter"
        )
    report = LossReport()
    values: dict[str, Any] = {
        "activation": instruction.activation,
        "globs": instruction.globs,
        "description": instruction.description,
        "priority": instruction.priority,
        "hierarchy": instruction.hierarchy,
        "imports": instruction.imports,
    }
    meaningful = {
        "activation": instruction.activation not in ("", "always", "true"),
        "globs": bool(instruction.globs),
        "description": bool(instruction.description),
        "priority": instruction.priority != 0,
        "hierarchy": instruction.hierarchy not in ("", "flat", "none"),
        "imports": bool(instruction.imports),
    }
    for field_name, present in meaningful.items():
        if present and field_name not in features:
            report.add(
                "instructions",
                field_name,
                f"{target_format} cannot represent this field",
                values[field_name],
            )
    for field_name in instruction.unknown_fields:
        report.add(
            "instructions",
            field_name,
            f"unrecognized {instruction.source_format} frontmatter field",
            None,
        )

    activation = instruction.activation
    body = instruction.text
    if target_format in {"agents-md", "amazon-q-rule", "plain-markdown", "trae-rule", "qoder-rule"}:
        if activation not in {"", "always", "true"}:
            raise ValueError(
                f"{target_format} cannot safely represent {activation} activation"
            )
        return body, report
    if target_format == "augment-rule":
        if activation in {"", "always", "true"}:
            return _frontmatter_document([("type", "always_apply")], body), report
        if activation == "model":
            description = instruction.description or "Migrated instruction"
            return _frontmatter_document(
                [("type", "agent_requested"), ("description", description)],
                body,
            ), report
        raise ValueError(f"augment-rule cannot safely represent {activation} activation")
    if target_format in {"cline-rule", "claude-rule"}:
        if activation in {"", "always", "true"}:
            return body, report
        if activation == "glob" and instruction.globs:
            return _frontmatter_document([("paths", instruction.globs)], body), report
        raise ValueError(f"{target_format} cannot safely represent {activation} activation")
    if target_format == "cursor-mdc":
        description = instruction.description
        globs = instruction.globs
        always_apply = activation in {"", "always", "true"}
        if activation == "model" and not description:
            description = "Migrated instruction"
        if activation == "manual":
            description = ""
            globs = []
        if activation not in {"", "always", "true", "glob", "model", "manual"}:
            raise ValueError(f"cursor-mdc cannot represent {activation} activation")
        return _frontmatter_document(
            [
                ("description", description),
                ("globs", ",".join(globs)),
                ("alwaysApply", always_apply),
            ],
            body,
        ), report
    if target_format == "continue-rule":
        if activation == "manual":
            raise ValueError("continue-rule cannot safely represent manual activation")
        fields: list[tuple[str, Any]] = [("name", "Migrated instruction")]
        if instruction.globs:
            fields.append(("globs", instruction.globs))
        fields.append(("alwaysApply", activation in {"", "always", "true"}))
        if instruction.description:
            fields.append(("description", instruction.description))
        return _frontmatter_document(fields, body), report
    if target_format == "kiro-steering":
        inclusion = {
            "": "always",
            "true": "always",
            "always": "always",
            "glob": "fileMatch",
            "manual": "manual",
            "model": "auto",
        }.get(activation)
        if inclusion is None:
            raise ValueError(f"kiro-steering cannot represent {activation} activation")
        fields = [("inclusion", inclusion)]
        if inclusion == "fileMatch":
            if not instruction.globs:
                raise ValueError("kiro-steering fileMatch requires globs")
            if len(instruction.globs) != 1:
                raise ValueError(
                    "kiro-steering fileMatch supports one native pattern per file"
                )
            fields.append(("fileMatchPattern", instruction.globs[0]))
        if inclusion == "auto":
            fields.extend(
                (
                    ("name", "migrated-instruction"),
                    ("description", instruction.description or "Migrated instruction"),
                )
            )
        if instruction.imports:
            body = "".join(
                f"#[[file:{path}]]\n" for path in instruction.imports
            ) + body
        return _frontmatter_document(fields, body), report
    if target_format == "copilot-instructions":
        if activation in {"", "always", "true"}:
            apply_to = "**"
        elif activation == "glob" and instruction.globs:
            apply_to = ",".join(instruction.globs)
        else:
            raise ValueError(
                f"copilot-instructions cannot safely represent {activation} activation"
            )
        return _frontmatter_document([("applyTo", apply_to)], body), report
    if target_format == "windsurf-rule":
        trigger = {
            "": "always_on",
            "true": "always_on",
            "always": "always_on",
            "glob": "glob",
            "model": "model_decision",
            "manual": "manual",
        }.get(activation)
        if trigger is None:
            raise ValueError(f"windsurf-rule cannot represent {activation} activation")
        fields = [("trigger", trigger)]
        if trigger == "glob":
            if not instruction.globs:
                raise ValueError("windsurf-rule glob activation requires globs")
            fields.append(("globs", ",".join(instruction.globs)))
        if trigger == "model_decision":
            fields.append(
                ("description", instruction.description or "Migrated instruction")
            )
        return _frontmatter_document(fields, body), report
    raise ValueError(f"instruction format {target_format} has no emitter")


MCP_ADAPTERS: dict[str, dict[str, Any]] = {
    "json": {"name": "mcp-json", "automatic": True},
    "jsonc": {"name": "mcp-jsonc", "automatic": True},
    "json5": {"name": "mcp-json5", "automatic": False},
    "toml": {"name": "mcp-toml", "automatic": False},
    "yaml": {"name": "mcp-yaml", "automatic": False},
    "yml": {"name": "mcp-yaml", "automatic": False},
    "xml": {"name": "mcp-xml", "automatic": False},
    "lua": {"name": "mcp-lua", "automatic": False},
    "uuid-or-json": {"name": "mcp-uuid-or-json", "automatic": False},
}


def mcp_adapter(source_format: str) -> dict[str, Any]:
    family = source_format.lower().split(":", 1)[0]
    adapter = MCP_ADAPTERS.get(family)
    if adapter is None:
        return {
            "name": f"mcp-unknown:{family}",
            "automatic": False,
            "reason": "unknown MCP format has no registered adapter",
        }
    value = dict(adapter)
    if not value["automatic"]:
        value["reason"] = (
            f"{family} MCP requires a dedicated reviewed reconstruction adapter"
        )
    return value


def _strip_jsonc(text: str) -> str:
    """Remove JSONC comments and trailing commas without evaluating input."""
    without_comments: list[str] = []
    index = 0
    in_string = False
    escaped = False
    while index < len(text):
        character = text[index]
        if in_string:
            without_comments.append(character)
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            index += 1
            continue
        if character == '"':
            in_string = True
            without_comments.append(character)
            index += 1
            continue
        if character == "/" and index + 1 < len(text):
            following = text[index + 1]
            if following == "/":
                index += 2
                while index < len(text) and text[index] not in "\r\n":
                    index += 1
                continue
            if following == "*":
                index += 2
                while index + 1 < len(text) and text[index : index + 2] != "*/":
                    if text[index] in "\r\n":
                        without_comments.append(text[index])
                    index += 1
                if index + 1 >= len(text):
                    raise ValueError("unterminated JSONC block comment")
                index += 2
                continue
        without_comments.append(character)
        index += 1

    cleaned = "".join(without_comments)
    without_trailing_commas: list[str] = []
    index = 0
    in_string = False
    escaped = False
    while index < len(cleaned):
        character = cleaned[index]
        if in_string:
            without_trailing_commas.append(character)
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            index += 1
            continue
        if character == '"':
            in_string = True
            without_trailing_commas.append(character)
            index += 1
            continue
        if character == ",":
            lookahead = index + 1
            while lookahead < len(cleaned) and cleaned[lookahead].isspace():
                lookahead += 1
            if lookahead < len(cleaned) and cleaned[lookahead] in "}]":
                index += 1
                continue
        without_trailing_commas.append(character)
        index += 1
    return "".join(without_trailing_commas)


def _decode_mcp_document(text: str, source_format: str) -> dict[str, Any]:
    adapter = mcp_adapter(source_format)
    if not adapter["automatic"]:
        raise ValueError(str(adapter["reason"]))
    family = source_format.lower().split(":", 1)[0]
    decoded = json.loads(_strip_jsonc(text) if family == "jsonc" else text)
    if not isinstance(decoded, dict):
        raise ValueError("MCP document root must be an object")
    return decoded


def _server_container(
    value: dict[str, Any],
    source_format: str,
) -> tuple[str, dict[str, Any]]:
    containers = [
        (key, value[key])
        for key in ("mcpServers", "servers", "mcp")
        if isinstance(value.get(key), dict)
    ]
    if len(containers) > 1:
        raise ValueError(
            "MCP document has conflicting root aliases: "
            + ", ".join(key for key, _ in containers)
        )
    expected = source_format.partition(":")[2]
    if not containers:
        raise ValueError(
            f"MCP {source_format} must contain a {expected or 'server map'} object"
        )
    key, servers = containers[0]
    if expected and key != expected:
        raise ValueError(f"MCP {source_format} requires root key {expected}, not {key}")
    return key, servers


def parse_mcp_document(text: str, source_format: str) -> list[MCPServerIR]:
    value = _decode_mcp_document(text, source_format)
    _, servers = _server_container(value, source_format)
    parsed: list[MCPServerIR] = []
    for name, raw_server in servers.items():
        if not isinstance(name, str) or not isinstance(raw_server, dict):
            raise ValueError("MCP servers must be named objects")
        command = raw_server.get("command")
        url = raw_server.get("url")
        raw_transport = raw_server.get(
            "transport",
            raw_server.get("type", "http" if url else "stdio"),
        )
        if not isinstance(raw_transport, str):
            raise ValueError(f"MCP server {name}: transport must be a string")
        transport_aliases = {
            "streamable-http": "http",
            "streamable_http": "http",
            "streamableHttp": "http",
        }
        transport = transport_aliases.get(raw_transport, raw_transport)
        if transport not in {"stdio", "http", "sse"}:
            raise ValueError(f"MCP server {name}: unsupported transport {transport}")
        if command is not None and not isinstance(command, str):
            raise ValueError(f"MCP server {name}: command must be a string")
        if url is not None and not isinstance(url, str):
            raise ValueError(f"MCP server {name}: url must be a string")
        if (command is None) == (url is None):
            raise ValueError(
                f"MCP server {name}: exactly one of command or url is required"
            )
        if command is not None and transport != "stdio":
            raise ValueError(f"MCP server {name}: command requires stdio transport")
        if url is not None and transport == "stdio":
            raise ValueError(f"MCP server {name}: url requires http or sse transport")
        args = raw_server.get("args", [])
        env = raw_server.get("env", {})
        headers = raw_server.get("headers", {})
        if not isinstance(args, list) or not all(isinstance(arg, str) for arg in args):
            raise ValueError(f"MCP server {name}: args must be strings")
        if not isinstance(env, dict) or not all(
            isinstance(key, str) and isinstance(item, str) for key, item in env.items()
        ):
            raise ValueError(f"MCP server {name}: env must be a string map")
        if not isinstance(headers, dict) or not all(
            isinstance(key, str) and isinstance(item, str)
            for key, item in headers.items()
        ):
            raise ValueError(f"MCP server {name}: headers must be a string map")
        if command is not None and headers:
            raise ValueError(f"MCP server {name}: stdio transport cannot use headers")
        if url is not None and (args or env):
            raise ValueError(f"MCP server {name}: remote transport cannot use args or env")
        known_fields = {
            "command",
            "args",
            "env",
            "url",
            "headers",
            "transport",
            "type",
        }
        parsed.append(
            MCPServerIR(
                name=name,
                transport=transport,
                command=command,
                args=list(args),
                env=dict(env),
                url=url,
                headers=dict(headers),
                extra_fields={
                    key: item
                    for key, item in raw_server.items()
                    if key not in known_fields
                },
                source_format=source_format,
            )
        )
    return parsed


PROVIDER_SECRET = re.compile(
    r"(?:sk-[A-Za-z0-9_-]{16,}"
    r"|gh[pousr]_[A-Za-z0-9]{20,}"
    r"|AKIA[0-9A-Z]{16}"
    r"|ASIA[0-9A-Z]{16}"
    r"|xox[baprs]-[A-Za-z0-9-]{10,}"
    r"|ya29\.[A-Za-z0-9_-]+"
    r"|AIza[0-9A-Za-z_-]{35}"
    r"|sk_live_[A-Za-z0-9]{16,})"
)
SECRET_FLAGS = {
    "-k": "API_KEY",
    "-p": "PASSWORD",
    "-t": "TOKEN",
    "--api-key": "API_KEY",
    "--apikey": "API_KEY",
    "--auth": "AUTHORIZATION",
    "--password": "PASSWORD",
    "--secret": "SECRET",
    "--token": "TOKEN",
}


def _safe_secret_value(name: str, value: str) -> tuple[str, bool]:
    if (
        not SENSITIVE_NAME.search(name)
        and not PROVIDER_SECRET.search(value)
        and not URL_CREDENTIAL.search(value)
        and not BEARER_LITERAL.search(value)
    ) or PLACEHOLDER.fullmatch(value) or SAFE_BEARER_REFERENCE.fullmatch(value):
        return value, False
    placeholder_name = re.sub(r"[^A-Za-z0-9_]", "_", name).upper()
    return f"${{{placeholder_name}}}", True


def _safe_args(args: list[str], server_name: str, report: LossReport) -> list[str]:
    safe = list(args)
    index = 0
    while index < len(safe):
        argument = safe[index]
        flag, separator, inline_value = argument.partition("=")
        normalized_flag = flag.lower()
        if normalized_flag in SECRET_FLAGS:
            placeholder = f"${{{SECRET_FLAGS[normalized_flag]}}}"
            if separator:
                if inline_value and not PLACEHOLDER.fullmatch(inline_value):
                    safe[index] = f"{flag}={placeholder}"
                    report.add(
                        "mcp", f"{server_name}.args[{index}]", "literal secret removed", None
                    )
            elif index + 1 < len(safe) and not PLACEHOLDER.fullmatch(safe[index + 1]):
                safe[index + 1] = placeholder
                report.add(
                    "mcp", f"{server_name}.args[{index + 1}]", "literal secret removed", None
                )
                index += 1
        elif (
            PROVIDER_SECRET.search(argument)
            or URL_CREDENTIAL.search(argument)
            or BEARER_LITERAL.search(argument)
        ):
            safe[index] = "${SECRET}"
            report.add(
                "mcp", f"{server_name}.args[{index}]", "provider credential removed", None
            )
        index += 1
    return safe


def _safe_url(url: str, server_name: str, report: LossReport) -> str:
    provider_redacted_url, provider_count = PROVIDER_SECRET.subn("${MCP_SECRET}", url)
    if provider_count:
        report.add("mcp", f"{server_name}.url", "provider credential removed", None)
    url = provider_redacted_url
    parsed = urllib.parse.urlsplit(url)
    changed = False
    hostname = parsed.hostname or ""
    netloc = hostname
    if parsed.port is not None:
        netloc += f":{parsed.port}"
    if parsed.username is not None or parsed.password is not None:
        netloc = f"${{MCP_USER}}:${{MCP_PASSWORD}}@{netloc}"
        changed = True
    query_items = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    safe_query: list[tuple[str, str]] = []
    for name, value in query_items:
        safe_value, redacted = _safe_secret_value(name, value)
        safe_query.append((name, safe_value))
        changed = changed or redacted
    if changed:
        report.add("mcp", f"{server_name}.url", "literal URL credential removed", None)
    return urllib.parse.urlunsplit(
        (parsed.scheme, netloc or parsed.netloc, parsed.path, urllib.parse.urlencode(safe_query), parsed.fragment)
    )


def emit_mcp_document(
    servers: list[MCPServerIR],
    target_format: str,
    existing_text: str | None = None,
) -> tuple[str, LossReport]:
    adapter = mcp_adapter(target_format)
    if not adapter["automatic"]:
        raise ValueError(str(adapter["reason"]))
    family, separator, container = target_format.partition(":")
    key = container if separator and family in {"json", "jsonc"} else "mcpServers"
    existing: dict[str, Any] = {}
    if existing_text:
        existing = _decode_mcp_document(existing_text, target_format)
        if any(key_name in existing for key_name in ("mcpServers", "servers", "mcp")):
            _server_container(existing, target_format)
    output_servers: dict[str, Any] = {}
    report = LossReport()
    for server in servers:
        if server.transport != "stdio":
            raise ValueError(
                "remote MCP conversion requires a dedicated target-profile transport adapter"
            )
        item: dict[str, Any] = {}
        for field_name in sorted(server.extra_fields):
            report.add(
                "mcp",
                f"{server.name}.{field_name}",
                "source-only MCP field not migrated",
                None,
            )
        if server.command is not None:
            if (
                PROVIDER_SECRET.search(server.command)
                or URL_CREDENTIAL.search(server.command)
                or BEARER_LITERAL.search(server.command)
            ):
                raise ValueError(f"MCP server {server.name}: command contains a credential")
            item["command"] = server.command
        if server.args:
            item["args"] = _safe_args(server.args, server.name, report)
        if server.url is not None:
            item["url"] = _safe_url(server.url, server.name, report)
        if server.env:
            env: dict[str, str] = {}
            for name, value in server.env.items():
                env[name], redacted = _safe_secret_value(name, value)
                if redacted:
                    report.add("mcp", f"{server.name}.env.{name}", "literal secret removed", None)
            item["env"] = env
        if server.headers:
            headers: dict[str, str] = {}
            for name, value in server.headers.items():
                headers[name], redacted = _safe_secret_value(name, value)
                if redacted:
                    report.add(
                        "mcp", f"{server.name}.headers.{name}", "literal secret removed", None
                    )
            item["headers"] = headers
        output_servers[server.name] = item
    existing[key] = output_servers
    return json.dumps(existing, indent=2, sort_keys=True) + "\n", report


def emit_prompt(prompt: PromptIR, target_format: str) -> tuple[str, LossReport]:
    """Emit a prompt to the target format."""
    report = LossReport()
    handler = _PROMPT_EMITTERS.get(target_format)
    if handler:
        return handler(prompt, report)
    # Fallback to plain-prompt
    if target_format == "plain-prompt":
        body = prompt.body
        if prompt.arguments:
            arg_lines = "\n".join(f"${arg['name']}: {arg.get('description', '')}" for arg in prompt.arguments)
            body = f"{arg_lines}\n\n{body}"
        return body, report
    raise ValueError(f"unsupported prompt target format: {target_format}")


def _emit_prompt_plain(prompt: PromptIR, report: LossReport) -> tuple[str, LossReport]:
    body = prompt.body
    if prompt.arguments:
        arg_lines = "\n".join(f"${arg['name']}: {arg.get('description', '')}" for arg in prompt.arguments)
        body = f"{arg_lines}\n\n{body}"
    return body, report


def _emit_prompt_qwen(prompt: PromptIR, report: LossReport) -> tuple[str, LossReport]:
    """Emit Qwen command format (qwen-command)."""
    # Qwen commands are shell scripts with frontmatter
    parts = []
    if prompt.arguments:
        parts.append("# Arguments:")
        for arg in prompt.arguments:
            parts.append(f"# {arg['name']}: {arg.get('description', '')}")
    parts.append(prompt.body)
    return "\n\n".join(parts), report


# Prompt emitter registry
_PROMPT_EMITTERS: dict[str, Callable[[PromptIR, LossReport], tuple[str, LossReport]]] = {
    "plain-prompt": _emit_prompt_plain,
    "qwen-command": _emit_prompt_qwen,
    "qwen-prompt": _emit_prompt_qwen,
    "zencoder-prompt": _emit_prompt_plain,
    "zenflow-prompt": _emit_prompt_plain,
    "factory-command": _emit_prompt_plain,
    "gemini-prompt": _emit_prompt_plain,
    "gemini-prompt-library": _emit_prompt_plain,
    "warp-prompt": _emit_prompt_plain,
    "qwen-prompt": _emit_prompt_qwen,
    "claude-prompt": _emit_prompt_plain,
    "cursor-prompt": _emit_prompt_plain,
    "amazon-q-prompt": _emit_prompt_plain,
    "factory-prompt": _emit_prompt_plain,
    "zencoder-prompt": _emit_prompt_plain,
    "zenflow-prompt": _emit_prompt_plain,
    "letta-prompt": _emit_prompt_plain,
    "qoder-prompt": _emit_prompt_plain,
    "gemini-code-assist-prompt": _emit_prompt_plain,
    "qwen-prompt-library": _emit_prompt_plain,
}


def _emit_command_plain(cmd: CommandIR, report: LossReport) -> tuple[str, LossReport]:
    lines = []
    if cmd.invocation:
        lines.append(f"# {cmd.invocation}")
    if cmd.description:
        lines.append(f"# {cmd.description}")
    if cmd.shell_block:
        lines.append(cmd.shell_block)
    for block in cmd.tool_blocks:
        lines.append(f"# tool: {block.get('name', '')}")
        lines.append(block.get("input", ""))
    return "\n\n".join(lines), report


def _emit_command_qwen(cmd: CommandIR, report: LossReport) -> tuple[str, LossReport]:
    # Qwen commands are shell scripts
    lines = []
    if cmd.invocation:
        lines.append(f"# {cmd.invocation}")
    if cmd.description:
        lines.append(f"# {cmd.description}")
    if cmd.shell_block:
        lines.append(cmd.shell_block)
    for block in cmd.tool_blocks:
        lines.append(f"# tool: {block.get('name', '')}")
        lines.append(block.get("input", ""))
    return "\n\n".join(lines), report


def _emit_command_factory(cmd: CommandIR, report: LossReport) -> tuple[str, LossReport]:
    # Factory commands are shell scripts
    lines = []
    if cmd.invocation:
        lines.append(f"# {cmd.invocation}")
    if cmd.description:
        lines.append(f"# {cmd.description}")
    if cmd.shell_block:
        lines.append(cmd.shell_block)
    for block in cmd.tool_blocks:
        lines.append(f"# tool: {block.get('name', '')}")
        lines.append(block.get("input", ""))
    return "\n\n".join(lines), report


def _emit_command_zencoder(cmd: CommandIR, report: LossReport) -> tuple[str, LossReport]:
    return _emit_command_plain(cmd, report)


def _emit_command_warp(cmd: CommandIR, report: LossReport) -> tuple[str, LossReport]:
    return _emit_command_plain(cmd, report)


# Command emitter registry
_COMMAND_EMITTERS: dict[str, Callable[[CommandIR, LossReport], tuple[str, LossReport]]] = {
    "plain-command": _emit_command_plain,
    "qwen-command": _emit_command_qwen,
    "factory-command": _emit_command_factory,
    "zencoder-command": _emit_command_zencoder,
    "warp-command": _emit_command_warp,
}


def emit_command(cmd: CommandIR, target_format: str) -> tuple[str, LossReport]:
    handler = _COMMAND_EMITTERS.get(target_format)
    if handler:
        return handler(cmd, LossReport())
    if target_format == "plain-command":
        return _emit_command_plain(cmd, LossReport())
    raise ValueError(f"unsupported command target format: {target_format}")


def _emit_agent_plain(agent: AgentIR, report: LossReport) -> tuple[str, LossReport]:
    lines = [
        f"name: {agent.name}",
        f"description: {agent.description}",
        f"system_prompt: {agent.system_prompt}",
        f"model: {agent.model}",
    ]
    if agent.tools:
        lines.append("tools: " + ", ".join(agent.tools))
    if agent.subagents:
        lines.append("subagents: " + ", ".join(agent.subagents))
    if agent.handoffs:
        lines.append("handoffs: " + " -> ".join(agent.handoffs))
    if agent.hooks:
        lines.append("hooks: " + str(agent.hooks))
    if agent.isolation:
        lines.append(f"isolation: {agent.isolation}")
    if agent.worktree:
        lines.append("worktree: true")
    if agent.memory_policy:
        lines.append(f"memory_policy: {agent.memory_policy}")
    if agent.mcp:
        lines.append("mcp: " + ", ".join(agent.mcp))
    if agent.display_metadata:
        lines.append(f"display: {agent.display_metadata}")
    return "\n".join(lines), report


# Agent emitter registry
_AGENT_EMITTERS: dict[str, Callable[[AgentIR, LossReport], tuple[str, LossReport]]] = {
    "plain-agent": _emit_agent_plain,
    "qwen-agent": _emit_agent_plain,
    "zencoder-agent": _emit_agent_plain,
    "zenflow-agent": _emit_agent_plain,
    "factory-droid": _emit_agent_plain,
    "gemini-agent": _emit_agent_plain,
    "warp-agent": _emit_agent_plain,
    "letta-agent": _emit_agent_plain,
    "qoder-agent": _emit_agent_plain,
    "gemini-code-assist-agent": _emit_agent_plain,
    "amazon-q-agent": _emit_agent_plain,
    "cursor-agent": _emit_agent_plain,
    "factory-agent": _emit_agent_plain,
}


def emit_agent(agent: AgentIR, target_format: str) -> tuple[str, LossReport]:
    handler = _AGENT_EMITTERS.get(target_format)
    if handler:
        return handler(agent, LossReport())
    if target_format == "plain-agent":
        return _emit_agent_plain(agent, LossReport())
    raise ValueError(f"unsupported agent target format: {target_format}")


def _emit_hook_plain(hook: HookIR, report: LossReport) -> tuple[str, LossReport]:
    lines = [
        f"event: {hook.event}",
        f"matcher: {hook.matcher}",
        f"command: {hook.command}",
    ]
    if hook.cwd:
        lines.append(f"cwd: {hook.cwd}")
    if hook.env:
        lines.append("env: " + str(hook.env))
    if hook.stdin_schema:
        lines.append(f"stdin_schema: {hook.stdin_schema}")
    if hook.stdout_schema:
        lines.append(f"stdout_schema: {hook.stdout_schema}")
    if hook.blocking is not None:
        lines.append(f"blocking: {hook.blocking}")
    if hook.exit_code is not None:
        lines.append(f"exit_code: {hook.exit_code}")
    if hook.timeout_seconds is not None:
        lines.append(f"timeout: {hook.timeout_seconds}")
    if hook.async_run:
        lines.append("async: true")
    if hook.os_overrides:
        for os_name, override in hook.os_overrides.items():
            lines.append(f"os:{os_name}: {override}")
    if hook.target_script_references:
        lines.append("scripts: " + ", ".join(hook.target_script_references))
    return "\n".join(lines), report


def _emit_hook_qwen(hook: HookIR, report: LossReport) -> tuple[str, LossReport]:
    return _emit_hook_plain(hook, report)


def _emit_hook_cline(hook: HookIR, report: LossReport) -> tuple[str, LossReport]:
    # Cline hooks are JSON with specific structure
    hook_dict = {
        "event": hook.event,
        "matcher": hook.matcher,
        "command": hook.command,
        "enabled": False,  # Always disabled per safety policy
    }
    if hook.cwd:
        hook_dict["cwd"] = hook.cwd
    if hook.env:
        hook_dict["env"] = hook.env
    if hook.stdin_schema:
        hook_dict["stdin_schema"] = hook.stdin_schema
    if hook.stdout_schema:
        hook_dict["stdout_schema"] = hook.stdout_schema
    if hook.blocking is not None:
        hook_dict["blocking"] = hook.blocking
    if hook.exit_code is not None:
        hook_dict["exit_code"] = hook.exit_code
    if hook.timeout_seconds is not None:
        hook_dict["timeout"] = hook.timeout_seconds
    if hook.async_run:
        hook_dict["async"] = hook.async_run
    if hook.os_overrides:
        hook_dict["os_overrides"] = hook.os_overrides
    if hook.target_script_references:
        hook_dict["target_script_references"] = hook.target_script_references
    return json.dumps(hook_dict, indent=2, sort_keys=True) + "\n", report


def _emit_hook_factory(hook: HookIR, report: LossReport) -> tuple[str, LossReport]:
    return _emit_hook_plain(hook, report)


# Hook emitter registry
_HOOK_EMITTERS: dict[str, Callable[[HookIR, LossReport], tuple[str, LossReport]]] = {
    "plain-hook": _emit_hook_plain,
    "qwen-hook": _emit_hook_qwen,
    "cline-hook": _emit_hook_cline,
    "factory-hooks": _emit_hook_factory,
    "zencoder-hook": _emit_hook_plain,
    "zenflow-hook": _emit_hook_plain,
    "factory-hook": _emit_hook_plain,
    "warp-hook": _emit_hook_plain,
    "gemini-hook": _emit_hook_plain,
    "letta-hook": _emit_hook_plain,
    "qoder-hook": _emit_hook_plain,
    "gemini-code-assist-hook": _emit_hook_plain,
    "amazon-q-hook": _emit_hook_plain,
    "cursor-hook": _emit_hook_plain,
    "factory-hooks": _emit_hook_plain,
}


def emit_hook(hook: HookIR, target_format: str) -> tuple[str, LossReport]:
    handler = _HOOK_EMITTERS.get(target_format)
    if handler:
        return handler(hook, LossReport())
    if target_format == "plain-hook":
        return _emit_hook_plain(hook, LossReport())
    raise ValueError(f"unsupported hook target format: {target_format}")


def scope_matches(surface_scope: str, requested_scope: str) -> bool:
    """Match a surface's scope against a requested scope expression.

    ``requested_scope`` may be a single scope (``"user"``, ``"project"``,
    ``"local"``, ``"all"``) or a comma-separated union
    (``"user,project"``).  The match is the union of the per-scope
    checks; a surface matches if ANY requested scope matches it.
    """
    scope_parts = set(surface_scope.split("+"))
    if requested_scope == "all":
        return "runtime" not in scope_parts
    requested_parts = requested_scope.split(",")
    for part in requested_parts:
        part = part.strip()
        if not part:
            continue
        if part == "user" and "user" in scope_parts:
            return True
        if part == "project" and bool(
            scope_parts & {"project", "workspace", "repository"}
        ):
            return True
        if part == "local" and "local" in scope_parts:
            return True
        if part in scope_parts:
            return True
    return False


def adapt_plugin_package(
    source_path: Path,
    target_format: str,
) -> tuple[str, LossReport]:
    """Adapt a plugin package from source format to target format.

    Currently supports:
    - factory-plugin: preserves .factory-plugin/ structure with commands/,
      skills/, droids/, hooks/, mcp.json
    - copilot-plugin: VS Code extension package format
    - claude-plugin: Claude Code plugin format

    Returns rendered manifest/content and loss report.
    """
    report = LossReport()
    if target_format == "factory-plugin":
        # Preserve the entire .factory-plugin/ directory structure
        # Copy the entire .factory-plugin/ directory to target
        source_plugin_dir = (source_path / ".factory-plugin").resolve()
        if not source_plugin_dir.exists() or not source_plugin_dir.is_dir():
            report.add("plugin", ".factory-plugin", "missing .factory-plugin/ directory", None)
            return "", report

        ensure_no_symlinks(source_plugin_dir)
        files = []
        for f in sorted(source_plugin_dir.rglob("*")):
            if f.is_file() and not f.is_symlink():
                rel = f.relative_to(source_plugin_dir)
                if ".." not in str(rel) and not str(rel).startswith("/"):
                    files.append(str(rel))

        manifest = {
            "plugin_package": ".factory-plugin",
            "files": sorted(files),
            "preserved": True
        }
        return json.dumps(manifest, indent=2), report
    if target_format == "preserve-package":
        resolved_source = source_path.resolve()
        ensure_no_symlinks(resolved_source)
        files = []
        for f in sorted(resolved_source.rglob("*")):
            if f.is_file() and not f.is_symlink():
                rel = f.relative_to(resolved_source)
                if ".." not in str(rel) and not str(rel).startswith("/"):
                    files.append(str(rel))
        return json.dumps({"files": sorted(files)}, indent=2), report
    raise ValueError(f"unsupported plugin target format: {target_format}")


def serialize_portable_handoff(
    raw_data: Any,
    workspace: Path | None = None,
) -> dict[str, Any]:
    """Serialize ONLY strictly allowed portable handoff fields.

    Any un-whitelisted fields (history, conversation, events, tool_calls,
    oauth_state, tokens, cwd, git_root, approval_state, session_state,
    environment, machine paths, raw logs) are completely discarded (audit P0-4).
    """
    summary = ""
    selected_files: list[str] = []
    patch: str | None = None

    if isinstance(raw_data, dict):
        raw_summary = raw_data.get("reviewed_summary") or raw_data.get("summary") or ""
        if isinstance(raw_summary, str):
            summary = raw_summary.strip()
        raw_files = raw_data.get("selected_files")
        if isinstance(raw_files, list):
            for f in raw_files:
                if isinstance(f, str) and not f.startswith("/") and ".." not in f:
                    selected_files.append(f)
        raw_patch = raw_data.get("patch")
        if isinstance(raw_patch, str):
            patch = raw_patch

    git_branch: str | None = None
    if workspace is not None:
        git_info = git_provenance(workspace)
        if git_info and git_info.get("branch"):
            git_branch = str(git_info["branch"])

    return {
        "reviewed_summary": summary or "Reviewed handoff snapshot",
        "git_branch": git_branch,
        "selected_files": sorted(set(selected_files)),
        "patch": patch,
    }


def choose_surface(
    surfaces: list[SurfacePath],
    scope: str,
    *,
    source: bool = False,
) -> SurfacePath | None:
    matching = [surface for surface in surfaces if scope_matches(surface.scope, scope)]
    if not matching:
        return None
    if not source:
        return next(
            (surface for surface in matching if surface.location_role == "canonical"),
            matching[0],
        )
    existing = [surface for surface in matching if surface.resolved_path.exists()]
    if len(existing) > 1:
        # A genuine conflict only occurs when the duplicates share a SCOPE
        # (e.g. two ``user`` surfaces). Distinct scopes (``user`` vs
        # ``project``) are legitimate separate sources and must not abort a
        # multi-scope restore (audit #3); the caller plans them per scope.
        distinct_scopes = {surface.scope for surface in existing}
        if len(distinct_scopes) == 1:
            paths = ", ".join(str(surface.resolved_path) for surface in existing)
            if all(
                surface.location_role == "precedence" for surface in existing[1:]
            ):
                raise ValueError(
                    "multiple precedence instruction surfaces require manual reconstruction: "
                    + paths
                )
            raise ValueError(
                "source alias conflict requires explicit selection: " + paths
            )
        # Different scopes: return the first existing source for a single
        # per-object-type selection; multi-scope plans expand per scope.
        return existing[0]
    if existing:
        return existing[0]
    return next(
        (surface for surface in matching if surface.location_role == "canonical"),
        matching[0],
    )


def _skill_sources(surface: SurfacePath) -> list[Path]:
    source = surface.resolved_path
    if not source.is_dir():
        return []
    if (source / "SKILL.md").is_file():
        return [source]
    return sorted(
        child
        for child in source.iterdir()
        if child.is_dir() and (child / "SKILL.md").is_file()
    )


def _skill_environment_files(skill_dir: Path) -> list[Path]:
    return sorted(path for path in skill_dir.rglob(".env*") if path.is_file())


def _ignore_skill_environment_files(_directory: str, names: list[str]) -> list[str]:
    return [name for name in names if name.startswith(".env")]


def preflight_skill_source(skill_dir: Path) -> None:
    """Fail closed before copying a Skill that may contain literal credentials."""
    skill_document = skill_dir / "SKILL.md"
    try:
        text = skill_document.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        raise ValueError(f"cannot read Skill metadata for {skill_dir.name}: {error}") from error
    match = FRONTMATTER.match(text)
    if not match:
        raise ValueError(f"invalid Skill metadata for {skill_dir.name}: missing frontmatter")
    metadata: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line or line.startswith((" ", "\t")) or ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = parse_scalar(value)
    name = metadata.get("name", "")
    description = metadata.get("description", "")
    if not SKILL_NAME.fullmatch(name) or len(name) > 64:
        raise ValueError(f"invalid Skill metadata for {skill_dir.name}: invalid name")
    if not description or len(description) > 1024:
        raise ValueError(
            f"invalid Skill metadata for {skill_dir.name}: invalid description"
        )
    try:
        findings = scan_skill_source_tree(skill_dir)
    except RuntimeError as error:
        raise ValueError(
            f"source credential preflight unavailable for {skill_dir.name}: {error}"
        ) from error
    if not findings:
        return
    details = "; ".join(f"{path}: {reason}" for path, reason in findings)
    raise ValueError(
        f"source credential preflight failed for {skill_dir.name}: {details}"
    )


def preflight_plan_skill_sources(plan: list[PlanItem]) -> None:
    """Rescan every planned Skill before apply creates backups or target paths."""
    for item in plan:
        if item.object_type != "skills" or item.status != "ready":
            continue
        assert item.source is not None
        ensure_no_symlink_components(
            item.source.resolved_path,
            item.source.boundary,
        )
        ensure_no_symlinks(item.source.resolved_path)
        skill_dirs = _skill_sources(item.source)
        if not skill_dirs:
            raise ValueError(
                f"source contains no Skill directories: {item.source.resolved_path}"
            )
        for skill_dir in skill_dirs:
            preflight_skill_source(skill_dir)


def preflight_plugin_source(plugin_dir: Path) -> None:
    """Fail closed before copying a plugin package that may contain literal credentials or sensitive files."""
    ensure_no_symlinks(plugin_dir)
    findings = scan_skill_source_tree(plugin_dir)
    if findings:
        details = "; ".join(f"{path}: {reason}" for path, reason in findings)
        raise ValueError(
            f"plugin package credential preflight failed for {plugin_dir.name}: {details}"
        )


def preflight_instruction_source(path: Path) -> None:
    try:
        data = path.read_bytes()
    except OSError as error:
        raise ValueError(f"cannot inspect instruction source {path}: {error}") from error
    reason = finding_reason(data)
    if reason:
        raise ValueError(
            f"instruction credential preflight failed for {path}: {reason}"
        )


def rebuild_actions(
    target_selector: str,
    object_type: str,
    target_profile: dict[str, Any],
) -> list[str]:
    sources = target_profile.get("sources", [])
    actions = [
        f"Inventory the reviewed {object_type} content without credentials or generated state.",
        f"Open the official {target_selector} API or UI and recreate only that reviewed content.",
        "Bind secrets through the target secret manager or environment after reconstruction.",
        "Verify native discovery, scope, precedence, and enablement in the target product.",
    ]
    if sources:
        actions.insert(0, f"Review current target documentation: {sources[0]}")
    return actions


def _build_plan_for_scope(
    registry: Registry,
    source_selector: str,
    target_selector: str,
    object_types: list[str],
    scope: str,
    target_registry: Registry | None = None,
) -> tuple[list[PlanItem], LossReport]:
    target_reg = target_registry if target_registry is not None else registry
    _, _, source_profile = registry.profile(source_selector)
    _, _, target_profile = target_reg.profile(target_selector)
    source_policy = source_profile.get("migration_policy", "manual-rebuild")
    target_policy = target_profile.get("migration_policy", "manual-rebuild")
    source_automatic = source_policy in AUTOMATIC_MIGRATION_POLICIES | {"source-only"}
    target_automatic = target_policy in AUTOMATIC_MIGRATION_POLICIES
    items: list[PlanItem] = []
    losses = LossReport()
    for object_type in object_types:
        source_error: ValueError | None = None
        try:
            source = choose_surface(
                registry.surfaces(source_selector, object_type),
                scope,
                source=True,
            )
        except ValueError as error:
            source = None
            source_error = error
        target = choose_surface(
            target_reg.surfaces(target_selector, object_type), scope
        )
        if source_error is not None:
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    str(source_error),
                    target=target,
                    manual_actions=rebuild_actions(
                        target_selector, object_type, target_profile
                    ),
                )
            )
            continue
        if target_policy == "official-api-or-rebuild-checklist":
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    "target is cloud/UI-managed and requires reviewed reconstruction",
                    source=source,
                    target=target,
                    manual_actions=rebuild_actions(
                        target_selector, object_type, target_profile
                    ),
                )
            )
            continue
        if target_policy == "configure-consuming-client":
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    "target is a provider; configure it in the consuming client",
                    source=source,
                    target=target,
                    manual_actions=rebuild_actions(
                        target_selector, object_type, target_profile
                    ),
                )
            )
            continue
        if target_policy in {"manual-rebuild", "alias-only"}:
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    f"target profile policy is {target_policy}",
                    source=source,
                    target=target,
                    manual_actions=rebuild_actions(
                        target_selector, object_type, target_profile
                    ),
                )
            )
            continue
        if target_policy == "source-only":
            items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    "target profile is source-only",
                    source=source,
                    target=target,
                )
            )
            continue
        if not target_automatic:
            items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    f"unknown target migration policy: {target_policy}",
                    source=source,
                    target=target,
                )
            )
            continue
        if not source_automatic:
            items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    f"source profile policy is {source_policy}",
                    source=source,
                    target=target,
                )
            )
            continue
        if source is None:
            items.append(PlanItem(object_type, "invalid", "source surface is not mapped"))
            continue
        if target is None:
            items.append(
                PlanItem(object_type, "manual-rebuild", "target surface is not mapped", source=source)
            )
            continue
        try:
            ensure_no_symlink_components(source.resolved_path, source.boundary)
            ensure_no_symlink_components(target.resolved_path, target.boundary)
            if source.resolved_path.exists():
                ensure_no_symlinks(source.resolved_path)
        except ValueError as error:
            items.append(
                PlanItem(object_type, "invalid", str(error), source, target)
            )
            continue
        if not source.resolved_path.exists():
            items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    f"source path does not exist: {source.resolved_path}",
                    source,
                    target,
                )
            )
            continue
        is_opt_in_surface = (
            (object_type == "plugins" and source.policy == "preserve-package" and target.policy == "preserve-package")
            or (object_type == "handoff" and source.policy in {"session-summary-handoff", "preserve-package"} and target.policy in {"session-summary-handoff", "preserve-package"})
        )
        if source.policy not in SOURCE_AUTOMATIC_SURFACE_POLICIES and not is_opt_in_surface:
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    f"source surface policy is {source.policy}",
                    source,
                    target,
                    rebuild_actions(target_selector, object_type, target_profile),
                )
            )
            continue
        if target.policy in {"source-only", "forbidden-regenerate"}:
            items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    f"target surface policy is {target.policy}",
                    source,
                    target,
                )
            )
            continue
        if target.policy in {
            "manual-rebuild",
            "manual-template",
            "disabled-draft-only",
            "official-api-or-rebuild-checklist",
        } and not is_opt_in_surface:
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    f"target surface policy is {target.policy}",
                    source,
                    target,
                    rebuild_actions(target_selector, object_type, target_profile),
                )
            )
            continue
        if object_type == "skills":
            skill_dirs = _skill_sources(source)
            if not skill_dirs:
                items.append(
                    PlanItem(
                        object_type,
                        "invalid",
                        "source contains no Skill directories",
                        source,
                        target,
                    )
                )
                continue
            try:
                for skill_dir in skill_dirs:
                    preflight_skill_source(skill_dir)
                    for env_path in _skill_environment_files(skill_dir):
                        losses.add(
                            "skills",
                            f"{skill_dir.name}/{env_path.relative_to(skill_dir)}",
                            "environment file excluded from Skill copy",
                            None,
                        )
            except ValueError as error:
                items.append(
                    PlanItem(object_type, "invalid", str(error), source, target)
                )
                continue
        if object_type == "instructions":
            missing_adapters = sorted(
                {
                    source.source_format,
                    target.source_format,
                }
                - set(FORMAT_FEATURES)
            )
            if missing_adapters:
                items.append(
                    PlanItem(
                        object_type,
                        "manual-rebuild",
                        "instruction formats require dedicated adapters: "
                        + ", ".join(missing_adapters),
                        source,
                        target,
                        rebuild_actions(target_selector, object_type, target_profile),
                    )
                )
                continue
            instruction_paths = _instruction_sources(source)
            if not instruction_paths:
                items.append(
                    PlanItem(
                        object_type,
                        "invalid",
                        "source contains no instruction files",
                        source,
                        target,
                    )
                )
                continue
            try:
                for instruction_path in instruction_paths:
                    preflight_instruction_source(instruction_path)
                    instruction = parse_instruction(
                        instruction_path.read_text(encoding="utf-8"),
                        source.source_format,
                        source.scope,
                        source.storage,
                    )
                    _, report = emit_instruction(instruction, target.source_format)
                    losses.items.extend(report.items)
            except (OSError, UnicodeError, ValueError) as error:
                items.append(
                    PlanItem(
                        object_type,
                        (
                            "invalid"
                            if "credential preflight failed" in str(error)
                            else "manual-rebuild"
                        ),
                        f"instruction adapter validation failed: {error}",
                        source,
                        target,
                        (
                            []
                            if "credential preflight failed" in str(error)
                            else rebuild_actions(
                                target_selector, object_type, target_profile
                            )
                        ),
                    )
                )
                continue
        if object_type == "mcp" and (
            not mcp_adapter(source.source_format)["automatic"]
            or not mcp_adapter(target.source_format)["automatic"]
        ):
            source_adapter = mcp_adapter(source.source_format)
            target_adapter = mcp_adapter(target.source_format)
            items.append(
                PlanItem(
                    object_type,
                    "manual-rebuild",
                    (
                        f"MCP adapters require review: source={source_adapter['name']} "
                        f"target={target_adapter['name']}"
                    ),
                    source,
                    target,
                    [
                        str(source_adapter.get("reason", "review source adapter")),
                        str(target_adapter.get("reason", "review target adapter")),
                        "Generate a credential-free target snippet and validate it with the native product.",
                    ],
                )
            )
            continue
        if object_type == "mcp":
            if not source.resolved_path.is_file():
                items.append(
                    PlanItem(object_type, "invalid", "MCP source must be a file", source, target)
                )
                continue
            try:
                servers = parse_mcp_document(
                    source.resolved_path.read_text(encoding="utf-8"),
                    source.source_format,
                )
                if any(server.transport != "stdio" for server in servers):
                    items.append(
                        PlanItem(
                            object_type,
                            "manual-rebuild",
                            "remote MCP requires a dedicated target-profile transport adapter",
                            source,
                            target,
                            rebuild_actions(
                                target_selector, object_type, target_profile
                            ),
                        )
                    )
                    continue
                existing = (
                    target.resolved_path.read_text(encoding="utf-8")
                    if target.resolved_path.is_file()
                    else None
                )
                _, report = emit_mcp_document(servers, target.source_format, existing)
                losses.items.extend(report.items)
            except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as error:
                items.append(
                    PlanItem(
                        object_type,
                        "invalid",
                        f"MCP validation failed: {error}",
                        source,
                        target,
                    )
                )
                continue
        items.append(PlanItem(object_type, "ready", "review before apply", source, target))
    return items, losses


def build_plan(
    registry: Registry,
    source_selector: str,
    target_selector: str,
    object_types: list[str],
    scope: str,
    target_registry: Registry | None = None,
) -> tuple[list[PlanItem], LossReport]:
    target_reg = target_registry if target_registry is not None else registry
    # Audit #3: a comma-separated union (e.g. "user,project") must plan every
    # requested scope, not collapse them into a single per-object-type item.
    # Reuse the same per-scope expansion already used by "all".
    if scope != "all" and "," not in scope:
        return _build_plan_for_scope(
            registry,
            source_selector,
            target_selector,
            object_types,
            scope,
            target_registry=target_reg,
        )
    requested_scopes = (
        tuple(s.strip() for s in scope.split(",") if s.strip())
        if scope != "all"
        else ("user", "project", "local")
    )
    combined_items: list[PlanItem] = []
    combined_losses = LossReport()
    seen_items: set[str] = set()
    seen_losses: set[str] = set()
    for requested_scope in requested_scopes:
        scoped_items, scoped_losses = _build_plan_for_scope(
            registry,
            source_selector,
            target_selector,
            object_types,
            requested_scope,
            target_registry=target_reg,
        )
        for item in scoped_items:
            if item.source is None and item.target is None:
                continue
            if item.status != "ready":
                item.reason = f"{requested_scope}: {item.reason}"
            key = canonical_json(item.to_dict())
            if key not in seen_items:
                seen_items.add(key)
                combined_items.append(item)
        for loss in scoped_losses.items:
            key = canonical_json(asdict(loss))
            if key not in seen_losses:
                seen_losses.add(key)
                combined_losses.items.append(loss)
    planned_objects = {item.object_type for item in combined_items}
    for object_type in object_types:
        if object_type not in planned_objects:
            combined_items.append(
                PlanItem(
                    object_type,
                    "invalid",
                    "no matching source or target surface in requested scope(s)",
                )
            )
    return combined_items, combined_losses


def hash_path(path: Path) -> str:
    digest = hashlib.sha256()
    if path.is_file():
        digest.update(path.read_bytes())
        return digest.hexdigest()
    if path.is_dir():
        for child in sorted(path.rglob("*")):
            if child.is_symlink():
                raise ValueError(f"symbolic links are not allowed: {child}")
            if child.is_file():
                digest.update(str(child.relative_to(path)).encode("utf-8"))
                digest.update(b"\0")
                digest.update(child.read_bytes())
        return digest.hexdigest()
    raise ValueError(f"cannot hash missing path: {path}")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def json_sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def path_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"exists": False, "kind": None, "sha256": None}
    ensure_no_symlinks(path)
    return {
        "exists": True,
        "kind": "directory" if path.is_dir() else "file",
        "sha256": hash_path(path),
    }


def paths_overlap(first: Path, second: Path) -> bool:
    first_resolved = first.resolve(strict=False)
    second_resolved = second.resolve(strict=False)
    return (
        first_resolved == second_resolved
        or first_resolved in second_resolved.parents
        or second_resolved in first_resolved.parents
    )


def _git_output(workspace: Path, *arguments: str) -> str | None:
    completed = subprocess.run(
        ["git", "-C", str(workspace), *arguments],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def git_provenance(workspace: Path) -> dict[str, Any] | None:
    root = _git_output(workspace, "rev-parse", "--show-toplevel")
    head = _git_output(workspace, "rev-parse", "HEAD")
    if not root or not head:
        return None
    branch = _git_output(workspace, "branch", "--show-current")
    status = _git_output(workspace, "status", "--porcelain=v1")
    return {
        "repository_root": root,
        "head": head,
        "branch": branch or None,
        "dirty": bool(status),
    }


def _unified_diff(existing: str, rendered: str, target: Path) -> str:
    raw_diff = "".join(
        difflib.unified_diff(
            existing.splitlines(keepends=True),
            rendered.splitlines(keepends=True),
            fromfile=f"a/{target}",
            tofile=f"b/{target}",
            n=1,
        )
    )
    safe_lines: list[str] = []
    for line in raw_diff.splitlines(keepends=True):
        if line.startswith(("+++", "---", "@@")) or not line.startswith(("+", "-")):
            safe_lines.append(line)
            continue
        if finding_reason(line[1:].encode("utf-8")):
            ending = "\n" if line.endswith("\n") else ""
            safe_lines.append(f"{line[0]}[REDACTED CREDENTIAL LINE]{ending}")
        else:
            safe_lines.append(line)
    return "".join(safe_lines)


def _preview_plan_item(item: PlanItem) -> dict[str, Any] | None:
    if item.status != "ready" or item.source is None or item.target is None:
        return None
    source = item.source
    target = item.target
    if item.object_type == "skills":
        changes = []
        for skill_dir in _skill_sources(source):
            destination = (
                target.resolved_path
                if target.resolved_path.name == skill_dir.name
                else target.resolved_path / skill_dir.name
            )
            changes.append(
                {
                    "path": str(destination),
                    "action": "replace" if destination.exists() else "create",
                    "source_sha256": hash_path(skill_dir),
                    "target_sha256": hash_path(destination) if destination.exists() else None,
                }
            )
        return {"kind": "file-list", "changes": changes}
    if item.object_type == "instructions":
        previews = []
        sources = _instruction_sources(source)
        for index, instruction_path in enumerate(sources):
            instruction = parse_instruction(
                instruction_path.read_text(encoding="utf-8"),
                source.source_format,
                source.scope,
                source.storage,
            )
            rendered, _ = emit_instruction(instruction, target.source_format)
            if _instruction_target_is_file(target):
                destination = target.resolved_path
            else:
                destination = _instruction_target_path(
                    target, instruction_path, item.object_id
                )
            existing = (
                destination.read_text(encoding="utf-8")
                if destination.is_file()
                else ""
            )
            previews.append(
                {
                    "path": str(destination),
                    "action": "replace" if destination.exists() else "create",
                    "pre_sha256": hash_path(destination) if destination.exists() else None,
                    "post_sha256": hashlib.sha256(rendered.encode("utf-8")).hexdigest(),
                    "diff": _unified_diff(existing, rendered, destination),
                }
            )
        return {"kind": "unified-diff", "changes": previews}
    if item.object_type == "mcp":
        source_text = source.resolved_path.read_text(encoding="utf-8")
        servers = parse_mcp_document(source_text, source.source_format)
        existing = (
            target.resolved_path.read_text(encoding="utf-8")
            if target.resolved_path.is_file()
            else ""
        )
        rendered, _ = emit_mcp_document(
            servers,
            target.source_format,
            existing or None,
        )
        old_servers: set[str] = set()
        if existing:
            try:
                old_servers = {
                    server.name
                    for server in parse_mcp_document(existing, target.source_format)
                }
            except ValueError:
                old_servers = set()
        new_servers = {server.name for server in servers}
        return {
            "kind": "mcp-semantic-diff",
            "changes": [
                {
                    "path": str(target.resolved_path),
                    "action": "replace" if target.resolved_path.exists() else "create",
                    "pre_sha256": (
                        hash_path(target.resolved_path)
                        if target.resolved_path.exists()
                        else None
                    ),
                    "post_sha256": hashlib.sha256(rendered.encode("utf-8")).hexdigest(),
                    "server_names_before": sorted(old_servers),
                    "server_names_after": sorted(new_servers),
                    "added": sorted(new_servers - old_servers),
                    "removed": sorted(old_servers - new_servers),
                    "credential_values_included": False,
                }
            ],
        }
    return None


def _plan_hash_payload(plan_document: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in plan_document.items() if key != "plan_sha256"}


def build_plan_document(
    registry: Registry,
    source_selector: str,
    target_selector: str,
    object_types: list[str],
    scope: str,
    target_registry: Registry | None = None,
) -> dict[str, Any]:
    target_reg = target_registry if target_registry is not None else registry
    items, losses = build_plan(
        registry,
        source_selector,
        target_selector,
        object_types,
        scope,
        target_registry=target_reg,
    )
    _, source_profile_id, source_profile = registry.profile(source_selector)
    _, target_profile_id, target_profile = target_reg.profile(target_selector)
    serialized_items: list[dict[str, Any]] = []
    for item in items:
        serialized = item.to_dict()
        serialized["source_state"] = (
            path_state(item.source.resolved_path) if item.source else None
        )
        serialized["target_state"] = (
            path_state(item.target.resolved_path) if item.target else None
        )
        serialized["review_preview"] = _preview_plan_item(item)
        serialized_items.append(serialized)
    rebuild_items = [
        {
            "object_type": item.object_type,
            "reason": item.reason,
            "actions": item.manual_actions,
        }
        for item in items
        if item.status_enum is ItemStatus.MANUAL_REBUILD
    ]
    document: dict[str, Any] = {
        "schema_version": PLAN_SCHEMA_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(target_reg.workspace),
        "source": source_selector,
        "source_profile": source_profile_id,
        "source_support_level": source_profile.get("support_level"),
        "target": target_selector,
        "target_profile": target_profile_id,
        "target_support_level": target_profile.get("support_level"),
        "scope": scope,
        "objects": object_types,
        "registry_sha256": hash_path(target_reg.path),
        "adapter_versions": ADAPTER_VERSIONS,
        "git_provenance": git_provenance(target_reg.workspace),
        "items": serialized_items,
        "loss_report": losses.to_dict(),
        "rebuild_manifest": {
            "credential_policy": "references-only; never include literal credentials",
            "items": rebuild_items,
        },
    }
    document["plan_sha256"] = json_sha256(_plan_hash_payload(document))
    return document


def load_plan_document(path: Path) -> dict[str, Any]:
    document = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("schema_version") != PLAN_SCHEMA_VERSION:
        raise ValueError("unsupported plan document")
    expected = document.get("plan_sha256")
    if not isinstance(expected, str) or expected != json_sha256(_plan_hash_payload(document)):
        raise ValueError("plan checksum mismatch")
    return document


def _normalize_surface_for_comparison(
    surface_dict: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not surface_dict:
        return None
    keys = (
        "product",
        "profile",
        "object_type",
        "scope",
        "storage",
        "path",
        "canonical_path",
        "source_format",
        "policy",
        "location_role",
        "precedence",
    )
    return {k: surface_dict.get(k) for k in keys}


def _normalize_target_for_comparison(
    target_dict: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not target_dict:
        return None
    keys = (
        "product",
        "profile",
        "object_type",
        "scope",
        "storage",
        "path",
        "canonical_path",
        "resolved_path",
        "source_format",
        "policy",
        "location_role",
        "precedence",
    )
    return {k: target_dict.get(k) for k in keys}


def _core_plan_items(serialized_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for item in serialized_items:
        result.append(
            {
                "object_type": item.get("object_type"),
                "status": item.get("status"),
                "reason": item.get("reason"),
                "source": _normalize_surface_for_comparison(item.get("source")),
                "target": _normalize_target_for_comparison(item.get("target")),
                "manual_actions": item.get("manual_actions"),
                "object_id": item.get("object_id"),
            }
        )
    return result


def validate_plan_document(
    document: dict[str, Any],
    registry: Registry,
    source_registry: Registry | None = None,
) -> tuple[list[PlanItem], LossReport]:
    src_reg = source_registry if source_registry is not None else registry
    if document.get("adapter_versions") != ADAPTER_VERSIONS:
        raise ValueError("plan adapter versions do not match this runtime")
    if document.get("registry_sha256") != hash_path(registry.path):
        raise ValueError("registry changed after plan review")
    if document.get("workspace") != str(registry.workspace):
        raise ValueError("plan workspace does not match the selected workspace")
    stored_git = document.get("git_provenance")
    current_git = git_provenance(registry.workspace)
    if stored_git is not None:
        if not isinstance(stored_git, dict):
            raise ValueError("plan Git provenance must be an object")
        if current_git is None:
            raise ValueError("Git repository is unavailable after plan review")
        for field in ("repository_root", "head"):
            if stored_git.get(field) != current_git.get(field):
                raise ValueError(f"Git {field} changed after plan review")
    object_types = document.get("objects")
    if not isinstance(object_types, list) or not all(
        isinstance(item, str) for item in object_types
    ):
        raise ValueError("plan objects must be an array of strings")
    source_sel = str(document.get("source"))
    target_sel = str(document.get("target"))
    stored_items = document.get("items")
    if not isinstance(stored_items, list) or not all(
        isinstance(item, dict) for item in stored_items
    ):
        raise ValueError("plan items must be an array")

    if source_sel in ("all-installed", "auto") or target_sel in ("all-installed", "auto"):
        items: list[PlanItem] = []
        for stored in stored_items:
            src_dict = stored.get("source")
            tgt_dict = stored.get("target")
            src_surf = (
                SurfacePath(
                    product=src_dict["product"],
                    profile=src_dict["profile"],
                    object_type=src_dict["object_type"],
                    scope=src_dict["scope"],
                    storage=src_dict["storage"],
                    path=src_dict["path"],
                    resolved_path=Path(src_dict["resolved_path"]),
                    boundary=Path(src_dict["boundary"]),
                    source_format=src_dict["source_format"],
                    policy=src_dict["policy"],
                    location_role=src_dict.get("location_role", "canonical"),
                    canonical_path=src_dict.get("canonical_path", src_dict["path"]),
                    precedence=src_dict.get("precedence", 0),
                )
                if src_dict
                else None
            )
            tgt_surf = (
                SurfacePath(
                    product=tgt_dict["product"],
                    profile=tgt_dict["profile"],
                    object_type=tgt_dict["object_type"],
                    scope=tgt_dict["scope"],
                    storage=tgt_dict["storage"],
                    path=tgt_dict["path"],
                    resolved_path=Path(tgt_dict["resolved_path"]),
                    boundary=Path(tgt_dict["boundary"]),
                    source_format=tgt_dict["source_format"],
                    policy=tgt_dict["policy"],
                    location_role=tgt_dict.get("location_role", "canonical"),
                    canonical_path=tgt_dict.get("canonical_path", tgt_dict["path"]),
                    precedence=tgt_dict.get("precedence", 0),
                )
                if tgt_dict
                else None
            )
            item = PlanItem(
                object_type=stored["object_type"],
                status=stored["status"],
                reason=stored["reason"],
                source=src_surf,
                target=tgt_surf,
                manual_actions=stored.get("manual_actions", []),
                object_id=stored.get("object_id", ""),
            )
            if item.source is not None:
                if stored.get("source_state") != path_state(item.source.resolved_path):
                    raise ValueError(
                        f"source changed after plan review: {item.source.resolved_path}"
                    )
                item.expected_source_state = stored.get("source_state")
            if item.target is not None:
                if stored.get("target_state") != path_state(item.target.resolved_path):
                    raise ValueError(
                        f"target changed after plan review: {item.target.resolved_path}"
                    )
                item.expected_target_state = stored.get("target_state")
            items.append(item)
        return items, LossReport()

    items, losses = build_plan(
        src_reg,
        source_sel,
        target_sel,
        object_types,
        str(document.get("scope")),
        target_registry=registry,
    )
    if _core_plan_items(stored_items) != _core_plan_items([item.to_dict() for item in items]):
        raise ValueError("resolved plan changed after review")
    for stored, item in zip(stored_items, items):
        if item.source is not None:
            if stored.get("source_state") != path_state(item.source.resolved_path):
                raise ValueError(
                    f"source changed after plan review: {item.source.resolved_path}"
                )
            item.expected_source_state = stored.get("source_state")
        if item.target is not None:
            if stored.get("target_state") != path_state(item.target.resolved_path):
                raise ValueError(
                    f"target changed after plan review: {item.target.resolved_path}"
                )
            item.expected_target_state = stored.get("target_state")
    return items, losses


def ensure_no_symlinks(path: Path) -> None:
    if path.is_symlink():
        raise ValueError(f"symbolic links are not allowed: {path}")
    if path.is_dir():
        for child in path.rglob("*"):
            if child.is_symlink():
                raise ValueError(f"symbolic links are not allowed: {child}")


def ensure_no_symlink_components(path: Path, boundary: Path) -> None:
    try:
        relative = path.relative_to(boundary)
    except ValueError as error:
        raise ValueError(f"path escapes its migration boundary: {path}") from error
    candidate = boundary
    if candidate.is_symlink():
        raise ValueError(f"symbolic links are not allowed: {candidate}")
    for part in relative.parts:
        candidate = candidate / part
        if candidate.is_symlink():
            raise ValueError(f"symbolic links are not allowed: {candidate}")


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def backup_path(target: Path, backup_root: Path, sequence: int) -> Path | None:
    if not target.exists():
        return None
    ensure_no_symlinks(target)
    backup = backup_root / f"{sequence:04d}-{hashlib.sha256(str(target).encode()).hexdigest()[:12]}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    if target.is_dir():
        shutil.copytree(target, backup)
    else:
        shutil.copy2(target, backup)
    return backup


def begin_change(
    changes: list[dict[str, Any]],
    target: Path,
    backup: Path | None,
    boundary: Path,
) -> dict[str, Any]:
    if target == boundary:
        raise ValueError(f"refusing to record a migration boundary as a target: {target}")
    change = {
        "path": str(target),
        "boundary": str(boundary),
        "kind": None,
        "backup": str(backup) if backup else None,
        "created": backup is None,
        "post_sha256": None,
    }
    changes.append(change)
    return change


def finish_change(change: dict[str, Any], target: Path) -> None:
    if not target.exists() or target.is_symlink():
        raise ValueError(f"migration target was not written safely: {target}")
    change["kind"] = "directory" if target.is_dir() else "file"
    change["post_sha256"] = hash_path(target)


def restore_transaction_change(change: dict[str, Any]) -> None:
    target = Path(str(change["path"]))
    boundary = Path(str(change["boundary"]))
    ensure_no_symlink_components(target, boundary)
    if target.is_symlink():
        target.unlink()
    elif target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink(missing_ok=True)
    backup_value = change.get("backup")
    if not backup_value:
        return
    backup = Path(str(backup_value))
    ensure_no_symlinks(backup)
    target.parent.mkdir(parents=True, exist_ok=True)
    if backup.is_dir():
        shutil.copytree(backup, target)
    else:
        shutil.copy2(backup, target)


def _instruction_sources(surface: SurfacePath) -> list[Path]:
    source = surface.resolved_path
    if source.is_file():
        return [source]
    if source.is_dir():
        return sorted(path for path in source.rglob("*.md*") if path.is_file())
    return []


def _instruction_target_is_file(surface: SurfacePath) -> bool:
    if surface.storage in {"file", "precedence-files", "config-subobject"}:
        return True
    return surface.resolved_path.suffix.lower() in {".md", ".mdc", ".txt"}


def _instruction_target_extension(target: SurfacePath) -> str:
    if target.source_format == "cursor-mdc":
        return ".mdc"
    return ".md"


def _instruction_target_path(
    target: SurfacePath,
    source_path: Path,
    object_id: str,
    used_targets: set[Path] | None = None,
) -> Path:
    """Pick a stable, collision-aware destination path for a directory-style
    instruction target.

    Preference order:

    1. Preserve the source basename with the target extension.
    2. On collision (filesystem or ``used_targets``), append
       ``-<object_id[:6]>`` before the extension.
    3. Last resort: ``migrated-<index>.md`` style; collision fallback is
       only reached when ``object_id`` is empty (e.g. legacy plans
       without source)."""
    suffix = _instruction_target_extension(target)
    used = used_targets or set()
    if object_id:
        primary = target.resolved_path / f"{source_path.stem}{suffix}"
        if primary not in used and not primary.exists():
            return primary
        short = object_id[:6]
        suffix_with_id = f"-{short}{suffix}"
        return target.resolved_path / f"{source_path.stem}{suffix_with_id}"
    return target.resolved_path / f"migrated-{source_path.stem}{suffix}"


def _manifest_entry(
    item: PlanItem,
    item_id: str,
    outcome: str,
    index: int,
) -> dict[str, Any]:
    """Build a manifest record for one plan item.

    ``outcome`` is the runtime disposition (``"applied"``,
    ``"applied-lossy"``, ``"lossy-skipped"``, ``"draft-written"``,
    ``"manual-rebuild"``, ``"forbidden"``, ``"conflict"``,
    ``"invalid"``, ``"blocked-by-group"``, ...).  ``index`` is the
    original plan position (used for stable ordering).
    """
    entry: dict[str, Any] = {
        "object_id": item_id,
        "plan_index": index,
        "object_type": item.object_type,
        "status": item.status,
        "outcome": outcome,
        "reason": item.reason,
        "target_group": item.target_group,
        "source": item.source.to_dict() if item.source else None,
        "target": item.target.to_dict() if item.target else None,
        "manual_actions": list(item.manual_actions),
    }
    if outcome == "draft-written":
        entry["enabled"] = False
    return entry


def _build_manifest(
    *,
    operation_id: str,
    workspace: Path,
    provenance: dict[str, Any],
    changes: list[dict[str, Any]],
    loss_report: LossReport,
    items: list[dict[str, Any]],
    blockers: set[str],
    apply_safe: bool,
    include_lossy: bool,
    strict: bool,
) -> dict[str, Any]:
    """Assemble the final manifest document (no I/O)."""
    summary: dict[str, int] = {}
    for entry in items:
        summary[entry["outcome"]] = summary.get(entry["outcome"], 0) + 1
    manifest = {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "operation_id": operation_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(workspace),
        "provenance": provenance,
        "changes": changes,
        "loss_report": loss_report.to_dict(),
        "items": items,
        "blockers": [
            {
                "target_group": group,
                "reason": "conflict or invalid item in target group",
            }
            for group in sorted(blockers)
        ],
        "summary": summary,
        "apply_safe": apply_safe,
        "include_lossy": include_lossy,
        "strict": strict,
    }
    manifest["manifest_sha256"] = json_sha256(
        {
            key: value
            for key, value in manifest.items()
            if key != "manifest_sha256"
        }
    )
    return manifest


def apply_plan(
    plan: list[PlanItem],
    workspace: Path,
    manifest_path: Path | None = None,
    provenance: dict[str, Any] | None = None,
    *,
    apply_safe: bool = True,
    include_lossy: bool = False,
    accept_loss_ids: set[str] | None = None,
    strict: bool = False,
    allow_plugin_copy: bool = False,
    allow_session_handoff: bool = False,
) -> tuple[dict[str, Any], Path]:
    """Apply a plan with the partial safe flow.

    Status dispatch:

    * ``ready``: always applied.
    * ``ready-lossy``: applied when ``include_lossy`` is set or when the
      item is named in ``accept_loss_ids``.  Otherwise recorded as
      ``lossy-skipped``.
    * ``draft-disabled``: applied (write with ``enabled=false`` recorded
      in the manifest).  Caller is responsible for explicit activation.
    * ``manual-rebuild`` / ``forbidden``: recorded only.
    * ``conflict`` / ``invalid``: block only their own ``target_group``;
      other groups proceed.

    Only object types in ``AUTO_WRITABLE_OBJECT_TYPES`` have a staging
    writer.  Hooks and other executable surfaces are never written to
    live product paths (audit SDI-4); handoff/session artifacts require
    the explicit ``allow_session_handoff=True`` opt-in, which the CLI
    exposes as ``--include-session`` (audit SDI-2).

    When ``strict`` is set, any non-``ready`` item aborts the whole plan
    (legacy behavior preserved for callers that want it).
    """
    if strict:
        blocked = [item for item in plan if item.status_enum is not ItemStatus.READY]
        if blocked:
            summary = ", ".join(
                f"{item.object_type}:{item.status}" for item in blocked
            )
            raise ValueError(f"plan contains non-applicable items: {summary}")

    accept_loss_ids = accept_loss_ids or set()
    target_groups_blocked: set[str] = set()
    for item in plan:
        status = item.status_enum
        if status in (ItemStatus.CONFLICT, ItemStatus.INVALID):
            group = item.target_group
            if group is not None:
                target_groups_blocked.add(group)

    loss_report = LossReport()
    eligible_items: list[PlanItem] = []
    deferred_items: list[PlanItem] = []
    blocked_items: list[PlanItem] = []
    manifest_items: list[dict[str, Any]] = []
    for index, item in enumerate(plan):
        status = item.status_enum
        item_id = f"{index}:{item.object_type}"
        if status is ItemStatus.READY and item.target_group in target_groups_blocked:
            blocked_items.append(item)
            manifest_items.append(
                _manifest_entry(item, item_id, "blocked-by-group", index)
            )
            continue
        if status is ItemStatus.READY:
            eligible_items.append(item)
            continue
        if status is ItemStatus.READY_LOSSY:
            if include_lossy or item_id in accept_loss_ids:
                eligible_items.append(item)
                manifest_items.append(
                    _manifest_entry(item, item_id, "applied-lossy", index)
                )
                continue
            if not apply_safe:
                blocked_items.append(item)
                manifest_items.append(
                    _manifest_entry(item, item_id, "lossy-not-accepted", index)
                )
                continue
            deferred_items.append(item)
            manifest_items.append(
                _manifest_entry(item, item_id, "lossy-skipped", index)
            )
            continue
        if status is ItemStatus.DRAFT_DISABLED:
            # Only stage for object types we know how to render.  Other
            # draft-disabled surfaces (e.g. Hooks, Agents) are recorded
            # in the manifest with their target path; the user enables
            # them out-of-band.
            if item.object_type in {"skills", "instructions", "mcp"}:
                eligible_items.append(item)
                continue
            deferred_items.append(item)
            manifest_items.append(
                _manifest_entry(item, item_id, "draft-only", index)
            )
            continue
        if status in _NON_WRITE_STATUSES:
            deferred_items.append(item)
            manifest_items.append(
                _manifest_entry(item, item_id, item.status, index)
            )
            continue
        # Unknown enum value (defensive): treat as blocked.
        blocked_items.append(item)
        manifest_items.append(
            _manifest_entry(item, item_id, f"unknown:{item.status}", index)
        )

    if not eligible_items:
        # Emit an informational manifest so callers (e.g. the migrate
        # pipeline) always get a stable artifact path; record every
        # item as deferred without staging any writes.
        operation_id = (
            datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            + f"-{os.getpid()}-{uuid.uuid4().hex[:10]}"
        )
        workspace_resolved = workspace.resolve()
        state_root = workspace_resolved / ".agent-context-migration"
        ensure_no_symlink_components(state_root, workspace_resolved)
        manifest_path_resolved = (
            manifest_path.resolve(strict=False)
            if manifest_path is not None
            else state_root / "manifests" / f"{operation_id}.json"
        )
        manifest = _build_manifest(
            operation_id=operation_id,
            workspace=workspace_resolved,
            provenance=provenance or {},
            changes=[],
            loss_report=loss_report,
            items=manifest_items,
            blockers=target_groups_blocked,
            apply_safe=apply_safe,
            include_lossy=include_lossy,
            strict=strict,
        )
        atomic_write(
            manifest_path_resolved,
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        )
        return manifest, manifest_path_resolved

    preflight_plan_skill_sources(eligible_items)
    workspace = workspace.resolve()
    operation_id = (
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        + f"-{os.getpid()}-{uuid.uuid4().hex[:10]}"
    )
    state_root = workspace / ".agent-context-migration"
    ensure_no_symlink_components(state_root, workspace)
    backup_root = state_root / "backups" / operation_id
    manifest_path = (
        manifest_path.resolve(strict=False)
        if manifest_path is not None
        else state_root / "manifests" / f"{operation_id}.json"
    )
    if manifest_path.exists() or manifest_path.is_symlink():
        raise ValueError(f"manifest path already exists: {manifest_path}")
    changes: list[dict[str, Any]] = []
    operations: list[dict[str, Any]] = []
    used_targets: set[Path] = set()
    with tempfile.TemporaryDirectory(prefix="agent-context-migration-stage.") as stage_name:
        stage_root = Path(stage_name)
        for item in eligible_items:
            assert item.source is not None and item.target is not None
            source = item.source
            target = item.target
            ensure_no_symlink_components(source.resolved_path, source.boundary)
            ensure_no_symlink_components(target.resolved_path, target.boundary)
            ensure_no_symlinks(source.resolved_path)
            if not source.resolved_path.exists():
                raise ValueError(f"source does not exist: {source.resolved_path}")
            if item.object_type == "skills":
                if not source.resolved_path.is_dir():
                    raise ValueError("skills source must be a directory")
                for child in _skill_sources(source):
                    staged = stage_root / f"{len(operations):04d}-{child.name}"
                    excluded_env_files = _skill_environment_files(child)
                    for env_path in excluded_env_files:
                        loss_report.add(
                            "skills",
                            f"{child.name}/{env_path.relative_to(child)}",
                            "environment file excluded from Skill copy",
                            None,
                        )
                    shutil.copytree(
                        child,
                        staged,
                        ignore=_ignore_skill_environment_files,
                        symlinks=True,
                    )
                    ensure_no_symlinks(staged)
                    preflight_skill_source(staged)
                    destination = (
                        target.resolved_path
                        if target.resolved_path.name == child.name
                        else target.resolved_path / child.name
                    )
                    operations.append(
                        {
                            "kind": "directory",
                            "staged": staged,
                            "destination": destination,
                            "boundary": target.boundary,
                        }
                    )
            elif item.object_type == "instructions":
                sources = _instruction_sources(source)
                if not sources:
                    raise ValueError(
                        f"no instruction files found: {source.resolved_path}"
                    )
                if _instruction_target_is_file(target) and len(sources) > 1:
                    raise ValueError(
                        "multiple instructions cannot be merged into one target file"
                    )
                for index, instruction_path in enumerate(sources):
                    preflight_instruction_source(instruction_path)
                    instruction = parse_instruction(
                        instruction_path.read_text(encoding="utf-8"),
                        source.source_format,
                        source.scope,
                        source.storage,
                    )
                    rendered, report = emit_instruction(
                        instruction, target.source_format
                    )
                    loss_report.items.extend(report.items)
                    if _instruction_target_is_file(target):
                        destination = target.resolved_path
                    else:
                        file_object_id = compute_object_id(
                            product=item.source.product,
                            profile=item.source.profile,
                            scope=item.source.scope,
                            canonical_path=canonical_relative_path(
                                instruction_path, item.source.boundary
                            ),
                        )
                        destination = _instruction_target_path(
                            target,
                            instruction_path,
                            file_object_id,
                            used_targets,
                        )
                    used_targets.add(destination)
                    staged = stage_root / f"{len(operations):04d}-instruction"
                    atomic_write(staged, rendered)
                    operations.append(
                        {
                            "kind": "file",
                            "staged": staged,
                            "destination": destination,
                            "boundary": target.boundary,
                        }
                    )
            elif item.object_type == "mcp":
                source_text = source.resolved_path.read_text(encoding="utf-8")
                servers = parse_mcp_document(source_text, source.source_format)
                existing = (
                    target.resolved_path.read_text(encoding="utf-8")
                    if target.resolved_path.is_file()
                    else None
                )
                rendered, report = emit_mcp_document(
                    servers, target.source_format, existing
                )
                loss_report.items.extend(report.items)
                staged = stage_root / f"{len(operations):04d}-mcp"
                atomic_write(staged, rendered)
                operations.append(
                    {
                        "kind": "file",
                        "staged": staged,
                        "destination": target.resolved_path,
                        "boundary": target.boundary,
                    }
                )
            elif item.object_type == "plugins":
                # Plugin packages transfer is opt-in only (audit 0.9.1):
                # the CLI exposes this as --include-plugins. Without the opt-in,
                # apply fails closed.
                if not allow_plugin_copy:
                    raise ValueError(
                        "plugins transfer requires explicit opt-in "
                        "(--include-plugins); refusing to apply item: "
                        f"{item.object_type}"
                    )
                # Plugin packages: copy entire .factory-plugin/ directory structure
                # preserving all subdirectories (commands/, skills/, droids/, hooks/, mcp.json, plugin.json)
                if not source.resolved_path.is_dir():
                    raise ValueError("plugins source must be a directory")
                ensure_no_symlinks(source.resolved_path)
                preflight_plugin_source(source.resolved_path)
                for child in sorted(source.resolved_path.iterdir()):
                    if child.is_symlink():
                        continue
                    if child.is_file():
                        staged = stage_root / f"{len(operations):04d}-{child.name}"
                        shutil.copy2(child, staged)
                        operations.append(
                            {
                                "kind": "file",
                                "staged": staged,
                                "destination": target.resolved_path / child.name,
                                "boundary": target.boundary,
                            }
                        )
                    elif child.is_dir():
                        ensure_no_symlinks(child)
                        staged_dir = stage_root / f"{len(operations):04d}-{child.name}"
                        shutil.copytree(child, staged_dir)
                        operations.append(
                            {
                                "kind": "directory",
                                "staged": staged_dir,
                                "destination": target.resolved_path / child.name,
                                "boundary": target.boundary,
                            }
                        )
            elif item.object_type == "handoff":
                # Session-derived transfer is opt-in only (audit SDI-2):
                # the CLI exposes this as --include-session.  Without the
                # opt-in the apply fails closed rather than moving
                # session artifacts.
                if not allow_session_handoff:
                    raise ValueError(
                        "handoff/session transfer requires explicit opt-in "
                        "(--include-session); refusing to apply item: "
                        f"{item.object_type}"
                    )
                # Strict whitelist serialization (P0-4): only transfer reviewed_summary,
                # git_branch, selected_files, patch. Discard all raw conversation, logs,
                # tokens, machine paths, cwd, git_root, oauth/session state.
                if source.resolved_path.is_file():
                    source_text = source.resolved_path.read_text(encoding="utf-8")
                    try:
                        session_raw = json.loads(source_text)
                    except json.JSONDecodeError:
                        session_raw = {"reviewed_summary": "Reviewed handoff snapshot"}
                    portable_data = serialize_portable_handoff(session_raw, workspace)
                    rendered = json.dumps(portable_data, indent=2, sort_keys=True) + "\n"
                    staged = stage_root / f"{len(operations):04d}-handoff"
                    atomic_write(staged, rendered)
                    operations.append(
                        {
                            "kind": "file",
                            "staged": staged,
                            "destination": target.resolved_path,
                            "boundary": target.boundary,
                        }
                    )
                elif source.resolved_path.is_dir():
                    for session_file in sorted(source.resolved_path.iterdir()):
                        if session_file.is_file():
                            session_text = session_file.read_text(encoding="utf-8")
                            try:
                                session_raw = json.loads(session_text)
                            except json.JSONDecodeError:
                                session_raw = {"reviewed_summary": "Reviewed handoff snapshot"}
                            portable_data = serialize_portable_handoff(session_raw, workspace)
                            rendered = json.dumps(portable_data, indent=2, sort_keys=True) + "\n"
                            staged = stage_root / f"{len(operations):04d}-{session_file.name}"
                            atomic_write(staged, rendered)
                            operations.append(
                                {
                                    "kind": "file",
                                    "staged": staged,
                                    "destination": target.resolved_path / session_file.name,
                                    "boundary": target.boundary,
                                }
                            )
            else:
                # Fail closed (audit SDI-4): executable surfaces such as
                # hooks and agents have no staging writer, so an eligible
                # item of that kind must never be recorded as applied.
                raise ValueError(
                    "object type has no automatic writer and must be "
                    f"rebuilt manually: {item.object_type}"
                )
        destinations = [operation["destination"] for operation in operations]
        if len(destinations) != len(set(destinations)):
            raise ValueError("plan resolves multiple writes to the same target")
        protected_surfaces = [
            surface.resolved_path
            for item in plan
            for surface in (item.source, item.target)
            if surface is not None
        ]
        if any(paths_overlap(manifest_path, path) for path in protected_surfaces):
            raise ValueError(
                "manifest path overlaps a planned source or target surface: "
                f"{manifest_path}"
            )
        for item in plan:
            # Items recorded as deferred/blocked may have source or
            # target None; only check state for items with surfaces.
            if item.source is None or item.target is None:
                continue
            if (
                item.expected_source_state is not None
                and path_state(item.source.resolved_path)
                != item.expected_source_state
            ):
                raise ValueError(
                    f"source changed while staging: {item.source.resolved_path}"
                )
            if (
                item.expected_target_state is not None
                and path_state(item.target.resolved_path)
                != item.expected_target_state
            ):
                raise ValueError(
                    f"target changed while staging: {item.target.resolved_path}"
                )

        for index, operation in enumerate(operations):
            operation["backup"] = backup_path(
                operation["destination"], backup_root, index
            )
        for item in plan:
            # Skip items without a target surface.
            if item.target is None:
                continue
            if (
                item.expected_target_state is not None
                and path_state(item.target.resolved_path)
                != item.expected_target_state
            ):
                raise ValueError(
                    f"target changed before transaction commit: {item.target.resolved_path}"
                )

        created_directories: list[Path] = []
        try:
            for operation in operations:
                destination = operation["destination"]
                boundary = operation["boundary"]
                change = begin_change(
                    changes,
                    destination,
                    operation["backup"],
                    boundary,
                )
                missing_parents: list[Path] = []
                candidate = destination.parent
                while candidate != boundary and not candidate.exists():
                    missing_parents.append(candidate)
                    candidate = candidate.parent
                destination.parent.mkdir(parents=True, exist_ok=True)
                created_directories.extend(reversed(missing_parents))
                if operation["kind"] == "directory":
                    temporary = destination.parent / (
                        f".{destination.name}.migration-{operation_id}"
                    )
                    try:
                        shutil.copytree(operation["staged"], temporary)
                        ensure_no_symlinks(temporary)
                        if hash_path(temporary) != hash_path(operation["staged"]):
                            raise ValueError(
                                f"staged Skill hash changed during commit: {destination}"
                            )
                        if destination.is_symlink():
                            raise ValueError(
                                f"symbolic links are not allowed: {destination}"
                            )
                        if destination.is_dir():
                            shutil.rmtree(destination)
                        else:
                            destination.unlink(missing_ok=True)
                        os.replace(temporary, destination)
                    finally:
                        if temporary.is_symlink():
                            temporary.unlink()
                        elif temporary.exists():
                            shutil.rmtree(temporary)
                else:
                    atomic_write(
                        destination,
                        operation["staged"].read_text(encoding="utf-8"),
                    )
                finish_change(change, destination)

            # Record each actually applied eligible item in the manifest
            # alongside the deferred/blocked entries from dispatch.
            for index, item in enumerate(eligible_items):
                status = item.status_enum
                item_id = f"{index}:{item.object_type}"
                if status is ItemStatus.DRAFT_DISABLED:
                    manifest_items.append(
                        _manifest_entry(item, item_id, "draft-written", index)
                    )
                elif status is ItemStatus.READY_LOSSY:
                    # Lossy items already recorded as applied-lossy above;
                    # nothing to update here.
                    continue
                else:
                    manifest_items.append(
                        _manifest_entry(item, item_id, "applied", index)
                    )

            summary: dict[str, int] = {}
            for entry in manifest_items:
                summary[entry["outcome"]] = summary.get(entry["outcome"], 0) + 1

            manifest = _build_manifest(
                operation_id=operation_id,
                workspace=workspace,
                provenance=provenance or {},
                changes=changes,
                loss_report=loss_report,
                items=manifest_items,
                blockers=target_groups_blocked,
                apply_safe=apply_safe,
                include_lossy=include_lossy,
                strict=strict,
            )
            manifest["manifest_sha256"] = json_sha256(
                {
                    key: value
                    for key, value in manifest.items()
                    if key != "manifest_sha256"
                }
            )
            atomic_write(
                manifest_path,
                json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            )
        except BaseException as error:
            rollback_errors: list[str] = []
            for change in reversed(changes):
                try:
                    restore_transaction_change(change)
                except (OSError, ValueError) as rollback_error:
                    rollback_errors.append(str(rollback_error))
            for directory in reversed(created_directories):
                try:
                    directory.rmdir()
                except OSError:
                    pass
            if rollback_errors:
                raise RuntimeError(
                    "transaction failed and automatic rollback was incomplete: "
                    + "; ".join(rollback_errors)
                ) from error
            raise
    return manifest, manifest_path


def load_manifest(path: Path) -> dict[str, Any]:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or manifest.get("schema_version") not in {
        1,
        MANIFEST_SCHEMA_VERSION,
    }:
        raise ValueError("unsupported manifest")
    if manifest.get("schema_version") == MANIFEST_SCHEMA_VERSION:
        expected = manifest.get("manifest_sha256")
        payload = {
            key: value for key, value in manifest.items() if key != "manifest_sha256"
        }
        if not isinstance(expected, str) or expected != json_sha256(payload):
            raise ValueError("manifest checksum mismatch")
    changes = manifest.get("changes")
    if not isinstance(changes, list):
        raise ValueError("manifest changes must be an array")
    return manifest


def verify_manifest(path: Path) -> list[str]:
    manifest = load_manifest(path)
    errors: list[str] = []
    for change in manifest["changes"]:
        target = Path(change["path"])
        boundary = Path(change.get("boundary", ""))
        if not boundary.is_absolute() or target == boundary:
            errors.append(f"unsafe manifest boundary for: {target}")
            continue
        try:
            ensure_no_symlink_components(target, boundary)
        except ValueError as error:
            errors.append(str(error))
            continue
        if not target.exists():
            errors.append(f"missing: {target}")
            continue
        try:
            current = hash_path(target)
        except ValueError as error:
            errors.append(str(error))
            continue
        if current != change.get("post_sha256"):
            errors.append(f"changed after apply: {target}")
    return errors


def rollback_manifest(path: Path) -> int:
    manifest = load_manifest(path)
    errors = verify_manifest(path)
    if errors:
        raise ValueError("rollback refused: " + "; ".join(errors))
    restored = 0
    for change in reversed(manifest["changes"]):
        target = Path(change["path"])
        backup_value = change.get("backup")
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink(missing_ok=True)
        if backup_value:
            backup = Path(backup_value)
            if not backup.exists():
                raise ValueError(f"missing rollback backup: {backup}")
            target.parent.mkdir(parents=True, exist_ok=True)
            if backup.is_dir():
                shutil.copytree(backup, target)
            else:
                shutil.copy2(backup, target)
        restored += 1
    return restored
