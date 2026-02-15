---
name: image-manipulation-image-magick
description: Process and manipulate images using ImageMagick. Supports resizing, format conversion, batch processing, and retrieving image metadata. Use when working with images, creating thumbnails, resizing wallpapers, or performing batch image operations.
compatibility: Requires ImageMagick installed and available as `magick` on PATH. Cross-platform examples provided for PowerShell (Windows) and Bash (Linux/macOS).
---

# Image Manipulation with ImageMagick

This skill enables image processing and manipulation tasks using ImageMagick
across Windows, Linux, and macOS systems.

## When to Use This Skill

Use this skill when you need to:

- Resize images (single or batch)
- Get image dimensions and metadata
- Convert between image formats
- Create thumbnails
- Process wallpapers for different screen sizes
- Batch process multiple images with specific criteria

## Prerequisites

- ImageMagick installed on the system
- **Windows**: PowerShell with ImageMagick available as `magick` (or at `C:\Program Files\ImageMagick-*\magick.exe`)
- **Linux/macOS**: Bash with ImageMagick installed via package manager (`apt`, `brew`, etc.)

## Core Capabilities

### 1. Image Information

- Get image dimensions (width x height)
- Retrieve detailed metadata (format, color space, etc.)
- Identify image format

### 2. Image Resizing

- Resize single images
- Batch resize multiple images
- Create thumbnails with specific dimensions
- Maintain aspect ratios

### 3. Batch Processing

- Process images based on dimensions
- Filter and process specific file types
- Apply transformations to multiple files

## Usage Examples

### Example 0: Resolve `magick` executable

**PowerShell (Windows):**
```powershell
# Prefer ImageMagick on PATH
$magick = (Get-Command magick -ErrorAction SilentlyContinue)?.Source

# Fallback: common install pattern under Program Files
if (-not $magick) {
    $magick = Get-ChildItem "C:\\Program Files\\ImageMagick-*\\magick.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $magick) {
    throw "ImageMagick not found. Install it and/or add 'magick' to PATH."
}
```

**Bash (Linux/macOS):**
```bash
# Check if magick is available on PATH
if ! command -v magick &> /dev/null; then
    echo "ImageMagick not found. Install it using your package manager:"
    echo "  Ubuntu/Debian: sudo apt install imagemagick"
    echo "  macOS: brew install imagemagick"
    exit 1
fi
```

### Example 1: Get Image Dimensions

**PowerShell (Windows):**
```powershell
# For a single image
& $magick identify -format "%wx%h" path/to/image.jpg

# For multiple images
Get-ChildItem "path/to/images/*" | ForEach-Object { 
    $dimensions = & $magick identify -format "%f: %wx%h`n" $_.FullName
    Write-Host $dimensions 
}
```

**Bash (Linux/macOS):**
```bash
# For a single image
magick identify -format "%wx%h" path/to/image.jpg

# For multiple images
for img in path/to/images/*; do
    magick identify -format "%f: %wx%h\n" "$img"
done
```

### Example 2: Resize Images

**PowerShell (Windows):**
```powershell
# Resize a single image
& $magick input.jpg -resize 427x240 output.jpg

# Batch resize images
Get-ChildItem "path/to/images/*" | ForEach-Object { 
    & $magick $_.FullName -resize 427x240 "path/to/output/thumb_$($_.Name)"
}
```

**Bash (Linux/macOS):**
```bash
# Resize a single image
magick input.jpg -resize 427x240 output.jpg

# Batch resize images
for img in path/to/images/*; do
    filename=$(basename "$img")
    magick "$img" -resize 427x240 "path/to/output/thumb_$filename"
done
```

### Example 3: Get Detailed Image Information

**PowerShell (Windows):**
```powershell
# Get verbose information about an image
& $magick identify -verbose path/to/image.jpg
```

**Bash (Linux/macOS):**
```bash
# Get verbose information about an image
magick identify -verbose path/to/image.jpg
```

### Example 4: Process Images Based on Dimensions

**PowerShell (Windows):**
```powershell
Get-ChildItem "path/to/images/*" | ForEach-Object { 
    $dimensions = & $magick identify -format "%w,%h" $_.FullName
    if ($dimensions) {
        $width,$height = $dimensions -split ','
        if ([int]$width -eq 2560 -or [int]$height -eq 1440) {
            Write-Host "Processing $($_.Name)"
            & $magick $_.FullName -resize 427x240 "path/to/output/thumb_$($_.Name)"
        }
    }
}
```

**Bash (Linux/macOS):**
```bash
for img in path/to/images/*; do
    dimensions=$(magick identify -format "%w,%h" "$img")
    if [[ -n "$dimensions" ]]; then
        width=$(echo "$dimensions" | cut -d',' -f1)
        height=$(echo "$dimensions" | cut -d',' -f2)
        if [[ "$width" -eq 2560 || "$height" -eq 1440 ]]; then
            filename=$(basename "$img")
            echo "Processing $filename"
            magick "$img" -resize 427x240 "path/to/output/thumb_$filename"
        fi
    fi
done
```

## Guidelines

1. **Always quote file paths** - Use quotes around file paths that might contain spaces
2. **Use the `&` operator (PowerShell)** - Invoke the magick executable using `&` in PowerShell
3. **Store the path in a variable (PowerShell)** - Assign the ImageMagick path to `$magick` for cleaner code
4. **Wrap in loops** - When processing multiple files, use `ForEach-Object` (PowerShell) or `for` loops (Bash)
5. **Verify dimensions first** - Check image dimensions before processing to avoid unnecessary operations
6. **Use appropriate resize flags** - Consider using `!` to force exact dimensions or `^` for minimum dimensions

## Common Patterns

### PowerShell Patterns

#### Pattern: Store ImageMagick Path

```powershell
$magick = (Get-Command magick).Source
```

#### Pattern: Get Dimensions as Variables

```powershell
$dimensions = & $magick identify -format "%w,%h" $_.FullName
$width,$height = $dimensions -split ','
```

#### Pattern: Conditional Processing

```powershell
if ([int]$width -gt 1920) {
    & $magick $_.FullName -resize 1920x1080 $outputPath
}
```

#### Pattern: Create Thumbnails

```powershell
& $magick $_.FullName -resize 427x240 "thumbnails/thumb_$($_.Name)"
```

### Bash Patterns

#### Pattern: Check ImageMagick Installation

```bash
command -v magick &> /dev/null || { echo "ImageMagick required"; exit 1; }
```

#### Pattern: Get Dimensions as Variables

```bash
dimensions=$(magick identify -format "%w,%h" "$img")
width=$(echo "$dimensions" | cut -d',' -f1)
height=$(echo "$dimensions" | cut -d',' -f2)
```

#### Pattern: Conditional Processing

```bash
if [[ "$width" -gt 1920 ]]; then
    magick "$img" -resize 1920x1080 "$outputPath"
fi
```

#### Pattern: Create Thumbnails

```bash
filename=$(basename "$img")
magick "$img" -resize 427x240 "thumbnails/thumb_$filename"
```

## Limitations

- Large batch operations may be memory-intensive
- Some complex operations may require additional ImageMagick delegates
- On older Linux systems, use `convert` instead of `magick` (ImageMagick 6.x vs 7.x)
