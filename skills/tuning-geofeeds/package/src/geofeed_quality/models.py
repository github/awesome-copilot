# Copyright 2026 Fastah Inc.
"""Pydantic source of truth for analysis IR v0.5.0."""

from __future__ import annotations

import hashlib
import ipaddress
import json
import unicodedata
from collections import Counter
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal, cast

from pydantic import BaseModel, ConfigDict, Field, JsonValue, field_validator, model_validator

SCHEMA_VERSION: Literal["0.5.0"] = "0.5.0"
ENUM_VERSION: Literal["5"] = "5"
SCHEMA_ID = "https://schemas.fastah.net/netops/geofeed-quality/analysis-0.5.0.json"
CORRECTION_PLAN_SCHEMA_ID = (
    "https://schemas.fastah.net/netops/geofeed-quality/correction-plan-1.0.json"
)
CORRECTION_APPROVAL_SCHEMA_ID = (
    "https://schemas.fastah.net/netops/geofeed-quality/correction-approval-1.0.json"
)


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)


LineEnding = Literal["", "\n", "\r", "\r\n"]


class FindingCategory(StrEnum):
    RFC8805_VIOLATION = "rfc8805_violation"
    FASTAH_QUALITY_RECOMMENDATION = "fastah_quality_recommendation"
    OPERATIONAL_WARNING = "operational_warning"
    ENRICHMENT_OBSERVATION = "rdap_mcp_enrichment_observation"


class Severity(StrEnum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class RowKind(StrEnum):
    DATA = "data"
    COMMENT = "comment"
    BLANK = "blank"


class ParseStatus(StrEnum):
    VALID = "valid"
    MALFORMED = "malformed"
    COMMENT = "comment"
    BLANK = "blank"


class RowState(StrEnum):
    INVALID = "invalid"
    VALID_DO_NOT_GEOLOCATE = "valid_do_not_geolocate"
    VALID_UNRESOLVED = "valid_unresolved"
    NOT_APPLICABLE = "not_applicable"


class AddressFamily(StrEnum):
    IPV4 = "ipv4"
    IPV6 = "ipv6"


class RelationshipType(StrEnum):
    DUPLICATE = "duplicate"
    EQUAL = "equal"
    PARENT = "parent"
    CARVED_CHILD = "carved_child"
    OVERLAP = "overlap"
    CONFLICTING_GEOLOCATION = "conflicting_geolocation"


class EvidenceType(StrEnum):
    SOURCE = "source"
    VALIDATION = "validation"
    RELATIONSHIP = "relationship"
    RDAP = "rdap"
    MCP = "mcp"
    ROUTING_ORIGIN = "routing_origin"
    ASN_ORGANIZATION = "asn_organization"
    ASN_REGISTRATION = "asn_registration"


class RdapAssessment(StrEnum):
    CONSISTENT = "consistent"
    CONFLICTING = "conflicting"
    UNVERIFIED = "unverified"
    UNAVAILABLE = "unavailable"


class RdapFailureCode(StrEnum):
    BOOTSTRAP_UNAVAILABLE = "bootstrap_unavailable"
    NO_AUTHORITATIVE_SERVICE = "no_authoritative_service"
    INSECURE_SERVICE_URL = "insecure_service_url"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    HTTP_ERROR = "http_error"
    INVALID_CONTENT_TYPE = "invalid_content_type"
    RESPONSE_TOO_LARGE = "response_too_large"
    MALFORMED_RESPONSE = "malformed_response"


class McpSearchMode(StrEnum):
    AUTO = "auto"
    PREFER_LARGER_AREA = "prefer_larger_area"
    PREFER_LARGER_POPULATION_CENTER = "prefer_larger_population_center"


class McpRowStatus(StrEnum):
    MATCHED = "matched"
    DO_NOT_GEOLOCATE = "do_not_geolocate"
    NO_MATCH = "no_match"
    INVALID_INPUT = "invalid_input"
    BACKEND_UNAVAILABLE = "backend_unavailable"


class McpResultCode(StrEnum):
    MATCH_FOUND = "MATCH_FOUND"
    DO_NOT_GEOLOCATE = "DO_NOT_GEOLOCATE"
    NO_MATCH = "NO_MATCH"
    INVALID_ROW_KEY = "INVALID_ROW_KEY"
    INVALID_COUNTRY_CODE = "INVALID_COUNTRY_CODE"
    INVALID_REGION_CODE = "INVALID_REGION_CODE"
    INVALID_CITY_NAME = "INVALID_CITY_NAME"
    INVALID_SEARCH_MODE = "INVALID_SEARCH_MODE"
    BACKEND_UNAVAILABLE = "BACKEND_UNAVAILABLE"


class McpPlaceType(StrEnum):
    CITY = "city"
    REGION = "region"
    COUNTRY = "country"


class CorrectionCategory(StrEnum):
    DETERMINISTIC_NORMALIZATION = "deterministic_normalization"
    DEPRECATED_FIELD_REMOVAL = "deprecated_field_removal"
    MCP_PLACE_SUGGESTION = "mcp_place_suggestion"


class CorrectionConfidence(StrEnum):
    DETERMINISTIC = "deterministic"
    NOT_ASSESSED = "not_assessed"


class CorrectionAction(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"


class SourceMetadata(Model):
    kind: str = Field(pattern="^local_file$")
    display_name: str
    digest_algorithm: Literal["sha256"] = "sha256"
    sha256: str = Field(pattern="^[0-9a-f]{64}$")
    byte_count: int = Field(ge=0)
    modified_at: datetime
    had_utf8_bom: bool
    physical_line_count: int = Field(ge=0)
    acquisition_evidence_ids: list[str] = Field(default_factory=list)


class PrefixValue(Model):
    raw: str
    canonical: str | None = None
    address_family: AddressFamily | None = None
    authored_as_host: bool = False
    is_publicly_routable: bool | None = None


class LocationValue(Model):
    raw_country: str = ""
    raw_region: str = ""
    raw_city: str = ""
    raw_postal_code: str = ""
    country: str = ""
    region: str = ""
    city: str = ""
    postal_code: str = ""
    accuracy_radius_km: float | None = Field(default=None, ge=0)


class RowRecord(Model):
    id: str = Field(pattern="^row-[0-9]+$")
    line_number: int = Field(ge=1)
    kind: RowKind
    raw_line: str
    line_ending: LineEnding
    effective_line: str
    raw_fields: list[str] = Field(default_factory=list)
    ignored_fields: list[str] = Field(default_factory=list)
    parsed_field_count: int | None = Field(default=None, ge=0)
    parse_status: ParseStatus
    state: RowState
    prefix: PrefixValue | None = None
    location: LocationValue | None = None
    finding_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    asn_association_ids: list[str] = Field(default_factory=list)


class Evidence(Model):
    id: str = Field(pattern="^evidence-[0-9]{6}$")
    type: EvidenceType
    source: str
    observed_at: datetime
    target_ids: list[str]
    values: dict[str, JsonValue] = Field(default_factory=dict)


class Finding(Model):
    id: str = Field(pattern="^finding-[0-9]{6}$")
    category: FindingCategory
    severity: Severity
    rule_id: str = Field(pattern="^[A-Z0-9]+(?:[._][A-Z0-9]+)+$")
    reference: str
    message: str
    target_ids: list[str]
    evidence_ids: list[str]
    proposal_ids: list[str] = Field(default_factory=list)


class PrefixRelationship(Model):
    id: str = Field(pattern="^relationship-[0-9]{6}$")
    type: RelationshipType
    source_row_id: str
    target_row_id: str
    source_prefix: str
    target_prefix: str
    geolocation_conflict: bool = False
    evidence_ids: list[str] = Field(default_factory=list)


class FindingCounts(Model):
    rfc8805_violation: int = Field(ge=0)
    fastah_quality_recommendation: int = Field(ge=0)
    operational_warning: int = Field(ge=0)
    rdap_mcp_enrichment_observation: int = Field(ge=0)


class SeverityCounts(Model):
    error: int = Field(ge=0)
    warning: int = Field(ge=0)
    info: int = Field(ge=0)


class RelationshipCounts(Model):
    duplicate: int = Field(ge=0)
    equal: int = Field(ge=0)
    parent: int = Field(ge=0)
    carved_child: int = Field(ge=0)
    overlap: int = Field(ge=0)
    conflicting_geolocation: int = Field(ge=0)


class FeedStatistics(Model):
    physical_lines: int = Field(ge=0)
    data_rows: int = Field(ge=0)
    valid_rows: int = Field(ge=0)
    invalid_rows: int = Field(ge=0)
    comment_lines: int = Field(ge=0)
    blank_lines: int = Field(ge=0)
    do_not_geolocate_rows: int = Field(ge=0)
    unresolved_rows: int = Field(ge=0)
    resolved_rows: int = Field(default=0, ge=0, le=0)
    enrichment_observations: int = Field(default=0, ge=0)
    asn_associations: int = Field(default=0, ge=0)
    proposed_corrections: int = Field(default=0, ge=0)
    approved_corrections: int = Field(default=0, ge=0)
    rejected_corrections: int = Field(default=0, ge=0)
    finding_counts: FindingCounts
    severity_counts: SeverityCounts
    relationship_counts: RelationshipCounts


class AnalysisConfiguration(Model):
    enum_version: str = Field(pattern="^5$")
    max_data_rows: int = Field(ge=1)
    relationship_limit: int = Field(ge=1)
    enrichment_enabled: bool = False
    rdap: RdapConfigurationSummary | None = None
    mcp: McpConfigurationSummary | None = None


class PublisherProfile(Model):
    version: Literal["1"] = "1"
    organization_name: str | None = None
    asn: str | None = None
    rdap_entity_handle: str | None = None
    rir_organization_id: str | None = None
    domain: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)

    @field_validator("organization_name", mode="before")
    @classmethod
    def normalize_organization_name(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return " ".join(unicodedata.normalize("NFKC", value).casefold().split()) or None

    @field_validator("asn", mode="before")
    @classmethod
    def normalize_asn(cls, value: object) -> object:
        if isinstance(value, int):
            value = str(value)
        if not isinstance(value, str):
            return value
        normalized = value.strip().upper()
        if normalized and not normalized.startswith("AS"):
            normalized = f"AS{normalized}"
        if normalized and (not normalized[2:].isdigit() or int(normalized[2:]) > 4_294_967_295):
            raise ValueError("ASN must be AS followed by a 32-bit unsigned integer")
        return normalized or None

    @field_validator("rdap_entity_handle", "rir_organization_id", mode="before")
    @classmethod
    def normalize_handle(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return unicodedata.normalize("NFKC", value).strip().upper() or None

    @field_validator("domain", mode="before")
    @classmethod
    def normalize_domain(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        normalized = value.strip().rstrip(".").casefold()
        if not normalized:
            return None
        try:
            return normalized.encode("idna").decode("ascii")
        except UnicodeError as error:
            raise ValueError("domain is not a valid IDNA name") from error


class RdapConfigurationSummary(Model):
    connect_timeout_seconds: float = Field(gt=0)
    read_timeout_seconds: float = Field(gt=0)
    response_byte_limit: int = Field(gt=0)
    max_redirects: int = Field(ge=0, le=10)
    max_concurrency: int = Field(ge=1, le=8)
    min_interval_per_rir_seconds: float = Field(ge=0)
    user_agent: str
    bootstrap_ipv4_url: str
    bootstrap_ipv6_url: str


class RdapPublicIdentifier(Model):
    type: str
    identifier: str


class RdapEntitySummary(Model):
    handle: str | None = None
    roles: list[str] = Field(default_factory=list)
    organization_names: list[str] = Field(default_factory=list)
    public_ids: list[RdapPublicIdentifier] = Field(default_factory=list)


class RdapNetworkSummary(Model):
    start_address: str
    end_address: str
    ip_version: str | None = None
    handle: str | None = None
    name: str | None = None
    type: str | None = None


class RdapObservation(Model):
    id: str = Field(pattern="^rdap-[0-9]{6}$")
    target_row_ids: list[str]
    requested_prefix: str
    rir: str | None = None
    endpoint: str | None = None
    queried_at: datetime
    cached: bool
    http_status: int | None = Field(default=None, ge=100, le=599)
    retry_after_seconds: int | None = Field(default=None, ge=0)
    retryable: bool = False
    failure_code: RdapFailureCode | None = None
    network: RdapNetworkSummary | None = None
    selected_entities: list[RdapEntitySummary] = Field(default_factory=list)
    assessment: RdapAssessment
    explanation: str
    matched_profile_fields: list[str] = Field(default_factory=list)
    conflicting_profile_fields: list[str] = Field(default_factory=list)
    evidence_ids: list[str]


class McpConfigurationSummary(Model):
    contract_version: Literal["1.0"] = "1.0"
    server_advertised_batch_limit: int = Field(ge=1)
    transport: Literal["host_mediated"] = "host_mediated"


class McpPlaceMatch(Model):
    place_id_geonames: int = Field(ge=1)
    place_type: McpPlaceType
    place_name: str
    country_code: str = Field(min_length=2, max_length=2)
    country_name: str
    sovereign_country_code: str = Field(min_length=2, max_length=2)
    region_code: str
    region_name: str
    continent_code: str = Field(min_length=2, max_length=2)
    timezone: str
    center_long_lat: list[float] = Field(min_length=0, max_length=2)
    bounding_box: list[float] = Field(min_length=0, max_length=4)
    approximate_radius_km: int = Field(ge=10)
    h3_cells: list[str]
    population_weight_percent: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_coordinate_shapes(self) -> McpPlaceMatch:
        if len(self.center_long_lat) not in {0, 2}:
            raise ValueError("center_long_lat must be empty or [longitude, latitude]")
        if len(self.bounding_box) not in {0, 4}:
            raise ValueError("bounding_box must be empty or contain four coordinates")
        return self


class McpObservation(Model):
    id: str = Field(pattern="^mcp-[0-9]{6}$")
    target_row_id: str = Field(pattern="^row-[0-9]+$")
    opaque_row_id: str = Field(pattern="^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")
    representative_opaque_row_id: str = Field(pattern="^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")
    request_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    search_mode: McpSearchMode
    contract_version: Literal["1.0"] = "1.0"
    server_batch_limit: int = Field(ge=1)
    status: McpRowStatus
    code: McpResultCode
    message: str
    retryable: bool
    matches: list[McpPlaceMatch]
    response_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    evidence_ids: list[str]


class ASNAssociationProvenance(Model):
    source_name: str
    source_url: str
    snapshot_sources: list[str] = Field(min_length=1)
    snapshot_id: str
    snapshot_sha256: str = Field(pattern="^[0-9a-f]{64}$")


class ASNOriginGroup(Model):
    asns: list[int] = Field(min_length=1)
    as_set: bool = False

    @field_validator("asns")
    @classmethod
    def validate_asns(cls, value: list[int]) -> list[int]:
        if any(asn < 0 or asn > 4_294_967_295 for asn in value):
            raise ValueError("ASNs must be 32-bit unsigned integers")
        if len(value) != len(set(value)):
            raise ValueError("origin-group ASNs must be unique")
        return value


class RoutingOriginAssociation(Model):
    id: str = Field(pattern="^asn-association-[0-9]{6}$")
    kind: Literal["routing_origin_snapshot"] = "routing_origin_snapshot"
    target_row_id: str = Field(pattern="^row-[0-9]+$")
    matched_prefix: str
    origin_groups: list[ASNOriginGroup] = Field(min_length=1)
    provenance: ASNAssociationProvenance
    evidence_ids: list[str]


class ASNOrganizationAssociation(Model):
    id: str = Field(pattern="^asn-association-[0-9]{6}$")
    kind: Literal["asn_organization_snapshot"] = "asn_organization_snapshot"
    target_row_id: str = Field(pattern="^row-[0-9]+$")
    routing_association_id: str = Field(pattern="^asn-association-[0-9]{6}$")
    asn: int = Field(ge=0, le=4_294_967_295)
    as_name: str | None = None
    organization_id: str | None = None
    organization_name: str | None = None
    organization_country: str | None = None
    asn_source_registry: str | None = None
    organization_source_registry: str | None = None
    provenance: ASNAssociationProvenance
    evidence_ids: list[str]


class ASNRegistrationAssociation(Model):
    id: str = Field(pattern="^asn-association-[0-9]{6}$")
    kind: Literal["asn_registration"] = "asn_registration"
    target_row_id: str = Field(pattern="^row-[0-9]+$")
    asn: int = Field(ge=0, le=4_294_967_295)
    organization_name: str | None = None
    registration_handle: str | None = None
    provenance: ASNAssociationProvenance
    evidence_ids: list[str]


ASNAssociation = Annotated[
    RoutingOriginAssociation | ASNOrganizationAssociation | ASNRegistrationAssociation,
    Field(discriminator="kind"),
]


class Enrichment(Model):
    publisher_profile: PublisherProfile | None = None
    observations: list[RdapObservation] = Field(default_factory=list)
    mcp_observations: list[McpObservation] = Field(default_factory=list)
    asn_associations: list[ASNAssociation] = Field(default_factory=list)


class CorrectionProposal(Model):
    version: Literal["1.0"] = "1.0"
    id: str = Field(pattern="^proposal-[0-9a-f]{16}$")
    row_id: str = Field(pattern="^row-[0-9]+$")
    source_line: int = Field(ge=1)
    field: Literal["country", "region", "city", "postal_code"]
    path: str = Field(pattern=r"^/rows/row-[0-9]+/location/(country|region|city|postal_code)$")
    rule_id: str = Field(pattern="^[A-Z0-9]+(?:[._][A-Z0-9]+)+$")
    category: CorrectionCategory
    old_value: str
    proposed_value: str
    rationale: str = Field(min_length=1)
    confidence: CorrectionConfidence
    finding_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str]

    def identity_payload(self, analysis_id: str) -> dict[str, JsonValue]:
        return {
            "analysis_id": analysis_id,
            "row_id": self.row_id,
            "source_line": self.source_line,
            "field": self.field,
            "path": self.path,
            "rule_id": self.rule_id,
            "category": self.category.value,
            "old_value": self.old_value,
            "proposed_value": self.proposed_value,
            "rationale": self.rationale,
            "confidence": self.confidence.value,
            "finding_ids": cast(list[JsonValue], self.finding_ids),
            "evidence_ids": cast(list[JsonValue], self.evidence_ids),
        }

    def expected_id(self, analysis_id: str) -> str:
        encoded = json.dumps(
            self.identity_payload(analysis_id), sort_keys=True, separators=(",", ":")
        ).encode()
        return f"proposal-{hashlib.sha256(encoded).hexdigest()[:16]}"


def correction_proposal_set_sha256(proposals: list[CorrectionProposal]) -> str:
    encoded = json.dumps(
        [proposal.model_dump(mode="json") for proposal in proposals],
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


class CorrectionPlan(Model):
    version: Literal["1.0"] = "1.0"
    source_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    analysis_id: str = Field(pattern="^analysis-[0-9a-f]{16}$")
    analysis_schema_version: Literal["0.5.0"]
    proposal_set_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    proposals: list[CorrectionProposal]

    @model_validator(mode="after")
    def validate_plan(self) -> CorrectionPlan:
        ids = [proposal.id for proposal in self.proposals]
        if len(ids) != len(set(ids)):
            raise ValueError("correction plan proposal IDs must be unique")
        if self.proposal_set_sha256 != correction_proposal_set_sha256(self.proposals):
            raise ValueError("correction plan proposal digest does not match proposals")
        return self


class CorrectionDecision(Model):
    proposal_id: str = Field(pattern="^proposal-[0-9a-f]{16}$")
    action: CorrectionAction


class CorrectionApproval(Model):
    version: Literal["1.0"] = "1.0"
    id: str = Field(pattern="^approval-[0-9a-f]{16}$")
    source_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    analysis_id: str = Field(pattern="^analysis-[0-9a-f]{16}$")
    analysis_schema_version: Literal["0.5.0"]
    proposal_set_sha256: str = Field(pattern="^[0-9a-f]{64}$")
    approver_label: str = Field(min_length=1, max_length=200)
    decided_at: datetime
    decisions: list[CorrectionDecision] = Field(min_length=1)

    @field_validator("approver_label")
    @classmethod
    def validate_approver_label(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("approver_label must not have surrounding whitespace")
        return value

    @field_validator("decided_at")
    @classmethod
    def validate_decided_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("decided_at must include a timezone")
        return value

    @model_validator(mode="after")
    def validate_decisions(self) -> CorrectionApproval:
        ids = [decision.proposal_id for decision in self.decisions]
        if len(ids) != len(set(ids)):
            raise ValueError("approval proposal IDs must be unique")
        return self

    def identity_payload(self) -> dict[str, JsonValue]:
        return {
            "version": self.version,
            "source_sha256": self.source_sha256,
            "analysis_id": self.analysis_id,
            "analysis_schema_version": self.analysis_schema_version,
            "proposal_set_sha256": self.proposal_set_sha256,
            "approver_label": self.approver_label,
            "decided_at": self.decided_at.isoformat(),
            "decisions": [decision.model_dump(mode="json") for decision in self.decisions],
        }

    def expected_id(self) -> str:
        encoded = json.dumps(
            self.identity_payload(), sort_keys=True, separators=(",", ":")
        ).encode()
        return f"approval-{hashlib.sha256(encoded).hexdigest()[:16]}"


class Corrections(Model):
    proposals: list[CorrectionProposal] = Field(default_factory=list)
    approvals: list[CorrectionApproval] = Field(default_factory=list)
    applied_proposal_ids: list[str] = Field(default_factory=list)


class Artifact(Model):
    type: str
    media_type: str
    renderer_version: str
    analysis_id: str = Field(pattern="^analysis-[0-9a-f]{16}$")
    approval_ids: list[str] = Field(default_factory=list)
    sha256: str | None = Field(default=None, pattern="^[0-9a-f]{64}$")


class Analysis(Model):
    schema_uri: str = Field(pattern="^https://schemas\\.fastah\\.net/")
    schema_version: Literal["0.5.0"]
    analysis_id: str = Field(pattern="^analysis-[0-9a-f]{16}$")
    created_at: datetime
    analyzer_version: Literal["0.5.0"]
    source: SourceMetadata
    configuration: AnalysisConfiguration
    statistics: FeedStatistics
    rows: list[RowRecord]
    findings: list[Finding]
    evidence: list[Evidence]
    relationships: list[PrefixRelationship]
    enrichment: Enrichment
    corrections: Corrections
    artifacts: list[Artifact]

    @model_validator(mode="after")
    def validate_document_invariants(self) -> Analysis:
        row_ids = [row.id for row in self.rows]
        finding_ids = [finding.id for finding in self.findings]
        evidence_ids = [evidence.id for evidence in self.evidence]
        relationship_ids = [relationship.id for relationship in self.relationships]
        rdap_ids = [observation.id for observation in self.enrichment.observations]
        mcp_ids = [observation.id for observation in self.enrichment.mcp_observations]
        asn_association_ids = [item.id for item in self.enrichment.asn_associations]
        asn_association_id_set = set(asn_association_ids)
        proposal_ids = [proposal.id for proposal in self.corrections.proposals]
        approval_ids = [approval.id for approval in self.corrections.approvals]
        opaque_mcp_ids = [
            observation.opaque_row_id for observation in self.enrichment.mcp_observations
        ]
        for label, values in (
            ("row", row_ids),
            ("finding", finding_ids),
            ("evidence", evidence_ids),
            ("relationship", relationship_ids),
            ("RDAP observation", rdap_ids),
            ("MCP observation", mcp_ids),
            ("ASN association", asn_association_ids),
            ("opaque MCP row", opaque_mcp_ids),
            ("correction proposal", proposal_ids),
            ("correction approval", approval_ids),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"{label} IDs must be unique")

        rows = {row.id: row for row in self.rows}
        findings = set(finding_ids)
        findings_by_id = {finding.id: finding for finding in self.findings}
        evidence = set(evidence_ids)
        evidence_by_id = {item.id: item for item in self.evidence}
        if [row.line_number for row in self.rows] != list(range(1, len(self.rows) + 1)):
            raise ValueError("row line numbers must be contiguous and ordered")
        if self.source.physical_line_count != len(self.rows):
            raise ValueError("source physical_line_count does not match rows")
        reconstructed = (b"\xef\xbb\xbf" if self.source.had_utf8_bom else b"") + "".join(
            row.raw_line + row.line_ending for row in self.rows
        ).encode("utf-8")
        if len(reconstructed) != self.source.byte_count:
            raise ValueError("source byte_count does not match retained physical rows")
        if hashlib.sha256(reconstructed).hexdigest() != self.source.sha256:
            raise ValueError("source digest does not match retained physical rows")
        for row in self.rows:
            if row.kind == RowKind.DATA:
                if row.parsed_field_count is None:
                    raise ValueError(f"data row {row.id} requires parsed_field_count")
            elif row.parsed_field_count is not None:
                raise ValueError(f"non-data row {row.id} cannot have parsed_field_count")

        data_rows = [row for row in self.rows if row.kind == RowKind.DATA]
        expected_scalars = {
            "physical_lines": len(self.rows),
            "data_rows": len(data_rows),
            "valid_rows": sum(row.parse_status == ParseStatus.VALID for row in data_rows),
            "invalid_rows": sum(row.parse_status == ParseStatus.MALFORMED for row in data_rows),
            "comment_lines": sum(row.kind == RowKind.COMMENT for row in self.rows),
            "blank_lines": sum(row.kind == RowKind.BLANK for row in self.rows),
            "do_not_geolocate_rows": sum(
                row.state == RowState.VALID_DO_NOT_GEOLOCATE for row in data_rows
            ),
            "unresolved_rows": sum(row.state == RowState.VALID_UNRESOLVED for row in data_rows),
            "enrichment_observations": len(self.enrichment.observations)
            + len(mcp_ids)
            + len(asn_association_ids),
            "asn_associations": len(asn_association_ids),
            "proposed_corrections": len(self.corrections.proposals),
            "approved_corrections": sum(
                decision.action == CorrectionAction.APPROVE
                for approval in self.corrections.approvals
                for decision in approval.decisions
            ),
            "rejected_corrections": sum(
                decision.action == CorrectionAction.REJECT
                for approval in self.corrections.approvals
                for decision in approval.decisions
            ),
        }
        for field, expected in expected_scalars.items():
            if getattr(self.statistics, field) != expected:
                raise ValueError(f"statistics.{field} does not match derived records")
        if self.statistics.resolved_rows != 0:
            raise ValueError("statistics.resolved_rows must remain zero in this contract")

        category_counts = Counter(finding.category.value for finding in self.findings)
        severity_counts = Counter(finding.severity.value for finding in self.findings)
        relationship_counts = Counter(
            relationship.type.value for relationship in self.relationships
        )
        if self.statistics.finding_counts.model_dump() != {
            member.value: category_counts[member.value] for member in FindingCategory
        }:
            raise ValueError("statistics.finding_counts does not match findings")
        if self.statistics.severity_counts.model_dump() != {
            member.value: severity_counts[member.value] for member in Severity
        }:
            raise ValueError("statistics.severity_counts does not match findings")
        if self.statistics.relationship_counts.model_dump() != {
            member.value: relationship_counts[member.value] for member in RelationshipType
        }:
            raise ValueError("statistics.relationship_counts does not match relationships")

        for row in self.rows:
            if not set(row.finding_ids) <= findings:
                raise ValueError(f"row {row.id} has a dangling finding reference")
            if not set(row.evidence_ids) <= evidence:
                raise ValueError(f"row {row.id} has a dangling evidence reference")
            if len(row.asn_association_ids) != len(set(row.asn_association_ids)):
                raise ValueError(f"row {row.id} has duplicate ASN association references")
            if not set(row.asn_association_ids) <= asn_association_id_set:
                raise ValueError(f"row {row.id} has a dangling ASN association reference")
        for finding in self.findings:
            if not set(finding.target_ids) <= rows.keys():
                raise ValueError(f"finding {finding.id} has an invalid target")
            if not set(finding.evidence_ids) <= evidence:
                raise ValueError(f"finding {finding.id} has a dangling evidence reference")
            if not set(finding.proposal_ids) <= set(proposal_ids):
                raise ValueError(f"finding {finding.id} has a dangling proposal reference")
        allowed_evidence_targets = set(rows) | {self.analysis_id}
        for item in self.evidence:
            if not set(item.target_ids) <= allowed_evidence_targets:
                raise ValueError(f"evidence {item.id} has an invalid target")
        for relationship in self.relationships:
            if relationship.source_row_id not in rows or relationship.target_row_id not in rows:
                raise ValueError(f"relationship {relationship.id} has an invalid row reference")
            if not set(relationship.evidence_ids) <= evidence:
                raise ValueError(
                    f"relationship {relationship.id} has a dangling evidence reference"
                )
            source_prefix = rows[relationship.source_row_id].prefix
            target_prefix = rows[relationship.target_row_id].prefix
            if (
                source_prefix is None
                or target_prefix is None
                or source_prefix.canonical != relationship.source_prefix
                or target_prefix.canonical != relationship.target_prefix
            ):
                raise ValueError(
                    f"relationship {relationship.id} prefix references do not match rows"
                )
        if (
            self.enrichment.publisher_profile
            and not set(self.enrichment.publisher_profile.evidence_ids) <= evidence
        ):
            raise ValueError("publisher profile has a dangling evidence reference")
        for observation in self.enrichment.observations:
            if not set(observation.target_row_ids) <= rows.keys():
                raise ValueError(f"RDAP observation {observation.id} has an invalid row target")
            if not set(observation.evidence_ids) <= evidence:
                raise ValueError(f"RDAP observation {observation.id} has dangling evidence")
        for mcp_observation in self.enrichment.mcp_observations:
            if mcp_observation.target_row_id not in rows:
                raise ValueError(f"MCP observation {mcp_observation.id} has an invalid row target")
            if not set(mcp_observation.evidence_ids) <= evidence:
                raise ValueError(f"MCP observation {mcp_observation.id} has dangling evidence")
            if self.configuration.mcp is None:
                raise ValueError("MCP observations require MCP configuration provenance")
            if (
                mcp_observation.contract_version != self.configuration.mcp.contract_version
                or mcp_observation.server_batch_limit
                != self.configuration.mcp.server_advertised_batch_limit
            ):
                raise ValueError(
                    f"MCP observation {mcp_observation.id} disagrees with MCP configuration"
                )
        asn_associations = {item.id: item for item in self.enrichment.asn_associations}
        for association in self.enrichment.asn_associations:
            if association.target_row_id not in rows:
                raise ValueError(f"ASN association {association.id} has an invalid row target")
            if association.id not in rows[association.target_row_id].asn_association_ids:
                raise ValueError(f"ASN association {association.id} row link is not reciprocal")
            if len(association.evidence_ids) != len(set(association.evidence_ids)):
                raise ValueError(f"ASN association {association.id} has duplicate evidence")
            if not set(association.evidence_ids) <= evidence:
                raise ValueError(f"ASN association {association.id} has dangling evidence")
            if any(
                association.target_row_id not in evidence_by_id[evidence_id].target_ids
                for evidence_id in association.evidence_ids
            ):
                raise ValueError(
                    f"ASN association {association.id} evidence does not target its row"
                )
            if isinstance(association, RoutingOriginAssociation):
                row_prefix = rows[association.target_row_id].prefix
                canonical_prefix = row_prefix.canonical if row_prefix else None
                try:
                    if canonical_prefix is None:
                        raise ValueError("row has no canonical prefix")
                    requested_network = ipaddress.ip_network(canonical_prefix, strict=True)
                    matched_network = ipaddress.ip_network(association.matched_prefix, strict=True)
                except ValueError as error:
                    raise ValueError(
                        f"ASN association {association.id} has an invalid matched prefix"
                    ) from error
                if (
                    requested_network.version != matched_network.version
                    or requested_network.network_address not in matched_network
                ):
                    raise ValueError(
                        f"ASN association {association.id} matched prefix does not cover its row"
                    )
            if isinstance(association, ASNOrganizationAssociation):
                routing = asn_associations.get(association.routing_association_id)
                if not isinstance(routing, RoutingOriginAssociation):
                    raise ValueError(
                        f"ASN association {association.id} has an invalid routing association"
                    )
                if routing.target_row_id != association.target_row_id:
                    raise ValueError(
                        f"ASN association {association.id} routing target does not match its row"
                    )
                routed_asns = {asn for group in routing.origin_groups for asn in group.asns}
                if association.asn not in routed_asns:
                    raise ValueError(
                        f"ASN association {association.id} ASN is absent from routing evidence"
                    )
        for row in self.rows:
            if any(
                asn_associations[association_id].target_row_id != row.id
                for association_id in row.asn_association_ids
            ):
                raise ValueError(f"row {row.id} has an ASN association for another row")
        field_indexes = {"country": 1, "region": 2, "city": 3, "postal_code": 4}
        proposals = {proposal.id: proposal for proposal in self.corrections.proposals}
        for proposal in self.corrections.proposals:
            proposal_row = rows.get(proposal.row_id)
            if proposal_row is None or proposal_row.line_number != proposal.source_line:
                raise ValueError(f"proposal {proposal.id} has an invalid row reference")
            if proposal.id != proposal.expected_id(self.analysis_id):
                raise ValueError(f"proposal {proposal.id} does not match its content")
            if proposal.path != f"/rows/{proposal.row_id}/location/{proposal.field}":
                raise ValueError(f"proposal {proposal.id} path does not match its field")
            index = field_indexes[proposal.field]
            if (
                proposal_row.parsed_field_count is None
                or index >= proposal_row.parsed_field_count
                or index >= len(proposal_row.raw_fields)
                or proposal_row.raw_fields[index] != proposal.old_value
            ):
                raise ValueError(f"proposal {proposal.id} old value does not match its row")
            if not set(proposal.finding_ids) <= findings:
                raise ValueError(f"proposal {proposal.id} has a dangling finding reference")
            if not set(proposal.evidence_ids) <= evidence:
                raise ValueError(f"proposal {proposal.id} has a dangling evidence reference")
            if any(
                proposal.id not in findings_by_id[finding_id].proposal_ids
                for finding_id in proposal.finding_ids
            ):
                raise ValueError(f"proposal {proposal.id} finding link is not reciprocal")
            if "\r" in proposal.proposed_value or "\n" in proposal.proposed_value:
                raise ValueError(f"proposal {proposal.id} contains a physical line delimiter")

        decided: set[str] = set()
        approved: set[str] = set()
        rejected: set[str] = set()
        expected_proposal_digest = correction_proposal_set_sha256(self.corrections.proposals)
        for approval in self.corrections.approvals:
            if approval.id != approval.expected_id():
                raise ValueError(f"approval {approval.id} does not match its content")
            if (
                approval.source_sha256 != self.source.sha256
                or approval.analysis_id != self.analysis_id
                or approval.analysis_schema_version != self.schema_version
                or approval.proposal_set_sha256 != expected_proposal_digest
            ):
                raise ValueError(f"approval {approval.id} is stale for this analysis")
            for decision in approval.decisions:
                if decision.proposal_id not in proposals:
                    raise ValueError(f"approval {approval.id} references an unknown proposal")
                if decision.proposal_id in decided:
                    raise ValueError(f"proposal {decision.proposal_id} has duplicate decisions")
                decided.add(decision.proposal_id)
                if decision.action == CorrectionAction.APPROVE:
                    approved.add(decision.proposal_id)
                else:
                    rejected.add(decision.proposal_id)
        applied_ids = self.corrections.applied_proposal_ids
        if len(applied_ids) != len(set(applied_ids)):
            raise ValueError("applied proposal IDs must be unique")
        if not set(applied_ids) <= approved:
            raise ValueError("applied proposal IDs must have an explicit approval")
        if set(applied_ids) & rejected:
            raise ValueError("rejected proposal IDs cannot be applied")
        if any(artifact.analysis_id != self.analysis_id for artifact in self.artifacts):
            raise ValueError("artifact analysis_id does not match the document")
        if any(not set(artifact.approval_ids) <= set(approval_ids) for artifact in self.artifacts):
            raise ValueError("artifact has a dangling approval reference")
        return self
