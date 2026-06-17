# draw-io Scripts

Utility scripts for working with `.drawio` diagram files in the cxp-bu-order-ms project.

## Requirements

- Python 3.8+
- No external dependencies (uses standard library only: `xml.etree.ElementTree`, `argparse`, `json`, `sys`, `pathlib`)

## Scripts

### `validate-drawio.py`

Validates the XML structure of a `.drawio` file against required constraints.

**Usage**

```bash
python scripts/validate-drawio.py <path-to-diagram.drawio>
```

**Examples**

```bash
# Validate a single file
python scripts/validate-drawio.py docs/architecture.drawio

# Validate all drawio files in a directory
for f in docs/**/*.drawio; do python scripts/validate-drawio.py "$f"; done
```

**Checks performed**

| Check | Description |
|-------|-------------|
| Root cells | Verifies id="0" and id="1" cells are present in every diagram page |
| Unique IDs | All `mxCell` id values are unique within a diagram |
| Edge connectivity | Every edge has valid `source` and `target` attributes pointing to existing cells |
| Geometry | Every vertex cell has an `mxGeometry` child element |
| Parent chain | Every cell's `parent` attribute references an existing cell id |
| XML well-formedness | File is valid XML |

**Exit codes**

- `0` — Validation passed
- `1` — One or more validation errors found (errors printed to stdout)

---

### `add-shape.py`

Adds a new shape (vertex cell) to an existing `.drawio` diagram file.

**Usage**

```bash
python scripts/add-shape.py <diagram.drawio> <label> <x> <y> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `diagram` | Yes | Path to the `.drawio` file |
| `label` | Yes | Text label for the new shape |
| `x` | Yes | X coordinate (pixels from top-left) |
| `y` | Yes | Y coordinate (pixels from top-left) |

**Options**

| Option | Default | Description |
|--------|---------|-------------|
| `--width` | `120` | Shape width in pixels |
| `--height` | `60` | Shape height in pixels |
| `--style` | `"rounded=1;whiteSpace=wrap;html=1;"` | draw.io style string |
| `--diagram-index` | `0` | Index of the diagram page (0-based) |
| `--dry-run` | false | Print the new cell XML without modifying the file |

**Examples**

```bash
# Add a basic rounded box
python scripts/add-shape.py docs/flowchart.drawio "New Step" 400 300

# Add a custom styled shape
python scripts/add-shape.py docs/flowchart.drawio "Decision" 400 400 \
  --width 160 --height 80 \
  --style "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;"

# Preview without writing
python scripts/add-shape.py docs/architecture.drawio "Service X" 600 200 --dry-run
```

**Output**

Prints the new cell id on success:
```
Added shape id="auto_abc123" to page 0 of docs/flowchart.drawio
```

---

## Common Workflows

### Validate before committing

```bash
# Validate all diagrams
find . -name "*.drawio" -not -path "*/node_modules/*" | \
  xargs -I{} python scripts/validate-drawio.py {}
```

### Quickly add a placeholder node

```bash
python scripts/add-shape.py docs/architecture.drawio "TODO: Service" 800 400 \
  --style "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;"
```

### Check a template is valid

```bash
python scripts/validate-drawio.py .github/skills/draw-io-diagram-generator/templates/flowchart.drawio
```
