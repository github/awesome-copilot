# Copyright 2026 Fastah Inc.
"""Markdown projection of an already serialized and validated analysis IR."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Analysis
from .schema import validate_document


def _cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def render_markdown_document(document: Any) -> str:
    validate_document(document)
    analysis = Analysis.model_validate(document)
    stats = analysis.statistics
    lines = [
        "# Geofeed quality analysis",
        "",
        f"- Analysis: `{analysis.analysis_id}`",
        f"- Source: `{_cell(analysis.source.display_name)}`",
        f"- SHA-256: `{analysis.source.sha256}`",
        f"- Schema: `{analysis.schema_version}`",
        "",
        "## Summary",
        "",
        "| Metric | Count |",
        "|---|---:|",
        f"| Physical lines | {stats.physical_lines} |",
        f"| Data rows | {stats.data_rows} |",
        f"| Valid rows | {stats.valid_rows} |",
        f"| Invalid rows | {stats.invalid_rows} |",
        f"| Do not geolocate | {stats.do_not_geolocate_rows} |",
        f"| Unresolved | {stats.unresolved_rows} |",
        f"| Findings | {len(analysis.findings)} |",
        f"| Relationships | {len(analysis.relationships)} |",
        "",
        "## Findings",
        "",
        "| ID | Category | Severity | Rule | Targets | Message |",
        "|---|---|---|---|---|---|",
    ]
    if analysis.findings:
        lines.extend(
            "| "
            + " | ".join(
                [
                    _cell(finding.id),
                    _cell(finding.category.value),
                    _cell(finding.severity.value),
                    _cell(finding.rule_id),
                    _cell(", ".join(finding.target_ids)),
                    _cell(finding.message),
                ]
            )
            + " |"
            for finding in analysis.findings
        )
    else:
        lines.append("| — | — | — | — | — | No findings |")
    lines.extend(
        [
            "",
            "## Prefix relationships",
            "",
            "| ID | Type | Source | Target | Conflict |",
            "|---|---|---|---|---|",
        ]
    )
    if analysis.relationships:
        lines.extend(
            "| "
            + " | ".join(
                [
                    relation.id,
                    relation.type.value,
                    f"{relation.source_row_id} `{relation.source_prefix}`",
                    f"{relation.target_row_id} `{relation.target_prefix}`",
                    "yes" if relation.geolocation_conflict else "no",
                ]
            )
            + " |"
            for relation in analysis.relationships
        )
    else:
        lines.append("| — | — | — | — | — |")
    lines.extend(
        [
            "",
            "## Correction proposals and decisions",
            "",
            "Proposals are not applied unless an explicit approval artifact "
            "records an `approve` decision.",
            "",
            "| Proposal | Row / field | Old value | Proposed value | Confidence | Decision |",
            "|---|---|---|---|---|---|",
        ]
    )
    decisions = {
        decision.proposal_id: decision.action.value
        for approval in analysis.corrections.approvals
        for decision in approval.decisions
    }
    if analysis.corrections.proposals:
        lines.extend(
            "| "
            + " | ".join(
                [
                    proposal.id,
                    f"{proposal.row_id} / {proposal.field}",
                    _cell(proposal.old_value),
                    _cell(proposal.proposed_value),
                    proposal.confidence.value,
                    decisions.get(proposal.id, "pending"),
                ]
            )
            + " |"
            for proposal in analysis.corrections.proposals
        )
    else:
        lines.append("| — | — | — | — | — | No proposals |")
    return "\n".join(lines) + "\n"


def render_markdown_file(path: Path | str) -> str:
    document = json.loads(Path(path).read_text(encoding="utf-8"))
    return render_markdown_document(document)
