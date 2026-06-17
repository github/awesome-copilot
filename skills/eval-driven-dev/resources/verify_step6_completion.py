#!/usr/bin/env python3
"""Validate that eval-driven-dev Step 6 artifacts are complete.

Usage:
    python verify_step6_completion.py /path/to/pixie_qa/results/<test_id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ENTRY_REQUIRED_FILES = ("evaluations.jsonl",)
DATASET_ANALYSIS_FILES = ("analysis.md", "analysis-summary.md")
ROOT_ANALYSIS_FILES = ("action-plan.md", "action-plan-summary.md", "meta.json")


def _dataset_dirs(results_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in results_dir.iterdir()
        if path.is_dir() and path.name.startswith("dataset-")
    )


def _entry_dirs(dataset_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in dataset_dir.iterdir()
        if path.is_dir() and path.name.startswith("entry-")
    )


def _read_jsonl(path: Path, errors: list[str]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    try:
        for index, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if not line.strip():
                continue
            obj = json.loads(line)
            if not isinstance(obj, dict):
                errors.append(f"{path}: line {index} is not a JSON object")
                continue
            rows.append(obj)
    except OSError as exc:
        errors.append(f"{path}: could not read file ({exc})")
    except json.JSONDecodeError as exc:
        errors.append(f"{path}: invalid JSONL ({exc})")
    return rows


def validate_results_dir(results_dir: Path) -> list[str]:
    """Return a list of validation errors for a pixie results directory."""
    errors: list[str] = []

    if not results_dir.is_dir():
        return [f"{results_dir}: results directory not found"]

    for file_name in ROOT_ANALYSIS_FILES:
        if not (results_dir / file_name).is_file():
            errors.append(f"Missing root artifact: {results_dir / file_name}")

    datasets = _dataset_dirs(results_dir)
    if not datasets:
        errors.append(f"{results_dir}: no dataset-* directories found")
        return errors

    for dataset_dir in datasets:
        for file_name in DATASET_ANALYSIS_FILES:
            if not (dataset_dir / file_name).is_file():
                errors.append(f"Missing dataset artifact: {dataset_dir / file_name}")

        entry_dirs = _entry_dirs(dataset_dir)
        if not entry_dirs:
            errors.append(f"{dataset_dir}: no entry-* directories found")
            continue

        for entry_dir in entry_dirs:
            for file_name in ENTRY_REQUIRED_FILES:
                if not (entry_dir / file_name).is_file():
                    errors.append(f"Missing entry artifact: {entry_dir / file_name}")

            evaluations_path = entry_dir / "evaluations.jsonl"
            if not evaluations_path.is_file():
                continue

            evaluations = _read_jsonl(evaluations_path, errors)
            for row in evaluations:
                status = row.get("status")
                if status == "pending":
                    errors.append(
                        "Pending evaluation remains: "
                        f"{evaluations_path} ({row.get('evaluator', 'unknown evaluator')})"
                    )
                    continue

                if "score" not in row:
                    errors.append(
                        "Missing score in scored evaluation: "
                        f"{evaluations_path} ({row.get('evaluator', 'unknown evaluator')})"
                    )
                if "reasoning" not in row:
                    errors.append(
                        "Missing reasoning in scored evaluation: "
                        f"{evaluations_path} ({row.get('evaluator', 'unknown evaluator')})"
                    )

    return errors


def main(argv: list[str] | None = None) -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate Step 6 completion for a pixie results directory"
    )
    parser.add_argument(
        "results_dir",
        type=Path,
        help="Path to pixie_qa/results/<test_id>",
    )
    args = parser.parse_args(argv)

    errors = validate_results_dir(args.results_dir)
    if errors:
        print("Step 6 completion check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Step 6 completion check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
