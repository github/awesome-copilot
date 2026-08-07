"""Route user-authorized Cookie files to the platform-specific validator."""

from __future__ import annotations

import os
import stat
from os import PathLike
from typing import Any

from .douyin_cookies import load_douyin_cookie_file, save_douyin_cookie_file
from .platform_cookies import (
    load_platform_cookie_file,
    save_platform_cookie_file,
)


_PLATFORM_DOMAINS = {
    "bilibili": "bilibili.com",
    "weibo": "weibo.com",
    "xiaohongshu": "xiaohongshu.com",
}

_WORKSPACE_COOKIE_FILENAME = "{platform}-cookies.json"


def _workspace_cookie_path(workspace_root: str, platform: str) -> str:
    return os.path.join(
        workspace_root, _WORKSPACE_COOKIE_FILENAME.format(platform=platform)
    )


def load_cookie_records(
    path: str | PathLike[str], platform: str
) -> tuple[dict[str, Any], ...]:
    """Load one bounded Cookie input without exposing credential values."""
    if platform == "douyin":
        return load_douyin_cookie_file(path)
    domain = _PLATFORM_DOMAINS.get(platform)
    if domain is None:
        raise ValueError("unsupported Cookie platform")
    return load_platform_cookie_file(path, domain)


def save_cookie_records(
    records: tuple[dict[str, Any], ...],
    path: str | PathLike[str],
    platform: str,
) -> None:
    """Persist sanitized Cookie records to ``path`` with mode 0600."""
    if platform == "douyin":
        save_douyin_cookie_file(records, path)
        return
    domain = _PLATFORM_DOMAINS.get(platform)
    if domain is None:
        raise ValueError("unsupported Cookie platform")
    save_platform_cookie_file(records, path, allowed_domain=domain)


def load_cached_cookie_records(
    workspace_root: str, platform: str
) -> tuple[dict[str, Any], ...]:
    """Load a previously persisted Cookie file from the workspace cache.

    Returns an empty tuple when no cache file exists, the platform is
    unsupported, or the cached file fails validation. The caller decides
    whether to surface or silently fall back on a cached miss.
    """
    if platform not in _PLATFORM_DOMAINS and platform != "douyin":
        return ()
    path = _workspace_cookie_path(workspace_root, platform)
    try:
        metadata = os.lstat(path)
    except OSError:
        return ()
    if not stat.S_ISREG(metadata.st_mode):
        return ()
    if metadata.st_mode & 0o077:
        return ()
    getuid = getattr(os, "getuid", None)
    if callable(getuid) and metadata.st_uid != getuid():
        return ()
    try:
        return load_cookie_records(path, platform)
    except (ValueError, OSError, UnicodeError):
        return ()


def cached_cookie_record_exists(workspace_root: str, platform: str) -> bool:
    """Return True when a cache pathname exists for ``platform``."""
    if platform not in _PLATFORM_DOMAINS and platform != "douyin":
        return False
    return os.path.lexists(_workspace_cookie_path(workspace_root, platform))


def delete_cached_cookie_records(workspace_root: str, platform: str) -> bool:
    """Remove the cached Cookie file for ``platform`` if present.

    Returns True when a file was deleted, False when there was nothing to
    delete or the platform is unsupported. Silently ignores missing files
    and refuses to follow symlinks.
    """
    if platform not in _PLATFORM_DOMAINS and platform != "douyin":
        return False
    path = _workspace_cookie_path(workspace_root, platform)
    if os.path.lexists(path):
        try:
            os.unlink(path)
            return True
        except OSError:
            return False
    return False
