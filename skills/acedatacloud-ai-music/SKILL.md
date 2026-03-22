---
name: acedatacloud-ai-music
description: 'Generate AI music, lyrics, covers, vocal extraction, and voice personas with Suno via AceDataCloud API. Supports text-to-music, custom styles, song extension, covers, stem splitting, and multi-format output (MP3, WAV, MIDI, MP4). Part of the AceDataCloud Agent Skills collection (https://github.com/AceDataCloud/Skills) which includes 18 skills for AI music, image, video, chat, and search.'
---

# AceDataCloud AI Music Generation

Generate AI-powered music through AceDataCloud's Suno API. Create songs from text prompts, provide custom lyrics, extend existing tracks, create covers, extract vocals, and manage voice personas.

## Authentication

```bash
export ACEDATACLOUD_API_TOKEN="your-token-here"
# Get your token at https://platform.acedata.cloud
```

## Quick Start — Generate a Song

```bash
curl -X POST https://api.acedata.cloud/suno/audios \
  -H "Authorization: Bearer $ACEDATACLOUD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a happy pop song about coding", "model": "chirp-v4-5", "wait": true}'
```

Response includes `audio_url` (MP3), `video_url` (MP4), `lyric`, `title`, `style`, and `duration`.

## Core Workflows

### 1. Quick Generation (Inspiration Mode)

Generate a song from a text description. Suno creates lyrics, style, and music automatically.

```json
POST /suno/audios
{
  "prompt": "an upbeat electronic track about the future of AI",
  "model": "chirp-v4-5",
  "instrumental": false
}
```

### 2. Custom Generation (Full Control)

Provide your own lyrics, title, and style for precise control.

```json
POST /suno/audios
{
  "action": "custom",
  "lyric": "[Verse]\nCode is poetry in motion\n[Chorus]\nWe build the future tonight",
  "title": "Digital Dreams",
  "style": "Synthwave, Electronic, Dreamy",
  "model": "chirp-v4-5"
}
```

### 3. Extend a Song

Continue an existing song from a specific timestamp.

```json
POST /suno/audios
{
  "action": "extend",
  "audio_id": "existing-audio-id",
  "lyric": "[Bridge]\nNew section lyrics here",
  "continue_at": 120.0
}
```

### 4. Cover / Remix

Create a new version of an existing song in a different style.

```json
POST /suno/audios
{
  "action": "cover",
  "audio_id": "existing-audio-id",
  "style": "Jazz, Acoustic, Mellow"
}
```

### 5. Generate Lyrics Only

```json
POST /suno/lyrics
{
  "prompt": "a ballad about lost love"
}
```

### 6. Vocal Extraction (Stem Splitting)

Separate vocals from instrumentals.

```json
POST /suno/audios
{
  "action": "split",
  "audio_id": "existing-audio-id"
}
```

## Available Models

| Model | Best For |
|-------|---------|
| `chirp-v5` | Latest, highest quality |
| `chirp-v4-5-plus` | Enhanced v4.5 |
| `chirp-v4-5` | Good balance of quality/speed |
| `chirp-v4` | Fast, reliable |

## Async Task Polling

For long-running operations, omit `"wait": true` and poll:

```json
GET /suno/audios?action=fetch&audio_ids=<id1>,<id2>
```

Poll every 5-10 seconds until `status` is `complete`.

## More Skills

This skill is part of the [AceDataCloud Agent Skills](https://github.com/AceDataCloud/Skills) collection which includes 18 skills for:

- **AI Music**: Suno, Producer, Fish Audio
- **AI Image**: Midjourney, Flux, Seedream, NanoBanana
- **AI Video**: Luma, Sora, Veo, Kling, Hailuo, Seedance
- **AI Chat**: 50+ LLM models (GPT, Claude, Gemini, DeepSeek, Grok)
- **Tools**: Google Search, Face Transform, Short URL
