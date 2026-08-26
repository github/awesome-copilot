# Copyright 2026 Fastah Inc.
"""Generate and validate the committed analysis schema."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from .mcp_exchange import (
    MCP_MAPPING_SCHEMA_ID,
    MCP_REQUEST_SCHEMA_ID,
    MCP_RESPONSE_SCHEMA_ID,
    McpRequestBatch,
    McpRequestMapping,
    McpResponseBatch,
)
from .models import (
    CORRECTION_APPROVAL_SCHEMA_ID,
    CORRECTION_PLAN_SCHEMA_ID,
    SCHEMA_ID,
    Analysis,
    CorrectionApproval,
    CorrectionPlan,
)

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEMA_PATH = PACKAGE_ROOT / "schema" / "analysis.schema.json"
DEFAULT_MCP_REQUEST_SCHEMA_PATH = PACKAGE_ROOT / "schema" / "mcp-place-search-request.schema.json"
DEFAULT_MCP_RESPONSE_SCHEMA_PATH = PACKAGE_ROOT / "schema" / "mcp-place-search-response.schema.json"
DEFAULT_MCP_MAPPING_SCHEMA_PATH = PACKAGE_ROOT / "schema" / "mcp-request-mapping.schema.json"
DEFAULT_CORRECTION_PLAN_SCHEMA_PATH = PACKAGE_ROOT / "schema" / "correction-plan.schema.json"
DEFAULT_CORRECTION_APPROVAL_SCHEMA_PATH = (
    PACKAGE_ROOT / "schema" / "correction-approval.schema.json"
)


def generated_schema() -> dict[str, Any]:
    schema = Analysis.model_json_schema(mode="serialization", ref_template="#/$defs/{model}")
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    schema["$id"] = SCHEMA_ID
    return schema


def generated_mcp_schema(
    model: type[McpRequestBatch] | type[McpResponseBatch] | type[McpRequestMapping], schema_id: str
) -> dict[str, Any]:
    schema = model.model_json_schema(
        mode="serialization", by_alias=True, ref_template="#/$defs/{model}"
    )
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    schema["$id"] = schema_id
    return schema


def generated_bound_schema(
    model: type[CorrectionPlan] | type[CorrectionApproval], schema_id: str
) -> dict[str, Any]:
    schema = model.model_json_schema(mode="serialization", ref_template="#/$defs/{model}")
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    schema["$id"] = schema_id
    return schema


def schema_text() -> str:
    return json.dumps(generated_schema(), indent=2, sort_keys=True) + "\n"


def mcp_request_schema_text() -> str:
    return (
        json.dumps(
            generated_mcp_schema(McpRequestBatch, MCP_REQUEST_SCHEMA_ID), indent=2, sort_keys=True
        )
        + "\n"
    )


def mcp_response_schema_text() -> str:
    return (
        json.dumps(
            generated_mcp_schema(McpResponseBatch, MCP_RESPONSE_SCHEMA_ID), indent=2, sort_keys=True
        )
        + "\n"
    )


def mcp_mapping_schema_text() -> str:
    return (
        json.dumps(
            generated_mcp_schema(McpRequestMapping, MCP_MAPPING_SCHEMA_ID),
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def correction_plan_schema_text() -> str:
    return (
        json.dumps(
            generated_bound_schema(CorrectionPlan, CORRECTION_PLAN_SCHEMA_ID),
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def correction_approval_schema_text() -> str:
    return (
        json.dumps(
            generated_bound_schema(CorrectionApproval, CORRECTION_APPROVAL_SCHEMA_ID),
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def write_schema(path: Path = DEFAULT_SCHEMA_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(schema_text(), encoding="utf-8")


def write_all_schemas() -> None:
    write_schema()
    DEFAULT_MCP_REQUEST_SCHEMA_PATH.write_text(mcp_request_schema_text(), encoding="utf-8")
    DEFAULT_MCP_RESPONSE_SCHEMA_PATH.write_text(mcp_response_schema_text(), encoding="utf-8")
    DEFAULT_MCP_MAPPING_SCHEMA_PATH.write_text(mcp_mapping_schema_text(), encoding="utf-8")
    DEFAULT_CORRECTION_PLAN_SCHEMA_PATH.write_text(correction_plan_schema_text(), encoding="utf-8")
    DEFAULT_CORRECTION_APPROVAL_SCHEMA_PATH.write_text(
        correction_approval_schema_text(), encoding="utf-8"
    )


def check_schema(path: Path = DEFAULT_SCHEMA_PATH) -> bool:
    return path.exists() and path.read_text(encoding="utf-8") == schema_text()


def check_all_schemas() -> bool:
    return (
        check_schema()
        and DEFAULT_MCP_REQUEST_SCHEMA_PATH.exists()
        and DEFAULT_MCP_REQUEST_SCHEMA_PATH.read_text(encoding="utf-8") == mcp_request_schema_text()
        and DEFAULT_MCP_RESPONSE_SCHEMA_PATH.exists()
        and DEFAULT_MCP_RESPONSE_SCHEMA_PATH.read_text(encoding="utf-8")
        == mcp_response_schema_text()
        and DEFAULT_MCP_MAPPING_SCHEMA_PATH.exists()
        and DEFAULT_MCP_MAPPING_SCHEMA_PATH.read_text(encoding="utf-8") == mcp_mapping_schema_text()
        and DEFAULT_CORRECTION_PLAN_SCHEMA_PATH.exists()
        and DEFAULT_CORRECTION_PLAN_SCHEMA_PATH.read_text(encoding="utf-8")
        == correction_plan_schema_text()
        and DEFAULT_CORRECTION_APPROVAL_SCHEMA_PATH.exists()
        and DEFAULT_CORRECTION_APPROVAL_SCHEMA_PATH.read_text(encoding="utf-8")
        == correction_approval_schema_text()
    )


def validate_document(document: Any, schema_path: Path = DEFAULT_SCHEMA_PATH) -> None:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema).validate(document)


def _validate_with_schema(document: Any, schema_path: Path) -> None:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema).validate(document)


def validate_correction_plan_document(document: Any) -> None:
    _validate_with_schema(document, DEFAULT_CORRECTION_PLAN_SCHEMA_PATH)


def validate_correction_approval_document(document: Any) -> None:
    _validate_with_schema(document, DEFAULT_CORRECTION_APPROVAL_SCHEMA_PATH)
