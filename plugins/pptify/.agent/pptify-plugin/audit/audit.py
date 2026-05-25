from __future__ import annotations

"""Standalone collision-detection audit for layout_tree specs.

Works entirely on plain dicts — no pptify package required.
Accepts a layout_tree dict (as produced by the agent or by pptx_extractor)
and returns a list of colliding object pairs.

Usage (as a script):
    python audit.py spec.json          # prints collisions for each slide
    python audit.py spec.json --json   # prints JSON audit report
"""

import json
import sys
from pathlib import Path
from typing import Any


def detect_content_collisions(tree: dict[str, Any]) -> list[dict[str, str]]:
    """Return pairs of objects whose bounding boxes overlap.

    Args:
        tree: A layout_tree dict with an ``objects`` mapping.

    Returns:
        A list of ``{"first_object_id": ..., "second_object_id": ...}`` dicts.
    """
    positioned_objects = [
        obj
        for obj in tree.get("objects", {}).values()
        if obj.get("bbox")
    ]
    collisions: list[dict[str, str]] = []
    for first_index, first_obj in enumerate(positioned_objects):
        for second_obj in positioned_objects[first_index + 1 :]:
            if _intersects(first_obj["bbox"], second_obj["bbox"], padding=0.01):
                collisions.append({"first_object_id": first_obj["id"], "second_object_id": second_obj["id"]})
    return collisions


FONT_SIZE_FLOOR = 9.0  # pt — below this threshold text is unreadable at presentation scale


def detect_small_fonts(tree: dict[str, Any], floor: float = FONT_SIZE_FLOOR) -> list[dict[str, Any]]:
    """Return content objects whose ``style.font_size`` is below *floor* pt.

    Only objects with ``classification: "content"`` are checked; decorative
    ``layout_design`` objects (dots, rule lines, etc.) are skipped.
    """
    violations: list[dict[str, Any]] = []
    for obj in tree.get("objects", {}).values():
        if obj.get("classification") == "layout_design":
            continue
        size = obj.get("style", {}).get("font_size")
        if size is not None and float(size) < floor:
            violations.append({"object_id": obj["id"], "font_size": size, "floor": floor})
    return violations


def audit_spec(spec: dict[str, Any]) -> dict[str, Any]:
    """Audit all slides in a deck spec (``{"slides": [...]}``).

    Each slide must have a ``layout_tree`` key.
    Returns a summary with per-slide collision lists and small-font warnings.
    """
    results: list[dict[str, Any]] = []
    total_collisions = 0
    total_small_fonts = 0
    for slide in spec.get("slides", []):
        tree = slide.get("layout_tree") or {}
        slide_id = str(slide.get("id") or tree.get("id") or "unknown")
        collisions = detect_content_collisions(tree)
        small_fonts = detect_small_fonts(tree)
        total_collisions += len(collisions)
        total_small_fonts += len(small_fonts)
        results.append(
            {
                "slide_id": slide_id,
                "collision_count": len(collisions),
                "collisions": collisions,
                "small_font_count": len(small_fonts),
                "small_fonts": small_fonts,
            }
        )
    return {
        "slide_count": len(results),
        "total_collisions": total_collisions,
        "total_small_fonts": total_small_fonts,
        "slides": results,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _intersects(a: dict[str, float], b: dict[str, float], padding: float = 0.0) -> bool:
    """Return True if bbox *a* overlaps expanded bbox *b* (by *padding* on each side)."""
    bx = b["x"] - padding
    by = b["y"] - padding
    br = b["x"] + b["width"] + padding
    bb = b["y"] + b["height"] + padding
    epsilon = 0.0001
    ax, ay = a["x"], a["y"]
    ar = a["x"] + a["width"]
    ab_ = a["y"] + a["height"]
    return ax < br - epsilon and ar > bx + epsilon and ay < bb - epsilon and ab_ > by + epsilon


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------


def _main(argv: list[str]) -> None:
    if not argv:
        print("Usage: python audit.py <spec.json> [--json]", file=sys.stderr)
        sys.exit(1)
    spec_path = Path(argv[0])
    as_json = "--json" in argv
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    # Support both a full spec with "slides" and a bare layout_tree
    if "slides" in spec:
        report = audit_spec(spec)
    else:
        collisions = detect_content_collisions(spec)
        small_fonts = detect_small_fonts(spec)
        report = {
            "slide_count": 1,
            "total_collisions": len(collisions),
            "total_small_fonts": len(small_fonts),
            "slides": [{"slide_id": "root", "collision_count": len(collisions), "collisions": collisions, "small_font_count": len(small_fonts), "small_fonts": small_fonts}],
        }
    if as_json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"Slides: {report['slide_count']}  Total collisions: {report['total_collisions']}  Small fonts (<{FONT_SIZE_FLOOR}pt): {report['total_small_fonts']}")
        for slide in report["slides"]:
            if slide["collision_count"]:
                print(f"  Slide {slide['slide_id']}: {slide['collision_count']} collision(s)")
                for c in slide["collisions"]:
                    print(f"    {c['first_object_id']} <-> {c['second_object_id']}")
            if slide["small_font_count"]:
                print(f"  Slide {slide['slide_id']}: {slide['small_font_count']} small-font object(s)")
                for f in slide["small_fonts"]:
                    print(f"    {f['object_id']}: {f['font_size']}pt (floor {f['floor']}pt)")


if __name__ == "__main__":
    _main(sys.argv[1:])
