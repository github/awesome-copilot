"""Load and merge intent-drift configuration.

Precedence (highest wins):

    CLI flags > config/user.yaml > config/defaults.yaml > built-in defaults

``defaults.yaml`` ships with the skill; a user drops a ``config/user.yaml``
next to it to override any key. CLI flags are applied afterwards by
``IntentDriftAnalyzer.parse_arguments`` on top of the flattened config.

The file layout is nested (``analysis.*``, ``export.*``,
``context_collection.*``); the flattened CLI config produced by
``effective_config`` keeps those subtrees under their own keys so callers
can honor every setting.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

DEFAULTS_PATH = Path(__file__).resolve().parent / "config" / "defaults.yaml"
USER_PATH = Path(__file__).resolve().parent / "config" / "user.yaml"

_FORMATS = ("text", "markdown", "json")

# Mirrors config/defaults.yaml so the analyzer always has a complete config
# even when the packaged files are missing (e.g. a minimal npx install).
_BUILTIN_DEFAULTS: dict[str, Any] = {
    "analysis": {
        "threshold": 75,
        "confidence_threshold": 80,
        "providers": {
            "enabled": [
                "goal_provider",
                "constraint_provider",
                "scope_provider",
                "execution_provider",
                "file_graph_provider",
                "dependency_provider",
                "architecture_provider",
                "requirement_coverage_provider",
                "problematic_findings_provider",
            ]
        },
        "weights": {
            "goal_provider": 0.25,
            "constraint_provider": 0.20,
            "scope_provider": 0.15,
            "execution_provider": 0.15,
            "file_graph_provider": 0.10,
            "dependency_provider": 0.10,
            "architecture_provider": 0.10,
            "requirement_coverage_provider": 0.08,
            "problematic_findings_provider": 0.07,
        },
        "scoring": {
            "method": "weighted_average",
            "min_evidence": 1,
            "confidence_required": True,
        },
    },
    "export": {
        "default_format": "text",
        "file": None,
        "include_metadata": True,
    },
    "context_collection": {
        "auto_enabled": False,
        "methods": {
            "git_diff": True,
            "recent_commits": True,
            "edited_files": True,
            "recent_commands": False,  # Privacy: shell history is opt-in (#13)
            "file_changes": True,
        },
        "lookback_hours": 24,
    },
    "history": {
        # null → history.default_history_path() ($XDG_DATA_HOME-aware)
        "history_path": None,
    },
}


def _deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    """Return a new dict merging *overlay* into *base* (overlay wins).

    Nested dicts are merged recursively; every other value replaces the
    base value wholesale (so an overlay list replaces the base list).
    """
    merged = dict(base)
    for key, value in overlay.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _read_yaml(path: Path) -> dict[str, Any]:
    """Read a YAML mapping from *path*, or return {} when the file is absent."""
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ValueError(f"Invalid YAML in {path}: {exc}") from exc
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping, got {type(data).__name__}")
    return data


def _validate(merged: dict[str, Any], source: str) -> None:
    """Raise ValueError with a clear message on invalid configuration values."""
    analysis = merged.get("analysis") or {}
    export = merged.get("export") or {}
    context = merged.get("context_collection") or {}

    threshold = analysis.get("threshold", 75)
    if not isinstance(threshold, (int, float)) or isinstance(threshold, bool):
        raise ValueError(f"{source}: analysis.threshold must be a number, got {threshold!r}")
    if not 0 <= threshold <= 100:
        raise ValueError(f"{source}: analysis.threshold must be between 0 and 100, got {threshold}")

    fmt = export.get("default_format", "text")
    if fmt not in _FORMATS:
        raise ValueError(
            f"{source}: export.default_format must be one of {', '.join(_FORMATS)}, got {fmt!r}"
        )

    weights = analysis.get("weights") or {}
    if not isinstance(weights, dict):
        raise ValueError(
            f"{source}: analysis.weights must be a mapping, got {type(weights).__name__}"
        )
    for name, weight in weights.items():
        if not isinstance(weight, (int, float)) or isinstance(weight, bool):
            raise ValueError(f"{source}: analysis.weights.{name} must be a number, got {weight!r}")

    enabled = (analysis.get("providers") or {}).get("enabled")
    if enabled is not None and not isinstance(enabled, list):
        raise ValueError(
            f"{source}: analysis.providers.enabled must be a list, got {type(enabled).__name__}"
        )

    include_metadata = export.get("include_metadata", True)
    if not isinstance(include_metadata, bool):
        raise ValueError(
            f"{source}: export.include_metadata must be a boolean, got {include_metadata!r}"
        )

    lookback_hours = context.get("lookback_hours", 24)
    if not isinstance(lookback_hours, (int, float)) or isinstance(lookback_hours, bool):
        raise ValueError(
            f"{source}: context_collection.lookback_hours must be a number, got {lookback_hours!r}"
        )

    # Use a sentinel-free lookup: `merged.get("history") or {}` would let any
    # *falsy* non-mapping (`[]`, `0`, `""`, `False`) through the isinstance
    # check below, silently accepting a malformed config.
    history = merged.get("history", {})
    if history is None:
        history = {}
    if not isinstance(history, dict):
        raise ValueError(f"{source}: history must be a mapping, got {type(history).__name__}")
    history_path = history.get("history_path")
    if history_path is not None:
        if not isinstance(history_path, str) or not history_path.strip():
            raise ValueError(
                f"{source}: history.history_path must be a non-empty string, "
                f"got {history_path!r}"
            )


def load_config(
    defaults_path: Path | None = None,
    user_path: Path | None = None,
) -> dict[str, Any]:
    """Load and merge the packaged config files.

    Args:
        defaults_path: defaults file to read (defaults to the packaged one).
        user_path: user file to merge over the defaults (defaults to the
            packaged ``config/user.yaml``, which is usually absent).

    Returns:
        The fully merged, validated configuration.
    """
    merged = _deep_merge(_BUILTIN_DEFAULTS, _read_yaml(defaults_path or DEFAULTS_PATH))
    merged = _deep_merge(merged, _read_yaml(user_path or USER_PATH))
    _validate(merged, "configuration")
    return merged


def effective_config(merged: dict[str, Any]) -> dict[str, Any]:
    """Flatten a merged config into the CLI config shape.

    The result carries the flat keys ``IntentDriftAnalyzer.parse_arguments``
    understands (``threshold``, ``format``, ``auto_context``, and optionally
    ``history_path``) plus the full ``analysis`` / ``export`` /
    ``context_collection`` subtrees so callers can honor every setting.
    """
    analysis = merged.get("analysis") or {}
    export = merged.get("export") or {}
    context = merged.get("context_collection") or {}
    history = merged.get("history")
    # Be defensive rather than trusting validation ran: a non-mapping here
    # would raise AttributeError below instead of degrading to the default.
    history = history if isinstance(history, dict) else {}
    flattened = {
        "threshold": analysis.get("threshold", 75),
        "format": export.get("default_format", "text"),
        "auto_context": bool(context.get("auto_enabled", False)),
        "analysis": analysis,
        "export": export,
        "context_collection": context,
    }
    history_path = history.get("history_path")
    if history_path:
        # Expand `~` and env vars once, here, so both consumers (analyze()'s
        # write and main()'s --history read) resolve the same absolute path
        # rather than each treating the value as cwd-relative.
        flattened["history_path"] = str(Path(os.path.expandvars(history_path)).expanduser())
    return flattened
