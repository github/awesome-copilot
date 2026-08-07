#!/usr/bin/env python3
"""Immutable, zero-dependency derived-analysis pipeline."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from analyze import (
    AnalysisResult,
    analyze_in_memory,
    build_business_context,
    build_business_evidence_catalog,
    build_business_result_template,
    build_taxonomy_input,
    build_taxonomy_result_template,
)
from execution_timing import ExecutionTimer
from field_coverage import compute_field_coverage
from immutable_workspace import (
    ANALYSIS_ARTIFACTS,
    ANALYSIS_OPTIONAL_ARTIFACTS,
    ANALYSIS_OPTIONAL_ARTIFACT_REQUIREMENTS,
    ANALYSIS_REQUIRED_ARTIFACTS,
    DEFAULT_MAX_ARTIFACT_BYTES,
    FORMAT,
    ImmutableWorkspace,
    VerifiedWorkspaceReader,
    WorkspaceCommitIndeterminate,
    WorkspaceError,
    WorkspaceExistsError,
    preflight_workspace_target,
    reject_workspace_overlap,
)
from normalize import NormalizationResult, normalize_in_memory
from render_report import RenderResult, render_in_memory
from task_contract import (
    ANALYZABLE_TASK_STATUSES,
    STOP_REASONS,
    TASK_STATUSES,
    TaskContractError,
    new_task_id,
    safe_stop_reason_label,
    safe_task_status_label,
    validate_analysis_goal,
)


COLLECTION_ARTIFACTS = frozenset(
    {
        "source/profile.json",
        "source/posts.jsonl",
        "source/comments.jsonl",
        "source/index-evidence.json",
        "normalized-posts.csv",
        "task.json",
        "collection-report.md",
    }
)
COLLECTION_REQUIRED_ARTIFACTS = frozenset(
    {"source/profile.json", "source/posts.jsonl", "task.json"}
)
COLLECTION_OPTIONAL_EVIDENCE = {
    "source/comments.jsonl": "source/comments.jsonl",
    "source/index-evidence.json": "source/index-evidence.json",
}
EVIDENCE_DELIVERY_ARTIFACTS = frozenset({
    "source/profile.json",
    "source/posts.jsonl",
    "source/collection-task.json",
    "source/collection-provenance.json",
    "task.json",
    "delivery-summary.json",
    "final-response.md",
})
# 任务级枚举从 task_contract 单一来源导入，避免与 _constants.py / collect.py 漂移。


class PipelineError(RuntimeError):
    """A pre-commit phase failed; no analysis workspace was published."""


@dataclass(frozen=True)
class PipelineResult:
    workspace: str
    commit_sha256: str
    task_status: str
    phase_results: dict[str, str]


def _json_object(payload: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PipelineError(f"{label} 不是有效的 UTF-8 JSON") from exc
    if not isinstance(value, dict):
        raise PipelineError(f"{label} 必须是 JSON 对象")
    return value


def _jsonl_bytes(records: list[dict[str, Any]]) -> bytes:
    return "".join(
        json.dumps(record, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        + "\n"
        for record in records
    ).encode("utf-8")


def _classification_json(payload: bytes) -> list[dict[str, Any]]:
    def reject_constant(value: str):
        raise ValueError(f"非标准数值常量 {value}")

    def reject_duplicate_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"重复的键名 {key}")
            result[key] = value
        return result

    try:
        value = json.loads(
            payload.decode("utf-8"),
            parse_constant=reject_constant,
            object_pairs_hook=reject_duplicate_pairs,
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise PipelineError(
            "classification results are not strict UTF-8 JSON"
        ) from exc
    if not isinstance(value, list):
        raise PipelineError("classification results must be a JSON array")
    return value


def _read_classification_results(path: str) -> tuple[bytes, list[dict[str, Any]]]:
    try:
        with open(path, "rb") as handle:
            payload = handle.read(DEFAULT_MAX_ARTIFACT_BYTES + 1)
    except (OSError, TypeError, ValueError) as exc:
        raise PipelineError("classification results cannot be read") from exc
    if len(payload) > DEFAULT_MAX_ARTIFACT_BYTES:
        raise PipelineError("classification results are too large")
    return payload, _classification_json(payload)


def _business_insight_json(payload: bytes) -> dict[str, Any]:
    def reject_constant(value: str):
        raise ValueError(f"non-standard numeric constant {value}")

    def reject_duplicate_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate key {key}")
            result[key] = value
        return result

    try:
        value = json.loads(
            payload.decode("utf-8"),
            parse_constant=reject_constant,
            object_pairs_hook=reject_duplicate_pairs,
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise PipelineError(
            "business insight results are not strict UTF-8 JSON"
        ) from exc
    if not isinstance(value, dict):
        raise PipelineError("business insight results must be a JSON object")
    return value


def _read_business_insight_results(path: str) -> tuple[bytes, dict[str, Any]]:
    try:
        with open(path, "rb") as handle:
            payload = handle.read(DEFAULT_MAX_ARTIFACT_BYTES + 1)
    except (OSError, TypeError, ValueError) as exc:
        raise PipelineError("business insight results cannot be read") from exc
    if len(payload) > DEFAULT_MAX_ARTIFACT_BYTES:
        raise PipelineError("business insight results are too large")
    return payload, _business_insight_json(payload)


def _comment_insight_json(payload: bytes) -> dict[str, Any]:
    def reject_constant(value: str):
        raise ValueError(f"non-standard numeric constant {value}")

    def reject_duplicate_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate key {key}")
            result[key] = value
        return result

    try:
        value = json.loads(
            payload.decode("utf-8"),
            parse_constant=reject_constant,
            object_pairs_hook=reject_duplicate_pairs,
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        raise PipelineError(
            "comment insight results are not strict UTF-8 JSON"
        ) from exc
    if not isinstance(value, dict):
        raise PipelineError("comment insight results must be a JSON object")
    return value


def _read_comment_insight_results(path: str) -> tuple[bytes, dict[str, Any]]:
    try:
        with open(path, "rb") as handle:
            payload = handle.read(DEFAULT_MAX_ARTIFACT_BYTES + 1)
    except (OSError, TypeError, ValueError) as exc:
        raise PipelineError("comment insight results cannot be read") from exc
    if len(payload) > DEFAULT_MAX_ARTIFACT_BYTES:
        raise PipelineError("comment insight results are too large")
    return payload, _comment_insight_json(payload)


def _validate_jsonl(payload: bytes, label: str) -> None:
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise PipelineError(f"{label} is not UTF-8") from exc
    lines = [] if text == "" else text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    for lineno, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise PipelineError(f"{label} line {lineno} is invalid JSON") from exc
        if not isinstance(value, dict):
            raise PipelineError(f"{label} line {lineno} must be an object")


def _json_bytes(value: Any) -> bytes:
    try:
        return (
            json.dumps(
                value,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
                allow_nan=False,
            )
            + "\n"
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise PipelineError("pipeline JSON output is invalid") from exc


def _jsonl_record_count(payload: bytes, label: str) -> int:
    """Validate a JSONL artifact and return its non-blank record count."""
    _validate_jsonl(payload, label)
    try:
        return sum(1 for line in payload.decode("utf-8").splitlines() if line.strip())
    except UnicodeDecodeError as exc:
        raise PipelineError(f"{label} is not UTF-8") from exc


def _profile_visible_count(profile: dict[str, Any]) -> int:
    visibility = profile.get("field_visibility")
    if not isinstance(visibility, dict):
        return 0
    return sum(value in {"visible", "partial"} for value in visibility.values())


def _evidence_only_response(summary: dict[str, Any]) -> str:
    sample = summary["sample"]
    lines = [
        "## 数据质量摘要",
        "",
        "- delivery_kind: evidence_only",
        "- delivery_ready: true",
        f"- task_status: {summary['task_status']}",
        f"- stop_reason: {summary['stop_reason'] or 'none'}",
        f"- collected: {sample['collected']}",
        f"- profile_visible_fields: {summary['profile_visible_fields']}",
        "",
        "## 本次可交付结果",
        "",
        "已保留并核验本次公开采集事实、账号资料和停止原因。",
    ]
    if sample["collected"] < 1:
        lines.append(
            "由于没有可分析的公开作品，本次未生成账号内容策略结论，也未推测栏目、发布节奏或互动表现。"
        )
    else:
        lines.append(
            "本交付仅说明采集范围与状态；如需内容分析，可基于同一密封 collection 继续运行轻量或深度分析。"
        )
    lines.extend([
        "",
        "> 公开页面快照，不代表账号后台真实曝光和转化。",
        "",
    ])
    return "\n".join(lines)


def run_evidence_delivery(collection_dir: str, output_dir: str) -> PipelineResult:
    """Commit a fixed evidence-only delivery, including zero-post outcomes."""
    output = preflight_workspace_target(output_dir)
    reject_workspace_overlap(collection_dir, output)
    try:
        reader_context = VerifiedWorkspaceReader.open(
            collection_dir, allowed_artifacts=COLLECTION_ARTIFACTS
        )
    except WorkspaceError as exc:
        raise PipelineError(f"collection verification failed: {exc}") from exc

    with reader_context as reader:
        manifested = {item["path"] for item in reader.manifest.get("artifacts", [])}
        missing = COLLECTION_REQUIRED_ARTIFACTS - manifested
        if missing:
            raise PipelineError(
                "collection is missing required input: " + ", ".join(sorted(missing))
            )
        profile_artifact = reader.read("source/profile.json")
        posts_artifact = reader.read("source/posts.jsonl")
        task_artifact = reader.read("task.json")
        profile = _json_object(profile_artifact.payload, "source/profile.json")
        source_task = _json_object(task_artifact.payload, "task.json")
        source_task_id = source_task.get("task_id")
        if not isinstance(source_task_id, str) or not source_task_id:
            raise PipelineError("collection task_id is missing")
        platform = profile.get("platform") or source_task.get("platform")
        if not isinstance(platform, str) or not platform:
            raise PipelineError("collection platform is missing")
        source_status = source_task.get("task_status")
        if source_status not in {"COMPLETED", "PARTIAL", "FAILED"}:
            raise PipelineError("collection task status cannot be delivered")
        collected = source_task.get("collected_count")
        if type(collected) is not int or collected < 0:
            raise PipelineError("collection collected_count is invalid")
        record_count = _jsonl_record_count(
            posts_artifact.payload, "source/posts.jsonl"
        )
        if record_count != collected:
            raise PipelineError("collection post count does not match task metadata")
        task_status = safe_task_status_label(source_status)
        stop_reason = safe_stop_reason_label(source_task.get("stop_reason"))
        summary = {
            "schema_version": 1,
            "delivery_kind": "evidence_only",
            "delivery_ready": True,
            "strategy_ready": False,
            "task_status": task_status,
            "stop_reason": stop_reason,
            "sample": {
                "requested": source_task.get("requested_limit"),
                "collected": collected,
                "valid": 0,
            },
            "profile_visible_fields": _profile_visible_count(profile),
            "collection_commit_sha256": reader.source_digest,
        }
        derived_task = {
            "task_id": new_task_id(platform),
            "platform": platform,
            "task_status": task_status,
            "delivery_kind": "evidence_only",
            "source_task_id": source_task_id,
            "collection_commit_sha256": reader.source_digest,
            "phase_results": {
                "collection_input": "VERIFIED",
                "evidence_delivery": "COMPLETED",
            },
        }
        provenance = {
            "source_format": reader.source_format,
            "source_task_id": source_task_id,
            "collection_commit_sha256": reader.source_digest,
        }
        artifacts = {
            "source/profile.json": profile_artifact.payload,
            "source/posts.jsonl": posts_artifact.payload,
            "source/collection-task.json": task_artifact.payload,
            "source/collection-provenance.json": _json_bytes(provenance),
            "task.json": _json_bytes(derived_task),
            "delivery-summary.json": _json_bytes(summary),
            "final-response.md": _evidence_only_response(summary).encode("utf-8"),
        }
        reader.verify_unchanged()
        reservation = ImmutableWorkspace.reserve(
            output, allowed_artifacts=EVIDENCE_DELIVERY_ARTIFACTS
        )
        try:
            for relative in sorted(artifacts):
                with reservation.open_binary(relative) as handle:
                    handle.write(artifacts[relative])
            reader.verify_unchanged()
            commit_sha256 = reservation.commit()
        finally:
            reservation.close()

    return PipelineResult(
        workspace=os.path.abspath(output),
        commit_sha256=commit_sha256,
        task_status=task_status,
        phase_results=derived_task["phase_results"],
    )


def _phase(name: str, function: Callable, *args, **kwargs):
    try:
        return function(*args, **kwargs)
    except PipelineError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise PipelineError(f"{name} failed: {exc}") from exc


def _normalization_status(result: NormalizationResult) -> str:
    coverage = result.coverage
    lossless = (
        coverage.get("parse_errors") == 0
        and coverage.get("duplicate_count") == 0
        and coverage.get("input_line_count") == coverage.get("raw_count")
        and coverage.get("raw_count") == coverage.get("post_count")
        and coverage.get("post_count") == coverage.get("valid_count")
        and not coverage.get("errors")
        and not coverage.get("warnings")
    )
    return "COMPLETED" if lossless else "PARTIAL"


def _analysis_status(result: AnalysisResult) -> str:
    classification_status = result.analysis.get("classification_status")
    evidence_status = (result.analysis.get("evidence_coverage") or {}).get(
        "status"
    )
    business_required = result.analysis.get("business_insight_required") is True
    business_complete = (
        not business_required
        or result.analysis.get("business_insight_status") == "completed"
    )
    comment_required = result.analysis.get("comment_insight_required") is True
    comment_complete = (
        not comment_required
        or result.analysis.get("comment_insight_status") == "completed"
    )
    complete = (
        classification_status == "completed"
        and evidence_status == "COMPLETE"
        and business_complete
        and comment_complete
    )
    return "COMPLETED" if complete else "PARTIAL"


def _analysis_partial_reasons(analysis: dict[str, Any]) -> list[str]:
    """Return stable, independent reasons for an incomplete analysis."""
    reasons: list[str] = []
    needs_generic_reason = False

    classification_status = analysis.get("classification_status")
    if classification_status == "pending-model":
        reasons.append("PENDING_CLASSIFICATION")
    elif classification_status == "partial-model":
        reasons.append("PARTIAL_CLASSIFICATION")
    elif classification_status != "completed":
        needs_generic_reason = True

    if analysis.get("business_insight_required") is True:
        business_status = analysis.get("business_insight_status")
        if business_status == "pending-model":
            reasons.append("PENDING_BUSINESS_INSIGHTS")
        elif business_status == "partial-model":
            reasons.append("PARTIAL_BUSINESS_INSIGHTS")
        elif business_status != "completed":
            needs_generic_reason = True

    if analysis.get("comment_insight_required") is True:
        comment_status = analysis.get("comment_insight_status")
        if comment_status == "pending-model":
            reasons.append("PENDING_COMMENT_INSIGHTS")
        elif comment_status == "partial-model":
            reasons.append("PARTIAL_COMMENT_INSIGHTS")
        elif comment_status != "completed":
            needs_generic_reason = True

    evidence_status = (analysis.get("evidence_coverage") or {}).get("status")
    if evidence_status == "PARTIAL_EVIDENCE":
        reasons.append("EVIDENCE_INCOMPLETE")
    elif evidence_status != "COMPLETE":
        needs_generic_reason = True

    if needs_generic_reason:
        reasons.append("ANALYSIS_PARTIAL")
    return reasons


def _validate_output_payloads(
    artifacts: dict[str, bytes], *, expected_artifacts: frozenset[str]
) -> None:
    actual = frozenset(artifacts)
    if actual != expected_artifacts:
        raise PipelineError("analysis artifact inventory is invalid")
    if not ANALYSIS_REQUIRED_ARTIFACTS.issubset(actual):
        raise PipelineError("analysis artifact inventory is incomplete")
    if not actual.issubset(ANALYSIS_ARTIFACTS):
        raise PipelineError("analysis artifact inventory is not allowlisted")
    for relative, requirements in ANALYSIS_OPTIONAL_ARTIFACT_REQUIREMENTS.items():
        missing_requirements = requirements - actual
        if relative in actual and missing_requirements:
            raise PipelineError(
                f"{relative} requires "
                + ", ".join(sorted(missing_requirements))
            )

    for relative in (
        "source/profile.json",
        "source/collection-task.json",
        "source/collection-provenance.json",
        "normalized-coverage.json",
        "analysis.json",
        "task.json",
        "delivery-summary.json",
    ):
        _json_object(artifacts[relative], relative)
    _validate_jsonl(artifacts["source/posts.jsonl"], "source/posts.jsonl")
    if "source/comments.jsonl" in artifacts:
        _validate_jsonl(
            artifacts["source/comments.jsonl"], "source/comments.jsonl"
        )
    if "source/index-evidence.json" in artifacts:
        _json_object(
            artifacts["source/index-evidence.json"],
            "source/index-evidence.json",
        )
    if "source/classification-results.json" in artifacts:
        _classification_json(artifacts["source/classification-results.json"])
    if "source/business-insight-results.json" in artifacts:
        _business_insight_json(artifacts["source/business-insight-results.json"])
    if "source/comment-insight-results.json" in artifacts:
        _comment_insight_json(artifacts["source/comment-insight-results.json"])

    try:
        csv_rows = list(
            csv.DictReader(
                io.StringIO(artifacts["normalized-posts.csv"].decode("utf-8"))
            )
        )
    except (UnicodeDecodeError, csv.Error) as exc:
        raise PipelineError("normalized-posts.csv is invalid") from exc
    analysis = _json_object(artifacts["analysis.json"], "analysis.json")
    valid = (analysis.get("sample_boundary") or {}).get("valid")
    if not csv_rows or not isinstance(valid, int) or valid < 1:
        raise PipelineError("analysis has no analyzable rows")
    for relative in (
        "account-analysis-report.md",
        "dashboard.html",
        "pipeline-report.md",
        "final-response.md",
    ):
        try:
            text = artifacts[relative].decode("utf-8")
        except UnicodeDecodeError as exc:
            raise PipelineError(f"{relative} is not UTF-8") from exc
        if not text.strip():
            raise PipelineError(f"{relative} is empty")


def _pipeline_report(
    *,
    task_status: str,
    partial_reasons: list[str],
    phase_results: dict[str, str],
    source_digest: str,
    normalization: NormalizationResult,
    duration_ms: int,
) -> str:
    lines = [
        "# Derived analysis pipeline report",
        "",
        f"- task_status: {task_status}",
        "- partial_reasons: "
        + (", ".join(partial_reasons) if partial_reasons else "none"),
        f"- collection_commit_sha256: {source_digest}",
        f"- normalized_rows: {normalization.coverage['post_count']}",
        f"- analyzable_rows: {normalization.coverage['valid_count']}",
        f"- duration_ms: {duration_ms}",
        "",
        "## Phase results",
        "",
    ]
    lines.extend(f"- {name}: {status}" for name, status in phase_results.items())
    return "\n".join(lines) + "\n"


def _delivery_summary(
    analysis: dict[str, Any], *, task_status: str
) -> dict[str, Any]:
    meta = analysis.get("meta") or {}
    sample = analysis.get("sample_boundary") or {}
    comments = analysis.get("comment_analysis") or {}
    status_counts = sample.get("status_counts") or {}
    posts = analysis.get("posts")
    field_coverage = (
        compute_field_coverage(posts)
        if isinstance(posts, list)
        else sample.get("field_coverage") or {}
    )
    stop_reason = safe_stop_reason_label(meta.get("stop_reason"))
    restriction_scope = None
    if stop_reason in STOP_REASONS:
        diagnostic = meta.get("diagnostic_code") or "task_level"
        platform_code = meta.get("platform_response_code")
        platform_suffix = (
            f"; platform_response_code={platform_code}"
            if isinstance(platform_code, int) and not isinstance(platform_code, bool)
            else ""
        )
        restriction_scope = (
            f"{diagnostic}; item_level_restricted="
            f"{status_counts.get('RESTRICTED', 0)}{platform_suffix}"
        )
    main_metric = (analysis.get("performance_meta") or {}).get("main_metric")
    small_denominator_warning = None
    if main_metric in {
        "view_based_engagement_rate",
        "deep_approval_rate",
        "community_discussion_rate",
    }:
        small_denominator_warning = (
            "比率排序受播放分母影响；低播放高比率只能称为互动效率样本，"
            "不能直接称为高触达或爆款。"
        )
    strategy_ready = bool(
        analysis.get("classification_status") == "completed"
        and (analysis.get("evidence_coverage") or {}).get("status")
        == "COMPLETE"
        and (
            analysis.get("business_insight_required") is not True
            or analysis.get("business_insight_status") == "completed"
        )
        and (
            analysis.get("comment_insight_required") is not True
            or analysis.get("comment_insight_status") == "completed"
        )
    )
    valid_count = sample.get("valid")
    light_ready = bool(
        type(valid_count) is int
        and valid_count > 0
        and analysis.get("classification_status") == "pending-model"
        and analysis.get("business_insight_required") is not True
        and analysis.get("comment_insight_required") is not True
    )
    delivery_kind = "strategy" if strategy_ready else "light"
    delivery_ready = strategy_ready or light_ready
    return {
        "schema_version": 1,
        "delivery_kind": delivery_kind,
        "delivery_ready": delivery_ready,
        "strategy_ready": strategy_ready,
        "task_status": task_status,
        "stop_reason": stop_reason,
        "restriction_scope": restriction_scope,
        "sample": {
            "requested": sample.get("requested"),
            "collected": sample.get("collected"),
            "valid": sample.get("valid"),
            "excluded_flagged": sample.get("excluded_flagged"),
            "status_counts": {
                key: status_counts.get(key, 0)
                for key in (
                    "SUCCESS",
                    "PARTIAL",
                    "FAILED",
                    "DELETED",
                    "RESTRICTED",
                )
            },
        },
        "field_coverage": field_coverage,
        "classification": {
            "status": analysis.get("classification_status"),
            "coverage_rate": (
                analysis.get("classification_coverage") or {}
            ).get("rate"),
        },
        "business_insights": {
            "status": analysis.get("business_insight_status")
        },
        "comments": {
            "collection_status": comments.get("status"),
            "sampled_count": comments.get("sampled_comment_count", 0),
            "insight_required": analysis.get("comment_insight_required"),
            "insight_status": analysis.get("comment_insight_status"),
        },
        "performance": {
            "main_metric": main_metric,
            "label": f"按 {main_metric} 排序的样本内相对表现",
            "small_denominator_warning": small_denominator_warning,
            "axes": {
                "reach": {
                    "status": ((analysis.get("performance_axes") or {}).get("reach") or {}).get("status"),
                    "measured_count": ((analysis.get("performance_axes") or {}).get("reach") or {}).get("measured_count"),
                },
                "engagement_efficiency": {
                    "status": ((analysis.get("performance_axes") or {}).get("engagement_efficiency") or {}).get("status"),
                    "measured_count": ((analysis.get("performance_axes") or {}).get("engagement_efficiency") or {}).get("measured_count"),
                    "denominator_floor": ((analysis.get("performance_axes") or {}).get("engagement_efficiency") or {}).get("denominator_floor"),
                    "excluded_small_denominator_count": ((analysis.get("performance_axes") or {}).get("engagement_efficiency") or {}).get("excluded_small_denominator_count"),
                },
            },
        },
    }


def _final_response(summary: dict[str, Any]) -> str:
    sample = summary["sample"]
    counts = sample["status_counts"]
    coverage = summary["field_coverage"]
    coverage_text = " / ".join(
        f"{name} {value * 100:.1f}%" if isinstance(value, (int, float)) else f"{name} —"
        for name, value in coverage.items()
    )
    lines = [
        "## 数据质量摘要",
        "",
        f"- delivery_ready: {str(summary.get('delivery_ready') is True).lower()}",
        f"- task_status: {summary['task_status']}",
        f"- stop_reason: {summary['stop_reason'] or 'none'}",
        f"- requested / collected / valid: {sample['requested']} / {sample['collected']} / {sample['valid']}",
        "- "
        + " / ".join(f"{key} {counts[key]}" for key in counts),
        f"- excluded_flagged: {sample['excluded_flagged']}",
        f"- field_coverage: {coverage_text or 'none'}",
        f"- restriction_scope: {summary['restriction_scope'] or 'none'}",
        "",
        "## 分析结论交付规则",
        "",
        "以上数字由 final analysis.json 确定性生成；不得重新计算或凭记忆改写上述数字。",
        "结论必须沿用报告的主指标名称，并把比率高组称为互动效率样本，而非自动称为高触达或爆款。",
        "自然语言结论只引用 final 报告和已封存 evidence；单个作品只能称为个案，不能冒充共同点。",
    ]
    if summary.get("delivery_ready") is not True:
        lines.extend([
            "",
            "> 当前工作区不是可交付 final；不得作为最终策略报告交付。请完成缺失的模型阶段并创建新的 final 工作区。",
        ])
    warning = (summary.get("performance") or {}).get(
        "small_denominator_warning"
    )
    if warning:
        lines.extend(["", f"> {warning}"])
    return "\n".join(lines) + "\n"


def _load_default_template() -> str:
    path = Path(__file__).resolve().parent.parent / "assets" / "report-template.html"
    try:
        template = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise PipelineError("report template cannot be read") from exc
    if not template:
        raise PipelineError("report template is empty")
    return template


def validate_pipeline_inputs(
    collection_dir: str,
    *,
    classification_results_path: str | None = None,
    with_taxonomy_prompt: bool = False,
    business_insight_results_path: str | None = None,
    comment_insight_results_path: str | None = None,
    require_taxonomy: bool = False,
    require_business_insights: bool = False,
    require_comment_insights: bool = False,
) -> AnalysisResult:
    """Run authoritative normalization and model-result validation without output."""
    if classification_results_path is not None and not with_taxonomy_prompt:
        raise PipelineError(
            "EXTERNAL_TAXONOMY: classification-results requires --with-llm-tax"
        )
    if require_taxonomy and classification_results_path is None:
        raise PipelineError(
            "classification results are required for delivery validation"
        )
    if require_business_insights and business_insight_results_path is None:
        raise PipelineError(
            "business insight results are required for delivery validation"
        )
    if require_comment_insights and comment_insight_results_path is None:
        raise PipelineError(
            "comment insight results are required for delivery validation"
        )
    classification_payload: bytes | None = None
    classification_results: list[dict[str, Any]] | None = None
    if classification_results_path is not None:
        classification_payload, classification_results = (
            _read_classification_results(classification_results_path)
        )
    classification_digest = (
        hashlib.sha256(classification_payload).hexdigest()
        if classification_payload is not None
        else None
    )
    business_results = (
        _read_business_insight_results(business_insight_results_path)[1]
        if business_insight_results_path is not None
        else None
    )
    comment_payload: bytes | None = None
    comment_results: dict[str, Any] | None = None
    if comment_insight_results_path is not None:
        comment_payload, comment_results = _read_comment_insight_results(
            comment_insight_results_path
        )
    comment_digest = (
        hashlib.sha256(comment_payload).hexdigest()
        if comment_payload is not None
        else None
    )
    try:
        reader_context = VerifiedWorkspaceReader.open(
            collection_dir, allowed_artifacts=COLLECTION_ARTIFACTS
        )
    except WorkspaceError as exc:
        raise PipelineError(f"collection verification failed: {exc}") from exc

    with reader_context as reader:
        manifested = {
            item["path"] for item in reader.manifest.get("artifacts", [])
        }
        missing = COLLECTION_REQUIRED_ARTIFACTS - manifested
        if missing:
            raise PipelineError(
                "collection is missing required input: " + ", ".join(sorted(missing))
            )
        profile_artifact = reader.read("source/profile.json")
        posts_artifact = reader.read("source/posts.jsonl")
        task_artifact = reader.read("task.json")
        assert profile_artifact.payload is not None
        assert posts_artifact.payload is not None
        assert task_artifact.payload is not None
        profile = _json_object(profile_artifact.payload, "source/profile.json")
        task = _json_object(task_artifact.payload, "task.json")
        normalization = _phase(
            "NORMALIZE", normalize_in_memory, profile, posts_artifact.payload
        )
        if normalization.coverage.get("valid_count", 0) < 1:
            raise PipelineError("NORMALIZE failed: no analyzable rows")
        comments_payload = None
        if "source/comments.jsonl" in manifested:
            comments_payload = reader.read("source/comments.jsonl").payload
        result = _phase(
            "VALIDATE_MODEL_RESULTS",
            analyze_in_memory,
            profile,
            normalization.rows,
            task,
            classification_results=classification_results,
            business_insight_results=business_results,
            with_business_insights=business_results is not None,
            collection_commit_sha256=reader.source_digest,
            classification_results_sha256=classification_digest,
            comment_insight_results=comment_results,
            with_comment_insights=comment_results is not None,
            comment_insight_results_sha256=comment_digest,
            comments_payload=comments_payload,
        )
        reader.verify_unchanged()
        return result


def run_pipeline(
    collection_dir: str,
    output_dir: str,
    *,
    template_text: str | None = None,
    with_taxonomy_prompt: bool = False,
    classification_results_path: str | None = None,
    with_business_insights: bool = False,
    business_insight_results_path: str | None = None,
    with_comment_insights: bool = False,
    comment_insight_results_path: str | None = None,
    require_delivery_ready: bool = False,
) -> PipelineResult:
    """Verify a sealed collection and commit a separate derived workspace."""
    if classification_results_path is not None and not with_taxonomy_prompt:
        raise PipelineError(
            "EXTERNAL_TAXONOMY: classification-results requires --with-llm-tax"
        )
    if require_delivery_ready:
        if classification_results_path is None:
            raise PipelineError(
                "classification results are required for final delivery"
            )
        if with_business_insights and business_insight_results_path is None:
            raise PipelineError(
                "business insight results are required for final delivery"
            )
        if with_comment_insights and comment_insight_results_path is None:
            raise PipelineError(
                "comment insight results are required for final delivery"
            )
    execution_timer = ExecutionTimer()
    with execution_timer.phase("collection_input"):
        output = preflight_workspace_target(output_dir)
        reject_workspace_overlap(collection_dir, output)
        if template_text is None:
            template_text = _load_default_template()
        if not isinstance(template_text, str) or not template_text:
            raise PipelineError("report template is missing or empty")
        classification_payload: bytes | None = None
        classification_results: list[dict[str, Any]] | None = None
        if classification_results_path is not None:
            classification_payload, classification_results = (
                _read_classification_results(classification_results_path)
            )
        classification_results_sha256 = (
            hashlib.sha256(classification_payload).hexdigest()
            if classification_payload is not None
            else None
        )
        business_insight_payload: bytes | None = None
        business_insight_results: dict[str, Any] | None = None
        if business_insight_results_path is not None:
            business_insight_payload, business_insight_results = (
                _read_business_insight_results(business_insight_results_path)
            )
        comment_insight_payload: bytes | None = None
        comment_insight_results: dict[str, Any] | None = None
        if comment_insight_results_path is not None:
            comment_insight_payload, comment_insight_results = (
                _read_comment_insight_results(comment_insight_results_path)
            )
        comment_insight_results_sha256 = (
            hashlib.sha256(comment_insight_payload).hexdigest()
            if comment_insight_payload is not None
            else None
        )

        try:
            reader_context = VerifiedWorkspaceReader.open(
                collection_dir, allowed_artifacts=COLLECTION_ARTIFACTS
            )
        except WorkspaceError as exc:
            raise PipelineError(
                f"collection verification failed: {exc}"
            ) from exc

    with reader_context as reader:
        manifested = {
            item["path"] for item in reader.manifest.get("artifacts", [])
        }
        missing = COLLECTION_REQUIRED_ARTIFACTS - manifested
        if missing:
            raise PipelineError(
                "collection is missing required input: " + ", ".join(sorted(missing))
            )

        reads = {
            relative: reader.read(relative)
            for relative in sorted(COLLECTION_REQUIRED_ARTIFACTS)
        }
        for relative in COLLECTION_OPTIONAL_EVIDENCE:
            if relative in manifested:
                reads[relative] = reader.read(relative)
        if any(
            artifact.source_digest != reader.source_digest
            or artifact.source_format != FORMAT
            for artifact in reads.values()
        ):
            raise PipelineError("collection reads do not share one commit digest")

        profile_payload = reads["source/profile.json"].payload
        posts_payload = reads["source/posts.jsonl"].payload
        task_payload = reads["task.json"].payload
        assert profile_payload is not None
        assert posts_payload is not None
        assert task_payload is not None
        profile = _json_object(profile_payload, "source/profile.json")
        source_task = _json_object(task_payload, "task.json")
        source_task_id = source_task.get("task_id")
        if not isinstance(source_task_id, str) or not source_task_id:
            raise PipelineError("collection task_id is missing")
        upstream_status = source_task.get("task_status")
        if upstream_status not in ANALYZABLE_TASK_STATUSES:
            safe_status = safe_task_status_label(upstream_status)
            safe_stop_reason = safe_stop_reason_label(
                source_task.get("stop_reason")
            )
            raise PipelineError(
                f"collection task_status={safe_status} is not analyzable; "
                f"stop_reason={safe_stop_reason}; no analysis workspace created"
            )
        platform = profile.get("platform") or source_task.get("platform")
        if not isinstance(platform, str) or not platform:
            raise PipelineError("collection platform is missing")
        try:
            analysis_goal = validate_analysis_goal(
                source_task.get("analysis_goal")
            )
            derived_task_id = new_task_id(platform)
        except TaskContractError as exc:
            raise PipelineError(f"collection task contract is invalid: {exc}") from exc

        for relative in COLLECTION_OPTIONAL_EVIDENCE:
            artifact = reads.get(relative)
            if artifact is None or artifact.payload is None:
                continue
            if relative.endswith(".jsonl"):
                _validate_jsonl(artifact.payload, relative)
            else:
                _json_object(artifact.payload, relative)

        with execution_timer.phase("normalization"):
            normalization = _phase(
                "NORMALIZE", normalize_in_memory, profile, posts_payload
            )
        if normalization.coverage.get("valid_count", 0) < 1:
            raise PipelineError("NORMALIZE failed: no analyzable rows")
        normalization_status = _normalization_status(normalization)

        analysis_params = dict(source_task)
        analysis_params["task_id"] = derived_task_id
        analysis_params["analysis_goal"] = analysis_goal
        with execution_timer.phase("analysis"):
            analysis = _phase(
                "ANALYZE",
                analyze_in_memory,
                profile,
                normalization.rows,
                analysis_params,
                classification_results=classification_results,
                with_taxonomy_prompt=with_taxonomy_prompt,
                business_insight_results=business_insight_results,
                with_business_insights=with_business_insights,
                collection_commit_sha256=reader.source_digest,
                classification_results_sha256=classification_results_sha256,
                comment_insight_results=comment_insight_results,
                with_comment_insights=with_comment_insights,
                comment_insight_results_sha256=comment_insight_results_sha256,
                comments_payload=(
                    reads["source/comments.jsonl"].payload
                    if "source/comments.jsonl" in reads
                    else None
                ),
            )
        if (analysis.analysis.get("sample_boundary") or {}).get("valid", 0) < 1:
            raise PipelineError("ANALYZE failed: no analyzable rows")
        analysis_status = _analysis_status(analysis)
        if require_delivery_ready and analysis_status != "COMPLETED":
            raise PipelineError(
                "analysis model stages are incomplete; final delivery refused"
            )

        partial_reasons: list[str] = []
        if upstream_status != "COMPLETED":
            partial_reasons.append("UPSTREAM_COLLECTION_PARTIAL")
        if normalization_status != "COMPLETED":
            partial_reasons.append("NORMALIZATION_PARTIAL")
        if analysis_status != "COMPLETED":
            partial_reasons.extend(
                reason
                for reason in _analysis_partial_reasons(analysis.analysis)
                if reason not in partial_reasons
            )
        task_status = "PARTIAL" if partial_reasons else "COMPLETED"
        analysis_payload = dict(analysis.analysis)
        analysis_payload["meta"] = {
            **(analysis.analysis.get("meta") or {}),
            "task_status": task_status,
            "partial_reasons": list(partial_reasons),
        }
        analysis = AnalysisResult(
            analysis=analysis_payload,
            taxonomy_prompt=analysis.taxonomy_prompt,
            business_insights_prompt=analysis.business_insights_prompt,
            comment_insights_prompt=analysis.comment_insights_prompt,
        )

        with execution_timer.phase("render"):
            rendered = _phase(
                "RENDER",
                render_in_memory,
                profile=profile,
                posts_csv=normalization.rows,
                analysis=analysis.analysis,
                template=template_text,
            )
        assert isinstance(rendered, RenderResult)

        phase_results = {
            "collection_input": "VERIFIED",
            "normalization": normalization_status,
            "analysis": analysis_status,
            "render": "COMPLETED",
            "validation": "COMPLETED",
        }
        provenance = {
            "source_format": reader.source_format,
            "source_task_id": source_task_id,
            "collection_commit_sha256": reader.source_digest,
            "source_manifest_artifacts": [
                {
                    "path": item["path"],
                    "size": item["size"],
                    "sha256": item["sha256"],
                }
                for item in reader.manifest["artifacts"]
            ],
        }
        task = {
            "task_id": derived_task_id,
            "platform": platform,
            "analysis_goal": analysis_goal,
            "date_from": source_task.get("date_from"),
            "date_to": source_task.get("date_to"),
            "task_status": task_status,
            "partial_reasons": partial_reasons,
            "source_task_id": source_task_id,
            "collection_commit_sha256": reader.source_digest,
            "phase_results": phase_results,
        }
        provisional_timing = execution_timer.snapshot()
        task.update(provisional_timing)

        artifacts: dict[str, bytes] = {
            "source/profile.json": profile_payload,
            "source/posts.jsonl": posts_payload,
            "source/collection-task.json": task_payload,
            "source/collection-provenance.json": _json_bytes(provenance),
            "normalized-posts.csv": normalization.csv_text.encode("utf-8"),
            "normalized-coverage.json": _json_bytes(normalization.coverage),
            "analysis.json": _json_bytes(analysis.analysis),
            "account-analysis-report.md": rendered.markdown.encode("utf-8"),
            "dashboard.html": rendered.html.encode("utf-8"),
            "task.json": _json_bytes(task),
            "pipeline-report.md": _pipeline_report(
                task_status=task_status,
                partial_reasons=partial_reasons,
                phase_results=phase_results,
                source_digest=reader.source_digest,
                normalization=normalization,
                duration_ms=provisional_timing["duration_ms"],
            ).encode("utf-8"),
        }
        for source_relative, output_relative in COLLECTION_OPTIONAL_EVIDENCE.items():
            artifact = reads.get(source_relative)
            if artifact is not None and artifact.payload is not None:
                artifacts[output_relative] = artifact.payload
        if analysis.taxonomy_prompt is not None:
            artifacts["taxonomy-prompt.md"] = analysis.taxonomy_prompt.encode(
                "utf-8"
            )
            artifacts["taxonomy-input.jsonl"] = _jsonl_bytes(
                build_taxonomy_input(analysis.analysis["posts"])
            )
            artifacts["taxonomy-result-template.json"] = _json_bytes(
                build_taxonomy_result_template(analysis.analysis["posts"])
            )
        if classification_payload is not None:
            artifacts["source/classification-results.json"] = (
                classification_payload
            )
        if analysis.business_insights_prompt is not None:
            artifacts["business-insights-prompt.md"] = (
                analysis.business_insights_prompt.encode("utf-8")
            )
            artifacts["business-evidence-catalog.jsonl"] = _jsonl_bytes(
                build_business_evidence_catalog(
                    analysis.analysis["posts"],
                    analysis.analysis["high_performance"],
                    analysis.analysis["low_performance"],
                )
            )
            artifacts["business-result-template.json"] = _json_bytes(
                build_business_result_template(
                    analysis.analysis["posts"],
                    analysis.analysis["high_performance"],
                    analysis.analysis["low_performance"],
                    reader.source_digest,
                    classification_results_sha256,
                )
            )
            business_context = build_business_context(
                analysis.analysis["posts"],
                analysis.analysis["high_performance"],
                analysis.analysis["low_performance"],
            )
            business_context.update({
                "account_name": profile.get("account_name"),
                "collection_commit_sha256": reader.source_digest,
                "classification_results_sha256": classification_results_sha256,
                "performance_meta": analysis.analysis["performance_meta"],
                "high_post_ids": [
                    item["post_id"]
                    for item in analysis.analysis["high_performance"]
                ] if isinstance(analysis.analysis["high_performance"], list) else [],
                "low_post_ids": [
                    item["post_id"]
                    for item in analysis.analysis["low_performance"]
                ] if isinstance(analysis.analysis["low_performance"], list) else [],
            })
            artifacts["business-context.json"] = _json_bytes(business_context)
        if business_insight_payload is not None:
            artifacts["source/business-insight-results.json"] = (
                business_insight_payload
            )
        if analysis.comment_insights_prompt is not None:
            artifacts["comment-insights-prompt.md"] = (
                analysis.comment_insights_prompt.encode("utf-8")
            )
        if comment_insight_payload is not None:
            artifacts["source/comment-insight-results.json"] = (
                comment_insight_payload
            )
        delivery_summary = _delivery_summary(
            analysis.analysis, task_status=task_status
        )
        artifacts["delivery-summary.json"] = _json_bytes(delivery_summary)
        artifacts["final-response.md"] = _final_response(delivery_summary).encode(
            "utf-8"
        )

        expected_artifacts = ANALYSIS_REQUIRED_ARTIFACTS | frozenset(
            relative
            for relative in ANALYSIS_OPTIONAL_ARTIFACTS
            if relative in artifacts
        )
        with execution_timer.phase("validation"):
            _phase(
                "VALIDATE",
                _validate_output_payloads,
                artifacts,
                expected_artifacts=expected_artifacts,
            )
        final_timing = execution_timer.snapshot()
        task.update(final_timing)
        artifacts["task.json"] = _json_bytes(task)
        artifacts["pipeline-report.md"] = _pipeline_report(
            task_status=task_status,
            partial_reasons=partial_reasons,
            phase_results=phase_results,
            source_digest=reader.source_digest,
            normalization=normalization,
            duration_ms=final_timing["duration_ms"],
        ).encode("utf-8")
        _phase(
            "VALIDATE_FINAL",
            _validate_output_payloads,
            artifacts,
            expected_artifacts=expected_artifacts,
        )
        reader.verify_unchanged()

        reservation = ImmutableWorkspace.reserve(
            output, allowed_artifacts=ANALYSIS_ARTIFACTS
        )
        try:
            for relative in sorted(artifacts):
                with reservation.open_binary(relative) as handle:
                    handle.write(artifacts[relative])
            reader.verify_unchanged()
            commit_sha256 = reservation.commit()
        finally:
            reservation.close()

    return PipelineResult(
        workspace=os.path.abspath(output),
        commit_sha256=commit_sha256,
        task_status=task_status,
        phase_results=phase_results,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="从已提交采集工作区创建独立、不可变的分析工作区"
    )
    parser.add_argument("--input", required=True, help="已提交的采集工作区")
    parser.add_argument("--output", help="不存在的分析输出目录")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="只验证模型结果，不渲染或创建分析工作区",
    )
    parser.add_argument(
        "--require-delivery-ready",
        action="store_true",
        help="拒绝缺失 taxonomy/business/comment 结果或严格分析合同未完成的 final",
    )
    parser.add_argument(
        "--evidence-only",
        action="store_true",
        help="从密封 collection 生成固定事实交付；允许 0 条作品且不运行策略分析",
    )
    parser.add_argument("--template", default=None, help="可选 HTML 模板")
    parser.add_argument(
        "--with-llm-tax",
        action="store_true",
        help="生成 taxonomy-prompt.md（不调用模型）",
    )
    parser.add_argument(
        "--classification-results",
        default=None,
        help="可选的完整语义分类 JSON；验证后原字节纳入分析工作区",
    )
    parser.add_argument(
        "--with-business-insights",
        action="store_true",
        help="要求第二阶段业务洞察；无结果时生成 business-insights-prompt.md",
    )
    parser.add_argument(
        "--business-insight-results",
        default=None,
        help="严格业务洞察 JSON；验证后原字节纳入分析工作区",
    )
    parser.add_argument(
        "--with-comment-insights",
        action="store_true",
        help="要求评论语义洞察；无结果时生成 comment-insights-prompt.md",
    )
    parser.add_argument(
        "--comment-insight-results",
        default=None,
        help="严格评论语义洞察 JSON；验证后原字节纳入分析工作区",
    )
    args = parser.parse_args(argv)
    try:
        if args.evidence_only:
            if args.validate_only:
                parser.error("--evidence-only cannot be combined with --validate-only")
            if args.output is None:
                parser.error("--output is required with --evidence-only")
            if any((
                args.with_llm_tax,
                args.classification_results,
                args.with_business_insights,
                args.business_insight_results,
                args.with_comment_insights,
                args.comment_insight_results,
                args.require_delivery_ready,
            )):
                parser.error("--evidence-only cannot be combined with model stages")
            result = run_evidence_delivery(args.input, args.output)
            print(
                f"evidence delivery committed: {result.workspace} "
                f"task_status={result.task_status}"
            )
            return 0
        if args.validate_only:
            if args.output is not None:
                parser.error("--validate-only cannot be combined with --output")
            validate_pipeline_inputs(
                args.input,
                classification_results_path=args.classification_results,
                with_taxonomy_prompt=args.with_llm_tax,
                business_insight_results_path=args.business_insight_results,
                comment_insight_results_path=args.comment_insight_results,
                require_business_insights=args.with_business_insights,
                require_comment_insights=args.with_comment_insights,
                require_taxonomy=args.require_delivery_ready,
            )
            print(
                "model results valid; no analysis workspace created; "
                "delivery readiness checked only with --require-delivery-ready"
            )
            return 0
        if args.output is None:
            parser.error("--output is required unless --validate-only is used")
        template = (
            Path(args.template).read_text(encoding="utf-8")
            if args.template
            else None
        )
        result = run_pipeline(
            args.input,
            args.output,
            template_text=template,
            with_taxonomy_prompt=args.with_llm_tax,
            classification_results_path=args.classification_results,
            with_business_insights=args.with_business_insights,
            business_insight_results_path=args.business_insight_results,
            with_comment_insights=args.with_comment_insights,
            comment_insight_results_path=args.comment_insight_results,
            require_delivery_ready=args.require_delivery_ready,
        )
    except WorkspaceCommitIndeterminate:
        print("[INDETERMINATE] analysis commit could not be confirmed", file=sys.stderr)
        return 4
    except (PipelineError, WorkspaceError, OSError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 2
    print(
        f"analysis workspace committed: {result.workspace} "
        f"task_status={result.task_status}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
