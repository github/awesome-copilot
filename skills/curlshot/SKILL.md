---
name: 'curlshot'
description: 'Take screenshots of web pages with the CurlShot API. Use when the user wants a screenshot, full-page capture, mobile or tablet view, PDF, or scrolling video of a URL, or wants their own HTML or Markdown rendered to an image or PDF. Needs a CurlShot access key in the CURLSHOT_API_KEY environment variable.'
license: 'MIT'
---

# CurlShot screenshots

CurlShot renders a web page in a real browser and returns it as an image (PNG, JPEG, WebP), a PDF, or a video of the page scrolling (MP4, WebM, GIF). One HTTP request does it.

## Before you start

- The access key is read from `CURLSHOT_API_KEY`. If it is not set, ask the user for it. A free key (100 screenshots a month, no card) comes from https://curlshot.com/register.
- Never print the key, paste it into a file in the repository, or put it in a link you show the user.
- Only public pages work out of the box. Local and private network addresses (localhost, 192.168.x.x, ...) are refused: for a local page, send its HTML instead (see below).

## Take a screenshot

```bash
curl -sS -G "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  --data-urlencode "url=https://example.com" \
  -d format=png \
  --output screenshot.png
```

`-G` with `--data-urlencode` keeps the page address correctly encoded. Check the HTTP status: on an error the body is JSON with `error_code` and `error_message` instead of an image.

## Common options

Add each option as one more `-d name=value` (GET) or as a field in a POST JSON body.

| Want | Option |
| --- | --- |
| Whole page, top to bottom | `full_page=true` |
| Phone or tablet view | `viewport_device=<preset>` (list: https://curlshot.com/docs/devices.md) |
| Window size | `viewport_width=1440`, `viewport_height=900` |
| Retina sharpness | `device_scale_factor=2` |
| Dark theme | `dark_mode=true` |
| One element only | `selector=<css selector>` |
| Output format | `format=png` / `jpeg` / `webp` / `pdf` / `mp4` / `webm` / `gif` |
| Hide cookie banners and ads | `block_cookie_banners=true`, `block_ads=true` |
| Wait for content | `wait_until=networkidle`, `delay=2`, `wait_for_selector=<css selector>` |
| Reuse a stored copy for free | `cache=true` |

A misspelled option is rejected with `invalid_options` and a hint, never ignored. Every option: https://curlshot.com/docs/options.md

## Render your own HTML or Markdown

POST JSON when the input is long:

```bash
curl -sS -X POST "https://curlshot.com/api/v1/screenshot" \
  -H "X-Access-Key: $CURLSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello</h1>", "format": "png", "viewport_width": 1200, "viewport_height": 630}' \
  --output card.png
```

Use `"markdown": "..."` instead of `html` to render Markdown as a styled page, and `"format": "pdf"` for a PDF.

## Usage and billing

CurlShot is a hosted, paid service with a free tier (100 screenshots a month); paid plans start at $19/month. One successful render counts as one screenshot, whatever its size. Failed renders and cache hits are free. Responses carry rate-limit and concurrency headers.

## MCP alternative

Agents with MCP support can use the hosted server instead of HTTP calls: `https://curlshot.com/api/mcp` (streamable HTTP, `Authorization: Bearer <key>`), tools `take_screenshot` and `list_devices`. Per-client setup: https://github.com/SergiuPogor/curlshot-mcp

## Docs

- Getting started: https://curlshot.com/docs/getting-started.md
- Errors: https://curlshot.com/docs/errors.md
- Everything in one file: https://curlshot.com/llms-full.txt
