#!/usr/bin/env python3
"""
Add arrows (connections) between elements in Excalidraw diagrams.

Usage:
    python add-arrow.py <diagram_path> <from_x> <from_y> <to_x> <to_y> [OPTIONS]

Options:
    --style {solid|dashed|dotted}    Arrow line style (default: solid)
    --color HEX                      Arrow color (default: #1e1e1e)
    --label TEXT                     Add text label on the arrow
    --use-edit-suffix                Edit via .excalidraw.edit to avoid editor overwrite issues (enabled by default; use --no-use-edit-suffix to disable)

Examples:
    python add-arrow.py diagram.excalidraw 300 200 500 300
    python add-arrow.py diagram.excalidraw 300 200 500 300 --label "HTTP"
    python add-arrow.py diagram.excalidraw 300 200 500 300 --style dashed --color "#7950f2"
    python add-arrow.py diagram.excalidraw 300 200 500 300 --use-edit-suffix
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Dict, Any


def generate_unique_id() -> str:
    """Generate a unique ID for Excalidraw elements."""
    return str(uuid.uuid4()).replace('-', '')[:16]


def prepare_edit_path(diagram_path: Path, use_edit_suffix: bool) -> tuple[Path, Path | None]:
    """
    Prepare a safe edit path to avoid editor overwrite issues.

    Returns:
        (work_path, final_path)
        - work_path: file path to read/write during edit
        - final_path: file path to rename back to (or None if not used)
    """
    if not use_edit_suffix:
        return diagram_path, None

    if diagram_path.suffix != ".excalidraw":
        return diagram_path, None

    edit_path = diagram_path.with_suffix(diagram_path.suffix + ".edit")

    if diagram_path.exists():
        if edit_path.exists():
            raise FileExistsError(f"Edit file already exists: {edit_path}")
        diagram_path.rename(edit_path)

    return edit_path, diagram_path


def finalize_edit_path(work_path: Path, final_path: Path | None) -> None:
    """Finalize edit by renaming .edit back to .excalidraw if needed."""
    if final_path is None:
        return

    if final_path.exists():
        final_path.unlink()

    work_path.rename(final_path)


def create_arrow(
    from_x: float,
    from_y: float,
    to_x: float,
    to_y: float,
    style: str = "solid",
    color: str = "#1e1e1e",
    label: str = None
) -> list:
    """
    Create an arrow element.
    
    Args:
        from_x: Starting X coordinate
        from_y: Starting Y coordinate
        to_x: Ending X coordinate
        to_y: Ending Y coordinate
        style: Line style (solid, dashed, dotted)
        color: Arrow color
        label: Optional text label on the arrow
    
    Returns:
        List of elements (arrow and optional label)
    """
    elements = []
    
    # Arrow element
    arrow = {
        "id": generate_unique_id(),
        "type": "arrow",
        "x": from_x,
        "y": from_y,
        "width": to_x - from_x,
        "height": to_y - from_y,
        "angle": 0,
        "strokeColor": color,
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": style,
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "index": "a0",
        "roundness": {
            "type": 2
        },
        "seed": 1000000000 + hash(f"{from_x}{from_y}{to_x}{to_y}") % 1000000000,
        "version": 1,
        "versionNonce": 2000000000 + hash(f"{from_x}{from_y}{to_x}{to_y}") % 1000000000,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1738195200000,
        "link": None,
        "locked": False,
        "points": [
            [0, 0],
            [to_x - from_x, to_y - from_y]
        ],
        "startBinding": None,
        "endBinding": None,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "lastCommittedPoint": None
    }
    elements.append(arrow)
    
    # Optional label
    if label:
        mid_x = (from_x + to_x) / 2 - (len(label) * 5)
        mid_y = (from_y + to_y) / 2 - 10
        
        label_element = {
            "id": generate_unique_id(),
            "type": "text",
            "x": mid_x,
            "y": mid_y,
            "width": len(label) * 10,
            "height": 20,
            "angle": 0,
            "strokeColor": color,
            "backgroundColor": "transparent",
            "fillStyle": "solid",
            "strokeWidth": 2,
            "strokeStyle": "solid",
            "roughness": 1,
            "opacity": 100,
            "groupIds": [],
            "frameId": None,
            "index": "a0",
            "roundness": None,
            "seed": 1000000000 + hash(label) % 1000000000,
            "version": 1,
            "versionNonce": 2000000000 + hash(label) % 1000000000,
            "isDeleted": False,
            "boundElements": [],
            "updated": 1738195200000,
            "link": None,
            "locked": False,
            "text": label,
            "fontSize": 14,
            "fontFamily": 5,
            "textAlign": "center",
            "verticalAlign": "top",
            "containerId": None,
            "originalText": label,
            "autoResize": True,
            "lineHeight": 1.25
        }
        elements.append(label_element)
    
    return elements


def add_arrow_to_diagram(
    diagram_path: Path,
    from_x: float,
    from_y: float,
    to_x: float,
    to_y: float,
    style: str = "solid",
    color: str = "#1e1e1e",
    label: str = None
) -> None:
    """
    Add an arrow to an Excalidraw diagram.
    
    Args:
        diagram_path: Path to the Excalidraw diagram file
        from_x: Starting X coordinate
        from_y: Starting Y coordinate
        to_x: Ending X coordinate
        to_y: Ending Y coordinate
        style: Line style (solid, dashed, dotted)
        color: Arrow color
        label: Optional text label
    """
    print(f"Creating arrow from ({from_x}, {from_y}) to ({to_x}, {to_y})")
    arrow_elements = create_arrow(from_x, from_y, to_x, to_y, style, color, label)
    
    if label:
        print(f"  With label: '{label}'")
    
    # Load diagram
    print(f"Loading diagram: {diagram_path}")
    with open(diagram_path, 'r', encoding='utf-8') as f:
        diagram = json.load(f)
    
    # Add arrow elements
    if 'elements' not in diagram:
        diagram['elements'] = []
    
    original_count = len(diagram['elements'])
    diagram['elements'].extend(arrow_elements)
    print(f"  Added {len(arrow_elements)} elements (total: {original_count} -> {len(diagram['elements'])})")
    
    # Save diagram
    print(f"Saving diagram")
    with open(diagram_path, 'w', encoding='utf-8') as f:
        json.dump(diagram, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully added arrow to diagram")


def main():
    """Main entry point."""
    if len(sys.argv) < 6:
        print("Usage: python add-arrow.py <diagram_path> <from_x> <from_y> <to_x> <to_y> [OPTIONS]")
        print("\nOptions:")
        print("  --style {solid|dashed|dotted}    Line style (default: solid)")
        print("  --color HEX                      Color (default: #1e1e1e)")
        print("  --label TEXT                     Text label on arrow")
        print("  --use-edit-suffix                Edit via .excalidraw.edit to avoid editor overwrite issues (enabled by default; use --no-use-edit-suffix to disable)")
        print("\nExamples:")
        print("  python add-arrow.py diagram.excalidraw 300 200 500 300")
        print("  python add-arrow.py diagram.excalidraw 300 200 500 300 --label 'HTTP'")
        sys.exit(1)
    
    diagram_path = Path(sys.argv[1])
    from_x = float(sys.argv[2])
    from_y = float(sys.argv[3])
    to_x = float(sys.argv[4])
    to_y = float(sys.argv[5])
    
    # Parse optional arguments
    style = "solid"
    color = "#1e1e1e"
    label = None
    # Default: use edit suffix to avoid editor overwrite issues
    use_edit_suffix = True
    
    i = 6
    while i < len(sys.argv):
        if sys.argv[i] == '--style':
            if i + 1 < len(sys.argv):
                style = sys.argv[i + 1]
                if style not in ['solid', 'dashed', 'dotted']:
                    print(f"Error: Invalid style '{style}'. Must be: solid, dashed, or dotted")
                    sys.exit(1)
                i += 2
            else:
                print("Error: --style requires an argument")
                sys.exit(1)
        elif sys.argv[i] == '--color':
            if i + 1 < len(sys.argv):
                color = sys.argv[i + 1]
                i += 2
            else:
                print("Error: --color requires an argument")
                sys.exit(1)
        elif sys.argv[i] == '--label':
            if i + 1 < len(sys.argv):
                label = sys.argv[i + 1]
                i += 2
            else:
                print("Error: --label requires a text argument")
                sys.exit(1)
        elif sys.argv[i] == '--use-edit-suffix':
            use_edit_suffix = True
            i += 1
        elif sys.argv[i] == '--no-use-edit-suffix':
            use_edit_suffix = False
            i += 1
        else:
            print(f"Error: Unknown option: {sys.argv[i]}")
            sys.exit(1)
    
    # Validate inputs
    if not diagram_path.exists():
        print(f"Error: Diagram file not found: {diagram_path}")
        sys.exit(1)
    
    try:
        work_path, final_path = prepare_edit_path(diagram_path, use_edit_suffix)
        add_arrow_to_diagram(work_path, from_x, from_y, to_x, to_y, style, color, label)
        finalize_edit_path(work_path, final_path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
