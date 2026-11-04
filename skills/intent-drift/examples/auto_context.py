#!/usr/bin/env python3
"""Example: auto-collecting context from the current repo."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path.home() / ".claude" / "skills" / "intent-drift"))

from analyzer import IntentDriftAnalyzer
from scripts.collect_context import ContextCollector


def main():
    analyzer = IntentDriftAnalyzer()

    # Auto-collect execution context from git + shell history
    collector = ContextCollector()
    ctx = collector.collect_all()

    # Build a plain context dict for the engine
    context = {
        "original_goal": {"text": "Add CSV export to the report generator"},
        "current_plan": {"text": "Wire up a JSON exporter and refactor the report module"},
        "execution_context": {
            "edited_files": ctx["edited_files"],
            "git_diff": ctx["git_diff"][:2000],
            "recent_commands": ctx["recent_commands"][-10:],
            "reasoning_summary": "Building export pipeline",
        },
    }

    report = analyzer.engine.evaluate(context)
    print(analyzer.export_report(report, "markdown"))


if __name__ == "__main__":
    main()
