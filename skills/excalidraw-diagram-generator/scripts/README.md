# Excalidraw Library Tools

This directory contains scripts for working with Excalidraw libraries.

## split-excalidraw-library.py

Splits an Excalidraw library file (`*.excalidrawlib`) into individual icon JSON files for efficient token usage by AI assistants.

### Prerequisites

- Python 3.6 or higher
- No additional dependencies required (uses only standard library)

### Usage

```bash
python split-excalidraw-library.py <path-to-library-directory>
```

### Step-by-Step Workflow

1. **Create library directory**:
   ```bash
   mkdir -p skills/excalidraw-diagram-generator/libraries/aws-architecture-icons
   ```

2. **Download and place library file**:
   - Visit: https://libraries.excalidraw.com/
   - Search for "AWS Architecture Icons" and download the `.excalidrawlib` file
   - Rename it to match the directory name: `aws-architecture-icons.excalidrawlib`
   - Place it in the directory created in step 1

3. **Run the script**:
   ```bash
   python skills/excalidraw-diagram-generator/scripts/split-excalidraw-library.py skills/excalidraw-diagram-generator/libraries/aws-architecture-icons/
   ```

### Output Structure

The script creates the following structure in the library directory:

```
skills/excalidraw-diagram-generator/libraries/aws-architecture-icons/
  aws-architecture-icons.excalidrawlib  # Original file (kept)
  reference.md                          # Generated: Quick reference table
  icons/                                # Generated: Individual icon files
    API-Gateway.json
    CloudFront.json
    EC2.json
    S3.json
    ...
```

### What the Script Does

1. **Reads** the `.excalidrawlib` file
2. **Extracts** each icon from the `libraryItems` array
3. **Sanitizes** icon names to create valid filenames (spaces → hyphens, removes special characters)
4. **Saves** each icon as a separate JSON file in the `icons/` directory
5. **Generates** a `reference.md` file with a table mapping icon names to filenames

### Benefits

- **Token Efficiency**: AI can first read the lightweight `reference.md` to find relevant icons, then load only the specific icon files needed
- **Organization**: Icons are organized in a clear directory structure
- **Extensibility**: Users can add multiple library sets side-by-side

### Recommended Workflow

1. Download desired Excalidraw libraries from https://libraries.excalidraw.com/
2. Run this script on each library file
3. Move the generated folders to `../libraries/`
4. The AI assistant will use `reference.md` files to locate and use icons efficiently

### Library Sources (Examples — verify availability)

- Examples found on https://libraries.excalidraw.com/ may include cloud/service icon sets.
- Availability changes over time; verify the exact library names on the site before use.
- This script works with any valid `.excalidrawlib` file you provide.

### Troubleshooting

**Error: File not found**
- Check that the file path is correct
- Make sure the file has a `.excalidrawlib` extension

**Error: Invalid library file format**
- Ensure the file is a valid Excalidraw library file
- Check that it contains a `libraryItems` array

### License Considerations

When using third-party icon libraries:
- **AWS Architecture Icons**: Subject to AWS Content License
- **GCP Icons**: Subject to Google's terms
- **Other libraries**: Check each library's license

This script is for personal/organizational use. Redistribution of split icon files should comply with the original library's license terms.

## add-icon-to-diagram.py

Adds a specific icon from a split Excalidraw library into an existing `.excalidraw` diagram. The script handles coordinate translation and ID collision avoidance, and can optionally add a label under the icon.

### Prerequisites

- Python 3.6 or higher
- A diagram file (`.excalidraw`)
- A split icon library directory (created by `split-excalidraw-library.py`)

### Usage

```bash
python add-icon-to-diagram.py <diagram-path> <icon-name> <x> <y> [OPTIONS]
```

**Options**
- `--library-path PATH` : Path to the icon library directory (default: `aws-architecture-icons`)
- `--label TEXT` : Add a text label below the icon
-- `--use-edit-suffix` : Edit via `.excalidraw.edit` to avoid editor overwrite issues (enabled by default; pass `--no-use-edit-suffix` to disable)

### Examples

```bash
# Add EC2 icon at position (400, 300)
python add-icon-to-diagram.py diagram.excalidraw EC2 400 300

# Add VPC icon with label
python add-icon-to-diagram.py diagram.excalidraw VPC 200 150 --label "VPC"

# Safe edit mode is enabled by default (avoids editor overwrite issues)
# Use `--no-use-edit-suffix` to disable
python add-icon-to-diagram.py diagram.excalidraw EC2 500 300

# Add icon from another library
python add-icon-to-diagram.py diagram.excalidraw Compute-Engine 500 200 \
   --library-path libraries/gcp-icons --label "API Server"
```

### What the Script Does

1. **Loads** the icon JSON from the library’s `icons/` directory
2. **Calculates** the icon’s bounding box
3. **Offsets** all coordinates to the target position
4. **Generates** unique IDs for all elements and groups
5. **Appends** the transformed elements to the diagram
6. **(Optional)** Adds a label beneath the icon

---

## add-arrow.py

Adds a straight arrow between two points in an existing `.excalidraw` diagram. Supports optional labels and line styles.

### Prerequisites

- Python 3.6 or higher
- A diagram file (`.excalidraw`)

### Usage

```bash
python add-arrow.py <diagram-path> <from-x> <from-y> <to-x> <to-y> [OPTIONS]
```

**Options**
- `--style {solid|dashed|dotted}` : Line style (default: `solid`)
- `--color HEX` : Arrow color (default: `#1e1e1e`)
- `--label TEXT` : Add a text label on the arrow
-- `--use-edit-suffix` : Edit via `.excalidraw.edit` to avoid editor overwrite issues (enabled by default; pass `--no-use-edit-suffix` to disable)

### Examples

```bash
# Simple arrow
python add-arrow.py diagram.excalidraw 300 200 500 300

# Arrow with label
python add-arrow.py diagram.excalidraw 300 200 500 300 --label "HTTPS"

# Dashed arrow with custom color
python add-arrow.py diagram.excalidraw 400 350 600 400 --style dashed --color "#7950f2"

# Safe edit mode is enabled by default (avoids editor overwrite issues)
# Use `--no-use-edit-suffix` to disable
python add-arrow.py diagram.excalidraw 300 200 500 300
```

### What the Script Does

1. **Creates** an arrow element from the given coordinates
2. **(Optional)** Adds a label near the arrow midpoint
3. **Appends** elements to the diagram
4. **Saves** the updated file
