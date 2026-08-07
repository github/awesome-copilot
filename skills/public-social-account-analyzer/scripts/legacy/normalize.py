"""归一化：将各平台原始字段映射到统一数据模型，输出 normalized-posts.csv 与覆盖率。

对应 PRD FR-008。本脚本是**确定性**的：不调用任何模型/LLM，不访问网络。
它仅做三件事：
  1. 数值单位换算（中文单位 万/亿 字符串 → int；缺失/不可解析 → null）。
  2. 时间标准化（ISO 8601，无时区时按 +08:00 标注）。
  3. 去重、覆盖率统计、字段可见性判定（visible/hidden/partial）。

契约（冻结，不得偏离）：
  - references/collection-schema.md —— Profile/Post/Metrics、空值与采集枚举。
  - references/exceptions.md   —— field_visibility 语义（visible/hidden/partial）。
"""
from __future__ import annotations

import argparse
import copy
import csv
import io
import json
import os
import re
import sys
import math
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from immutable_workspace import WorkspaceError, reject_sealed_workspace
from csv_contract import canonical_json, normalize_hashtags, serialize_csv_row

# 中国平台默认时区（无 tz 时区信息时标注 +08:00）。
CST = timezone(timedelta(hours=8))

# 统一指标字段（collection-schema.md §6），顺序即 CSV 顺序。
METRIC_FIELDS = [
    "views",
    "likes",
    "comments",
    "favorites",
    "shares",
    "coins",
    "danmaku",
]

# Post 顶层字段（collection-schema.md §5），顺序即 CSV 顺序。
POST_FIELDS = [
    "platform",
    "post_id",
    "post_url",
    "published_at",
    "content_type",
    "title",
    "text",
    "duration_seconds",
    "hashtags",
    "is_pinned",
    "is_repost",
    "is_promoted",
    "collection_status",
    "collected_at",
    "source_url",
]

# 证据来源与标识语义。普通平台适配器可留空；索引降级必须完整填写，确保
# `idx-*` 本地记录键和账号主页证据锚点不会在下游被误称为平台作品 ID/详情页。
PROVENANCE_FIELDS = [
    "collection_source",
    "collection_status_source",
    "platform_post_id_known",
    "local_record_key",
    "item_url_known",
    "source_rank",
    "published_at_precision",
]

STRUCTURED_FIELDS = ["platform_metrics", "field_visibility"]

# 分析阶段占位空列（analysis-schema.md §7），交由 analyze 阶段填充。
ANALYSIS_FIELDS = [
    "topic",
    "format",
    "funnel_stage",
    "hook_type",
    "series_name",
    "is_original",
    "has_product_placement",
    "classification_confidence",
    "classification_version",
]

CSV_COLUMNS = (
    POST_FIELDS
    + PROVENANCE_FIELDS
    + METRIC_FIELDS
    + STRUCTURED_FIELDS
    + ANALYSIS_FIELDS
)

# content_type 有效枚举（collection-schema.md §9.4）。
CONTENT_TYPES = {
    "video",
    "image_text",
    "text",
    "live_clip",
    "dynamic",
    "other",
}

# collection_status 已知取值（collection-schema.md §9.3）+ 采集器曾用同义的规范化映射。
COLLECTION_STATUS_CANON = {
    "success": "SUCCESS",
    "ok": "SUCCESS",
    "partial": "PARTIAL",
    "failed": "FAILED",
    "fail": "FAILED",
    "deleted": "DELETED",
    "restricted": "RESTRICTED",
}
COLLECTION_STATUSES = frozenset(
    {"SUCCESS", "PARTIAL", "FAILED", "DELETED", "RESTRICTED"}
)
VISIBILITY_VALUES = frozenset({"visible", "hidden", "partial"})


@dataclass(frozen=True)
class NormalizationResult:
    rows: list[dict]
    csv_text: str
    coverage: dict


# ---------------------------------------------------------------------------
# 数值单位换算（纯函数）
# ---------------------------------------------------------------------------
def parse_metric(raw: Any) -> tuple[Optional[int], str]:
    """把指标原始值换算为 int，并返回字段可见性。

    返回 (value, status)：
      - value：换算后的整数；缺失/不可解析为 None（**绝不**用 0 代替未知）。
      - status：
          "visible"   页面显示且成功解析为数字（含真实 0）。
          "hidden"    字段缺失/空（页面未显示该指标）。
          "partial"   字段出现但无法解析出完整数值（如纯文字标签）。

    单位换算：万 = 1e4，亿 = 1e8；"0" / "0赞" → 0。
    """
    if raw is None:
        return (None, "hidden")
    # bool 不是合法指标值，按缺失处理。
    if isinstance(raw, bool):
        return (None, "hidden")
    if isinstance(raw, int):
        return (raw, "visible")
    if isinstance(raw, float):
        if math.isnan(raw) or math.isinf(raw):
            return (None, "hidden")
        return (int(raw), "visible")

    s = str(raw).strip()
    if s == "":
        return (None, "hidden")

    mult = 1
    if "亿" in s:
        mult = 100_000_000
    elif "万" in s:
        mult = 10_000

    # 仅保留数字、小数点与负号，去掉 "赞" / "播放" / 逗号 / 空格等噪声。
    cleaned = re.sub(r"[^0-9.-]", "", s)
    if cleaned in ("", "."):
        # 字段出现但无可用数字 → 部分可见。
        return (None, "partial")
    try:
        value = int(round(float(cleaned) * mult))
        return (value, "visible")
    except ValueError:
        return (None, "partial")


# ---------------------------------------------------------------------------
# 时间标准化（纯函数）
# ---------------------------------------------------------------------------
def parse_time(raw: Any, *, reference_year: int | None = None) -> Optional[datetime]:
    """解析发布/采集时间为带时区的 datetime；无时区按 +08:00。

    接受：ISO 8601（含 Z / 偏移）、"YYYY-MM-DD HH:MM:SS"、
    "YYYY-MM-DD"、"YYYY年M月D日"、"M月D日"（优先取参考年）。
    不可解析 → None。
    """
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        # 数值视为 Unix 秒级时间戳（容错）。
        try:
            return datetime.fromtimestamp(int(raw), tz=CST)
        except (ValueError, OverflowError, OSError):
            return None

    s = str(raw).strip()
    if not s:
        return None

    # 1) ISO 8601 —— 先规范化 "Z" 后缀。
    candidate = s
    if candidate.endswith("Z") or candidate.endswith("z"):
        candidate = candidate[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(candidate)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=CST)
        return dt
    except ValueError:
        pass

    # 2) "YYYY-MM-DD HH:MM:SS"
    m = re.match(
        r"^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$", s
    )
    if m:
        try:
            return datetime(
                int(m.group(1)), int(m.group(2)), int(m.group(3)),
                int(m.group(4)), int(m.group(5)), int(m.group(6)), tzinfo=CST,
            )
        except ValueError:
            pass

    # 3) "YYYY-MM-DD"
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
    if m:
        try:
            return datetime(
                int(m.group(1)), int(m.group(2)), int(m.group(3)),
                tzinfo=CST,
            )
        except ValueError:
            pass

    # 4) "YYYY年M月D日"
    m = re.match(r"^(\d{4})年(\d{1,2})月(\d{1,2})日", s)
    if m:
        try:
            return datetime(
                int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=CST
            )
        except ValueError:
            pass

    # 5) "M月D日"（批量归一化时锚定同批最新作品的年份）
    m = re.match(r"^(\d{1,2})月(\d{1,2})日", s)
    if m:
        try:
            ref_year = reference_year or datetime.now(CST).year
            return datetime(
                ref_year, int(m.group(1)), int(m.group(2)), tzinfo=CST
            )
        except ValueError:
            pass

    return None


# ---------------------------------------------------------------------------
# 类型规范化辅助（纯函数）
# ---------------------------------------------------------------------------
def to_bool_flag(raw: Any) -> Optional[bool]:
    """Normalize public flag evidence to the tri-state true/false/null contract."""
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        if raw in (0, 0.0):
            return False
        if raw in (1, 1.0):
            return True
        return None
    if isinstance(raw, str):
        low = raw.strip().lower()
        if low in ("true", "1", "yes", "是"):
            return True
        if low in ("false", "0", "no", "否"):
            return False
    return None


def normalize_content_type(raw: Any) -> str:
    """content_type 规范为枚举值；缺失/非法 → "other"。"""
    if raw is None:
        return "other"
    value = str(raw).strip().lower()
    return value if value in CONTENT_TYPES else "other"


def normalize_collection_status(raw: Any) -> str:
    """Normalize untrusted status without inventing successful collection."""
    return normalize_collection_status_with_source(raw)[0]


def normalize_collection_status_with_source(raw: Any) -> tuple[str, str]:
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return "PARTIAL", "inferred_missing"
    value = str(raw).strip().lower()
    status = COLLECTION_STATUS_CANON.get(value)
    if status in COLLECTION_STATUSES:
        return status, "declared"
    return "PARTIAL", "inferred_invalid"


def get_metric_value(raw: dict, field: str) -> Any:
    """取指标值：优先顶层，其次回退到 platform_metrics 同名键。

    不臆测/推算——仅当顶层缺失时复用同名字段，属于同一指标的另一种存放位置。
    """
    top = raw.get(field)
    if top is not None:
        return top
    pm = raw.get("platform_metrics")
    if isinstance(pm, dict) and field in pm:
        return pm[field]
    return None


def join_hashtags(raw: Any) -> str:
    """Backward-compatible helper; new CSV writers use JSON arrays."""
    return "|".join(normalize_hashtags(raw))

# ---------------------------------------------------------------------------
# 单条 Post 归一化（纯函数）
# ---------------------------------------------------------------------------
def _normalize_post_record(
    raw: dict, *, published_reference_year: int | None = None
) -> tuple[dict, list[dict], list[dict]]:
    """把一条原始 Post 字典归一化为统一模型的一行（dict，键即 CSV 列）。

    返回 (row, errors)：
      - row：归一化后的一行（键即 CSV 列）。
      - errors：字段级解析失败的结构化记录列表，供覆盖率输出审计使用。
        每条形如 {"url", "stage", "error_code", "message", "field"}，
        **不含** 墙钟时间戳（deterministic，occurred_at 省略）。
    """
    errors: list[dict] = []
    warnings: list[dict] = []
    url = raw.get("post_url") or "profile"

    def log_parse_error(field: str, value: Any) -> None:
        errors.append({
            "url": url,
            "stage": "normalize",
            "error_code": "PARSER_FAILED",
            "message": f"无法解析字段 '{field}' 的原始值: {value!r}",
            "field": field,
        })

    def log_warning(
        warning_code: str,
        field: str,
        *,
        inference_source: str | None = None,
    ) -> None:
        warning = {
            "url": url,
            "stage": "normalize",
            "warning_code": warning_code,
            "field": field,
        }
        if inference_source is not None:
            warning["inference_source"] = inference_source
        warnings.append(warning)

    platform = raw.get("platform")
    post_id = raw.get("post_id")

    raw_published = raw.get("published_at")
    published = parse_time(raw_published, reference_year=published_reference_year)
    # 字段出现但无法解析 → 记录结构化错误（缺失/空值不算失败）。
    if raw_published is not None and str(raw_published).strip() != "" and published is None:
        log_parse_error("published_at", raw_published)

    raw_collected = raw.get("collected_at")
    collected = parse_time(raw_collected)
    if raw_collected is not None and str(raw_collected).strip() != "" and collected is None:
        log_parse_error("collected_at", raw_collected)

    # 指标换算 + 可见性。有效的来源标注优先于派生值；非法标注被替换并告警。
    metric_values: dict[str, Optional[int]] = {}
    raw_visibility = raw.get("field_visibility")
    field_visibility: dict[str, str] = {}
    if isinstance(raw_visibility, dict):
        for field, value in raw_visibility.items():
            if isinstance(value, str) and value.strip().lower() in VISIBILITY_VALUES:
                field_visibility[str(field)] = value.strip().lower()
            else:
                log_warning("FIELD_VISIBILITY_INVALID", f"field_visibility.{field}")
    elif raw_visibility is not None:
        log_warning("FIELD_VISIBILITY_INVALID", "field_visibility")

    for field in METRIC_FIELDS:
        raw_val = get_metric_value(raw, field)
        value, derived_status = parse_metric(raw_val)
        metric_values[field] = value
        field_visibility.setdefault(field, derived_status)
        # 字段出现但无法解析出数值 → 记录结构化错误（缺失/空值不算失败）。
        if derived_status == "partial":
            log_parse_error(field, raw_val)

    platform_metrics = raw.get("platform_metrics")
    if isinstance(platform_metrics, dict):
        platform_metrics = copy.deepcopy(platform_metrics)
    else:
        platform_metrics = {}
    precision = platform_metrics.get("published_at_precision")
    if precision not in ("datetime", "date", "unknown"):
        if isinstance(raw_published, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_published.strip()):
            precision = "date"
        else:
            precision = "datetime" if published is not None else "unknown"

    def optional_bool(key: str, default: bool) -> bool:
        value = platform_metrics.get(key)
        return value if isinstance(value, bool) else default

    source_rank = platform_metrics.get("source_rank")
    if isinstance(source_rank, bool) or not isinstance(source_rank, int) or source_rank < 1:
        source_rank = None

    collection_status, derived_status_source = (
        normalize_collection_status_with_source(raw.get("collection_status"))
    )
    supplied_status_source = raw.get("collection_status_source")
    if (
        derived_status_source == "declared"
        and (
            supplied_status_source == "declared"
            or (
                collection_status == "PARTIAL"
                and supplied_status_source
                in {"inferred_missing", "inferred_invalid"}
            )
        )
    ):
        collection_status_source = supplied_status_source
    else:
        collection_status_source = derived_status_source
    if collection_status_source != "declared":
        log_warning(
            "COLLECTION_STATUS_INFERRED",
            "collection_status",
            inference_source=collection_status_source,
        )

    row = {
        "platform": platform,
        "post_id": post_id,
        "post_url": raw.get("post_url"),
        "published_at": published.isoformat() if published else None,
        "content_type": normalize_content_type(raw.get("content_type")),
        "title": raw.get("title"),
        "text": raw.get("text"),
        "duration_seconds": raw.get("duration_seconds")
        if isinstance(raw.get("duration_seconds"), (int, float))
        and not isinstance(raw.get("duration_seconds"), bool)
        else None,
        "hashtags": normalize_hashtags(raw.get("hashtags")),
        "is_pinned": to_bool_flag(raw.get("is_pinned")),
        "is_repost": to_bool_flag(raw.get("is_repost")),
        "is_promoted": to_bool_flag(raw.get("is_promoted")),
        "collection_status": collection_status,
        "collection_status_source": collection_status_source,
        "collected_at": collected.isoformat() if collected else None,
        "source_url": raw.get("source_url") or raw.get("post_url"),
        "collection_source": platform_metrics.get("collection_source")
        if isinstance(platform_metrics.get("collection_source"), str)
        else None,
        "platform_post_id_known": optional_bool(
            "platform_post_id_known", bool(post_id)
        ),
        "local_record_key": optional_bool("local_record_key", False),
        "item_url_known": optional_bool("item_url_known", bool(raw.get("post_url"))),
        "source_rank": source_rank,
        "published_at_precision": precision,
        "platform_metrics": platform_metrics,
        "field_visibility": field_visibility,
    }
    row.update(metric_values)
    # 分析占位列留空，交由 analyze 阶段填充。
    for field in ANALYSIS_FIELDS:
        row[field] = None
    # _visibility 仅供覆盖率统计，不写入 CSV（write_csv 用 extrasaction="ignore"）。
    row["_visibility"] = field_visibility
    return row, errors, warnings


def normalize_post(
    raw: dict, *, published_reference_year: int | None = None
) -> tuple[dict, list[dict]]:
    """Normalize one post while retaining the established two-value API."""
    row, errors, _warnings = _normalize_post_record(
        raw, published_reference_year=published_reference_year
    )
    return row, errors


def _latest_explicit_published_year(raw_posts: list[dict]) -> int | None:
    """Return the year of the latest parseable post that states its year."""
    latest: datetime | None = None
    for raw in raw_posts:
        value = raw.get("published_at")
        if isinstance(value, str) and re.match(r"^\s*\d{1,2}月\d{1,2}日", value):
            continue
        parsed = parse_time(value)
        if parsed is not None and (latest is None or parsed > latest):
            latest = parsed
    return latest.year if latest is not None else None


def post_is_valid(row: dict) -> bool:
    """有效行需含 platform 与 post_id（去重唯一键的两要素）。"""
    return bool(row.get("platform")) and bool(row.get("post_id"))


# ---------------------------------------------------------------------------
# 覆盖率统计（纯函数）
# ---------------------------------------------------------------------------
def compute_metric_coverage(rows: list[dict]) -> dict:
    """逐指标统计 present / missing / partial / missing_rate。"""
    total = len(rows)
    coverage: dict[str, Any] = {}
    for field in METRIC_FIELDS:
        present = 0
        partial = 0
        missing = 0
        for row in rows:
            status = row.get("_visibility", {}).get(field, "hidden")
            if status in ("visible", "public"):
                present += 1
            elif status == "partial":
                partial += 1
            else:
                missing += 1
        missing_rate = (missing + partial) / total if total else 0.0
        coverage[field] = {
            "present": present,
            "partial": partial,
            "missing": missing,
            "total": total,
            "missing_rate": round(missing_rate, 4),
        }
    return coverage


# ---------------------------------------------------------------------------
# I/O 层
# ---------------------------------------------------------------------------
def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def read_posts_jsonl(path: str) -> list[dict]:
    """逐行读取 posts.jsonl；单行解析失败计入 parse_errors 并跳过（降级不中断）。"""
    rows: list[dict] = []
    parse_errors: list[str] = []
    with open(path, "r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                parse_errors.append(f"line {lineno}: {exc}")
    return rows, parse_errors


def dedup_posts(raw_posts: list[dict]) -> tuple[list[dict], int]:
    """按 (platform, post_id) 去重，保留首次出现；不同平台同 post_id 不去重。

    返回 (去重后行列表, 丢弃的重复行数)。缺失 post_id 的行用唯一哨兵键保活。
    """
    seen: dict[tuple, int] = {}
    kept: list[dict] = []
    sentinel = 0
    for post in raw_posts:
        pid = post.get("post_id")
        plat = post.get("platform")
        if pid is None or pid == "":
            # 无唯一键：用哨兵避免与其它缺失行互判为重复。
            sentinel += 1
            key = ("__NO_POST_ID__", sentinel)
        else:
            key = (plat, pid)
        if key in seen:
            continue
        seen[key] = len(kept)
        kept.append(post)
    duplicate_count = len(raw_posts) - len(kept)
    return kept, duplicate_count


def _write_csv_rows(rows: list[dict], handle) -> None:
    writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(serialize_csv_row(row, CSV_COLUMNS))


def write_csv(rows: list[dict], path: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        _write_csv_rows(rows, fh)


def normalize_in_memory(
    profile: dict | None, posts_jsonl: bytes | str
) -> NormalizationResult:
    """Normalize verified JSONL bytes without reading from or writing to disk."""
    if profile is not None and not isinstance(profile, dict):
        raise ValueError("profile must be an object")
    if isinstance(posts_jsonl, bytes):
        try:
            text = posts_jsonl.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("posts JSONL is not UTF-8") from exc
    elif isinstance(posts_jsonl, str):
        text = posts_jsonl
    else:
        raise TypeError("posts_jsonl must be bytes or text")

    raw_posts: list[dict] = []
    parse_errors: list[str] = []
    input_line_count = 0
    for lineno, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        input_line_count += 1
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            parse_errors.append(f"line {lineno}: {exc}")
            continue
        if not isinstance(value, dict):
            parse_errors.append(f"line {lineno}: post must be an object")
            continue
        raw_posts.append(value)

    kept_raw, duplicate_count = dedup_posts(raw_posts)
    published_reference_year = _latest_explicit_published_year(kept_raw)
    normalized: list[dict] = []
    per_post_visibility: dict[str, dict] = {}
    errors: list[dict] = []
    warnings: list[dict] = []
    for raw in kept_raw:
        row, post_errors, post_warnings = _normalize_post_record(
            raw, published_reference_year=published_reference_year
        )
        errors.extend(post_errors)
        warnings.extend(post_warnings)
        normalized.append(row)
        key = f"{row.get('platform')}:{row.get('post_id')}"
        per_post_visibility[key] = row["_visibility"]

    platforms: dict[str, int] = {}
    for row in normalized:
        platform = row.get("platform") or "unknown"
        platforms[platform] = platforms.get(platform, 0) + 1

    coverage = {
        "input_line_count": input_line_count,
        "raw_count": len(raw_posts),
        "parse_errors": len(parse_errors),
        "duplicate_count": duplicate_count,
        "post_count": len(normalized),
        "valid_count": sum(1 for row in normalized if post_is_valid(row)),
        "platforms": platforms,
        "metric_coverage": compute_metric_coverage(normalized),
        "per_post_field_visibility": per_post_visibility,
        "errors": errors,
        "warnings": warnings,
        "warning_count": len(warnings),
        "profile_field_visibility": (
            profile.get("field_visibility") if isinstance(profile, dict) else None
        ),
        "profile": (
            {
                "platform": profile.get("platform"),
                "account_name": profile.get("account_name"),
                "account_id": profile.get("account_id"),
                "collected_at": profile.get("collected_at"),
            }
            if isinstance(profile, dict)
            else None
        ),
    }
    output = io.StringIO(newline="")
    _write_csv_rows(normalized, output)
    return NormalizationResult(normalized, output.getvalue(), coverage)


def run(input_dir: str, output_dir: str) -> dict:
    """执行归一化，返回覆盖率摘要 dict（同时写盘）。"""
    source_dir = os.path.join(input_dir, "source")
    profile_path = os.path.join(source_dir, "profile.json")
    posts_path = os.path.join(source_dir, "posts.jsonl")

    if not os.path.isfile(posts_path):
        raise FileNotFoundError(f"缺少必要输入: {posts_path}")

    profile = None
    if os.path.isfile(profile_path):
        try:
            profile = read_json(profile_path)
        except (json.JSONDecodeError, OSError) as exc:
            profile = None
            sys.stderr.write(f"[warn] 读取 profile.json 失败，仅处理 posts: {exc}\n")
    else:
        sys.stderr.write(f"[warn] 未找到 profile.json: {profile_path}\n")

    raw_posts, parse_errors = read_posts_jsonl(posts_path)
    kept_raw, duplicate_count = dedup_posts(raw_posts)
    published_reference_year = _latest_explicit_published_year(kept_raw)

    # 归一化每条；附加 _visibility（仅供统计，不写入 CSV）；收集字段级解析错误。
    normalized: list[dict] = []
    per_post_visibility: dict[str, dict] = {}
    errors: list[dict] = []
    warnings: list[dict] = []
    for raw in kept_raw:
        row, post_errors, post_warnings = _normalize_post_record(
            raw, published_reference_year=published_reference_year
        )
        errors.extend(post_errors)
        warnings.extend(post_warnings)
        normalized.append(row)
        key = f"{row.get('platform')}:{row.get('post_id')}"
        per_post_visibility[key] = row["_visibility"]

    valid_count = sum(1 for row in normalized if post_is_valid(row))
    metric_coverage = compute_metric_coverage(normalized)

    # 平台分布。
    platforms: dict[str, int] = {}
    for row in normalized:
        p = row.get("platform") or "unknown"
        platforms[p] = platforms.get(p, 0) + 1

    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "normalized-posts.csv")
    coverage_path = os.path.join(output_dir, "normalized-coverage.json")

    write_csv(normalized, csv_path)

    coverage = {
        "input_dir": os.path.abspath(input_dir),
        "raw_count": len(raw_posts),
        "parse_errors": len(parse_errors),
        "duplicate_count": duplicate_count,
        "post_count": len(normalized),
        "valid_count": valid_count,
        "platforms": platforms,
        "metric_coverage": metric_coverage,
        "per_post_field_visibility": per_post_visibility,
        "errors": errors,
        "warnings": warnings,
        "warning_count": len(warnings),
        "profile_field_visibility": (
            profile.get("field_visibility") if isinstance(profile, dict) else None
        ),
        "profile": (
            {
                "platform": profile.get("platform"),
                "account_name": profile.get("account_name"),
                "account_id": profile.get("account_id"),
                "collected_at": profile.get("collected_at"),
            }
            if isinstance(profile, dict)
            else None
        ),
    }
    with open(coverage_path, "w", encoding="utf-8") as fh:
        json.dump(coverage, fh, ensure_ascii=False, indent=2)

    summary = {
        **coverage,
        "outputs": {
            "normalized_posts_csv": os.path.abspath(csv_path),
            "coverage_json": os.path.abspath(coverage_path),
        },
    }
    return summary


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="将各平台原始内容归一化为统一模型 CSV（确定性，无网络/无 LLM）。"
    )
    parser.add_argument(
        "--input", required=True, help="任务目录（含 source/profile.json 与 source/posts.jsonl）"
    )
    parser.add_argument(
        "--output", default=None, help="输出目录（默认同 --input）"
    )
    args = parser.parse_args(argv)

    output_dir = args.output or args.input
    try:
        reject_sealed_workspace(args.input)
        if os.path.abspath(output_dir) != os.path.abspath(args.input):
            reject_sealed_workspace(output_dir)
        summary = run(args.input, output_dir)
    except (FileNotFoundError, WorkspaceError) as exc:
        sys.stderr.write(f"[error] {exc}\n")
        return 2

    print(
        f"归一化完成：读取 {summary['raw_count']} 行，"
        f"丢弃重复 {summary['duplicate_count']} 行，"
        f"保留 {summary['post_count']} 行（有效 {summary['valid_count']} 行）。"
    )
    print(f"  CSV   : {summary['outputs']['normalized_posts_csv']}")
    print(f"  覆盖率: {summary['outputs']['coverage_json']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
