# Copyright 2026 Fastah Inc.
"""Host-mediated Fastah MCP local adapter/exchange request export and response import.

This module intentionally has no MCP transport, OAuth, or credential handling.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from collections.abc import Iterable, Sequence
from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from .errors import McpExchangeError
from .models import (
    Analysis,
    Evidence,
    EvidenceType,
    Finding,
    FindingCategory,
    McpConfigurationSummary,
    McpObservation,
    McpPlaceMatch,
    McpPlaceType,
    McpResultCode,
    McpRowStatus,
    McpSearchMode,
    Model,
    RowKind,
    RowRecord,
    RowState,
    Severity,
)

MCP_CONTRACT_VERSION = "1.0"
MCP_REQUEST_SCHEMA_ID = (
    "https://schemas.fastah.net/netops/geofeed-quality/mcp-place-search-request-1.0.json"
)
MCP_RESPONSE_SCHEMA_ID = (
    "https://schemas.fastah.net/netops/geofeed-quality/mcp-place-search-response-1.0.json"
)
MCP_MAPPING_SCHEMA_ID = (
    "https://schemas.fastah.net/netops/geofeed-quality/mcp-request-mapping-1.0.json"
)
ROW_KEY_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9._:/-]{31,127}$"

OpaqueRowKey = Annotated[
    str, StringConstraints(min_length=32, max_length=128, pattern=ROW_KEY_PATTERN)
]


class WireModel(Model):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class McpRequestRow(WireModel):
    row_key: OpaqueRowKey = Field(alias="rowKey")
    country_code: str = Field(alias="countryCode", max_length=16)
    region_code: str = Field(default="", alias="regionCode", max_length=16)
    city_name: str = Field(default="", alias="cityName", max_length=200)
    search_mode: McpSearchMode = Field(default=McpSearchMode.AUTO, alias="searchMode")


class McpRequestBatch(WireModel):
    """Frozen local adapter/exchange v1.0 request envelope, not a live MCP tool schema."""

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "description": (
                "Frozen local adapter/exchange contract v1.0 request envelope. "
                "It is not the live Fastah MCP tool inputSchema; discover that via tools/list."
            )
        },
    )
    rows: list[McpRequestRow] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_row_keys(self) -> McpRequestBatch:
        keys = [row.row_key for row in self.rows]
        if len(keys) != len(set(keys)):
            raise ValueError("rowKey values must be unique within a request batch")
        return self


class McpMappingTarget(WireModel):
    representative_row_key: OpaqueRowKey = Field(alias="representativeRowKey")
    target_source_row_ids: list[str] = Field(alias="targetSourceRowIds", min_length=1)
    target_opaque_row_keys: list[OpaqueRowKey] = Field(alias="targetOpaqueRowKeys", min_length=1)

    @model_validator(mode="after")
    def validate_targets(self) -> McpMappingTarget:
        if len(self.target_source_row_ids) != len(self.target_opaque_row_keys):
            raise ValueError("source and opaque target lists must have equal lengths")
        if len(self.target_source_row_ids) != len(set(self.target_source_row_ids)):
            raise ValueError("target source row IDs must be unique")
        if len(self.target_opaque_row_keys) != len(set(self.target_opaque_row_keys)):
            raise ValueError("target opaque row keys must be unique")
        if self.representative_row_key != self.target_opaque_row_keys[0]:
            raise ValueError("representativeRowKey must be the first target opaque row key")
        return self


class McpMappingBatch(WireModel):
    batch_number: int = Field(alias="batchNumber", ge=1)
    request_sha256: str = Field(alias="requestSha256", pattern="^[0-9a-f]{64}$")
    representative_row_keys: list[OpaqueRowKey] = Field(alias="representativeRowKeys", min_length=1)
    targets: list[McpMappingTarget] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_representatives(self) -> McpMappingBatch:
        target_representatives = [target.representative_row_key for target in self.targets]
        if self.representative_row_keys != target_representatives:
            raise ValueError("representativeRowKeys must match targets in request order")
        if len(self.representative_row_keys) != len(set(self.representative_row_keys)):
            raise ValueError("representative row keys must be unique")
        return self


class McpRequestMapping(WireModel):
    mapping_version: Literal["1.0"] = Field(alias="mappingVersion")
    analysis_id: str = Field(alias="analysisId")
    contract_version: Literal["1.0"] = Field(alias="contractVersion")
    server_batch_limit: int = Field(alias="serverBatchLimit", ge=1)
    search_mode: McpSearchMode = Field(alias="searchMode")
    batches: list[McpMappingBatch]
    integrity_sha256: str = Field(alias="integritySha256", pattern="^[0-9a-f]{64}$")

    @model_validator(mode="after")
    def validate_integrity_and_coverage(self) -> McpRequestMapping:
        if [batch.batch_number for batch in self.batches] != list(range(1, len(self.batches) + 1)):
            raise ValueError("mapping batch numbers must be contiguous from one")
        representatives = [
            row_key for batch in self.batches for row_key in batch.representative_row_keys
        ]
        if len(representatives) != len(set(representatives)):
            raise ValueError("representative row keys must be globally unique")
        target_source_ids = [
            row_id
            for batch in self.batches
            for target in batch.targets
            for row_id in target.target_source_row_ids
        ]
        target_opaque_keys = [
            row_key
            for batch in self.batches
            for target in batch.targets
            for row_key in target.target_opaque_row_keys
        ]
        if len(target_source_ids) != len(set(target_source_ids)):
            raise ValueError("target source row coverage must be unique")
        if len(target_opaque_keys) != len(set(target_opaque_keys)):
            raise ValueError("target opaque row-key coverage must be unique")
        if self.integrity_sha256 != _mapping_integrity_digest(self):
            raise ValueError("mapping integrity digest does not match its contents")
        return self


class McpWirePlaceMatch(WireModel):
    place_id_geonames: int = Field(alias="placeIdGeonames", ge=1)
    place_type: McpPlaceType = Field(alias="placeType")
    place_name: str = Field(alias="placeName")
    country_code: str = Field(alias="countryCode", min_length=2, max_length=2)
    country_name: str = Field(alias="countryName")
    sovereign_country_code: str = Field(alias="sovereignCountryCode", min_length=2, max_length=2)
    region_code: str = Field(alias="regionCode")
    region_name: str = Field(alias="regionName")
    continent_code: str = Field(alias="continentCode", min_length=2, max_length=2)
    timezone: str
    center_long_lat: list[float] = Field(alias="centerLongLat", min_length=0, max_length=2)
    bounding_box: list[float] = Field(alias="boundingBox", min_length=0, max_length=4)
    approximate_radius_km: int = Field(alias="approximateRadiusKm", ge=10)
    h3_cells: list[str] = Field(alias="h3Cells")
    population_weight_percent: float = Field(alias="populationWeightPercent", ge=0, le=100)

    @model_validator(mode="after")
    def validate_coordinate_shapes(self) -> McpWirePlaceMatch:
        if len(self.center_long_lat) not in {0, 2}:
            raise ValueError("centerLongLat must be empty or [longitude, latitude]")
        if len(self.bounding_box) not in {0, 4}:
            raise ValueError("boundingBox must be empty or contain four coordinates")
        return self

    def to_ir(self) -> McpPlaceMatch:
        return McpPlaceMatch.model_validate(self.model_dump())


_STATUS_CODES: dict[McpRowStatus, set[McpResultCode]] = {
    McpRowStatus.MATCHED: {McpResultCode.MATCH_FOUND},
    McpRowStatus.DO_NOT_GEOLOCATE: {McpResultCode.DO_NOT_GEOLOCATE},
    McpRowStatus.NO_MATCH: {McpResultCode.NO_MATCH},
    McpRowStatus.INVALID_INPUT: {
        McpResultCode.INVALID_ROW_KEY,
        McpResultCode.INVALID_COUNTRY_CODE,
        McpResultCode.INVALID_REGION_CODE,
        McpResultCode.INVALID_CITY_NAME,
        McpResultCode.INVALID_SEARCH_MODE,
    },
    McpRowStatus.BACKEND_UNAVAILABLE: {McpResultCode.BACKEND_UNAVAILABLE},
}


class McpResponseRow(WireModel):
    row_key: OpaqueRowKey = Field(alias="rowKey")
    status: McpRowStatus
    code: McpResultCode
    message: str = Field(min_length=1)
    retryable: bool
    matches: list[McpWirePlaceMatch]

    @model_validator(mode="after")
    def validate_status_invariants(self) -> McpResponseRow:
        if self.code not in _STATUS_CODES[self.status]:
            raise ValueError(f"code {self.code} is invalid for status {self.status}")
        if (self.status == McpRowStatus.MATCHED) != bool(self.matches):
            raise ValueError("matched rows require matches; other statuses require an empty array")
        if self.retryable != (self.status == McpRowStatus.BACKEND_UNAVAILABLE):
            raise ValueError("only backend_unavailable rows are retryable")
        return self


class McpResponseSummary(WireModel):
    total: int = Field(ge=1)
    matched: int = Field(ge=0)
    do_not_geolocate: int = Field(alias="doNotGeolocate", ge=0)
    no_match: int = Field(alias="noMatch", ge=0)
    invalid_input: int = Field(alias="invalidInput", ge=0)
    backend_unavailable: int = Field(alias="backendUnavailable", ge=0)
    retryable: int = Field(ge=0)


class McpResponseBatch(WireModel):
    """Frozen local adapter/exchange v1.0 response envelope, not a live MCP tool schema."""

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "description": (
                "Frozen local adapter/exchange contract v1.0 response envelope. "
                "It is not the live Fastah MCP tool outputSchema; discover that via tools/list."
            )
        },
    )
    contract_version: Literal["1.0"] = Field(alias="contractVersion")
    batch_limit: int = Field(alias="batchLimit", ge=1)
    summary: McpResponseSummary
    results: list[McpResponseRow] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_batch_invariants(self) -> McpResponseBatch:
        if len(self.results) > self.batch_limit:
            raise ValueError("results exceed batchLimit")
        keys = [result.row_key for result in self.results]
        if len(keys) != len(set(keys)):
            raise ValueError("result rowKey values must be unique")
        statuses = Counter(result.status for result in self.results)
        expected = {
            "total": len(self.results),
            "matched": statuses[McpRowStatus.MATCHED],
            "do_not_geolocate": statuses[McpRowStatus.DO_NOT_GEOLOCATE],
            "no_match": statuses[McpRowStatus.NO_MATCH],
            "invalid_input": statuses[McpRowStatus.INVALID_INPUT],
            "backend_unavailable": statuses[McpRowStatus.BACKEND_UNAVAILABLE],
            "retryable": sum(result.retryable for result in self.results),
        }
        if self.summary.model_dump() != expected:
            raise ValueError("summary must equal counts derived from results")
        return self


def opaque_row_key(analysis: Analysis, row: RowRecord) -> str:
    """Derive a deterministic privacy-safe MCP rowKey for a source row."""
    material = f"fastah-geofeed-mcp-row-v1\0{analysis.analysis_id}\0{row.id}".encode()
    return f"fq-{hashlib.sha256(material).hexdigest()[:32]}"


def _eligible_rows(analysis: Analysis) -> list[RowRecord]:
    return [
        row
        for row in analysis.rows
        if row.kind == RowKind.DATA
        and row.state in {RowState.VALID_UNRESOLVED, RowState.VALID_DO_NOT_GEOLOCATE}
        and row.location is not None
    ]


def request_bytes(batch: McpRequestBatch) -> bytes:
    """Return the deterministic bytes hosts persist and submit as tool arguments."""
    return (
        json.dumps(request_document(batch), sort_keys=True, separators=(",", ":")) + "\n"
    ).encode()


def _request_digest(batch: McpRequestBatch) -> str:
    return hashlib.sha256(request_bytes(batch)).hexdigest()


def _mapping_integrity_digest(mapping: McpRequestMapping) -> str:
    document = mapping.model_dump(mode="json", by_alias=True, exclude={"integrity_sha256"})
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def export_request_exchange(
    analysis: Analysis,
    server_advertised_batch_limit: int,
    search_mode: McpSearchMode = McpSearchMode.AUTO,
) -> tuple[list[McpRequestBatch], McpRequestMapping]:
    """Deduplicate byte-identical outbound tuples and retain local fanout provenance."""
    if server_advertised_batch_limit < 1:
        raise McpExchangeError("server-advertised batch limit must be positive")

    groups: dict[tuple[str, str, str, str], list[RowRecord]] = {}
    for row in _eligible_rows(analysis):
        if row.location is None:  # Kept explicit at the privacy boundary.
            continue
        key = (
            row.location.country,
            row.location.region,
            row.location.city,
            search_mode.value,
        )
        groups.setdefault(key, []).append(row)

    requests: list[McpRequestRow] = []
    targets: list[McpMappingTarget] = []
    for (country, region, city, _), rows in groups.items():
        representative_key = opaque_row_key(analysis, rows[0])
        requests.append(
            McpRequestRow(
                rowKey=representative_key,
                countryCode=country,
                regionCode=region,
                cityName=city,
                searchMode=search_mode,
            )
        )
        targets.append(
            McpMappingTarget(
                representativeRowKey=representative_key,
                targetSourceRowIds=[row.id for row in rows],
                targetOpaqueRowKeys=[opaque_row_key(analysis, row) for row in rows],
            )
        )

    batches: list[McpRequestBatch] = []
    mapping_batches: list[McpMappingBatch] = []
    for index in range(0, len(requests), server_advertised_batch_limit):
        batch = McpRequestBatch(rows=requests[index : index + server_advertised_batch_limit])
        batch_targets = targets[index : index + server_advertised_batch_limit]
        batches.append(batch)
        mapping_batches.append(
            McpMappingBatch(
                batchNumber=len(batches),
                requestSha256=_request_digest(batch),
                representativeRowKeys=[target.representative_row_key for target in batch_targets],
                targets=batch_targets,
            )
        )

    mapping_values: dict[str, Any] = {
        "mappingVersion": "1.0",
        "analysisId": analysis.analysis_id,
        "contractVersion": MCP_CONTRACT_VERSION,
        "serverBatchLimit": server_advertised_batch_limit,
        "searchMode": search_mode,
        "batches": mapping_batches,
        "integritySha256": "0" * 64,
    }
    unchecked = McpRequestMapping.model_construct(
        mapping_version="1.0",
        analysis_id=analysis.analysis_id,
        contract_version=MCP_CONTRACT_VERSION,
        server_batch_limit=server_advertised_batch_limit,
        search_mode=search_mode,
        batches=mapping_batches,
        integrity_sha256="0" * 64,
    )
    mapping_values["integritySha256"] = _mapping_integrity_digest(unchecked)
    return batches, McpRequestMapping.model_validate(mapping_values)


def export_request_batches(
    analysis: Analysis,
    server_advertised_batch_limit: int,
    search_mode: McpSearchMode = McpSearchMode.AUTO,
) -> list[McpRequestBatch]:
    return export_request_exchange(analysis, server_advertised_batch_limit, search_mode)[0]


def request_document(batch: McpRequestBatch) -> dict[str, Any]:
    """Serialize only the allowlisted wire fields accepted by Fastah MCP."""
    return batch.model_dump(mode="json", by_alias=True)


def _canonical_response_digest(response: McpResponseBatch) -> str:
    document = response.model_dump(mode="json", by_alias=True)
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _finding_details(status: McpRowStatus) -> tuple[Severity, str]:
    if status == McpRowStatus.MATCHED:
        return Severity.INFO, "Fastah returned advisory place candidates; no value was applied."
    if status == McpRowStatus.DO_NOT_GEOLOCATE:
        return Severity.INFO, "Fastah confirmed that this row must not be geolocated."
    if status == McpRowStatus.NO_MATCH:
        return Severity.INFO, "Fastah found no place after its documented fallback behavior."
    if status == McpRowStatus.INVALID_INPUT:
        return Severity.WARNING, "Fastah rejected the allowlisted location fields as invalid."
    return Severity.WARNING, "Fastah place search was unavailable; the base analysis is unchanged."


def _response_rows(
    responses: Sequence[McpResponseBatch],
) -> Iterable[tuple[McpResponseBatch, McpResponseRow]]:
    for response in responses:
        for result in response.results:
            yield response, result


def import_response_batches(
    analysis: Analysis,
    response_documents: Sequence[dict[str, Any] | McpResponseBatch],
    mapping_document: dict[str, Any] | McpRequestMapping,
    server_advertised_batch_limit: int,
    search_mode: McpSearchMode = McpSearchMode.AUTO,
) -> Analysis:
    """Merge captured structured tool output without invoking MCP or changing base rows."""
    if server_advertised_batch_limit < 1:
        raise McpExchangeError("server-advertised batch limit must be positive")
    try:
        responses = [
            item if isinstance(item, McpResponseBatch) else McpResponseBatch.model_validate(item)
            for item in response_documents
        ]
    except ValueError as error:
        raise McpExchangeError(f"invalid MCP response: {error}") from error
    try:
        mapping = (
            mapping_document
            if isinstance(mapping_document, McpRequestMapping)
            else McpRequestMapping.model_validate(mapping_document)
        )
    except ValueError as error:
        raise McpExchangeError(f"invalid MCP request mapping: {error}") from error
    if not responses:
        raise McpExchangeError("at least one captured MCP response is required")
    if any(response.batch_limit != server_advertised_batch_limit for response in responses):
        raise McpExchangeError("response batchLimit does not match the host-discovered limit")

    eligible = _eligible_rows(analysis)
    row_by_source = {row.id: row for row in eligible}
    expected_opaque_keys = [opaque_row_key(analysis, row) for row in eligible]
    _, expected_mapping = export_request_exchange(
        analysis, server_advertised_batch_limit, search_mode
    )
    if mapping != expected_mapping:
        raise McpExchangeError(
            "mapping does not match this analysis, search mode, limit, or exported requests"
        )
    flattened = list(_response_rows(responses))
    actual_keys = [result.row_key for _, result in flattened]
    if len(actual_keys) != len(set(actual_keys)):
        raise McpExchangeError("captured responses contain duplicate rowKey values")
    expected_representatives = [
        row_key for batch in mapping.batches for row_key in batch.representative_row_keys
    ]
    unknown = sorted(set(actual_keys) - set(expected_representatives))
    if unknown:
        raise McpExchangeError(
            f"captured response contains unknown representative rowKey {unknown[0]}"
        )
    if len(responses) != len(mapping.batches):
        raise McpExchangeError("captured responses must correspond to every exported request batch")
    for response, batch_mapping in zip(responses, mapping.batches, strict=True):
        if [result.row_key for result in response.results] != batch_mapping.representative_row_keys:
            raise McpExchangeError(
                "captured response row order must match its exported request batch"
            )
    if actual_keys != expected_representatives:
        raise McpExchangeError("captured results must cover representative rows once in order")

    expanded: list[tuple[McpResponseBatch, McpResponseRow, RowRecord, str, str, str]] = []
    for response, batch_mapping in zip(responses, mapping.batches, strict=True):
        for result, target_mapping in zip(response.results, batch_mapping.targets, strict=True):
            for source_id, opaque_key in zip(
                target_mapping.target_source_row_ids,
                target_mapping.target_opaque_row_keys,
                strict=True,
            ):
                target = row_by_source.get(source_id)
                if target is None or opaque_row_key(analysis, target) != opaque_key:
                    raise McpExchangeError("mapping target is unknown or stale")
                expanded.append(
                    (
                        response,
                        result,
                        target,
                        opaque_key,
                        target_mapping.representative_row_key,
                        batch_mapping.request_sha256,
                    )
                )
    source_order = {row.id: index for index, row in enumerate(eligible)}
    expanded.sort(key=lambda item: source_order[item[2].id])
    if [item[3] for item in expanded] != expected_opaque_keys:
        raise McpExchangeError(
            "mapping must cover every eligible target exactly once in source order"
        )
    response_digests = {
        id(response): _canonical_response_digest(response) for response in responses
    }

    existing = {
        observation.opaque_row_id: observation
        for observation in analysis.enrichment.mcp_observations
    }
    if existing:
        if set(existing) != set(expected_opaque_keys):
            raise McpExchangeError("analysis already contains a different MCP import")
        for response, result, _, opaque_key, representative_key, request_digest in expanded:
            observation = existing[opaque_key]
            if (
                observation.search_mode != search_mode
                or observation.contract_version != response.contract_version
                or observation.server_batch_limit != response.batch_limit
                or observation.representative_opaque_row_id != representative_key
                or observation.request_sha256 != request_digest
                or observation.status != result.status
                or observation.code != result.code
                or observation.message != result.message
                or observation.retryable != result.retryable
                or observation.matches != [match.to_ir() for match in result.matches]
                or observation.response_sha256 != response_digests[id(response)]
            ):
                raise McpExchangeError("analysis already contains a conflicting MCP result")
        return analysis.model_copy(deep=True)

    enriched = analysis.model_copy(deep=True)
    rows_by_id = {row.id: row for row in enriched.rows}
    enriched.configuration.enrichment_enabled = True
    enriched.configuration.mcp = McpConfigurationSummary(
        server_advertised_batch_limit=server_advertised_batch_limit
    )
    for response, result, target, opaque_key, representative_key, request_digest in expanded:
        response_digest = response_digests[id(response)]
        evidence = Evidence(
            id=f"evidence-{len(enriched.evidence) + 1:06d}",
            type=EvidenceType.MCP,
            source="host-captured rfc8805-row-place-search contract 1.0 response",
            observed_at=enriched.created_at,
            target_ids=[target.id],
            values={
                "opaque_row_id": opaque_key,
                "representative_opaque_row_id": representative_key,
                "request_sha256": request_digest,
                "search_mode": search_mode.value,
                "contract_version": response.contract_version,
                "server_batch_limit": response.batch_limit,
                "status": result.status.value,
                "code": result.code.value,
                "message": result.message,
                "retryable": result.retryable,
                "response_sha256": response_digest,
                "match_place_ids": [match.place_id_geonames for match in result.matches],
            },
        )
        enriched.evidence.append(evidence)
        observation = McpObservation(
            id=f"mcp-{len(enriched.enrichment.mcp_observations) + 1:06d}",
            target_row_id=target.id,
            opaque_row_id=opaque_key,
            representative_opaque_row_id=representative_key,
            request_sha256=request_digest,
            search_mode=search_mode,
            contract_version=response.contract_version,
            server_batch_limit=response.batch_limit,
            status=result.status,
            code=result.code,
            message=result.message,
            retryable=result.retryable,
            matches=[match.to_ir() for match in result.matches],
            response_sha256=response_digest,
            evidence_ids=[evidence.id],
        )
        enriched.enrichment.mcp_observations.append(observation)
        severity, message = _finding_details(result.status)
        finding = Finding(
            id=f"finding-{len(enriched.findings) + 1:06d}",
            category=FindingCategory.ENRICHMENT_OBSERVATION,
            severity=severity,
            rule_id=f"MCP.{result.status.value.upper()}",
            reference="Fastah place-search contract 1.0; matches and fallbacks are advisory",
            message=message,
            target_ids=[target.id],
            evidence_ids=[evidence.id],
        )
        enriched.findings.append(finding)
        row = rows_by_id[target.id]
        row.evidence_ids.append(evidence.id)
        row.finding_ids.append(finding.id)

    enriched.statistics.enrichment_observations = (
        len(enriched.enrichment.observations)
        + len(enriched.enrichment.mcp_observations)
        + len(enriched.enrichment.asn_associations)
    )
    enriched.statistics.finding_counts.rdap_mcp_enrichment_observation = sum(
        finding.category == FindingCategory.ENRICHMENT_OBSERVATION for finding in enriched.findings
    )
    enriched.statistics.severity_counts.error = sum(
        finding.severity == Severity.ERROR for finding in enriched.findings
    )
    enriched.statistics.severity_counts.warning = sum(
        finding.severity == Severity.WARNING for finding in enriched.findings
    )
    enriched.statistics.severity_counts.info = sum(
        finding.severity == Severity.INFO for finding in enriched.findings
    )
    return Analysis.model_validate(enriched.model_dump())
