"""Shared task identity and user-supplied analysis-goal contracts."""

from __future__ import annotations

import hashlib
import re
import secrets
import unicodedata
from datetime import datetime, timezone
from typing import Callable
from urllib.parse import urlsplit


MAX_ANALYSIS_GOAL_BYTES = 500
PUBLIC_PAGE_DISCLAIMER = (
    "本报告基于公开页面快照，不代表账号后台真实曝光、触达、完播或转化数据。"
)
AUTHORIZED_DISCLAIMER = (
    "本报告基于账号本人授权 OpenAPI 返回的公开来源证据，"
    "不代表账号后台真实曝光、触达、完播或转化数据。"
)
TAX_FORMAT: frozenset[str] = frozenset({
    "talking_head",
    "tutorial",
    "commentary",
    "interview",
    "vlog",
    "news",
    "review",
    "compilation",
    "animation",
    "gameplay",
    "image_text",
    "live_clip",
    "other",
})
TAX_FUNNEL: frozenset[str] = frozenset({
    "awareness",
    "education",
    "engagement",
    "conversion",
    "retention",
    "unknown",
})
TAX_HOOK: frozenset[str] = frozenset({
    "question",
    "contradiction",
    "result_first",
    "pain_point",
    "controversy",
    "list",
    "curiosity",
    "authority",
    "story",
    "none",
    "unknown",
})
_BILIBILI_PROFILE_RE = re.compile(
    r"https://space\.bilibili\.com/([1-9][0-9]*)(?:[/?#].*)?\Z"
)
_BILIBILI_SHORT_RE = re.compile(
    r"https://b23\.tv/[A-Za-z0-9_-]+(?:[/?#].*)?\Z"
)


# Task status 枚举的单一来源。run_pipeline / collect / analyze 等模块必须从这里导入，
# 不要在本模块外独立定义以免 drift。
TASK_STATUSES: frozenset[str] = frozenset({
    "CREATED",
    "COLLECTING",
    "NORMALIZING",
    "ANALYZING",
    "COMPLETED",
    "PARTIAL",
    "FAILED",
})

# Stop reason 枚举的单一来源。collect.py / run_pipeline.py 都从 collectors._constants
# 引入 STOP_* 单常量；但下游 pipeline / 分析层需要做白名单校验时使用本枚举，
# 避免对未知 stop_reason 拼接到错误消息或下游 panic。
STOP_REASONS: frozenset[str] = frozenset({
    "LOGIN_REQUIRED",
    "VERIFICATION_REQUIRED",
    "RATE_LIMITED",
    "ACCOUNT_UNAVAILABLE",
    "ACCESS_RESTRICTED",
    "PARSER_FAILED",
    "NO_PUBLIC_CONTENT",
    "OPENAPI_ERROR",
    "UNSUPPORTED_PLATFORM",
    "ADAPTER_UNAVAILABLE",
    "INTERNAL_ERROR",
})

# 分析层能继续往下走的 task_status（与 STOP_REASONS 配合用于安全错误消息）。
ANALYZABLE_TASK_STATUSES: frozenset[str] = frozenset({"COMPLETED", "PARTIAL"})

# 清洗后消息中的三种固定取值：MISSING（输入为 None）/ UNKNOWN（不在白名单）/ 原值。
LABEL_MISSING: str = "null"
LABEL_UNKNOWN: str = "INVALID"

# 类型契约：safe_*_label 只返回这三类字面量，调用方无需再校验。
LabelLiteral = str  # 实际取值为 LABEL_MISSING | LABEL_UNKNOWN | STOP_REASONS/TASK_STATUSES 成员


def safe_stop_reason_label(value: object) -> LabelLiteral:
    """Render a stop_reason for diagnostic messages without leaking unknowns.

    返回固定清洗后的字面量：
    - None → LABEL_MISSING ("null")
    - 在 STOP_REASONS 白名单内 → 原值
    - 其他 → LABEL_UNKNOWN ("INVALID")

    注意：LABEL_MISSING 仅作为消息渲染标记，**不**代表 STOP_REASONS 中存在名为 "null"
    的合法停止原因。调用方若要把返回值当作合法枚举继续流转，必须显式忽略
    LABEL_MISSING / LABEL_UNKNOWN。
    """
    if value is None:
        return LABEL_MISSING
    if isinstance(value, str) and value in STOP_REASONS:
        return value
    return LABEL_UNKNOWN


def safe_task_status_label(value: object) -> LabelLiteral:
    """Render a task_status for diagnostic messages.

    同 safe_stop_reason_label 的三态契约。
    """
    if value is None:
        return LABEL_MISSING
    if isinstance(value, str) and value in TASK_STATUSES:
        return value
    return LABEL_UNKNOWN


class TaskContractError(ValueError):
    """A task field is malformed and must be rejected before side effects."""


def resolve_profile_url(
    value: str, *, redirect_resolver: Callable[[str], str]
) -> str:
    """Resolve an allowlisted Bilibili short link to one canonical profile."""
    if not isinstance(value, str):
        raise ValueError("URL is not a supported public profile")
    candidate = value.strip()
    direct = _BILIBILI_PROFILE_RE.fullmatch(candidate)
    if direct is not None:
        return f"https://space.bilibili.com/{direct.group(1)}"
    if _BILIBILI_SHORT_RE.fullmatch(candidate) is None:
        raise ValueError("URL is not a supported public profile")
    resolved = redirect_resolver(candidate)
    if not isinstance(resolved, str):
        raise ValueError("URL is not a supported public profile")
    target = _BILIBILI_PROFILE_RE.fullmatch(resolved.strip())
    if target is None:
        raise ValueError("URL is not a supported public profile")
    parsed = urlsplit(resolved.strip())
    if parsed.scheme != "https" or parsed.netloc != "space.bilibili.com":
        raise ValueError("URL is not a supported public profile")
    return f"https://space.bilibili.com/{target.group(1)}"


def validate_analysis_goal(value: object) -> str | None:
    """Return a normalized optional goal, rejecting unsafe or ambiguous text."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise TaskContractError("analysis_goal 必须是字符串")
    normalized = unicodedata.normalize("NFKC", value).strip()
    if not normalized:
        raise TaskContractError("analysis_goal 不能为空")
    if len(normalized.encode("utf-8")) > MAX_ANALYSIS_GOAL_BYTES:
        raise TaskContractError("analysis_goal 过长")
    if any(unicodedata.category(char).startswith("C") for char in normalized):
        raise TaskContractError("analysis_goal 不允许控制字符")
    return normalized


def new_task_id(platform: str) -> str:
    """Create a nonempty, collision-resistant task identifier."""
    if not isinstance(platform, str) or re.fullmatch(
        r"[a-z][a-z0-9_-]{0,31}", platform
    ) is None:
        raise TaskContractError("platform 无法用于 task_id")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    return f"{platform}-{timestamp}-{secrets.token_hex(8)}"


def account_output_key(platform: str, canonical_url: str) -> str:
    """Return a non-sensitive stable key for the default task directory."""
    path = urlsplit(canonical_url).path.rstrip("/")
    identity = path.rsplit("/", 1)[-1]
    material = (identity or canonical_url).encode("utf-8")
    return hashlib.sha256(material).hexdigest()[:12]
