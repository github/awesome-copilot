#!/usr/bin/env python3
"""Example: auto-collecting context from the current repo."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from analyzer import IntentDriftAnalyzer


def main():
    analyzer = IntentDriftAnalyzer()

    # Parse through the supported path: ``--auto-context`` makes analyze()
    # collect the repository evidence and wrap goal/plan under the canonical
    # keys the engine expects.
    config = analyzer.parse_arguments(
        [
            "--original-goal",
            "Add CSV export to the report generator",
            "--current-plan",
            "Wire up a JSON exporter and refactor the report module",
            "--auto-context",
        ]
    )

    report = analyzer.analyze(config)
    print(analyzer.export_report(report, config["format"]))


if __name__ == "__main__":
    main()
