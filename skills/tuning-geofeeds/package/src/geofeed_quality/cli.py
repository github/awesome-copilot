# Copyright 2026 Fastah Inc.
"""Command-line interface for local analysis, rendering, and schema drift checks."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path

from .analyzer import analyze_file
from .corrections import (
    _write_atomic_new,
    export_corrected_csv,
    propose_corrections,
    record_approval,
)
from .errors import AnalysisError
from .geojson_renderer import export_geojson_file
from .html_renderer import MapboxOptions, render_html_file
from .mcp_exchange import export_request_exchange, import_response_batches, request_bytes
from .models import Analysis, CorrectionApproval, CorrectionPlan, McpSearchMode, PublisherProfile
from .rdap import AuthoritativeRdapClient, RdapRuntimeConfig, enrich_analysis
from .renderer import render_markdown_file
from .schema import (
    DEFAULT_SCHEMA_PATH,
    check_all_schemas,
    check_schema,
    validate_correction_approval_document,
    validate_correction_plan_document,
    validate_document,
    write_all_schemas,
    write_schema,
)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="geofeed-quality",
        description="Analyze and review public RFC 8805 geofeeds without changing authored data.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""examples:
  geofeed-quality analyze feed.csv --output analysis.json
  geofeed-quality render analysis.json --output analysis.md
  geofeed-quality render-html analysis.json --output dashboard.html
  geofeed-quality export-geojson analysis.json --output analysis.geojson

exit status:
  0  command succeeded
  1  schema check detected drift
  2  invalid arguments, input, output, or filesystem operation

Requested output files are created atomically and are never overwritten.""",
    )
    subcommands = parser.add_subparsers(dest="command", required=True)

    analyze = subcommands.add_parser("analyze", help="analyze a local RFC 8805 CSV file")
    analyze.add_argument("input", type=Path)
    analyze.add_argument("--output", type=Path, required=True)
    analyze.add_argument(
        "--rdap", action="store_true", help="query authoritative RIR RDAP services"
    )
    analyze.add_argument("--publisher-profile", type=Path)
    analyze.add_argument("--rdap-connect-timeout", type=float, default=5.0)
    analyze.add_argument("--rdap-read-timeout", type=float, default=10.0)
    analyze.add_argument("--rdap-response-byte-limit", type=int, default=1_048_576)
    analyze.add_argument("--rdap-max-redirects", type=int, default=3)
    analyze.add_argument("--rdap-max-concurrency", type=int, default=2)
    analyze.add_argument("--rdap-min-interval", type=float, default=0.5)

    render = subcommands.add_parser("render", help="render a validated analysis JSON document")
    render.add_argument("input", type=Path)
    render.add_argument("--output", type=Path, required=True)

    render_html = subcommands.add_parser(
        "render-html", help="render an offline-first HTML dashboard from validated IR"
    )
    render_html.add_argument("input", type=Path)
    render_html.add_argument("--output", type=Path, required=True)
    render_html.add_argument(
        "--mapbox-token-file",
        type=Path,
        help="UTF-8 file containing a public pk.* token; token is embedded only in HTML",
    )
    render_html.add_argument(
        "--mapbox-style",
        help="mapbox://styles/<owner>/<style> or api.mapbox.com styles/v1 URL",
    )

    geojson = subcommands.add_parser(
        "export-geojson", help="export privacy-allowlisted geographic evidence from validated IR"
    )
    geojson.add_argument("input", type=Path)
    geojson.add_argument("--output", type=Path, required=True)

    propose = subcommands.add_parser(
        "propose-corrections", help="generate conservative proposals without approving them"
    )
    propose.add_argument("input", type=Path)
    propose.add_argument("--output", type=Path, required=True, help="Analysis IR with proposals")
    propose.add_argument("--plan", type=Path, required=True, help="human-reviewable plan JSON")

    approve = subcommands.add_parser(
        "record-approval", help="record explicit approve/reject decisions for a correction plan"
    )
    approve.add_argument("plan", type=Path)
    approve.add_argument("--approver", required=True, help="user/host supplied approver label")
    approve.add_argument(
        "--decided-at",
        type=datetime.fromisoformat,
        required=True,
        help="user/host supplied timezone-aware ISO 8601 decision time",
    )
    approve.add_argument("--approve", action="append", default=[], metavar="PROPOSAL_ID")
    approve.add_argument("--reject", action="append", default=[], metavar="PROPOSAL_ID")
    approve.add_argument("--output", type=Path, required=True)

    export_csv = subcommands.add_parser(
        "export-csv", help="apply explicitly approved proposals and export a complete feed"
    )
    export_csv.add_argument("input", type=Path, help="validated Analysis IR with proposals")
    export_csv.add_argument("approval", type=Path, help="validated explicit approval artifact")
    export_csv.add_argument("--source", type=Path, required=True, help="original local source feed")
    export_csv.add_argument("--output", type=Path, required=True, help="new corrected CSV path")
    export_csv.add_argument(
        "--final-analysis", type=Path, required=True, help="new IR recording applied proposals"
    )

    mcp_export = subcommands.add_parser(
        "mcp-export", help="export host-invoked place-search request batches from validated IR"
    )
    mcp_export.add_argument("input", type=Path)
    mcp_export.add_argument("--output-dir", type=Path, required=True)
    mcp_export.add_argument("--batch-limit", type=int, required=True)
    mcp_export.add_argument(
        "--search-mode",
        type=McpSearchMode,
        choices=tuple(McpSearchMode),
        default=McpSearchMode.AUTO,
    )

    mcp_import = subcommands.add_parser(
        "mcp-import", help="import host-captured place-search responses into validated IR"
    )
    mcp_import.add_argument("input", type=Path)
    mcp_import.add_argument("responses", type=Path, nargs="+")
    mcp_import.add_argument("--mapping", type=Path, required=True)
    mcp_import.add_argument("--output", type=Path, required=True)
    mcp_import.add_argument("--batch-limit", type=int, required=True)
    mcp_import.add_argument(
        "--search-mode",
        type=McpSearchMode,
        choices=tuple(McpSearchMode),
        default=McpSearchMode.AUTO,
    )

    schema = subcommands.add_parser("schema", help="manage the committed JSON Schema")
    schema.add_argument("action", choices=("generate", "check"))
    schema.add_argument("--path", type=Path, default=DEFAULT_SCHEMA_PATH)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "analyze":
            analysis = analyze_file(args.input)
            if args.publisher_profile and not args.rdap:
                raise ValueError("--publisher-profile requires --rdap")
            if args.rdap:
                profile = None
                if args.publisher_profile:
                    profile = PublisherProfile.model_validate_json(
                        args.publisher_profile.read_text(encoding="utf-8")
                    )
                config = RdapRuntimeConfig(
                    connect_timeout_seconds=args.rdap_connect_timeout,
                    read_timeout_seconds=args.rdap_read_timeout,
                    response_byte_limit=args.rdap_response_byte_limit,
                    max_redirects=args.rdap_max_redirects,
                    max_concurrency=args.rdap_max_concurrency,
                    min_interval_per_rir_seconds=args.rdap_min_interval,
                )
                analysis = enrich_analysis(
                    analysis, AuthoritativeRdapClient.from_iana(config=config), profile
                )
            document = analysis.model_dump(mode="json")
            validate_document(document)
            _write_atomic_new(args.output, (json.dumps(document, indent=2) + "\n").encode())
            return 0
        if args.command == "render":
            _write_atomic_new(args.output, render_markdown_file(args.input).encode())
            return 0
        if args.command == "render-html":
            if bool(args.mapbox_token_file) != bool(args.mapbox_style):
                raise ValueError("--mapbox-token-file and --mapbox-style must be supplied together")
            options = None
            if args.mapbox_token_file:
                options = MapboxOptions(
                    token=args.mapbox_token_file.read_text(encoding="utf-8").strip(),
                    style=args.mapbox_style,
                )
            _write_atomic_new(args.output, render_html_file(args.input, options).encode())
            return 0
        if args.command == "export-geojson":
            document = export_geojson_file(args.input)
            _write_atomic_new(args.output, (json.dumps(document, indent=2) + "\n").encode())
            if not document["features"]:
                print(
                    "info: GeoJSON contains zero features because no MCP place evidence "
                    "with valid coordinates or bounds is present",
                    file=sys.stderr,
                )
            return 0
        if args.command == "propose-corrections":
            document = json.loads(args.input.read_text(encoding="utf-8"))
            validate_document(document)
            analysis = Analysis.model_validate(document)
            proposed, plan = propose_corrections(analysis)
            if args.output.resolve() == args.input.resolve() or args.plan.resolve() in {
                args.input.resolve(),
                args.output.resolve(),
            }:
                raise ValueError("proposal outputs must be new paths distinct from the input")
            proposed_document = proposed.model_dump(mode="json")
            plan_document = plan.model_dump(mode="json")
            validate_document(proposed_document)
            validate_correction_plan_document(plan_document)
            _write_atomic_new(
                args.output, (json.dumps(proposed_document, indent=2) + "\n").encode()
            )
            try:
                _write_atomic_new(args.plan, (json.dumps(plan_document, indent=2) + "\n").encode())
            except Exception:
                args.output.unlink(missing_ok=True)
                raise
            return 0
        if args.command == "record-approval":
            plan_document = json.loads(args.plan.read_text(encoding="utf-8"))
            validate_correction_plan_document(plan_document)
            plan = CorrectionPlan.model_validate(plan_document)
            approval = record_approval(
                plan,
                args.approver,
                list(args.approve),
                list(args.reject),
                args.decided_at,
            )
            approval_document = approval.model_dump(mode="json")
            validate_correction_approval_document(approval_document)
            if args.output.resolve() == args.plan.resolve():
                raise ValueError("approval output must be a new path distinct from the plan")
            _write_atomic_new(
                args.output, (json.dumps(approval_document, indent=2) + "\n").encode()
            )
            return 0
        if args.command == "export-csv":
            document = json.loads(args.input.read_text(encoding="utf-8"))
            approval_document = json.loads(args.approval.read_text(encoding="utf-8"))
            validate_document(document)
            validate_correction_approval_document(approval_document)
            analysis = Analysis.model_validate(document)
            approval = CorrectionApproval.model_validate(approval_document)
            finalized, remaining = export_corrected_csv(
                analysis, approval, args.source, args.output, args.final_analysis
            )
            print(
                json.dumps(
                    {
                        "analysisId": finalized.analysis_id,
                        "applied": len(finalized.corrections.applied_proposal_ids),
                        "remainingFindingRuleIds": remaining,
                    },
                    sort_keys=True,
                )
            )
            return 0
        if args.command == "mcp-export":
            document = json.loads(args.input.read_text(encoding="utf-8"))
            validate_document(document)
            analysis = Analysis.model_validate(document)
            batches, mapping = export_request_exchange(analysis, args.batch_limit, args.search_mode)
            args.output_dir.mkdir(parents=True, exist_ok=True)
            mapping_path = args.output_dir / "mapping.json"
            if any(args.output_dir.glob("batch-*.json")) or mapping_path.exists():
                raise ValueError("output directory already contains MCP exchange files")
            for index, batch in enumerate(batches, start=1):
                path = args.output_dir / f"batch-{index:06d}.json"
                path.write_bytes(request_bytes(batch))
            mapping_path.write_text(
                json.dumps(mapping.model_dump(mode="json", by_alias=True), indent=2) + "\n",
                encoding="utf-8",
            )
            return 0
        if args.command == "mcp-import":
            document = json.loads(args.input.read_text(encoding="utf-8"))
            validate_document(document)
            analysis = Analysis.model_validate(document)
            responses = [
                json.loads(response.read_text(encoding="utf-8")) for response in args.responses
            ]
            mapping = json.loads(args.mapping.read_text(encoding="utf-8"))
            enriched = import_response_batches(
                analysis, responses, mapping, args.batch_limit, args.search_mode
            )
            output = enriched.model_dump(mode="json")
            validate_document(output)
            _write_atomic_new(args.output, (json.dumps(output, indent=2) + "\n").encode())
            return 0
        if args.action == "generate":
            if args.path == DEFAULT_SCHEMA_PATH:
                write_all_schemas()
            else:
                write_schema(args.path)
            return 0
        schemas_match = (
            check_all_schemas() if args.path == DEFAULT_SCHEMA_PATH else check_schema(args.path)
        )
        if schemas_match:
            return 0
        print(f"schema drift: regenerate {args.path}", file=sys.stderr)
        return 1
    except (AnalysisError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
