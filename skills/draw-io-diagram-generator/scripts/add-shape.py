#!/usr/bin/env python3
"""
add-shape.py — Add a new vertex shape to an existing .drawio diagram file.

Usage:
    python scripts/add-shape.py <diagram.drawio> <label> <x> <y> [options]

Examples:
    python scripts/add-shape.py docs/flowchart.drawio "New Step" 400 300
    python scripts/add-shape.py docs/arch.drawio "Decision" 400 400 \\
        --width 160 --height 80 \\
        --style "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;"
    python scripts/add-shape.py docs/arch.drawio "Preview Node" 200 200 --dry-run
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path


DEFAULT_STYLE = "rounded=1;whiteSpace=wrap;html=1;"


def _indent_xml(elem: ET.Element, level: int = 0) -> None:
    """Indent XML tree in-place. Replaces ET.indent() for Python 3.8 compatibility."""
    indent = "\n" + "  " * level
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = indent + "  "
        if not elem.tail or not elem.tail.strip():
            elem.tail = indent
        for child in elem:
            _indent_xml(child, level + 1)
        # last child tail
        if not child.tail or not child.tail.strip():
            child.tail = indent
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = indent
    if not level:
        elem.tail = "\n"


def _generate_id(label: str, x: int, y: int) -> str:
    """Generate a short deterministic-ish id based on label + position + time."""
    seed = f"{label}:{x}:{y}:{time.time_ns()}"
    return "auto_" + hashlib.sha1(seed.encode()).hexdigest()[:8]


def add_shape(
    path: Path,
    label: str,
    x: int,
    y: int,
    width: int = 120,
    height: int = 60,
    style: str = DEFAULT_STYLE,
    diagram_index: int = 0,
    dry_run: bool = False,
) -> int:
    """
    Parse the .drawio file, insert a new vertex cell into the specified diagram page,
    and write the file back (unless dry_run is True).

    Returns:
        0 on success, 1 on failure.
    """
    # Preserve the original XML declaration / indentation by writing raw bytes.
    ET.register_namespace("", "")

    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        print(f"ERROR: XML parse error in '{path}': {exc}")
        return 1

    mxfile = tree.getroot()
    if mxfile.tag != "mxfile":
        print(f"ERROR: Root element must be <mxfile>, got <{mxfile.tag}>")
        return 1

    diagrams = mxfile.findall("diagram")
    if diagram_index >= len(diagrams):
        print(
            f"ERROR: diagram-index {diagram_index} is out of range "
            f"(file has {len(diagrams)} diagram(s))"
        )
        return 1

    diagram = diagrams[diagram_index]
    graph_model = diagram.find("mxGraphModel")
    if graph_model is None:
        print(
            "ERROR: <mxGraphModel> not found as direct child. "
            "Compressed diagrams are not supported."
        )
        return 1

    root_elem = graph_model.find("root")
    if root_elem is None:
        print("ERROR: <root> element not found inside <mxGraphModel>")
        return 1

    # Determine parent id — default to "1" (the default layer)
    parent_id = "1"
    existing_ids = {c.get("id") for c in root_elem.findall("mxCell") if c.get("id")}
    if parent_id not in existing_ids:
        # Fallback to the first cell id that isn't "0"
        for c in root_elem.findall("mxCell"):
            cid = c.get("id")
            if cid and cid != "0":
                parent_id = cid
                break

    # Generate a unique id
    new_id = _generate_id(label, x, y)
    while new_id in existing_ids:
        new_id = _generate_id(label + "_", x, y)

    # Build the new mxCell element
    new_cell = ET.Element("mxCell")
    new_cell.set("id", new_id)
    new_cell.set("value", label)
    new_cell.set("style", style)
    new_cell.set("vertex", "1")
    new_cell.set("parent", parent_id)

    geom = ET.SubElement(new_cell, "mxGeometry")
    geom.set("x", str(x))
    geom.set("y", str(y))
    geom.set("width", str(width))
    geom.set("height", str(height))
    geom.set("as", "geometry")

    if dry_run:
        print("DRY RUN — new cell XML (not written):")
        print(ET.tostring(new_cell, encoding="unicode"))
        print(f"\nWould add to diagram '{diagram.get('name', diagram_index)}' in '{path}'")
        return 0

    root_elem.append(new_cell)

    # Write back preserving XML declaration (uses _indent_xml for Python 3.8 compat)
    _indent_xml(tree.getroot())
    tree.write(str(path), encoding="utf-8", xml_declaration=True)

    print(
        f"Added shape id=\"{new_id}\" to page {diagram_index} "
        f"('{diagram.get('name', '')}') of {path}"
    )
    return 0


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Add a shape to an existing .drawio diagram file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("diagram", help="Path to the .drawio file")
    parser.add_argument("label", help="Text label for the new shape")
    parser.add_argument("x", type=int, help="X coordinate (pixels)")
    parser.add_argument("y", type=int, help="Y coordinate (pixels)")
    parser.add_argument("--width", type=int, default=120, help="Shape width (default: 120)")
    parser.add_argument("--height", type=int, default=60, help="Shape height (default: 60)")
    parser.add_argument(
        "--style",
        default=DEFAULT_STYLE,
        help=f'draw.io style string (default: "{DEFAULT_STYLE}")',
    )
    parser.add_argument(
        "--diagram-index",
        type=int,
        default=0,
        help="0-based index of the diagram page to add to (default: 0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the new cell XML without writing to file",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    path = Path(args.diagram)

    if not path.exists():
        print(f"ERROR: File not found: {path}")
        return 1
    if not path.is_file():
        print(f"ERROR: Not a file: {path}")
        return 1

    return add_shape(
        path=path,
        label=args.label,
        x=args.x,
        y=args.y,
        width=args.width,
        height=args.height,
        style=args.style,
        diagram_index=args.diagram_index,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
