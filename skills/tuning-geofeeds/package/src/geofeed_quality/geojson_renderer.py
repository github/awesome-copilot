# Copyright 2026 Fastah Inc.
"""Privacy-bounded GeoJSON projection of validated Analysis IR."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Literal

from pydantic import Field, model_validator

from .models import Analysis, McpObservation, Model, RowRecord
from .schema import validate_document

GEOJSON_ATTRIBUTION = "Contains information derived from GeoNames (https://www.geonames.org/)."


class GeoJsonGeometry(Model):
    type: Literal["Point", "Polygon"]
    coordinates: list[Any]

    @model_validator(mode="after")
    def validate_coordinates(self) -> GeoJsonGeometry:
        if self.type == "Point":
            if not _valid_point(self.coordinates):
                raise ValueError("GeoJSON Point must be a valid [longitude, latitude] pair")
        elif not _valid_polygon(self.coordinates):
            raise ValueError("GeoJSON Polygon must be a closed valid bounding-box ring")
        return self


class GeoJsonProperties(Model):
    # Local Analysis row identifier; this is not the Fastah MCP wire rowKey.
    rowId: str = Field(pattern="^row-[0-9]+$")
    prefix: str
    mcpStatus: str
    placeType: str
    placeName: str
    countryCode: str
    regionCode: str
    geometryRole: Literal["best_match_point", "best_match_bounding_box"]
    findingCount: int = Field(ge=0)
    highestSeverity: Literal["error", "warning", "info", "none"]


class GeoJsonFeature(Model):
    type: Literal["Feature"] = "Feature"
    id: str
    geometry: GeoJsonGeometry
    properties: GeoJsonProperties


class GeoJsonFeatureCollection(Model):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJsonFeature]
    attribution: list[str] = Field(default_factory=lambda: [GEOJSON_ATTRIBUTION])


def _valid_number(value: object) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool) and math.isfinite(value)


def _valid_point(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(_valid_number(item) for item in value)
        and -180 <= value[0] <= 180
        and -90 <= value[1] <= 90
    )


def _valid_bbox(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 4
        and all(_valid_number(item) for item in value)
        and -180 <= value[0] <= value[2] <= 180
        and -90 <= value[1] <= value[3] <= 90
    )


def _valid_polygon(value: object) -> bool:
    if not isinstance(value, list) or len(value) != 1 or not isinstance(value[0], list):
        return False
    ring = value[0]
    return len(ring) == 5 and ring[0] == ring[-1] and all(_valid_point(point) for point in ring)


def _bbox_polygon(bbox: list[float]) -> list[list[list[float]]]:
    west, south, east, north = bbox
    return [[[west, south], [east, south], [east, north], [west, north], [west, south]]]


def _highest_severity(
    severities: dict[str, str], finding_ids: list[str]
) -> Literal["error", "warning", "info", "none"]:
    for severity in ("error", "warning", "info"):
        if any(severities.get(finding_id) == severity for finding_id in finding_ids):
            return severity
    return "none"


def _properties(
    observation: McpObservation,
    rows: dict[str, RowRecord],
    severities: dict[str, str],
) -> GeoJsonProperties:
    row = rows[observation.target_row_id]
    match = observation.matches[0]
    return GeoJsonProperties(
        rowId=row.id,
        prefix=row.prefix.canonical if row.prefix and row.prefix.canonical else "",
        mcpStatus=observation.status.value,
        placeType=match.place_type.value,
        placeName=match.place_name,
        countryCode=match.country_code,
        regionCode=match.region_code,
        geometryRole="best_match_point",
        findingCount=len(row.finding_ids),
        highestSeverity=_highest_severity(severities, row.finding_ids),
    )


def export_geojson_analysis(analysis: Analysis) -> GeoJsonFeatureCollection:
    features: list[GeoJsonFeature] = []
    rows = {row.id: row for row in analysis.rows}
    severities = {finding.id: finding.severity.value for finding in analysis.findings}
    for observation in analysis.enrichment.mcp_observations:
        if not observation.matches:
            continue
        match = observation.matches[0]
        properties = _properties(observation, rows, severities)
        if _valid_point(match.center_long_lat):
            features.append(
                GeoJsonFeature(
                    id=f"{observation.id}-point",
                    geometry=GeoJsonGeometry(type="Point", coordinates=list(match.center_long_lat)),
                    properties=properties,
                )
            )
        if _valid_bbox(match.bounding_box):
            features.append(
                GeoJsonFeature(
                    id=f"{observation.id}-bbox",
                    geometry=GeoJsonGeometry(
                        type="Polygon", coordinates=_bbox_polygon(match.bounding_box)
                    ),
                    properties=properties.model_copy(
                        update={"geometryRole": "best_match_bounding_box"}
                    ),
                )
            )
    return GeoJsonFeatureCollection(features=features)


def export_geojson_document(document: Any) -> dict[str, Any]:
    validate_document(document)
    analysis = Analysis.model_validate(document)
    return export_geojson_analysis(analysis).model_dump(mode="json")


def export_geojson_file(path: Path | str) -> dict[str, Any]:
    document = json.loads(Path(path).read_text(encoding="utf-8"))
    return export_geojson_document(document)
