#!/usr/bin/env python3
"""Intent drift analysis skill for Claude Code agents."""

import difflib
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from intent_alignment.engine import IntentAlignmentEngine
from intent_alignment.models import AlignmentContext, AlignmentReport

import history
from config import effective_config, load_config

USAGE = """intent-drift — analyze intent drift in AI-assisted development

Usage:
  analyzer.py --original-goal GOAL --current-plan PLAN [options]

Options:
  --original-goal GOAL   The user's stated objective (required, unless inferred).
  --current-plan PLAN    What is actually being built right now (required, unless inferred).
  --context TEXT         Execution evidence (edited files, git diff, recent commands).
                         Default: "auto".
  --auto-context         Collect execution context automatically via
                         scripts/collect_context.py. Overrides --context.
                         Repo-only signals (git diff, commits, edited files,
                         file changes); shell history is NOT read.
  --include-shell-history
                         With --auto-context, also read recent shell commands
                         from ~/.bash_history / ~/.zsh_history / ~/.history.
                         Opt-in: shell history may contain credentials or
                         commands unrelated to this repo.
  --format FORMAT        Output format: text | markdown | json. Default: text.
  --threshold N          Minimum alignment % considered "on track" (0-100).
                         Default: 75.
  --history              Print the persisted score timeline and exit.
  --compare N            After the report, compare this run with the one N
                         runs ago (trend + drift acceleration). Default: off.
  -h, --help             Show this help screen and exit.
  -V, --version          Show the installed version and exit.

Examples:
  analyzer.py --original-goal "Reduce memory usage" --current-plan "Improve startup"
  analyzer.py --original-goal "Add feature" --current-plan "Change architecture" \\
    --auto-context --format json --threshold 80
"""


def _package_version() -> str:
    """Read the installed version from metadata.json (single source of truth)."""
    meta_path = Path(__file__).resolve().parent / "metadata.json"
    try:
        version = json.loads(meta_path.read_text()).get("version")
    except (OSError, ValueError):
        version = None
    return str(version) if isinstance(version, str) else "unknown"


class IntentDriftAnalyzer:
    """Core analyzer for intent drift detection."""

    def __init__(self) -> None:
        """Initialize the analyzer with the Intent Alignment Engine."""
        self.engine = IntentAlignmentEngine()

    _FORMATS = ("text", "markdown", "json")
    _KNOWN_OPTIONS = (
        "--original-goal",
        "--current-plan",
        "--context",
        "--format",
        "--threshold",
        "--compare",
        "--auto-context",
        "--history",
        "--include-shell-history",
        "-h",
        "--help",
        "-V",
        "--version",
    )

    @classmethod
    def _suggest_option(cls, token: str) -> str:
        """Find the closest known option for *token*, returning a suggestion string if found."""
        matches = difflib.get_close_matches(token, cls._KNOWN_OPTIONS, n=1, cutoff=0.6)
        if not matches and not token.startswith("-"):
            matches = difflib.get_close_matches(f"--{token}", cls._KNOWN_OPTIONS, n=1, cutoff=0.6)
        if matches:
            return f" (did you mean {matches[0]}?)"
        return ""

    def parse_arguments(
        self, args: list[str], defaults: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Parse command line arguments into a configuration dictionary.

        ``defaults`` supplies the starting values (normally the merged
        ``config/defaults.yaml`` + ``config/user.yaml``), so CLI flags only
        override configured values instead of hardcoded ones.

        Raises ``ValueError`` with a clear message when a value-taking flag is
        missing its value, an unknown flag or unexpected positional argument is passed, or ``--format`` /
        ``--threshold`` receive an invalid value.
        """
        config = {
            "original_goal": "",
            "current_plan": "",
            "execution_context": "auto",
            "auto_context": False,
            "include_shell_history": False,
            "format": "text",
            "threshold": 75,
            "history": False,
            "compare": None,
        }
        if defaults:
            # `defaults` is effective_config(load_config()), so this is also the
            # only point where a config-file key reaches the analyzer: any flat
            # key added there (e.g. `history_path`, read back by `analyze()` and
            # the `--history` branch in main()) is honored purely because it is
            # merged here. Keep that dependency in mind when adding config keys.
            config.update(defaults)

        i = 0
        while i < len(args):
            arg = args[i]
            if arg in ("-h", "--help"):
                print(USAGE, end="")
                sys.exit(0)
            elif arg in ("-V", "--version"):
                print(f"intent-drift {_package_version()}")
                sys.exit(0)
            elif arg in (
                "--original-goal",
                "--current-plan",
                "--context",
                "--format",
                "--threshold",
                "--compare",
            ):
                value = self._next_value(args, i, arg)
                if arg == "--original-goal":
                    config["original_goal"] = value.strip("\"'")
                elif arg == "--current-plan":
                    config["current_plan"] = value.strip("\"'")
                elif arg == "--context":
                    config["execution_context"] = value.strip("\"'")
                elif arg == "--format":
                    fmt = value.strip("\"'").lower()
                    if fmt not in self._FORMATS:
                        raise ValueError(
                            f"Invalid value for --format: {value!r} "
                            f"(expected one of {', '.join(self._FORMATS)})"
                        )
                    config["format"] = fmt
                elif arg == "--compare":
                    try:
                        compare = int(value)
                    except ValueError:
                        raise ValueError(
                            f"Invalid value for --compare: {value!r} (expected an integer)"
                        ) from None
                    if compare < 1:
                        raise ValueError("--compare expects a positive integer (1 or more)")
                    config["compare"] = compare
                else:
                    try:
                        config["threshold"] = int(value)
                    except ValueError:
                        raise ValueError(
                            f"Invalid value for --threshold: {value!r} (expected an integer)"
                        ) from None
                i += 2
            elif arg == "--auto-context":
                config["auto_context"] = True
                i += 1
            elif arg == "--history":
                config["history"] = True
                i += 1
            elif arg == "--include-shell-history":
                config["include_shell_history"] = True
                i += 1
            elif arg.startswith("-"):
                raise ValueError(f"Unknown option: {arg}{self._suggest_option(arg)}")
            else:
                raise ValueError(
                    f"Unexpected positional argument: {arg}{self._suggest_option(arg)}"
                )

        return config

    @staticmethod
    def _next_value(args: list[str], index: int, flag: str) -> str:
        """Return the value following *flag* at *index*, or raise a clear error."""
        if index + 1 >= len(args):
            raise ValueError(f"Missing value for {flag}")
        return args[index + 1]

    def analyze(self, config: dict[str, Any]) -> AlignmentReport:
        """Perform intent drift analysis based on configuration."""
        # Prepare execution context
        execution_context = config["execution_context"]

        if config["auto_context"]:
            # Collect auto context from git and file system. Repo-only by
            # default; shell history is only read on explicit opt-in (#13).
            lookback_hours = (config.get("context_collection") or {}).get("lookback_hours", 24.0)
            execution_context = self._collect_auto_context(
                include_shell_history=config["include_shell_history"],
                lookback_hours=lookback_hours,
            )

        # Providers consume execution_context as a structured dict; a plain
        # --context string is wrapped in the historical {"text": ...} shape.
        execution_context_value = (
            {"text": execution_context} if isinstance(execution_context, str) else execution_context
        )

        # Create alignment context. The engine's providers read goal text from
        # "text"/"goal" and plan text from "summary"/"plan", so the CLI's plain
        # {"text": ...} values are mirrored under the canonical keys (plus the
        # "steps" list the skill-local providers expect).
        context = AlignmentContext(
            original_goal={
                "text": config["original_goal"],
                "goal": config["original_goal"],
                "summary": config["original_goal"],
            },
            current_plan={
                "text": config["current_plan"],
                "plan": config["current_plan"],
                "summary": config["current_plan"],
                "steps": [config["current_plan"]],
            },
            execution_context=execution_context_value,
        )

        # Evaluate alignment
        report = self.engine.evaluate(context)

        # Seed the report's timeline from the persisted history, then record
        # this run so the next analysis shows the full trend (see #20).
        history_path = Path(config.get("history_path") or history.default_history_path())
        points = history.load_history(history_path)
        points.append(history.current_point(report))
        report.timeline = list(points)
        history.save_history(history_path, points)

        # Check threshold. The warning goes to stderr so stdout carries the
        # report alone -- a `--format json` run must stay parseable by jq,
        # json.load and friends.
        if report.overall_alignment < config["threshold"]:
            print(
                f"Warning: Alignment score {report.overall_alignment}% is below threshold {config['threshold']}%",
                file=sys.stderr,
            )

        return report

    def _collect_auto_context(
        self, include_shell_history: bool = False, lookback_hours: float = 24.0
    ) -> dict[str, Any]:
        """Collect execution context from the repo (and optionally shell history).

        Returns the structured dict the providers consume (git_diff,
        recent_commits, edited_files, recent_commands, file_changes,
        metadata), with secret-like content scrubbed by default. Shell history
        is only read when *include_shell_history* is set (#13).
        """
        from scripts.collect_context import ContextCollector

        return ContextCollector(
            include_shell_history=include_shell_history, lookback_hours=lookback_hours
        ).collect_all()

    @staticmethod
    def _score_of(item: Any) -> tuple[float, float]:
        """Return (score, weight) from a breakdown entry, dict or dataclass."""
        if hasattr(item, "score"):
            return item.score, getattr(item, "weight", 0.0)
        return item.get("score", 0.0), item.get("weight", 0.0)

    def export_report(
        self,
        report: AlignmentReport,
        format: str,
        include_metadata: bool = True,
    ) -> str:
        """Export the analysis report in the specified format."""
        if format == "json":
            return self._export_json(report, include_metadata=include_metadata)
        elif format == "markdown":
            return self._export_markdown(report, include_metadata=include_metadata)
        else:
            return self._export_text(report, include_metadata=include_metadata)

    def _export_text(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as formatted text."""
        output = []
        output.append("Intent Alignment Report")
        output.append("=" * 50)
        output.append(f"Overall Alignment: {report.overall_alignment}%")
        output.append(f"Status: {report.status}")
        output.append(f"Confidence: {report.confidence}%")
        output.append("")
        output.append("Summary:")
        output.append(report.summary)
        output.append("")
        output.append("Evidence:")
        for i, evidence in enumerate(report.evidence, 1):
            marker = "✅" if evidence.value > 0.7 else "⚠" if evidence.value > 0.4 else "❌"
            output.append(f"  {i}. [{evidence.source}] {marker} {evidence.details}")
        output.append("")
        output.append(f"Risk: {report.risk}")
        output.append(f"Recommendation: {report.recommendation}")
        output.append("")
        output.append("Component Scores:")
        for name, score in report.breakdown.items():
            sc, _ = self._score_of(score)
            output.append(f"  {name}: {sc:.1f}%")

        if include_metadata:
            output.append(f"Report generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        return "\n".join(output)

    def _export_markdown(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as Markdown."""
        md = []
        md.append("# Intent Alignment Report")
        md.append("")
        md.append("## Summary")
        md.append(f"- **Overall Alignment**: {report.overall_alignment}%")
        md.append(f"- **Status**: {report.status}")
        md.append(f"- **Confidence**: {report.confidence}%")
        md.append(f"- **Risk**: {report.risk}")
        md.append("")
        md.append("## Analysis")
        md.append(f"{report.summary}")
        md.append("")
        md.append("## Evidence")
        for i, evidence in enumerate(report.evidence, 1):
            marker = "✅" if evidence.value > 0.7 else "⚠" if evidence.value > 0.4 else "❌"
            md.append(
                f"{i}. **{evidence.source}** {marker} {evidence.details} (confidence: {evidence.confidence * 100:.1f}%)"
            )
        md.append("")
        md.append("## Recommendation")
        md.append(report.recommendation)
        md.append("")
        md.append("## Component Breakdown")
        md.append("| Component | Score |")
        md.append("|-----------|-------|")
        for name, score in report.breakdown.items():
            sc, _ = self._score_of(score)
            md.append(f"| {name} | {sc:.1f}% |")

        if include_metadata:
            md.append(f"*Report generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

        return "\n".join(md)

    def _export_json(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as JSON via the JSONExporter."""
        from exporters import JSONExporter

        return JSONExporter().export(report, include_metadata=include_metadata)


def main() -> None:
    """Main entry point for the skill."""
    parser = IntentDriftAnalyzer()

    # Load config/defaults.yaml + config/user.yaml; CLI flags override below.
    try:
        base = effective_config(load_config())
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(2)

    # Parse command line arguments
    try:
        config = parser.parse_arguments(sys.argv[1:], defaults=base)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(2)

    # --history only reads the persisted timeline; no analysis is needed.
    if config["history"]:
        history_path = Path(config.get("history_path") or history.default_history_path())
        print(history.format_history(history.load_history(history_path)))
        sys.exit(0)

    # Check for required arguments
    if not config["original_goal"]:
        print("Error: --original-goal argument is required")
        print("\nUsage examples:")
        print(
            '  /intent-drift --original-goal "Reduce memory usage" --current-plan "Improve startup"'
        )
        print(
            '  /intent-drift --original-goal "Add feature" --current-plan "Change architecture" --auto-context'
        )
        sys.exit(1)

    if not config["current_plan"]:
        print("Error: --current-plan argument is required")
        sys.exit(1)

    # Perform analysis
    try:
        report = parser.analyze(config)

        export = config.get("export") or {}
        include_metadata = bool(export.get("include_metadata", True))

        # Export result
        output = parser.export_report(report, config["format"], include_metadata=include_metadata)
        export_file = export.get("file")
        if export_file:
            out_path = Path(export_file)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(output + "\n", encoding="utf-8")
        else:
            print(output)

        # --compare highlights the score trend against a previous run.
        if config["compare"]:
            print()
            print(history.format_compare(report.timeline, config["compare"]))

        # Exit with error code if low alignment
        if report.overall_alignment < config["threshold"]:
            sys.exit(1)

    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
