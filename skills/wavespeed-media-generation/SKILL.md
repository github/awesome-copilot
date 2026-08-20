---
name: wavespeed-media-generation
description: 'Generate or edit AI media (images, video, audio, 3D) using the WaveSpeed CLI. Use when asked to create, edit, animate, upscale, or transform images, generate video from text or images, extend or edit video clips, produce TTS/music/audio, or build visual assets. Covers the find -> inspect -> run workflow across the WaveSpeed model catalog, local-file uploads, and price quotes before running. Requires a WaveSpeed account and API key.'
license: MIT
compatibility: Requires Node.js and the WaveSpeed CLI (`npm install -g @wavespeed/cli`) plus a WaveSpeed account (https://wavespeed.ai). Authenticate via `wavespeed login` or the WAVESPEED_API_KEY environment variable.
---

# WaveSpeed Media Generation

Generate and edit AI media (images, video, audio, 3D) from the terminal using the WaveSpeed CLI. Every model on the platform is invoked through one verb — `wavespeed run <model-id>` — so the same three-step workflow covers text-to-image, image editing, video generation, audio, and everything else in the catalog.

## When to Use This Skill

Use this skill when you need to:

- Generate images from text prompts
- Edit existing images with natural-language instructions (background replacement, restyling, object changes)
- Generate video from text or animate a still image
- Edit or extend existing video clips
- Generate audio, speech (TTS), or music
- Upscale or transform visual assets
- Produce visual assets for a project (mockups, textures, marketing creatives)

## Setup

1. **Install the CLI**:

   ```bash
   npm install -g @wavespeed/cli
   ```

2. **Authenticate** — check first with `wavespeed status`. If not signed in, either:
   - Ask the user to run `wavespeed login` (opens https://wavespeed.ai/accesskey and stores the key locally), or
   - For CI or non-interactive shells, set the `WAVESPEED_API_KEY` environment variable (it takes precedence over stored config).

   Never ask the user to paste an API key into the chat — the CLI handles credentials.

## The Three-Step Workflow

Model IDs are always explicit — there are no `image` / `video` shortcut subcommands. Always follow find -> inspect -> run:

```bash
# 1. FIND a model — search the live catalog
wavespeed models "seedream"
wavespeed models --type image-to-video --popular

# 2. INSPECT its inputs — each model has its own schema
wavespeed run bytedance/seedream-v5.0-pro -h

# 3. RUN it — always pass --json so you can read the result programmatically
wavespeed run bytedance/seedream-v5.0-pro \
  -p "a cyberpunk skyline at golden hour" \
  -i aspect_ratio="16:9" -i resolution="2k" --json
```

`run --json` returns `{ id, model, prompt, outputs: [url, ...], saved: [path, ...], elapsed_ms, raw }`. Keep the `id` — it is the handle for `wavespeed show <id>` if anything is interrupted. Use the output URL when the user wants a link; add `--download` when they need the file on disk.

## Price Quotes Before Running

Generation costs money. For anything beyond a quick single image — video, batches, high resolutions — quote the price first and confirm with the user:

```bash
wavespeed price bytedance/seedance-2.5/text-to-video -p "..." -i duration=10 --json
```

For spend questions afterwards: `wavespeed usage` (totals, per-model) and `wavespeed billings` (per-charge records).

## Recommended Starting Points

| Use case | Model |
| --- | --- |
| Text to image | `bytedance/seedream-v5.0-pro` |
| Image edit (instruction-driven) | `bytedance/seedream-v5.0-pro/edit` — requires `images: [url, ...]` |
| Text to video | `bytedance/seedance-2.5/text-to-video` |
| Image to video | `bytedance/seedance-2.5/image-to-video` — requires `image: url` |
| Video edit (instruction-driven) | `bytedance/seedance-2.5/video-edit` — requires `video: url` |
| Video extend | `bytedance/seedance-2.5/video-extend` — requires `video: url` |

These are starting points, not a fixed list. Browse alternatives with `wavespeed models <query>` — the catalog is live and models change over time.

## Common Recipes

```bash
# Edit an existing local image — @path uploads the file and substitutes its hosted URL (one step)
wavespeed run bytedance/seedream-v5.0-pro/edit \
  -p "replace the background with a sunlit kitchen" \
  -i images='["@./input.jpg"]' --json

# Image-to-video — same @ marker for single-URL fields
wavespeed run bytedance/seedance-2.5/image-to-video \
  -p "subtle parallax, gentle wind" \
  -i image=@./hero.jpg -i duration=5 --json

# Or upload separately when you need the URL itself
URL=$(wavespeed upload ./hero.jpg --json | jq -r .url)

# Save outputs locally with a filename template
wavespeed run ... -p "..." --download "./out/{index}.{ext}"
```

## Project Config and Aliases

If a `wavespeed.json` exists in the project (created by `wavespeed init`):

- **`defaultModel`** — lets `wavespeed run -p "..."` work without a model argument.
- **Aliases** — named shortcuts that bundle a model plus default inputs. Run `wavespeed aliases` to list them; `wavespeed run <alias> -h` shows the resolved schema. CLI `-i key=value` flags override alias defaults.

The CLI never modifies the user's prompt or inputs. The single exception is explicit: an `@path` value uploads that file and substitutes its hosted URL. Bare paths are never uploaded.

## Pitfalls

- **Local files**: use `@./file.jpg` inside `-i` values. Bare paths are NOT uploaded and the model will reject them.
- **Do not invent model IDs**: always confirm via `wavespeed models <query>` or `wavespeed schema <id>` before running.
- **Always use `--json`** on `run` so `outputs[0]` can be read programmatically.
- **`wavespeed delete` requires `--yes`** when run non-interactively (which includes agent sessions).
- **Cost awareness**: quote with `wavespeed price` before expensive runs (video, batches, high resolution) and confirm with the user.
