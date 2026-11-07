#!/usr/bin/env python3
"""Intent drift analysis skill for Claude Code agents."""

import difflib
import json
import sys
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


class _ConfiguredProvider:
    """Wrap an engine provider to override its read-only ``weight`` property.

    ``intent_alignment`` providers expose ``weight`` as an abstract property,
    so configured weights cannot be assigned directly. Delegating ``name`` and
    ``collect`` keeps scoring and registration unchanged.
    """

    def __init__(self, provider: Any, weight: float) -> None:
        self._provider = provider
        self._weight = weight

    @property
    def name(self) -> str:
        return self._provider.name

    @property
    def weight(self) -> float:
        return self._weight

    def set_weight(self, weight: float) -> None:
        self._weight = weight

    def collect(self, context: dict[str, Any]) -> list[Any]:
        return self._provider.collect(context)


class _ScaledProvider(_ConfiguredProvider):
    """Adapt a skill-local provider to the engine's 0-1 evidence scale.

    The bundled providers emit values on the documented 0-100 scale, while
    ``intent_alignment.scoring`` aggregates on 0-1. Rescaling in the adapter
    lets the bundled implementations be the single scoring source of truth
    without changing their public contract.
    """

    def __init__(self, provider: Any, weight: float) -> None:
        super().__init__(provider, weight)

    def collect(self, context: dict[str, Any]) -> list[Any]:
        evidence = self._provider.collect(context)
        for item in evidence:
            value = getattr(item, "value", None)
            if isinstance(value, (int, float)):
                item.value = value / 100.0
        return evidence


class IntentDriftAnalyzer:
    """Core analyzer for intent drift detection."""

    def __init__(self, repo_path: Path | None = None) -> None:
        """Initialize the analyzer with the Intent Alignment Engine.

        Args:
            repo_path: Override repo directory (defaults to ``Path.cwd()``).
        """
        self.engine = IntentAlignmentEngine()
        self.repo_path = Path(repo_path or Path.cwd())

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
                        threshold = int(value)
                    except ValueError:
                        raise ValueError(
                            f"Invalid value for --threshold: {value!r} (expected an integer)"
                        ) from None
                    if not 0 <= threshold <= 100:
                        raise ValueError(
                            f"--threshold must be between 0 and 100, got {threshold}"
                        )
                    config["threshold"] = threshold
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
        # Reject if the next token is another recognized option
        next_token = args[index + 1]
        # Check if next_token is any of the recognized option names (including dashes)
        if next_token in IntentDriftAnalyzer._KNOWN_OPTIONS:
            raise ValueError(f"Option {flag} requires a value, but {next_token} appears to be another option")
        return args[index + 1]

    def analyze(self, config: dict[str, Any]) -> AlignmentReport:
        """Perform intent drift analysis based on configuration."""
        # Prepare execution context
        execution_context = config["execution_context"]

        if config["auto_context"]:
            # Collect auto context from git and file system. Repo-only by
            # default; shell history is only read on explicit opt-in (#13).
            collection = config.get("context_collection") or {}
            execution_context = self._collect_auto_context(
                include_shell_history=config["include_shell_history"],
                lookback_hours=collection.get("lookback_hours", 24.0),
                methods=collection.get("methods"),
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

        # Preserve original providers so partial configuration can be reset.
        if not hasattr(self.engine, "_default_providers"):
            self.engine._default_providers = list(self.engine.providers)
        # Apply analysis.providers.enabled / analysis.weights before evaluating.
        self._configure_engine(config)

        # Evaluate alignment
        report = self.engine.evaluate(context)

        # Seed the report's timeline from the persisted history, then record
        # this run so the next analysis shows the full trend (see #20).
        # History is scoped by repository path + goal so that comparisons only
        # span runs for the same task — runs from unrelated repos/goals never
        # mix in `--compare N`.
        history_path = Path(config.get("history_path") or history.default_history_path())
        scope = history.scope_for(repo_path=self.repo_path, goal=config["original_goal"])
        points = history.append_history(history_path, history.current_point(report), scope)
        report.timeline = list(points)

        # Check threshold. The warning goes to stderr so stdout carries the
        # report alone -- a `--format json` run must stay parseable by jq,
        # json.load and friends.
        if report.overall_alignment < config["threshold"]:
            print(
                f"Warning: Alignment score {report.overall_alignment}% is below threshold {config['threshold']}%",
                file=sys.stderr,
            )

        # ``analysis.confidence_threshold`` flags assessments whose confidence
        # is too low to act on. Report it to stderr so JSON output stays clean.
        confidence_threshold = (config.get("analysis") or {}).get("confidence_threshold")
        if isinstance(confidence_threshold, (int, float)) and report.confidence < confidence_threshold:
            print(
                f"Warning: Confidence {report.confidence:.1f}% is below the configured "
                f"confidence threshold {confidence_threshold}%; treat this assessment as provisional",
                file=sys.stderr,
            )

        return report

    def _configure_engine(self, config: dict[str, Any]) -> None:
        """Apply configured provider selection and weights to the engine.

        ``analysis.providers.enabled`` filters the registered providers and
        ``analysis.weights`` overrides each provider's weight. Both live in
        ``config/user.yaml`` and were previously loaded but never applied.
        """
        analysis = config.get("analysis") or {}

        # Start from the engine's default provider registry (preserved from
        # first initialization), plus any custom providers that were added
        # after defaults were saved. This guarantees each run builds its
        # selection from an unchanged registry instead of mutating the
        # engine's live provider list.
        engine_defaults = getattr(self.engine, "_default_providers", None)
        defaults = list(engine_defaults) if engine_defaults is not None else list(self.engine.providers)

        # The skill ships its own implementation of every provider so fixes are
        # made here. Use those in place of the dependency's same-named defaults
        # (never alongside them: duplicate sources would double-count evidence).
        from providers import (
            ArchitectureProvider,
            ConstraintProvider,
            DependencyProvider,
            ExecutionProvider,
            FileGraphProvider,
            GoalProvider,
            ProblematicFindingsProvider,
            RequirementCoverageProvider,
            ScopeProvider,
        )

        bundled = {
            provider.name: provider
            for provider in (
                GoalProvider(),
                ConstraintProvider(),
                ScopeProvider(),
                ExecutionProvider(),
                FileGraphProvider(),
                DependencyProvider(),
                ArchitectureProvider(),
                RequirementCoverageProvider(),
                ProblematicFindingsProvider(),
            )
        }
        bundled_names = set(bundled)
        providers = [bundled.pop(getattr(p, "name", ""), p) for p in defaults]
        # Any bundled provider the engine did not register (e.g. a future engine
        # version) is still available to the skill.
        providers.extend(bundled.values())

        # Apply enabled filter if specified
        enabled = analysis.get("providers", {}).get("enabled")
        if enabled is not None and isinstance(enabled, list):
            allowed_names = {str(name) for name in enabled}
            providers = [p for p in providers if getattr(p, "name", "") in allowed_names]

        # Apply weights. Each run rebuilds from the unchanged default registry,
        # so a later call that omits a weight never inherits an earlier override.
        weights = analysis.get("weights") or {}
        configured = []
        for provider in providers:
            name = getattr(provider, "name", "")
            default_weight = provider.weight
            weight = default_weight
            if isinstance(weights, dict) and name in weights:
                try:
                    weight = float(weights[name])
                except (TypeError, ValueError):
                    weight = default_weight
            wrapper = _ScaledProvider if name in bundled_names else _ConfiguredProvider
            configured.append(wrapper(provider, weight))
        self.engine.providers = configured

    def _collect_auto_context(
        self,
        include_shell_history: bool = False,
        lookback_hours: float = 24.0,
        methods: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Collect execution context from the repo (and optionally shell history).

        Returns the structured dict the providers consume (git_diff,
        recent_commits, edited_files, recent_commands, file_changes,
        metadata), with secret-like content scrubbed by default. *methods*
        mirrors ``context_collection.methods`` so users can disable individual
        sources; shell history additionally requires *include_shell_history*
        (privacy opt-in, #13).
        """
        from scripts.collect_context import ContextCollector

        return ContextCollector(
            include_shell_history=include_shell_history,
            lookback_hours=lookback_hours,
            methods=methods,
        ).collect_all()

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
        elif format == "text":
            return self._export_text(report, include_metadata=include_metadata)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def _export_text(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as formatted text via the bundled ``TextExporter``."""
        from exporters import TextExporter

        return TextExporter().export(report, include_metadata=include_metadata)

    def _export_markdown(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as Markdown via the bundled ``MarkdownExporter``."""
        from exporters import MarkdownExporter

        return MarkdownExporter().export(report, include_metadata=include_metadata)

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
        print("Error: --original-goal argument is required", file=sys.stderr)
        print("\nUsage examples:", file=sys.stderr)
        print('  /intent-drift --original-goal "Reduce memory usage" --current-plan "Improve startup"', file=sys.stderr)
        print('  /intent-drift --original-goal "Add feature" --current-plan "Change architecture" --auto-context', file=sys.stderr)
        sys.exit(2)

    if not config["current_plan"]:
        print("Error: --current-plan argument is required", file=sys.stderr)
        sys.exit(2)

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

        # --compare highlights the score trend against a previous run. In JSON
        if config["compare"]:
            trend = history.format_compare(report.timeline, config["compare"])
            if config["format"] == "json":
                print(trend, file=sys.stderr)
            else:
                print()
                print(trend)
        # Exit with error code if low alignment (this is the drift signal)
        if report.overall_alignment < config["threshold"]:
            sys.exit(1)

    except Exception as e:
        # Diagnostics go to stderr and use exit 2 so hooks can distinguish a
        # failed run from the documented below-threshold drift signal (exit 1).
        print(f"Error during analysis: {str(e)}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
