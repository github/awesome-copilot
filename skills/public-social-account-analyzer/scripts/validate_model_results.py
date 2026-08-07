#!/usr/bin/env python3
"""Batch-lint external model result files and report every detectable error."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import re
from typing import Any

import analyze
from task_contract import TAX_FORMAT, TAX_FUNNEL, TAX_HOOK


def _load(path: str) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def collect_taxonomy_errors(posts: list[dict], results: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(results, list):
        return ["root: expected JSON array"]
    expected = {str(post.get("post_id")) for post in posts}
    seen: set[str] = set()
    required = {
        "post_id", "topic", "format", "funnel_stage", "hook_type",
        "series_name", "is_original", "has_product_placement",
        "analysis_labels", "classification_confidence",
    }
    for index, item in enumerate(results, start=1):
        label = f"item[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{label}: expected object")
            continue
        missing = sorted(required - set(item))
        extra = sorted(set(item) - required - {"classification_version"})
        if missing:
            errors.append(f"{label}: missing fields {', '.join(missing)}")
        if extra:
            errors.append(f"{label}: extra fields {', '.join(extra)}")
        post_id = item.get("post_id")
        if not isinstance(post_id, str) or post_id not in expected:
            errors.append(f"{label}.post_id: unknown parent")
        elif post_id in seen:
            errors.append(f"{label}.post_id: duplicate {post_id}")
        else:
            seen.add(post_id)
        if item.get("format") not in TAX_FORMAT:
            errors.append(f"{label}.format: invalid enum")
        if item.get("funnel_stage") not in TAX_FUNNEL:
            errors.append(f"{label}.funnel_stage: invalid enum")
        if item.get("hook_type") not in TAX_HOOK:
            errors.append(f"{label}.hook_type: invalid enum")
        topic = item.get("topic")
        if not isinstance(topic, str) or not topic.strip() or (
            topic != "unknown"
            and not (
                2 <= len(topic) <= 10
                and re.search(r"[\u3400-\u4dbf\u4e00-\u9fff]", topic)
            )
        ):
            errors.append(f"{label}.topic: invalid topic")
        series_name = item.get("series_name")
        if series_name is not None and not isinstance(series_name, str):
            errors.append(f"{label}.series_name: expected string or null")
        for field in ("is_original", "has_product_placement"):
            value = item.get(field)
            if value is not None and not isinstance(value, bool):
                errors.append(f"{label}.{field}: expected boolean or null")
        labels = item.get("analysis_labels")
        if not isinstance(labels, list) or not all(
            isinstance(value, str) for value in labels
        ):
            errors.append(f"{label}.analysis_labels: expected string array")
        version = item.get("classification_version")
        if version is not None and version != "llm-1":
            errors.append(f"{label}.classification_version: expected llm-1")
        confidence = item.get("classification_confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            errors.append(f"{label}.classification_confidence: expected 0..1")
        if isinstance(post_id, str) and post_id in expected:
            parent = next(
                post for post in posts if str(post.get("post_id")) == post_id
            )
            if parent.get("platform") == "bilibili":
                if (
                    analyze._public_opening_evidence(parent) is None
                    and item.get("hook_type") != "unknown"
                ):
                    errors.append(f"{label}.hook_type lacks public evidence")
                if item.get("is_original") is not analyze._public_originality(parent):
                    errors.append(f"{label}.is_original conflicts with public evidence")
                metrics = parent.get("platform_metrics")
                metrics = metrics if isinstance(metrics, dict) else {}
                expected_series = metrics.get("series_name")
                if not isinstance(expected_series, str) or not expected_series.strip():
                    expected_series = None
                if item.get("series_name") != expected_series:
                    errors.append(f"{label}.series_name conflicts with public evidence")
    missing_ids = sorted(expected - seen)
    if missing_ids:
        errors.append(f"coverage: missing parent IDs {', '.join(missing_ids)}")
    topics = [item.get("topic") for item in results if isinstance(item, dict) and item.get("topic") != "unknown"]
    counts = {topic: topics.count(topic) for topic in set(topics)}
    singleton_rate = sum(value == 1 for value in counts.values()) / len(counts) if counts else 0
    if len(results) >= 15 and (len(counts) > 10 or singleton_rate > 0.6):
        errors.append("taxonomy quality: topics are too fragmented")
    return errors


def _business_evidence_entries(results: dict[str, Any]):
    positioning = results.get("account_positioning")
    if isinstance(positioning, dict):
        for name, claim in positioning.items():
            if isinstance(claim, dict):
                yield f"account_positioning.{name}", claim.get("evidence")
    patterns = results.get("performance_patterns")
    if isinstance(patterns, list):
        for index, pattern in enumerate(patterns, start=1):
            if isinstance(pattern, dict):
                yield f"performance_patterns[{index}]", pattern.get("evidence")
    for field in ("topic_ideas", "content_modes", "experiments"):
        values = results.get(field)
        if isinstance(values, list):
            for index, item in enumerate(values, start=1):
                if isinstance(item, dict):
                    yield f"{field}[{index}]", item.get("evidence")


def collect_business_errors(
    results: Any,
    *,
    posts: list[dict] | None = None,
    high_ids: set[str] | None = None,
    low_ids: set[str] | None = None,
    expected_collection_digest: str | None = None,
    expected_classification_digest: str | None = None,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(results, dict):
        return ["root: expected JSON object"]
    ranges = {"topic_ideas": (3, 8, "topic"), "content_modes": (2, 5, "mode"), "experiments": (2, 4, "experiment")}
    for field, (minimum, maximum, prefix) in ranges.items():
        values = results.get(field)
        if not isinstance(values, list):
            errors.append(f"{field}: expected array")
            continue
        if not minimum <= len(values) <= maximum:
            errors.append(f"{field}: expected {minimum}..{maximum} items")
        for index, item in enumerate(values, start=1):
            if not isinstance(item, dict):
                errors.append(f"{field}[{index}]: expected object")
            elif item.get("id") != f"{prefix}-{index:02d}":
                errors.append(f"{field}[{index}].id: expected {prefix}-{index:02d}")
            evidence = item.get("evidence") if isinstance(item, dict) else None
            if not isinstance(evidence, list) or not evidence:
                errors.append(f"{field}[{index}].evidence: required")
    if results.get("schema_version") != 1:
        errors.append("schema_version: expected 1")
    if posts is None:
        return errors

    by_id = {str(post.get("post_id")): post for post in posts}
    high_ids = high_ids or set()
    low_ids = low_ids or set()
    for label, evidence_list in _business_evidence_entries(results):
        if not isinstance(evidence_list, list):
            continue
        for index, raw in enumerate(evidence_list, start=1):
            evidence_label = f"{label}.evidence[{index}]"
            if isinstance(raw, dict):
                excerpt = raw.get("excerpt")
                if isinstance(excerpt, str) and any(ord(char) < 32 for char in excerpt):
                    errors.append(f"{evidence_label}: excerpt contains control character")
                post_id = raw.get("post_id")
                source_field = raw.get("source_field")
                parent = by_id.get(post_id) if isinstance(post_id, str) else None
                if (
                    parent is not None
                    and source_field in analyze._BUSINESS_SOURCE_FIELDS
                    and isinstance(excerpt, str)
                ):
                    source_value = parent.get(source_field)
                    source_bound = (
                        excerpt in source_value
                        if isinstance(source_value, str)
                        else isinstance(source_value, list) and excerpt in source_value
                    )
                    if not source_bound:
                        errors.append(f"{evidence_label}: excerpt is not source-bound")
            try:
                analyze._validate_business_evidence(raw, by_id, evidence_label)
            except ValueError as exc:
                errors.append(f"{evidence_label}: {exc}")

    patterns = results.get("performance_patterns")
    if isinstance(patterns, list):
        for index, pattern in enumerate(patterns, start=1):
            if not isinstance(pattern, dict):
                continue
            label = f"performance_patterns[{index}]"
            pattern_id = pattern.get("id")
            group, _, dimension = (
                pattern_id.partition("-") if isinstance(pattern_id, str) else ("", "", "")
            )
            if (
                pattern.get("observability") == "supported"
                and pattern.get("limitation") is not None
            ):
                errors.append(f"{label}.limitation must be null when supported")
            allowed_ids = high_ids if group == "high" else low_ids
            evidence_list = pattern.get("evidence")
            if not isinstance(evidence_list, list):
                continue
            for evidence_index, raw in enumerate(evidence_list, start=1):
                raw_post_id = raw.get("post_id") if isinstance(raw, dict) else None
                if (
                    group in {"high", "low"}
                    and isinstance(raw_post_id, str)
                    and raw_post_id not in allowed_ids
                ):
                    errors.append(
                        f"{label}.evidence[{evidence_index}]: wrong performance group"
                    )
                try:
                    resolved = analyze._validate_business_evidence(
                        raw, by_id, f"{label}.evidence[{evidence_index}]"
                    )
                except ValueError:
                    continue
                if (
                    group in {"high", "low"}
                    and raw_post_id is None
                    and resolved["post_id"] not in allowed_ids
                ):
                    errors.append(
                        f"{label}.evidence[{evidence_index}]: wrong performance group"
                    )
                expected_field = "title" if dimension == "title" else "text"
                if dimension in {"title", "opening", "structure"} and (
                    resolved["source_field"] != expected_field
                ):
                    errors.append(
                        f"{label}.evidence[{evidence_index}]: wrong source field"
                    )
                if dimension == "opening" and resolved["source_field"] == "text":
                    text = by_id[resolved["post_id"]].get("text")
                    if not isinstance(text, str) or text.find(resolved["excerpt"]) not in range(120):
                        errors.append(
                            f"{label}.evidence[{evidence_index}]: excerpt is not in caption lead"
                        )
    if (
        isinstance(expected_collection_digest, str)
        and isinstance(expected_classification_digest, str)
    ):
        try:
            analyze.validate_business_insight_results(
                posts,
                [{"post_id": post_id} for post_id in high_ids],
                [{"post_id": post_id} for post_id in low_ids],
                {"classification_status": "completed"},
                results,
                collection_commit_sha256=expected_collection_digest,
                classification_results_sha256=expected_classification_digest,
            )
        except ValueError as exc:
            errors.append(f"authoritative contract: {exc}")
    return errors


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        value = json.loads(line)
        if not isinstance(value, dict):
            raise ValueError(f"{path}:{number} must be a JSON object")
        records.append(value)
    return records


def _collection_aware_posts(collection: str, analysis_posts: list[dict]) -> list[dict]:
    source_posts = _load_jsonl(Path(collection) / "source" / "posts.jsonl")
    source_by_id = {str(post.get("post_id")): post for post in source_posts}
    merged: list[dict] = []
    for analyzed in analysis_posts:
        post_id = str(analyzed.get("post_id"))
        value = dict(analyzed)
        source = source_by_id.get(post_id)
        if source is not None:
            for field in (
                "platform", "title", "text", "hashtags", "is_repost",
                "platform_metrics", "collected_at",
            ):
                if field in source:
                    value[field] = source[field]
        merged.append(value)
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--analysis", required=True, help="draft analysis.json")
    parser.add_argument(
        "--collection",
        help="可选采集工作区；启用原文、表现分组与 caption lead 校验",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--taxonomy", help="taxonomy result JSON")
    group.add_argument("--business", help="business result JSON")
    args = parser.parse_args()
    analysis = _load(args.analysis)
    results = _load(args.taxonomy or args.business)
    posts = analysis.get("posts", [])
    if args.collection:
        posts = _collection_aware_posts(args.collection, posts)
    high_ids = {
        str(item.get("post_id"))
        for item in analysis.get("high_performance", [])
        if isinstance(item, dict)
    }
    low_ids = {
        str(item.get("post_id"))
        for item in analysis.get("low_performance", [])
        if isinstance(item, dict)
    }
    context: dict[str, Any] = {}
    context_path = Path(args.analysis).with_name("business-context.json")
    if context_path.is_file():
        loaded_context = _load(str(context_path))
        if isinstance(loaded_context, dict):
            context = loaded_context
    errors = (
        collect_taxonomy_errors(posts, results)
        if args.taxonomy
        else collect_business_errors(
            results,
            posts=posts if args.collection else None,
            high_ids=high_ids,
            low_ids=low_ids,
            expected_collection_digest=context.get("collection_commit_sha256"),
            expected_classification_digest=context.get(
                "classification_results_sha256"
            ),
        )
    )
    print(json.dumps({"valid": not errors, "error_count": len(errors), "errors": errors}, ensure_ascii=False, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
