---
name: drawio
description: Generate draw.io diagrams as .drawio files and export to PNG/SVG/PDF with embedded XML
---

# Draw.io Diagram Skill

Generate draw.io diagrams as native `.drawio` files and export them to PNG images that can be embedded in Word documents.

## How to Create a Diagram

1. **Generate draw.io XML** in `mxGraphModel` format for the requested diagram
2. **Write the XML** to a `.drawio` file using the create/edit file tool
3. **Export to PNG** using the bundled export script

## Bundled Export Script

This skill includes `drawio-to-png.mjs`, a Node.js export script with two rendering backends:

1. **draw.io CLI** (pixel-perfect, fastest) — used automatically if draw.io desktop is installed
2. **Official draw.io viewer in headless browser** (pixel-perfect, needs Chromium/Edge) — fallback when CLI is unavailable

### Usage

```bash
# Install dependencies (one-time, from the scripts folder)
cd skills/drawio/scripts && npm install

# Export a single diagram
node skills/drawio/scripts/drawio-to-png.mjs <input.drawio> [output.png]

# Export all .drawio files in a directory
node skills/drawio/scripts/drawio-to-png.mjs --dir <directory>

# Force a specific renderer
node skills/drawio/scripts/drawio-to-png.mjs --renderer=cli|viewer|auto <input.drawio>
```

### Skill Folder Contents

| File | Purpose |
|------|---------|
| `SKILL.md` | This instruction file |
| `scripts/drawio-to-png.mjs` | Node.js export script (CLI + browser fallback) |
| `scripts/package.json` | Dependencies (`puppeteer-core`) |

## Supported Export Formats

| Format | Embed XML | Notes |
|--------|-----------|-------|
| `png` | Yes | Viewable everywhere, editable in draw.io |
| `svg` | Yes | Scalable, editable in draw.io |
| `pdf` | Yes | Printable, editable in draw.io |

## Draw.io XML Style Conventions

Use these styles for consistent, professional diagrams:

```xml
<!-- Primary service (highlighted) -->
<mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;arcSize=12;shadow=1;" />

<!-- External system -->
<mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;" />

<!-- Success/processing stage -->
<mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" />

<!-- Warning/quality gate -->
<mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" />

<!-- Error/failure path -->
<mxCell style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" />

<!-- Data store (cylinder) -->
<mxCell style="shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" />

<!-- Arrow -->
<mxCell style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#6c8ebf;strokeWidth=2;" />
```

## Locating the draw.io CLI

Try `drawio` first (works if on PATH), then fall back:

- **Windows**: `"C:\Program Files\draw.io\draw.io.exe"`
- **macOS**: `/Applications/draw.io.app/Contents/MacOS/draw.io`
- **Linux**: `drawio` (via snap/apt/flatpak)

### CLI Export Command

```bash
drawio -x -f png -e -b 10 -o <output.png> <input.drawio>
```

Flags: `-x` (export), `-f` (format), `-e` (embed diagram XML), `-b` (border), `-o` (output path).
