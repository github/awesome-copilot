#!/usr/bin/env python3
"""构建含置顶内容的确定性离线采集 fixture。

用途：eval「置顶排除」断言在真实采集中经常遇不到置顶样本，导致断言
没有可验证对象。本脚本离线生成一个**内容完全固定**的已封存 B站采集
提交（sealed collection），其中包含：

- 17 条有效常规投稿（工作日 08:00-11:00 发布，指标已知）
- 2 条置顶投稿（周日 23:00 发布、指标异常高——若被错误混入
  节奏/表现统计将显著改变结果，便于检测）
- 1 条转载投稿

生成目录可直接作为 ``run_pipeline.py --input`` 消费。所有时间戳、
指标、ID 均为固定常量，重复构建的 posts.jsonl / profile.json /
task.json 字节完全一致（manifest 哈希因封存时间戳可能不同，但内容
哈希一致）。

用法::

    python skill/evals/datasets/fixtures/build_pinned_fixture.py --out <dir>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import immutable_workspace as workspace  # noqa: E402

COLLECTION_ARTIFACTS = frozenset({
    "source/profile.json",
    "source/posts.jsonl",
    "task.json",
    "collection-report.md",
})

ACCOUNT_ID = "999000111"
COLLECTED_AT = "2026-07-01T12:00:00+08:00"

# 有效常规投稿：2026-05-04 起连续 17 个工作日，08:00-11:00 循环
_VALID_DATES = [
    "2026-05-04T08:00:00+08:00", "2026-05-05T09:00:00+08:00",
    "2026-05-06T10:00:00+08:00", "2026-05-07T11:00:00+08:00",
    "2026-05-08T08:00:00+08:00", "2026-05-11T09:00:00+08:00",
    "2026-05-12T10:00:00+08:00", "2026-05-13T11:00:00+08:00",
    "2026-05-14T08:00:00+08:00", "2026-05-15T09:00:00+08:00",
    "2026-05-18T10:00:00+08:00", "2026-05-19T11:00:00+08:00",
    "2026-05-20T08:00:00+08:00", "2026-05-21T09:00:00+08:00",
    "2026-05-22T10:00:00+08:00", "2026-05-25T11:00:00+08:00",
    "2026-05-26T08:00:00+08:00",
]


def _base_post(post_id: str, published_at: str, views: int) -> dict:
    return {
        "platform": "bilibili",
        "post_id": post_id,
        "post_url": f"https://www.bilibili.com/video/{post_id}",
        "source_url": f"https://www.bilibili.com/video/{post_id}",
        "published_at": published_at,
        "collected_at": COLLECTED_AT,
        "content_type": "video",
        "title": f"固定样本 {post_id}",
        "collection_status": "SUCCESS",
        "is_pinned": False,
        "is_repost": False,
        "is_promoted": False,
        "views": views,
        "likes": views // 20,
        "comments": views // 100,
        "favorites": views // 50,
        "shares": None,  # 页面未展示 → null，不写 0
        "coins": views // 80,
        "danmaku": views // 90,
    }


def build_posts() -> list[dict]:
    posts: list[dict] = []
    for i, published_at in enumerate(_VALID_DATES, start=1):
        posts.append(_base_post(
            f"BVfix{i:07d}", published_at, views=10_000 + i * 500,
        ))
    # 两条置顶：周日 23:00 发布 + 异常高指标（1000 万播放）。
    # 若被错误混入节奏统计，hour_distribution["23"] 将非 0；
    # 若混入表现统计，中位数会被显著拉高。
    for i, published_at in enumerate(
        ["2026-05-03T23:00:00+08:00", "2026-05-10T23:00:00+08:00"], start=1,
    ):
        pinned = _base_post(f"BVpin{i:07d}", published_at, views=10_000_000)
        pinned["is_pinned"] = True
        pinned["title"] = f"置顶样本 {i}"
        posts.append(pinned)
    repost = _base_post("BVrep0000001", "2026-05-09T23:30:00+08:00",
                        views=5_000_000)
    repost["is_repost"] = True
    repost["title"] = "转载样本"
    posts.append(repost)
    return posts


def build_fixture(out_dir: Path) -> str:
    posts = build_posts()
    profile = {
        "platform": "bilibili",
        "account_id": ACCOUNT_ID,
        "account_name": "置顶fixture账号",
        "profile_url": f"https://space.bilibili.com/{ACCOUNT_ID}",
        "followers": 100_000,
        "post_count": None,  # 未公开 → null
    }
    task = {
        "task_id": f"bilibili-{ACCOUNT_ID}-pinned-fixture",
        "platform": "bilibili",
        "task_status": "COMPLETED",
        "stop_reason": None,
        "requested_limit": 20,
        "collected_count": len(posts),
        "analysis_goal": "选题与发布节奏",
        "collection_coverage": {
            "requested_all": False,
            "terminal_page_observed": False,
            "is_exhaustive": False,
            "range_filter_applied": False,
            "range_no_match": False,
            "regular_source": "medialist",
            "regular_observed_count": len(posts),
            "dynamic_status": "OBSERVED",
            "dynamic_observed_count": 0,
        },
    }
    artifacts = {
        "source/profile.json": json.dumps(profile, ensure_ascii=False, indent=2),
        "source/posts.jsonl": "".join(
            json.dumps(p, ensure_ascii=False) + "\n" for p in posts
        ),
        "task.json": json.dumps(task, ensure_ascii=False, indent=2),
        "collection-report.md": (
            "# 离线置顶 fixture 采集报告\n\n"
            "确定性离线样本：17 条有效常规投稿 + 2 条置顶 + 1 条转载。\n"
            "非真实网络采集；仅用于评估置顶隔离与节奏统计契约。\n"
        ),
    }
    reservation = workspace.ImmutableWorkspace.reserve(
        str(out_dir), allowed_artifacts=COLLECTION_ARTIFACTS
    )
    try:
        for relative, payload in artifacts.items():
            with reservation.open_text(relative) as handle:
                handle.write(payload)
        digest = reservation.commit()
    finally:
        reservation.close()
    return digest


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="输出目录（必须不存在）")
    args = parser.parse_args(argv)
    digest = build_fixture(Path(args.out))
    print(f"pinned fixture sealed at {args.out} (digest {digest[:16]}...)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
