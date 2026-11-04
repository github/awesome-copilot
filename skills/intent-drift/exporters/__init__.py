"""Report exporters for different output formats."""

import json
from datetime import datetime

from intent_alignment.models import AlignmentReport


class BaseExporter:
    """Base class for report exporters."""

    def export(self, report: AlignmentReport) -> str:
        """Export the report to a string representation.

        Args:
            report: The alignment report to export

        Returns:
            String representation of the report
        """
        raise NotImplementedError


class TextExporter(BaseExporter):
    """Exports reports as formatted text."""

    def export(self, report: AlignmentReport) -> str:
        """Export report as formatted text."""
        lines = []
        lines.append("Intent Alignment Report")
        lines.append("=" * 50)
        lines.append(f"Overall Alignment: {report.overall_alignment:.1f}%")
        lines.append(f"Status: {report.status}")
        lines.append(f"Confidence: {report.confidence:.1f}%")
        lines.append("")
        lines.append("Summary:")
        lines.append(report.summary)
        lines.append("")
        lines.append("Evidence:")
        for i, evidence in enumerate(report.evidence, 1):
            marker = "✅" if evidence.value > 70 else "⚠" if evidence.value > 40 else "❌"
            lines.append(
                f"  {i}. [{evidence.source}] {marker} {evidence.details} "
                f"(confidence: {evidence.confidence:.1%})"
            )
        lines.append("")
        lines.append(f"Risk: {report.risk}")
        lines.append(f"Recommendation: {report.recommendation}")
        lines.append("")
        lines.append("Timeline (trend):")
        if report.timeline:
            for i, point in enumerate(report.timeline, 1):
                timestamp = datetime.fromtimestamp(point.get("timestamp", 0)).strftime(
                    "%Y-%m-%d %H:%M"
                )
                lines.append(
                    f"  {i}. [{timestamp}] {point.get('score', 0):.1f}% - {point.get('note', '')}"
                )
        else:
            lines.append("  No historical data available")
        lines.append("")
        lines.append("Component Breakdown:")
        for component, data in report.breakdown.items():
            lines.append(
                f"  {component}: {data.get('score', 0):.1f}% (weight: {data.get('weight', 0):.2f})"
            )

        return "\n".join(lines)


class MarkdownExporter(BaseExporter):
    """Exports reports as Markdown."""

    def export(self, report: AlignmentReport) -> str:
        """Export report as Markdown."""
        lines = []
        lines.append("# Intent Alignment Report")
        lines.append("")
        lines.append("## Summary")
        lines.append(f"- **Overall Alignment**: {report.overall_alignment:.1f}%")
        lines.append(f"- **Status**: {report.status}")
        lines.append(f"- **Confidence**: {report.confidence:.1f}%")
        lines.append(f"- **Risk**: {report.risk}")
        lines.append("")
        lines.append("## Analysis")
        lines.append(report.summary)
        lines.append("")
        lines.append("## Evidence")
        for i, evidence in enumerate(report.evidence, 1):
            status_icon = "✅" if evidence.value > 70 else "⚠" if evidence.value > 40 else "❌"
            lines.append(
                f"{i}. **{evidence.source}** {status_icon} {evidence.details} "
                f"*({evidence.confidence:.1%} confidence)*"
            )
        lines.append("")
        lines.append("## Recommendation")
        lines.append(report.recommendation)
        lines.append("")
        lines.append("## Component Breakdown")
        lines.append("")
        lines.append("| Component | Score | Weight |")
        lines.append("|-----------|-------|--------|")
        for component, data in report.breakdown.items():
            if hasattr(data, "score"):
                sc, wt = getattr(data, "score", 0.0), getattr(data, "weight", 0.0)
            else:
                sc, wt = data.get("score", 0.0), data.get("weight", 0.0)
            lines.append(f"| {component} | {sc:.1f}% | {wt:.2f} |")
        lines.append("")
        lines.append("## Timeline")
        if report.timeline:
            lines.append("| Time | Score | Note |")
            lines.append("|------|-------|------|")
            for point in report.timeline:
                timestamp = datetime.fromtimestamp(point.get("timestamp", 0)).strftime(
                    "%Y-%m-%d %H:%M"
                )
                lines.append(
                    f"| {timestamp} | {point.get('score', 0):.1f}% | {point.get('note', '')} |"
                )
        else:
            lines.append("*No historical data available*")
        lines.append("")
        lines.append(f"*Report generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

        return "\n".join(lines)


class JSONExporter(BaseExporter):
    """Exports reports as JSON."""

    def export(self, report: AlignmentReport, include_metadata: bool = True) -> str:
        """Export report as JSON.

        Args:
            report: The alignment report to export
            include_metadata: When False, omit the ``generated_at`` timestamp
                (used to honor ``export.include_metadata: false``)
        """
        # Convert to dict for JSON serialization
        report_dict = {
            "overall_alignment": report.overall_alignment,
            "status": report.status,
            "confidence": report.confidence,
            "summary": report.summary,
            "evidence": [
                {
                    "source": e.source,
                    "value": e.value,
                    "confidence": e.confidence,
                    "details": e.details,
                }
                for e in report.evidence
            ],
            "risk": report.risk,
            "recommendation": report.recommendation,
            "breakdown": {
                name: (vars(comp) if hasattr(comp, "__dict__") else dict(comp))
                for name, comp in report.breakdown.items()
            },
            "timeline": report.timeline,
        }
        if include_metadata:
            report_dict["generated_at"] = datetime.now().isoformat()
        return json.dumps(
            report_dict, indent=2, default=lambda o: vars(o) if hasattr(o, "__dict__") else str(o)
        )
