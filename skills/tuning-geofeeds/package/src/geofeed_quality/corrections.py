# Copyright 2026 Fastah Inc.
"""Explicit proposal, approval, and corrected-CSV boundaries."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Literal

from .analyzer import UTF8_BOM, analyze_file
from .errors import CorrectionError
from .models import (
    Analysis,
    Artifact,
    CorrectionAction,
    CorrectionApproval,
    CorrectionCategory,
    CorrectionConfidence,
    CorrectionDecision,
    CorrectionPlan,
    CorrectionProposal,
    Evidence,
    EvidenceType,
    McpRowStatus,
    ParseStatus,
    RowKind,
    RowRecord,
    correction_proposal_set_sha256,
)

CORRECTION_RENDERER_VERSION = "1.0"
FIELD_INDEX: dict[str, int] = {"country": 1, "region": 2, "city": 3, "postal_code": 4}


def _related_findings(analysis: Analysis, row_id: str, rule_id: str) -> list[str]:
    return [
        finding.id
        for finding in analysis.findings
        if row_id in finding.target_ids and finding.rule_id == rule_id
    ]


def _proposal(
    analysis: Analysis,
    row: RowRecord,
    field: Literal["country", "region", "city", "postal_code"],
    rule_id: str,
    category: CorrectionCategory,
    new_value: str,
    rationale: str,
    confidence: CorrectionConfidence,
    finding_ids: list[str],
    evidence_ids: list[str],
) -> CorrectionProposal:
    index = FIELD_INDEX[field]
    proposal = CorrectionProposal(
        id="proposal-0000000000000000",
        row_id=row.id,
        source_line=row.line_number,
        field=field,
        path=f"/rows/{row.id}/location/{field}",
        rule_id=rule_id,
        category=category,
        old_value=row.raw_fields[index],
        proposed_value=new_value,
        rationale=rationale,
        confidence=confidence,
        finding_ids=finding_ids,
        evidence_ids=evidence_ids,
    )
    return proposal.model_copy(update={"id": proposal.expected_id(analysis.analysis_id)})


def _can_propose(row: RowRecord, field: str) -> bool:
    index = FIELD_INDEX[field]
    return (
        row.kind == RowKind.DATA
        and row.parse_status == ParseStatus.VALID
        and row.location is not None
        and row.parsed_field_count is not None
        and index < row.parsed_field_count
        and index < len(row.raw_fields)
    )


def propose_corrections(analysis: Analysis) -> tuple[Analysis, CorrectionPlan]:
    """Return deterministic proposals without approving or mutating authored row values."""
    if analysis.corrections.approvals or analysis.corrections.applied_proposal_ids:
        raise CorrectionError("cannot regenerate proposals after decisions or application")
    if analysis.corrections.proposals:
        plan = CorrectionPlan(
            source_sha256=analysis.source.sha256,
            analysis_id=analysis.analysis_id,
            analysis_schema_version=analysis.schema_version,
            proposal_set_sha256=correction_proposal_set_sha256(analysis.corrections.proposals),
            proposals=analysis.corrections.proposals,
        )
        return analysis.model_copy(deep=True), plan
    generated: list[CorrectionProposal] = []
    proposal_evidence: list[Evidence] = []

    def normalization_evidence(row: RowRecord, field: str, new_value: str) -> list[str]:
        evidence = Evidence(
            id=f"evidence-{len(analysis.evidence) + len(proposal_evidence) + 1:06d}",
            type=EvidenceType.VALIDATION,
            source="typed correction proposal generation from validated Analysis IR",
            observed_at=analysis.created_at,
            target_ids=[row.id],
            values={
                "field": field,
                "authored": row.raw_fields[FIELD_INDEX[field]],
                "normalized": new_value,
            },
        )
        proposal_evidence.append(evidence)
        return [evidence.id]

    invalid_rules_by_row = {
        row.id: {
            finding.rule_id
            for finding in analysis.findings
            if row.id in finding.target_ids
            and finding.rule_id in {"RFC8805.COUNTRY_INVALID", "RFC8805.REGION_INVALID"}
        }
        for row in analysis.rows
    }
    for row in analysis.rows:
        if row.location is None:
            continue
        if (
            _can_propose(row, "country")
            and "RFC8805.COUNTRY_INVALID" not in invalid_rules_by_row[row.id]
            and row.location.raw_country != row.location.country
        ):
            generated.append(
                _proposal(
                    analysis,
                    row,
                    "country",
                    "CORRECTION.COUNTRY_NORMALIZATION",
                    CorrectionCategory.DETERMINISTIC_NORMALIZATION,
                    row.location.country,
                    "Apply the analyzer's deterministic trim, Unicode, and ISO country "
                    "case normalization.",
                    CorrectionConfidence.DETERMINISTIC,
                    [],
                    normalization_evidence(row, "country", row.location.country),
                )
            )
        if (
            _can_propose(row, "region")
            and "RFC8805.REGION_INVALID" not in invalid_rules_by_row[row.id]
            and row.location.raw_region != row.location.region
        ):
            generated.append(
                _proposal(
                    analysis,
                    row,
                    "region",
                    "CORRECTION.REGION_NORMALIZATION",
                    CorrectionCategory.DETERMINISTIC_NORMALIZATION,
                    row.location.region,
                    "Apply the analyzer's deterministic trim, Unicode, and ISO subdivision "
                    "case normalization.",
                    CorrectionConfidence.DETERMINISTIC,
                    [],
                    normalization_evidence(row, "region", row.location.region),
                )
            )
        postal_findings = _related_findings(analysis, row.id, "RFC8805.POSTAL_DEPRECATED")
        if _can_propose(row, "postal_code") and row.location.raw_postal_code and postal_findings:
            generated.append(
                _proposal(
                    analysis,
                    row,
                    "postal_code",
                    "CORRECTION.REMOVE_DEPRECATED_POSTAL",
                    CorrectionCategory.DEPRECATED_FIELD_REMOVAL,
                    "",
                    "Remove the deprecated RFC 8805 fifth-column postal code.",
                    CorrectionConfidence.DETERMINISTIC,
                    postal_findings,
                    [
                        evidence_id
                        for finding in analysis.findings
                        if finding.id in postal_findings
                        for evidence_id in finding.evidence_ids
                    ],
                )
            )

    rows = {row.id: row for row in analysis.rows}
    for observation in analysis.enrichment.mcp_observations:
        if observation.status != McpRowStatus.MATCHED or not observation.matches:
            continue
        row = rows[observation.target_row_id]
        if row.location is None:
            continue
        match = observation.matches[0]
        candidates: tuple[tuple[Literal["country", "region", "city"], str, str], ...] = (
            ("country", match.country_code, row.location.country),
            ("region", match.region_code, row.location.region),
            ("city", match.place_name, row.location.city),
        )
        mcp_findings = _related_findings(analysis, row.id, "MCP.MATCHED")
        for field_name, value, normalized_old in candidates:
            if not value or value == normalized_old or not _can_propose(row, field_name):
                continue
            generated.append(
                _proposal(
                    analysis,
                    row,
                    field_name,
                    f"MCP.PLACE_SUGGESTION.{field_name.upper()}",
                    CorrectionCategory.MCP_PLACE_SUGGESTION,
                    value,
                    "Use the selected best-first Fastah place match as an advisory value.",
                    CorrectionConfidence.NOT_ASSESSED,
                    mcp_findings,
                    observation.evidence_ids,
                )
            )

    generated.sort(key=lambda item: (item.source_line, FIELD_INDEX[item.field], item.rule_id))
    proposed = analysis.model_copy(deep=True)
    proposed.corrections.proposals = generated
    proposed.evidence.extend(proposal_evidence)
    proposed_rows = {row.id: row for row in proposed.rows}
    for evidence in proposal_evidence:
        for row_id in evidence.target_ids:
            proposed_rows[row_id].evidence_ids.append(evidence.id)
    findings = {finding.id: finding for finding in proposed.findings}
    for proposal in generated:
        for finding_id in proposal.finding_ids:
            findings[finding_id].proposal_ids.append(proposal.id)
    proposed.statistics.proposed_corrections = len(generated)
    plan = CorrectionPlan(
        source_sha256=proposed.source.sha256,
        analysis_id=proposed.analysis_id,
        analysis_schema_version=proposed.schema_version,
        proposal_set_sha256=correction_proposal_set_sha256(generated),
        proposals=generated,
    )
    return Analysis.model_validate(proposed.model_dump(mode="json")), plan


def record_approval(
    plan: CorrectionPlan,
    approver_label: str,
    approved_ids: list[str],
    rejected_ids: list[str],
    decided_at: datetime,
) -> CorrectionApproval:
    """Create a bound approval artifact only from explicit proposal decisions."""
    all_requested = [*approved_ids, *rejected_ids]
    if not all_requested:
        raise CorrectionError("at least one explicit approve or reject decision is required")
    if len(all_requested) != len(set(all_requested)):
        raise CorrectionError("approval contains duplicate proposal IDs")
    known = {proposal.id for proposal in plan.proposals}
    unknown = sorted(set(all_requested) - known)
    if unknown:
        raise CorrectionError(f"approval references unknown proposal {unknown[0]}")
    decisions = [
        *(
            CorrectionDecision(proposal_id=proposal_id, action=CorrectionAction.APPROVE)
            for proposal_id in approved_ids
        ),
        *(
            CorrectionDecision(proposal_id=proposal_id, action=CorrectionAction.REJECT)
            for proposal_id in rejected_ids
        ),
    ]
    approval = CorrectionApproval(
        id="approval-0000000000000000",
        source_sha256=plan.source_sha256,
        analysis_id=plan.analysis_id,
        analysis_schema_version=plan.analysis_schema_version,
        proposal_set_sha256=plan.proposal_set_sha256,
        approver_label=approver_label,
        decided_at=decided_at,
        decisions=decisions,
    )
    return approval.model_copy(update={"id": approval.expected_id()})


def validate_approval(analysis: Analysis, approval: CorrectionApproval) -> None:
    if approval.id != approval.expected_id():
        raise CorrectionError("approval ID does not match approval content")
    if approval.source_sha256 != analysis.source.sha256:
        raise CorrectionError("approval source digest does not match analysis")
    if approval.analysis_id != analysis.analysis_id:
        raise CorrectionError("approval analysis ID does not match analysis")
    if approval.analysis_schema_version != analysis.schema_version:
        raise CorrectionError("approval schema version does not match analysis")
    expected_digest = correction_proposal_set_sha256(analysis.corrections.proposals)
    if approval.proposal_set_sha256 != expected_digest:
        raise CorrectionError("approval proposal digest is stale or changed")
    known = {proposal.id for proposal in analysis.corrections.proposals}
    unknown = sorted({decision.proposal_id for decision in approval.decisions} - known)
    if unknown:
        raise CorrectionError(f"approval references unknown proposal {unknown[0]}")


def _source_bytes(analysis: Analysis) -> bytes:
    return (UTF8_BOM if analysis.source.had_utf8_bom else b"") + "".join(
        row.raw_line + row.line_ending for row in analysis.rows
    ).encode("utf-8")


def _render_changed_row(row: RowRecord, changes: dict[str, str]) -> str:
    if row.parsed_field_count is None or row.parse_status != ParseStatus.VALID:
        raise CorrectionError(f"row {row.id} cannot be safely materialized")
    fields = [*row.raw_fields[: min(row.parsed_field_count, 5)], *row.ignored_fields]
    for field, value in changes.items():
        index = FIELD_INDEX[field]
        if index >= row.parsed_field_count:
            raise CorrectionError(f"row {row.id} does not contain field {field}")
        fields[index] = value
    output = io.StringIO(newline="")
    csv.writer(output, lineterminator="").writerow(fields)
    comment_suffix = row.raw_line[len(row.effective_line) :]
    return output.getvalue() + comment_suffix


def materialize_corrected_bytes(
    analysis: Analysis, approval: CorrectionApproval
) -> tuple[bytes, list[str]]:
    """Build and reanalyze approved output in memory without writing a destination."""
    validate_approval(analysis, approval)
    approved_ids = [
        decision.proposal_id
        for decision in approval.decisions
        if decision.action == CorrectionAction.APPROVE
    ]
    if not approved_ids:
        raise CorrectionError("corrected CSV export requires at least one explicit approval")
    already_applied = sorted(set(approved_ids) & set(analysis.corrections.applied_proposal_ids))
    if already_applied:
        raise CorrectionError(f"proposal {already_applied[0]} was already applied")
    proposals = {proposal.id: proposal for proposal in analysis.corrections.proposals}
    changes: dict[str, dict[str, str]] = {}
    for proposal_id in approved_ids:
        proposal = proposals[proposal_id]
        row_changes = changes.setdefault(proposal.row_id, {})
        if proposal.field in row_changes:
            raise CorrectionError(
                f"multiple approved proposals target {proposal.row_id}.{proposal.field}"
            )
        row_changes[proposal.field] = proposal.proposed_value
    text = "".join(
        (_render_changed_row(row, changes[row.id]) if row.id in changes else row.raw_line)
        + row.line_ending
        for row in analysis.rows
    )
    output_bytes = (UTF8_BOM if analysis.source.had_utf8_bom else b"") + text.encode("utf-8")
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temporary:
        temporary.write(output_bytes)
        temporary_path = Path(temporary.name)
    try:
        corrected = analyze_file(temporary_path)
    finally:
        temporary_path.unlink(missing_ok=True)
    if len(corrected.rows) != len(analysis.rows):
        raise CorrectionError("corrected CSV changed the physical row count")
    corrected_rows = {row.id: row for row in corrected.rows}
    for proposal_id in approved_ids:
        proposal = proposals[proposal_id]
        corrected_row = corrected_rows[proposal.row_id]
        if corrected_row.raw_fields[FIELD_INDEX[proposal.field]] != proposal.proposed_value:
            raise CorrectionError(f"proposal {proposal.id} did not round-trip through CSV")
    return output_bytes, [finding.rule_id for finding in corrected.findings]


def _check_output_path(source: Path, output: Path, finalized_analysis: Path) -> None:
    resolved_source = source.resolve()
    destinations = [output, finalized_analysis]
    if len({path.resolve() for path in destinations}) != len(destinations):
        raise CorrectionError("CSV and finalized Analysis outputs must be different paths")
    for path in destinations:
        if path.resolve() == resolved_source:
            raise CorrectionError("output must not overwrite the source feed")
        if path.exists():
            raise CorrectionError(f"output already exists: {path}")
        if not path.parent.is_dir():
            raise CorrectionError(f"output directory does not exist: {path.parent}")


def _write_atomic_new(path: Path, content: bytes) -> None:
    if not path.parent.is_dir():
        raise CorrectionError(f"output directory does not exist: {path.parent}")
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError as error:
            raise CorrectionError(f"output already exists: {path}") from error
    finally:
        temporary.unlink(missing_ok=True)


def export_corrected_csv(
    analysis: Analysis,
    approval: CorrectionApproval,
    source_path: Path | str,
    output_path: Path | str,
    finalized_analysis_path: Path | str,
) -> tuple[Analysis, list[str]]:
    """Verify provenance, atomically export CSV, and record applied IDs in a new Analysis."""
    source = Path(source_path)
    output = Path(output_path)
    finalized_path = Path(finalized_analysis_path)
    _check_output_path(source, output, finalized_path)
    source_bytes = source.read_bytes()
    if hashlib.sha256(source_bytes).hexdigest() != analysis.source.sha256:
        raise CorrectionError("source feed digest does not match analysis provenance")
    if source_bytes != _source_bytes(analysis):
        raise CorrectionError("source feed bytes do not match retained IR rows")
    corrected_bytes, remaining_findings = materialize_corrected_bytes(analysis, approval)
    approved_ids = [
        decision.proposal_id
        for decision in approval.decisions
        if decision.action == CorrectionAction.APPROVE
    ]
    finalized = analysis.model_copy(deep=True)
    finalized.corrections.approvals.append(approval)
    finalized.corrections.applied_proposal_ids.extend(approved_ids)
    finalized.statistics.approved_corrections += len(approved_ids)
    finalized.statistics.rejected_corrections += sum(
        decision.action == CorrectionAction.REJECT for decision in approval.decisions
    )
    finalized.artifacts.append(
        Artifact(
            type="corrected_csv",
            media_type="text/csv; charset=utf-8",
            renderer_version=CORRECTION_RENDERER_VERSION,
            analysis_id=analysis.analysis_id,
            approval_ids=[approval.id],
            sha256=hashlib.sha256(corrected_bytes).hexdigest(),
        )
    )
    finalized = Analysis.model_validate(finalized.model_dump(mode="json"))
    finalized_bytes = (json.dumps(finalized.model_dump(mode="json"), indent=2) + "\n").encode()
    _write_atomic_new(output, corrected_bytes)
    try:
        _write_atomic_new(finalized_path, finalized_bytes)
    except Exception:
        output.unlink(missing_ok=True)
        raise
    return finalized, remaining_findings
