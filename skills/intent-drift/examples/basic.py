#!/usr/bin/env python3
"""Basic usage example for the intent-drift skill."""

import sys
from pathlib import Path

# Make the skill importable
sys.path.insert(0, str(Path.home() / ".claude" / "skills" / "intent-drift"))

from analyzer import IntentDriftAnalyzer


def main():
    analyzer = IntentDriftAnalyzer()

    # Example: a memory-optimization task that has drifted toward startup latency
    config = analyzer.parse_arguments(
        [
            "--original-goal",
            "Reduce the application's memory usage at runtime.",
            "--current-plan",
            "Optimize startup initialization for faster application load.",
            "--context",
            "Edited: main.py, startup.py, initialization.py. "
            "Recent: pip install numpy, python -m cProfile main.py, python -m pytest startup. "
            "Reasoning: Focusing on startup performance rather than memory optimization.",
            "--format",
            "text",
        ]
    )

    report = analyzer.analyze(config)
    print(analyzer.export_report(report, config["format"]))


if __name__ == "__main__":
    main()
