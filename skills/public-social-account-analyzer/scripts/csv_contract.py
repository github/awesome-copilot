"""Canonical CSV-cell serialization shared by every collection path."""

from __future__ import annotations

import ast
import json
import math
import re
import warnings
from typing import Any, Callable, Iterable, Mapping


STRUCTURED_FIELDS = frozenset({"platform_metrics", "field_visibility"})
BOOLEAN_FIELDS = frozenset({
    "is_pinned",
    "is_repost",
    "is_promoted",
    "platform_post_id_known",
    "local_record_key",
    "item_url_known",
})
NUMERIC_FIELDS = frozenset({
    "duration_seconds",
    "source_rank",
    "views",
    "likes",
    "comments",
    "favorites",
    "shares",
    "coins",
    "danmaku",
    "classification_confidence",
})
MAX_STRUCTURED_CELL_CHARS = 16_384
MAX_LITERAL_NODES = 2_048
MAX_LITERAL_DEPTH = 32

WarningSink = Callable[[str], None]


def _emit_warning(warning_sink: WarningSink | None, message: str) -> None:
    if warning_sink is not None:
        warning_sink(message)


def _safe_legacy_literal(text: str) -> Any:
    """Parse a bounded Python literal without accepting executable syntax."""
    if len(text) > MAX_STRUCTURED_CELL_CHARS:
        raise ValueError("cell exceeds the legacy literal size limit")
    try:
        tree = ast.parse(text, mode="eval")
    except (SyntaxError, ValueError, MemoryError, RecursionError) as exc:
        raise ValueError("invalid legacy literal") from exc

    allowed_nodes = (
        ast.Expression,
        ast.List,
        ast.Tuple,
        ast.Dict,
        ast.Constant,
        ast.UnaryOp,
        ast.UAdd,
        ast.USub,
        ast.Load,
    )
    stack = [(tree, 0)]
    node_count = 0
    while stack:
        node, depth = stack.pop()
        node_count += 1
        if node_count > MAX_LITERAL_NODES or depth > MAX_LITERAL_DEPTH:
            raise ValueError("legacy literal exceeds complexity limits")
        if not isinstance(node, allowed_nodes):
            raise ValueError("unsupported legacy literal syntax")
        stack.extend((child, depth + 1) for child in ast.iter_child_nodes(node))
    try:
        return ast.literal_eval(tree)
    except (
        SyntaxError,
        ValueError,
        TypeError,
        MemoryError,
        RecursionError,
    ) as exc:
        raise ValueError("invalid legacy literal") from exc


_INVALID_JSON_VALUE = object()


def _coerce_json_compatible(value: Any, *, depth: int = 0) -> Any:
    if depth > MAX_LITERAL_DEPTH:
        return _INVALID_JSON_VALUE
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else _INVALID_JSON_VALUE
    if isinstance(value, (list, tuple)):
        result = []
        for item in value:
            converted = _coerce_json_compatible(item, depth=depth + 1)
            if converted is _INVALID_JSON_VALUE:
                return _INVALID_JSON_VALUE
            result.append(converted)
        return result
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if not isinstance(key, str):
                return _INVALID_JSON_VALUE
            converted = _coerce_json_compatible(item, depth=depth + 1)
            if converted is _INVALID_JSON_VALUE:
                return _INVALID_JSON_VALUE
            result[key] = converted
        return result
    return _INVALID_JSON_VALUE


def _coerce_hashtag_sequence(value: Any) -> list[str] | None:
    if not isinstance(value, (list, tuple)):
        return None
    result: list[str] = []
    for item in value:
        if item is None:
            continue
        if isinstance(item, bool) or isinstance(item, (str, int)):
            result.append(str(item))
        elif isinstance(item, float) and math.isfinite(item):
            result.append(str(item))
        else:
            return None
    return result


def parse_hashtag_cell(
    raw: Any, *, warning_sink: WarningSink | None = None
) -> list[str]:
    """Read canonical JSON or a bounded historical list/tuple repr."""
    direct = _coerce_hashtag_sequence(raw)
    if direct is not None:
        return direct
    if raw is None:
        return []
    if not isinstance(raw, str):
        return [str(raw)]
    value = raw.strip()
    if not value:
        return []
    if len(value) > MAX_STRUCTURED_CELL_CHARS:
        _emit_warning(warning_sink, "hashtags cell exceeds size limit")
        return []
    if value.startswith("["):
        try:
            parsed = json.loads(value)
        except (
            json.JSONDecodeError,
            TypeError,
            ValueError,
            MemoryError,
            RecursionError,
        ):
            parsed = None
        canonical = _coerce_hashtag_sequence(parsed)
        if canonical is not None:
            return canonical
    if value.startswith(("[", "(")):
        try:
            legacy = _safe_legacy_literal(value)
        except ValueError:
            legacy = None
        parsed_legacy = _coerce_hashtag_sequence(legacy)
        if parsed_legacy is not None:
            return parsed_legacy
        _emit_warning(warning_sink, "hashtags cell is not a safe list/tuple literal")
        return []
    return [
        part.strip().lstrip("#")
        for part in re.split(r"[|,;]", value)
        if part.strip()
    ]


def parse_structured_object_cell(
    raw: Any, *, warning_sink: WarningSink | None = None
) -> dict[str, Any]:
    """Read a canonical JSON object or a bounded historical dict repr."""
    if isinstance(raw, dict):
        converted = _coerce_json_compatible(raw)
        return converted if isinstance(converted, dict) else {}
    if raw is None or not isinstance(raw, str) or not raw.strip():
        return {}
    value = raw.strip()
    if len(value) > MAX_STRUCTURED_CELL_CHARS:
        _emit_warning(warning_sink, "structured cell exceeds size limit")
        return {}
    try:
        parsed = json.loads(value)
    except (
        json.JSONDecodeError,
        TypeError,
        ValueError,
        MemoryError,
        RecursionError,
    ):
        try:
            parsed = _safe_legacy_literal(value)
        except ValueError:
            parsed = None
    if isinstance(parsed, dict):
        converted = _coerce_json_compatible(parsed)
        if isinstance(converted, dict):
            return converted
    _emit_warning(warning_sink, "structured cell is not a safe JSON-compatible object")
    return {}


def normalize_hashtags(raw: Any) -> list[str]:
    """Normalize hashtags to an array before canonical JSON serialization."""
    return parse_hashtag_cell(raw)


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def serialize_csv_cell(column: str, value: Any) -> Any:
    """Apply the normalized CSV contract, rounding durations to seconds."""
    if value is None:
        return ""
    if column == "hashtags":
        return canonical_json(normalize_hashtags(value))
    if column in STRUCTURED_FIELDS:
        return canonical_json(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    if column == "duration_seconds":
        try:
            numeric = float(value)
            return "" if math.isnan(numeric) or math.isinf(numeric) else round(numeric)
        except (ValueError, TypeError, OverflowError):
            return ""
    return value


def serialize_csv_row(
    row: Mapping[str, Any], fieldnames: Iterable[str]
) -> dict[str, Any]:
    return {
        field: serialize_csv_cell(field, row.get(field))
        for field in fieldnames
    }


def deserialize_csv_cell(
    column: str,
    value: Any,
    *,
    warning_sink: WarningSink | None = None,
) -> Any:
    """Restore JSON-safe values, preserving integer numeric-cell types."""
    if column == "hashtags":
        return parse_hashtag_cell(value, warning_sink=warning_sink)
    if column in STRUCTURED_FIELDS:
        return parse_structured_object_cell(value, warning_sink=warning_sink)
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if column in BOOLEAN_FIELDS:
        if isinstance(value, bool):
            return value
        canonical = str(value).strip().lower()
        if canonical == "true":
            return True
        if canonical == "false":
            return False
        _emit_warning(warning_sink, f"{column} cell is not a canonical boolean")
        return None
    if column in NUMERIC_FIELDS:
        if isinstance(value, bool):
            _emit_warning(warning_sink, f"{column} cell is not numeric")
            return None
        try:
            parsed = json.loads(str(value).strip())
        except (
            json.JSONDecodeError,
            TypeError,
            ValueError,
            MemoryError,
            RecursionError,
        ):
            parsed = None
        if isinstance(parsed, str) and re.fullmatch(r"-?\d+", parsed):
            return int(parsed)
        if (
            isinstance(parsed, (int, float))
            and not isinstance(parsed, bool)
            and (not isinstance(parsed, float) or math.isfinite(parsed))
        ):
            return parsed
        _emit_warning(warning_sink, f"{column} cell is not a finite JSON number")
        return None
    return value


def deserialize_csv_row(row: Mapping[str, Any]) -> dict[str, Any]:
    """Deserialize a CSV row, warning when unsafe legacy cells are discarded."""
    def warn(message: str) -> None:
        warnings.warn(message, RuntimeWarning, stacklevel=3)

    return {
        field: deserialize_csv_cell(field, value, warning_sink=warn)
        for field, value in row.items()
    }
