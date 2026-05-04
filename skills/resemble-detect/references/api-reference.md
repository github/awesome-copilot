# Resemble Detect — Full API Reference

Detailed request/response schemas for every Resemble detection endpoint.

## Base

- **Base URL**: `https://app.resemble.ai/api/v2`
- **Auth**: `Authorization: Bearer <RESEMBLE_API_KEY>`

---

## Deepfake Detection

### `POST /detect`

Submit audio, image, or video for AI-generation analysis.

```json
{
  "url": "https://example.com/media.mp4",
  "visualize": true,
  "intelligence": true,
  "audio_source_tracing": true
}
```

| Parameter              | Type    | Required | Description                                              |
|------------------------|---------|----------|----------------------------------------------------------|
| `url`                  | string  | Yes      | HTTPS URL to audio, image, or video file                 |
| `callback_url`         | string  | No       | Webhook URL for async completion notification            |
| `visualize`            | boolean | No       | Generate heatmap/visualization artifacts                 |
| `intelligence`         | boolean | No       | Run multimodal intelligence alongside detection          |
| `audio_source_tracing` | boolean | No       | Identify which AI platform synthesized fake audio        |
| `frame_length`         | integer | No       | Audio/video window size in seconds (1–4, default 2)      |
| `start_region`         | number  | No       | Start of segment to analyze (seconds)                    |
| `end_region`           | number  | No       | End of segment to analyze (seconds)                      |
| `model_types`          | string  | No       | `"image"` or `"talking_head"` (for face-swap detection)  |
| `use_reverse_search`   | boolean | No       | Enable reverse image search (image only)                 |
| `use_ood_detector`     | boolean | No       | Enable out-of-distribution detection                     |
| `zero_retention_mode`  | boolean | No       | Auto-delete media after detection completes              |

**Supported formats:** Audio (WAV, MP3, OGG, M4A, FLAC) · Video (MP4, MOV, AVI, WMV) · Image (JPG, PNG, GIF, WEBP)

### `GET /detect/{uuid}` — Poll for Results

Detection is asynchronous. Poll until `status` is `"completed"` or `"failed"`. Start at 2s intervals, back off to 5s, then 10s. Most detections complete within 10–60s.

### Reading Results by Media Type

**Audio results** — in `metrics`:
```json
{
  "label": "fake",
  "score": ["0.92", "0.88", "0.95"],
  "consistency": "0.91",
  "aggregated_score": "0.92",
  "image": "https://..."
}
```
- `label`: `"fake"` or `"real"` — the verdict
- `score`: Per-chunk prediction scores (array)
- `aggregated_score`: Overall confidence (0.0–1.0, higher = more likely synthetic)
- `consistency`: How consistent the prediction is across chunks
- `image`: Visualization heatmap URL (if `visualize: true`)

**Image results** — in `image_metrics`:
```json
{
  "type": "ImageAnalysis",
  "label": "fake",
  "score": 0.87,
  "image": "https://...",
  "ifl": { "score": 0.82, "heatmap": "https://..." },
  "reverse_image_search_sources": [
    { "url": "...", "title": "...", "verdict": "known_fake", "similarity": 0.95 }
  ]
}
```
- `ifl`: Invisible Frequency Layer analysis with heatmap
- `reverse_image_search_sources`: Known online sources (if `use_reverse_search: true`)

**Video results** — in `video_metrics`:
```json
{
  "label": "fake",
  "score": 0.89,
  "certainty": 0.91,
  "children": [
    { "type": "VideoResult", "conclusion": "Fake", "score": 0.89, "timestamp": 2.5, "children": [...] }
  ]
}
```
- Hierarchical tree of frame-level and segment-level results
- Video with audio track returns both `metrics` (audio) and `video_metrics` (visual)

---

## Intelligence

### `POST /intelligence`

Analyze media for rich structured insights, standalone or alongside detection.

```json
{ "url": "https://example.com/audio.mp3", "json": true }
```

| Parameter      | Type    | Required | Description                                              |
|----------------|---------|----------|----------------------------------------------------------|
| `url`          | string  | One of   | HTTPS URL to media file                                  |
| `media_token`  | string  | One of   | Token from secure upload (alternative to URL)            |
| `detect_id`    | string  | No       | UUID of existing detect to associate                     |
| `media_type`   | string  | No       | `"audio"`, `"video"`, or `"image"` (auto-detected)       |
| `json`         | boolean | No       | Return structured fields (default: false audio/video, true image) |
| `callback_url` | string  | No       | Webhook for async mode                                   |

**Audio/Video structured response** (`json: true`):
- `speaker_info` — speaker description (age, gender)
- `language` / `dialect` — detected language
- `emotion` — detected emotional state
- `speaking_style` — conversational, formal, etc.
- `context` — inferred context of the speech
- `message` — content summary
- `abnormalities` — anomalies detected in the media
- `transcription` — full transcript
- `translation` — translation if non-English
- `misinformation` — misinformation analysis

**Image structured response:**
- `scene_description` — what the image shows
- `subjects` — people/objects identified
- `authenticity_analysis` — visual authenticity assessment
- `context_and_setting` — environment description
- `abnormalities` — visual anomalies
- `misinformation` — misinformation analysis

### `POST /detects/{detect_uuid}/intelligence` — Ask Questions

After detection completes, ask natural-language questions about it:

```json
{ "query": "How confident is the model that this audio is fake?" }
```

Returns a question UUID. Poll `GET /detects/{detect_uuid}/intelligence/{question_uuid}` until `status` is `"completed"`.

**Prerequisite:** The detection must have `status: "completed"`. Otherwise returns 422.

---

## Audio Source Tracing

Enable by setting `audio_source_tracing: true` in `POST /detect`.

Result appears in the detection response under `audio_source_tracing`:
```json
{ "label": "elevenlabs", "error_message": null }
```

Known source labels: `resemble_ai`, `elevenlabs`, `real`, and others as the model expands.

**Important:** Source tracing only runs when audio is labeled `"fake"`. If audio is `"real"`, no source tracing result appears.

**Standalone queries:**
- `GET /audio_source_tracings` — list all source tracing reports
- `GET /audio_source_tracings/{uuid}` — get specific report

---

## Watermarking

### `POST /watermark/apply`

```json
{
  "url": "https://example.com/image.png",
  "strength": 0.3,
  "custom_message": "my-organization"
}
```

| Parameter        | Type   | Required | Description                                                 |
|------------------|--------|----------|-------------------------------------------------------------|
| `url`            | string | Yes      | HTTPS URL to media file                                     |
| `strength`       | number | No       | Watermark strength 0.0–1.0 (image/video only, default 0.2)  |
| `custom_message` | string | No       | Custom message (image/video only, default "resembleai")     |

- Add `Prefer: wait` header for synchronous response
- Without it, poll `GET /watermark/apply/{uuid}/result`
- Response includes `watermarked_media` URL to download the watermarked file

### `POST /watermark/detect`

```json
{ "url": "https://example.com/suspect-image.png" }
```

**Audio detection result:**
```json
{ "has_watermark": true, "confidence": 0.95 }
```

**Image/Video detection result:**
```json
{ "has_watermark": true }
```

---

## Identity — Speaker Verification (Beta)

> **Beta feature** — requires joining the preview program. Inform the user if they encounter access errors.

### `POST /identity` — Create Identity Profile

```json
{
  "audio_url": "https://example.com/known-speaker.wav",
  "name": "Jane Doe"
}
```

### `POST /identity/search` — Search Against Known Identities

```json
{
  "audio_url": "https://example.com/unknown-speaker.wav",
  "top_k": 5
}
```

**Response:**
```json
{
  "success": true,
  "item": [
    { "uuid": "...", "name": "Jane Doe", "confidence": 0.92, "distance": 0.08 }
  ]
}
```

Lower `distance` = closer match. Higher `confidence` = stronger match.

---

## Text Detection

> **Beta feature** — requires the `detect_beta_user` role or a billing plan that includes the `dfd_text` product.

### `POST /text_detect`

Add `Prefer: wait` for synchronous response. Otherwise poll or use callback.

| Parameter      | Type    | Required | Description                                              |
|----------------|---------|----------|----------------------------------------------------------|
| `text`         | string  | Yes      | Text to analyze (max 100,000 characters)                 |
| `thinking`     | string  | No       | Always use `"low"` (default)                             |
| `threshold`    | float   | No       | Decision threshold 0.0–1.0 (default: 0.5)                |
| `callback_url` | string  | No       | Webhook URL for async completion notification            |
| `privacy_mode` | boolean | No       | If true, text content is not stored after analysis       |

**Response:**
```json
{
  "success": true,
  "item": {
    "uuid": "abc-123",
    "status": "completed",
    "prediction": "ai",
    "confidence": 0.91,
    "text_content": "This is some text to analyze.",
    "privacy_mode": false,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

- `prediction`: `"ai"` or `"human"` — the verdict
- `confidence`: 0.0–1.0, higher = more confident
- `status`: `"processing"`, `"completed"`, or `"failed"`

### `GET /text_detect/{uuid}` — Poll

Poll until `status` is `"completed"` or `"failed"`.

### `GET /text_detect` — List

Returns paginated text detections for the team.

### Callback

If `callback_url` was provided, a `POST` is sent on completion:
```json
{ "success": true, "item": { ... } }
```
On failure:
```json
{ "success": false, "item": { ... }, "error": "Error message here" }
```
