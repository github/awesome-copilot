---
name: atlas-cloud-image-generation
description: 'Generate or edit images through the Atlas Cloud asynchronous image API. Use for prompt-to-image, single-image edits, and compositions with up to three local reference images; supports bounded polling and secure local downloads.'
metadata:
  requires:
    bins:
      - python3
    env:
      - ATLASCLOUD_API_KEY
  primaryEnv: ATLASCLOUD_API_KEY
---

# Atlas Cloud Image Generation

Generate or edit images with Atlas Cloud's native asynchronous API. The bundled script submits each generation once, polls the returned prediction with a bounded GET loop, and downloads completed images without forwarding the API key.

## Generate an image

```bash
python3 {baseDir}/scripts/generate_image.py \
  --prompt "A clean isometric game item icon on a solid background" \
  --size 1024x1024 \
  --filename item.png
```

The default generation model is `qwen-image-3.0/text-to-image`.

## Edit or compose images

Pass one to three local references. The script automatically selects `qwen-image-3.0/edit` when references are present.

```bash
python3 {baseDir}/scripts/generate_image.py \
  --prompt "Keep the character identity and change the outfit to a raincoat" \
  --input-image character.png \
  --filename raincoat.png
```

Repeat `--input-image` for multi-image composition. Each reference must be PNG, JPEG, GIF, or WebP and no larger than 10 MiB.

## Options

- `--size WIDTHxHEIGHT` supports 512–2048 for generation and 512–1440 for edits. Omit it to let the model choose.
- `--count` requests 1–4 outputs. Multiple outputs use numbered filenames.
- `--negative-prompt` describes content to avoid.
- `--seed` accepts 0–2147483647 for reproducible generation.
- `--no-prompt-extend` disables prompt rewriting.
- `--model` overrides the mode-specific default when another model uses the same request schema.
- `--dry-run` prints the request payload without requiring an API key or sending a request.

## Configuration

Set `ATLASCLOUD_API_KEY` in the process environment. `ATLASCLOUD_BASE_URL` optionally overrides the default `https://api.atlascloud.ai/api/v1` endpoint for compatible deployments.

Generated output URLs are temporary, so the script downloads them immediately. Downloads must be credential-free HTTPS, are limited to 64 MiB, do not follow redirects, and never receive the Atlas authorization header.

If a request times out after submission, do not submit it again automatically because that can create a second billable generation. Use the prediction ID shown on stderr with `GET /model/prediction/{id}` to inspect the original task.
