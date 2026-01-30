#!/usr/bin/env python3
"""
Add icons from Excalidraw libraries to diagrams.

This script reads an icon JSON file from an Excalidraw library, transforms its coordinates
to a target position, generates unique IDs, and adds it to an existing Excalidraw diagram.
Works with any Excalidraw library (AWS, GCP, Azure, Kubernetes, etc.).

Usage:
    python add-icon-to-diagram.py <diagram_path> <icon_name> <x> <y> [OPTIONS]

Options:
    --library-path PATH    Path to the icon library directory (default: aws-architecture-icons)
    --label TEXT           Add a text label below the icon
    --use-edit-suffix      Edit via .excalidraw.edit to avoid editor overwrite issues (enabled by default; use --no-use-edit-suffix to disable)

Examples:
    python add-icon-to-diagram.py diagram.excalidraw EC2 500 300
    python add-icon-to-diagram.py diagram.excalidraw EC2 500 300 --label "Web Server"
    python add-icon-to-diagram.py diagram.excalidraw VPC 200 150 --library-path libraries/gcp-icons
    python add-icon-to-diagram.py diagram.excalidraw EC2 500 300 --use-edit-suffix
"""

import json
import sys
import uuid
from pathlib import Path
from typing import Dict, List, Any, Tuple


def generate_unique_id() -> str:
    """Generate a unique ID for Excalidraw elements."""
    return str(uuid.uuid4()).replace('-', '')[:16]


def calculate_bounding_box(elements: List[Dict[str, Any]]) -> Tuple[float, float, float, float]:
    """Calculate the bounding box (min_x, min_y, max_x, max_y) of icon elements."""
    if not elements:
        return (0, 0, 0, 0)
    
    min_x = float('inf')
    min_y = float('inf')
    max_x = float('-inf')
    max_y = float('-inf')
    
    for element in elements:
        if 'x' in element and 'y' in element:
            x = element['x']
            y = element['y']
            width = element.get('width', 0)
            height = element.get('height', 0)
            
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x + width)
            max_y = max(max_y, y + height)
    
    return (min_x, min_y, max_x, max_y)


def transform_icon_elements(
    elements: List[Dict[str, Any]], 
    target_x: float, 
    target_y: float
) -> List[Dict[str, Any]]:
    """
    Transform icon elements to target coordinates with unique IDs.
    
    Args:
        elements: Icon elements from JSON file
        target_x: Target X coordinate (top-left position)
        target_y: Target Y coordinate (top-left position)
    
    Returns:
        Transformed elements with new coordinates and IDs
    """
    if not elements:
        return []
    
    # Calculate bounding box
    min_x, min_y, max_x, max_y = calculate_bounding_box(elements)
    
    # Calculate offset
    offset_x = target_x - min_x
    offset_y = target_y - min_y
    
    # Create ID mapping: old_id -> new_id
    id_mapping = {}
    for element in elements:
        if 'id' in element:
            old_id = element['id']
            id_mapping[old_id] = generate_unique_id()
    
    # Create group ID mapping
    group_id_mapping = {}
    for element in elements:
        if 'groupIds' in element:
            for old_group_id in element['groupIds']:
                if old_group_id not in group_id_mapping:
                    group_id_mapping[old_group_id] = generate_unique_id()
    
    # Transform elements
    transformed = []
    for element in elements:
        new_element = element.copy()
        
        # Update coordinates
        if 'x' in new_element:
            new_element['x'] = new_element['x'] + offset_x
        if 'y' in new_element:
            new_element['y'] = new_element['y'] + offset_y
        
        # Update ID
        if 'id' in new_element:
            new_element['id'] = id_mapping[new_element['id']]
        
        # Update group IDs
        if 'groupIds' in new_element:
            new_element['groupIds'] = [
                group_id_mapping[gid] for gid in new_element['groupIds']
            ]
        
        # Update binding references if they exist
        if 'startBinding' in new_element and new_element['startBinding']:
            if 'elementId' in new_element['startBinding']:
                old_id = new_element['startBinding']['elementId']
                if old_id in id_mapping:
                    new_element['startBinding']['elementId'] = id_mapping[old_id]
        
        if 'endBinding' in new_element and new_element['endBinding']:
            if 'elementId' in new_element['endBinding']:
                old_id = new_element['endBinding']['elementId']
                if old_id in id_mapping:
                    new_element['endBinding']['elementId'] = id_mapping[old_id]
        
        # Update containerId if it exists
        if 'containerId' in new_element and new_element['containerId']:
            old_id = new_element['containerId']
            if old_id in id_mapping:
                new_element['containerId'] = id_mapping[old_id]
        
        # Update boundElements if they exist
        if 'boundElements' in new_element and new_element['boundElements']:
            new_bound_elements = []
            for bound_elem in new_element['boundElements']:
                if isinstance(bound_elem, dict) and 'id' in bound_elem:
                    old_id = bound_elem['id']
                    if old_id in id_mapping:
                        bound_elem['id'] = id_mapping[old_id]
                new_bound_elements.append(bound_elem)
            new_element['boundElements'] = new_bound_elements
        
        transformed.append(new_element)
    
    return transformed


def load_icon(icon_name: str, library_path: Path) -> List[Dict[str, Any]]:
    """
    Load icon elements from library.
    
    Args:
        icon_name: Name of the icon (e.g., "EC2", "VPC")
        library_path: Path to the icon library directory
    
    Returns:
        List of icon elements
    """
    icon_file = library_path / "icons" / f"{icon_name}.json"
    
    if not icon_file.exists():
        raise FileNotFoundError(f"Icon file not found: {icon_file}")
    
    with open(icon_file, 'r', encoding='utf-8') as f:
        icon_data = json.load(f)
    
    return icon_data.get('elements', [])


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


def create_text_label(text: str, x: float, y: float) -> Dict[str, Any]:
    """
    Create a text label element.
    
    Args:
        text: Label text
        x: X coordinate
        y: Y coordinate
    
    Returns:
        Text element dictionary
    """
    return {
        "id": generate_unique_id(),
        "type": "text",
        "x": x,
        "y": y,
        "width": len(text) * 10,  # Approximate width
        "height": 20,
        "angle": 0,
        "strokeColor": "#1e1e1e",
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
        "seed": 1000000000 + hash(text) % 1000000000,
        "version": 1,
        "versionNonce": 2000000000 + hash(text) % 1000000000,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1738195200000,
        "link": None,
        "locked": False,
        "text": text,
        "fontSize": 16,
        "fontFamily": 5,  # Excalifont
        "textAlign": "center",
        "verticalAlign": "top",
        "containerId": None,
        "originalText": text,
        "autoResize": True,
        "lineHeight": 1.25
    }


def add_icon_to_diagram(
    diagram_path: Path,
    icon_name: str,
    x: float,
    y: float,
    library_path: Path,
    label: str = None
) -> None:
    """
    Add an icon to an Excalidraw diagram.
    
    Args:
        diagram_path: Path to the Excalidraw diagram file
        icon_name: Name of the icon to add
        x: Target X coordinate
        y: Target Y coordinate
        library_path: Path to the icon library directory
        label: Optional text label to add below the icon
    """
    # Load icon elements
    print(f"Loading icon: {icon_name}")
    icon_elements = load_icon(icon_name, library_path)
    print(f"  Loaded {len(icon_elements)} elements")
    
    # Transform icon elements
    print(f"Transforming to position ({x}, {y})")
    transformed_elements = transform_icon_elements(icon_elements, x, y)
    
    # Calculate icon bounding box for label positioning
    if label and transformed_elements:
        min_x, min_y, max_x, max_y = calculate_bounding_box(transformed_elements)
        icon_width = max_x - min_x
        icon_height = max_y - min_y
        
        # Position label below icon, centered
        label_x = min_x + (icon_width / 2) - (len(label) * 5)
        label_y = max_y + 10
        
        label_element = create_text_label(label, label_x, label_y)
        transformed_elements.append(label_element)
        print(f"  Added label: '{label}'")
    
    # Load diagram
    print(f"Loading diagram: {diagram_path}")
    with open(diagram_path, 'r', encoding='utf-8') as f:
        diagram = json.load(f)
    
    # Add transformed elements
    if 'elements' not in diagram:
        diagram['elements'] = []
    
    original_count = len(diagram['elements'])
    diagram['elements'].extend(transformed_elements)
    print(f"  Added {len(transformed_elements)} elements (total: {original_count} -> {len(diagram['elements'])})")
    
    # Save diagram
    print(f"Saving diagram")
    with open(diagram_path, 'w', encoding='utf-8') as f:
        json.dump(diagram, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully added '{icon_name}' icon to diagram")


def main():
    """Main entry point."""
    if len(sys.argv) < 5:
        print("Usage: python add-icon-to-diagram.py <diagram_path> <icon_name> <x> <y> [OPTIONS]")
        print("\nOptions:")
        print("  --library-path PATH    Path to icon library directory")
        print("  --label TEXT           Add text label below icon")
        print("  --use-edit-suffix      Edit via .excalidraw.edit to avoid editor overwrite issues (enabled by default; use --no-use-edit-suffix to disable)")
        print("\nExamples:")
        print("  python add-icon-to-diagram.py diagram.excalidraw EC2 500 300")
        print("  python add-icon-to-diagram.py diagram.excalidraw EC2 500 300 --label 'Web Server'")
        sys.exit(1)
    
    diagram_path = Path(sys.argv[1])
    icon_name = sys.argv[2]
    x = float(sys.argv[3])
    y = float(sys.argv[4])
    
    # Default library path
    script_dir = Path(__file__).parent
    default_library_path = script_dir.parent / "libraries" / "aws-architecture-icons"
    
    # Parse optional arguments
    library_path = default_library_path
    label = None
    # Default: use edit suffix to avoid editor overwrite issues
    use_edit_suffix = True
    
    i = 5
    while i < len(sys.argv):
        if sys.argv[i] == '--library-path':
            if i + 1 < len(sys.argv):
                library_path = Path(sys.argv[i + 1])
                i += 2
            else:
                print("Error: --library-path requires a path argument")
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
    
    if not library_path.exists():
        print(f"Error: Library path not found: {library_path}")
        sys.exit(1)
    
    try:
        work_path, final_path = prepare_edit_path(diagram_path, use_edit_suffix)
        add_icon_to_diagram(work_path, icon_name, x, y, library_path, label)
        finalize_edit_path(work_path, final_path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

