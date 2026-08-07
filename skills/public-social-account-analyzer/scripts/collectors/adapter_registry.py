"""Declarative construction of public-platform collectors.

The collection entry point owns routing; this registry owns only optional
adapter imports and their constructor settings.  Failed optional adapters are
reported by platform name without exposing exception text or session data.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Any


CookieRecords = tuple[dict[str, Any], ...]


@dataclass(frozen=True)
class AdapterSettings:
    """Process-local collector settings assembled by the CLI entry point."""

    douyin_browser_fallback: bool = True
    bilibili_browser_fallback: bool | None = None
    xiaohongshu_browser_fallback: bool = True
    bilibili_cookie_records: CookieRecords = ()
    douyin_cookie_records: CookieRecords = ()
    weibo_cookie_records: CookieRecords = ()
    xiaohongshu_cookie_records: CookieRecords = ()


@dataclass(frozen=True)
class AdapterSpec:
    """One optional adapter module and its stable public platform name."""

    platform: str
    module_name: str
    class_name: str


@dataclass(frozen=True)
class AdapterLoadResult:
    adapters: tuple[object, ...]
    failures: tuple[str, ...]


ADAPTER_SPECS = (
    AdapterSpec("bilibili", "collectors.bilibili", "BilibiliCollector"),
    AdapterSpec("douyin", "collectors.douyin", "DouyinCollector"),
    AdapterSpec("weibo", "collectors.weibo", "WeiboCollector"),
    AdapterSpec("xiaohongshu", "collectors.xiaohongshu", "XiaohongshuCollector"),
)


def _constructor_kwargs(platform: str, settings: AdapterSettings) -> dict[str, Any]:
    if platform == "bilibili":
        return {
            "browser_fallback": settings.bilibili_browser_fallback,
            "cookie_records": settings.bilibili_cookie_records,
        }
    if platform == "douyin":
        return {
            "browser_fallback": settings.douyin_browser_fallback,
            "cookie_records": settings.douyin_cookie_records,
        }
    if platform == "weibo":
        return {"cookie_records": settings.weibo_cookie_records}
    if platform == "xiaohongshu":
        return {
            "browser_fallback": settings.xiaohongshu_browser_fallback,
            "cookie_records": settings.xiaohongshu_cookie_records,
        }
    return {}


def load_adapters(settings: AdapterSettings) -> AdapterLoadResult:
    """Instantiate available adapters while retaining safe failure attribution."""
    adapters: list[object] = []
    failures: list[str] = []
    for spec in ADAPTER_SPECS:
        try:
            module = importlib.import_module(spec.module_name)
            collector_class = getattr(module, spec.class_name)
            adapters.append(collector_class(**_constructor_kwargs(spec.platform, settings)))
        except Exception:
            failures.append(spec.platform)
    return AdapterLoadResult(tuple(adapters), tuple(failures))
