"""Parse bounded user-supplied Douyin cookies without logging credentials."""

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


class DouyinCookieError(ValueError):
    """Cookie input is missing or unsafe; messages never contain credentials."""


def _is_douyin_domain(value: str) -> bool:
    domain = value.lstrip(".").lower()
    return domain == "douyin.com" or domain.endswith(".douyin.com")


def _clean_record(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise DouyinCookieError("Cookie 文件包含无效记录")
    name = value.get("name")
    cookie_value = value.get("value")
    domain = value.get("domain", ".douyin.com")
    path = value.get("path", "/")
    secure = value.get("secure", True)
    http_only = value.get("httpOnly", value.get("http_only", False))
    if not isinstance(name, str) or _COOKIE_NAME.fullmatch(name) is None:
        raise DouyinCookieError("Cookie 文件包含无效名称")
    if (
        not isinstance(cookie_value, str)
        or not cookie_value
        or len(cookie_value) > _MAX_COOKIE_VALUE_CHARS
        or any(ord(char) < 0x20 or ord(char) == 0x7F for char in cookie_value)
    ):
        raise DouyinCookieError("Cookie 文件包含无效值")
    if not isinstance(domain, str) or not _is_douyin_domain(domain):
        raise DouyinCookieError("Cookie 文件包含非抖音域记录")
    if not isinstance(path, str) or not path.startswith("/"):
        raise DouyinCookieError("Cookie 文件包含无效路径")
    if type(secure) is not bool or type(http_only) is not bool:
        raise DouyinCookieError("Cookie 文件包含无效属性")
    return {
        "name": name,
        "value": cookie_value,
        "domain": domain.lower(),
        "path": path,
        "secure": secure,
        "httpOnly": http_only,
    }


def _records_from_json(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [_clean_record(item) for item in value]
    if isinstance(value, dict) and "name" in value and "value" in value:
        return [_clean_record(value)]
    if isinstance(value, dict):
        return [
            _clean_record({"name": name, "value": cookie_value})
            for name, cookie_value in value.items()
        ]
    raise DouyinCookieError("Cookie JSON 必须是对象或数组")


def _records_from_header(text: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for part in text.strip().split(";"):
        candidate = part.strip()
        if not candidate:
            continue
        if "=" not in candidate:
            raise DouyinCookieError("Cookie 文本格式无效")
        name, cookie_value = candidate.split("=", 1)
        records.append(
            _clean_record({"name": name.strip(), "value": cookie_value.strip()})
        )
    return records


def load_douyin_cookie_file(path: str | os.PathLike[str]) -> tuple[dict[str, Any], ...]:
    """Load JSON export or Cookie-header text into sanitized CDP records."""
    try:
        cookie_path = Path(path)
        stat = cookie_path.stat()
        if not cookie_path.is_file() or stat.st_size > _MAX_COOKIE_FILE_BYTES:
            raise DouyinCookieError("Cookie 文件不存在、不是普通文件或过大")
        raw = cookie_path.read_bytes()
        text = raw.decode("utf-8")
    except DouyinCookieError:
        raise
    except (OSError, UnicodeError) as exc:
        raise DouyinCookieError("无法安全读取 Cookie 文件") from exc
    if not text.strip():
        raise DouyinCookieError("Cookie 文件为空")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        records = _records_from_header(text)
    else:
        records = _records_from_json(parsed)
    if not records or len(records) > _MAX_COOKIE_COUNT:
        raise DouyinCookieError("Cookie 记录数量无效")
    names: set[str] = set()
    clean: list[dict[str, Any]] = []
    for record in records:
        if record["name"] in names:
            raise DouyinCookieError("Cookie 文件包含重复名称")
        names.add(record["name"])
        clean.append(record)
    return tuple(clean)


def save_douyin_cookie_file(
    records: tuple[dict[str, Any], ...],
    path: str | os.PathLike[str],
) -> None:
    """Persist a sanitized Douyin Cookie record tuple to ``path`` with mode 0600.

    Re-runs the same guards as the loader so a saved file round-trips back
    through :func:`load_douyin_cookie_file`.
    """
    if not records:
        raise DouyinCookieError("Cookie 记录为空")
    if len(records) > _MAX_COOKIE_COUNT:
        raise DouyinCookieError("Cookie 记录数量无效")
    payload = [
        _clean_record(
            {
                "name": record["name"],
                "value": record["value"],
                "domain": record.get("domain", ".douyin.com"),
                "path": record.get("path", "/"),
                "secure": record.get("secure", True),
                "httpOnly": record.get("httpOnly", False),
            }
        )
        for record in records
    ]
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    atomic_write_private_text(
        path,
        encoded,
        error_type=DouyinCookieError,
        error_message="无法安全写入 Cookie 文件",
    )
