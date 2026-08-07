"""Parse bounded, user-provided platform Cookie exports without logging secrets."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from ._cookie_storage import atomic_write_private_text


_MAX_COOKIE_FILE_BYTES = 64 * 1024
_MAX_COOKIE_COUNT = 128
_MAX_COOKIE_VALUE_CHARS = 4096
_COOKIE_NAME = re.compile(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")


class PlatformCookieError(ValueError):
    """A Cookie export is unusable; errors never contain credential values."""


def _matches_domain(value: str, allowed_domain: str) -> bool:
    domain = value.lstrip(".").lower()
    return domain == allowed_domain or domain.endswith(f".{allowed_domain}")


def _clean_record(value: Any, allowed_domain: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PlatformCookieError("Cookie 文件包含无效记录")
    name = value.get("name")
    cookie_value = value.get("value")
    domain = value.get("domain", f".{allowed_domain}")
    path = value.get("path", "/")
    secure = value.get("secure", True)
    http_only = value.get("httpOnly", value.get("http_only", False))
    if not isinstance(name, str) or _COOKIE_NAME.fullmatch(name) is None:
        raise PlatformCookieError("Cookie 文件包含无效名称")
    if (
        not isinstance(cookie_value, str)
        or not cookie_value
        or len(cookie_value) > _MAX_COOKIE_VALUE_CHARS
        or any(ord(char) < 0x20 or ord(char) == 0x7F for char in cookie_value)
    ):
        raise PlatformCookieError("Cookie 文件包含无效值")
    if not isinstance(domain, str) or not _matches_domain(domain, allowed_domain):
        raise PlatformCookieError("Cookie 文件包含不属于目标平台的域记录")
    if not isinstance(path, str) or not path.startswith("/"):
        raise PlatformCookieError("Cookie 文件包含无效路径")
    if type(secure) is not bool or type(http_only) is not bool:
        raise PlatformCookieError("Cookie 文件包含无效属性")
    return {
        "name": name,
        "value": cookie_value,
        "domain": domain.lower(),
        "path": path,
        "secure": secure,
        "httpOnly": http_only,
    }


def _records_from_json(value: Any, allowed_domain: str) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [_clean_record(item, allowed_domain) for item in value]
    if isinstance(value, dict) and "name" in value and "value" in value:
        return [_clean_record(value, allowed_domain)]
    if isinstance(value, dict):
        return [
            _clean_record({"name": name, "value": cookie_value}, allowed_domain)
            for name, cookie_value in value.items()
        ]
    raise PlatformCookieError("Cookie JSON 必须是对象或数组")


def _records_from_header(text: str, allowed_domain: str) -> list[dict[str, Any]]:
    text = text.strip()
    if text[:7].lower() == "cookie:":
        text = text[7:].strip()
    records: list[dict[str, Any]] = []
    for part in text.split(";"):
        candidate = part.strip()
        if not candidate:
            continue
        if "=" not in candidate:
            raise PlatformCookieError("Cookie 文本格式无效")
        name, cookie_value = candidate.split("=", 1)
        records.append(
            _clean_record(
                {"name": name.strip(), "value": cookie_value.strip()}, allowed_domain
            )
        )
    return records


def load_platform_cookie_file(
    path: str | os.PathLike[str], allowed_domain: str
) -> tuple[dict[str, Any], ...]:
    """Load one bounded Cookie export for the given platform domain in memory."""
    try:
        cookie_path = Path(path)
        stat = cookie_path.stat()
        if not cookie_path.is_file() or stat.st_size > _MAX_COOKIE_FILE_BYTES:
            raise PlatformCookieError("Cookie 文件不存在、不是普通文件或过大")
        text = cookie_path.read_bytes().decode("utf-8")
    except PlatformCookieError:
        raise
    except (OSError, UnicodeError) as exc:
        raise PlatformCookieError("无法安全读取 Cookie 文件") from exc
    if not text.strip():
        raise PlatformCookieError("Cookie 文件为空")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        records = _records_from_header(text, allowed_domain)
    else:
        records = _records_from_json(parsed, allowed_domain)
    if not records or len(records) > _MAX_COOKIE_COUNT:
        raise PlatformCookieError("Cookie 记录数量无效")
    names: set[str] = set()
    clean: list[dict[str, Any]] = []
    for record in records:
        if record["name"] in names:
            raise PlatformCookieError("Cookie 文件包含重复名称")
        names.add(record["name"])
        clean.append(record)
    return tuple(clean)


def save_platform_cookie_file(
    records: tuple[dict[str, Any], ...],
    path: str | os.PathLike[str],
    *,
    allowed_domain: str,
) -> None:
    """Persist a sanitized Cookie record tuple to ``path`` with mode 0600.

    Re-runs the same domain/size/count guards as the loader so a saved file
    always round-trips back through :func:`load_platform_cookie_file`.
    """
    if not records:
        raise PlatformCookieError("Cookie 记录为空")
    if len(records) > _MAX_COOKIE_COUNT:
        raise PlatformCookieError("Cookie 记录数量无效")
    payload = [
        _clean_record(
            {
                "name": record["name"],
                "value": record["value"],
                "domain": record.get("domain", f".{allowed_domain}"),
                "path": record.get("path", "/"),
                "secure": record.get("secure", True),
                "httpOnly": record.get("httpOnly", False),
            },
            allowed_domain,
        )
        for record in records
    ]
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    atomic_write_private_text(
        path,
        encoded,
        error_type=PlatformCookieError,
        error_message="无法安全写入 Cookie 文件",
    )
