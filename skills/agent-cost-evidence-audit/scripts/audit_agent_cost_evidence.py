#!/usr/bin/env python3
"""Audit normalized agent cost evidence using standard-library-only rules."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def finding(code: str, path: str, message: str) -> dict[str, str]:
    return {"code": code, "path": path, "message": message}


def audit(data: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    provider = data.get("provider") or {}
    cost = data.get("cost") or {}

    if provider.get("source") == "llm.system":
        findings.append(finding("PROVIDER_FROM_LLM_SYSTEM", "provider.source", "llm.system is not hosting-provider evidence"))

    raw_provider = provider.get("raw")
    explicit_provider = provider.get("explicit")
    if raw_provider and explicit_provider and raw_provider != explicit_provider:
        findings.append(finding("PROVIDER_CONFLICT", "provider", "raw and explicit provider evidence disagree"))

    valid_provider_evidence = bool(raw_provider or explicit_provider)
    if cost.get("status") == "PRICED" and not valid_provider_evidence:
        findings.append(finding("MISSING_PROVIDER", "provider", "priced cost lacks explicit hosting-provider evidence"))

    usage = data.get("usage") or {}
    priced_components = set(usage.get("priced_components") or [])
    if usage.get("input_includes_cache_read") is True and usage.get("cache_read_tokens") is not None:
        if "input" in priced_components and "cache_read" in priced_components:
            findings.append(finding("CACHE_DOUBLE_COUNT", "usage.priced_components", "inclusive input and cache-read subset are both priced"))

    for index, call in enumerate(data.get("model_calls") or []):
        if call.get("provenance") == "fabricated_from_aggregate":
            findings.append(finding("AGGREGATE_AS_MODEL_CALLS", f"model_calls[{index}].provenance", "aggregate data cannot establish a model-call boundary"))

    outcome = data.get("task_outcome") or {}
    if outcome.get("success") is True and outcome.get("evidence_type") == "span_status":
        findings.append(finding("SPAN_OK_AS_TASK_SUCCESS", "task_outcome.evidence_type", "span status does not prove task acceptance"))

    for index, attempt in enumerate(data.get("attempts") or []):
        if attempt.get("retry") is True and not attempt.get("retry_evidence"):
            findings.append(finding("RETRY_WITHOUT_EVIDENCE", f"attempts[{index}].retry_evidence", "retry label needs an explicit boundary or reason"))
        if attempt.get("fallback") is True and not attempt.get("fallback_evidence"):
            findings.append(finding("FALLBACK_WITHOUT_EVIDENCE", f"attempts[{index}].fallback_evidence", "fallback label needs explicit evidence"))

    if cost.get("status") == "UNPRICED" and cost.get("estimated_cost_usd") == 0:
        findings.append(finding("UNPRICED_AS_ZERO", "cost.estimated_cost_usd", "unpriced usage cannot be represented as zero cost"))

    if cost.get("billed_cost_usd") is not None and cost.get("source") in {
        "current-price-replay", "rate-card-replay", "synthetic-rate-card-replay"
    }:
        findings.append(finding("ESTIMATE_AS_BILLED_COST", "cost.billed_cost_usd", "rate-card replay is estimated, not billed, cost"))

    return findings


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot read JSON from {path}: {exc}") from exc


def run_self_test(fixture_path: Path) -> int:
    fixture = read_json(fixture_path)
    failures = []
    for case in fixture.get("cases", []):
        actual = sorted(item["code"] for item in audit(case["input_data"]))
        expected = sorted(case["expected_codes"])
        if actual != expected:
            failures.append({"id": case.get("id"), "expected": expected, "actual": actual})
    result = {"cases": len(fixture.get("cases", [])), "passed": len(fixture.get("cases", [])) - len(failures), "failures": failures}
    print(json.dumps(result, indent=2))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="normalized audit-input JSON")
    parser.add_argument("--self-test", action="store_true", help="run bundled synthetic regression cases")
    args = parser.parse_args()
    if args.self_test == bool(args.input):
        parser.error("choose exactly one of --input or --self-test")
    try:
        if args.self_test:
            fixture = Path(__file__).resolve().parent.parent / "fixtures" / "synthetic-audit-cases.json"
            return run_self_test(fixture)
        data = read_json(args.input)
        findings = audit(data)
        print(json.dumps({"finding_count": len(findings), "findings": findings}, indent=2))
        return 1 if findings else 0
    except (KeyError, TypeError, ValueError) as exc:
        print(f"validation error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
