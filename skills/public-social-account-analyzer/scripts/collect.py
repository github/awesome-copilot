#!/usr/bin/env python3
"""采集入口:根据平台路由到对应采集器,采集账号资料与内容列表/详情。
对应 PRD FR-001~FR-009。

    用法:
    python scripts/collect.py <账号主页URL> [--limit N] [--out DIR] [--comments]
        [--date-from YYYY-MM-DD] [--date-to YYYY-MM-DD] [--browser-fallback]

    说明:
    - 通过 `from collectors.base import` / `from collectors.bilibili import` 导入
      (需 scripts/ 在 sys.path,且 scripts/collectors/__init__.py 存在,本文件已自动处理)。
    - 抖音/微博适配器若未实现,自动跳过(不会报错)。
    - 输出到 workspace/<platform>-<account>-<date>/ 下:
      source/profile.json、source/posts.jsonl、normalized-posts.csv、collection-report.md、task.json。
    - task.json 记录 task_status 与 stop_reason(见 references/exceptions.md §1)。
"""
from __future__ import annotations

import argparse
import contextvars
import csv
import functools
import hashlib
import io
import json
import os
import re
import stat
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

# 让脚本可直接运行:把 scripts/collectors/ 与 scripts/ 都加入 sys.path,
# 以支持采集器内的平级 `from base import` / `from bilibili import`。
_HERE = os.path.dirname(os.path.abspath(__file__))
_COLLECTORS = os.path.join(_HERE, "collectors")
for _p in (_COLLECTORS, _HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from collectors.base import BaseCollector  # noqa: E402
from collectors._douyin_detail_contract import (  # noqa: E402
    MISSING_P0_DETAIL,
    P0_DETAIL_FIELDS,
    derive_detail_contract,
    detail_value_is_observed,
    sanitize_partial_reasons,
    set_detail_contract,
)
from collectors._constants import (  # noqa: E402
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKER_VALUES,
    DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE,
    PUBLIC_ALL_DEFAULT_MAX_ITEMS,
    PUBLIC_ALL_DEFAULT_MAX_SCROLLS,
    PUBLIC_ALL_DEFAULT_MAX_SECONDS,
    PUBLIC_ALL_HARD_MAX_ITEMS,
    PUBLIC_ALL_HARD_MAX_SCROLLS,
    PUBLIC_ALL_HARD_MAX_SECONDS,
    PUBLIC_LIMIT_DEFAULT,
    PUBLIC_LIMIT_MAX,
    validate_public_all_budgets,
    validate_public_limit,
)
from collectors.url_policy import (  # noqa: E402
    canonical_item_url,
    canonical_profile_url,
    sanitize_routing_url,
)
from immutable_workspace import (  # noqa: E402
    FORMAT as IMMUTABLE_WORKSPACE_FORMAT,
    ImmutableWorkspace,
    WorkspaceCapabilityError,
    WorkspaceCommitIndeterminate,
    WorkspaceError,
    WorkspaceExistsError,
    WorkspaceIdentityError,
    WorkspaceVerificationError,
    WorkspaceWriteError,
    VerifiedWorkspaceReader,
    ensure_container,
    preflight_backend,
    reject_workspace_overlap,
)
from task_contract import (  # noqa: E402
    TaskContractError,
    account_output_key,
    new_task_id,
    resolve_profile_url,
    validate_analysis_goal,
)
from csv_contract import deserialize_csv_row, serialize_csv_row  # noqa: E402
from execution_timing import ExecutionTimer  # noqa: E402
from skill_metadata import skill_contract_sha256, skill_release  # noqa: E402
from normalize import dedup_posts, to_bool_flag  # noqa: E402

# 北京时间为中国平台默认时区（见 references/artifact-contract.md §1）
_BEIJING = timezone(timedelta(hours=8))


def _follow_bilibili_short_link(value: str) -> str:
    # b23.tv does not honor HEAD (returns the short URL itself on 302/405),
    # so use GET. urllib's default HTTPRedirectHandler follows the 302 to
    # the public space.bilibili.com/<uid> page.
    request = urllib.request.Request(
        value,
        method="GET",
        headers={"User-Agent": "Mozilla/5.0 public-profile-resolver"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return response.geturl()


def canonicalize_entry_url(value: str, redirect_resolver=None) -> str:
    """Resolve Bilibili profile short links without widening platform routing."""
    host = urllib.parse.urlsplit(value.strip()).hostname if isinstance(value, str) else None
    if host == "b23.tv" or host == "space.bilibili.com":
        return resolve_profile_url(
            value,
            redirect_resolver=redirect_resolver or _follow_bilibili_short_link,
        )
    return value


def _url_defaults_to_complete_collection(value: str) -> bool:
    """Choose implicit complete mode only for adapters that implement it."""
    try:
        host = urllib.parse.urlsplit(value.strip()).hostname
    except (AttributeError, ValueError):
        return False
    return host in {
        "space.bilibili.com",
        "b23.tv",
        "www.douyin.com",
        "v.douyin.com",
    }

# 任务级 stop_reason 语义对齐 references/exceptions.md §1；枚举见 collection-schema.md §9.2
SR_UNSUPPORTED = "UNSUPPORTED_PLATFORM"
SR_ADAPTER_UNAVAILABLE = "ADAPTER_UNAVAILABLE"
SR_LOGIN = "LOGIN_REQUIRED"
SR_VERIFICATION = "VERIFICATION_REQUIRED"
SR_ACCOUNT_UNAVAILABLE = "ACCOUNT_UNAVAILABLE"
SR_ACCESS_RESTRICTED = "ACCESS_RESTRICTED"
SR_RATE_LIMITED = "RATE_LIMITED"
SR_PARSER_FAILED = "PARSER_FAILED"
SR_NO_PUBLIC_CONTENT = "NO_PUBLIC_CONTENT"
SR_INTERNAL = "INTERNAL_ERROR"

_INDETERMINATE_EXIT_CODE = 4
_INDETERMINATE_MESSAGE = (
    "[INDETERMINATE] 输出目录可能已有可见提交，但持久化或最终验证未确认；"
    "请保留目录并重新核验"
)

_DETAIL_FIELDS = P0_DETAIL_FIELDS

# 适配器异常类 → stop_reason 映射(按异常属性 / 类名兜底)
# 已知 stop_reason 集合,用于从异常消息前缀 [REASON] 兜底识别
_KNOWN_STOP_REASONS = frozenset({
    SR_UNSUPPORTED, SR_ADAPTER_UNAVAILABLE, SR_LOGIN, SR_VERIFICATION,
    SR_ACCOUNT_UNAVAILABLE, SR_ACCESS_RESTRICTED, SR_RATE_LIMITED,
    SR_PARSER_FAILED,
    SR_NO_PUBLIC_CONTENT, SR_INTERNAL,
})
_TASK_PROTECTION_REASONS = frozenset({
    SR_LOGIN,
    SR_VERIFICATION,
    SR_ACCESS_RESTRICTED,
    SR_RATE_LIMITED,
})

_ERROR_STAGE_MESSAGES = {
    "check_access": "访问检查不可用",
    "collect_post_list": "内容列表采集不可用",
    "collect_profile": "账号资料采集不可用",
    "collection_coverage": "全量采集覆盖证据不完整",
    "collect_post_detail": "作品详情补充不可用",
    "collect_comments": "公开评论采样不可用",
    "persist_comments": "评论产物写入失败",
}
_REPORT_ERROR_CODES = _KNOWN_STOP_REASONS | {
    "POST_UNAVAILABLE",
    "COMMENTS_UNAVAILABLE",
}
_BILIBILI_REGULAR_SOURCES = frozenset({"medialist", "arc", "search"})
_BILIBILI_DYNAMIC_STATUSES = frozenset({
    "NOT_ATTEMPTED",
    "UNAVAILABLE",
    "OBSERVED",
    SR_LOGIN,
    SR_VERIFICATION,
    SR_ACCESS_RESTRICTED,
    SR_RATE_LIMITED,
    SR_PARSER_FAILED,
    SR_INTERNAL,
})
_MAX_COMMENT_ARTIFACT_BYTES = 16 * 1024 * 1024
_MAX_RESUME_ARTIFACT_BYTES = 64 * 1024 * 1024
_ACTIVE_RESERVATIONS: contextvars.ContextVar[list | None] = contextvars.ContextVar(
    "active_workspace_reservations", default=None
)


def _event_timestamp() -> str:
    """Timestamp an event when it is observed, not when the task started."""
    return datetime.now(_BEIJING).isoformat()


def _stop_reason_from_exc(e: Exception) -> str:
    """从适配器异常中提取 stop_reason;无法识别时 INTERNAL_ERROR。

    优先级:
    1. 异常的 .stop_reason 属性(BilibiliError / DouyinError 使用)
    2. 异常消息中的 [REASON] 前缀(WeiboCollector 的 RuntimeError 使用)
    3. 兜底 INTERNAL_ERROR
    """
    reason = getattr(e, "stop_reason", None)
    if isinstance(reason, str) and reason in _KNOWN_STOP_REASONS:
        return reason
    msg = str(e)
    m = re.search(r"\[([A-Z_]+)\]", msg)
    if m and m.group(1) in _KNOWN_STOP_REASONS:
        return m.group(1)
    return SR_INTERNAL


def _dominant_stop_reason(
    existing: str | None,
    candidate: str | None,
) -> str | None:
    """Keep the first reason unless a later platform protection must dominate."""
    if candidate is None:
        return existing
    if existing is None:
        return candidate
    if (
        candidate in _TASK_PROTECTION_REASONS
        and existing not in _TASK_PROTECTION_REASONS
    ):
        return candidate
    return existing


def _load_adapters(
    douyin_browser_fallback: bool = True,
    bilibili_browser_fallback: bool | None = None,
    bilibili_cookie_records: tuple[dict[str, Any], ...] = (),
    douyin_cookie_records: tuple[dict[str, Any], ...] = (),
    weibo_cookie_records: tuple[dict[str, Any], ...] = (),
    xiaohongshu_cookie_records: tuple[dict[str, Any], ...] = (),
    xiaohongshu_browser_fallback: bool = True,
) -> list[BaseCollector]:
    """Load registered adapters and emit only safe platform-level failures."""
    from collectors.adapter_registry import AdapterSettings, load_adapters

    result = load_adapters(AdapterSettings(
        douyin_browser_fallback=douyin_browser_fallback,
        bilibili_browser_fallback=bilibili_browser_fallback,
        xiaohongshu_browser_fallback=xiaohongshu_browser_fallback,
        bilibili_cookie_records=bilibili_cookie_records,
        douyin_cookie_records=douyin_cookie_records,
        weibo_cookie_records=weibo_cookie_records,
        xiaohongshu_cookie_records=xiaohongshu_cookie_records,
    ))
    for platform in result.failures:
        print(f"[warn] 加载 {platform} 适配器失败", file=sys.stderr)
    return list(result.adapters)


def _pick(adapters: list[BaseCollector], url: str) -> BaseCollector | None:
    for a in adapters:
        try:
            if a.supports(url):
                return a
        except Exception:
            continue
    return None


def _vis_count(profile: dict) -> int:
    vis = profile.get("field_visibility") or {}
    # field_visibility 取值见 collection-schema.md §8；保留对 "public" 的兼容兜底
    return sum(1 for v in vis.values() if v in ("visible", "partial", "public"))


def _write_csv(
    posts: list[dict],
    path: str,
    *,
    reservation: _WorkspaceReservation | None = None,
) -> None:
    if posts:
        keys: list[str] = []
        for p in posts:
            for k in p:
                if k not in keys:
                    keys.append(k)
    else:
        keys = ["post_id", "post_url", "title", "published_at", "collection_status"]
    handle = (
        reservation.open_text(os.path.relpath(path, reservation.path), newline="")
        if reservation is not None
        else open(path, "w", newline="", encoding="utf-8")
    )
    with handle as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for p in posts:
            w.writerow(serialize_csv_row(p, keys))


def _parse_date(s: str | None) -> str | None:
    """把 --date-from/--date-to 规范化为 +08:00 ISO 8601(中国平台默认时区)。

    接受 YYYY-MM-DD(自动补 00:00:00 起始 / 23:59:59 结束)或完整 ISO。
    无法解析时返回 None,由调用方决定是否拒绝。
    """
    if not s:
        return None
    s = s.strip()
    # Python 3.9 的 fromisoformat 不支持 'Z' 后缀,规范化为 +00:00(见 CASE-004)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    # 已带时区的 ISO 直接接受
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=_BEIJING)
        return dt.isoformat()
    except ValueError:
        pass
    # YYYY-MM-DD → 起/止
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return datetime(y, mo, d, tzinfo=_BEIJING).isoformat()
    return None


def _default_date_to(date_to_raw: str | None) -> str | None:
    """--date-to 为 YYYY-MM-DD 时补到当日 23:59:59 +08:00。"""
    if not date_to_raw:
        return None
    s = date_to_raw.strip()
    if re.match(r"^\d{4}-\d{1,2}-\d{1,2}$", s):
        m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return datetime(y, mo, d, 23, 59, 59, tzinfo=_BEIJING).isoformat()
    return _parse_date(s)


def _filter_by_date(
    posts: list[dict],
    date_from: str | None,
    date_to: str | None,
) -> list[dict]:
    """Intersect known publication dates with an explicit requested range."""
    if not date_from and not date_to:
        return posts

    def parse(iso: str | None) -> datetime | None:
        if not iso:
            return None
        try:
            return datetime.fromisoformat(iso)
        except (ValueError, TypeError):
            return None

    lo = parse(date_from)
    hi = parse(date_to)
    out: list[dict] = []
    for p in posts:
        pa = parse(p.get("published_at"))
        if pa is None:
            continue
        if lo is not None and pa < lo:
            continue
        if hi is not None and pa > hi:
            continue
        out.append(p)
    return out


def _douyin_item_url(post: dict) -> str | None:
    """Return a genuine ID-matching Douyin item URL, never a profile URL."""
    post_id = str(post.get("post_id") or "")
    post_url = post.get("post_url")
    if re.fullmatch(r"\d+", post_id) is None or not isinstance(post_url, str):
        return None
    return canonical_item_url("douyin", post_url, post_id)


def _set_detail_status(post: dict, status: str) -> None:
    metrics = post.get("platform_metrics")
    post["platform_metrics"] = dict(metrics) if isinstance(metrics, dict) else {}
    post["platform_metrics"]["detail_status"] = status


def _set_detail_protection(
    post: dict,
    *,
    attempted: bool,
    stop_reason: str,
) -> None:
    _set_detail_status(post, "UNAVAILABLE")
    post["platform_metrics"]["detail_attempted"] = attempted
    post["platform_metrics"]["detail_stop_reason"] = stop_reason


def _comment_parent_is_analysis_eligible(platform: str, post: dict) -> bool:
    if not isinstance(post, dict) or post.get("platform") != platform:
        return False
    post_id = str(post.get("post_id") or "").strip()
    if not post_id:
        return False
    status = BaseCollector._canon_status_with_source(
        post.get("collection_status")
    )[0]
    if status not in {"SUCCESS", "PARTIAL"}:
        return False
    return not any(
        to_bool_flag(post.get(field)) is True
        for field in ("is_pinned", "is_repost", "is_promoted")
    )


def _valid_comment_parent(platform: str, post: dict) -> tuple[str, str] | None:
    if not _comment_parent_is_analysis_eligible(platform, post):
        return None
    post_id = str(post.get("post_id") or "").strip()
    post_url = post.get("post_url")
    if not post_id or not isinstance(post_url, str):
        return None
    canonical = canonical_item_url(platform, post_url, post_id)
    return (post_id, canonical) if canonical else None


def _canonicalize_post_urls(platform: str, posts: list[dict]) -> None:
    """Canonicalize item evidence and disclosed profile-card source anchors."""
    for post in posts:
        post_id = str(post.get("post_id") or "").strip()
        post["post_url"] = canonical_item_url(
            platform, post.get("post_url"), post_id
        )
        item_source_url = canonical_item_url(
            platform, post.get("source_url"), post_id
        )
        metrics = post.get("platform_metrics")
        profile_card_anchor = (
            isinstance(metrics, dict)
            and metrics.get("local_record_key") is True
            and metrics.get("item_url_known") is False
        )
        post["source_url"] = item_source_url or (
            canonical_profile_url(platform, post.get("source_url"))
            if profile_card_anchor
            else None
        )


def _normalize_comment_record(
    value,
    parent_post_id: str,
    parent_post_url: str,
    occurred_at: str,
) -> dict | None:
    if not isinstance(value, dict):
        return None
    for key in ("parent_post_id", "post_id"):
        supplied = value.get(key)
        if supplied is not None and str(supplied).strip() != parent_post_id:
            return None
    for key in ("parent_post_url", "post_url"):
        supplied = value.get(key)
        if supplied is not None and supplied != parent_post_url:
            return None
    comment_id = value.get("comment_id")
    if (
        isinstance(comment_id, bool)
        or not isinstance(comment_id, (str, int))
    ):
        return None
    comment_id = str(comment_id).strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{1,128}", comment_id) is None:
        return None

    def optional_text(key: str) -> str | None:
        item = value.get(key)
        if item is None:
            return None
        if not isinstance(item, str):
            raise ValueError(key)
        return item.strip() or None

    try:
        author = optional_text("author")
        text = optional_text("text")
        published_at = optional_text("published_at")
        collected_at = optional_text("collected_at") or occurred_at
    except ValueError:
        return None
    for timestamp in (published_at, collected_at):
        if timestamp is None:
            continue
        try:
            parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return None
    likes = value.get("likes")
    if likes is not None and (
        isinstance(likes, bool) or not isinstance(likes, int) or likes < 0
    ):
        return None
    return {
        "comment_id": comment_id,
        "parent_post_id": parent_post_id,
        "parent_post_url": parent_post_url,
        "author": author,
        "text": text,
        "likes": likes,
        "published_at": published_at,
        "collected_at": collected_at,
    }


WorkspaceContractError = WorkspaceError
ArtifactWriteError = WorkspaceWriteError
_WorkspaceReservation = ImmutableWorkspace

_PUBLIC_ARTIFACTS = frozenset({
    "source/profile.json",
    "source/posts.jsonl",
    "source/comments.jsonl",
    "normalized-posts.csv",
    "task.json",
    "collection-report.md",
})
_CHECKPOINT_ARTIFACTS = frozenset({
    "checkpoint.json",
    "source/posts.jsonl",
})
_CHECKPOINT_FORMAT = "public-social-account-analyzer/collection-checkpoint-v1"
_CHECKPOINT_STAGE = "POST_LIST_COLLECTED"


def _repository_root() -> str:
    return os.path.dirname(os.path.dirname(_HERE))


def _repository_root_cookie_root() -> str | None:
    """Return the workspace root used as the default Cookie persistence path.

    Returns None when the ``workspace/`` directory cannot be created in the
    repository root (e.g. read-only deployment), in which case Cookie
    persistence and auto-load are silently disabled.
    """
    try:
        container = ensure_container(os.path.join(_repository_root(), "workspace"))
    except WorkspaceError:
        return None
    return container


def _track_reservation(
    reservation: _WorkspaceReservation,
) -> _WorkspaceReservation:
    active = _ACTIVE_RESERVATIONS.get()
    if active is not None:
        active.append(reservation)
    return reservation


def _preflight_explicit_workspace(path: str, *, resume: bool) -> None:
    """Validate an explicit pathname without creating or changing it."""
    target = os.path.abspath(path)
    if resume:
        if not os.path.lexists(target):
            raise WorkspaceVerificationError("resume workspace does not exist")
        return
    if os.path.lexists(target):
        raise WorkspaceExistsError("new output directory already exists")
    parent = os.path.dirname(target)
    try:
        metadata = os.lstat(parent)
    except OSError as exc:
        raise WorkspaceWriteError("workspace parent does not exist") from exc
    if not stat.S_ISDIR(metadata.st_mode):
        raise WorkspaceWriteError("workspace parent is unsafe")


def _reject_lexical_workspace_overlap(first: str, second: str) -> None:
    """Reject equal or nested create-only targets before either exists."""
    left = os.path.abspath(first)
    right = os.path.abspath(second)
    try:
        common = os.path.commonpath((left, right))
    except ValueError:
        return
    if common in {left, right}:
        raise WorkspaceVerificationError("workspace targets overlap")


def _prepare_explicit_workspace(
    path: str,
    *,
    resume: bool = False,
    expected_identities=None,
) -> _WorkspaceReservation:
    """Atomically acquire a new final-name workspace.

    Resume sources use :class:`VerifiedWorkspaceReader` and are never returned
    as a writable reservation. The legacy parameters remain only to give
    callers a stable, fail-closed error during the CLI transition.
    """
    if resume or expected_identities is not None:
        raise WorkspaceVerificationError("resume workspace is read-only")
    preflight_backend()
    return _track_reservation(
        ImmutableWorkspace.reserve(
            os.path.abspath(path), allowed_artifacts=_PUBLIC_ARTIFACTS
        )
    )


def _reserve_unique_workspace(parent: str, base_name: str) -> _WorkspaceReservation:
    for suffix in range(1, 1_000_001):
        name = base_name if suffix == 1 else f"{base_name}-{suffix}"
        try:
            return _track_reservation(
                ImmutableWorkspace.reserve(
                    os.path.join(parent, name),
                    allowed_artifacts=_PUBLIC_ARTIFACTS,
                )
            )
        except WorkspaceExistsError:
            continue
    raise WorkspaceWriteError("no collision-free output directory is available")


def _reserve_default_workspace(base_name: str) -> _WorkspaceReservation:
    repository_root = _repository_root()
    workspace = ensure_container(os.path.join(repository_root, "workspace"))
    return _reserve_unique_workspace(workspace, base_name)


def _reserve_resume_workspace(
    source_workspace: str,
    *,
    resume_out: str | None,
    date: str,
) -> _WorkspaceReservation:
    if resume_out is not None:
        return _prepare_explicit_workspace(resume_out)
    source = os.path.abspath(source_workspace)
    return _reserve_unique_workspace(
        os.path.dirname(source), f"{os.path.basename(source)}-resume-{date}"
    )


def _write_comments_atomic(
    path: str,
    records: list[dict],
    *,
    reservation: _WorkspaceReservation | None = None,
) -> bool:
    if reservation is None:
        return False
    try:
        relative_path = os.path.relpath(path, reservation.path)
        with reservation.open_text(relative_path) as handle:
            for record in records:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        return True
    except ArtifactWriteError:
        return False
    except WorkspaceContractError:
        raise
    except Exception:
        return False


def _enrich_douyin_details(
    adapter,
    posts: list[dict],
    error_log: list[dict],
    occurred_at: str,
    *,
    blocked_reason: str | None = None,
) -> int:
    """Fill only missing public fields; isolate and sanitize item failures."""
    unavailable_count = 0
    protection_reason = (
        blocked_reason
        if blocked_reason in _TASK_PROTECTION_REASONS
        else None
    )
    for post in posts:
        initial_status = post.get("collection_status")
        if initial_status not in {"SUCCESS", "PARTIAL"}:
            continue
        trusted_missing: tuple[str, ...] = ()
        trusted_duration_not_applicable = False
        take_provenance = getattr(
            adapter, "_take_trusted_detail_provenance", None
        )
        if callable(take_provenance):
            try:
                candidate = take_provenance(post)
            except Exception:
                candidate = ()
            if (
                isinstance(candidate, tuple)
                and len(candidate) == 2
                and isinstance(candidate[0], (list, tuple))
            ):
                trusted_missing = tuple(
                    field
                    for field in candidate[0]
                    if field in P0_DETAIL_FIELDS
                )
                trusted_duration_not_applicable = candidate[1] is True
        trusted_detail_only_partial = bool(trusted_missing)
        can_upgrade = initial_status == "SUCCESS" or (
            initial_status == "PARTIAL" and trusted_detail_only_partial
        )
        missing, reasons = derive_detail_contract(
            post,
            trusted_missing_fields=trusted_missing,
            trusted_duration_not_applicable=trusted_duration_not_applicable,
            trusted_detail_only_partial=trusted_detail_only_partial,
        )
        set_detail_contract(post, missing, reasons)
        if missing or reasons:
            post["collection_status"] = "PARTIAL"
        if not missing:
            _set_detail_status(post, "NOT_NEEDED")
            if (
                can_upgrade
                and not reasons
                and post.get("collection_status") == "PARTIAL"
            ):
                post["collection_status"] = "SUCCESS"
            continue
        if protection_reason is not None:
            unavailable_count += 1
            _set_detail_protection(
                post,
                attempted=False,
                stop_reason=protection_reason,
            )
            continue
        item_url = _douyin_item_url(post)
        if item_url is None:
            unavailable_count += 1
            _set_detail_status(post, "UNAVAILABLE")
            error_log.append({
                "url": None,
                "stage": "collect_post_detail",
                "error_code": "POST_UNAVAILABLE",
                "message": "作品详情补充跳过：缺少可验证的单条作品 URL",
                "occurred_at": occurred_at,
                "retryable": False,
            })
            continue
        try:
            detail = adapter.collect_post_detail(item_url)
            if not isinstance(detail, dict):
                raise ValueError("invalid detail result")
            if str(detail.get("post_id") or "") != str(post.get("post_id") or ""):
                raise ValueError("mismatched detail post id")
        except Exception as error:
            unavailable_count += 1
            reason = _stop_reason_from_exc(error)
            if reason in _TASK_PROTECTION_REASONS:
                protection_reason = reason
                _set_detail_protection(
                    post,
                    attempted=True,
                    stop_reason=reason,
                )
                error_log.append({
                    "url": item_url,
                    "stage": "collect_post_detail",
                    "error_code": reason,
                    "message": _ERROR_STAGE_MESSAGES["collect_post_detail"],
                    "occurred_at": occurred_at,
                    "retryable": False,
                })
                continue
            _set_detail_status(post, "UNAVAILABLE")
            error_log.append({
                "url": item_url,
                "stage": "collect_post_detail",
                "error_code": "POST_UNAVAILABLE",
                "message": "作品详情补充不可用",
                "occurred_at": occurred_at,
                "retryable": False,
            })
            continue
        resolved: set[str] = set()
        for field in missing:
            value = detail.get(field)
            if detail_value_is_observed(
                field,
                value,
                content_type=post.get("content_type"),
            ):
                post[field] = value
                resolved.add(field)
        remaining = [field for field in missing if field not in resolved]
        if remaining:
            unavailable_count += 1
            post["collection_status"] = "PARTIAL"
            set_detail_contract(post, remaining, reasons)
            _set_detail_status(post, "UNAVAILABLE")
            error_log.append({
                "url": item_url,
                "stage": "collect_post_detail",
                "error_code": "POST_UNAVAILABLE",
                "message": "作品详情补充不完整",
                "occurred_at": occurred_at,
                "retryable": False,
            })
            continue

        remaining_reasons = [
            reason for reason in reasons if reason != MISSING_P0_DETAIL
        ]
        set_detail_contract(post, [], remaining_reasons)
        _set_detail_status(post, "SUCCESS")
        if (
            can_upgrade
            and not remaining_reasons
            and post.get("collection_status") == "PARTIAL"
        ):
            post["collection_status"] = "SUCCESS"
    return unavailable_count


def _collect_and_persist_comments(
    adapter,
    posts: list[dict],
    path: str,
    error_log: list[dict],
    occurred_at: str,
    reservation: _WorkspaceReservation | None = None,
    *,
    blocked_reason: str | None = None,
) -> dict:
    per_post_limit = 20
    records: list[dict] = []
    outcome = {
        "attempted_posts": 0,
        "comments_collected": 0,
        "empty_results": 0,
        "failures": 0,
        "per_post_limit": per_post_limit,
    }
    seen: set[tuple[str, str]] = set()
    failed_parents: set[str] = set()
    eligible_parents: dict[str, str] = {}
    ambiguous_parents: set[str] = set()
    eligible_posts = (
        [] if blocked_reason in _TASK_PROTECTION_REASONS else posts
    )
    first_wins_posts, _ = dedup_posts(eligible_posts)
    for post in first_wins_posts:
        platform = str(adapter.platform)
        if not _comment_parent_is_analysis_eligible(platform, post):
            continue
        parent = _valid_comment_parent(platform, post)
        if parent is None:
            outcome["failures"] += 1
            error_log.append({
                "url": None,
                "stage": "collect_comments",
                "error_code": "COMMENTS_UNAVAILABLE",
                "message": "公开评论采样不可用",
                "occurred_at": occurred_at,
                "retryable": False,
            })
            continue
        post_id, post_url = parent
        existing_url = eligible_parents.get(post_id)
        if existing_url is not None and existing_url != post_url:
            ambiguous_parents.add(post_id)
            continue
        eligible_parents.setdefault(post_id, post_url)

    for post_id in ambiguous_parents:
        eligible_parents.pop(post_id, None)
        outcome["failures"] += 1
        error_log.append({
            "url": None,
            "stage": "collect_comments",
            "error_code": "COMMENTS_UNAVAILABLE",
            "message": "公开评论采样不可用",
            "occurred_at": occurred_at,
            "retryable": False,
        })

    for post_id, post_url in eligible_parents.items():
        outcome["attempted_posts"] += 1
        try:
            returned = adapter.collect_comments(post_url, limit=per_post_limit)
            if not isinstance(returned, list):
                raise ValueError("invalid comments result")
        except Exception as error:
            reason = _stop_reason_from_exc(error)
            outcome["failures"] += 1
            failed_parents.add(post_id)
            if reason in _TASK_PROTECTION_REASONS:
                outcome["stop_reason"] = reason
                error_log.append({
                    "url": post_url or None,
                    "stage": "collect_comments",
                    "error_code": reason,
                    "message": _ERROR_STAGE_MESSAGES["collect_comments"],
                    "occurred_at": occurred_at,
                    "retryable": False,
                })
                break
            error_log.append({
                "url": post_url or None,
                "stage": "collect_comments",
                "error_code": "COMMENTS_UNAVAILABLE",
                "message": "公开评论采样不可用",
                "occurred_at": occurred_at,
                "retryable": False,
            })
            continue
        if not returned:
            outcome["empty_results"] += 1
            continue
        malformed = False
        for comment in returned[:per_post_limit]:
            record = _normalize_comment_record(
                comment, post_id, post_url, occurred_at
            )
            if record is None:
                malformed = True
                continue
            key = (post_id, record["comment_id"])
            if key in seen:
                continue
            seen.add(key)
            records.append(record)
        if malformed:
            outcome["failures"] += 1
            failed_parents.add(post_id)
            error_log.append({
                "url": post_url,
                "stage": "collect_comments",
                "error_code": "COMMENTS_UNAVAILABLE",
                "message": "公开评论响应包含无效记录",
                "occurred_at": occurred_at,
                "retryable": False,
            })
    if reservation is not None:
        reservation.verify_identity()
    if _write_comments_atomic(path, records, reservation=reservation):
        outcome["comments_collected"] = len(records)
    else:
        affected = {record["parent_post_id"] for record in records}
        outcome["failures"] += len(affected - failed_parents)
        outcome["comments_collected"] = 0
        error_log.append({
            "url": None,
            "stage": "persist_comments",
            "error_code": "COMMENTS_UNAVAILABLE",
            "message": "评论产物写入失败",
            "occurred_at": occurred_at,
            "retryable": False,
        })
    return outcome


def _post_key(p: dict) -> str:
    """增量去重主键:post_id > bvid > post_url。"""
    return str(p.get("post_id") or p.get("bvid") or p.get("post_url") or "")


def _resume_json_object(payload: bytes | None, label: str) -> dict:
    if payload is None:
        raise WorkspaceVerificationError(f"resume {label} is missing")
    try:
        value = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise WorkspaceVerificationError(
            f"resume {label} is invalid"
        ) from exc
    if not isinstance(value, dict):
        raise WorkspaceVerificationError(f"resume {label} is invalid")
    return value


def _validate_resume_identity(
    task_payload: bytes | None,
    profile_payload: bytes | None,
    *,
    expected_platform: str,
    expected_profile_url: str,
) -> None:
    task = _resume_json_object(task_payload, "task.json")
    profile = _resume_json_object(profile_payload, "source/profile.json")
    for value in (task, profile):
        if value.get("platform") != expected_platform:
            raise WorkspaceVerificationError("resume platform identity mismatch")
        profile_url = value.get("profile_url")
        if (
            profile_url != expected_profile_url
            or canonical_profile_url(expected_platform, profile_url)
            != expected_profile_url
        ):
            raise WorkspaceVerificationError(
                "resume profile identity mismatch"
            )


def _parse_resume_posts(
    posts_payload: bytes | None,
    csv_payload: bytes | None,
) -> list[dict]:
    def reject_constant(value: str):
        raise ValueError(f"non-standard numeric constant {value}")

    def reject_duplicate_keys(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate JSON key")
            value[key] = item
        return value

    if posts_payload is not None:
        try:
            text = posts_payload.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise WorkspaceVerificationError(
                "resume posts JSONL encoding is invalid"
            ) from exc
        if not text:
            return []
        posts: list[dict] = []
        lines = text.split("\n")
        if lines[-1] == "":
            lines.pop()
        for line_number, line in enumerate(lines, start=1):
            if line.endswith("\r"):
                line = line[:-1]
            if not line.strip():
                raise WorkspaceVerificationError(
                    f"resume posts JSONL line {line_number} is invalid"
                )
            try:
                value = json.loads(
                    line,
                    parse_constant=reject_constant,
                    object_pairs_hook=reject_duplicate_keys,
                )
            except (
                json.JSONDecodeError,
                MemoryError,
                RecursionError,
                ValueError,
            ) as exc:
                raise WorkspaceVerificationError(
                    f"resume posts JSONL line {line_number} is invalid"
                ) from exc
            if not isinstance(value, dict):
                raise WorkspaceVerificationError(
                    f"resume posts JSONL line {line_number} is not an object"
                )
            posts.append(value)
        return posts

    if csv_payload is None:
        raise WorkspaceVerificationError("resume posts artifact is missing")
    try:
        text = csv_payload.decode("utf-8")
        if "\x00" in text:
            raise ValueError("NUL is not valid CSV text")
        with io.StringIO(text, newline="") as handle:
            reader = csv.DictReader(handle, strict=True)
            fieldnames = reader.fieldnames
            if (
                not fieldnames
                or any(
                    not isinstance(field, str) or not field
                    for field in fieldnames
                )
                or len(set(fieldnames)) != len(fieldnames)
            ):
                raise ValueError("resume CSV header is invalid")
            rows = []
            for row in reader:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("resume CSV row shape is invalid")
                rows.append(deserialize_csv_row(row))
            return rows
    except (UnicodeDecodeError, csv.Error, TypeError, ValueError) as exc:
        raise WorkspaceVerificationError("resume CSV artifact is invalid") from exc


def _load_committed_resume(
    ws: str,
    *,
    expected_platform: str,
    expected_profile_url: str,
) -> tuple[list[dict], str, str]:
    with VerifiedWorkspaceReader.open(
        ws, allowed_artifacts=_PUBLIC_ARTIFACTS
    ) as reader:
        manifested = {
            item["path"] for item in reader.manifest.get("artifacts", [])
        }
        task = reader.read("task.json")
        profile = reader.read("source/profile.json")
        _validate_resume_identity(
            task.payload,
            profile.payload,
            expected_platform=expected_platform,
            expected_profile_url=expected_profile_url,
        )
        posts_payload = None
        csv_payload = None
        if "source/posts.jsonl" in manifested:
            posts_payload = reader.read(
                "source/posts.jsonl", max_bytes=_MAX_RESUME_ARTIFACT_BYTES
            ).payload
        elif "normalized-posts.csv" in manifested:
            csv_payload = reader.read(
                "normalized-posts.csv", max_bytes=_MAX_RESUME_ARTIFACT_BYTES
            ).payload
        reader.verify_unchanged()
        return (
            _parse_resume_posts(posts_payload, csv_payload),
            reader.source_format,
            reader.source_digest,
        )


def _load_existing_posts(
    ws: str,
    *,
    expected_platform: str,
    expected_profile_url: str,
) -> tuple[list[dict], str, str]:
    """Read posts from one identity-bound committed resume workspace."""
    return _load_committed_resume(
        os.path.abspath(ws),
        expected_platform=expected_platform,
        expected_profile_url=expected_profile_url,
    )


def _canonical_resume_identity(url: str) -> tuple[str, str]:
    routing_url = sanitize_routing_url(url)
    if routing_url is None:
        raise WorkspaceVerificationError("resume URL is invalid")
    matches = [
        (platform, canonical)
        for platform in ("bilibili", "douyin", "weibo", "xiaohongshu")
        if (canonical := canonical_profile_url(platform, routing_url)) is not None
    ]
    if len(matches) != 1:
        raise WorkspaceVerificationError(
            "resume requires one canonical account profile URL"
        )
    return matches[0]


def _latest_published_at(posts: list[dict]) -> str | None:
    """返回既有帖子中最新(published_at 最大)的 ISO 字符串;无法解析则 None。"""

    def parse(iso):
        if not iso:
            return None
        try:
            return datetime.fromisoformat(iso)
        except (ValueError, TypeError):
            return None

    best, best_dt = None, None
    for p in posts:
        dt = parse(p.get("published_at"))
        if dt is not None and (best_dt is None or dt > best_dt):
            best_dt, best = dt, p.get("published_at")
    return best


def _merge_incremental(existing: list[dict], new: list[dict]) -> tuple[list[dict], int]:
    """合并既有与新抓取的帖子,按 post_id/bvid 去重(新抓取覆盖旧)。

    返回 (合并后列表, 新增条数)。无主键的帖子直接追加,不参与去重。
    """
    merged_map: dict[str, dict] = {}
    for p in existing:
        k = _post_key(p)
        if k:
            merged_map[k] = p
    kept_no_key: list[dict] = []
    new_count = 0
    for p in new:
        k = _post_key(p)
        if not k:
            kept_no_key.append(p)
            continue
        if k not in merged_map:
            new_count += 1
        merged_map[k] = p  # 新覆盖旧(指标可能更新)
    return list(merged_map.values()) + kept_no_key, new_count


def _ensure_post_collection_status_contract(posts: list[dict]) -> None:
    """Make directly persisted or resumed rows obey the status contract.

    Normal collectors already pass rows through ``BaseCollector.normalize_post``.
    This boundary guard also covers committed resume artifacts and third-party
    adapters that return raw rows directly, without silently promoting an
    absent or invalid status to success.
    """
    for post in posts:
        if not isinstance(post, dict):
            continue
        status, derived_source = BaseCollector._canon_status_with_source(
            post.get("collection_status")
        )
        supplied_source = post.get("collection_status_source")
        if (
            derived_source == "declared"
            and (
                supplied_source == "declared"
                or (
                    status == "PARTIAL"
                    and supplied_source in {"inferred_missing", "inferred_invalid"}
                )
            )
        ):
            status_source = supplied_source
        else:
            status_source = derived_source
        post["collection_status"] = status
        post["collection_status_source"] = status_source


def _sanitize_collection_coverage(value) -> dict:
    """Enforce the persisted coverage allowlist at the workspace boundary."""
    if not isinstance(value, dict):
        return {}
    clean = {}
    requested_all = value.get("requested_all") is True
    terminal_observed = value.get("terminal_page_observed") is True
    clean["requested_all"] = requested_all
    clean["terminal_page_observed"] = terminal_observed
    for key in (
        "browser_fallback_requested",
        "browser_fallback_launched",
        "page_context_fallback_used",
        "dynamic_terminal_page_observed",
    ):
        if type(value.get(key)) is bool:
            clean[key] = value[key]
    evidence_source = value.get("browser_evidence_source")
    if evidence_source in {"none", "network", "dom", "network+dom"}:
        clean["browser_evidence_source"] = evidence_source
    restriction_source = value.get("restriction_source")
    restriction_marker = value.get("restriction_marker")
    if (
        restriction_source == DOUYIN_BROWSER_VISIBLE_RESTRICTION_SOURCE
        and restriction_marker
        in DOUYIN_BROWSER_VISIBLE_RESTRICTION_MARKER_VALUES
    ):
        clean["restriction_source"] = restriction_source
        clean["restriction_marker"] = restriction_marker
    for key in (
        "max_items",
        "observed_page_count",
        "observed_post_count",
        "cursor_fingerprint_count",
        "repeated_cursor_count",
        "range_match_count",
        "unknown_date_count",
        "page_context_request_count",
    ):
        field_value = value.get(key)
        if isinstance(field_value, int) and not isinstance(field_value, bool):
            if key == "max_items":
                if 1 <= field_value <= PUBLIC_ALL_HARD_MAX_ITEMS:
                    clean[key] = field_value
            else:
                clean[key] = max(0, field_value)
    regular_source = value.get("regular_source")
    if regular_source in _BILIBILI_REGULAR_SOURCES:
        clean["regular_source"] = regular_source
    dynamic_status = value.get("dynamic_status")
    if dynamic_status in _BILIBILI_DYNAMIC_STATUSES:
        clean["dynamic_status"] = dynamic_status
    for key in ("regular_observed_count", "dynamic_observed_count"):
        field_value = value.get(key)
        if (
            isinstance(field_value, int)
            and not isinstance(field_value, bool)
            and field_value >= 0
        ):
            clean[key] = field_value
    scroll_rounds = value.get("scroll_rounds")
    if (
        isinstance(scroll_rounds, int)
        and not isinstance(scroll_rounds, bool)
        and 0 <= scroll_rounds <= PUBLIC_ALL_HARD_MAX_SCROLLS
    ):
        clean["scroll_rounds"] = scroll_rounds
    max_scrolls = value.get("max_scrolls")
    if (
        isinstance(max_scrolls, int)
        and not isinstance(max_scrolls, bool)
        and 1 <= max_scrolls <= PUBLIC_ALL_HARD_MAX_SCROLLS
    ):
        clean["max_scrolls"] = max_scrolls
    max_seconds = value.get("max_seconds")
    if (
        isinstance(max_seconds, (int, float))
        and not isinstance(max_seconds, bool)
        and 0 < max_seconds <= PUBLIC_ALL_HARD_MAX_SECONDS
    ):
        clean["max_seconds"] = float(max_seconds)
    stop_condition = value.get("stop_condition")
    if isinstance(stop_condition, str) and stop_condition in {
        "terminal_page",
        "idle",
        "timeout",
        "repeated_cursor",
        "max_items",
        "max_scrolls",
        "date_lower_bound",
        "limit",
    }:
        clean["stop_condition"] = stop_condition
    dynamic_stop_condition = value.get("dynamic_stop_condition")
    if dynamic_stop_condition in {
        "terminal_page",
        "idle",
        "repeated_cursor",
        "max_items",
        "date_lower_bound",
    }:
        clean["dynamic_stop_condition"] = dynamic_stop_condition
    clean["is_exhaustive"] = bool(
        value.get("is_exhaustive") is True
        and requested_all
        and terminal_observed
        and stop_condition == "terminal_page"
    )
    range_filter_applied = value.get("range_filter_applied") is True
    range_match_count = clean.get("range_match_count")
    clean["range_filter_applied"] = range_filter_applied
    clean["range_no_match"] = bool(
        value.get("range_no_match") is True
        and range_filter_applied
        and clean.get("observed_post_count", 0) > 0
        and range_match_count == 0
    )
    return clean


def _safe_public_url(value) -> str | None:
    """Return a credential/query/fragment-free public URL for output fields."""
    if not isinstance(value, str):
        return None
    try:
        parsed = urllib.parse.urlparse(value)
        hostname = parsed.hostname
        if (
            parsed.scheme != "https"
            or not hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.port is not None
        ):
            return None
    except ValueError:
        return None
    return urllib.parse.urlunsplit(("https", hostname.lower(), parsed.path or "/", "", ""))


def _safe_stop_reason(value) -> str:
    return (
        value
        if isinstance(value, str) and value in _KNOWN_STOP_REASONS
        else SR_INTERNAL
    )


def _safe_timestamp(value) -> str | None:
    if not isinstance(value, str) or len(value) > 64:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return value if parsed.tzinfo is not None else None


def _safe_diagnostic_code(value) -> str | None:
    if (
        isinstance(value, str)
        and re.fullmatch(r"[A-Z][A-Z0-9_]{0,63}", value)
    ):
        return value
    return None


def _safe_platform_response_code(value) -> int | None:
    """Keep a bounded numeric platform code without response text or headers."""
    if (
        isinstance(value, int)
        and not isinstance(value, bool)
        and -999_999 <= value <= 999_999
    ):
        return value
    return None


def _sanitize_report_error(value) -> dict:
    """Map an internal/adaptor error to the report's fixed public vocabulary."""
    source = value if isinstance(value, dict) else {}
    stage = source.get("stage")
    if not isinstance(stage, str) or stage not in _ERROR_STAGE_MESSAGES:
        stage = "check_access"
    error_code = source.get("error_code")
    if not isinstance(error_code, str) or error_code not in _REPORT_ERROR_CODES:
        error_code = SR_INTERNAL
    clean = {
        "stage": stage,
        "error_code": error_code,
        "url": _safe_public_url(source.get("url")),
        "message": _ERROR_STAGE_MESSAGES[stage],
        "occurred_at": _safe_timestamp(source.get("occurred_at")),
    }
    diagnostic_code = _safe_diagnostic_code(source.get("diagnostic_code"))
    if diagnostic_code is not None:
        clean["diagnostic_code"] = diagnostic_code
    platform_response_code = _safe_platform_response_code(
        source.get("platform_response_code")
    )
    if platform_response_code is not None:
        clean["platform_response_code"] = platform_response_code
    return clean


def _canonical_checkpoint_json(value: object) -> bytes:
    """Serialize checkpoint-bound values with one stable JSON encoding."""
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    except (TypeError, ValueError) as exc:
        raise WorkspaceWriteError("checkpoint payload is invalid") from exc
    return text.encode("utf-8")


def _checkpoint_parameters(
    *,
    requested_limit: int,
    date_from: str | None,
    date_to: str | None,
    include_comments: bool,
    enrich_details: bool,
    collect_all: bool,
    max_items: int | None,
    max_seconds: float | None,
    max_scrolls: int | None,
    analysis_goal: str | None,
    browser_fallback: bool | None,
) -> dict:
    """Return the exact user-visible parameters bound to one checkpoint."""
    return {
        "requested_limit": requested_limit,
        "date_from": date_from,
        "date_to": date_to,
        "include_comments": include_comments,
        "enrich_details": enrich_details,
        "collect_all": collect_all,
        "max_items": max_items,
        "max_seconds": max_seconds,
        "max_scrolls": max_scrolls,
        "analysis_goal": analysis_goal,
        "browser_fallback": browser_fallback,
    }


def _strict_checkpoint_object(payload: bytes) -> dict:
    """Decode checkpoint metadata without duplicate keys or non-JSON numbers."""
    def reject_constant(value: str):
        raise ValueError(f"non-standard numeric constant {value}")

    def reject_duplicate_keys(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate JSON key")
            value[key] = item
        return value

    try:
        value = json.loads(
            payload.decode("utf-8"),
            parse_constant=reject_constant,
            object_pairs_hook=reject_duplicate_keys,
        )
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        MemoryError,
        RecursionError,
        ValueError,
    ) as exc:
        raise WorkspaceVerificationError("checkpoint metadata is invalid") from exc
    if not isinstance(value, dict):
        raise WorkspaceVerificationError("checkpoint metadata is invalid")
    return value


def _write_collection_checkpoint(
    path: str,
    *,
    platform: str,
    profile_url: str,
    parameters: dict,
    posts: list[dict],
    collected_at: str,
    stop_reason: str | None,
    diagnostic_code: str | None,
    collection_coverage: dict,
    error_log: list[dict],
) -> str:
    """Create and seal one post-list checkpoint; never update an old one."""
    posts_payload = b"".join(
        _canonical_checkpoint_json(post) + b"\n" for post in posts
    )
    parameter_payload = _canonical_checkpoint_json(parameters)
    metadata = {
        "format": _CHECKPOINT_FORMAT,
        "stage": _CHECKPOINT_STAGE,
        "platform": platform,
        "profile_url": profile_url,
        "parameters": parameters,
        "parameters_sha256": hashlib.sha256(parameter_payload).hexdigest(),
        "posts": {
            "path": "source/posts.jsonl",
            "digest_algorithm": "sha256",
            "digest": hashlib.sha256(posts_payload).hexdigest(),
            "count": len(posts),
        },
        "collected_at": _safe_timestamp(collected_at),
        "stop_reason": (
            _safe_stop_reason(stop_reason) if stop_reason is not None else None
        ),
        "diagnostic_code": _safe_diagnostic_code(diagnostic_code),
        "collection_coverage": _sanitize_collection_coverage(
            collection_coverage
        ),
        "errors": [_sanitize_report_error(error) for error in error_log],
    }
    reservation = _track_reservation(
        ImmutableWorkspace.reserve(
            os.path.abspath(path), allowed_artifacts=_CHECKPOINT_ARTIFACTS
        )
    )
    try:
        with reservation.open_binary("source/posts.jsonl") as handle:
            handle.write(posts_payload)
        with reservation.open_binary("checkpoint.json") as handle:
            handle.write(_canonical_checkpoint_json(metadata) + b"\n")
        return reservation.commit()
    finally:
        reservation.close()


def _load_collection_checkpoint(
    path: str,
    *,
    expected_platform: str,
    expected_profile_url: str,
    expected_parameters: dict,
) -> dict:
    """Verify and read one explicitly sealed post-list checkpoint."""
    with VerifiedWorkspaceReader.open(
        os.path.abspath(path), allowed_artifacts=_CHECKPOINT_ARTIFACTS
    ) as reader:
        metadata_payload = reader.read("checkpoint.json").payload
        posts_payload = reader.read(
            "source/posts.jsonl", max_bytes=_MAX_RESUME_ARTIFACT_BYTES
        ).payload
        reader.verify_unchanged()
        source_digest = reader.source_digest

    metadata = _strict_checkpoint_object(metadata_payload)
    required_keys = {
        "format",
        "stage",
        "platform",
        "profile_url",
        "parameters",
        "parameters_sha256",
        "posts",
        "collected_at",
        "stop_reason",
        "diagnostic_code",
        "collection_coverage",
        "errors",
    }
    if set(metadata) != required_keys:
        raise WorkspaceVerificationError("checkpoint metadata is invalid")
    if (
        metadata.get("format") != _CHECKPOINT_FORMAT
        or metadata.get("stage") != _CHECKPOINT_STAGE
        or metadata.get("platform") != expected_platform
        or metadata.get("profile_url") != expected_profile_url
        or canonical_profile_url(expected_platform, metadata.get("profile_url"))
        != expected_profile_url
    ):
        raise WorkspaceVerificationError("checkpoint identity mismatch")

    parameters = metadata.get("parameters")
    if not isinstance(parameters, dict):
        raise WorkspaceVerificationError("checkpoint parameters are invalid")
    parameter_payload = _canonical_checkpoint_json(parameters)
    parameter_digest = metadata.get("parameters_sha256")
    if (
        not isinstance(parameter_digest, str)
        or parameter_digest != hashlib.sha256(parameter_payload).hexdigest()
        or parameter_payload != _canonical_checkpoint_json(expected_parameters)
    ):
        raise WorkspaceVerificationError("checkpoint parameters mismatch")

    posts_metadata = metadata.get("posts")
    if (
        not isinstance(posts_metadata, dict)
        or set(posts_metadata)
        != {"path", "digest_algorithm", "digest", "count"}
        or posts_metadata.get("path") != "source/posts.jsonl"
        or posts_metadata.get("digest_algorithm") != "sha256"
        or not isinstance(posts_metadata.get("digest"), str)
        or posts_metadata.get("digest")
        != hashlib.sha256(posts_payload).hexdigest()
        or not isinstance(posts_metadata.get("count"), int)
        or isinstance(posts_metadata.get("count"), bool)
        or posts_metadata.get("count") < 0
    ):
        raise WorkspaceVerificationError("checkpoint posts binding is invalid")
    posts = _parse_resume_posts(posts_payload, None)
    if len(posts) != posts_metadata["count"]:
        raise WorkspaceVerificationError("checkpoint posts count changed")
    deduplicated, duplicate_count = dedup_posts(posts)
    if duplicate_count or len(deduplicated) != len(posts):
        raise WorkspaceVerificationError("checkpoint posts are not unique")
    if any(
        post.get("platform") != expected_platform or not _post_key(post)
        for post in posts
    ):
        raise WorkspaceVerificationError("checkpoint post identity is invalid")

    stop_reason = metadata.get("stop_reason")
    if stop_reason is not None:
        stop_reason = _safe_stop_reason(stop_reason)
    diagnostic_code = _safe_diagnostic_code(metadata.get("diagnostic_code"))
    errors = metadata.get("errors")
    if not isinstance(errors, list) or any(
        not isinstance(error, dict) for error in errors
    ):
        raise WorkspaceVerificationError("checkpoint errors are invalid")
    return {
        "posts": posts,
        "source_format": _CHECKPOINT_FORMAT,
        "source_digest": source_digest,
        "stop_reason": stop_reason,
        "diagnostic_code": diagnostic_code,
        "collection_coverage": _sanitize_collection_coverage(
            metadata.get("collection_coverage")
        ),
        "error_log": [_sanitize_report_error(error) for error in errors],
    }


def _write_task_json(
    ws: str,
    *,
    platform: str,
    task_id: str,
    analysis_goal: str | None,
    profile_url: str,
    requested_limit: int,
    date_from: str | None,
    date_to: str | None,
    include_comments: bool,
    enrich_details: bool = False,
    task_status: str,
    stop_reason: str | None,
    collected_count: int,
    collected_at: str,
    incremental: bool = False,
    existing_count: int = 0,
    new_count: int = 0,
    resume_source_format: str | None = None,
    resume_source_digest: str | None = None,
    checkpoint_source_format: str | None = None,
    checkpoint_source_digest: str | None = None,
    collection_coverage: dict | None = None,
    comment_collection: dict | None = None,
    diagnostic_code: str | None = None,
    platform_response_code: int | None = None,
    execution_timing: dict,
    reservation: _WorkspaceReservation | None = None,
) -> None:
    """落盘 task.json(任务状态与停止原因,见 SKILL.md「任务状态与停止原因」)。"""
    payload = {
        "task_id": task_id,
        "skill_release": skill_release(),
        "skill_contract_sha256": skill_contract_sha256(),
        "platform": platform,
        "profile_url": _safe_public_url(profile_url),
        "requested_limit": requested_limit,
        "date_from": date_from,
        "date_to": date_to,
        "analysis_goal": analysis_goal,
        "include_comments": include_comments,
        "enrich_details": enrich_details,
        "task_status": task_status,
        "stop_reason": (
            _safe_stop_reason(stop_reason) if stop_reason is not None else None
        ),
        "diagnostic_code": _safe_diagnostic_code(diagnostic_code),
        "platform_response_code": _safe_platform_response_code(
            platform_response_code
        ),
        "collected_count": collected_count,
        "collected_at": _safe_timestamp(collected_at),
        "incremental": incremental,
        "existing_count": existing_count,
        "new_count": new_count,
        "resume_source": (
            {
                "format": resume_source_format,
                "digest_algorithm": "sha256",
                "digest": resume_source_digest,
            }
            if resume_source_format is not None
            and resume_source_digest is not None
            else None
        ),
        "checkpoint_source": (
            {
                "format": checkpoint_source_format,
                "digest_algorithm": "sha256",
                "digest": checkpoint_source_digest,
            }
            if checkpoint_source_format is not None
            and checkpoint_source_digest is not None
            else None
        ),
        "collection_coverage": _sanitize_collection_coverage(collection_coverage),
        "comment_collection": comment_collection or {},
        "started_at": execution_timing["started_at"],
        "ended_at": execution_timing["ended_at"],
        "duration_ms": execution_timing["duration_ms"],
        "phase_durations_ms": execution_timing["phase_durations_ms"],
    }
    handle = (
        reservation.open_text("task.json")
        if reservation is not None
        else open(os.path.join(ws, "task.json"), "w", encoding="utf-8")
    )
    with handle as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _write_report(
    adapter,
    url: str,
    profile: dict,
    posts: list[dict],
    ws: str,
    *,
    task_status: str,
    stop_reason: str | None,
    error_log: list[dict],
    incremental: bool = False,
    existing_count: int = 0,
    new_count: int = 0,
    collection_coverage: dict | None = None,
    comment_collection: dict | None = None,
    reservation: _WorkspaceReservation | None = None,
) -> None:
    """生成采集质量报告(含停止位置、成功/失败数量、字段覆盖率、错误日志)。"""
    safe_errors = [_sanitize_report_error(error) for error in error_log]
    safe_stop_reason = _safe_stop_reason(stop_reason) if stop_reason else None
    stop_stage = next(
        (
            error.get("stage")
            for error in safe_errors
            if error.get("error_code") == safe_stop_reason
        ),
        None,
    )
    success_count = sum(
        1 for post in posts if post.get("collection_status") == "SUCCESS"
    )
    partial_count = sum(
        1 for post in posts if post.get("collection_status") == "PARTIAL"
    )
    unavailable_count = sum(
        1
        for post in posts
        if post.get("collection_status") in {"FAILED", "DELETED", "RESTRICTED"}
    )
    lines = [
        "# 采集质量报告",
        "",
        f"- 平台: {adapter.platform}",
        f"- 账号: {_safe_public_url(url)}",
        f"- 采集时间: {datetime.now(_BEIJING).isoformat()}",
        f"- 任务状态 task_status: {task_status}",
        "- 停止原因 stop_reason: "
        f"{_safe_stop_reason(stop_reason) if stop_reason else 'null'}",
        f"- 资料 field_visibility 可见字段数: {_vis_count(profile)}",
        f"- 内容条数: {len(posts)}",
        f"- 成功采集内容数: {success_count}",
        f"- 部分采集内容数: {partial_count}",
        f"- 删除/失败/受限内容数: {unavailable_count}",
        f"- 错误或受限事件数: {len(safe_errors)}",
        f"- 停止阶段: {stop_stage if stop_stage else 'null'}",
    ]
    if incremental:
        lines.append(f"- 增量续采: 是(既有 {existing_count} 条 + 新增 {new_count} 条)")
    lines.append("")
    lines.append("## 覆盖与完备性")
    lines.append("")
    coverage = _sanitize_collection_coverage(collection_coverage)
    if coverage:
        for key, value in coverage.items():
            rendered = json.dumps(value, ensure_ascii=False)
            lines.append(f"- {key}: {rendered}")
    else:
        lines.append("- collection_coverage: {}")
    if comment_collection:
        lines.append("")
        lines.append("## 评论采集")
        lines.append("")
        for key, value in comment_collection.items():
            lines.append(f"- {key}: {value}")
    lines.append("")
    if posts:
        for fld in ("views", "likes", "comments", "favorites", "shares", "coins", "danmaku"):
            visible = sum(1 for p in posts if p.get(fld) is not None)
            lines.append(f"- 指标 {fld}: {visible}/{len(posts)} 可见")
    if safe_errors:
        lines.append("")
        lines.append("## 错误日志")
        lines.append("")
        for e in safe_errors:
            diagnostic_code = e.get("diagnostic_code")
            diagnostic = (
                f" diagnostic_code={diagnostic_code}"
                if isinstance(diagnostic_code, str) and diagnostic_code
                else ""
            )
            platform_response_code = _safe_platform_response_code(
                e.get("platform_response_code")
            )
            platform_diagnostic = (
                f" platform_response_code={platform_response_code}"
                if platform_response_code is not None
                else ""
            )
            lines.append(
                f"- stage={e.get('stage')} error_code={e.get('error_code')} "
                f"url={e.get('url')} message={e.get('message')} occurred_at={e.get('occurred_at')}"
                f"{diagnostic}{platform_diagnostic}"
            )
    handle = (
        reservation.open_text("collection-report.md")
        if reservation is not None
        else open(
            os.path.join(ws, "collection-report.md"), "w", encoding="utf-8"
        )
    )
    with handle as f:
        f.write("\n".join(lines) + "\n")


def _guard_workspace_reservations(function):
    """Close every reservation created by one run, including exceptional exits."""

    @functools.wraps(function)
    def guarded(*args, **kwargs):
        active: list[_WorkspaceReservation] = []
        token = _ACTIVE_RESERVATIONS.set(active)
        try:
            return function(*args, **kwargs)
        except WorkspaceCommitIndeterminate:
            print(_INDETERMINATE_MESSAGE, file=sys.stderr)
            return _INDETERMINATE_EXIT_CODE
        except (
            WorkspaceCapabilityError,
            WorkspaceExistsError,
            WorkspaceIdentityError,
            WorkspaceVerificationError,
        ):
            print("[FAILED] 输出目录不安全、已占用或身份已改变", file=sys.stderr)
            return 2
        except WorkspaceError:
            print("[FAILED] 产物序列化或提交失败", file=sys.stderr)
            return 3
        except Exception:
            print("[FAILED] 产物序列化或发布失败", file=sys.stderr)
            return 3
        finally:
            for reservation in reversed(active):
                reservation.close()
            _ACTIVE_RESERVATIONS.reset(token)

    return guarded


@_guard_workspace_reservations
def run(
    url: str,
    limit: int = PUBLIC_LIMIT_DEFAULT,
    out_dir: str | None = None,
    include_comments: bool = False,
    date_from: str | None = None,
    date_to: str | None = None,
    resume: bool = False,
    resume_out: str | None = None,
    since: str | None = None,
    browser_fallback: bool | None = None,
    collect_all: bool = False,
    max_items: int | None = None,
    max_seconds: float | None = None,
    max_scrolls: int | None = None,
    enrich_details: bool = False,
    analysis_goal: str | None = None,
    checkpoint_out: str | None = None,
    resume_checkpoint: str | None = None,
    douyin_cookie_file: str | None = None,
    bilibili_cookie_file: str | None = None,
    weibo_cookie_file: str | None = None,
    xiaohongshu_cookie_file: str | None = None,
    persist_cookie: bool = False,
    cookie_workspace_root: str | None = None,
    redirect_resolver=None,
) -> int:
    execution_timer = ExecutionTimer(wall_timezone=_BEIJING)
    try:
        analysis_goal = validate_analysis_goal(analysis_goal)
    except TaskContractError:
        print("[FAILED] analysis_goal 参数无效", file=sys.stderr)
        return 2
    try:
        url = canonicalize_entry_url(url, redirect_resolver)
    except (ValueError, OSError):
        print("[FAILED] B站短链未解析到受支持的公开账号主页", file=sys.stderr)
        return 2
    if resume and not out_dir:
        print("[FAILED] 增量续采(--resume)必须配合 --out 指定既有任务目录", file=sys.stderr)
        return 2
    if resume_out is not None and not resume:
        print("[FAILED] --resume-out 必须与 --resume 联用", file=sys.stderr)
        return 2
    if (
        resume
        and resume_out is not None
        and os.path.abspath(str(out_dir)) == os.path.abspath(resume_out)
    ):
        print("[FAILED] --resume-out 必须不同于只读的 --out", file=sys.stderr)
        return 2
    if since is not None and not resume:
        print("[FAILED] --since 必须与 --resume 联用", file=sys.stderr)
        return 2
    if checkpoint_out is not None and resume_checkpoint is not None:
        print("[FAILED] --checkpoint-out 与 --resume-checkpoint 不能联用", file=sys.stderr)
        return 2
    if (checkpoint_out is not None or resume_checkpoint is not None) and not out_dir:
        print("[FAILED] checkpoint 模式必须显式指定新的 --out", file=sys.stderr)
        return 2
    if (checkpoint_out is not None or resume_checkpoint is not None) and (
        resume or resume_out is not None or since is not None
    ):
        print("[FAILED] checkpoint 恢复不能与增量 --resume 混用", file=sys.stderr)
        return 2

    budget_was_supplied = any(
        value is not None for value in (max_items, max_seconds, max_scrolls)
    )
    try:
        if collect_all:
            if validate_public_limit(limit) != PUBLIC_LIMIT_DEFAULT:
                raise ValueError("--all cannot be combined with a non-default limit")
            max_items = (
                PUBLIC_ALL_DEFAULT_MAX_ITEMS if max_items is None else max_items
            )
            max_seconds = (
                PUBLIC_ALL_DEFAULT_MAX_SECONDS if max_seconds is None else max_seconds
            )
            max_scrolls = (
                PUBLIC_ALL_DEFAULT_MAX_SCROLLS if max_scrolls is None else max_scrolls
            )
            max_items, max_seconds, max_scrolls = validate_public_all_budgets(
                max_items, max_seconds, max_scrolls
            )
        else:
            limit = validate_public_limit(limit)
            if budget_was_supplied:
                raise ValueError("--all budgets require --all")
    except ValueError as exc:
        print(f"[FAILED] 参数无效: {exc}", file=sys.stderr)
        return 2
    requested_count = max_items if collect_all else limit

    if out_dir:
        try:
            _preflight_explicit_workspace(out_dir, resume=resume)
        except WorkspaceContractError:
            print("[FAILED] 输出目录不安全或已包含其他任务数据", file=sys.stderr)
            return 2
    if resume_out is not None:
        try:
            _preflight_explicit_workspace(resume_out, resume=False)
            reject_workspace_overlap(str(out_dir), resume_out)
        except WorkspaceContractError:
            print("[FAILED] 续采输出目录不安全或已被占用", file=sys.stderr)
            return 2
    if checkpoint_out is not None:
        try:
            _preflight_explicit_workspace(checkpoint_out, resume=False)
            _reject_lexical_workspace_overlap(str(out_dir), checkpoint_out)
        except WorkspaceContractError:
            print("[FAILED] checkpoint 输出目录不安全或已被占用", file=sys.stderr)
            return 2
    if resume_checkpoint is not None:
        try:
            _preflight_explicit_workspace(resume_checkpoint, resume=True)
            reject_workspace_overlap(resume_checkpoint, str(out_dir))
        except WorkspaceContractError:
            print("[FAILED] checkpoint 来源或输出目录不安全", file=sys.stderr)
            return 2

    user_from = _parse_date(date_from)
    user_to = _default_date_to(date_to)
    explicit_since = _default_date_to(since) if since is not None else None
    if date_from is not None and user_from is None:
        print("[FAILED] --date-from 无法解析", file=sys.stderr)
        return 2
    if date_to is not None and user_to is None:
        print("[FAILED] --date-to 无法解析", file=sys.stderr)
        return 2
    if since is not None and explicit_since is None:
        print("[FAILED] --since 无法解析", file=sys.stderr)
        return 2
    existing_posts: list[dict] = []
    resume_source_format: str | None = None
    resume_source_digest: str | None = None
    resume_platform: str | None = None
    resume_profile_url: str | None = None
    resume_mode = bool(resume)
    if resume_mode:
        try:
            resume_platform, resume_profile_url = _canonical_resume_identity(url)
            (
                existing_posts,
                resume_source_format,
                resume_source_digest,
            ) = _load_existing_posts(
                str(out_dir),
                expected_platform=resume_platform,
                expected_profile_url=resume_profile_url,
            )
        except (OSError, WorkspaceContractError):
            print("[FAILED] 增量续采目录无法安全读取", file=sys.stderr)
            return 2
        if not existing_posts:
            print(f"[warn] --resume 指定目录无既有帖子数据,退化为全量采集: {out_dir}", file=sys.stderr)
            resume_mode = False
        else:
            latest = _latest_published_at(existing_posts)
            since_iso = explicit_since if since is not None else _parse_date(latest)
            if since_iso and (user_from is None or since_iso > user_from):
                user_from = since_iso
    if user_from and user_to:
        if datetime.fromisoformat(user_from) > datetime.fromisoformat(user_to):
            print("[FAILED] --date-from 不能晚于 --date-to", file=sys.stderr)
            return 2

    checkpoint_parameters = _checkpoint_parameters(
        requested_limit=requested_count,
        date_from=user_from,
        date_to=user_to,
        include_comments=include_comments,
        enrich_details=enrich_details,
        collect_all=collect_all,
        max_items=max_items if collect_all else None,
        max_seconds=max_seconds if collect_all else None,
        max_scrolls=max_scrolls if collect_all else None,
        analysis_goal=analysis_goal,
        browser_fallback=browser_fallback,
    )
    checkpoint_state: dict | None = None
    checkpoint_platform: str | None = None
    checkpoint_profile_url: str | None = None
    checkpoint_source_format: str | None = None
    checkpoint_source_digest: str | None = None
    if resume_checkpoint is not None:
        try:
            checkpoint_platform, checkpoint_profile_url = (
                _canonical_resume_identity(url)
            )
            checkpoint_state = _load_collection_checkpoint(
                resume_checkpoint,
                expected_platform=checkpoint_platform,
                expected_profile_url=checkpoint_profile_url,
                expected_parameters=checkpoint_parameters,
            )
            checkpoint_source_format = checkpoint_state["source_format"]
            checkpoint_source_digest = checkpoint_state["source_digest"]
        except (OSError, WorkspaceContractError):
            print("[FAILED] checkpoint 无法安全核验", file=sys.stderr)
            return 2

    from collectors.cookie_loader import (
        load_cookie_records,
        load_cached_cookie_records,
        save_cookie_records,
        cached_cookie_record_exists,
    )

    cookie_files = {
        "bilibili": (bilibili_cookie_file, "B站"),
        "douyin": (douyin_cookie_file, "抖音"),
        "weibo": (weibo_cookie_file, "微博"),
        "xiaohongshu": (xiaohongshu_cookie_file, "小红书"),
    }
    loaded_cookie_records: dict[str, tuple[dict[str, Any], ...]] = {}
    explicit_cookie_provided: set[str] = set()
    for platform, (cookie_file, platform_label) in cookie_files.items():
        if cookie_file is None:
            loaded_cookie_records[platform] = ()
            continue
        try:
            loaded_cookie_records[platform] = load_cookie_records(
                cookie_file, platform
            )
            explicit_cookie_provided.add(platform)
        except Exception:
            print(
                f"[FAILED] {platform_label} Cookie 文件无效或无法安全读取",
                file=sys.stderr,
            )
            return 2
    cache_root = cookie_workspace_root or _repository_root_cookie_root()
    if cache_root is not None:
        for platform, records in loaded_cookie_records.items():
            if records:
                continue
            cache_path = os.path.join(cache_root, f"{platform}-cookies.json")
            if not cached_cookie_record_exists(cache_root, platform):
                continue
            cached = load_cached_cookie_records(cache_root, platform)
            if cached:
                loaded_cookie_records[platform] = cached
                print(
                    f"[echo] {platform} Cookie 已从 {cache_path} 自动加载",
                    file=sys.stderr,
                )
            else:
                print(
                    f"[warn] {platform} Cookie 缓存文件 {cache_path} 已存在但无法安全解析,"
                    f"本次任务忽略。需要时删除该文件并重新提供。",
                    file=sys.stderr,
                )
    bilibili_cookie_records = loaded_cookie_records["bilibili"]
    douyin_cookie_records = loaded_cookie_records["douyin"]
    weibo_cookie_records = loaded_cookie_records["weibo"]
    xiaohongshu_cookie_records = loaded_cookie_records["xiaohongshu"]

    env_value = os.environ.get("SOCIAL_BROWSER_FALLBACK")
    if env_value is not None and env_value not in {"0", "1"}:
        print(
            "[FAILED] SOCIAL_BROWSER_FALLBACK 只接受 0 或 1",
            file=sys.stderr,
        )
        return 2
    douyin_enabled = browser_fallback if browser_fallback is not None else env_value != "0"
    # Keep the default zero-argument loader call compatible with integrations
    # that replace it, while passing the policy only when it disables Douyin.
    if (
        bilibili_cookie_records
        or douyin_cookie_records
        or weibo_cookie_records
        or xiaohongshu_cookie_records
    ):
        adapters = _load_adapters(
            douyin_browser_fallback=True,
            bilibili_browser_fallback=browser_fallback,
            bilibili_cookie_records=bilibili_cookie_records,
            douyin_cookie_records=douyin_cookie_records,
            weibo_cookie_records=weibo_cookie_records,
            xiaohongshu_cookie_records=xiaohongshu_cookie_records,
            xiaohongshu_browser_fallback=(
                browser_fallback if browser_fallback is not None else env_value != "0"
            ),
        )
    elif browser_fallback is not None:
        # Preserve the legacy Bilibili configuration value for API compatibility.
        # Bilibili never uses it after a platform-protection response; the CLI's
        # observable browser-fallback behavior is Douyin-only.
        adapters = _load_adapters(
            douyin_browser_fallback=browser_fallback,
            bilibili_browser_fallback=browser_fallback,
        )
    elif douyin_enabled:
        adapters = _load_adapters()
    else:
        adapters = _load_adapters(douyin_browser_fallback=False)
    if not adapters:
        print("[FAILED] 没有可用适配器(采集器均未实现)", file=sys.stderr)
        return 2
    routing_url = sanitize_routing_url(url)
    if routing_url is None:
        print("[FAILED] 账号主页 URL 权限或路径格式无效", file=sys.stderr)
        return 2
    adapter = _pick(adapters, routing_url)
    if (
        "douyin" in explicit_cookie_provided
        and douyin_cookie_records
        and getattr(adapter, "platform", None) != "douyin"
    ):
        print("[FAILED] --douyin-cookie-file 只适用于抖音账号主页", file=sys.stderr)
        return 2
    if (
        "bilibili" in explicit_cookie_provided
        and bilibili_cookie_records
        and getattr(adapter, "platform", None) != "bilibili"
    ):
        print("[FAILED] --bilibili-cookie-file 只适用于B站账号主页", file=sys.stderr)
        return 2
    if (
        "weibo" in explicit_cookie_provided
        and weibo_cookie_records
        and getattr(adapter, "platform", None) != "weibo"
    ):
        print("[FAILED] --weibo-cookie-file 只适用于微博账号主页", file=sys.stderr)
        return 2
    if (
        "xiaohongshu" in explicit_cookie_provided
        and xiaohongshu_cookie_records
        and getattr(adapter, "platform", None) != "xiaohongshu"
    ):
        print("[FAILED] --xiaohongshu-cookie-file 只适用于小红书账号主页", file=sys.stderr)
        return 2
    if adapter is None:
        # URL 不属于任何已加载平台 → UNSUPPORTED_PLATFORM(见 exceptions.md §1)
        # 内联列出本次实际加载的适配器平台与示例 URL 形态,避免用户看到
        # 干瘪的 stop_reason 后还要翻 SKILL.md。微博是 P1 条件支持,仅当
        # 适配器被本次加载时才会出现在列表里。
        loaded = sorted(
            (a.platform for a in adapters),
            key=lambda p: {
                "bilibili": 0, "douyin": 1, "weibo": 2, "xiaohongshu": 3,
            }.get(p, 9),
        )
        url_examples = {
            "bilibili": "https://space.bilibili.com/<uid>",
            "douyin": "https://www.douyin.com/user/<sec_uid>",
            "weibo": "https://weibo.com/u/<uid>",
            "xiaohongshu": "https://www.xiaohongshu.com/user/profile/<user_id>",
        }
        if loaded:
            examples = " ; ".join(
                f"{p}={url_examples.get(p, '?')}" for p in loaded
            )
            print(
                f"[FAILED] 无支持的适配器 (stop_reason={SR_UNSUPPORTED}); "
                f"已加载平台: {examples}",
                file=sys.stderr,
            )
        else:
            print(
                f"[FAILED] 无支持的适配器 (stop_reason={SR_UNSUPPORTED})",
                file=sys.stderr,
            )
        return 2

    if persist_cookie:
        if cache_root is None:
            print("[FAILED] Cookie 缓存目录不可用", file=sys.stderr)
            return 2
        for cookie_platform in sorted(explicit_cookie_provided):
            target = os.path.join(
                cache_root,
                f"{cookie_platform}-cookies.json",
            )
            try:
                save_cookie_records(
                    loaded_cookie_records[cookie_platform],
                    target,
                    cookie_platform,
                )
            except Exception:
                print(
                    f"[FAILED] {cookie_platform} Cookie 无法安全持久化",
                    file=sys.stderr,
                )
                return 2
            print(
                f"[OK] {cookie_platform} Cookie 已持久化到 {target}",
                file=sys.stderr,
            )

    platform = adapter.platform
    adapter_canonicalizer = getattr(adapter, "canonicalize_profile_url", None)
    canonical_url = (
        adapter_canonicalizer(routing_url)
        if callable(adapter_canonicalizer)
        else canonical_profile_url(platform, routing_url)
    )
    if canonical_url is None:
        print("[FAILED] 账号主页 URL 不符合平台公开路径规范", file=sys.stderr)
        return 2
    if resume and (
        platform != resume_platform or canonical_url != resume_profile_url
    ):
        print("[FAILED] 增量续采账号身份与来源不一致", file=sys.stderr)
        return 2
    if checkpoint_state is not None and (
        platform != checkpoint_platform or canonical_url != checkpoint_profile_url
    ):
        print("[FAILED] checkpoint 账号身份与当前适配器不一致", file=sys.stderr)
        return 2
    url = canonical_url
    safe_url = canonical_url
    task_id = new_task_id(platform)
    if collect_all and platform not in {"bilibili", "douyin"}:
        print("[FAILED] --all 目前仅支持 B站或抖音账号主页", file=sys.stderr)
        return 2
    if enrich_details and platform != "douyin":
        print("[FAILED] --enrich-details 仅支持抖音账号主页", file=sys.stderr)
        return 2

    account = account_output_key(platform, canonical_url)
    date = datetime.now(_BEIJING).strftime("%Y%m%d")
    reservation: _WorkspaceReservation
    try:
        if resume:
            reservation = _reserve_resume_workspace(
                str(out_dir), resume_out=resume_out, date=date
            )
        elif out_dir:
            reservation = _prepare_explicit_workspace(out_dir)
        else:
            reservation = _reserve_default_workspace(
                f"{platform}-{account}-{date}"
            )
    except (OSError, WorkspaceContractError):
        print("[FAILED] 输出目录无法安全预留", file=sys.stderr)
        return 2
    ws = reservation.path
    src = reservation.source_path

    # 增量续采:基于既有 posts 的 published_at / bvid 去重续采,避免重复打满配额
    # 规范化日期范围(中国平台默认 +08:00);增量续采时起点取既有最新发布时间
    date_from_iso = user_from
    date_to_iso = user_to
    date_range = None
    if date_from_iso or date_to_iso:
        date_range = (date_from_iso, date_to_iso)

    # 执行前回显:平台、采集范围、最大数量、评论开关(见 SKILL.md §1「任务创建」)
    echo_parts = [
        f"platform={platform}",
        f"limit={requested_count}",
        f"date_range={date_range if date_range else 'unset'}",
        f"include_comments={include_comments}",
    ]
    if collect_all:
        echo_parts.extend([
            "all=on",
            f"max_seconds={max_seconds}",
            f"max_scrolls={max_scrolls}",
        ])
    if resume_mode:
        echo_parts.append(f"resume=on existing={len(existing_posts)} since={date_from_iso}")
    if checkpoint_out is not None:
        echo_parts.append("checkpoint=on")
    if checkpoint_state is not None:
        echo_parts.append(
            f"checkpoint_resume=on existing={len(checkpoint_state['posts'])}"
        )
    print(f"[echo] " + " ".join(echo_parts))

    collected_at = datetime.now(_BEIJING).isoformat()
    task_status = "COLLECTING"
    stop_reason: str | None = (
        checkpoint_state["stop_reason"] if checkpoint_state is not None else None
    )
    error_log: list[dict] = (
        list(checkpoint_state["error_log"])
        if checkpoint_state is not None
        else []
    )
    posts: list = (
        list(checkpoint_state["posts"])
        if checkpoint_state is not None
        else []
    )
    profile: dict = {}
    collection_coverage: dict = (
        dict(checkpoint_state["collection_coverage"])
        if checkpoint_state is not None
        else (
            {"requested_all": True, "max_items": max_items}
            if collect_all
            else {}
        )
    )
    comment_collection: dict = {}
    detail_unavailable_count = 0

    access_diagnostic_code: str | None = None
    access_platform_response_code: int | None = None

    def persist_access_failure(reason: str) -> int | None:
        error = {
            "url": safe_url,
            "stage": "check_access",
            "error_code": reason,
            "message": _ERROR_STAGE_MESSAGES["check_access"],
            "occurred_at": _event_timestamp(),
            "retryable": False,
        }
        if access_diagnostic_code is not None:
            error["diagnostic_code"] = access_diagnostic_code
        if access_platform_response_code is not None:
            error["platform_response_code"] = access_platform_response_code
        try:
            with execution_timer.phase("persist"):
                _write_report(
                    adapter,
                    url,
                    profile,
                    posts,
                    ws,
                    task_status="FAILED",
                    stop_reason=reason,
                    collection_coverage=collection_coverage,
                    error_log=[error],
                    reservation=reservation,
                )
            _write_task_json(
                ws,
                platform=platform,
                task_id=task_id,
                analysis_goal=analysis_goal,
                profile_url=url,
                requested_limit=requested_count,
                date_from=date_from_iso,
                date_to=date_to_iso,
                include_comments=include_comments,
                task_status="FAILED",
                enrich_details=enrich_details,
                stop_reason=reason,
                collected_count=0,
                collected_at=collected_at,
                resume_source_format=resume_source_format,
                resume_source_digest=resume_source_digest,
                collection_coverage=collection_coverage,
                diagnostic_code=access_diagnostic_code,
                platform_response_code=access_platform_response_code,
                execution_timing=execution_timer.snapshot(),
                reservation=reservation,
            )
            reservation.commit()
            return None
        except WorkspaceCommitIndeterminate:
            raise
        except (
            WorkspaceCapabilityError,
            WorkspaceExistsError,
            WorkspaceIdentityError,
            WorkspaceVerificationError,
        ):
            return 2
        except WorkspaceError:
            return 3

    # 1) check_access:不绕过任何保护(见 base.py / exceptions.md §2)
    access_failed = False
    if checkpoint_state is None:
        try:
            with execution_timer.phase("check_access"):
                access = adapter.check_access(url)
        except Exception as e:
            # 适配器未启用(WeiboCollector._require_enabled 抛 RuntimeError 携 ADAPTER_UNAVAILABLE)
            stop_reason = _stop_reason_from_exc(e)
            access_diagnostic_code = _safe_diagnostic_code(
                getattr(e, "diagnostic_code", None)
            )
            access_platform_response_code = _safe_platform_response_code(
                getattr(e, "platform_response_code", None)
            )
            task_status = "FAILED"
            access_failed = True
        else:
            if not access.get("accessible"):
                stop_reason = _safe_stop_reason(access.get("stop_reason"))
                access_diagnostic_code = _safe_diagnostic_code(
                    access.get("diagnostic_code")
                )
                access_platform_response_code = _safe_platform_response_code(
                    access.get("platform_response_code")
                )
                # check_access 阶段尚无已采数据,所有受阻场景统一 FAILED(见 exceptions.md §1)
                task_status = "FAILED"
                access_failed = True
    if access_failed:
        persistence_failure = persist_access_failure(stop_reason)
        if persistence_failure is not None:
            reservation.close()
            print("[FAILED] 输出产物无法安全提交", file=sys.stderr)
            return persistence_failure
        print(f"[STOP] task_status={task_status} stop_reason={stop_reason} stage=check_access")
        reservation.close()
        return 3

    # 2) 内容列表(先于资料,便于回填;失败不阻断资料写入)
    if checkpoint_state is None:
        try:
            with execution_timer.phase("collect_post_list"):
                if collect_all:
                    posts = adapter.collect_all_post_list(
                        url,
                        date_range=date_range,
                        max_items=max_items,
                        max_seconds=max_seconds,
                        max_scrolls=max_scrolls,
                    )
                else:
                    posts = adapter.collect_post_list(
                        url, limit=limit, date_range=date_range
                    )
        except Exception as e:
            partial_posts = getattr(e, "partial_posts", None)
            if isinstance(partial_posts, list):
                posts = partial_posts[:requested_count]
            diagnostic_code = getattr(e, "diagnostic_code", None)
            platform_response_code = _safe_platform_response_code(
                getattr(e, "platform_response_code", None)
            )
            stop_reason = _stop_reason_from_exc(e)
            if platform == "douyin" and posts:
                for post in posts:
                    if post.get("collection_status") in {"SUCCESS", "PARTIAL"}:
                        post["collection_status"] = "PARTIAL"
                        metrics = post.get("platform_metrics")
                        metrics = dict(metrics) if isinstance(metrics, dict) else {}
                        metrics["partial_reasons"] = sanitize_partial_reasons(
                            sanitize_partial_reasons(metrics.get("partial_reasons"))
                            + [str(stop_reason).lower()]
                        )
                        post["platform_metrics"] = metrics
            # 登录/验证/频控/解析失败 → PARTIAL(已有数据保留)或 FAILED(无已采数据)
            task_status = "PARTIAL" if posts else "FAILED"
            entry = {
                "url": safe_url, "stage": "collect_post_list",
                "error_code": stop_reason,
                "message": _ERROR_STAGE_MESSAGES["collect_post_list"],
                "occurred_at": _event_timestamp(), "retryable": False,
            }
            if isinstance(diagnostic_code, str) and diagnostic_code:
                entry["diagnostic_code"] = diagnostic_code
            if platform_response_code is not None:
                entry["platform_response_code"] = platform_response_code
            error_log.append(entry)
            diagnostic_summary = (
                f" diagnostic_code={diagnostic_code}"
                if _safe_diagnostic_code(diagnostic_code) is not None
                else ""
            )
            platform_summary = (
                f" platform_response_code={platform_response_code}"
                if platform_response_code is not None
                else ""
            )
            print(
                f"[warn] 内容列表采集异常 stop_reason={stop_reason}"
                f"{diagnostic_summary}{platform_summary}",
                file=sys.stderr,
            )
        try:
            collection_coverage = _sanitize_collection_coverage(
                adapter.get_collection_coverage()
            )
        except Exception:
            collection_coverage = {}
    if collect_all:
        collection_coverage["requested_all"] = True
        collection_coverage["max_items"] = max_items
    if (
        collect_all
        and stop_reason is None
        and not collection_coverage.get("is_exhaustive", False)
    ):
        stop_reason = SR_PARSER_FAILED
        task_status = "PARTIAL" if posts else "FAILED"
        error_log.append({
            "url": url,
            "stage": "collection_coverage",
            "error_code": SR_PARSER_FAILED,
            "message": "全量采集覆盖账本缺少一致的末页完备性证据",
            "occurred_at": _event_timestamp(),
            "retryable": False,
            "diagnostic_code": "ALL_POSTS_INCOMPLETE",
        })

    # limit 与 date_range 的交集:适配器可能仅应用其一,此处再做一次本地交集过滤
    # (见 SKILL.md §1「采集数量和日期范围同时存在时,取两者共同限定的结果」)
    if posts and (date_from_iso or date_to_iso):
        posts = _filter_by_date(posts, date_from_iso, date_to_iso)
    duplicate_count = 0
    if posts:
        posts, duplicate_count = dedup_posts(posts)
    if (
        duplicate_count > 0
        and not resume_mode
        and len(posts) < requested_count
        and stop_reason is None
    ):
        stop_reason = SR_PARSER_FAILED
        task_status = "PARTIAL"
        error_log.append({
            "url": safe_url,
            "stage": "collect_post_list",
            "error_code": SR_PARSER_FAILED,
            "message": _ERROR_STAGE_MESSAGES["collect_post_list"],
            "occurred_at": _event_timestamp(),
            "retryable": False,
            "diagnostic_code": "DUPLICATE_POSTS_DROPPED",
        })
    if posts and not resume_mode:
        posts = posts[:requested_count]

    # 增量续采:合并既有帖子,按 post_id/bvid 去重(新抓取的覆盖旧的)
    new_count = len(posts) if not resume_mode else 0
    if resume_mode and existing_posts:
        posts, new_count = _merge_incremental(existing_posts, posts)
    _canonicalize_post_urls(platform, posts)
    _ensure_post_collection_status_contract(posts)

    if checkpoint_out is not None:
        checkpoint_diagnostic_code = next(
            (
                code
                for error in reversed(error_log)
                if (
                    code := _safe_diagnostic_code(
                        error.get("diagnostic_code")
                    )
                ) is not None
            ),
            None,
        )
        try:
            _write_collection_checkpoint(
                checkpoint_out,
                platform=platform,
                profile_url=url,
                parameters=checkpoint_parameters,
                posts=posts,
                collected_at=collected_at,
                stop_reason=stop_reason,
                diagnostic_code=checkpoint_diagnostic_code,
                collection_coverage=collection_coverage,
                error_log=error_log,
            )
        except WorkspaceCommitIndeterminate:
            raise
        except (
            WorkspaceCapabilityError,
            WorkspaceExistsError,
            WorkspaceIdentityError,
            WorkspaceVerificationError,
        ):
            reservation.close()
            print("[FAILED] checkpoint 输出目录身份已改变", file=sys.stderr)
            return 2
        except WorkspaceError:
            reservation.close()
            print("[FAILED] checkpoint 产物无法安全提交", file=sys.stderr)
            return 3
    content_issue_count = sum(
        1
        for post in posts
        if post.get("collection_status")
        in {"PARTIAL", "FAILED", "DELETED", "RESTRICTED"}
    )

    # 3) 资料(失败不阻塞已采内容)
    try:
        with execution_timer.phase("collect_profile"):
            profile = adapter.collect_profile(url)
            if not isinstance(profile, dict):
                raise ValueError("invalid profile result")
            profile["profile_url"] = url
    except Exception as e:
        profile_reason = _stop_reason_from_exc(e)
        stop_reason = _dominant_stop_reason(stop_reason, profile_reason)
        task_status = "PARTIAL" if posts else "FAILED"
        error_log.append({
            "url": safe_url, "stage": "collect_profile",
            "error_code": profile_reason,
            "message": _ERROR_STAGE_MESSAGES["collect_profile"],
            "occurred_at": _event_timestamp(), "retryable": False,
        })
        print("[warn] 资料采集异常", file=sys.stderr)
        profile = {}

    if enrich_details and platform == "douyin" and posts:
        with execution_timer.phase("collect_post_detail"):
            detail_unavailable_count = _enrich_douyin_details(
                adapter,
                posts,
                error_log,
                collected_at,
                blocked_reason=stop_reason,
            )
        detail_protection = next(
            (
                error.get("error_code")
                for error in reversed(error_log)
                if error.get("stage") == "collect_post_detail"
                and error.get("error_code") in _TASK_PROTECTION_REASONS
            ),
            None,
        )
        stop_reason = _dominant_stop_reason(stop_reason, detail_protection)

    clear_detail_provenance = getattr(adapter, "_clear_detail_provenance", None)
    if callable(clear_detail_provenance):
        try:
            clear_detail_provenance()
        except Exception:
            pass

    # 4) 落盘原始数据与归一化 CSV(已采集数据必须保留,见 exceptions.md §2 规则 3)
    try:
        with execution_timer.phase("persist"):
            with reservation.open_text("source/profile.json") as f:
                json.dump(profile, f, ensure_ascii=False, indent=2)

            with reservation.open_text("source/posts.jsonl") as f:
                for p in posts:
                    f.write(json.dumps(p, ensure_ascii=False) + "\n")

            _write_csv(
                posts,
                os.path.join(ws, "normalized-posts.csv"),
                reservation=reservation,
            )

            # 5) 评论(可选;失败不阻塞主任务,见 exceptions.md §1.1)
            if include_comments:
                comment_collection = _collect_and_persist_comments(
                    adapter,
                    posts,
                    os.path.join(src, "comments.jsonl"),
                    error_log,
                    collected_at,
                    reservation=reservation,
                    blocked_reason=stop_reason,
                )
                comment_stop_reason = comment_collection.get("stop_reason")
                if comment_stop_reason in _TASK_PROTECTION_REASONS:
                    stop_reason = _dominant_stop_reason(
                        stop_reason,
                        comment_stop_reason,
                    )
                print(
                    "[OK] 评论采样: "
                    f"attempted_posts={comment_collection['attempted_posts']} "
                    f"comments_collected={comment_collection['comments_collected']} "
                    f"empty_results={comment_collection['empty_results']} "
                    f"failures={comment_collection['failures']}"
                )
    except WorkspaceCommitIndeterminate:
        raise
    except (
        WorkspaceCapabilityError,
        WorkspaceExistsError,
        WorkspaceIdentityError,
        WorkspaceVerificationError,
    ):
        reservation.close()
        print("[FAILED] 输出目录身份已改变；拒绝写入", file=sys.stderr)
        return 2
    except WorkspaceError:
        reservation.close()
        print("[FAILED] 输出产物序列化失败", file=sys.stderr)
        return 3

    # 6) 最终任务状态:无 stop_reason → COMPLETED;有 stop_reason 但有数据 → PARTIAL
    exhaustive_range_no_match = bool(
        collect_all
        and date_range is not None
        and collection_coverage.get("is_exhaustive") is True
        and collection_coverage.get("range_filter_applied") is True
        and collection_coverage.get("range_no_match") is True
        and collection_coverage.get("observed_post_count", 0) > 0
        and collection_coverage.get("range_match_count") == 0
        and not posts
    )
    if stop_reason is None:
        task_status = "COMPLETED" if posts or exhaustive_range_no_match else "FAILED"
        if task_status == "COMPLETED" and (
            detail_unavailable_count or content_issue_count
        ):
            task_status = "PARTIAL"
        if not posts and not profile:
            stop_reason = SR_NO_PUBLIC_CONTENT
            task_status = "FAILED"
    else:
        # A verified public profile is still usable collection evidence even
        # when the post list is unavailable.  Preserve the exact stop reason,
        # but do not collapse a committed profile snapshot into a total task
        # failure merely because strategy analysis cannot proceed.
        task_status = "PARTIAL" if posts or _vis_count(profile) > 0 else "FAILED"

    task_diagnostic_code = next(
        (
            code
            for error in reversed(error_log)
            if (
                stop_reason is None
                or error.get("error_code") == stop_reason
            )
            and (
                code := _safe_diagnostic_code(error.get("diagnostic_code"))
            ) is not None
        ),
        None,
    )
    task_platform_response_code = next(
        (
            code
            for error in reversed(error_log)
            if (
                stop_reason is None
                or error.get("error_code") == stop_reason
            )
            and (
                code := _safe_platform_response_code(
                    error.get("platform_response_code")
                )
            ) is not None
        ),
        None,
    )

    try:
        _write_report(
            adapter, url, profile, posts, ws,
            task_status=task_status, stop_reason=stop_reason,
            error_log=error_log,
            incremental=resume_mode, existing_count=len(existing_posts),
            new_count=new_count,
            collection_coverage=collection_coverage,
            comment_collection=comment_collection,
            reservation=reservation,
        )
        _write_task_json(
            ws, platform=platform, profile_url=url,
            task_id=task_id, analysis_goal=analysis_goal,
            requested_limit=requested_count,
            date_from=date_from_iso, date_to=date_to_iso,
            include_comments=include_comments, task_status=task_status,
            enrich_details=enrich_details,
            stop_reason=stop_reason, collected_count=len(posts),
            collected_at=collected_at,
            incremental=resume_mode, existing_count=len(existing_posts),
            new_count=new_count,
            resume_source_format=resume_source_format,
            resume_source_digest=resume_source_digest,
            checkpoint_source_format=checkpoint_source_format,
            checkpoint_source_digest=checkpoint_source_digest,
            collection_coverage=collection_coverage,
            comment_collection=comment_collection,
            diagnostic_code=task_diagnostic_code,
            platform_response_code=task_platform_response_code,
            execution_timing=execution_timer.snapshot(),
            reservation=reservation,
        )
        reservation.commit()
    except WorkspaceCommitIndeterminate:
        raise
    except (
        WorkspaceCapabilityError,
        WorkspaceExistsError,
        WorkspaceIdentityError,
        WorkspaceVerificationError,
    ):
        reservation.close()
        print("[FAILED] 输出目录身份已改变；拒绝写入", file=sys.stderr)
        return 2
    except WorkspaceError:
        reservation.close()
        print("[FAILED] 输出产物提交失败", file=sys.stderr)
        return 3

    if task_status == "FAILED":
        print(f"[COMMITTED] 输出目录: {ws}")
        print(
            f"[FAILED] 平台={platform} 资料可见字段={_vis_count(profile)} "
            f"内容条数={len(posts)} task_status={task_status} "
            f"stop_reason={stop_reason if stop_reason else 'null'}"
        )
    else:
        print(
            f"[OK] 平台={platform} 资料可见字段={_vis_count(profile)} "
            f"内容条数={len(posts)} task_status={task_status} "
            f"stop_reason={stop_reason if stop_reason else 'null'}"
        )
        print(f"[OK] 输出目录: {ws}")
    reservation.close()
    return 0 if task_status != "FAILED" else 3


def main() -> None:
    ap = argparse.ArgumentParser(description="公开社交媒体账号采集")
    ap.add_argument(
        "url",
        nargs="?",
        help="账号主页 URL,如 https://space.bilibili.com/123",
    )
    range_group = ap.add_mutually_exclusive_group()
    range_group.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "明确只采集最近 N 条（1-100）；省略时 B站/抖音默认有界完整采集，"
            "微博/小红书默认最近 30 条"
        ),
    )
    range_group.add_argument(
        "--all",
        dest="collect_all",
        action="store_true",
        help="在安全预算内采集 B站或抖音公开作品直到明确末页",
    )
    ap.add_argument(
        "--max-items",
        type=int,
        default=None,
        help="完整采集最大保留作品数(默认10000,硬上限50000)",
    )
    ap.add_argument(
        "--max-seconds",
        type=float,
        default=None,
        help="完整采集最长秒数(默认1800,硬上限14400)",
    )
    ap.add_argument(
        "--max-scrolls",
        type=int,
        default=None,
        help="完整采集最大滚动次数(默认2000,硬上限20000)",
    )
    ap.add_argument(
        "--out", default=None, help="输出目录(默认 workspace/<platform>-<account>-<date>/)"
    )
    ap.add_argument(
        "--analysis-goal",
        default=None,
        help="可选分析目标（最多500字符，不允许控制字符）",
    )
    ap.add_argument("--comments", action="store_true", help="开启评论采样(默认关)")
    ap.add_argument(
        "--enrich-details",
        action="store_true",
        help="仅对缺少公开基础字段的抖音作品补充详情",
    )
    ap.add_argument("--date-from", default=None, help="起始日期 YYYY-MM-DD 或 ISO 8601(北京时间)")
    ap.add_argument("--date-to", default=None, help="结束日期 YYYY-MM-DD 或 ISO 8601(北京时间)")
    ap.add_argument(
        "--resume", action="store_true",
        help="增量续采:核验 --out 指向的同平台、同账号不可变采集提交,以其最新 published_at "
             "为起点续采,按 post_id/bvid 去重合并(新覆盖旧),并写入新的不可变任务目录。"
             "必须配合 --out。",
    )
    ap.add_argument(
        "--resume-out",
        default=None,
        help="增量续采的新输出目录；省略时原子预留 OLD-resume-<date> 及数字后缀。",
    )
    ap.add_argument(
        "--since", default=None,
        help="增量续采起点(YYYY-MM-DD 或 ISO 8601,北京时间);覆盖从既有数据推导的起始时间。仅与 --resume 联用。",
    )
    ap.add_argument(
        "--checkpoint-out",
        default=None,
        help="在内容列表阶段创建独立、密封且只读的恢复点目录。",
    )
    ap.add_argument(
        "--resume-checkpoint",
        default=None,
        help="核验密封恢复点后跳过访问和列表采集，继续写入新 --out。",
    )
    browser_group = ap.add_mutually_exclusive_group()
    browser_group.add_argument(
        "--browser-fallback", dest="browser_fallback", action="store_true",
        help="显式启用临时浏览器传输层降级（系统安装或已有 Playwright 缓存）。",
    )
    browser_group.add_argument(
        "--no-browser-fallback", dest="browser_fallback", action="store_false",
        help="禁止启动临时浏览器；仅使用 HTTP/SSR 快速路径。",
    )
    ap.set_defaults(browser_fallback=None)
    ap.add_argument(
        "--douyin-cookie-file",
        default=None,
        help="用户主动提供的抖音 Cookie JSON/文本文件；默认仅注入该任务临时浏览器。",
    )
    ap.add_argument(
        "--bilibili-cookie-file",
        default=None,
        help="用户主动提供的B站 Cookie JSON/文本文件；默认仅在该任务进程内使用。",
    )
    ap.add_argument(
        "--weibo-cookie-file",
        default=None,
        help="用户主动提供的微博 Cookie JSON/文本文件；默认仅在该任务进程内使用。",
    )
    ap.add_argument(
        "--xiaohongshu-cookie-file",
        default=None,
        help="用户主动提供的小红书 Cookie JSON/文本文件；默认仅在该任务进程内使用。",
    )
    ap.add_argument(
        "--persist-cookie",
        action="store_true",
        help="把本次 --xxx-cookie-file 提供的内容落盘到 workspace/<platform>-cookies.json(权限 0600),供后续同平台任务自动加载。",
    )
    ap.add_argument(
        "--cookie-store-path",
        default=None,
        help="覆盖 Cookie 持久化/自动加载根目录(默认仓库 workspace/)。",
    )
    ap.add_argument(
        "--clear-cached-cookie",
        default=None,
        choices=("bilibili", "douyin", "weibo", "xiaohongshu"),
        help="删除 workspace/<platform>-cookies.json 后退出；用于撤回已持久化的 Cookie。",
    )
    args = ap.parse_args()
    if args.clear_cached_cookie is not None:
        if args.url is not None:
            ap.error("--clear-cached-cookie 是独立操作，不接受账号 URL")
        if args.persist_cookie or any(
            (
                args.bilibili_cookie_file,
                args.douyin_cookie_file,
                args.weibo_cookie_file,
                args.xiaohongshu_cookie_file,
            )
        ):
            ap.error("--clear-cached-cookie 不能与 Cookie 导入或持久化参数联用")
        from collectors.cookie_loader import delete_cached_cookie_records

        cache_root = args.cookie_store_path or _repository_root_cookie_root()
        if cache_root is None:
            print("[FAILED] Cookie 缓存目录不可用", file=sys.stderr)
            raise SystemExit(2)
        deleted = delete_cached_cookie_records(
            cache_root,
            args.clear_cached_cookie,
        )
        print(
            json.dumps(
                {
                    "action": "clear_cached_cookie",
                    "platform": args.clear_cached_cookie,
                    "deleted": deleted,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        raise SystemExit(0)
    if args.url is None:
        ap.error("采集任务必须提供账号主页 URL")
    if args.persist_cookie and not any(
        (
            args.bilibili_cookie_file,
            args.douyin_cookie_file,
            args.weibo_cookie_file,
            args.xiaohongshu_cookie_file,
        )
    ):
        ap.error("--persist-cookie 必须与一个 --<platform>-cookie-file 联用")
    if args.since is not None and not args.resume:
        ap.error("--since 必须与 --resume 联用")
    if args.resume_out is not None and not args.resume:
        ap.error("--resume-out 必须与 --resume 联用")
    if args.checkpoint_out is not None and args.resume_checkpoint is not None:
        ap.error("--checkpoint-out 与 --resume-checkpoint 不能联用")
    if (
        args.checkpoint_out is not None or args.resume_checkpoint is not None
    ) and args.out is None:
        ap.error("checkpoint 模式必须显式指定新的 --out")
    if (
        args.checkpoint_out is not None or args.resume_checkpoint is not None
    ) and (
        args.resume or args.resume_out is not None or args.since is not None
    ):
        ap.error("checkpoint 恢复不能与增量 --resume 混用")
    limit = PUBLIC_LIMIT_DEFAULT if args.limit is None else args.limit
    collect_all = bool(
        args.collect_all
        or (
            args.limit is None
            and _url_defaults_to_complete_collection(args.url)
        )
    )
    date_from_iso = _parse_date(args.date_from)
    date_to_iso = _default_date_to(args.date_to)
    if args.date_from and not date_from_iso:
        print(f"[FAILED] --date-from 无法解析: {args.date_from}", file=sys.stderr)
        raise SystemExit(2)
    if args.date_to and not date_to_iso:
        print(f"[FAILED] --date-to 无法解析: {args.date_to}", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(run(
        args.url, limit, args.out, args.comments, date_from_iso, date_to_iso,
        resume=args.resume, resume_out=args.resume_out, since=args.since,
        browser_fallback=args.browser_fallback,
        collect_all=collect_all, max_items=args.max_items,
        max_seconds=args.max_seconds, max_scrolls=args.max_scrolls,
        enrich_details=args.enrich_details,
        analysis_goal=args.analysis_goal,
        checkpoint_out=args.checkpoint_out,
        resume_checkpoint=args.resume_checkpoint,
        douyin_cookie_file=args.douyin_cookie_file,
        bilibili_cookie_file=args.bilibili_cookie_file,
        weibo_cookie_file=args.weibo_cookie_file,
        xiaohongshu_cookie_file=args.xiaohongshu_cookie_file,
        persist_cookie=args.persist_cookie,
        cookie_workspace_root=args.cookie_store_path,
    ))


if __name__ == "__main__":
    main()
