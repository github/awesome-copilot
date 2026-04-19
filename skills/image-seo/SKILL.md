---
name: image-seo
description: "Use when the user wants to add alt text, audit image SEO, improve image accessibility, or generate image metadata. Scans code for images missing alt attributes and generates SEO-optimized alt text, keywords, and filenames."
---

# Image SEO

Audit and fix image SEO issues in a project. Scans source code for `<img>` tags missing alt text, generates AI-powered alt text and keywords using the tinify-ai MCP server, and applies fixes to the codebase.

## Pre-flight

1. Call the `status` tool to check available credits (each image costs 4 credits: 3 base + 1 for SEO tag generation)
2. Warn if credits are insufficient for the estimated number of images

## Scan

Find all images in source code that need SEO attention:

1. Use Grep to find `<img` tags across the project:
   - HTML: `*.html`
   - React/Next.js: `*.tsx`, `*.jsx`
   - Vue: `*.vue`
   - Svelte: `*.svelte`
   - Astro: `*.astro`

2. From those matches, identify images with issues:
   - Missing `alt` attribute entirely
   - Empty `alt=""` on non-decorative images
   - Generic alt text like `alt="image"`, `alt="photo"`, `alt="untitled"`
   - Non-descriptive filenames like `IMG_4532.jpg`, `Screenshot 2024-01-15.png`

3. Present the findings to the user before making changes:
   - "Found X images missing alt text in Y files. Proceed?"

## Generate Metadata

For each image needing alt text, call `optimize_image` with SEO enabled:

```
optimize_image({
  input: "/absolute/path/to/the/image.jpg",
  output_seo_tag_gen: true
})
```

The tool returns:
- `seo_alt_text` — Descriptive alt text for the image
- `seo_keywords` — Array of relevant keywords
- `seo_filename` — SEO-friendly filename slug (without extension)

## Apply Fixes

1. Use Edit to insert the generated `seo_alt_text` into the source code:
   - `<img src="hero.jpg">` → `<img src="hero.jpg" alt="Sunset over California beach with golden waves">`
   - `<img src="hero.jpg" alt="">` → `<img src="hero.jpg" alt="Sunset over California beach with golden waves">`

2. If the filename is non-descriptive (e.g., `IMG_4532.jpg`), suggest renaming:
   - Show: `IMG_4532.jpg` → `sunset-california-beach.jpg` (from `seo_filename`)
   - Only suggest — do not auto-rename without user approval (renaming may break other references)

## Error Handling

- If `optimize_image` fails with insufficient credits: stop, report progress, suggest `upgrade`
- If an image file cannot be found at the path referenced in code: skip and note in report

## Report

Present a summary of changes:

| File | Image | Alt Text Added | Filename Suggestion |
|------|-------|----------------|---------------------|
| `src/pages/index.tsx` | `hero.jpg` | "Sunset over California beach..." | — |
| `src/pages/about.tsx` | `IMG_4532.jpg` | "Team meeting in modern office" | `team-meeting-office.jpg` |

## Scope

This skill handles image alt text and metadata only. It does NOT handle:
- Page title tags or meta descriptions
- Structured data / JSON-LD
- Sitemap generation
- Other non-image SEO concerns
