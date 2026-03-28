#!/usr/bin/env python3
"""
validate-drawio.py — Validate the XML structure of a .drawio diagram file.

Usage:
    python scripts/validate-drawio.py <path-to-file.drawio>

Exit codes:
    0  All checks passed
    1  One or more validation errors found
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def _error(msg: str, errors: list) -> None:
    errors.append(msg)
    print(f"  ERROR: {msg}")


def validate_file(path: Path) -> list[str]:
    """Parse and validate a single .drawio file. Returns list of error strings."""
    errors: list[str] = []

    # --- XML well-formedness ---
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        return [f"XML parse error: {exc}"]

    root = tree.getroot()
    if root.tag != "mxfile":
        _error(f"Root element must be <mxfile>, got <{root.tag}>", errors)
        return errors

    diagrams = root.findall("diagram")
    if not diagrams:
        _error("No <diagram> elements found inside <mxfile>", errors)
        return errors

    for d_idx, diagram in enumerate(diagrams):
        d_name = diagram.get("name", f"page-{d_idx}")
        prefix = f"[diagram '{d_name}']"

        # Find mxGraphModel (may be direct child or base64-encoded; we handle direct only)
        graph_model = diagram.find("mxGraphModel")
        if graph_model is None:
            print(f"  SKIP {prefix}: mxGraphModel not found as direct child (may be compressed)")
            continue

        root_elem = graph_model.find("root")
        if root_elem is None:
            _error(f"{prefix} Missing <root> element inside <mxGraphModel>", errors)
            continue

        cells = root_elem.findall("mxCell")
        cell_ids: dict[str, ET.Element] = {}
        has_id0 = False
        has_id1 = False

        # --- Collect all IDs, check for root cells ---
        for cell in cells:
            cid = cell.get("id")
            if cid is None:
                _error(f"{prefix} Found <mxCell> without an 'id' attribute", errors)
                continue
            if cid in cell_ids:
                _error(f"{prefix} Duplicate cell id='{cid}'", errors)
            cell_ids[cid] = cell
            if cid == "0":
                has_id0 = True
            if cid == "1":
                has_id1 = True

        if not has_id0:
            _error(f"{prefix} Missing required root cell id='0'", errors)
        if not has_id1:
            _error(f"{prefix} Missing required default-layer cell id='1'", errors)

        # L2: id="0" must be the first cell, id="1" must be the second cell
        if len(cells) >= 1 and cells[0].get("id") != "0":
            _error(
                f"{prefix} First <mxCell> must have id='0', "
                f"got id='{cells[0].get('id')}'",
                errors,
            )
        if len(cells) >= 2 and cells[1].get("id") != "1":
            _error(
                f"{prefix} Second <mxCell> must have id='1', "
                f"got id='{cells[1].get('id')}'",
                errors,
            )
        # L3: id="1" must have parent="0"
        for cell in cells:
            if cell.get("id") == "1" and cell.get("parent") != "0":
                _error(
                    f"{prefix} Cell id='1' must have parent='0', "
                    f"got parent='{cell.get('parent')}'",
                    errors,
                )
        # H2: Every diagram page must contain a title cell
        # (a vertex with style containing 'text;' and 'fontSize=18')
        def _is_title_style(style: str) -> bool:
            """Return True if the style string identifies a draw.io title text cell."""
            return (
                (style.startswith("text;") or ";text;" in style)
                and "fontSize=18" in style
            )

        has_title_cell = any(
            c.get("vertex") == "1" and _is_title_style(c.get("style") or "")
            for c in cells
        )
        if not has_title_cell:
            _error(
                f"{prefix} No title cell found — add a vertex with style "
                "containing 'text;' and 'fontSize=18' at the top of the page",
                errors,
            )

        # --- Check each cell for structural validity ---
        for cell in cells:
            cid = cell.get("id", "<unknown>")
            is_vertex = cell.get("vertex") == "1"
            is_edge = cell.get("edge") == "1"

            # Parent must exist (skip the root cell id=0 which has no parent)
            parent = cell.get("parent")
            if cid != "0":
                if parent is None:
                    _error(f"{prefix} Cell id='{cid}' is missing a 'parent' attribute", errors)
                elif parent not in cell_ids:
                    _error(
                        f"{prefix} Cell id='{cid}' references unknown parent='{parent}'",
                        errors,
                    )

            # Vertex cells must have mxGeometry
            if is_vertex:
                geom = cell.find("mxGeometry")
                if geom is None:
                    _error(
                        f"{prefix} Vertex cell id='{cid}' is missing <mxGeometry>",
                        errors,
                    )

            # Edge cells must have source and target, both must exist.
            # Exception: floating edges (e.g. sequence diagram lifelines) use
            # sourcePoint/targetPoint in mxGeometry instead of source/target attributes.
            if is_edge:
                source = cell.get("source")
                target = cell.get("target")
                geom = cell.find("mxGeometry")
                has_source_point = geom is not None and any(
                    p.get("as") == "sourcePoint" for p in geom.findall("mxPoint")
                )
                has_target_point = geom is not None and any(
                    p.get("as") == "targetPoint" for p in geom.findall("mxPoint")
                )
                if source is None and not has_source_point:
                    _error(
                        f"{prefix} Edge cell id='{cid}' is missing 'source' attribute "
                        f"(and no sourcePoint in mxGeometry)",
                        errors,
                    )
                elif source is not None and source not in cell_ids:
                    _error(
                        f"{prefix} Edge id='{cid}' references unknown source='{source}'",
                        errors,
                    )
                if target is None and not has_target_point:
                    _error(
                        f"{prefix} Edge cell id='{cid}' is missing 'target' attribute "
                        f"(and no targetPoint in mxGeometry)",
                        errors,
                    )
                elif target is not None and target not in cell_ids:
                    _error(
                        f"{prefix} Edge id='{cid}' references unknown target='{target}'",
                        errors,
                    )

    return errors


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python validate-drawio.py <diagram.drawio>")
        return 1

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"File not found: {path}")
        return 1
    if not path.is_file():
        print(f"Not a file: {path}")
        return 1

    print(f"Validating: {path}")
    errors = validate_file(path)

    if errors:
        print(f"\nFAIL — {len(errors)} error(s) found.")
        return 1

    print("PASS — No errors found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
