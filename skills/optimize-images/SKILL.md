---
name: optimize-images
description: "Use when the user wants to optimize, compress, or prepare images for production. Handles batch optimization of project images with smart format selection and size reduction."
---

# Optimize Images

Batch-optimize images in a project using the tinify-ai MCP server. This skill teaches you how to audit, optimize, and report on image assets.

## Pre-flight

1. Call the `status` tool to check available credits
2. If credits are low (fewer than the number of images to process), warn the user:
   - If unregistered/guest: suggest `login` to get more credits
   - If registered: suggest `upgrade` for a higher tier
3. Confirm with the user before proceeding with large batches (>20 images)

## Audit

1. Use Glob to find all images in the project:
   - Patterns: `**/*.{jpg,jpeg,png,webp,gif,avif,svg,ico,heic,heif,tiff,bmp}`
   - Exclude: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `vendor/`
2. Use Bash to check file sizes: `find <dir> -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" -o -name "*.gif" -o -name "*.avif" \) -exec ls -la {} \;`
3. Identify optimization candidates — images over 200KB for web projects, or as specified by the user

## Decision Tree

For each image, decide the action:

| Image type | Size | Action |
|------------|------|--------|
| Photo (JPG/PNG) | >200KB | Compress with `optimize_image` |
| PNG photo (no transparency needed) | Any | Convert to WebP: `output_format: "webp"` |
| Already optimized WebP/AVIF | <50KB | Skip |
| SVG | Any | Skip (vector, already optimal) |
| ICO/favicon | Any | Skip (tiny files) |
| GIF (animated) | Any | Compress, but warn about credit cost per frame |

If the user specifies a target format, use that for all images instead.

## Processing

Process images one at a time using `optimize_image`:

```
optimize_image({
  input: "/absolute/path/to/image.jpg",
  output_format: "webp",        // or "original" to keep format
  output_seo_tag_gen: false      // skip SEO tags to save 1 credit per call (3 credits instead of 4)
})
```

- Preserve directory structure — output alongside the original
- Track before/after sizes for the report
- If a GIF has multiple frames, the tool will return a cost warning. Set `confirm_gif_cost: true` to proceed.

## Error Handling

- If `optimize_image` returns a 429 (insufficient credits): **stop immediately**
- Report how many images were processed vs total
- Suggest `upgrade` to get more credits
- Do NOT retry failed optimizations without user confirmation

## Report

After processing, present a summary table:

| File | Original | Optimized | Savings |
|------|----------|-----------|---------|
| hero.jpg | 1.2 MB | 340 KB | 72% |
| banner.png | 890 KB | 210 KB | 76% |
| **Total** | **2.1 MB** | **550 KB** | **74%** |
