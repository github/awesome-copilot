#!/usr/bin/env python3
"""
Excalidraw Library Splitter

This script splits an Excalidraw library file (*.excalidrawlib) into individual
icon JSON files and generates a reference.md file for easy lookup.

The script expects the following structure:
  skills/excalidraw-diagram-generator/libraries/{icon-set-name}/
    {icon-set-name}.excalidrawlib  (place this file first)

Usage:
    python split-excalidraw-library.py <path-to-library-directory>

Example:
    python split-excalidraw-library.py skills/excalidraw-diagram-generator/libraries/aws-architecture-icons/
"""

import json
import os
import re
import sys
from pathlib import Path


def sanitize_filename(name: str) -> str:
    """
    Sanitize icon name to create a valid filename.

    Args:
        name: Original icon name

    Returns:
        Sanitized filename safe for all platforms
    """
    # Replace spaces with hyphens
    filename = name.replace(' ', '-')

    # Remove or replace special characters
    filename = re.sub(r'[^\w\-.]', '', filename)

    # Remove multiple consecutive hyphens
    filename = re.sub(r'-+', '-', filename)

    # Remove leading/trailing hyphens
    filename = filename.strip('-')

    return filename


def find_library_file(directory: Path) -> Path:
    """
    Find the .excalidrawlib file in the given directory.

    Args:
        directory: Directory to search

    Returns:
        Path to the library file

    Raises:
        SystemExit: If no library file or multiple library files found
    """
    library_files = list(directory.glob('*.excalidrawlib'))

    if len(library_files) == 0:
        print(f"Error: No .excalidrawlib file found in {directory}")
        print(f"Please place a .excalidrawlib file in {directory} first.")
        sys.exit(1)

    if len(library_files) > 1:
        print(f"Error: Multiple .excalidrawlib files found in {directory}")
        print(f"Please keep only one library file in {directory}.")
        sys.exit(1)

    return library_files[0]


def split_library(library_dir: str) -> None:
    """
    Split an Excalidraw library file into individual icon files.

    Args:
        library_dir: Path to the directory containing the .excalidrawlib file
    """
    library_dir = Path(library_dir)

    if not library_dir.exists():
        print(f"Error: Directory not found: {library_dir}")
        sys.exit(1)

    if not library_dir.is_dir():
        print(f"Error: Path is not a directory: {library_dir}")
        sys.exit(1)

    # Find the library file
    library_path = find_library_file(library_dir)
    print(f"Found library: {library_path.name}")

    # Load library file
    print(f"Loading library data...")
    with open(library_path, 'r', encoding='utf-8') as f:
        library_data = json.load(f)

    # Validate library structure
    if 'libraryItems' not in library_data:
        print("Error: Invalid library file format (missing 'libraryItems')")
        sys.exit(1)

    # Create icons directory
    icons_dir = library_dir / 'icons'
    icons_dir.mkdir(exist_ok=True)
    print(f"Output directory: {library_dir}")

    # Process each library item (icon)
    library_items = library_data['libraryItems']
    icon_list = []

    print(f"Processing {len(library_items)} icons...")

    for item in library_items:
        # Get icon name
        icon_name = item.get('name', 'Unnamed')

        # Create sanitized filename
        filename = sanitize_filename(icon_name) + '.json'

        # Save icon data
        icon_path = icons_dir / filename
        with open(icon_path, 'w', encoding='utf-8') as f:
            json.dump(item, f, ensure_ascii=False, indent=2)

        # Add to reference list
        icon_list.append({
            'name': icon_name,
            'filename': filename
        })

        print(f"  ✓ {icon_name} → {filename}")

    # Sort icon list by name
    icon_list.sort(key=lambda x: x['name'])

    # Generate reference.md
    library_name = library_path.stem
    reference_path = library_dir / 'reference.md'
    with open(reference_path, 'w', encoding='utf-8') as f:
        f.write(f"# {library_name} Reference\n\n")
        f.write(f"This directory contains {len(icon_list)} icons extracted from `{library_path.name}`.\n\n")
        f.write("## Available Icons\n\n")
        f.write("| Icon Name | Filename |\n")
        f.write("|-----------|----------|\n")

        for icon in icon_list:
            f.write(f"| {icon['name']} | `icons/{icon['filename']}` |\n")

        f.write("\n## Usage\n\n")
        f.write("Each icon JSON file contains the complete `elements` array needed to render that icon in Excalidraw.\n")
        f.write("You can copy the elements from these files into your Excalidraw diagrams.\n")

    print(f"\n✅ Successfully split library into {len(icon_list)} icons")
    print(f"📄 Reference file created: {reference_path}")
    print(f"📁 Icons directory: {icons_dir}")


def main():
    """Main entry point."""
    if hasattr(sys.stdout, "reconfigure"):
        # Ensure consistent UTF-8 output on Windows consoles.
        sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        print("Usage: python split-excalidraw-library.py <path-to-library-directory>")
        print("\nExample:")
        print("  python split-excalidraw-library.py skills/excalidraw-diagram-generator/libraries/aws-architecture-icons/")
        print("\nNote: The directory should contain a .excalidrawlib file.")
        sys.exit(1)

    library_dir = sys.argv[1]
    split_library(library_dir)


if __name__ == '__main__':
    main()
