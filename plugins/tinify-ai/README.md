# tinify-ai Plugin

AI-powered image optimization — compress, resize, upscale, convert formats, and generate SEO metadata. Includes skills for project-wide image auditing, SEO alt text generation, and Core Web Vitals image performance.

Powered by [tinify.ai](https://tinify.ai) — requires a free account for credits.

## Installation

```bash
copilot plugin install tinify-ai@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `optimize-images` | Batch-optimize all images in a project — compress, convert to WebP/AVIF, and report savings |
| `image-seo` | Scan source code for images missing alt text and generate AI-powered SEO alt text and keywords |
| `web-performance-images` | Audit and fix image-related Core Web Vitals issues (LCP, CLS) — lazy loading, dimensions, preloading |

## Usage

After installing the plugin, use skills via slash commands in a Copilot session:

```
/tinify-ai:optimize-images
/tinify-ai:image-seo
/tinify-ai:web-performance-images
```

## Requirements

- A [tinify.ai](https://tinify.ai) account (free tier available)
- The tinify-ai MCP server is included — install it with:

```bash
copilot plugin install tinify-ai@awesome-copilot
```

> Note: Image optimization credits are consumed per image processed. New accounts receive free credits on sign-up.

## Source

This plugin is maintained at [onepunchtechnology/tinify-ai-plugin](https://github.com/onepunchtechnology/tinify-ai-plugin) and included in [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
