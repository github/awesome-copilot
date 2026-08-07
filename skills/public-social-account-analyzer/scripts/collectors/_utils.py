"""采集器共享工具函数。

聚合在 bilibili/douyin/weibo 三处重复实现的纯函数：
- now_iso / parse_int / ts_to_iso / extract_hashtags

签名以最通用的版本为准：
- parse_int 采用 douyin._int 的实现（bool 拒绝、支持 '亿'/'万'/'+' 后缀）
- ts_to_iso 采用 bilibili._to_iso 的实现（毫秒时间戳自动降级为秒）
- extract_hashtags 采用 bilibili._extract_hashtags 的变参签名（weibo 传单参亦兼容）
"""
from __future__ import annotations

import math
import re
from datetime import datetime
from typing import Any

from ._constants import BEIJING_TZ


def now_iso() -> str:
    """当前 UTC+8 时间的 ISO 8601 字符串。"""
    return datetime.now(BEIJING_TZ).isoformat()


def parse_int(v: Any) -> int | None:
    """宽松数字解析：支持 '1.2万' / '3.4亿' / 纯数字 / '+' 后缀；失败返回 None。

    - bool 类型不算整数（True != 1）
    - None / 空字符串 / 无法解析时返回 None
    """
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v) if math.isfinite(v) else None
    s = str(v).strip()
    if not s:
        return None
    mult = 1
    if "亿" in s:
        mult = 100_000_000
    if "万" in s:
        mult = 10_000
    s = (
        s.replace("亿", "")
        .replace("万", "")
        .replace(",", "")
        .replace("+", "")
        .strip()
    )
    try:
        return int(float(s) * mult)
    except (OverflowError, ValueError):
        return None


def ts_to_iso(ts: Any) -> str | None:
    """Unix 时间戳 → 北京时间 ISO 8601；失败返回 None。

    自动处理毫秒时间戳（>10000000000 时除以 1000）。
    """
    if not ts or isinstance(ts, bool):
        return None
    try:
        val = int(ts)
        if val > 10000000000:
            val //= 1000
        return datetime.fromtimestamp(val, tz=BEIJING_TZ).isoformat()
    except (ValueError, OverflowError, OSError, TypeError):
        return None


def extract_hashtags(*texts: Any) -> list[str]:
    """从文本中按 #标签# 形式提取话题标签（去重保序）。

    接受任意数量的文本参数；非字符串参数跳过。闭合 '#' 可选。
    注：抖音使用 hashtag 结构化字段，应保留各自 _extract_hashtags 实现。
    """
    tags: list[str] = []
    for t in texts:
        if not t or not isinstance(t, str):
            continue
        for m in re.findall(r"#([^#\s]+)#?", t):
            if m and m not in tags:
                tags.append(m)
    return tags
