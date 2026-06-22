# PPTX Python Snippets

This file preserves the historical Python extraction snippets as documentation only.

- Do not treat these snippets as bundled runtime modules.
- Do not import from this file or recreate `.py` files under this skill as packaged resources.
- When a task needs extraction or style analysis, use these snippets as reference while writing task-local code with `python-pptx`.

## `pptx_style_master.py` Reference Snippet

```python
from __future__ import annotations

import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable
from xml.etree import ElementTree

EMU_PER_INCH = 914400
DRAWING_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


class PptxStyleMaster:
    """Extract compact design context from a reference PPTX for prompt-based generation."""

    def __init__(self, max_slides: int = 12, max_items: int = 10) -> None:
        self.max_slides = max_slides
        self.max_items = max_items

    def analyze(self, path: str | Path) -> dict[str, Any]:
        from pptx import Presentation

        pptx_path = Path(path)
        presentation = Presentation(str(pptx_path))
        slide_size = {
            "width": _inches(presentation.slide_width),
            "height": _inches(presentation.slide_height),
        }
        theme = _theme_from_package(pptx_path)

        colors: Counter[str] = Counter()
        fonts: Counter[str] = Counter()
        font_sizes: Counter[float] = Counter()
        shape_styles: Counter[str] = Counter()
        layout_names: Counter[str] = Counter()
        master_names: Counter[str] = Counter()
        slide_layouts: list[dict[str, Any]] = []

        _count_theme_tokens(theme, colors, fonts)
        for slide_index, slide in enumerate(presentation.slides, start=1):
            if slide_index > self.max_slides:
                break
            slide_context = _slide_design_context(slide, slide_index, slide_size, self.max_items)
            slide_layouts.append(slide_context)
            layout_names[slide_context["template_layout"]] += 1
            master_names[slide_context["template_master"]] += 1
            colors.update(slide_context.pop("_colors"))
            fonts.update(slide_context.pop("_fonts"))
            font_sizes.update(slide_context.pop("_font_sizes"))
            shape_styles.update(slide_context.pop("_shape_styles"))

        return {
            "styles": {
                "colors": _top_items(colors, self.max_items),
                "fonts": _top_items(fonts, self.max_items),
                "font_sizes": _top_items(font_sizes, self.max_items),
                "shape_styles": _top_items(shape_styles, self.max_items),
            },
            "brands": _brand_context(colors, fonts, theme, self.max_items),
            "template": _template_context(presentation, slide_size, theme, layout_names, master_names, self.max_items),
            "layout": {
                "analyzed_slide_count": len(slide_layouts),
                "layout_usage": _top_items(layout_names, self.max_items),
                "master_usage": _top_items(master_names, self.max_items),
                "slides": slide_layouts,
            },
        }


def extract_pptx_style_master(path: str | Path, max_slides: int = 12, max_items: int = 10) -> dict[str, Any]:
    return PptxStyleMaster(max_slides=max_slides, max_items=max_items).analyze(path)


def _slide_design_context(slide, slide_index: int, slide_size: dict[str, float], max_items: int) -> dict[str, Any]:
    colors: Counter[str] = Counter()
    fonts: Counter[str] = Counter()
    font_sizes: Counter[float] = Counter()
    shape_styles: Counter[str] = Counter()
    object_counts: Counter[str] = Counter()
    regions: Counter[str] = Counter()
    placeholders: list[dict[str, Any]] = []
    object_samples: list[dict[str, Any]] = []
    boxes: list[dict[str, float]] = []

    for shape in _iter_shapes(slide.shapes):
        kind = _shape_kind(shape)
        bbox = _bbox(shape)
        boxes.append(bbox)
        object_counts[kind] += 1
        regions[_region(bbox, slide_size)] += 1

        shape_colors = _shape_colors(shape)
        colors.update(shape_colors.values())
        shape_text = _text_preview(shape)
        text_styles = _text_styles(shape)
        fonts.update(text_styles["fonts"])
        font_sizes.update(text_styles["font_sizes"])
        colors.update(text_styles["colors"])

        style_signature = _style_signature(shape_colors, text_styles)
        if style_signature:
            shape_styles[style_signature] += 1

        if getattr(shape, "is_placeholder", False) and len(placeholders) < max_items:
            placeholders.append(_placeholder_context(shape, bbox))

        if len(object_samples) < max_items:
            sample: dict[str, Any] = {
                "kind": kind,
                "role": _shape_role(shape, kind),
                "bbox": bbox,
                "region": _region(bbox, slide_size),
            }
            if shape_text:
                sample["text"] = shape_text
            if shape_colors:
                sample["colors"] = shape_colors
            if text_styles["fonts"]:
                sample["fonts"] = _top_items(text_styles["fonts"], 3)
            if text_styles["font_sizes"]:
                sample["font_sizes"] = _top_items(text_styles["font_sizes"], 3)
            object_samples.append(sample)

    return {
        "index": slide_index,
        "template_layout": _slide_layout_name(slide),
        "template_master": _slide_master_name(slide),
        "object_counts": dict(sorted(object_counts.items())),
        "placeholder_count": len(placeholders),
        "placeholders": placeholders,
        "dominant_regions": _top_items(regions, max_items),
        "dominant_flow": _dominant_flow(boxes, slide_size),
        "occupied_area_ratio": _occupied_area_ratio(boxes, slide_size),
        "objects": object_samples,
        "_colors": colors,
        "_fonts": fonts,
        "_font_sizes": font_sizes,
        "_shape_styles": shape_styles,
    }


def _template_context(
    presentation,
    slide_size: dict[str, float],
    theme: dict[str, Any],
    layout_names: Counter[str],
    master_names: Counter[str],
    max_items: int,
) -> dict[str, Any]:
    masters: list[dict[str, Any]] = []
    try:
        for master_index, master in enumerate(presentation.slide_masters, start=1):
            masters.append(
                {
                    "index": master_index,
                    "name": str(getattr(master, "name", f"Master {master_index}") or f"Master {master_index}"),
                    "layout_count": len(master.slide_layouts),
                }
            )
    except (AttributeError, TypeError):
        masters = []

    return {
        "slide_size": slide_size,
        "theme": theme,
        "masters": masters[:max_items],
        "layout_usage": _top_items(layout_names, max_items),
        "master_usage": _top_items(master_names, max_items),
    }


def _brand_context(colors: Counter[str], fonts: Counter[str], theme: dict[str, Any], max_items: int) -> dict[str, Any]:
    theme_colors = theme.get("colors", {}) if isinstance(theme.get("colors"), dict) else {}
    theme_accents = [value for name, value in theme_colors.items() if str(name).startswith("accent")]
    palette = _ranked_colors(colors, include_neutral=False)
    if not palette:
        palette = [color for color in theme_accents if _is_hex_color(color)]
    neutral_palette = _ranked_colors(colors, include_neutral=True, only_neutral=True)
    font_values = [str(item["value"]) for item in _top_items(fonts, max_items)]
    primary_color = palette[0] if palette else None
    accent_colors = _dedupe([*palette, *theme_accents])[:max_items]

    return {
        "theme_name": theme.get("name"),
        "primary_color": primary_color,
        "accent_colors": accent_colors,
        "neutral_colors": neutral_palette[:max_items],
        "fonts": font_values[:max_items],
        "theme_colors": theme_colors,
        "theme_fonts": theme.get("fonts", {}),
    }


def _theme_from_package(path: Path) -> dict[str, Any]:
    theme_paths: list[str]
    try:
        with zipfile.ZipFile(path) as package:
            theme_paths = sorted(name for name in package.namelist() if name.startswith("ppt/theme/theme") and name.endswith(".xml"))
            if not theme_paths:
                return {"name": None, "colors": {}, "fonts": {}}
            root = ElementTree.fromstring(package.read(theme_paths[0]))
    except (zipfile.BadZipFile, KeyError, ElementTree.ParseError):
        return {"name": None, "colors": {}, "fonts": {}}

    theme = {
        "name": root.attrib.get("name"),
        "path": theme_paths[0],
        "colors": {},
        "fonts": {},
    }
    color_scheme = root.find(f".//{DRAWING_NS}clrScheme")
    if color_scheme is not None:
        colors: dict[str, str] = {}
        for color_node in list(color_scheme):
            color_value = _theme_color_value(color_node)
            if color_value:
                colors[color_node.tag.rsplit("}", 1)[-1]] = color_value
        theme["colors"] = colors

    font_scheme = root.find(f".//{DRAWING_NS}fontScheme")
    if font_scheme is not None:
        fonts: dict[str, str] = {}
        for key, node_name in (("major", "majorFont"), ("minor", "minorFont")):
            latin = font_scheme.find(f".//{DRAWING_NS}{node_name}/{DRAWING_NS}latin")
            if latin is not None and latin.attrib.get("typeface"):
                fonts[key] = latin.attrib["typeface"]
        theme["fonts"] = fonts
    return theme


def _theme_color_value(color_node: ElementTree.Element) -> str | None:
    srgb = color_node.find(f".//{DRAWING_NS}srgbClr")
    if srgb is not None and srgb.attrib.get("val"):
        return _normalize_hex(srgb.attrib["val"])
    system = color_node.find(f".//{DRAWING_NS}sysClr")
    if system is not None and system.attrib.get("lastClr"):
        return _normalize_hex(system.attrib["lastClr"])
    return None


def _count_theme_tokens(theme: dict[str, Any], colors: Counter[str], fonts: Counter[str]) -> None:
    for color in theme.get("colors", {}).values() if isinstance(theme.get("colors"), dict) else []:
        if _is_hex_color(color):
            colors[color] += 1
    for font in theme.get("fonts", {}).values() if isinstance(theme.get("fonts"), dict) else []:
        if font:
            fonts[str(font)] += 1


def _iter_shapes(shapes) -> Iterable[Any]:
    for shape in shapes:
        yield shape
        if hasattr(shape, "shapes"):
            yield from _iter_shapes(shape.shapes)


def _shape_kind(shape) -> str:
    shape_type = str(getattr(getattr(shape, "shape_type", "unknown"), "name", "unknown")).lower()
    if getattr(shape, "has_table", False):
        return "table"
    if getattr(shape, "has_chart", False):
        return "chart"
    if "picture" in shape_type or _has_image(shape):
        return "image"
    if "line" in shape_type or "connector" in shape_type or "freeform" in shape_type:
        return "line"
    if getattr(shape, "has_text_frame", False) and getattr(shape, "text", "").strip():
        return "text"
    if hasattr(shape, "shapes"):
        return "group"
    return "shape"


def _has_image(shape) -> bool:
    try:
        return getattr(shape, "image", None) is not None
    except (AttributeError, TypeError, ValueError):
        return False


def _shape_role(shape, kind: str) -> str:
    if getattr(shape, "is_placeholder", False):
        try:
            return str(shape.placeholder_format.type).split(".")[-1].lower()
        except (AttributeError, ValueError):
            return "placeholder"
    name = str(getattr(shape, "name", "") or "").strip().lower()
    if "title" in name:
        return "title"
    return kind


def _shape_colors(shape) -> dict[str, str]:
    colors: dict[str, str] = {}
    fill = _format_color(_safe_attr(_safe_attr(shape, "fill"), "fore_color"))
    if fill:
        colors["fill"] = fill
    line = _format_color(_safe_attr(_safe_attr(shape, "line"), "color"))
    if line:
        colors["line"] = line
    return colors


def _safe_attr(value: Any, name: str) -> Any:
    if value is None:
        return None
    try:
        return getattr(value, name)
    except (AttributeError, TypeError, ValueError):
        return None


def _text_styles(shape) -> dict[str, Counter[Any]]:
    fonts: Counter[str] = Counter()
    font_sizes: Counter[float] = Counter()
    colors: Counter[str] = Counter()
    text_frame = getattr(shape, "text_frame", None)
    if text_frame is None:
        return {"fonts": fonts, "font_sizes": font_sizes, "colors": colors}

    for paragraph in text_frame.paragraphs:
        _count_font(paragraph.font, fonts, font_sizes, colors)
        for run in paragraph.runs:
            _count_font(run.font, fonts, font_sizes, colors)
    return {"fonts": fonts, "font_sizes": font_sizes, "colors": colors}


def _count_font(font, fonts: Counter[str], font_sizes: Counter[float], colors: Counter[str]) -> None:
    name = getattr(font, "name", None)
    if name:
        fonts[str(name)] += 1
    size = getattr(font, "size", None)
    if size is not None:
        font_sizes[round(size.pt, 2)] += 1
    color = _format_color(getattr(font, "color", None))
    if color:
        colors[color] += 1


def _format_color(color_format) -> str | None:
    if color_format is None:
        return None
    try:
        rgb = color_format.rgb
    except (AttributeError, TypeError, ValueError):
        rgb = None
    if rgb is not None:
        return _normalize_hex(str(rgb))
    try:
        theme_color = color_format.theme_color
    except (AttributeError, TypeError, ValueError):
        theme_color = None
    if theme_color:
        token = str(theme_color).split(".")[-1].lower()
        return f"theme:{token}"
    return None


def _style_signature(shape_colors: dict[str, str], text_styles: dict[str, Counter[Any]]) -> str:
    parts: list[str] = []
    if shape_colors.get("fill"):
        parts.append(f"fill={shape_colors['fill']}")
    if shape_colors.get("line"):
        parts.append(f"line={shape_colors['line']}")
    font = _top_value(text_styles["fonts"])
    if font:
        parts.append(f"font={font}")
    font_size = _top_value(text_styles["font_sizes"])
    if font_size:
        parts.append(f"font_size={font_size}")
    return "; ".join(parts)


def _placeholder_context(shape, bbox: dict[str, float]) -> dict[str, Any]:
    context: dict[str, Any] = {
        "name": str(getattr(shape, "name", "") or ""),
        "bbox": bbox,
    }
    try:
        context["type"] = str(shape.placeholder_format.type).split(".")[-1].lower()
        context["idx"] = int(shape.placeholder_format.idx)
    except (AttributeError, ValueError):
        context["type"] = "placeholder"
    return context


def _text_preview(shape, max_chars: int = 120) -> str:
    text = " ".join(str(getattr(shape, "text", "")).split())
    return text[:max_chars]


def _bbox(shape) -> dict[str, float]:
    return {
        "x": _inches(getattr(shape, "left", 0)),
        "y": _inches(getattr(shape, "top", 0)),
        "width": max(0.0, _inches(getattr(shape, "width", 0))),
        "height": max(0.0, _inches(getattr(shape, "height", 0))),
    }


def _region(bbox: dict[str, float], slide_size: dict[str, float]) -> str:
    width = max(slide_size["width"], 0.01)
    height = max(slide_size["height"], 0.01)
    center_x = (bbox["x"] + bbox["width"] / 2) / width
    center_y = (bbox["y"] + bbox["height"] / 2) / height
    horizontal = "left" if center_x < 0.34 else "right" if center_x > 0.66 else "center"
    vertical = "top" if center_y < 0.34 else "bottom" if center_y > 0.66 else "middle"
    return f"{vertical}_{horizontal}"


def _dominant_flow(boxes: list[dict[str, float]], slide_size: dict[str, float]) -> str:
    if len(boxes) < 2:
        return "single"
    centers_x = [(box["x"] + box["width"] / 2) / max(slide_size["width"], 0.01) for box in boxes]
    centers_y = [(box["y"] + box["height"] / 2) / max(slide_size["height"], 0.01) for box in boxes]
    spread_x = max(centers_x) - min(centers_x)
    spread_y = max(centers_y) - min(centers_y)
    if len(boxes) >= 4 and spread_x > 0.32 and spread_y > 0.32:
        return "grid"
    if spread_x > 0.42 and spread_y > 0.42:
        return "grid"
    if len(boxes) >= 3 and spread_x > 0.42:
        return "grid"
    if spread_x > spread_y * 1.4:
        return "row"
    if spread_y > spread_x * 1.4:
        return "column"
    return "overlay_or_balanced"


def _occupied_area_ratio(boxes: list[dict[str, float]], slide_size: dict[str, float]) -> float:
    slide_area = max(slide_size["width"] * slide_size["height"], 0.01)
    object_area = sum(box["width"] * box["height"] for box in boxes)
    return round(min(object_area / slide_area, 1.0), 3)


def _slide_layout_name(slide) -> str:
    try:
        return str(slide.slide_layout.name or "unnamed_layout")
    except AttributeError:
        return "unknown_layout"


def _slide_master_name(slide) -> str:
    try:
        master = slide.slide_layout.slide_master
        return str(master.name or "unnamed_master")
    except AttributeError:
        return "unknown_master"


def _top_items(counter: Counter[Any], limit: int) -> list[dict[str, Any]]:
    return [{"value": value, "count": count} for value, count in counter.most_common(limit)]


def _top_value(counter: Counter[Any]) -> Any | None:
    if not counter:
        return None
    return counter.most_common(1)[0][0]


def _ranked_colors(colors: Counter[str], include_neutral: bool, only_neutral: bool = False) -> list[str]:
    ranked: list[str] = []
    for color, _count in colors.most_common():
        if not _is_hex_color(color):
            continue
        neutral = _is_neutral(color)
        if only_neutral and not neutral:
            continue
        if not include_neutral and neutral:
            continue
        ranked.append(color)
    return ranked


def _is_neutral(color: str) -> bool:
    if not _is_hex_color(color):
        return False
    red = int(color[1:3], 16)
    green = int(color[3:5], 16)
    blue = int(color[5:7], 16)
    return max(red, green, blue) - min(red, green, blue) <= 18


def _is_hex_color(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 7 and value.startswith("#")


def _normalize_hex(value: str) -> str:
    stripped = value.strip().lstrip("#")
    if len(stripped) >= 6:
        return f"#{stripped[:6].upper()}"
    return f"#{stripped.upper()}"


def _dedupe(values: Iterable[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        if value and value not in deduped:
            deduped.append(value)
    return deduped


def _inches(value: int) -> float:
    return round(int(value) / EMU_PER_INCH, 4)
```

## `pptx_extractor.py` Reference Snippet

```python
from __future__ import annotations

import json
import posixpath
import sys
import zipfile
from base64 import b64encode
from collections import Counter
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

# Allow importing sibling pptx_style_master when run as a standalone script
sys.path.insert(0, str(Path(__file__).parent))
from pptx_style_master import PptxStyleMaster

EMU_PER_INCH = 914400
DRAWING_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


class PptxExtractor:
    def prompt_context(self, path: str | Path, max_chars: int = 16000) -> dict[str, Any]:
        from pptx import Presentation

        pptx_path = Path(path)
        presentation = Presentation(str(pptx_path))
        style_context = PptxStyleMaster().analyze(pptx_path)
        slides: list[dict[str, Any]] = []
        used_chars = 0
        for slide_index, slide in enumerate(presentation.slides, start=1):
            texts = _slide_text_fragments(slide.shapes)
            trimmed_texts: list[str] = []
            for text in texts:
                if used_chars >= max_chars:
                    break
                cleaned = _compact_text(text)
                if not cleaned:
                    continue
                remaining = max_chars - used_chars
                clipped = cleaned[: min(500, remaining)]
                trimmed_texts.append(clipped)
                used_chars += len(clipped)
            title = trimmed_texts[0] if trimmed_texts else f"Slide {slide_index}"
            slides.append(
                {
                    "index": slide_index,
                    "title": title[:120],
                    "text": trimmed_texts[:12],
                    "shape_count": len(slide.shapes),
                }
            )
        media_files, embedded_files = _package_asset_counts(pptx_path)
        return {
            "source": str(pptx_path),
            "slide_count": len(slides),
            "slide_size": {
                "width": _inches(presentation.slide_width),
                "height": _inches(presentation.slide_height),
            },
            "package_media_files": media_files,
            "embedded_files": embedded_files,
            "styles": style_context["styles"],
            "brands": style_context["brands"],
            "template": style_context["template"],
            "layout": style_context["layout"],
            "slides": slides,
        }

    def extract_file(self, path: str | Path, output_dir: str | Path | None = None, extract_media: bool = True) -> dict[str, Any]:
        from pptx import Presentation

        pptx_path = Path(path)
        presentation = Presentation(str(pptx_path))
        asset_dir = None
        embed_media = extract_media and output_dir is None
        if output_dir and extract_media:
            asset_dir = Path(output_dir) / f"{pptx_path.stem}_assets"
            asset_dir.mkdir(parents=True, exist_ok=True)
            _extract_package_media(pptx_path, asset_dir)

        notes_by_slide = _notes_by_slide(pptx_path)
        slides: list[dict[str, Any]] = []
        stats: Counter[str] = Counter()
        max_shapes = 0
        max_nested = 0
        for slide_index, slide in enumerate(presentation.slides, start=1):
            tree, slide_stats, render_elements = self._extract_slide(
                slide=slide,
                slide_index=slide_index,
                slide_size=(_inches(presentation.slide_width), _inches(presentation.slide_height)),
                source_path=pptx_path,
                asset_dir=asset_dir,
                embed_media=embed_media,
                notes=notes_by_slide.get(slide_index, []),
            )
            stats.update(slide_stats)
            max_shapes = max(max_shapes, slide_stats["top_level_shapes"])
            max_nested = max(max_nested, slide_stats["nested_shapes"])
            slides.append(
                {
                    "id": tree["id"],
                    "title": tree["title"],
                    "slide_size": tree["slide_size"],
                    "preserve_coordinates": True,
                    "render_mode": "ooxml",
                    "ooxml_elements": render_elements,
                    "layout_tree": tree,
                }
            )

        media_files, embedded_files = _package_asset_counts(pptx_path)
        style_context = PptxStyleMaster().analyze(pptx_path)
        summary = {
            "source": str(pptx_path),
            "slide_count": len(slides),
            "slide_size": {
                "width": _inches(presentation.slide_width),
                "height": _inches(presentation.slide_height),
            },
            "top_level_shapes": int(stats["top_level_shapes"]),
            "nested_shapes": int(stats["nested_shapes"]),
            "max_shapes_on_slide": max_shapes,
            "max_nested_shapes_on_slide": max_nested,
            "groups": int(stats["groups"]),
            "tables": int(stats["tables"]),
            "charts": int(stats["charts"]),
            "images": int(stats["images"]),
            "text_objects": int(stats["text_objects"]),
            "placeholders": int(stats["placeholders"]),
            "lines_or_freeforms": int(stats["lines_or_freeforms"]),
            "connectors": int(stats["connectors"]),
            "smartart": int(stats["smartart"]),
            "ole_objects": int(stats["ole_objects"]),
            "non_ascii_text": bool(stats["non_ascii_text"]),
            "notes_slides": int(stats["notes_slides"]),
            "package_media_files": media_files,
            "embedded_files": embedded_files,
            "styles": style_context["styles"],
            "brands": style_context["brands"],
            "template": style_context["template"],
            "layout": style_context["layout"],
        }
        return {
            "source_pptx": str(pptx_path.resolve()),
            "render_mode": "ooxml",
            "summary": summary,
            "slides": slides,
        }

    def extract_path(self, path: str | Path, output_dir: str | Path, extract_media: bool = True) -> dict[str, Any]:
        source = Path(path)
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        files = sorted(source.glob("*.pptx")) if source.is_dir() else [source]
        decks = []
        for pptx_file in files:
            deck = self.extract_file(pptx_file, output, extract_media=extract_media)
            json_path = output / f"{pptx_file.stem}.pptify.json"
            json_path.write_text(json.dumps(deck, indent=2, ensure_ascii=False), encoding="utf-8")
            decks.append({"pptx": str(pptx_file), "json": str(json_path), "summary": deck["summary"]})
        manifest = {"source": str(source), "decks": decks}
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
        return manifest

    def analyze_path(self, path: str | Path) -> dict[str, Any]:
        source = Path(path)
        files = sorted(source.glob("*.pptx")) if source.is_dir() else [source]
        return {"source": str(source), "decks": [self.extract_file(file, extract_media=False)["summary"] for file in files]}

    def _extract_slide(
        self,
        slide,
        slide_index: int,
        slide_size: tuple[float, float],
        source_path: Path,
        asset_dir: Path | None,
        embed_media: bool,
        notes: list[str],
    ) -> tuple[dict[str, Any], Counter[str], list[dict[str, Any]]]:
        root_id = f"slide_{slide_index}_root"
        root_group: dict[str, Any] = {
            "id": root_id,
            "role": "slide",
            "layout_mode": "absolute",
            "object_ids": [],
            "group_ids": [],
            "constraints": {},
            "collision_policy": "relaxed",
            "bbox": {"x": 0, "y": 0, "width": slide_size[0], "height": slide_size[1]},
        }
        groups: dict[str, dict[str, Any]] = {root_id: root_group}
        objects: dict[str, dict[str, Any]] = {}
        stats: Counter[str] = Counter(top_level_shapes=len(slide.shapes), notes_slides=1 if notes else 0)
        z_index = 0

        def walk(shapes, parent_group_id: str, prefix: str) -> None:
            nonlocal z_index
            for shape_index, shape in enumerate(shapes, start=1):
                z_index += 1
                stats["nested_shapes"] += 1
                shape_type = _shape_type_name(shape)
                if _is_group(shape):
                    group_id = f"{prefix}_group_{shape_index}"
                    groups[parent_group_id]["group_ids"].append(group_id)
                    groups[group_id] = {
                        "id": group_id,
                        "role": "extracted_group",
                        "layout_mode": "absolute",
                        "object_ids": [],
                        "group_ids": [],
                        "constraints": {},
                        "collision_policy": "relaxed",
                        "bbox": _bbox(shape),
                    }
                    stats["groups"] += 1
                    walk(shape.shapes, group_id, group_id)
                    continue

                object_id = f"{prefix}_shape_{shape_index}"
                slide_object = self._extract_object(shape, object_id, z_index, shape_type, source_path, asset_dir)
                objects[object_id] = slide_object
                groups[parent_group_id]["object_ids"].append(object_id)
                stats[_stat_key(slide_object)] += 1
                if getattr(shape, "is_placeholder", False):
                    stats["placeholders"] += 1
                if _contains_non_ascii(slide_object["content"].get("text", "")):
                    stats["non_ascii_text"] += 1

        walk(slide.shapes, root_id, f"slide_{slide_index}")
        render_elements = [
            _render_element(shape, f"slide_{slide_index}_element_{element_index}", source_path, asset_dir, embed_media)
            for element_index, shape in enumerate(slide.shapes, start=1)
        ]
        title = _slide_title(objects.values()) or f"Slide {slide_index}"
        background = _slide_background(slide)
        tree: dict[str, Any] = {
            "id": f"slide_{slide_index}",
            "title": title,
            "slide_size": {"width": slide_size[0], "height": slide_size[1]},
            "root_group_id": root_id,
            "groups": groups,
            "objects": objects,
            "notes": notes,
            "background": background,
        }
        return tree, stats, render_elements

    def _extract_object(self, shape, object_id: str, z_index: int, shape_type: str, source_path: Path, asset_dir: Path | None) -> dict[str, Any]:
        kind = _kind(shape, shape_type)
        content: dict[str, Any] = {"source_shape_type": shape_type}
        style: dict[str, Any] = {}
        if kind == "text":
            content["text"] = getattr(shape, "text", "")
            paragraphs = _rich_text(shape)
            if paragraphs:
                content["paragraphs"] = paragraphs
            style.update(_text_style(shape))
        elif kind == "table":
            content["rows"] = [[cell.text for cell in row.cells] for row in shape.table.rows]
            table_detail = _table_detail(shape)
            if table_detail:
                content["table"] = table_detail
            style["font_size"] = 8
        elif kind == "image":
            content["alt"] = getattr(shape, "name", "image")
            crop = _image_crop(shape)
            if crop:
                content["crop"] = crop
            if asset_dir is not None:
                image_data = _image_data(shape)
                if image_data is None:
                    content["missing_embedded_image"] = True
                else:
                    blob, extension, relationship_id, content_type = image_data
                    asset_path = asset_dir / f"{source_path.stem}_{object_id}.{extension}"
                    asset_path.write_bytes(blob)
                    content["path"] = str(asset_path)
                    content["content_type"] = content_type
                    if relationship_id:
                        content["media_relationship_id"] = relationship_id
        elif kind == "chart":
            content.update(_chart_detail(shape))
        elif kind in {"smartart", "ole"}:
            content["title"] = getattr(shape, "name", kind)
            if getattr(shape, "has_text_frame", False) and getattr(shape, "text", "").strip():
                content["text"] = shape.text
        elif kind in {"line", "connector"}:
            box = _bbox(shape)
            x, y, w, h = box["x"], box["y"], box["width"], box["height"]
            content.update(_line_endpoints(shape, x, y, w, h))
            line_style = _line_style(shape)
            style["line"] = (line_style or {}).get("line_color") or "#6B7280"
            if line_style:
                style.update(line_style)
            arrows = _connector_arrows(shape)
            if arrows:
                content["arrows"] = arrows
        elif getattr(shape, "has_text_frame", False) and getattr(shape, "text", ""):
            content["text"] = shape.text
            paragraphs = _rich_text(shape)
            if paragraphs:
                content["paragraphs"] = paragraphs
            style.update(_text_style(shape))
        else:
            content["shape"] = _geometry_name(shape) or "rect"

        _apply_visual_style(shape, kind, content, style)

        classification = "content" if kind in {"text", "table", "image", "chart", "smartart"} else "layout_design"
        if kind == "shape" and content.get("text"):
            classification = "content"
        return {
            "id": object_id,
            "kind": kind,
            "role": _role(shape, kind),
            "classification": classification,
            "content": content,
            "style": style,
            "constraints": {"source_name": getattr(shape, "name", "")},
            "bbox": _bbox(shape),
            "z_index": z_index,
        }


def _inches(value: int) -> float:
    return round(int(value) / EMU_PER_INCH, 4)


def _bbox(shape) -> dict[str, float]:
    return {
        "x": _inches(getattr(shape, "left", 0) or 0),
        "y": _inches(getattr(shape, "top", 0) or 0),
        "width": max(0.0, _inches(getattr(shape, "width", 0) or 0)),
        "height": max(0.0, _inches(getattr(shape, "height", 0) or 0)),
    }


def _shape_type_name(shape) -> str:
    shape_type = getattr(shape, "shape_type", "unknown")
    return str(getattr(shape_type, "name", shape_type)).lower()


def _is_group(shape) -> bool:
    return hasattr(shape, "shapes") and "group" in _shape_type_name(shape)


def _kind(shape, shape_type: str) -> str:
    if getattr(shape, "has_table", False):
        return "table"
    if getattr(shape, "has_chart", False):
        return "chart"
    graphic_uri = _graphic_data_uri(shape)
    if "diagram" in graphic_uri:
        return "smartart"
    if "ole" in graphic_uri:
        return "ole"
    if "picture" in shape_type or _has_image(shape):
        return "image"
    if _is_connector(shape):
        return "connector"
    if "line" in shape_type or "freeform" in shape_type or "connector" in shape_type:
        return "line"
    if getattr(shape, "has_text_frame", False) and getattr(shape, "text", "").strip():
        return "text"
    return "shape"


def _role(shape, kind: str) -> str:
    if getattr(shape, "is_placeholder", False):
        return "placeholder"
    if kind == "text":
        return "text"
    return kind


def _text_style(shape) -> dict[str, Any]:
    style: dict[str, Any] = {"font_size": 12}
    try:
        paragraph = shape.text_frame.paragraphs[0]
        run = paragraph.runs[0] if paragraph.runs else None
        font = run.font if run is not None else paragraph.font
        if font.size is not None:
            style["font_size"] = round(font.size.pt, 2)
        if font.bold is not None:
            style["bold"] = bool(font.bold)
        if font.name:
            style["font"] = font.name
    except (AttributeError, IndexError):
        pass
    return style


def _safe_attr(value: Any, name: str) -> Any:
    if value is None:
        return None
    try:
        return getattr(value, name)
    except (AttributeError, TypeError, ValueError):
        return None


def _enum_name(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).split("(")[0].strip().split(".")[-1]
    return text.lower() or None


def _normalize_hex(value: str) -> str:
    stripped = str(value).strip().lstrip("#")
    if len(stripped) >= 6:
        return f"#{stripped[:6].upper()}"
    return f"#{stripped.upper()}"


def _color_to_hex(color_format: Any) -> str | None:
    if color_format is None:
        return None
    try:
        if color_format.type is None:
            return None
    except (AttributeError, TypeError, ValueError):
        return None
    try:
        rgb = color_format.rgb
        if rgb is not None:
            return _normalize_hex(str(rgb))
    except (AttributeError, TypeError, ValueError):
        pass
    token = _enum_name(_safe_attr(color_format, "theme_color"))
    if token:
        return f"theme:{token}"
    return None


def _graphic_data_uri(shape) -> str:
    element = getattr(shape, "_element", None)
    if element is None or not element.tag.endswith("}graphicFrame"):
        return ""
    data = element.find(f".//{DRAWING_NS}graphicData")
    return data.get("uri", "") if data is not None else ""


def _is_connector(shape) -> bool:
    element = getattr(shape, "_element", None)
    return element is not None and element.tag.endswith("}cxnSp")


def _has_image(shape) -> bool:
    try:
        return getattr(shape, "image", None) is not None
    except (AttributeError, TypeError, ValueError):
        return False


def _image_crop(shape) -> dict[str, float] | None:
    crop: dict[str, float] = {}
    for attribute, key in (("crop_left", "left"), ("crop_right", "right"), ("crop_top", "top"), ("crop_bottom", "bottom")):
        value = _safe_attr(shape, attribute)
        if value:
            crop[key] = round(float(value), 4)
    return crop or None


def _geometry_name(shape) -> str | None:
    element = getattr(shape, "_element", None)
    if element is None:
        return None
    preset = element.find(f".//{DRAWING_NS}prstGeom")
    if preset is not None and preset.get("prst"):
        return preset.get("prst")
    if element.find(f".//{DRAWING_NS}custGeom") is not None:
        return "custom"
    return None


def _geometry(shape) -> dict[str, Any] | None:
    name = _geometry_name(shape)
    if name == "custom":
        return {"type": "custom"}
    if name:
        return {"type": "preset", "preset": name}
    return None


def _transform(shape) -> dict[str, Any] | None:
    transform: dict[str, Any] = {}
    rotation = getattr(shape, "rotation", 0) or 0
    if rotation:
        transform["rotation"] = round(float(rotation), 2)
    element = getattr(shape, "_element", None)
    if element is not None:
        xfrm = element.find(f".//{DRAWING_NS}xfrm")
        if xfrm is not None:
            if xfrm.get("flipH") == "1":
                transform["flip_h"] = True
            if xfrm.get("flipV") == "1":
                transform["flip_v"] = True
    return transform or None


def _gradient_stops(shape) -> list[str] | None:
    element = getattr(shape, "_element", None)
    if element is None:
        return None
    gradient = element.find(f".//{DRAWING_NS}gradFill")
    if gradient is None:
        return None
    stops: list[str] = []
    for stop in gradient.findall(f".//{DRAWING_NS}gs"):
        srgb = stop.find(f"{DRAWING_NS}srgbClr")
        if srgb is not None and srgb.get("val"):
            stops.append(_normalize_hex(srgb.get("val")))
            continue
        scheme = stop.find(f"{DRAWING_NS}schemeClr")
        if scheme is not None and scheme.get("val"):
            stops.append(f"theme:{scheme.get('val')}")
    return stops or None


def _fill_style(shape) -> dict[str, Any] | None:
    fill = _safe_attr(shape, "fill")
    if fill is None:
        return None
    try:
        fill_type = fill.type
    except (AttributeError, TypeError, ValueError, NotImplementedError):
        return None
    name = _enum_name(fill_type)
    if name in {None, "background"}:
        return None
    style: dict[str, Any] = {"fill_type": name}
    if name == "solid":
        color = _color_to_hex(_safe_attr(fill, "fore_color"))
        if color:
            style["fill_color"] = color
    elif name == "gradient":
        stops = _gradient_stops(shape)
        if stops:
            style["gradient_stops"] = stops
    return style


def _line_style(shape) -> dict[str, Any] | None:
    line = _safe_attr(shape, "line")
    if line is None:
        return None
    style: dict[str, Any] = {}
    color = _color_to_hex(_safe_attr(line, "color"))
    if color:
        style["line_color"] = color
    try:
        width = line.width
        if width is not None:
            style["line_width_pt"] = round(width.pt, 2)
    except (AttributeError, TypeError, ValueError):
        pass
    dash = _enum_name(_safe_attr(line, "dash_style"))
    if dash:
        style["line_dash"] = dash
    return style or None


def _line_endpoints(shape, x: float, y: float, width: float, height: float) -> dict[str, float]:
    transform = _transform(shape) or {}
    x1, x2 = (x + width, x) if transform.get("flip_h") else (x, x + width)
    y1, y2 = (y + height, y) if transform.get("flip_v") else (y, y + height)
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2}


def _connector_arrows(shape) -> dict[str, str] | None:
    element = getattr(shape, "_element", None)
    if element is None:
        return None
    line = element.find(f".//{DRAWING_NS}ln")
    if line is None:
        return None
    arrows: dict[str, str] = {}
    for tag, key in (("headEnd", "head"), ("tailEnd", "tail")):
        end = line.find(f"{DRAWING_NS}{tag}")
        if end is not None:
            arrow_type = end.get("type")
            if arrow_type and arrow_type != "none":
                arrows[key] = arrow_type
    return arrows or None


def _rich_text(shape) -> list[dict[str, Any]] | None:
    text_frame = getattr(shape, "text_frame", None)
    if text_frame is None:
        return None
    paragraphs: list[dict[str, Any]] = []
    for paragraph in text_frame.paragraphs:
        runs: list[dict[str, Any]] = []
        for run in paragraph.runs:
            run_info: dict[str, Any] = {"text": run.text}
            font = run.font
            size = _safe_attr(font, "size")
            if size is not None:
                run_info["font_size"] = round(size.pt, 2)
            if font.bold is not None:
                run_info["bold"] = bool(font.bold)
            if font.italic is not None:
                run_info["italic"] = bool(font.italic)
            if font.underline:
                run_info["underline"] = True
            if font.name:
                run_info["font"] = font.name
            color = _color_to_hex(_safe_attr(font, "color"))
            if color:
                run_info["color"] = color
            address = _safe_attr(_safe_attr(run, "hyperlink"), "address")
            if address:
                run_info["hyperlink"] = address
            runs.append(run_info)
        paragraph_info: dict[str, Any] = {}
        alignment = _enum_name(_safe_attr(paragraph, "alignment"))
        if alignment:
            paragraph_info["align"] = alignment
        level = getattr(paragraph, "level", 0) or 0
        if level:
            paragraph_info["level"] = int(level)
        if runs:
            paragraph_info["runs"] = runs
        elif paragraph.text:
            paragraph_info["text"] = paragraph.text
        if paragraph_info:
            paragraphs.append(paragraph_info)
    return paragraphs or None


def _table_detail(shape) -> dict[str, Any] | None:
    try:
        table = shape.table
    except (AttributeError, ValueError):
        return None
    rows = list(table.rows)
    columns = list(table.columns)
    detail: dict[str, Any] = {"row_count": len(rows), "col_count": len(columns)}
    try:
        detail["col_widths_in"] = [_inches(column.width or 0) for column in columns]
    except (AttributeError, TypeError, ValueError):
        pass
    try:
        detail["row_heights_in"] = [_inches(row.height or 0) for row in rows]
    except (AttributeError, TypeError, ValueError):
        pass
    for flag in ("first_row", "last_row", "first_col", "last_col", "horz_banding", "vert_banding"):
        if getattr(table, flag, None):
            detail[flag] = True
    merged: list[dict[str, int]] = []
    for row_index, row in enumerate(rows):
        for column_index, cell in enumerate(row.cells):
            if getattr(cell, "is_merge_origin", False):
                merged.append(
                    {
                        "row": row_index,
                        "col": column_index,
                        "span_rows": int(getattr(cell, "span_height", 1) or 1),
                        "span_cols": int(getattr(cell, "span_width", 1) or 1),
                    }
                )
    if merged:
        detail["merged_cells"] = merged
    return detail


def _chart_detail(shape) -> dict[str, Any]:
    detail: dict[str, Any] = {"title": getattr(shape, "name", "chart")}
    try:
        chart = shape.chart
    except (AttributeError, ValueError):
        return detail
    chart_type = _enum_name(_safe_attr(chart, "chart_type"))
    if chart_type:
        detail["chart_type"] = chart_type
    try:
        if chart.has_title and chart.chart_title.text_frame.text.strip():
            detail["chart_title"] = chart.chart_title.text_frame.text.strip()
    except (AttributeError, TypeError, ValueError):
        pass
    try:
        categories = [str(category) for category in chart.plots[0].categories if category is not None]
        if categories:
            detail["categories"] = categories[:50]
    except (AttributeError, IndexError, TypeError, ValueError):
        pass
    series_payload: list[dict[str, Any]] = []
    try:
        for series in chart.series:
            entry: dict[str, Any] = {}
            name = _safe_attr(series, "name")
            if name:
                entry["name"] = str(name)
            try:
                entry["values"] = [value for value in series.values][:50]
            except (AttributeError, TypeError, ValueError):
                pass
            if entry:
                series_payload.append(entry)
    except (AttributeError, TypeError, ValueError):
        pass
    if series_payload:
        detail["series"] = series_payload
    return detail


def _slide_background(slide) -> dict[str, Any] | None:
    try:
        fill = slide.background.fill
        fill_type = fill.type
    except (AttributeError, TypeError, ValueError, NotImplementedError):
        return None
    name = _enum_name(fill_type)
    if name in {None, "background"}:
        return None
    background: dict[str, Any] = {"fill_type": name}
    if name == "solid":
        color = _color_to_hex(_safe_attr(fill, "fore_color"))
        if color:
            background["color"] = color
    elif name == "gradient":
        stops = _gradient_stops(slide.background)
        if stops:
            background["gradient_stops"] = stops
    return background


def _apply_visual_style(shape, kind: str, content: dict[str, Any], style: dict[str, Any]) -> None:
    geometry = _geometry(shape)
    if geometry:
        content["geometry"] = geometry
    transform = _transform(shape)
    if transform:
        content["transform"] = transform
    fill = _fill_style(shape)
    if fill:
        style.update(fill)
    if kind not in {"line", "connector"}:
        line_style = _line_style(shape)
        if line_style:
            style.update(line_style)


def _image_data(shape) -> tuple[bytes, str, str | None, str] | None:
    try:
        image = shape.image
    except ValueError:
        image = None
    if image is not None:
        return image.blob, str(image.ext), None, image.content_type

    for relationship_id in _embedded_relationship_ids(shape):
        try:
            part = shape.part.related_part(relationship_id)
        except KeyError:
            continue
        blob = getattr(part, "blob", None)
        if not blob:
            continue
        extension = Path(str(getattr(part, "partname", "media.bin"))).suffix.lstrip(".") or _extension_from_content_type(
            getattr(part, "content_type", "")
        )
        return blob, extension or "bin", relationship_id, getattr(part, "content_type", "")
    return None


def _render_element(shape, element_id: str, source_path: Path, asset_dir: Path | None, embed_media: bool) -> dict[str, Any]:
    return {
        "id": element_id,
        "xml": shape._element.xml,
        "relationships": _relationship_payloads(shape, element_id, source_path, asset_dir, embed_media),
    }


def _relationship_payloads(
    shape,
    element_id: str,
    source_path: Path,
    asset_dir: Path | None,
    embed_media: bool,
) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for relationship_id in _embedded_relationship_ids(shape):
        try:
            relationship = shape.part.rels[relationship_id]
        except KeyError:
            continue
        payload: dict[str, Any] = {
            "source_rid": relationship_id,
            "reltype": relationship.reltype,
            "target_ref": relationship.target_ref,
            "is_external": bool(relationship.is_external),
        }
        if relationship.is_external:
            payloads.append(payload)
            continue
        part = relationship.target_part
        blob = getattr(part, "blob", None)
        if blob:
            content_type = getattr(part, "content_type", "")
            extension = Path(str(getattr(part, "partname", "media.bin"))).suffix.lstrip(".") or _extension_from_content_type(content_type)
            payload.update({"content_type": content_type, "extension": extension or "bin"})
            if asset_dir is not None:
                asset_path = asset_dir / f"{source_path.stem}_{element_id}_{relationship_id}.{payload['extension']}"
                asset_path.write_bytes(blob)
                payload["path"] = str(asset_path)
            elif embed_media:
                payload["blob_base64"] = b64encode(blob).decode("ascii")
        payloads.append(payload)
    return payloads


def _embedded_relationship_ids(shape) -> list[str]:
    relationship_ids: list[str] = []
    try:
        nodes = shape._element.iter()
    except AttributeError:
        return relationship_ids
    for node in nodes:
        for attribute_name, value in node.attrib.items():
            if attribute_name.endswith("}embed") and value not in relationship_ids:
                relationship_ids.append(value)
    return relationship_ids


def _extension_from_content_type(content_type: str) -> str:
    mapping = {
        "image/svg+xml": "svg",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/gif": "gif",
        "image/bmp": "bmp",
        "image/x-emf": "emf",
        "image/x-wmf": "wmf",
    }
    return mapping.get(content_type.lower(), "bin")


def _stat_key(slide_object: dict[str, Any]) -> str:
    kind = slide_object["kind"]
    if kind == "table":
        return "tables"
    if kind == "chart":
        return "charts"
    if kind == "image":
        return "images"
    if kind == "text":
        return "text_objects"
    if kind == "line":
        return "lines_or_freeforms"
    if kind == "connector":
        return "connectors"
    if kind == "smartart":
        return "smartart"
    if kind == "ole":
        return "ole_objects"
    return "shapes"


def _slide_title(objects) -> str:
    for slide_object in objects:
        text = str(slide_object["content"].get("text", "")).strip()
        if text:
            return text.splitlines()[0][:100]
    return ""


def _contains_non_ascii(value: str) -> bool:
    return any(ord(character) > 127 for character in value)


def _slide_text_fragments(shapes) -> list[str]:
    fragments: list[str] = []
    for shape in shapes:
        if hasattr(shape, "shapes"):
            fragments.extend(_slide_text_fragments(shape.shapes))
        if getattr(shape, "has_table", False):
            for row in shape.table.rows:
                row_text = " | ".join(_compact_text(cell.text) for cell in row.cells if _compact_text(cell.text))
                if row_text:
                    fragments.append(row_text)
        text = getattr(shape, "text", "")
        if text:
            fragments.append(text)
    deduped: list[str] = []
    seen: set[str] = set()
    for fragment in fragments:
        cleaned = _compact_text(fragment)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            deduped.append(cleaned)
    return deduped


def _compact_text(value: str) -> str:
    return " ".join(str(value).split())


def _package_asset_counts(path: Path) -> tuple[int, int]:
    with zipfile.ZipFile(path) as package:
        names = package.namelist()
    media = sum(1 for name in names if name.startswith("ppt/media/"))
    embedded = sum(1 for name in names if name.startswith("ppt/embeddings/"))
    return media, embedded


def _extract_package_media(path: Path, asset_dir: Path) -> None:
    with zipfile.ZipFile(path) as package:
        for name in package.namelist():
            if not name.startswith("ppt/media/"):
                continue
            target = asset_dir / Path(name).name
            target.write_bytes(package.read(name))


def _notes_by_slide(path: Path) -> dict[int, list[str]]:
    notes: dict[int, list[str]] = {}
    with zipfile.ZipFile(path) as package:
        names = set(package.namelist())
        slide_rels = sorted(name for name in names if name.startswith("ppt/slides/_rels/slide") and name.endswith(".xml.rels"))
        for rel_path in slide_rels:
            slide_number = int(Path(rel_path).name.removeprefix("slide").removesuffix(".xml.rels"))
            rel_root = ElementTree.fromstring(package.read(rel_path))
            for rel in rel_root:
                if "notesSlide" not in rel.attrib.get("Type", ""):
                    continue
                target = rel.attrib.get("Target", "")
                notes_path = posixpath.normpath(posixpath.join("ppt/slides", target))
                if notes_path not in names:
                    notes_path = posixpath.normpath(posixpath.join("ppt/slides/_rels", target))
                if notes_path not in names:
                    continue
                notes_root = ElementTree.fromstring(package.read(notes_path))
                text = "\n".join(node.text for node in notes_root.iter(f"{DRAWING_NS}t") if node.text)
                if text.strip():
                    notes[slide_number] = [text.strip()]
    return notes
```

