#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
render_report.py —— 公开社媒账号分析 · 报告渲染器

读取任务目录下三份产物：
  - source/profile.json       账号公开快照
  - normalized-posts.csv      归一化内容表
  - analysis.json             结构化分析结果

生成：
  - account-analysis-report.md  面向人的有界 Markdown 报告
  - dashboard.html              面向人的 HTML 报告

设计约束（见 references/data-schema.md、references/analysis-rules.md、
assets/report-template.html）：
  - 仅使用 Python 标准库（csv / json / argparse / re / pathlib / datetime）。
  - 确定性、无网络、无 LLM。
  - 12 个占位符逐一替换；无法填充时回退为「暂无数据」。
  - 全量排名、逐条指标与证据保留在 CSV/JSON；正文只展示代表项和实际引用。
  - 坏链检查：报告引用的 post_url 不在 normalized-posts.csv 集合内 → 告警。
  - 空图检查：替换后若残留 <img src="http..."> → 告警。
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import Counter
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit

from immutable_workspace import WorkspaceError, reject_sealed_workspace
from collectors.url_policy import canonical_item_url, canonical_profile_url
from task_contract import AUTHORIZED_DISCLAIMER, PUBLIC_PAGE_DISCLAIMER


# ---------------------------------------------------------------------------
# 常量
# ---------------------------------------------------------------------------

# 指标字段顺序与中文标签（见 data-schema §6）
METRIC_FIELDS = ["views", "likes", "comments", "favorites", "shares", "coins", "danmaku"]
METRIC_LABELS = {
    "views": "播放 / 浏览",
    "likes": "点赞",
    "comments": "评论",
    "favorites": "收藏",
    "shares": "分享 / 转发",
    "coins": "投币",
    "danmaku": "弹幕",
}
COLLECTION_STATUSES = ("SUCCESS", "PARTIAL", "FAILED", "DELETED", "RESTRICTED")
INDEX_COLLECTION_SOURCES = frozenset({
    "douyin_jingxuan",
    "douyin_search_index",
})
AUTHORIZED_DOUYIN_SOURCE = "douyin_openapi_token_owner"

# 12 个占位符 -> 报告节标题（顺序固定，对应模板 SECTION 标记）
SECTION_DEFS = [
    ("task_info", "报告标题与任务信息"),
    ("quality_summary", "数据质量摘要"),
    ("account_card", "账号定位卡"),
    ("content_structure", "内容结构"),
    ("publish_cadence", "发布节奏"),
    ("metrics_dashboard", "公开指标看板"),
    ("high_performance", "高表现内容"),
    ("low_performance", "低表现内容"),
    ("content_patterns", "内容模式"),
    ("strategy", "策略建议"),
    ("sample_limits", "样本与限制"),
    ("sources", "来源链接"),
]
PLACEHOLDERS = [name for name, _ in SECTION_DEFS]
_PLACEHOLDER_PATTERN = re.compile(
    r"\{\{(" + "|".join(re.escape(name) for name in PLACEHOLDERS) + r")\}\}"
)

WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
PUBLIC_PAGE_FOOTER = "本报告由公开页面快照自动生成 · 数据仅供参考，不构成后台真实指标"
AUTHORIZED_FOOTER = (
    "本报告由账号本人授权 OpenAPI 公开证据自动生成 · "
    "数据仅供参考，不构成后台真实指标"
)
# 保留公开页面默认常量名，兼容调用方与既有合同。
DISCLAIMER = PUBLIC_PAGE_DISCLAIMER
EMPTY_MD = "暂无数据"
EMPTY_HTML = '<p class="empty">暂无数据</p>'
REPORT_REPRESENTATIVE_LIMIT = 5
REPORT_INLINE_EVIDENCE_LIMIT = 3

# 全局告警与引用收集（供坏链/空图检查使用）
WARNINGS: list[str] = []
KNOWN_POST_URLS: set[str] = set()
REFERENCED_POST_URLS: set[str] = set()


@dataclass
class _RenderState:
    diagnostics: list[str] = field(default_factory=list)
    known_post_urls: set[str] = field(default_factory=set)
    referenced_post_urls: set[str] = field(default_factory=set)


_RENDER_STATE: ContextVar[_RenderState | None] = ContextVar(
    "render_state", default=None
)


class RenderError(RuntimeError):
    """Rendering failed validation and must not be published."""

    def __init__(self, message: str, diagnostics=()) -> None:
        super().__init__(message)
        self.diagnostics = tuple(diagnostics)


@dataclass(frozen=True)
class RenderResult:
    markdown: str
    html: str
    diagnostics: tuple[str, ...]


# ---------------------------------------------------------------------------
# 基础工具
# ---------------------------------------------------------------------------

def warn(msg: str) -> None:
    state = _RENDER_STATE.get()
    if state is not None:
        state.diagnostics.append(msg)
        return
    WARNINGS.append(msg)
    print(f"[WARN] {msg}", file=sys.stderr)


def h_esc(s) -> str:
    """HTML 转义（仅用标准库，不引入 html 模块）。"""
    s = "" if s is None else str(s)
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


class Raw:
    """包装已在调用处拼好的 HTML 片段，html_table 不再二次转义。"""

    def __init__(self, s: str):
        self.s = s

    def __str__(self) -> str:
        return self.s


class MdRaw:
    """包装由本渲染器生成的可信 Markdown，避免表格层再次转义。"""

    def __init__(self, s: str):
        self.s = s

    def __str__(self) -> str:
        return self.s


# 数值格式化 ----------------------------------------------------------------

def fmt_int(v) -> str:
    if v is None or v == "":
        return "—"
    try:
        return f"{int(v):,}"
    except (ValueError, TypeError):
        return str(v)


def fmt_float(v, nd: int = 2) -> str:
    if v is None or v == "":
        return "—"
    try:
        return f"{float(v):.{nd}f}"
    except (ValueError, TypeError):
        return str(v)


def fmt_pct(v, nd: int = 1) -> str:
    if v is None or v == "":
        return "—"
    try:
        return f"{float(v) * 100:.{nd}f}%"
    except (ValueError, TypeError):
        return str(v)


def fmt_metric(v) -> str:
    """指标值：整数加千分位，小数保留 2 位。"""
    if v is None or v == "":
        return "—"
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return "—"
        if f == int(f):
            return f"{int(f):,}"
        return f"{f:,.2f}"
    except (ValueError, TypeError, OverflowError):
        return str(v)


# 链接 ---------------------------------------------------------------------

def md_escape_text(value) -> str:
    """把外部文本变成 Markdown 纯文本，阻断表格、链接、图片和 HTML 注入。"""
    s = "" if value is None else str(value)
    s = " ".join(s.replace("\r\n", "\n").replace("\r", "\n").splitlines())
    s = s.replace("\\", "\\\\")
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for char in ("|", "!", "[", "]", "`", "*"):
        s = s.replace(char, "\\" + char)
    return s


def _is_safe_public_url(url) -> bool:
    """Accept only canonical HTTPS report links without ambiguous authority."""
    if not isinstance(url, str) or not url or url != url.strip():
        return False
    if any(char.isspace() or ord(char) < 32 for char in url) or "\\" in url:
        return False
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except (TypeError, ValueError):
        return False
    return (
        parsed.scheme == "https"
        and bool(parsed.hostname)
        and parsed.username is None
        and parsed.password is None
        and port is None
        and not parsed.query
        and not parsed.fragment
    )


def _md_link_destination(url: str) -> str:
    """转义可信 URL 中会提前结束 Markdown link destination 的字符。"""
    return (
        str(url)
        .replace("\\", "%5C")
        .replace(" ", "%20")
        .replace("(", "%28")
        .replace(")", "%29")
        .replace("<", "%3C")
        .replace(">", "%3E")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )


def link_md(url: str, text: str) -> MdRaw:
    if not _is_safe_public_url(url):
        return MdRaw(md_escape_text(text))
    return MdRaw(f"[{md_escape_text(text)}]({_md_link_destination(url)})")


def link_html(url: str, text: str) -> Raw:
    if not _is_safe_public_url(url):
        return Raw(h_esc(text))
    return Raw(f'<a href="{h_esc(url)}">{h_esc(text)}</a>')


def ref_post(url) -> None:
    """登记被报告引用的内容 URL，供坏链检查。"""
    if url:
        state = _RENDER_STATE.get()
        if state is not None:
            state.referenced_post_urls.add(str(url))
        else:
            REFERENCED_POST_URLS.add(str(url))


# 表格 ---------------------------------------------------------------------

def html_table(headers, rows) -> str:
    th = "".join(f"<th>{h_esc(h)}</th>" for h in headers)
    trs = []
    for r in rows:
        cells = []
        for c in r:
            if isinstance(c, Raw):
                cells.append(f"<td>{c.s}</td>")
            else:
                cells.append(f"<td>{h_esc(c)}</td>")
        trs.append(f"<tr>{''.join(cells)}</tr>")
    if not trs:
        return EMPTY_HTML
    return f'<table><thead><tr>{th}</tr></thead><tbody>{"".join(trs)}</tbody></table>'


def md_table(headers, rows) -> str:
    if not rows:
        return EMPTY_MD
    def cell(value) -> str:
        if isinstance(value, MdRaw):
            return value.s
        if value is None or value == "":
            return "—"
        return md_escape_text(value)

    lines = ["| " + " | ".join(cell(h) for h in headers) + " |",
             "| " + " | ".join("---" for _ in headers) + " |"]
    for r in rows:
        cells = [cell(c) for c in r]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 内联 SVG 图表（零依赖；确定性、无网络）
# ---------------------------------------------------------------------------

def svg_timeline_scatter(posts: list, width: int = 600, height: int = 240) -> str:
    """时间轴散点图：published_at(x) × views(y)。仅含可见两项的数据点。"""
    pts: list = []
    for p in posts:
        if not isinstance(p, dict):
            continue
        pa = p.get("published_at")
        v = (p.get("metrics") or {}).get("views")
        if not pa or v is None:
            continue
        try:
            s_pa = str(pa)
            if s_pa.endswith("Z"):
                s_pa = s_pa[:-1] + "+00:00"
            dt = datetime.fromisoformat(s_pa)
        except (ValueError, TypeError):
            continue
        pts.append((dt, float(v), p.get("post_id") or "?"))
    if len(pts) < 2:
        return ""
    ts = [t for t, _, _ in pts]
    tmin, tmax = min(ts), max(ts)
    vs = [v for _, v, _ in pts]
    vmax = max(vs) or 1
    pad = 38
    plot_w = width - 2 * pad
    plot_h = height - 2 * pad
    spans = (tmax - tmin).total_seconds() or 1

    def x_of(t):
        return pad + ((t - tmin).total_seconds() / spans) * plot_w

    def y_of(v):
        return height - pad - (v / vmax) * plot_h

    circles = []
    for t, v, pid in pts:
        cx, cy = x_of(t), y_of(v)
        circles.append(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="3" fill="#3b82f6" fill-opacity="0.7">'
            f'<title>{h_esc(pid)}: views={int(v):,}</title></circle>'
        )
    axes = (
        f'<line x1="{pad}" y1="{height - pad}" x2="{width - pad}" y2="{height - pad}" stroke="#cbd5e1"/>'
        f'<line x1="{pad}" y1="{pad}" x2="{pad}" y2="{height - pad}" stroke="#cbd5e1"/>'
    )
    labels = (
        f'<text x="{pad}" y="{height - 12}" font-size="10" fill="#64748b">{tmin.date()}</text>'
        f'<text x="{width - pad - 70}" y="{height - 12}" font-size="10" fill="#64748b">{tmax.date()}</text>'
        f'<text x="6" y="{pad + 4}" font-size="10" fill="#64748b">views≤{int(vmax):,}</text>'
    )
    return (
        f'<svg viewBox="0 0 {width} {height}" width="100%" preserveAspectRatio="xMidYMid meet" '
        f'role="img" aria-label="发布时间-播放量散点图">'
        f'{axes}{"".join(circles)}{labels}</svg>'
    )


def svg_post_hour_distribution(hour_distribution: dict, width: int = 600, height: int = 200) -> str:
    """发布时段分布（24 小时柱状图）。hour_distribution: {str(hour): count}。

    仅含任意计数的小时；零依赖内联 SVG。
    """
    hours = []
    for h in range(24):
        try:
            hours.append(int(hour_distribution.get(str(h), 0)))
        except (TypeError, ValueError):
            hours.append(0)
    total = sum(hours)
    if total == 0:
        return ""
    maxv = max(hours) or 1
    pad_l, pad_r, pad_top, pad_bottom = 28, 10, 10, 22
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_top - pad_bottom
    slot = plot_w / 24
    bar_gap = 2
    bar_w = slot - bar_gap
    bars = []
    for h in range(24):
        c = hours[h]
        bh = (c / maxv) * plot_h if maxv else 0
        x = pad_l + h * slot + bar_gap / 2
        y = pad_top + (plot_h - bh)
        bars.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{bh:.1f}" '
            f'rx="1" fill="#3b82f6" fill-opacity="0.85">'
            f'<title>{h:02d}:00 — {c} 条</title></rect>'
        )
    axis = (f'<line x1="{pad_l}" y1="{pad_top + plot_h}" x2="{width - pad_r}" '
            f'y2="{pad_top + plot_h}" stroke="#cbd5e1"/>')
    ticks = []
    for h in range(0, 25, 3):
        x = pad_l + h * slot
        ticks.append(f'<text x="{x:.1f}" y="{height - 8}" font-size="9" fill="#64748b" '
                     f'text-anchor="middle">{h}</text>')
    return (
        f'<svg viewBox="0 0 {width} {height}" width="100%" preserveAspectRatio="xMidYMid meet" '
        f'role="img" aria-label="发布时段分布（24 小时柱状图，共 {total} 条）">'
        f'{axis}{"".join(bars)}{"".join(ticks)}</svg>'
    )


def svg_high_low_radar(high, low, metrics: list, width: int = 340, height: int = 300) -> str:
    """高低表现雷达图：高/低组在各指标上的中位数对比（按列最大值归一化）。"""
    def _metric_values(group, metric):
        if not isinstance(group, list):
            return []
        values = []
        for post in group:
            if not isinstance(post, dict):
                continue
            value = (post.get("metrics") or {}).get(metric)
            if (
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and not (isinstance(value, float) and (math.isnan(value) or math.isinf(value)))
            ):
                values.append(float(value))
        return values

    # 雷达图需要至少三个在高低两组都真实可见的维度。缺失值不能用 0 补画。
    metrics = [
        metric for metric in metrics
        if _metric_values(high, metric) and _metric_values(low, metric)
    ]
    if len(metrics) < 3:
        return ""

    def _collect(group):
        if not isinstance(group, list):
            return None
        vals = []
        for m in metrics:
            col = _metric_values(group, m)
            vals.append(sum(col) / len(col))
        return vals

    series = []
    hv, lv = _collect(high), _collect(low)
    if hv:
        series.append(("高表现", hv, "#3b82f6"))
    if lv:
        series.append(("低表现", lv, "#f59e0b"))
    if not series:
        return ""
    maxima = []
    for i in range(len(metrics)):
        col = [s[1][i] for s in series]
        maxima.append(max(col) or 1)
    cx, cy = width / 2, height / 2 + 8
    R = min(width, height) / 2 - 40
    n = len(metrics)

    def _coord(i, val):
        ang = -math.pi / 2 + 2 * math.pi * i / n
        r = (val / maxima[i]) * R if maxima[i] else 0
        return cx + r * math.cos(ang), cy + r * math.sin(ang)

    grid = []
    for ri in (0.25, 0.5, 0.75, 1.0):
        gp = " ".join(
            f"{cx + R * ri * math.cos(-math.pi / 2 + 2 * math.pi * i / n):.1f},"
            f"{cy + R * ri * math.sin(-math.pi / 2 + 2 * math.pi * i / n):.1f}"
            for i in range(n)
        )
        grid.append(f'<polygon points="{gp}" fill="none" stroke="#e2e8f0"/>')
    spokes = []
    for i in range(n):
        ang = -math.pi / 2 + 2 * math.pi * i / n
        ex, ey = cx + R * math.cos(ang), cy + R * math.sin(ang)
        spokes.append(f'<line x1="{cx}" y1="{cy}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#e2e8f0"/>')
        lx, ly = cx + (R + 14) * math.cos(ang), cy + (R + 14) * math.sin(ang)
        spokes.append(
            f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="9" fill="#64748b" text-anchor="middle">'
            f'{h_esc(METRIC_LABELS.get(metrics[i], metrics[i]))}</text>'
        )
    polys = []
    for label, vals, color in series:
        pp = " ".join(f"{_coord(i, vals[i])[0]:.1f},{_coord(i, vals[i])[1]:.1f}" for i in range(n))
        polys.append(
            f'<polygon points="{pp}" fill="{color}" fill-opacity="0.22" stroke="{color}" '
            f'stroke-width="1.5"><title>{h_esc(label)}</title></polygon>'
        )
    legend = " ".join(
        f'<span style="display:inline-block;margin-right:12px;font-size:11px;color:#475569;">'
        f'<span style="display:inline-block;width:10px;height:10px;border-radius:2px;'
        f'background:{color};margin-right:4px;"></span>{h_esc(label)}</span>'
        for _, _, color in series
    )
    return (
        f'<svg viewBox="0 0 {width} {height}" width="100%" preserveAspectRatio="xMidYMid meet" '
        f'role="img" aria-label="高低表现雷达图">{"" .join(grid)}{"".join(spokes)}{"".join(polys)}</svg>'
        f'<div style="margin-top:4px;">{legend}</div>'
    )


def svg_coverage_badges(coverage: dict) -> str:
    """字段覆盖率徽章（内联 HTML，按阈值变色）。"""
    if not coverage:
        return ""
    badges = []
    for k, v in coverage.items():
        pctv = v if isinstance(v, (int, float)) else 0
        color = "#16a34a" if pctv >= 0.8 else ("#d97706" if pctv >= 0.5 else "#dc2626")
        badges.append(
            f'<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:10px;'
            f'background:{color}1a;color:{color};border:1px solid {color}55;font-size:12px;">'
            f'{h_esc(METRIC_LABELS.get(k, k))} {fmt_pct(v)}</span>'
        )
    return '<p class="note">字段覆盖率徽章</p>' + "".join(badges)


# ---------------------------------------------------------------------------
# 数据加载
# ---------------------------------------------------------------------------

def load_json(path: Path):
    if not path.exists():
        warn(f"缺少文件: {path}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        warn(f"解析 JSON 失败 {path}: {exc}")
        return None


def load_posts_csv(path: Path) -> list[dict]:
    if not path.exists():
        warn(f"缺少文件: {path}")
        return []
    rows = []
    try:
        with path.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                rows.append(row)
                url = (row.get("post_url") or "").strip()
                if url:
                    state = _RENDER_STATE.get()
                    if state is not None:
                        state.known_post_urls.add(url)
                    else:
                        KNOWN_POST_URLS.add(url)
    except Exception as exc:  # noqa: BLE001
        warn(f"读取 CSV 失败 {path}: {exc}")
    return rows


# ---------------------------------------------------------------------------
# 各节渲染：每个函数返回 (md, html) 元组
# ---------------------------------------------------------------------------

def _safe_get(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        if k not in cur:
            return default
        cur = cur[k]
    return cur


def _classification_lifecycle_rows(analysis) -> list[list[str]]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}

    def lifecycle_value(key):
        if isinstance(analysis, dict) and key in analysis:
            return analysis.get(key)
        return meta.get(key) if isinstance(meta, dict) else None

    status = lifecycle_value("classification_status")
    status_labels = {
        "pending-model": "pending-model（待分类）",
        "partial-model": "partial-model（部分分类）",
        "completed": "completed（已完成）",
    }
    coverage = lifecycle_value("classification_coverage")
    if not isinstance(coverage, dict):
        coverage = {}
    rate = coverage.get("rate")
    rate_label = "—" if rate is None else fmt_float(rate, 4)
    return [
        ["分类状态 (classification_status)", status_labels.get(status, status or "—")],
        ["分类版本 (classification_version)", lifecycle_value("classification_version") or "—"],
        ["分类总数 (total_count)", fmt_int(coverage.get("total_count"))],
        ["已分类数 (classified_count)", fmt_int(coverage.get("classified_count"))],
        ["待分类数 (pending_count)", fmt_int(coverage.get("pending_count"))],
        ["分类覆盖率 (rate)", rate_label],
    ]


def _business_insight_lifecycle_rows(analysis) -> list[list[str]]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}

    def lifecycle_value(key):
        if isinstance(analysis, dict) and key in analysis:
            return analysis.get(key)
        return meta.get(key) if isinstance(meta, dict) else None

    status = lifecycle_value("business_insight_status")
    status_labels = {
        "not-requested": "not-requested（未请求）",
        "pending-model": "pending-model（待生成）",
        "partial-model": "partial-model（部分可核验）",
        "completed": "completed（已完成）",
    }
    required = lifecycle_value("business_insight_required")
    required_label = "是" if required is True else ("否" if required is False else "—")
    rows = [
        ["业务洞察是否必需 (business_insight_required)", required_label],
        [
            "业务洞察状态 (business_insight_status)",
            status_labels.get(status, status or "—"),
        ],
        [
            "业务洞察版本 (business_insight_version)",
            lifecycle_value("business_insight_version") or "—",
        ],
    ]
    contract = analysis.get("business_insights") if isinstance(analysis, dict) else None
    provenance = contract.get("provenance") if isinstance(contract, dict) else None
    if isinstance(provenance, dict):
        rows.extend(
            [
                [
                    "采集提交绑定 (collection_commit_sha256)",
                    provenance.get("collection_commit_sha256") or "—",
                ],
                [
                    "分类结果绑定 (classification_results_sha256)",
                    provenance.get("classification_results_sha256") or "—",
                ],
            ]
        )
    return rows


def _comment_insight_lifecycle_rows(analysis) -> list[list[str]]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}

    def lifecycle_value(key):
        if isinstance(analysis, dict) and key in analysis:
            return analysis.get(key)
        return meta.get(key) if isinstance(meta, dict) else None

    status = lifecycle_value("comment_insight_status")
    status_labels = {
        "pending-model": "pending-model（待生成）",
        "partial-model": "partial-model（部分可核验）",
        "completed": "completed（已完成）",
    }
    required = lifecycle_value("comment_insight_required")
    required_label = "是" if required is True else ("否" if required is False else "—")
    return [
        ["评论语义是否必需 (comment_insight_required)", required_label],
        [
            "评论语义状态 (comment_insight_status)",
            status_labels.get(status, status or "—"),
        ],
        [
            "评论语义版本 (comment_insight_version)",
            lifecycle_value("comment_insight_version") or "—",
        ],
    ]


def _status_count_rows(sample_boundary) -> list[list[str]]:
    counts = sample_boundary.get("status_counts", {})
    if not isinstance(counts, dict):
        counts = {}
    return [
        [f"采集状态 {status}", fmt_int(counts.get(status, 0))]
        for status in COLLECTION_STATUSES
    ]


def build_task_info(analysis, profile, posts_csv) -> tuple[str, str]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    account_name = meta.get("account_name") or (profile or {}).get("account_name") or "未知账号"
    platform = meta.get("platform") or (profile or {}).get("platform") or "—"
    profile_url = meta.get("profile_url") or (profile or {}).get("profile_url") or "—"
    profile_label = (
        "资料来源（OpenAPI userinfo）"
        if meta.get("collection_source") == AUTHORIZED_DOUYIN_SOURCE
        else "账号主页"
    )
    title = f"{account_name}（{platform}）公开账号分析报告"

    rows = [
        ["报告标题", title],
        ["任务 ID", meta.get("task_id") or "—"],
        ["平台", platform],
        ["账号名称", account_name],
        [profile_label, link_md(profile_url, profile_url) if profile_url != "—" else "—"],
        ["请求采集数量", fmt_int(meta.get("requested_limit"))],
        ["采集时间范围", f"{meta.get('date_from') or '—'} ~ {meta.get('date_to') or '—'}"],
        ["分析目的", meta.get("analysis_goal") or "—"],
        [
            "部分状态原因",
            ", ".join(meta.get("partial_reasons") or []) or "—",
        ],
        ["任务状态", meta.get("task_status") or "—"],
        ["停止原因", meta.get("stop_reason") or "—"],
        ["安全诊断码", meta.get("diagnostic_code") or "—"],
        [
            "平台响应码",
            (
                str(meta["platform_response_code"])
                if meta.get("platform_response_code") is not None
                else "—"
            ),
        ],
        ["采集来源", meta.get("collection_source") or "—"],
        ["索引快照时间", meta.get("snapshot_crawled_at") or "—"],
        ["索引年龄标注", meta.get("snapshot_age_label") or "—"],
        ["证据是否穷尽", (
            "否" if meta.get("evidence_is_exhaustive") is False
            else ("是" if meta.get("evidence_is_exhaustive") is True else "—")
        )],
        ["主排序指标", meta.get("main_sort_metric") or "—"],
    ]
    coverage = meta.get("collection_coverage")
    if platform == "bilibili":
        coverage = coverage if isinstance(coverage, dict) else {}
        unrecorded = "未记录（旧产物/未知）"
        rows.extend([
            ["B站常规列表来源", coverage.get("regular_source") or unrecorded],
            [
                "B站常规列表观测数",
                (
                    fmt_int(coverage.get("regular_observed_count"))
                    if "regular_observed_count" in coverage
                    else unrecorded
                ),
            ],
            ["B站动态入口状态", coverage.get("dynamic_status") or unrecorded],
            [
                "B站动态入口观测数",
                (
                    fmt_int(coverage.get("dynamic_observed_count"))
                    if "dynamic_observed_count" in coverage
                    else unrecorded
                ),
            ],
        ])
    if isinstance(meta.get("profile_overlay"), dict):
        rows.extend(
            [
                ["账号资料口径", "当前直连公开资料（已核验同账号密封提交）"],
                ["作品资料口径", "较旧索引作品证据（非实时、非穷尽）"],
            ]
        )
    rows.extend(_classification_lifecycle_rows(analysis))
    rows.extend(_business_insight_lifecycle_rows(analysis))
    rows.extend(_comment_insight_lifecycle_rows(analysis))
    md = md_table(["字段", "值"], rows)

    # 账号主页或授权资料来源行需要渲染为链接
    html_rows = []
    for k, v in rows:
        if k == profile_label and profile_url != "—":
            html_rows.append([Raw(h_esc(k)), link_html(profile_url, profile_url)])
        else:
            html_rows.append([Raw(h_esc(k)), Raw(h_esc(v))])
    html = html_table(["字段", "值"], html_rows)
    return md, html


def build_quality_summary(analysis) -> tuple[str, str]:
    sb = _safe_get(analysis, "sample_boundary", default={}) or {}
    if not sb:
        return EMPTY_MD, EMPTY_HTML

    tr = sb.get("time_range", {}) or {}
    time_range = f"{tr.get('content_earliest') or '—'} ~ {tr.get('content_latest') or '—'}"

    rows = [
        ["请求数量 (requested)", fmt_int(sb.get("requested"))],
        ["实际采集数量 (collected)", fmt_int(sb.get("collected"))],
        ["有效数量 (valid)", fmt_int(sb.get("valid"))],
        ["缺失内容 (missing)", fmt_int(sb.get("missing"))],
        ["受限内容 (restricted)", fmt_int(sb.get("restricted"))],
        ["被排除标记内容 (excluded_flagged)", fmt_int(sb.get("excluded_flagged"))],
        ["有效内容时间范围", time_range],
    ]
    rows.extend(_status_count_rows(sb))
    md = md_table(["样本边界指标", "数值"], rows)

    # 字段覆盖率子表
    fc = sb.get("field_coverage", {}) or {}
    if fc:
        fc_rows = [[METRIC_LABELS.get(k, k), fmt_pct(v)] for k, v in fc.items()]
        md += "\n\n**指标字段覆盖率**\n\n" + md_table(["指标", "覆盖率"], fc_rows)
        fc_html = [[Raw(h_esc(METRIC_LABELS.get(k, k))), Raw(h_esc(fmt_pct(v)))]
                   for k, v in fc.items()]
        cov_html = '<p class="note">指标字段覆盖率</p>' + html_table(["指标", "覆盖率"], fc_html)
        # 字段覆盖率徽章（阈值着色，零依赖）
        cov_html += svg_coverage_badges(fc)
    else:
        cov_html = ""

    html = html_table(["样本边界指标", "数值"],
                      [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in rows]) + cov_html
    return md, html


def build_account_card(profile, analysis=None) -> tuple[str, str]:
    if not profile:
        positioning_md, positioning_html = _business_positioning_block(analysis)
        return _append_report_block(
            EMPTY_MD, EMPTY_HTML, positioning_md, positioning_html
        )
    verified = profile.get("verified")
    if verified is True:
        verified_label = "是"
    elif verified is False:
        verified_label = "否"
    elif verified is None or verified == "":
        verified_label = "—"
    else:
        verified_label = str(verified)
    platform = profile.get("platform") or "—"
    platform_key = str(platform).casefold()
    platform_metrics = profile.get("platform_metrics")
    if not isinstance(platform_metrics, dict):
        platform_metrics = {}
    profile_label = (
        "资料来源（OpenAPI userinfo）"
        if platform_metrics.get("authorization_source")
        == AUTHORIZED_DOUYIN_SOURCE
        else "主页"
    )
    rows = [
        ["平台", platform],
        ["账号 ID", profile.get("account_id") or "—"],
        ["账号名称", profile.get("account_name") or "—"],
        ["认证信息", verified_label],
        ["粉丝数", fmt_int(profile.get("followers"))],
        ["作品数", fmt_int(profile.get("post_count"))],
    ]
    if platform_key == "bilibili":
        rows.append(["账号等级", fmt_int(profile.get("level"))])
    elif platform_key == "douyin":
        douyin_id = (
            platform_metrics.get("douyin_id")
            or platform_metrics.get("unique_id")
            or profile.get("unique_id")
        )
        rows.extend(
            [
                ["抖音号", douyin_id or "—"],
                ["获赞总量", fmt_int(platform_metrics.get("total_likes"))],
            ]
        )
    elif platform_key == "weibo":
        rows.append(["关注数", fmt_int(platform_metrics.get("following"))])
    rows.extend(
        [
            ["简介", profile.get("bio") or "—"],
            [
                profile_label,
                link_md(profile.get("profile_url") or "", profile.get("profile_url") or "—")
                if profile.get("profile_url")
                else "—",
            ],
        ]
    )
    md = md_table(["字段", "值"], rows)

    html_rows = []
    for k, v in rows:
        if k == profile_label and profile.get("profile_url"):
            html_rows.append([Raw(h_esc(k)), link_html(profile["profile_url"], profile["profile_url"])])
        else:
            html_rows.append([Raw(h_esc(k)), Raw(h_esc(v))])
    html = html_table(["字段", "值"], html_rows)
    positioning_md, positioning_html = _business_positioning_block(analysis)
    return _append_report_block(md, html, positioning_md, positioning_html)


def build_content_structure(analysis, posts_csv) -> tuple[str, str]:
    if not posts_csv and not analysis:
        return EMPTY_MD, EMPTY_HTML

    # 内容形态分布（来自 CSV）
    ct_counter = Counter(r.get("content_type") or "unknown" for r in posts_csv)
    ct_rows = [[k, fmt_int(v)] for k, v in ct_counter.most_common()]

    # 标记内容计数（置顶 / 转载 / 投放）
    def _b(v):
        return str(v).strip().lower() in ("true", "1", "yes")
    flag_rows = [
        ["置顶 (is_pinned)", fmt_int(sum(1 for r in posts_csv if _b(r.get("is_pinned"))))],
        ["转载 (is_repost)", fmt_int(sum(1 for r in posts_csv if _b(r.get("is_repost"))))],
        ["投放 (is_promoted)", fmt_int(sum(1 for r in posts_csv if _b(r.get("is_promoted"))))],
    ]

    carrier_note = "平台内容载体（采集字段 content_type；不同于模型分类的内容形式（format））"
    md = f"**{carrier_note}**\n\n" + md_table(["平台内容载体", "数量"], ct_rows) + \
         "\n\n**特殊标记内容**\n\n" + md_table(["标记类型", "数量"], flag_rows)

    html = f'<p class="note">{h_esc(carrier_note)}</p>' + \
        html_table(["平台内容载体", "数量"], [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in ct_rows]) + \
        '<p class="note">特殊标记内容</p>' + \
        html_table(["标记类型", "数量"], [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in flag_rows])
    return md, html


def _cadence_inference_allowed(analysis, cadence) -> bool:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    if cadence.get("cadence_inference_allowed") is False:
        return False
    if meta.get("evidence_is_exhaustive") is False:
        return False
    return not (
        meta.get("collection_source") in INDEX_COLLECTION_SOURCES
        and meta.get("evidence_is_exhaustive") is False
    )


def _validate_lifecycle_consistency(analysis) -> None:
    if not isinstance(analysis, dict):
        return
    meta = analysis.get("meta")
    if not isinstance(meta, dict):
        return
    for key in (
        "classification_status",
        "classification_version",
        "classification_coverage",
        "business_insight_required",
        "business_insight_status",
        "business_insight_version",
    ):
        if key in analysis and key in meta and analysis.get(key) != meta.get(key):
            raise RenderError(f"analysis lifecycle conflict for {key}")


def _validate_statistical_consistency(analysis) -> None:
    """Reject summaries whose quartiles cannot describe one distribution."""
    metric_summary = analysis.get("metric_summary")
    if not isinstance(metric_summary, dict):
        return
    for metric, summary in metric_summary.items():
        if not isinstance(summary, dict):
            continue
        values = [summary.get(key) for key in ("p25", "median", "p75")]
        if any(value is None for value in values):
            continue
        if not all(
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            for value in values
        ):
            raise RenderError(f"metric_summary.{metric} quantiles are invalid")
        p25, median, p75 = values
        if not p25 <= median <= p75:
            raise RenderError(
                f"metric_summary.{metric} quantiles are inconsistent"
            )


def _classification_is_completed(analysis) -> bool:
    if not isinstance(analysis, dict):
        return False
    meta = analysis.get("meta")
    root_has_status = "classification_status" in analysis
    meta_has_status = isinstance(meta, dict) and "classification_status" in meta
    if (
        root_has_status
        and meta_has_status
        and analysis.get("classification_status")
        != meta.get("classification_status")
    ):
        raise RenderError("analysis lifecycle conflict for classification_status")
    status = (
        analysis.get("classification_status")
        if root_has_status
        else (meta.get("classification_status") if meta_has_status else None)
    )
    return status == "completed"


def build_publish_cadence(analysis) -> tuple[str, str]:
    cad = _safe_get(analysis, "publish_cadence", default={}) or {}
    if not cad:
        return EMPTY_MD, EMPTY_HTML

    inference_allowed = _cadence_inference_allowed(analysis, cad)
    unit = cad.get("interval_unit", "hours")
    rows = [
        ["总发布数量" if inference_allowed else "可见样本数量", fmt_int(cad.get("total_posts"))],
        ["活跃发布日数" if inference_allowed else "样本活跃发布日数", fmt_int(cad.get("coverage_days"))],
        ["覆盖周数" if inference_allowed else "样本覆盖周数", fmt_int(cad.get("coverage_weeks"))],
        ["周均发布量" if inference_allowed else "样本窗口折算周均", fmt_float(cad.get("weekly_avg"))],
        ["发布间隔中位数" if inference_allowed else "样本发布间隔中位数", f"{fmt_float(cad.get('median_interval_hours'))} {unit}"],
        ["最长断更时间" if inference_allowed else "样本最长间隔", f"{fmt_float(cad.get('longest_gap_hours'))} {unit}"],
    ]
    md = md_table(["节奏指标", "数值"], rows)

    ww = cad.get("weekday_weekend", {}) or {}
    if ww:
        md += "\n\n**工作日 / 周末分布**\n\n" + md_table(
            ["类别", "数量", "占比"],
            [["工作日", fmt_int(ww.get("weekday_count")), fmt_pct(ww.get("weekday_pct"))],
             ["周末", fmt_int(ww.get("weekend_count")), fmt_pct(ww.get("weekend_pct"))]],
        )

    html = html_table(["节奏指标", "数值"],
                      [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in rows])
    if not inference_allowed:
        sample_note = cad.get("scope_note")
        if not isinstance(sample_note, str) or not sample_note.strip():
            meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
            sample_note = (
                "索引证据并非穷尽作品列表；以下仅描述可见样本的日期分布，"
                "不用于推断账号发布频率、发布间隔或排播规律。"
                if meta.get("collection_source") in INDEX_COLLECTION_SOURCES
                else (
                    "当前证据不是已验证的穷尽作品列表；以下仅描述可见样本窗口，"
                    "不用于推断账号整体发布频率、发布间隔或排播规律。"
                )
            )
        md += f"\n\n> {sample_note}"
        html += f'<p class="note">{h_esc(sample_note)}</p>'
    cadence_note = cad.get("note")
    if cadence_note:
        md += f"\n\n> {md_escape_text(cadence_note)}"
        html += f'<p class="note">{h_esc(cadence_note)}</p>'
    if ww:
        html += '<p class="note">工作日 / 周末分布</p>' + html_table(
            ["类别", "数量", "占比"],
            [[Raw("工作日"), Raw(h_esc(fmt_int(ww.get("weekday_count")))), Raw(h_esc(fmt_pct(ww.get("weekday_pct"))))],
             [Raw("周末"), Raw(h_esc(fmt_int(ww.get("weekend_count")))), Raw(h_esc(fmt_pct(ww.get("weekend_pct"))))]],
        )

    # 星期分布（横向条）
    wd = cad.get("weekday_distribution", {}) or {}
    if wd:
        maxv = max((int(v) for v in wd.values()), default=1) or 1
        bars = []
        for i in range(7):
            cnt = int(wd.get(str(i), 0))
            pct = (cnt / maxv * 100) if maxv else 0
            bars.append(f'<div style="display:flex;align-items:center;gap:8px;margin:3px 0;">'
                        f'<span style="width:32px;color:var(--text-soft);">{WEEKDAY_NAMES[i]}</span>'
                        f'<span style="flex:1;background:var(--accent-soft);border-radius:4px;height:14px;position:relative;">'
                        f'<span style="position:absolute;left:0;top:0;height:14px;width:{pct:.1f}%;'
                        f'background:var(--accent);border-radius:4px;"></span></span>'
                        f'<span style="width:28px;text-align:right;">{cnt}</span></div>')
        html += '<p class="note">星期分布</p>' + "".join(bars)

    # 发布时段分布（24 小时柱状图，内联 SVG，零依赖）
    hr = cad.get("hour_distribution", {}) or {}
    if hr:
        hour_svg = svg_post_hour_distribution(hr)
        if hour_svg:
            html += '<p class="note">发布时段分布（24 小时）</p>' + hour_svg
        total_hr = sum(int(v) for v in hr.values())
        if total_hr:
            ranked = sorted(((int(k), int(v)) for k, v in hr.items()), key=lambda x: -x[1])
            top = ranked[:3]
            # 白天(6-22) / 深夜(22-6) 占比，作为可解释提示
            daytime = sum(int(v) for k, v in hr.items() if 6 <= int(k) < 22)
            nighttime = total_hr - daytime
            md += "\n\n**发布时段分布（24 小时）**\n\n" + \
                  "峰值时段：" + "、".join(f"{h:02d}:00（{c} 条）" for h, c in top) + "\n\n" + \
                  f"- 白天(06:00–22:00)占比：{fmt_pct(daytime / total_hr)}，" + \
                  f"深夜(22:00–06:00)占比：{fmt_pct(nighttime / total_hr)}"

    # 时间轴散点图（内联 SVG，零依赖）
    scatter = svg_timeline_scatter(analysis.get("posts") or [])
    if scatter:
        html += '<p class="note">发布时间-播放量散点图</p>' + scatter
    return md, html


def build_metrics_dashboard(analysis) -> tuple[str, str]:
    ms = _safe_get(analysis, "metric_summary", default={}) or {}
    eng = _safe_get(analysis, "engagement", default={}) or {}
    if not ms and not eng:
        return EMPTY_MD, EMPTY_HTML

    headers = ["指标", "count", "median", "p25", "p75", "min", "max", "缺失率"]
    rows = []
    for f in METRIC_FIELDS:
        d = ms.get(f)
        if not isinstance(d, dict):
            continue
        rows.append([
            METRIC_LABELS.get(f, f),
            fmt_int(d.get("count")),
            fmt_metric(d.get("median")),
            fmt_metric(d.get("p25")),
            fmt_metric(d.get("p75")),
            fmt_metric(d.get("minimum")),
            fmt_metric(d.get("maximum")),
            fmt_pct(d.get("missing_rate")),
        ])
    md = md_table(headers, rows) if rows else EMPTY_MD
    html = html_table(headers, [[Raw(h_esc(c)) if i == 0 else Raw(h_esc(c))
                                 for i, c in enumerate(r)] for r in rows]) if rows else EMPTY_HTML

    # 互动率（分母透明，四分法分列呈现）
    er_defs = [
        ("view_based_engagement_rate", "基于播放的互动率 (view_based)"),
        ("follower_based_engagement_ratio", "基于粉丝的互动比 (follower_based)"),
        ("deep_approval_rate", "深度认可率 (coins+favorites)/views"),
        ("community_discussion_rate", "社群讨论率 (comments+danmaku)/views"),
    ]
    er_rows, er_html = [], []
    for key, label in er_defs:
        d = eng.get(key, {}) or {}
        if not isinstance(d, dict) or not d.get("count"):
            continue
        er_rows.append([label, fmt_int(d.get("count")), fmt_pct(d.get("median")),
                        fmt_pct(d.get("p25")), fmt_pct(d.get("p75")),
                        fmt_pct(d.get("minimum")), fmt_pct(d.get("maximum")),
                        fmt_pct(d.get("missing_rate"))])
        er_html.append([Raw(h_esc(label)), Raw(h_esc(fmt_int(d.get("count")))),
                        Raw(h_esc(fmt_pct(d.get("median")))), Raw(h_esc(fmt_pct(d.get("p25")))),
                        Raw(h_esc(fmt_pct(d.get("p75")))), Raw(h_esc(fmt_pct(d.get("minimum")))),
                        Raw(h_esc(fmt_pct(d.get("maximum")))), Raw(h_esc(fmt_pct(d.get("missing_rate"))))])
    if er_rows:
        md += "\n\n**互动率（分母透明，四分法分列呈现）**\n\n" + md_table(
            ["互动指标", "count", "median", "p25", "p75", "min", "max", "缺失率"], er_rows)
        note = eng.get("denominator_note")
        if note:
            md += f"\n\n> 说明：{note}"

        html += '<p class="note">互动率（分母透明，四分法分列呈现）</p>' + html_table(
            ["互动指标", "count", "median", "p25", "p75", "min", "max", "缺失率"], er_html)
        if note:
            html += f'<p class="note">{h_esc(note)}</p>'
    return md, html


def _metrics_contract_text(metrics) -> str:
    values = metrics if isinstance(metrics, dict) else {}
    return "; ".join(
        f"{metric}={fmt_metric(values.get(metric))}"
        for metric in METRIC_FIELDS
    )


def _canonical_jingxuan_report_item(url, post_id, platform) -> str | None:
    expected = str(post_id or "").strip()
    if platform != "douyin" or not expected.isdigit() or not _is_safe_public_url(url):
        return None
    parsed = urlsplit(url)
    if parsed.hostname != "jingxuan.douyin.com":
        return None
    if parsed.path != f"/m/video/{expected}":
        return None
    return f"https://jingxuan.douyin.com/m/video/{expected}"


def _canonical_report_item_url(
    record, url, default_platform, default_collection_source
) -> str | None:
    platform = record.get("platform") or default_platform
    post_id = record.get("post_id")
    if not isinstance(platform, str) or not str(post_id or "").strip():
        return None
    collection_source = (
        record.get("collection_source") or default_collection_source
    )
    if collection_source == "douyin_jingxuan":
        return _canonical_jingxuan_report_item(url, post_id, platform)
    return canonical_item_url(platform, url, post_id)


def _report_reference(
    record,
    *,
    url_field: str,
    require_item_known: bool,
    default_platform=None,
    default_collection_source=None,
) -> tuple[MdRaw, Raw]:
    kind = record.get("url_kind") if isinstance(record, dict) else None
    if kind == "item":
        url = record.get(url_field)
        item_known = not require_item_known or record.get("item_url_known") is True
        canonical_url = _canonical_report_item_url(
            record, url, default_platform, default_collection_source
        )
        if item_known and canonical_url is not None and canonical_url == url:
            ref_post(canonical_url)
            label = "item（作品链接）"
            md_link = link_md(canonical_url, "作品链接")
            html_link = link_html(canonical_url, "作品链接")
            return (
                MdRaw(f"{md_escape_text(label)}：{md_link.s}"),
                Raw(f"{h_esc(label)}：{html_link.s}"),
            )
        label = "item（无安全作品链接）"
        return MdRaw(md_escape_text(label)), Raw(h_esc(label))

    if kind == "profile_index":
        url = record.get(url_field)
        label = "profile_index（主页证据锚点，不是作品链接）"
        platform = record.get("platform") or default_platform
        canonical_url = (
            canonical_profile_url("douyin", url)
            if platform == "douyin"
            else None
        )
        if canonical_url is not None and canonical_url == url:
            md_link = link_md(canonical_url, "主页证据锚点")
            html_link = link_html(canonical_url, "主页证据锚点")
            return (
                MdRaw(f"{md_escape_text(label)}：{md_link.s}"),
                Raw(f"{h_esc(label)}：{html_link.s}"),
            )
        return MdRaw(md_escape_text(label)), Raw(h_esc(label))

    kind_label = str(kind) if kind not in (None, "") else "missing"
    label = f"{kind_label}（无单条作品链接）"
    return MdRaw(md_escape_text(label)), Raw(h_esc(label))


def _performance_reference(
    record, default_platform=None, default_collection_source=None
) -> tuple[MdRaw, Raw]:
    if record.get("url_kind") == "profile_index":
        return _report_reference(
            record,
            url_field="evidence_url",
            require_item_known=True,
            default_platform=default_platform,
            default_collection_source=default_collection_source,
        )
    return _report_reference(
        record,
        url_field="post_url",
        require_item_known=True,
        default_platform=default_platform,
        default_collection_source=default_collection_source,
    )


def build_decision_summary(analysis) -> tuple[str, str]:
    """Render a compact evidence-backed reading of computed analysis results."""
    if not isinstance(analysis, dict):
        return EMPTY_MD, EMPTY_HTML

    meta = analysis.get("meta") if isinstance(analysis.get("meta"), dict) else {}
    sample = (
        analysis.get("sample_boundary")
        if isinstance(analysis.get("sample_boundary"), dict)
        else {}
    )
    rows_md: list[list[object]] = []
    rows_html: list[list[object]] = []

    def append_row(question: str, finding: str, evidence_md, evidence_html) -> None:
        rows_md.append([question, finding, evidence_md])
        rows_html.append([question, finding, evidence_html])

    valid = sample.get("valid")
    time_range = sample.get("time_range")
    time_range = time_range if isinstance(time_range, dict) else {}
    earliest = time_range.get("content_earliest")
    latest = time_range.get("content_latest")
    if valid is not None:
        scope = "已验证穷尽范围" if meta.get("evidence_is_exhaustive") is True else "当前可见样本"
        finding = f"{fmt_int(valid)} 条有效作品；{scope}。"
        evidence = (
            f"时间范围 {earliest or '—'} 至 {latest or '—'}；"
            "sample_boundary"
        )
        append_row("证据范围", finding, evidence, evidence)

    metric_summary = (
        analysis.get("metric_summary")
        if isinstance(analysis.get("metric_summary"), dict)
        else {}
    )
    main_metric = meta.get("main_sort_metric")
    if not isinstance(metric_summary.get(main_metric), dict):
        main_metric = "views" if isinstance(metric_summary.get("views"), dict) else None
    if main_metric is None:
        main_metric = next(
            (key for key, value in metric_summary.items() if isinstance(value, dict)),
            None,
        )
    metric_stats = metric_summary.get(main_metric) if main_metric else None
    if isinstance(metric_stats, dict) and metric_stats.get("median") is not None:
        label = "播放" if main_metric == "views" else METRIC_LABELS.get(
            main_metric, str(main_metric)
        )
        finding = (
            f"{label}中位数 {fmt_metric(metric_stats.get('median'))}；"
            f"中间 50% 为 {fmt_metric(metric_stats.get('p25'))}–"
            f"{fmt_metric(metric_stats.get('p75'))}；"
            f"峰值 {fmt_metric(metric_stats.get('maximum'))}。"
        )
        try:
            median_value = float(metric_stats.get("median"))
            maximum_value = float(metric_stats.get("maximum"))
        except (TypeError, ValueError):
            median_value = maximum_value = 0.0
        if median_value > 0 and math.isfinite(maximum_value):
            finding += (
                "峰值约为中位数 "
                f"{fmt_float(maximum_value / median_value, 1)} 倍。"
            )
        evidence_md: object = f"analysis.json · metric_summary.{main_metric}"
        evidence_html: object = evidence_md
        high = analysis.get("high_performance")
        if isinstance(high, list) and high and isinstance(high[0], dict):
            top = high[0]
            reference_md, reference_html = _performance_reference(
                top,
                meta.get("platform"),
                meta.get("collection_source"),
            )
            title = top.get("title") or top.get("post_id") or "代表作品"
            evidence_md = MdRaw(
                f"{md_escape_text(title)}；{reference_md.s}"
            )
            evidence_html = Raw(
                f"{h_esc(title)}；{reference_html.s}"
            )
        append_row("触达基线", finding, evidence_md, evidence_html)

    engagement = (
        analysis.get("engagement")
        if isinstance(analysis.get("engagement"), dict)
        else {}
    )
    view_engagement = engagement.get("view_based_engagement_rate")
    if isinstance(view_engagement, dict) and view_engagement.get("median") is not None:
        engagement_parts = [
            "播放互动率中位数 "
            f"{fmt_pct(view_engagement.get('median'))}"
        ]
        deep_approval = engagement.get("deep_approval_rate")
        if isinstance(deep_approval, dict) and deep_approval.get("median") is not None:
            engagement_parts.append(
                f"深度认可率 {fmt_pct(deep_approval.get('median'))}"
            )
        discussion = engagement.get("community_discussion_rate")
        if isinstance(discussion, dict) and discussion.get("median") is not None:
            engagement_parts.append(
                f"社群讨论率 {fmt_pct(discussion.get('median'))}"
            )
        finding = "；".join(engagement_parts) + "；均以播放为分母，只用于账号内部比较。"
        evidence = "analysis.json · engagement.view_based_engagement_rate"
        append_row("互动基线", finding, evidence, evidence)

    posts = analysis.get("posts") if isinstance(analysis.get("posts"), list) else []
    if _classification_is_completed(analysis) and posts:
        for key, label in (("topic", "主题"), ("format", "内容形式")):
            values = [
                str(post.get(key))
                for post in posts
                if isinstance(post, dict)
                and post.get(key) not in (None, "", "unknown", "other")
            ]
            if not values:
                continue
            top_value, top_count = Counter(values).most_common(1)[0]
            finding = (
                f"{label}「{top_value}」占 {fmt_pct(top_count / len(values))}"
                f"（{top_count}/{len(values)}）。"
            )
            evidence = f"analysis.json · posts[].{key}（已完成分类）"
            append_row("内容结构", finding, evidence, evidence)

    cadence = (
        analysis.get("publish_cadence")
        if isinstance(analysis.get("publish_cadence"), dict)
        else {}
    )
    interval_hours = cadence.get("median_interval_hours")
    if _cadence_inference_allowed(analysis, cadence) and interval_hours is not None:
        try:
            interval_days = float(interval_hours) / 24
        except (TypeError, ValueError):
            interval_days = None
        if interval_days is not None:
            finding = f"发布间隔中位数 {fmt_float(interval_days, 1)} 天。"
            evidence = "analysis.json · publish_cadence.median_interval_hours"
            append_row("发布节奏", finding, evidence, evidence)

    if not rows_md:
        return EMPTY_MD, EMPTY_HTML
    note = (
        "这里先回答最重要的问题；详细分布、完整表现组、语义证据与限制"
        "在后续章节和 analysis.json 中展开。"
    )
    markdown = (
        "**决策摘要**\n\n"
        + md_table(["问题", "当前判断", "依据"], rows_md)
        + f"\n\n> {note}"
    )
    html = (
        '<p class="note">决策摘要</p>'
        + html_table(["问题", "当前判断", "依据"], rows_html)
        + f'<p class="note">{h_esc(note)}</p>'
    )
    return markdown, html


def _main_metric_text(record, main_metric, metric_label) -> str:
    metric = record.get("main_metric") or main_metric
    label = metric_label or (METRIC_LABELS.get(metric, metric) if metric else "—")
    metrics = record.get("metrics") if isinstance(record.get("metrics"), dict) else {}
    raw_value = record.get("value") if "value" in record else metrics.get(metric)
    metric_name = str(metric) if metric else "—"
    return f"{label}: {fmt_metric(raw_value)} ({metric_name})"


def _relative_to_main_median(record, main_metric) -> str:
    value = record.get("relative_to_main_median")
    if value is None:
        relative_performance = record.get("relative_performance")
        if isinstance(relative_performance, dict) and main_metric:
            value = relative_performance.get(main_metric)
    return fmt_float(value, 4)


def _render_perf_group(
    group,
    main_metric: str | None = None,
    metric_label: str | None = None,
    default_platform=None,
    default_collection_source=None,
) -> tuple[str, str]:
    if not isinstance(group, list) or not group:
        return EMPTY_MD, EMPTY_HTML

    headers = [
        "排名",
        "post_id",
        "内容",
        "URL 类型 / 证据",
        "发布时间",
        "主指标名称与值",
        "relative_to_main_median",
        "完整 metrics",
        "collected_at",
    ]
    rows_md, rows_html = [], []
    for p in group:
        if not isinstance(p, dict):
            continue
        pid = p.get("post_id") or "—"
        display = p.get("title") or pid
        pub = p.get("published_at") or "—"
        md_reference, html_reference = _performance_reference(
            p, default_platform, default_collection_source
        )
        main_metric_text = _main_metric_text(p, main_metric, metric_label)
        relative = _relative_to_main_median(p, p.get("main_metric") or main_metric)
        metrics_text = _metrics_contract_text(p.get("metrics"))
        collected_at = p.get("collected_at") or "—"
        rows_md.append(
            [
                fmt_int(p.get("rank")),
                pid,
                display,
                md_reference,
                pub,
                main_metric_text,
                relative,
                metrics_text,
                collected_at,
            ]
        )
        rows_html.append(
            [
                fmt_int(p.get("rank")),
                pid,
                display,
                html_reference,
                pub,
                main_metric_text,
                relative,
                metrics_text,
                collected_at,
            ]
        )
    if not rows_md:
        return EMPTY_MD, EMPTY_HTML
    return md_table(headers, rows_md), html_table(headers, rows_html)


def _append_report_block(
    md: str, html: str, extra_md: str, extra_html: str
) -> tuple[str, str]:
    if not extra_md and not extra_html:
        return md, html
    combined_md = extra_md if md == EMPTY_MD else md + "\n\n" + extra_md
    combined_html = extra_html if html == EMPTY_HTML else html + extra_html
    return combined_md, combined_html


_BUSINESS_POSITIONING_LABELS = (
    ("target_audience", "目标受众"),
    ("content_domain", "内容领域"),
    ("value_proposition", "价值主张"),
    ("persona_expression", "人设 / 品牌表达"),
    ("follow_reason", "关注理由"),
)
_BUSINESS_PATTERN_LABELS = {
    "high-title": "高表现公开文案特征（标题）",
    "high-opening": "高表现公开文案特征（公开文案开头）",
    "high-structure": "高表现公开文案特征（公开文案结构）",
    "low-title": "低表现公开文案特征（标题）",
    "low-opening": "低表现公开文案特征（公开文案开头）",
    "low-structure": "低表现公开文案特征（公开文案结构）",
}


def _business_contract(analysis):
    if not isinstance(analysis, dict):
        return None
    contract = analysis.get("business_insights")
    if not isinstance(contract, dict):
        return None
    if contract.get("status") not in {"completed", "partial-model"}:
        return None
    return contract


def _business_evidence_table(analysis, evidence_items) -> tuple[str, str]:
    if not isinstance(evidence_items, list) or not evidence_items:
        return "", ""
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    default_platform = meta.get("platform") if isinstance(meta, dict) else None
    default_source = (
        meta.get("collection_source") if isinstance(meta, dict) else None
    )
    headers = ["post_id", "证据字段", "原文摘录", "URL 类型 / 证据", "collected_at"]
    unique_evidence = []
    seen_evidence: set[str] = set()
    for evidence in evidence_items:
        if not isinstance(evidence, dict):
            continue
        try:
            evidence_key = json.dumps(
                evidence,
                ensure_ascii=False,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
        except (TypeError, ValueError):
            evidence_key = None
        if evidence_key is not None:
            if evidence_key in seen_evidence:
                continue
            seen_evidence.add(evidence_key)
        unique_evidence.append(evidence)

    rows_md = []
    rows_html = []
    for evidence in unique_evidence[:REPORT_INLINE_EVIDENCE_LIMIT]:
        md_reference, html_reference = _report_reference(
            evidence,
            url_field="url",
            require_item_known=True,
            default_platform=default_platform,
            default_collection_source=default_source,
        )
        values = [
            evidence.get("post_id") or "—",
            evidence.get("source_field") or "—",
            evidence.get("excerpt") or "—",
        ]
        rows_md.append(
            values + [md_reference, evidence.get("collected_at") or "—"]
        )
        rows_html.append(
            values + [html_reference, evidence.get("collected_at") or "—"]
        )
    if not rows_md:
        return "", ""
    markdown = md_table(headers, rows_md)
    html = html_table(headers, rows_html)
    if len(unique_evidence) > REPORT_INLINE_EVIDENCE_LIMIT:
        note = (
            f"正文仅展示 {REPORT_INLINE_EVIDENCE_LIMIT} 条代表证据；"
            "完整证据保存在 source/business-insight-results.json。"
        )
        markdown += f"\n\n> {note}"
        html += f'<p class="note">{h_esc(note)}</p>'
    return markdown, html


def _business_positioning_block(analysis) -> tuple[str, str]:
    contract = _business_contract(analysis)
    positioning = contract.get("account_positioning") if contract else None
    if not isinstance(positioning, dict):
        return "", ""
    md_blocks = ["**模型业务洞察：账号定位**"]
    html_blocks = ['<p class="note">模型业务洞察：账号定位</p>']
    rendered = 0
    for field, label in _BUSINESS_POSITIONING_LABELS:
        claim = positioning.get(field)
        if not isinstance(claim, dict):
            continue
        evidence_md, evidence_html = _business_evidence_table(
            analysis, claim.get("evidence")
        )
        md_block = (
            f"**{md_escape_text(label)}**\n\n"
            f"{md_escape_text(claim.get('statement') or '—')}"
        )
        html_block = (
            '<div class="business-insight">'
            f"<p><strong>{h_esc(label)}</strong></p>"
            f"<p>{h_esc(claim.get('statement') or '—')}</p>"
        )
        if evidence_md:
            md_block += "\n\n" + evidence_md
            html_block += evidence_html
        html_block += "</div>"
        md_blocks.append(md_block)
        html_blocks.append(html_block)
        rendered += 1
    if not rendered:
        return "", ""
    return "\n\n".join(md_blocks), "".join(html_blocks)


def _business_patterns_block(analysis, group: str) -> tuple[str, str]:
    contract = _business_contract(analysis)
    patterns = contract.get("performance_patterns") if contract else None
    if not isinstance(patterns, list):
        return "", ""
    group_label = "高表现" if group == "high" else "低表现"
    md_blocks = [f"**模型业务洞察：{group_label}公开文案特征**"]
    html_blocks = [
        f'<p class="note">模型业务洞察：{h_esc(group_label)}公开文案特征</p>'
    ]
    rendered = 0
    for pattern in patterns:
        if not isinstance(pattern, dict):
            continue
        pattern_id = pattern.get("id")
        if not isinstance(pattern_id, str) or not pattern_id.startswith(f"{group}-"):
            continue
        label = _BUSINESS_PATTERN_LABELS.get(pattern_id, pattern_id)
        if pattern.get("observability") == "not_observable":
            limitation = pattern.get("limitation") or "该公开文案特征不可核验。"
            md_block = (
                f"**{md_escape_text(label)}**\n\n"
                f"> 可观测性限制：{md_escape_text(limitation)}"
            )
            html_block = (
                '<div class="business-insight">'
                f"<p><strong>{h_esc(label)}</strong></p>"
                f'<p class="note">可观测性限制：{h_esc(limitation)}</p>'
                "</div>"
            )
        else:
            evidence_md, evidence_html = _business_evidence_table(
                analysis, pattern.get("evidence")
            )
            md_block = (
                f"**{md_escape_text(label)}**\n\n"
                f"{md_escape_text(pattern.get('statement') or '—')}"
            )
            html_block = (
                '<div class="business-insight">'
                f"<p><strong>{h_esc(label)}</strong></p>"
                f"<p>{h_esc(pattern.get('statement') or '—')}</p>"
            )
            if evidence_md:
                md_block += "\n\n" + evidence_md
                html_block += evidence_html
            html_block += "</div>"
        md_blocks.append(md_block)
        html_blocks.append(html_block)
        rendered += 1
    if not rendered:
        return "", ""
    return "\n\n".join(md_blocks), "".join(html_blocks)


def _business_modes_block(analysis) -> tuple[str, str]:
    contract = _business_contract(analysis)
    modes = contract.get("content_modes") if contract else None
    if not isinstance(modes, list) or not modes:
        return "", ""
    md_blocks = ["**模型业务洞察：内容模式（5 项）**"]
    html_blocks = ['<p class="note">模型业务洞察：内容模式（5 项）</p>']
    for mode in modes:
        if not isinstance(mode, dict):
            continue
        title = f"{mode.get('id') or '—'} · {mode.get('name') or '—'}"
        evidence_md, evidence_html = _business_evidence_table(
            analysis, mode.get("evidence")
        )
        md_block = (
            f"**{md_escape_text(title)}**\n\n"
            f"- 模式配方：{md_escape_text(mode.get('recipe') or '—')}"
        )
        html_block = (
            '<div class="business-insight">'
            f"<p><strong>{h_esc(title)}</strong></p>"
            f"<p>模式配方：{h_esc(mode.get('recipe') or '—')}</p>"
        )
        if evidence_md:
            md_block += "\n\n" + evidence_md
            html_block += evidence_html
        md_blocks.append(md_block)
        html_blocks.append(html_block + "</div>")
    return "\n\n".join(md_blocks), "".join(html_blocks)


def _business_strategy_block(analysis) -> tuple[str, str]:
    contract = _business_contract(analysis)
    if contract is None:
        return "", ""
    md_blocks = []
    html_blocks = []
    topics = contract.get("topic_ideas")
    if isinstance(topics, list) and topics:
        topic_md = ["**模型业务洞察：选题方向（10 项）**"]
        topic_html = ['<p class="note">模型业务洞察：选题方向（10 项）</p>']
        for topic in topics:
            if not isinstance(topic, dict):
                continue
            title = f"{topic.get('id') or '—'} · {topic.get('title') or '—'}"
            evidence_md, evidence_html = _business_evidence_table(
                analysis, topic.get("evidence")
            )
            item_md = (
                f"**{md_escape_text(title)}**\n\n"
                f"- 依据：{md_escape_text(topic.get('rationale') or '—')}"
            )
            item_html = (
                '<div class="business-insight">'
                f"<p><strong>{h_esc(title)}</strong></p>"
                f"<p>依据：{h_esc(topic.get('rationale') or '—')}</p>"
            )
            if evidence_md:
                item_md += "\n\n" + evidence_md
                item_html += evidence_html
            topic_md.append(item_md)
            topic_html.append(item_html + "</div>")
        md_blocks.append("\n\n".join(topic_md))
        html_blocks.append("".join(topic_html))

    experiments = contract.get("experiments")
    if isinstance(experiments, list) and experiments:
        experiment_md = ["**模型业务洞察：可验证实验（4 项）**"]
        experiment_html = ['<p class="note">模型业务洞察：可验证实验（4 项）</p>']
        for experiment in experiments:
            if not isinstance(experiment, dict):
                continue
            title = (
                f"{experiment.get('id') or '—'} · "
                f"{experiment.get('hypothesis') or '—'}"
            )
            fields = [
                ("实验变量", experiment.get("variable")),
                ("控制条件", experiment.get("control")),
                ("成功指标", experiment.get("success_metric")),
                ("决策规则", experiment.get("decision_rule")),
                ("观察窗口", experiment.get("window")),
            ]
            evidence_md, evidence_html = _business_evidence_table(
                analysis, experiment.get("evidence")
            )
            item_md = f"**{md_escape_text(title)}**\n\n" + "\n".join(
                f"- {md_escape_text(label)}：{md_escape_text(value or '—')}"
                for label, value in fields
            )
            item_html = (
                '<div class="business-insight">'
                f"<p><strong>{h_esc(title)}</strong></p>"
                "<ul class='tight'>"
                + "".join(
                    f"<li>{h_esc(label)}：{h_esc(value or '—')}</li>"
                    for label, value in fields
                )
                + "</ul>"
            )
            if evidence_md:
                item_md += "\n\n" + evidence_md
                item_html += evidence_html
            experiment_md.append(item_md)
            experiment_html.append(item_html + "</div>")
        md_blocks.append("\n\n".join(experiment_md))
        html_blocks.append("".join(experiment_html))

    limitations = contract.get("limitations")
    safe_limitations = (
        [item for item in limitations if isinstance(item, str) and item]
        if isinstance(limitations, list)
        else []
    )
    if safe_limitations:
        md_blocks.append(
            "**业务洞察限制**\n\n"
            + "\n".join(f"- {md_escape_text(item)}" for item in safe_limitations)
        )
        html_blocks.append(
            '<p class="note">业务洞察限制</p><ul class="tight">'
            + "".join(f"<li>{h_esc(item)}</li>" for item in safe_limitations)
            + "</ul>"
        )
    return "\n\n".join(md_blocks), "".join(html_blocks)


def _performance_metric_context(analysis) -> tuple[str | None, str | None, str | None]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    performance_meta = (
        analysis.get("performance_meta", {}) if isinstance(analysis, dict) else {}
    )
    main_metric = meta.get("main_sort_metric")
    metric_label = None
    if meta.get("collection_source") == "douyin_search_index" and main_metric == "likes":
        metric_label = "索引可见点赞"
    metric_note = performance_meta.get("metric_note")
    if not isinstance(metric_note, str) or not metric_note.strip():
        metric_note = None
    return main_metric, metric_label, metric_note


def _performance_provenance_context(analysis) -> tuple[object, object]:
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    return meta.get("platform"), meta.get("collection_source")


def _append_performance_note(md: str, html: str, note: str | None) -> tuple[str, str]:
    if note is None:
        return md, html
    return (
        md + f"\n\n> 指标口径：{md_escape_text(note)}",
        html + f'<p class="note">指标口径：{h_esc(note)}</p>',
    )


def _performance_axes_block(analysis) -> tuple[str, str]:
    axes = analysis.get("performance_axes") if isinstance(analysis, dict) else None
    if not isinstance(axes, dict):
        return "", ""
    reach = axes.get("reach") or {}
    efficiency = axes.get("engagement_efficiency") or {}
    floor = efficiency.get("denominator_floor")
    floor_label = "—" if floor is None else fmt_float(floor, 2)
    md = (
        "**双轴表现口径**\n\n"
        f"- 触达轴：views；状态 {md_escape_text(reach.get('status') or 'unknown')}；"
        f"实测 {reach.get('measured_count', 0)} 条。\n"
        f"- 互动效率轴：view_based_engagement_rate；状态 "
        f"{md_escape_text(efficiency.get('status') or 'unknown')}；"
        f"仅纳入 views ≥ {floor_label} 的记录，排除小分母 "
        f"{efficiency.get('excluded_small_denominator_count', 0)} 条。"
    )
    html = (
        '<p class="note">双轴表现口径</p><ul class="tight">'
        f"<li>触达轴：views；状态 {h_esc(reach.get('status') or 'unknown')}；"
        f"实测 {reach.get('measured_count', 0)} 条。</li>"
        f"<li>互动效率轴：view_based_engagement_rate；状态 "
        f"{h_esc(efficiency.get('status') or 'unknown')}；仅纳入 views ≥ "
        f"{h_esc(floor_label)} 的记录，排除小分母 "
        f"{efficiency.get('excluded_small_denominator_count', 0)} 条。</li></ul>"
    )
    return md, html


def build_high_performance(analysis) -> tuple[str, str]:
    main_metric, metric_label, metric_note = _performance_metric_context(analysis)
    platform, collection_source = _performance_provenance_context(analysis)
    high = analysis.get("high_performance")
    low = analysis.get("low_performance")
    display_high = (
        high[:REPORT_REPRESENTATIVE_LIMIT]
        if isinstance(high, list)
        else high
    )
    md, html = _render_perf_group(
        display_high,
        main_metric,
        metric_label,
        platform,
        collection_source,
    )
    if isinstance(high, list) and high:
        audit_md = (
            f"> 正文展示最具代表性的 {len(display_high)} 条；完整高表现组共 "
            f"{len(high)} 条，完整证据保存在 analysis.json。"
        )
        audit_html = (
            '<p class="note">正文展示最具代表性的 '
            f"{len(display_high)} 条；完整高表现组共 {len(high)} 条，"
            "完整证据保存在 analysis.json。</p>"
        )
        md, html = _append_report_block(md, html, audit_md, audit_html)
    pattern_md, pattern_html = _business_patterns_block(analysis, "high")
    md, html = _append_report_block(md, html, pattern_md, pattern_html)
    axes_md, axes_html = _performance_axes_block(analysis)
    md, html = _append_report_block(md, html, axes_md, axes_html)
    # 高低表现雷达图：对比两组在各指标上的均值形态（仅作形态对比，不构成因果）
    radar = svg_high_low_radar(high, low, METRIC_FIELDS)
    if radar:
        md += ("\n\n**高低表现指标对比（雷达图）**\n\n"
               "> 说明：以各组在各指标上的均值按列最大值归一化，仅作形态对比，不构成因果结论。")
        html += '<p class="note">高低表现指标对比（雷达图）</p>' + radar
    return _append_performance_note(md, html, metric_note)


def build_low_performance(analysis) -> tuple[str, str]:
    main_metric, metric_label, metric_note = _performance_metric_context(analysis)
    platform, collection_source = _performance_provenance_context(analysis)
    group = analysis.get("low_performance")
    display_group = (
        group[-REPORT_REPRESENTATIVE_LIMIT:]
        if isinstance(group, list)
        else group
    )
    md, html = _render_perf_group(
        display_group,
        main_metric,
        metric_label,
        platform,
        collection_source,
    )
    if isinstance(group, list) and group:
        audit_md = (
            f"> 正文展示差异最明显的 {len(display_group)} 条；完整低表现组共 "
            f"{len(group)} 条，完整证据保存在 analysis.json。"
        )
        audit_html = (
            '<p class="note">正文展示差异最明显的 '
            f"{len(display_group)} 条；完整低表现组共 {len(group)} 条，"
            "完整证据保存在 analysis.json。</p>"
        )
        md, html = _append_report_block(md, html, audit_md, audit_html)
    pattern_md, pattern_html = _business_patterns_block(analysis, "low")
    md, html = _append_report_block(md, html, pattern_md, pattern_html)
    return _append_performance_note(md, html, metric_note)


def _dist_table(posts, key, label) -> tuple[str, str]:
    counter = Counter()
    for p in posts:
        v = p.get(key)
        if v in (None, ""):
            counter["待分类"] += 1
        elif v == "unknown":
            counter["unknown（模型无法判断）"] += 1
        else:
            counter[str(v)] += 1
    if not counter:
        return "", ""
    rows = [[k, fmt_int(v)] for k, v in counter.most_common(10)]
    md = f"**{label} 分布**\n\n" + md_table([label, "数量"], rows)
    html = f'<p class="note">{h_esc(label)} 分布</p>' + html_table(
        [label, "数量"], [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in rows])
    return md, html


def _contract_limitations(contract: dict) -> tuple[str, str]:
    values = contract.get("limitations")
    limitations = (
        [value for value in values if isinstance(value, str) and value]
        if isinstance(values, list)
        else []
    )
    if not limitations:
        return "", ""
    return (
        "\n".join(f"> {md_escape_text(value)}" for value in limitations),
        "".join(f'<p class="note">{h_esc(value)}</p>' for value in limitations),
    )


def _analysis_html_text(value) -> str:
    """Escape HTML plus Markdown-link delimiters in untrusted analysis labels."""
    escaped = h_esc(value)
    for char, entity in (
        ("!", "&#33;"),
        ("[", "&#91;"),
        ("]", "&#93;"),
        ("(", "&#40;"),
        (")", "&#41;"),
    ):
        escaped = escaped.replace(char, entity)
    return escaped


def _analysis_html_rows(rows: list[list[object]]) -> list[list[Raw]]:
    return [
        [Raw(_analysis_html_text(value)) for value in row]
        for row in rows
    ]


def _classification_breakdown_block(analysis: dict) -> tuple[str, str]:
    contract = analysis.get("classification_breakdown")
    if not isinstance(contract, dict):
        return "", ""
    status = contract.get("status")
    if status != "completed":
        return _contract_limitations(contract)

    matrix = contract.get("topic_format_matrix")
    performance = contract.get("dimension_performance")
    if not isinstance(matrix, dict) or not isinstance(performance, dict):
        return "", ""
    formats = matrix.get("formats") if isinstance(matrix.get("formats"), list) else []
    matrix_rows = matrix.get("rows") if isinstance(matrix.get("rows"), list) else []
    md_parts = ["### 主题 × 形式计数矩阵"]
    html_parts = ['<h3 class="subsection">主题 × 形式计数矩阵</h3>']
    rendered_matrix_rows = []
    for row in matrix_rows:
        if not isinstance(row, dict):
            continue
        counts = row.get("counts") if isinstance(row.get("counts"), list) else []
        rendered_matrix_rows.append(
            [row.get("topic"), fmt_int(row.get("post_count"))]
            + [fmt_int(value) for value in counts]
        )
    matrix_headers = ["主题", "合计"] + [str(value) for value in formats]
    if rendered_matrix_rows:
        md_parts.extend(["", md_table(matrix_headers, rendered_matrix_rows)])
        html_parts.append(
            html_table(matrix_headers, _analysis_html_rows(rendered_matrix_rows))
        )

    main_metric = contract.get("main_metric")
    md_parts.extend(["", "### 分类维度主指标表现"])
    html_parts.append('<h3 class="subsection">分类维度主指标表现</h3>')
    perf_headers = [
        "维度",
        "值",
        "作品数",
        "实测数",
        "缺失数",
        "实测率",
        f"{main_metric} 中位数",
    ]
    perf_rows = []
    for field in ("topic", "format"):
        values = performance.get(field)
        if not isinstance(values, list):
            continue
        for item in values:
            if not isinstance(item, dict):
                continue
            perf_rows.append(
                [
                    field,
                    item.get("value"),
                    fmt_int(item.get("post_count")),
                    fmt_int(item.get("measured_count")),
                    fmt_int(item.get("missing_count")),
                    fmt_float(item.get("measurement_rate"), 4),
                    fmt_metric(item.get("main_metric_median")),
                ]
            )
    if perf_rows:
        md_parts.extend(["", md_table(perf_headers, perf_rows)])
        html_parts.append(html_table(perf_headers, _analysis_html_rows(perf_rows)))

    limitation_md, limitation_html = _contract_limitations(contract)
    if limitation_md:
        md_parts.extend(["", limitation_md])
        html_parts.append(limitation_html)
    return "\n".join(md_parts), "".join(html_parts)


def _feature_value_text(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "—"
    return str(value)


def _feature_values_text(values) -> str:
    if not isinstance(values, list) or not values:
        return "—"
    return "、".join(_feature_value_text(value) for value in values)


def _high_low_feature_block(analysis: dict) -> tuple[str, str]:
    contract = analysis.get("high_low_feature_comparison")
    if not isinstance(contract, dict):
        return "", ""
    if contract.get("status") != "completed":
        return _contract_limitations(contract)

    features = contract.get("features")
    if not isinstance(features, list):
        return "", ""
    md_parts = ["### 高低组结构化特征对比"]
    html_parts = ['<h3 class="subsection">高低组结构化特征对比</h3>']

    coverage_headers = [
        "字段",
        "高组已知/缺失",
        "低组已知/缺失",
        "共同值",
        "高组独有",
        "低组独有",
    ]
    coverage_rows = []
    comparison_headers = [
        "字段",
        "值",
        "高组 count/rate",
        "低组 count/rate",
        "rate_delta",
    ]
    comparison_rows = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        field = feature.get("field")
        coverage_rows.append(
            [
                field,
                f"{fmt_int(feature.get('high_known_count'))}/{fmt_int(feature.get('high_missing_count'))}",
                f"{fmt_int(feature.get('low_known_count'))}/{fmt_int(feature.get('low_missing_count'))}",
                _feature_values_text(feature.get("common_values")),
                _feature_values_text(feature.get("high_only_values")),
                _feature_values_text(feature.get("low_only_values")),
            ]
        )
        values = feature.get("values")
        if not isinstance(values, list):
            continue
        for item in values:
            if not isinstance(item, dict):
                continue
            comparison_rows.append(
                [
                    field,
                    _feature_value_text(item.get("value")),
                    f"{fmt_int(item.get('high_count'))}/{fmt_float(item.get('high_rate'), 4)}",
                    f"{fmt_int(item.get('low_count'))}/{fmt_float(item.get('low_rate'), 4)}",
                    fmt_float(item.get("rate_delta"), 4),
                ]
            )
    if coverage_rows:
        md_parts.extend(["", md_table(coverage_headers, coverage_rows)])
        html_parts.append(
            html_table(coverage_headers, _analysis_html_rows(coverage_rows))
        )
    if comparison_rows:
        md_parts.extend(["", md_table(comparison_headers, comparison_rows)])
        html_parts.append(
            html_table(comparison_headers, _analysis_html_rows(comparison_rows))
        )

    limitation_md, limitation_html = _contract_limitations(contract)
    if limitation_md:
        md_parts.extend(["", limitation_md])
        html_parts.append(limitation_html)
    return "\n".join(md_parts), "".join(html_parts)


def _comment_scalar(value) -> str:
    if value is None or value == "":
        return "—"
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _comment_parent_reference(
    item: dict,
    *,
    default_platform,
    default_collection_source,
) -> tuple[MdRaw, Raw]:
    parent_id = item.get("parent_post_id")
    parent_url = item.get("parent_post_url")
    record = {
        "platform": default_platform,
        "post_id": parent_id,
        "collection_source": default_collection_source,
    }
    canonical = _canonical_report_item_url(
        record,
        parent_url,
        default_platform,
        default_collection_source,
    )
    label = f"作品 {_comment_scalar(parent_id)}"
    if canonical is not None and canonical == parent_url:
        ref_post(canonical)
        return link_md(canonical, label), link_html(canonical, label)
    return MdRaw(md_escape_text(label)), Raw(h_esc(label))


_COMMENT_SEMANTIC_LABELS = (
    ("frequent_questions", "高频问题"),
    ("controversies", "争议"),
    ("needs", "需求"),
    ("concerns", "顾虑"),
    ("follow_up_topics", "后续选题线索"),
)


def _comment_semantic_insights_block(
    semantic: dict,
    *,
    default_platform,
    default_collection_source,
) -> tuple[str, str]:
    if semantic.get("status") not in {"completed", "partial-model"}:
        return "", ""
    md_parts = ["### 评论语义洞察（模型）"]
    html_parts = ['<h3 class="subsection">评论语义洞察（模型）</h3>']
    input_summary = semantic.get("input_summary")
    output_summary = semantic.get("output_summary")
    provenance = semantic.get("provenance")
    summary_rows = [
        ["status", _comment_scalar(semantic.get("status"))],
        ["model_version", _comment_scalar(semantic.get("model_version"))],
    ]
    if isinstance(input_summary, dict):
        summary_rows.extend(
            [
                [
                    "sampled_comment_count",
                    _comment_scalar(input_summary.get("sampled_comment_count")),
                ],
                [
                    "usable_comment_count",
                    _comment_scalar(input_summary.get("usable_comment_count")),
                ],
                [
                    "parent_post_count",
                    _comment_scalar(input_summary.get("parent_post_count")),
                ],
            ]
        )
    if isinstance(output_summary, dict):
        summary_rows.extend(
            [
                [
                    "total_insights",
                    _comment_scalar(output_summary.get("total_insights")),
                ],
                [
                    "evidence_reference_count",
                    _comment_scalar(
                        output_summary.get("evidence_reference_count")
                    ),
                ],
            ]
        )
    if isinstance(provenance, dict):
        for field in (
            "comments_source_sha256",
            "semantic_input_sha256",
            "result_sha256",
        ):
            summary_rows.append([field, _comment_scalar(provenance.get(field))])
    md_parts.extend(["", md_table(["字段", "值"], summary_rows)])
    html_parts.append(
        html_table(
            ["字段", "值"],
            [
                [Raw(h_esc(field)), Raw(h_esc(value))]
                for field, value in summary_rows
            ],
        )
    )

    insights = semantic.get("insights")
    if isinstance(insights, dict):
        for category, label in _COMMENT_SEMANTIC_LABELS:
            values = insights.get(category)
            md_parts.extend(["", f"**{md_escape_text(label)}**"])
            html_parts.append(f'<p class="note">{h_esc(label)}</p>')
            if not isinstance(values, list) or not values:
                md_parts.extend(["", "> 当前公开评论样本无足够证据支持该类结论。"])
                html_parts.append(
                    '<p class="note">当前公开评论样本无足够证据支持该类结论。</p>'
                )
                continue
            for insight in values:
                if not isinstance(insight, dict):
                    continue
                insight_id = insight.get("id") or "—"
                statement = insight.get("statement") or "—"
                md_rows = []
                html_rows = []
                evidence_items = insight.get("evidence")
                if not isinstance(evidence_items, list):
                    evidence_items = []
                for evidence in evidence_items:
                    if not isinstance(evidence, dict):
                        continue
                    parent_md, parent_html = _comment_parent_reference(
                        evidence,
                        default_platform=default_platform,
                        default_collection_source=default_collection_source,
                    )
                    source = (
                        f"{_comment_scalar(evidence.get('source_artifact'))}:"
                        f"{_comment_scalar(evidence.get('source_line'))}"
                    )
                    md_rows.append(
                        [
                            _comment_scalar(evidence.get("parent_post_id")),
                            parent_md,
                            _comment_scalar(evidence.get("comment_id")),
                            _comment_scalar(evidence.get("source_line")),
                            _comment_scalar(evidence.get("excerpt")),
                            source,
                        ]
                    )
                    html_rows.append(
                        [
                            Raw(h_esc(_comment_scalar(evidence.get("parent_post_id")))),
                            parent_html,
                            Raw(h_esc(_comment_scalar(evidence.get("comment_id")))),
                            Raw(h_esc(_comment_scalar(evidence.get("source_line")))),
                            Raw(h_esc(_comment_scalar(evidence.get("excerpt")))),
                            Raw(h_esc(source)),
                        ]
                    )
                headers = [
                    "parent_post_id",
                    "parent_post_url",
                    "comment_id",
                    "source_line",
                    "原文摘录",
                    "source",
                ]
                md_block = (
                    f"**{md_escape_text(insight_id)}**："
                    f"{md_escape_text(statement)}"
                )
                html_block = (
                    '<div class="business-insight">'
                    f"<p><strong>{h_esc(insight_id)}</strong>："
                    f"{h_esc(statement)}</p>"
                )
                if md_rows:
                    md_block += "\n\n" + md_table(headers, md_rows)
                    html_block += html_table(headers, html_rows)
                md_parts.extend(["", md_block])
                html_parts.append(html_block + "</div>")

    limitations = semantic.get("limitations")
    safe_limitations = (
        [value for value in limitations if isinstance(value, str) and value]
        if isinstance(limitations, list)
        else []
    )
    if safe_limitations:
        md_parts.extend(
            [
                "",
                "**评论语义限制**",
                "",
                "\n".join(f"- {md_escape_text(item)}" for item in safe_limitations),
            ]
        )
        html_parts.extend(
            [
                '<p class="note">评论语义限制</p>',
                '<ul class="tight">'
                + "".join(f"<li>{h_esc(item)}</li>" for item in safe_limitations)
                + "</ul>",
            ]
        )
    return "\n".join(md_parts), "".join(html_parts)


def _comment_evidence_block(analysis: dict) -> tuple[str, str]:
    comments = analysis.get("comment_analysis")
    if not isinstance(comments, dict):
        return "", ""

    meta = analysis.get("meta") if isinstance(analysis.get("meta"), dict) else {}
    default_platform = meta.get("platform")
    default_collection_source = meta.get("collection_source")
    eligible = comments.get("eligible_parent_posts")
    covered = comments.get("covered_parent_posts")
    coverage_rate = comments.get("parent_coverage_rate")
    coverage_label = (
        f"{_comment_scalar(covered)}/{_comment_scalar(eligible)} "
        f"(rate={fmt_float(coverage_rate, 4)})"
    )
    summary_rows = [
        ["schema_version", _comment_scalar(comments.get("schema_version"))],
        ["status", _comment_scalar(comments.get("status"))],
        ["requested", _comment_scalar(comments.get("requested"))],
        [
            "sampled_comment_count",
            _comment_scalar(comments.get("sampled_comment_count")),
        ],
        ["parent_coverage", coverage_label],
    ]
    md_parts = ["### 评论证据（确定性）", "", md_table(["字段", "值"], summary_rows)]
    html_parts = [
        '<h3 class="subsection">评论证据（确定性）</h3>',
        html_table(
            ["字段", "值"],
            [
                [Raw(h_esc(field)), Raw(h_esc(value))]
                for field, value in summary_rows
            ],
        ),
    ]

    ledger = comments.get("collection_ledger")
    if isinstance(ledger, dict):
        ledger_fields = (
            "attempted_posts",
            "comments_collected",
            "empty_results",
            "failures",
            "per_post_limit",
            "stop_reason",
        )
        rows = [
            [field, _comment_scalar(ledger.get(field))]
            for field in ledger_fields
        ]
        md_parts.extend(["", "**采集账本**", "", md_table(["字段", "值"], rows)])
        html_parts.extend(
            [
                '<p class="note">采集账本</p>',
                html_table(
                    ["字段", "值"],
                    [
                        [Raw(h_esc(field)), Raw(h_esc(value))]
                        for field, value in rows
                    ],
                ),
            ]
        )

    field_coverage = comments.get("field_coverage")
    if isinstance(field_coverage, dict) and field_coverage:
        rows = []
        for field in ("author", "text", "likes", "published_at", "collected_at"):
            evidence = field_coverage.get(field)
            if not isinstance(evidence, dict):
                continue
            rows.append(
                [
                    field,
                    _comment_scalar(evidence.get("present")),
                    _comment_scalar(evidence.get("total")),
                    fmt_float(evidence.get("rate"), 4),
                ]
            )
        if rows:
            md_parts.extend(
                [
                    "",
                    "**字段覆盖率**",
                    "",
                    md_table(["字段", "present", "total", "rate"], rows),
                ]
            )
            html_parts.extend(
                [
                    '<p class="note">字段覆盖率</p>',
                    html_table(
                        ["字段", "present", "total", "rate"],
                        [
                            [Raw(h_esc(value)) for value in row]
                            for row in rows
                        ],
                    ),
                ]
            )

    selection = comments.get("representative_selection")
    if isinstance(selection, dict):
        selection_text = (
            "max_parent_posts="
            f"{_comment_scalar(selection.get('max_parent_posts'))}; "
            "max_per_parent="
            f"{_comment_scalar(selection.get('max_per_parent'))}; "
            f"order={_comment_scalar(selection.get('order'))}"
        )
        md_parts.extend(["", f"> 代表评论选择：{md_escape_text(selection_text)}"])
        html_parts.append(
            f'<p class="note">代表评论选择：{h_esc(selection_text)}</p>'
        )

    representatives = comments.get("representative_comments")
    if isinstance(representatives, list) and representatives:
        md_rows = []
        html_rows = []
        for item in representatives:
            if not isinstance(item, dict):
                continue
            parent_md, parent_html = _comment_parent_reference(
                item,
                default_platform=default_platform,
                default_collection_source=default_collection_source,
            )
            artifact = item.get("source_artifact")
            source_line = item.get("source_line")
            source = f"{_comment_scalar(artifact)}:{_comment_scalar(source_line)}"
            values = [
                _comment_scalar(item.get("comment_id")),
                parent_md,
                _comment_scalar(item.get("author")),
                _comment_scalar(item.get("text")),
                _comment_scalar(item.get("likes")),
                _comment_scalar(item.get("published_at")),
                _comment_scalar(item.get("collected_at")),
                source,
            ]
            md_rows.append(values)
            html_rows.append(
                [
                    Raw(h_esc(values[0])),
                    parent_html,
                    Raw(h_esc(values[2])),
                    Raw(h_esc(values[3])),
                    Raw(h_esc(values[4])),
                    Raw(h_esc(values[5])),
                    Raw(h_esc(values[6])),
                    Raw(h_esc(values[7])),
                ]
            )
        if md_rows:
            headers = [
                "comment_id",
                "父作品",
                "author",
                "text",
                "likes",
                "published_at",
                "collected_at",
                "source",
            ]
            md_parts.extend(["", "**代表评论**", "", md_table(headers, md_rows)])
            html_parts.extend(
                [
                    '<p class="note">代表评论</p>',
                    html_table(headers, html_rows),
                ]
            )

    semantic = comments.get("semantic")
    semantic_status = (
        semantic.get("status") if isinstance(semantic, dict) else None
    )
    semantic_version = (
        semantic.get("model_version") if isinstance(semantic, dict) else None
    )
    if isinstance(semantic, dict) and semantic_status in {
        "completed",
        "partial-model",
    }:
        semantic_md, semantic_html = _comment_semantic_insights_block(
            semantic,
            default_platform=default_platform,
            default_collection_source=default_collection_source,
        )
        if semantic_md:
            md_parts.extend(["", semantic_md])
            html_parts.append(semantic_html)
    else:
        semantic_note = (
            "语义洞察待模型处理"
            f"（status={_comment_scalar(semantic_status)}, "
            f"model_version={_comment_scalar(semantic_version)}）；"
            "确定性阶段不生成评论语义结论。"
        )
        md_parts.extend(["", f"> {md_escape_text(semantic_note)}"])
        html_parts.append(f'<p class="note">{h_esc(semantic_note)}</p>')

    limitations = comments.get("limitations")
    if isinstance(limitations, list) and limitations:
        safe_limitations = [
            item for item in limitations if isinstance(item, str) and item
        ]
        if safe_limitations:
            md_parts.extend(
                [
                    "",
                    "**限制**",
                    "",
                    "\n".join(f"- {md_escape_text(item)}" for item in safe_limitations),
                ]
            )
            html_parts.extend(
                [
                    '<p class="note">限制</p>',
                    "<ul class='tight'>"
                    + "".join(f"<li>{h_esc(item)}</li>" for item in safe_limitations)
                    + "</ul>",
                ]
            )
    return "\n".join(md_parts), "".join(html_parts)


def build_content_patterns(analysis) -> tuple[str, str]:
    posts = analysis.get("posts", []) if isinstance(analysis, dict) else []
    blocks = []
    if posts:
        for key, label in [("topic", "主题"), ("format", "内容形式"),
                           ("funnel_stage", "漏斗阶段"), ("hook_type", "开头钩子")]:
            md, html = _dist_table(posts, key, label)
            if md:
                blocks.append((md, html))
        # 栏目 / 合集
        series = Counter()
        for p in posts:
            s = p.get("series_name")
            if s:
                series[str(s)] += 1
        if series:
            rows = [[k, fmt_int(v)] for k, v in series.most_common(10)]
            md = "**栏目 / 合集 分布**\n\n" + md_table(["栏目", "数量"], rows)
            html = '<p class="note">栏目 / 合集 分布</p>' + html_table(
                ["栏目", "数量"], [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in rows])
            blocks.append((md, html))

    breakdown_md, breakdown_html = _classification_breakdown_block(analysis)
    if breakdown_md:
        blocks.append((breakdown_md, breakdown_html))

    feature_md, feature_html = _high_low_feature_block(analysis)
    if feature_md:
        blocks.append((feature_md, feature_html))

    comment_md, comment_html = _comment_evidence_block(analysis)
    if comment_md:
        blocks.append((comment_md, comment_html))

    modes_md, modes_html = _business_modes_block(analysis)
    if modes_md:
        blocks.append((modes_md, modes_html))

    if not blocks:
        return EMPTY_MD, EMPTY_HTML
    md = "\n\n".join(b[0] for b in blocks)
    html = "".join(b[1] for b in blocks)
    return md, html


def build_strategy(analysis, profile) -> tuple[str, str]:
    """确定性、基于已计算数据的策略建议（非 LLM、非因果断言）。"""
    tips = []

    cad = _safe_get(analysis, "publish_cadence", default={}) or {}
    if _cadence_inference_allowed(analysis, cad):
        ww = cad.get("weekday_weekend", {}) or {}
        if ww:
            wc, ec = int(ww.get("weekday_count") or 0), int(ww.get("weekend_count") or 0)
            if ec and wc:
                dom = "周末" if ec > wc else "工作日"
                tips.append(f"有效样本中 {dom}发布占比更高（周末 {fmt_pct(ww.get('weekend_pct'))} / "
                            f"工作日 {fmt_pct(ww.get('weekday_pct'))}），可在该时段优先排播，但需注意样本量是否足以支撑结论。")
        wd = cad.get("weekday_distribution", {}) or {}
        if wd:
            top_day = max(((int(wd.get(str(i), 0)), i) for i in range(7)), default=(0, 0))
            if top_day[0] > 0:
                tips.append(f"发布最密集的星期为 {WEEKDAY_NAMES[top_day[1]]}（{top_day[0]} 条），"
                            f"可作为稳定更新锚点，但仍应结合表现数据验证。")

    eng = _safe_get(analysis, "engagement", default={}) or {}
    vber = eng.get("view_based_engagement_rate", {}) or {}
    if vber:
        med = vber.get("median")
        if med is not None:
            tips.append(f"基于播放的互动率中位数为 {fmt_pct(med)}（分子=点赞+评论+收藏+分享，"
                        f"分母=播放）。该指标仅反映相对自身水平，不构成因果结论。")
    fber = eng.get("follower_based_engagement_ratio", {}) or {}
    if fber:
        med = fber.get("median")
        fol = eng.get("followers")
        if med is not None and fol:
            tips.append(f"基于粉丝的互动比中位数为 {fmt_pct(med)}（分母=粉丝数 {fmt_int(fol)}），"
                        f"与播放互动率分开解读，避免混用。")

    # 内容形式提示（基于分布，非因果）
    posts = analysis.get("posts", []) if isinstance(analysis, dict) else []
    fmt_counter = Counter()
    for p in posts:
        f = p.get("format")
        if f and f != "unknown":
            fmt_counter[f] += 1
    if fmt_counter:
        top_fmt = fmt_counter.most_common(1)[0][0]
        classification_note = (
            "分类已完成严格覆盖校验；该结论仍仅描述当前样本，不代表因果关系。"
            if _classification_is_completed(analysis)
            else "分类状态可能为 pending-model，结论仅供参考。"
        )
        tips.append(
            f"已分类内容中最常见的内容形式为「{top_fmt}」，可作为账号内容结构基线；"
            f"{classification_note}"
        )

    sb = _safe_get(analysis, "sample_boundary", default={}) or {}
    valid = sb.get("valid")
    if isinstance(valid, int) and valid < 15:
        tips.append(f"当前有效样本仅 {valid} 条（<15），高低表现对比与模式结论置信度有限，"
                    f"建议扩大采集周期或数量后再下结论。")

    if tips:
        md = "**确定性数据提示**\n\n" + "\n".join(
            f"{i}. {md_escape_text(t)}" for i, t in enumerate(tips, 1)
        )
        html = (
            '<p class="note">确定性数据提示</p><ul class="tight">'
            + "".join(f"<li>{h_esc(t)}</li>" for t in tips)
            + "</ul>"
        )
    else:
        md, html = EMPTY_MD, EMPTY_HTML
    business_md, business_html = _business_strategy_block(analysis)
    return _append_report_block(md, html, business_md, business_html)


def build_sample_limits(analysis, profile) -> tuple[str, str]:
    sb = _safe_get(analysis, "sample_boundary", default={}) or {}
    if not sb and not profile:
        return EMPTY_MD, EMPTY_HTML

    rows = [
        ["请求数量", fmt_int(sb.get("requested"))],
        ["实际采集", fmt_int(sb.get("collected"))],
        ["有效数量", fmt_int(sb.get("valid"))],
        ["缺失内容", fmt_int(sb.get("missing"))],
        ["受限内容", fmt_int(sb.get("restricted"))],
        ["被排除标记内容", fmt_int(sb.get("excluded_flagged"))],
    ]
    rows.extend(_status_count_rows(sb))
    # 字段可见性（来自 profile）
    fv = (profile or {}).get("field_visibility", {}) or {}
    hidden = [k for k, v in fv.items() if v in ("hidden", "partial")]

    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    collection_source = meta.get("collection_source")
    disclaimer = (
        AUTHORIZED_DISCLAIMER
        if collection_source == AUTHORIZED_DOUYIN_SOURCE
        else PUBLIC_PAGE_DISCLAIMER
    )
    md = md_table(["样本边界", "数值"], rows)
    md += "\n\n> " + disclaimer
    if collection_source in INDEX_COLLECTION_SOURCES:
        md += (
            f"\n\n> 当前数据来自 `{collection_source}` 公开索引快照，属于非实时、非穷尽样本；"
            "不能据此推断账号完整发布量或后台表现。"
        )
        if collection_source == "douyin_search_index":
            md += (
                "\n\n> `idx-*` 是本地记录键；账号主页仅为证据锚点，"
                "不是单条作品详情链接。"
            )
    elif collection_source == AUTHORIZED_DOUYIN_SOURCE:
        if meta.get("evidence_is_exhaustive") is True:
            md += (
                "\n\n> 当前数据来自账号本人授权 OpenAPI 公热视频列表；"
                "覆盖账本已观察到官方末页，对该授权接口返回集合为穷尽遍历。"
            )
        else:
            md += (
                "\n\n> 当前数据来自账号本人授权 OpenAPI 公热视频列表；"
                "尚未观察到官方末页，当前结果非穷尽。"
            )
    coverage = meta.get("collection_coverage")
    dynamic_status = (
        coverage.get("dynamic_status")
        if isinstance(coverage, dict)
        else None
    )
    bilibili_dynamic_note = None
    if meta.get("platform") == "bilibili" and dynamic_status != "OBSERVED":
        if dynamic_status:
            bilibili_dynamic_note = (
                f"B站动态入口状态为 {dynamic_status}；"
                "当前样本可能遗漏仅出现在动态入口的公开视频。"
            )
        else:
            bilibili_dynamic_note = (
                "B站动态入口覆盖状态未记录（旧产物或未知）；无法确认动态入口是否完成，"
                "当前样本可能遗漏仅出现在动态入口的公开视频。"
            )
        md += "\n\n> " + bilibili_dynamic_note
    if hidden:
        md += f"\n\n> 受限/不可见字段：{', '.join(hidden)}（相关指标覆盖率相应下调）。"
    classification_note = (
        "分类已完成严格覆盖校验。"
        if _classification_is_completed(analysis)
        else "分类字段由模型填充（可能为 pending-model）。"
    )
    md += ("\n\n> 默认排除置顶/转载/投放内容；统计仅基于有效样本，"
           f"确定性数字由脚本计算，{classification_note}")

    html = html_table(["样本边界", "数值"],
                      [[Raw(h_esc(k)), Raw(h_esc(v))] for k, v in rows])
    notes = [disclaimer]
    if collection_source in INDEX_COLLECTION_SOURCES:
        notes.append(
            f"当前数据来自 {collection_source} 公开索引快照，属于非实时、非穷尽样本；"
            "不能据此推断账号完整发布量或后台表现。"
        )
        if collection_source == "douyin_search_index":
            notes.append("idx-* 是本地记录键；账号主页仅为证据锚点，不是单条作品详情链接。")
    elif collection_source == AUTHORIZED_DOUYIN_SOURCE:
        if meta.get("evidence_is_exhaustive") is True:
            notes.append(
                "当前数据来自账号本人授权 OpenAPI 公热视频列表；"
                "覆盖账本已观察到官方末页，对该授权接口返回集合为穷尽遍历。"
            )
        else:
            notes.append(
                "当前数据来自账号本人授权 OpenAPI 公热视频列表；"
                "尚未观察到官方末页，当前结果非穷尽。"
            )
    if bilibili_dynamic_note is not None:
        notes.append(bilibili_dynamic_note)
    if hidden:
        notes.append("受限/不可见字段：" + ", ".join(hidden) + "（相关指标覆盖率相应下调）。")
    notes.append(
        "默认排除置顶/转载/投放内容；统计仅基于有效样本，确定性数字由脚本计算，"
        + classification_note
    )
    html += "".join(f'<p class="note">{h_esc(n)}</p>' for n in notes)
    return md, html


def build_sources(analysis, profile) -> tuple[str, str]:
    urls = []
    meta = analysis.get("meta", {}) if isinstance(analysis, dict) else {}
    default_platform = (
        meta.get("platform") or (profile or {}).get("platform")
    )
    default_collection_source = meta.get("collection_source")
    prof_url = (profile or {}).get("profile_url")
    canonical_profile = (
        canonical_profile_url(default_platform, prof_url)
        if isinstance(default_platform, str)
        else None
    )
    if canonical_profile is not None and canonical_profile == prof_url:
        urls.append(("账号主页", canonical_profile))
    state = _RENDER_STATE.get()
    referenced = (
        state.referenced_post_urls
        if state is not None
        else REFERENCED_POST_URLS
    )
    posts = analysis.get("posts", []) if isinstance(analysis, dict) else []
    for p in posts:
        if not isinstance(p, dict):
            continue
        if p.get("url_kind") != "item" or p.get("item_url_known") is not True:
            continue
        post_url = p.get("post_url")
        canonical_post = _canonical_report_item_url(
            p,
            post_url,
            default_platform,
            default_collection_source,
        )
        if canonical_post is None or canonical_post != post_url:
            continue
        if state is not None and canonical_post not in state.known_post_urls:
            warn(
                "bad_link: analysis.json 中的 post_url 不在 "
                f"normalized-posts.csv 中: {canonical_post}"
            )
        if canonical_post in referenced:
            urls.append((p.get("post_id") or canonical_post, canonical_post))

    audit_note = (
        "完整逐条作品、指标与证据保存在 workspace 的 "
        "normalized-posts.csv 和 analysis.json；正文来源仅列实际引用。"
    )
    md_parts = [f"- {link_md(u, t)}" for t, u in urls]
    md_parts.extend(["", f"> {audit_note}"])
    md = "\n".join(md_parts)
    html = ""
    if urls:
        html = "<ul class='tight'>" + "".join(
            f"<li>{link_html(u, t).s}</li>" for t, u in urls
        ) + "</ul>"
    html += f'<p class="note">{h_esc(audit_note)}</p>'
    return md, html


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------

def render_dashboard(template: str, sections_html: dict[str, str]) -> str:
    return _PLACEHOLDER_PATTERN.sub(
        lambda match: sections_html.get(match.group(1)) or EMPTY_HTML,
        template,
    )


def post_render_checks(html: str) -> None:
    # 坏链检查：被引用的内容 URL 不在 known 集合中
    state = _RENDER_STATE.get()
    referenced = (
        state.referenced_post_urls
        if state is not None
        else REFERENCED_POST_URLS
    )
    known = state.known_post_urls if state is not None else KNOWN_POST_URLS
    for url in referenced:
        if url not in known:
            warn(f"bad_link: 报告引用了不在 normalized-posts.csv 中的 post_url: {url}")
    # 空图检查：残留外部图片
    for m in re.finditer(r'<img[^>]+src=["\']http', html, re.IGNORECASE):
        warn(f"empty_image: 发现未替换的外部图片标签: {m.group(0)[:80]}")


def render_in_memory(
    *,
    profile: dict,
    posts_csv: list[dict],
    analysis: dict,
    template: str,
) -> RenderResult:
    """Render and validate reports without filesystem or process-global state."""
    if not isinstance(profile, dict):
        raise RenderError("missing or invalid profile input")
    if not isinstance(posts_csv, list) or not all(
        isinstance(row, dict) for row in posts_csv
    ):
        raise RenderError("missing or invalid normalized posts input")
    if not isinstance(analysis, dict):
        raise RenderError("missing or invalid analysis input")
    _validate_lifecycle_consistency(analysis)
    _validate_statistical_consistency(analysis)
    if not isinstance(template, str) or not template:
        raise RenderError("missing or invalid report template")
    template_without_comments = re.sub(
        r"<!--.*?-->", "", template, flags=re.DOTALL
    )
    template_tokens = re.findall(
        r"\{\{([^{}]+)\}\}", template_without_comments
    )
    if sorted(template_tokens) != sorted(PLACEHOLDERS):
        raise RenderError("report template placeholder inventory is invalid")

    state = _RenderState(
        known_post_urls={
            str(row.get("post_url")).strip()
            for row in posts_csv
            if row.get("post_url")
        }
    )
    token = _RENDER_STATE.set(state)
    try:
        try:
            decision_summary_md, decision_summary_html = build_decision_summary(
                analysis
            )
        except Exception as exc:  # noqa: BLE001
            raise RenderError("render decision summary failed") from exc
        builders = {
            "task_info": lambda: build_task_info(analysis, profile, posts_csv),
            "quality_summary": lambda: build_quality_summary(analysis),
            "account_card": lambda: build_account_card(profile, analysis),
            "content_structure": lambda: build_content_structure(
                analysis, posts_csv
            ),
            "publish_cadence": lambda: build_publish_cadence(analysis),
            "metrics_dashboard": lambda: build_metrics_dashboard(analysis),
            "high_performance": lambda: build_high_performance(analysis),
            "low_performance": lambda: build_low_performance(analysis),
            "content_patterns": lambda: build_content_patterns(analysis),
            "strategy": lambda: build_strategy(analysis, profile),
            "sample_limits": lambda: build_sample_limits(analysis, profile),
            "sources": lambda: build_sources(analysis, profile),
        }

        sections_md: dict[str, str] = {}
        sections_html: dict[str, str] = {}
        for name, function in builders.items():
            try:
                markdown, html = function()
            except Exception as exc:  # noqa: BLE001
                raise RenderError(f"render section {name} failed") from exc
            sections_md[name] = markdown or EMPTY_MD
            sections_html[name] = html or EMPTY_HTML

        account_name = (
            (analysis.get("meta", {}) or {}).get("account_name")
            or profile.get("account_name")
            or "未知账号"
        )
        platform = (
            (analysis.get("meta", {}) or {}).get("platform")
            or profile.get("platform")
            or ""
        )
        safe_account_name = md_escape_text(account_name)
        safe_platform = md_escape_text(platform)
        classification_complete = _classification_is_completed(analysis)
        report_kind = "公开社媒账号分析报告" if classification_complete else "公开账号数据概览"
        title = (
            f"{report_kind}：{safe_account_name}（{safe_platform}）"
            if platform
            else f"{report_kind}：{safe_account_name}"
        )
        collection_source = (
            (analysis.get("meta", {}) or {}).get("collection_source")
        )
        authorized_source = collection_source == AUTHORIZED_DOUYIN_SOURCE
        disclaimer = (
            AUTHORIZED_DISCLAIMER
            if authorized_source
            else PUBLIC_PAGE_DISCLAIMER
        )
        md_parts = [f"# {title}", "", disclaimer, ""]
        if not classification_complete:
            overview_notice = (
                "当前语义分类尚未完成；本文件是公开数据概览，"
                "不能作为深度内容策略报告。完整语义分析完成后应重新生成。"
            )
            md_parts.extend([f"> {overview_notice}", ""])
            sections_html["task_info"] = (
                f'<p class="note">{h_esc(overview_notice)}</p>'
                + sections_html["task_info"]
            )
        if decision_summary_md != EMPTY_MD:
            md_parts.extend([decision_summary_md, ""])
        if decision_summary_html != EMPTY_HTML:
            sections_html["task_info"] = (
                decision_summary_html + sections_html["task_info"]
            )
        for index, (name, section_title) in enumerate(SECTION_DEFS, 1):
            md_parts.extend(
                [
                    f"## {index}. {section_title}",
                    "",
                    sections_md[name],
                    "",
                ]
            )
        markdown_text = "\n".join(md_parts).rstrip() + "\n"
        dashboard_template = template
        if authorized_source:
            dashboard_template = dashboard_template.replace(
                PUBLIC_PAGE_DISCLAIMER, AUTHORIZED_DISCLAIMER
            ).replace(PUBLIC_PAGE_FOOTER, AUTHORIZED_FOOTER)
        html_text = render_dashboard(dashboard_template, sections_html)
        post_render_checks(html_text)
        if state.diagnostics:
            raise RenderError(
                "; ".join(state.diagnostics), state.diagnostics
            )
        if not markdown_text.strip() or not html_text.strip():
            raise RenderError("render output is empty")
        return RenderResult(markdown_text, html_text, ())
    finally:
        _RENDER_STATE.reset(token)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="渲染公开社媒账号分析报告的 Markdown 与 HTML。")
    parser.add_argument("--input", required=True,
                        help="任务目录（含 source/profile.json, normalized-posts.csv, analysis.json）")
    parser.add_argument("--output", default=None,
                        help="输出目录（默认与 --input 相同）")
    parser.add_argument("--template", default=None,
                        help="HTML 模板路径（默认 <skill根>/assets/report-template.html）")
    args = parser.parse_args(argv)

    input_dir = Path(args.input).resolve()
    output_dir = Path(args.output).resolve() if args.output else input_dir

    try:
        reject_sealed_workspace(str(input_dir))
        if output_dir != input_dir:
            reject_sealed_workspace(str(output_dir))
    except WorkspaceError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 2

    WARNINGS.clear()
    KNOWN_POST_URLS.clear()
    REFERENCED_POST_URLS.clear()

    if args.template:
        template_path = Path(args.template).resolve()
    else:
        template_path = Path(__file__).resolve().parent.parent / "assets" / "report-template.html"

    try:
        template_text = template_path.read_text(encoding="utf-8")
        profile = json.loads(
            (input_dir / "source" / "profile.json").read_text(encoding="utf-8")
        )
        analysis = json.loads(
            (input_dir / "analysis.json").read_text(encoding="utf-8")
        )
        with (input_dir / "normalized-posts.csv").open(
            encoding="utf-8", newline=""
        ) as handle:
            posts_csv = list(csv.DictReader(handle))
        rendered = render_in_memory(
            profile=profile,
            posts_csv=posts_csv,
            analysis=analysis,
            template=template_text,
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, csv.Error) as exc:
        print(f"[ERROR] renderer input failed: {exc}", file=sys.stderr)
        return 2
    except RenderError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 2

    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        md_path = output_dir / "account-analysis-report.md"
        html_path = output_dir / "dashboard.html"
        md_path.write_text(rendered.markdown, encoding="utf-8")
        html_path.write_text(rendered.html, encoding="utf-8")
    except OSError as exc:
        print(f"[ERROR] renderer output failed: {exc}", file=sys.stderr)
        return 2

    print(f"已生成: {md_path}")
    print(f"已生成: {html_path}")
    print("完成，无告警。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
