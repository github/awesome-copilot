---
name: web-performance-images
description: "Use when the user wants to improve image loading performance, fix Core Web Vitals issues (LCP, CLS), audit image lazy loading, or optimize images for page speed. Analyzes and fixes image-related performance issues."
---

# Web Performance Images

Audit and fix image-related performance issues that affect Core Web Vitals (LCP, CLS, INP). Combines code analysis with the tinify-ai MCP server for image optimization.

## Pre-flight

1. Call the `status` tool to check available credits
2. Detect the framework in use:
   - Next.js: check for `next.config` and `next/image` imports
   - Plain HTML: `.html` files with standard `<img>` tags
   - React: `.tsx`/`.jsx` with `<img>` tags
   - Other: Vue, Svelte, Astro — adapt recommendations accordingly

## LCP Audit (Largest Contentful Paint)

Identify hero and above-fold images:

1. Look for the first large image in the page layout — typically in hero sections, headers, or landing sections
2. Check each hero image for:
   - **File size** — should be under 200KB. If over, compress with `optimize_image`
   - **Preload tag** — should have `<link rel="preload" as="image" href="...">` in the `<head>`
   - **Loading attribute** — should be `loading="eager"` (NOT `loading="lazy"`)
   - **Format** — prefer WebP or AVIF over JPEG/PNG for smaller file size
3. For Next.js: check that hero images use `priority` prop on `<Image>` component

## CLS Audit (Cumulative Layout Shift)

Find all `<img>` tags missing explicit dimensions:

1. Use Grep to find `<img` tags without `width` and `height` attributes
2. For each image missing dimensions:
   - Read the actual image file to determine its dimensions (use Bash: `identify -format "%wx%h" image.jpg` if ImageMagick is available, or call `optimize_image` which returns dimensions)
   - Add `width` and `height` attributes to the tag
3. For Next.js: ensure `<Image>` components have `width`/`height` or use `fill` with a sized container

## Lazy Loading Audit

1. Find all `<img>` tags and classify as above-fold or below-fold:
   - Above-fold: hero images, header logos, first visible content images
   - Below-fold: everything else (gallery items, footer images, content below the fold)
2. Fix loading attributes:
   - Above-fold images: `loading="eager"` (or remove `loading` attribute — eager is default)
   - Below-fold images: `loading="lazy"`
3. For Next.js: above-fold images should have `priority={true}`, others should NOT

## Size Audit

Find oversized images:

1. Use Glob + Bash to find images over 200KB:
   ```
   find . -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -size +200k
   ```
2. For each oversized image, compress with `optimize_image`:
   ```
   optimize_image({ input: "/path/to/large-image.jpg" })
   ```
3. If an image's intrinsic dimensions are much larger than its display size, resize:
   ```
   optimize_image({
     input: "/path/to/image.jpg",
     output_width_px: 1200
   })
   ```

## Responsive Images (Best Effort)

If the project serves images at multiple sizes, suggest `srcset` patterns:

**Plain HTML:**
```html
<img
  src="image-800w.webp"
  srcset="image-400w.webp 400w, image-800w.webp 800w, image-1200w.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"
  alt="Description"
  width="1200" height="800"
  loading="lazy"
>
```

**Next.js:** Suggest using `<Image>` component with `sizes` prop — it handles srcset automatically.

This section is advisory — only suggest if the user asks or if images are clearly served at single large sizes across all viewports.

## Error Handling

- If `optimize_image` fails with insufficient credits: stop, report progress, suggest `upgrade`
- If ImageMagick/`identify` is not available for dimension detection: fall back to calling `optimize_image` to get dimensions from the output

## Report

Present a structured audit report:

### Performance Issues Found

| Issue | File | Image | Fix |
|-------|------|-------|-----|
| Missing dimensions | `index.html:15` | `hero.jpg` | Added `width="1200" height="800"` |
| No lazy loading | `gallery.html:42` | `photo-3.jpg` | Added `loading="lazy"` |
| Oversized (1.2MB) | `about.html:8` | `team.png` | Compressed to 280KB (77% smaller) |
| Hero not preloaded | `index.html` | `hero.jpg` | Added `<link rel="preload">` |

### Summary
- Total issues: X
- Fixed automatically: Y
- Requires manual action: Z
