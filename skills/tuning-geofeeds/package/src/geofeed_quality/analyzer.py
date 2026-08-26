# Copyright 2026 Fastah Inc.
"""Local CSV ingestion, deterministic validation, and analysis assembly."""

from __future__ import annotations

import csv
import hashlib
import ipaddress
import re
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import pycountry

from .errors import DataRowLimitError, SourceDecodeError
from .models import (
    ENUM_VERSION,
    SCHEMA_ID,
    SCHEMA_VERSION,
    AddressFamily,
    Analysis,
    AnalysisConfiguration,
    Corrections,
    Enrichment,
    Evidence,
    EvidenceType,
    FeedStatistics,
    Finding,
    FindingCategory,
    FindingCounts,
    LineEnding,
    LocationValue,
    ParseStatus,
    PrefixRelationship,
    PrefixValue,
    RelationshipCounts,
    RelationshipType,
    RowKind,
    RowRecord,
    RowState,
    Severity,
    SeverityCounts,
    SourceMetadata,
)

MAX_DATA_ROWS = 400_000
RELATIONSHIP_LIMIT = MAX_DATA_ROWS * 4
UTF8_BOM = b"\xef\xbb\xbf"
# Nonredundant equivalent of data-processing/pkg/ipshared/ipshared.go's
# nonglobal4/nonglobal6 policy (IANA snapshot 2025-10-09).
_FASTAH_NON_PUBLIC_NETWORKS = tuple(
    ipaddress.ip_network(prefix, strict=True)
    for prefix in (
        "0.0.0.0/8",
        "10.0.0.0/8",
        "100.64.0.0/10",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "172.16.0.0/12",
        "192.0.0.0/24",
        "192.0.2.0/24",
        "192.31.196.0/24",
        "192.52.193.0/24",
        "192.88.99.0/24",
        "192.168.0.0/16",
        "192.175.48.0/24",
        "198.18.0.0/15",
        "198.51.100.0/24",
        "203.0.113.0/24",
        "240.0.0.0/4",
        "::/127",
        "::ffff:0:0/96",
        "64:ff9b::/96",
        "64:ff9b:1::/48",
        "100::/64",
        "100:0:0:1::/64",
        "2001::/23",
        "2001:db8::/32",
        "2002::/16",
        "3fff::/20",
        "5f00::/16",
        "2620:4f:8000::/48",
        "fc00::/7",
        "fe80::/10",
    )
)
_MULTICAST_NETWORKS = (
    ipaddress.ip_network("224.0.0.0/4", strict=True),
    ipaddress.ip_network("ff00::/8", strict=True),
)
RULE_REFERENCES = {
    "RFC8805.CSV_INVALID": "RFC 8805 section 2.1",
    "RFC8805.COLUMN_COUNT": "RFC 8805 section 2.1",
    "RFC8805.PREFIX_MISSING": "RFC 8805 section 2.1.3",
    "RFC8805.PREFIX_HOST_BITS": "RFC 8805 section 2.1.1.1",
    "RFC8805.PREFIX_INVALID": "RFC 8805 section 2.1.3",
    "RFC8805.COUNTRY_INVALID": "RFC 8805 section 2.1.1.2",
    "RFC8805.REGION_INVALID": "RFC 8805 section 2.1.1.3",
    "RFC8805.CITY_COMMA": "RFC 8805 section 2.1.1.4",
    "RFC8805.POSTAL_DEPRECATED": "RFC 8805 section 2.1.1.5",
    "RFC8805.DUPLICATE_PREFIX": "RFC 8805 section 2.1.3",
}


class _Builder:
    def __init__(self, observed_at: datetime) -> None:
        self.observed_at = observed_at
        self.findings: list[Finding] = []
        self.evidence: list[Evidence] = []
        self.relationships: list[PrefixRelationship] = []

    def add_finding(
        self,
        rows: Iterable[RowRecord],
        *,
        category: FindingCategory,
        severity: Severity,
        rule_id: str,
        message: str,
        values: dict[str, Any],
        invalidates: bool = False,
    ) -> Finding:
        targets = list(rows)
        target_ids = [row.id for row in targets]
        evidence = Evidence(
            id=f"evidence-{len(self.evidence) + 1:06d}",
            type=EvidenceType.VALIDATION,
            source=rule_id,
            observed_at=self.observed_at,
            target_ids=target_ids,
            values=values,
        )
        self.evidence.append(evidence)
        finding = Finding(
            id=f"finding-{len(self.findings) + 1:06d}",
            category=category,
            severity=severity,
            rule_id=rule_id,
            reference=RULE_REFERENCES.get(
                rule_id,
                "Fastah public-feed policy"
                if category == FindingCategory.FASTAH_QUALITY_RECOMMENDATION
                else "Fastah analyzer operational policy",
            ),
            message=message,
            target_ids=target_ids,
            evidence_ids=[evidence.id],
        )
        self.findings.append(finding)
        for row in targets:
            row.finding_ids.append(finding.id)
            row.evidence_ids.append(evidence.id)
            if invalidates:
                row.parse_status = ParseStatus.MALFORMED
                row.state = RowState.INVALID
        return finding

    def add_relationship(
        self,
        relationship_type: RelationshipType,
        source: RowRecord,
        target: RowRecord,
        *,
        conflict: bool = False,
    ) -> PrefixRelationship:
        if len(self.relationships) >= RELATIONSHIP_LIMIT:
            raise AssertionError("relationship construction exceeded its linear bound")
        assert source.prefix is not None and source.prefix.canonical is not None
        assert target.prefix is not None and target.prefix.canonical is not None
        evidence = Evidence(
            id=f"evidence-{len(self.evidence) + 1:06d}",
            type=EvidenceType.RELATIONSHIP,
            source=f"relationship.{relationship_type.value}",
            observed_at=self.observed_at,
            target_ids=[source.id, target.id],
            values={
                "source_prefix": source.prefix.canonical,
                "target_prefix": target.prefix.canonical,
            },
        )
        self.evidence.append(evidence)
        relationship = PrefixRelationship(
            id=f"relationship-{len(self.relationships) + 1:06d}",
            type=relationship_type,
            source_row_id=source.id,
            target_row_id=target.id,
            source_prefix=source.prefix.canonical,
            target_prefix=target.prefix.canonical,
            geolocation_conflict=conflict,
            evidence_ids=[evidence.id],
        )
        self.relationships.append(relationship)
        source.evidence_ids.append(evidence.id)
        target.evidence_ids.append(evidence.id)
        return relationship


def _normalized_text(value: str) -> str:
    return unicodedata.normalize("NFC", value.strip())


def _effective_line(raw_line: str) -> tuple[str, RowKind]:
    comment_at = raw_line.find("#")
    effective = raw_line if comment_at < 0 else raw_line[:comment_at]
    if effective.strip():
        return effective, RowKind.DATA
    if comment_at >= 0:
        return effective, RowKind.COMMENT
    return effective, RowKind.BLANK


def _physical_lines(text: str) -> list[tuple[str, LineEnding]]:
    """Split only RFC-style CRLF, LF, and CR physical line delimiters."""
    if not text:
        return []
    lines: list[tuple[str, LineEnding]] = []
    start = 0
    for delimiter in re.finditer(r"\r\n|\r|\n", text):
        line_ending = cast(LineEnding, delimiter.group())  # regex restricts the values
        lines.append((text[start : delimiter.start()], line_ending))
        start = delimiter.end()
    if start < len(text):
        lines.append((text[start:], ""))
    return lines


def _is_fully_public(network: ipaddress.IPv4Network | ipaddress.IPv6Network) -> bool:
    """Apply stdlib classifications and Fastah policy to the complete prefix."""
    boundaries = (network.network_address, network.broadcast_address)
    if any(
        address.is_private
        or address.is_reserved
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_unspecified
        for address in boundaries
    ):
        return False
    non_public = (*_FASTAH_NON_PUBLIC_NETWORKS, *_MULTICAST_NETWORKS)
    return not any(
        network.version == block.version and network.overlaps(block) for block in non_public
    )


def _parse_prefix(raw: str) -> tuple[PrefixValue, bool, str | None]:
    value = raw.strip()
    if not value:
        return PrefixValue(raw=raw), False, "missing"
    if "/" not in value:
        try:
            address = ipaddress.ip_address(value)
        except ValueError:
            return PrefixValue(raw=raw), False, "invalid"
        network = ipaddress.ip_network(f"{address}/{address.max_prefixlen}", strict=True)
        return (
            PrefixValue(
                raw=raw,
                canonical=str(network),
                address_family=AddressFamily.IPV4 if network.version == 4 else AddressFamily.IPV6,
                authored_as_host=True,
                is_publicly_routable=_is_fully_public(network),
            ),
            True,
            None,
        )
    try:
        network = ipaddress.ip_network(value, strict=True)
        host_bits = False
    except ValueError:
        try:
            network = ipaddress.ip_network(value, strict=False)
        except ValueError:
            return PrefixValue(raw=raw), False, "invalid"
        host_bits = True
    return (
        PrefixValue(
            raw=raw,
            canonical=str(network),
            address_family=AddressFamily.IPV4 if network.version == 4 else AddressFamily.IPV6,
            authored_as_host=False,
            is_publicly_routable=_is_fully_public(network),
        ),
        not host_bits,
        "host_bits" if host_bits else None,
    )


def _parse_location(fields: list[str]) -> LocationValue:
    raw_country, raw_region, raw_city, raw_postal = fields[1:5]
    return LocationValue(
        raw_country=raw_country,
        raw_region=raw_region,
        raw_city=raw_city,
        raw_postal_code=raw_postal,
        country=_normalized_text(raw_country).upper(),
        region=_normalized_text(raw_region).upper(),
        city=_normalized_text(raw_city),
        postal_code=_normalized_text(raw_postal),
    )


def _validate_location(builder: _Builder, row: RowRecord, location: LocationValue) -> None:
    if location.country and location.country != "ZZ":
        country = pycountry.countries.get(alpha_2=location.country)
        if country is None:
            builder.add_finding(
                [row],
                category=FindingCategory.RFC8805_VIOLATION,
                severity=Severity.ERROR,
                rule_id="RFC8805.COUNTRY_INVALID",
                message="Country must be an ISO 3166-1 alpha-2 code or ZZ.",
                values={"authored": location.raw_country, "normalized": location.country},
                invalidates=True,
            )
    if location.region:
        subdivision = pycountry.subdivisions.get(code=location.region)  # type: ignore[no-untyped-call]
        region_country = location.region.split("-", 1)[0] if "-" in location.region else ""
        if subdivision is None or (location.country not in {"", "ZZ", region_country}):
            builder.add_finding(
                [row],
                category=FindingCategory.RFC8805_VIOLATION,
                severity=Severity.ERROR,
                rule_id="RFC8805.REGION_INVALID",
                message="Region must be an ISO 3166-2 code consistent with country.",
                values={
                    "authored": location.raw_region,
                    "normalized": location.region,
                    "country": location.country,
                },
                invalidates=True,
            )
    if "," in location.city:
        builder.add_finding(
            [row],
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.WARNING,
            rule_id="RFC8805.CITY_COMMA",
            message="City text should not contain a comma.",
            values={"authored": location.raw_city},
        )
    if location.postal_code:
        builder.add_finding(
            [row],
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.WARNING,
            rule_id="RFC8805.POSTAL_DEPRECATED",
            message="Postal code is deprecated by RFC 8805.",
            values={"authored": location.raw_postal_code},
        )


def _parse_data_row(
    builder: _Builder,
    row_id: str,
    line_number: int,
    raw_line: str,
    line_ending: LineEnding,
    effective_line: str,
) -> RowRecord:
    row = RowRecord(
        id=row_id,
        line_number=line_number,
        kind=RowKind.DATA,
        raw_line=raw_line,
        line_ending=line_ending,
        effective_line=effective_line,
        parse_status=ParseStatus.VALID,
        state=RowState.VALID_UNRESOLVED,
    )
    try:
        fields = next(csv.reader([effective_line], strict=True))
    except csv.Error as error:
        row.parsed_field_count = 0
        builder.add_finding(
            [row],
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.ERROR,
            rule_id="RFC8805.CSV_INVALID",
            message="Data row is not valid RFC 4180 CSV.",
            values={"error": str(error)},
            invalidates=True,
        )
        return row

    row.parsed_field_count = len(fields)
    row.raw_fields = fields[:5]
    row.ignored_fields = fields[5:]
    if len(fields) != 5:
        builder.add_finding(
            [row],
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.WARNING,
            rule_id="RFC8805.COLUMN_COUNT",
            message=(
                "RFC 8805 rows should contain four commas to denote five fields, even if the "
                "non-IP Prefix columns are empty"
            ),
            values={"observed": len(fields), "expected": 5},
        )
    if len(fields) > 5:
        builder.add_finding(
            [row],
            category=FindingCategory.OPERATIONAL_WARNING,
            severity=Severity.INFO,
            rule_id="OPS.EXTRA_COLUMNS_IGNORED",
            message="Fields after the fifth were retained as ignored extension fields.",
            values={"ignored_count": len(fields) - 5},
        )
    padded_fields = [*fields, "", "", "", "", ""][:5]
    row.raw_fields = padded_fields

    prefix, prefix_valid, prefix_error = _parse_prefix(padded_fields[0])
    row.prefix = prefix
    if not prefix_valid:
        rule_id = {
            "missing": "RFC8805.PREFIX_MISSING",
            "host_bits": "RFC8805.PREFIX_HOST_BITS",
        }.get(prefix_error or "", "RFC8805.PREFIX_INVALID")
        message = {
            "missing": "IP address or prefix is required.",
            "host_bits": "CIDR prefix has host bits set and is not a network address.",
        }.get(prefix_error or "", "IP address or CIDR prefix cannot be parsed.")
        builder.add_finding(
            [row],
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.ERROR,
            rule_id=rule_id,
            message=message,
            values={"authored": padded_fields[0], "canonical": prefix.canonical},
            invalidates=True,
        )
    elif prefix.is_publicly_routable is False:
        builder.add_finding(
            [row],
            category=FindingCategory.FASTAH_QUALITY_RECOMMENDATION,
            severity=Severity.WARNING,
            rule_id="FASTAH.PREFIX_NOT_PUBLIC",
            message="Entire prefix is not globally routable under the Fastah public-feed policy.",
            values={"canonical": prefix.canonical, "full_range_assessed": True},
        )

    location = _parse_location(padded_fields)
    row.location = location
    _validate_location(builder, row, location)
    if row.parse_status == ParseStatus.VALID:
        if location.country == "ZZ" or not any(
            [location.country, location.region, location.city, location.postal_code]
        ):
            row.state = RowState.VALID_DO_NOT_GEOLOCATE
        else:
            row.state = RowState.VALID_UNRESOLVED
    return row


def _location_tuple(row: RowRecord) -> tuple[str, str, str, str]:
    if row.location is None:
        return ("", "", "", "")
    return (
        row.location.country,
        row.location.region,
        row.location.city.casefold(),
        row.location.postal_code.casefold(),
    )


def _build_relationships(builder: _Builder, rows: list[RowRecord]) -> None:
    groups: dict[str, list[RowRecord]] = defaultdict(list)
    for row in rows:
        if row.kind == RowKind.DATA and row.prefix and row.prefix.canonical:
            groups[row.prefix.canonical].append(row)

    for canonical in sorted(groups, key=_network_sort_key):
        group = groups[canonical]
        if len(group) < 2:
            continue
        first = group[0]
        builder.add_finding(
            group,
            category=FindingCategory.RFC8805_VIOLATION,
            severity=Severity.ERROR,
            rule_id="RFC8805.DUPLICATE_PREFIX",
            message="Duplicate IP address or prefix entries are an error.",
            values={"canonical": canonical, "row_count": len(group)},
            invalidates=True,
        )
        for other in group[1:]:
            equality_type = (
                RelationshipType.DUPLICATE
                if other.effective_line == first.effective_line
                else RelationshipType.EQUAL
            )
            conflict = _location_tuple(first) != _location_tuple(other)
            builder.add_relationship(equality_type, first, other, conflict=conflict)
            if conflict:
                builder.add_relationship(
                    RelationshipType.CONFLICTING_GEOLOCATION, first, other, conflict=True
                )
                builder.add_finding(
                    [first, other],
                    category=FindingCategory.OPERATIONAL_WARNING,
                    severity=Severity.WARNING,
                    rule_id="OPS.CONFLICTING_GEOLOCATION",
                    message="Equal normalized prefixes have conflicting normalized locations.",
                    values={
                        "canonical": canonical,
                        "source_location": list(_location_tuple(first)),
                        "target_location": list(_location_tuple(other)),
                    },
                )

    networks = {canonical: ipaddress.ip_network(canonical) for canonical in groups}
    for child_key in sorted(networks, key=_network_sort_key):
        child_network = networks[child_key]
        parent_key: str | None = None
        for prefix_length in range(child_network.prefixlen - 1, -1, -1):
            candidate = str(child_network.supernet(new_prefix=prefix_length))
            if candidate in networks:
                parent_key = candidate
                break
        if parent_key is None:
            continue
        parent = groups[parent_key][0]
        child = groups[child_key][0]
        builder.add_relationship(RelationshipType.PARENT, parent, child)
        builder.add_relationship(RelationshipType.CARVED_CHILD, child, parent)


def _network_sort_key(value: str) -> tuple[int, int, int]:
    network = ipaddress.ip_network(value)
    return network.version, int(network.network_address), network.prefixlen


def _statistics(
    rows: list[RowRecord], findings: list[Finding], relationships: list[PrefixRelationship]
) -> FeedStatistics:
    category_counts = Counter(finding.category.value for finding in findings)
    severity_counts = Counter(finding.severity.value for finding in findings)
    relationship_counts = Counter(relationship.type.value for relationship in relationships)
    data_rows = [row for row in rows if row.kind == RowKind.DATA]
    return FeedStatistics(
        physical_lines=len(rows),
        data_rows=len(data_rows),
        valid_rows=sum(row.parse_status == ParseStatus.VALID for row in data_rows),
        invalid_rows=sum(row.parse_status == ParseStatus.MALFORMED for row in data_rows),
        comment_lines=sum(row.kind == RowKind.COMMENT for row in rows),
        blank_lines=sum(row.kind == RowKind.BLANK for row in rows),
        do_not_geolocate_rows=sum(
            row.state == RowState.VALID_DO_NOT_GEOLOCATE for row in data_rows
        ),
        unresolved_rows=sum(row.state == RowState.VALID_UNRESOLVED for row in data_rows),
        resolved_rows=0,
        finding_counts=FindingCounts(
            **{member.value: category_counts[member.value] for member in FindingCategory}
        ),
        severity_counts=SeverityCounts(
            **{member.value: severity_counts[member.value] for member in Severity}
        ),
        relationship_counts=RelationshipCounts(
            **{member.value: relationship_counts[member.value] for member in RelationshipType}
        ),
    )


def analyze_file(path: Path | str) -> Analysis:
    source_path = Path(path)
    source_bytes = source_path.read_bytes()
    stat = source_path.stat()
    observed_at = datetime.fromtimestamp(stat.st_mtime, tz=UTC)
    digest = hashlib.sha256(source_bytes).hexdigest()
    try:
        text = source_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise SourceDecodeError(source_path, error.start) from error

    builder = _Builder(observed_at)
    rows: list[RowRecord] = []
    data_row_count = 0
    for line_number, (raw_line, line_ending) in enumerate(_physical_lines(text), start=1):
        effective_line, kind = _effective_line(raw_line)
        row_id = f"row-{line_number:06d}"
        if kind == RowKind.DATA:
            data_row_count += 1
            if data_row_count > MAX_DATA_ROWS:
                raise DataRowLimitError(MAX_DATA_ROWS, data_row_count, line_number)
            row = _parse_data_row(
                builder, row_id, line_number, raw_line, line_ending, effective_line
            )
        else:
            row = RowRecord(
                id=row_id,
                line_number=line_number,
                kind=kind,
                raw_line=raw_line,
                line_ending=line_ending,
                effective_line=effective_line,
                parse_status=ParseStatus.COMMENT if kind == RowKind.COMMENT else ParseStatus.BLANK,
                state=RowState.NOT_APPLICABLE,
            )
        rows.append(row)

    _build_relationships(builder, rows)
    source = SourceMetadata(
        kind="local_file",
        display_name=source_path.name,
        sha256=digest,
        byte_count=len(source_bytes),
        modified_at=observed_at,
        had_utf8_bom=source_bytes.startswith(UTF8_BOM),
        physical_line_count=len(rows),
    )
    return Analysis(
        schema_uri=SCHEMA_ID,
        schema_version=SCHEMA_VERSION,
        analysis_id=f"analysis-{hashlib.sha256(f'{digest}:{SCHEMA_VERSION}'.encode()).hexdigest()[:16]}",
        created_at=source.modified_at,
        analyzer_version=SCHEMA_VERSION,
        source=source,
        configuration=AnalysisConfiguration(
            enum_version=ENUM_VERSION,
            max_data_rows=MAX_DATA_ROWS,
            relationship_limit=RELATIONSHIP_LIMIT,
            enrichment_enabled=False,
        ),
        statistics=_statistics(rows, builder.findings, builder.relationships),
        rows=rows,
        findings=builder.findings,
        evidence=builder.evidence,
        relationships=builder.relationships,
        enrichment=Enrichment(),
        corrections=Corrections(),
        artifacts=[],
    )
