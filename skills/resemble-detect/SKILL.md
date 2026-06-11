---
name: resemble-detect
description: Deepfake detection and media safety — detect AI-generated audio, images, video, and text, trace synthesis sources, apply watermarks, verify speaker identity, and analyze media intelligence using Resemble AI
license: Apache-2.0
compatibility: 'Requires a Resemble AI API key (https://app.resemble.ai) set as RESEMBLE_API_KEY. All media must be accessible via public HTTPS URLs — local file paths are not supported except for text detection.'
---

# Resemble Detect — Deepfake Detection & Media Safety

Analyze audio, image, video, and text for synthetic manipulation, AI-generated content, watermarks, speaker identity, and media intelligence using the Resemble AI platform.

## Core Principle — THE IRON LAW

**"NEVER DECLARE MEDIA AS REAL OR FAKE WITHOUT A COMPLETED DETECTION RESULT."**

Do not guess, infer, or speculate about media authenticity. Every authenticity claim must be backed by a completed Resemble detect job with a returned `label`, `score`, and `status: "completed"`. If the detection is still `processing`, wait. If it `failed`, say so — do not substitute your own judgment.

## When to Use

Use this skill whenever the user's request involves any of these:

- Checking if audio, video, image, or text is AI-generated or manipulated
- Detecting deepfakes in any media format
- Verifying media authenticity or provenance
- Identifying which AI platform synthesized audio (source tracing)
- Applying or detecting watermarks on media
- Analyzing media for speaker info, emotion, transcription, or misinformation
- Asking natural-language questions about detection results
- Matching or verifying speaker identity against known voice profiles
- Detecting AI-generated or machine-written text
- Any mention of: "deepfake", "fake detection", "synthetic media", "voice verification", "watermark", "media forensics", "authenticity check", "source tracing", "is this real", "AI-written text", "text detection"

**Do NOT use** for text-to-speech generation, voice cloning, or speech-to-text transcription — those are separate Resemble capabilities.

## Capability Decision Tree

| User wants to...                                      | Use this                  | API endpoint                          |
|-------------------------------------------------------|---------------------------|---------------------------------------|
| Check if media is AI-generated / deepfake             | **Deepfake Detection**    | `POST /detect`                        |
| Know *which AI platform* made fake audio              | **Audio Source Tracing**  | `POST /detect` with flag              |
| Get speaker info, emotion, transcription from media   | **Intelligence**          | `POST /intelligence`                  |
| Ask questions about a completed detection             | **Detect Intelligence**   | `POST /detects/{uuid}/intelligence`   |
| Apply an invisible watermark to media                 | **Watermark Apply**       | `POST /watermark/apply`               |
| Check if media contains a watermark                   | **Watermark Detect**      | `POST /watermark/detect`              |
| Verify a speaker's identity against known profiles    | **Identity Search**       | `POST /identity/search`               |
| Check if text is AI-generated                         | **Text Detection**        | `POST /text_detect`                   |
| Create a voice identity profile for future matching   | **Identity Create**       | `POST /identity`                      |

When multiple capabilities apply (e.g., user wants deepfake detection AND intelligence), combine them in a single `POST /detect` call using the `intelligence: true` flag rather than making separate requests.

## Required Setup

- **API Key**: Bearer token from the Resemble AI dashboard (set as `RESEMBLE_API_KEY`)
- **Base URL**: `https://app.resemble.ai/api/v2`
- **Auth Header**: `Authorization: Bearer <RESEMBLE_API_KEY>`
- **Media Requirement**: All media must be at a publicly accessible HTTPS URL

If the user provides a local file path instead of a URL, inform them the file must be hosted at a public HTTPS URL first. Do not attempt to upload local files to the API. (Exception: `POST /text_detect` accepts text content inline.)

## MCP Tools Available

When the Resemble MCP server is connected, use these tools instead of raw API calls:

| Tool                      | Purpose                                           |
|---------------------------|---------------------------------------------------|
| `resemble_docs_lookup`    | Get comprehensive docs for any detect sub-topic   |
| `resemble_search`         | Search across all documentation                   |
| `resemble_api_endpoint`   | Get exact OpenAPI spec for any endpoint           |
| `resemble_api_search`     | Find endpoints by keyword                         |
| `resemble_get_page`       | Read specific documentation pages                 |
| `resemble_list_topics`    | List all available topics                         |

**Tool usage pattern**: Use `resemble_docs_lookup` with topic `"detect"` to get the full picture, then `resemble_api_endpoint` for exact request/response schemas before making API calls.

## Full API Reference

Detailed request/response schemas for every endpoint are in **[references/api-reference.md](references/api-reference.md)**. Consult it before making any API call to verify exact parameter names and response shapes. The sections below cover decision-making; the reference covers exact field formats.

---

## Phase 1: Deepfake Detection

The core capability. Submit audio, image, or video for AI-generated content analysis via `POST /detect`.

**Key flags to consider:**
- `visualize: true` — generate heatmap/visualization artifacts
- `intelligence: true` — run multimodal intelligence alongside detection (saves a round-trip)
- `audio_source_tracing: true` — identify which AI platform synthesized fake audio (only fires on `"fake"` audio)
- `use_reverse_search: true` — enable reverse image search (image only)
- `zero_retention_mode: true` — auto-delete media after analysis (for sensitive content)

Detection is asynchronous. Poll `GET /detect/{uuid}` at 2s → 5s → 10s intervals until `status` is `"completed"` or `"failed"`. Most complete in 10–60 seconds.

**Supported formats:** Audio (WAV, MP3, OGG, M4A, FLAC) · Video (MP4, MOV, AVI, WMV) · Image (JPG, PNG, GIF, WEBP)

### Reading Results

- **Audio** — verdict in `metrics` — use `label` and `aggregated_score`
- **Image** — verdict in `image_metrics` — use `label` and `score`; `ifl` has an Invisible Frequency Layer heatmap
- **Video** — verdict in `video_metrics` — hierarchical tree of frame/segment results; video-with-audio returns both `metrics` and `video_metrics`

See [references/api-reference.md](references/api-reference.md#reading-results-by-media-type) for full response schemas.

### Interpreting Scores

| Score Range | Interpretation                                      |
|-------------|-----------------------------------------------------|
| 0.0 – 0.3  | Strong indication of authentic/real media            |
| 0.3 – 0.5  | Inconclusive — recommend additional analysis         |
| 0.5 – 0.7  | Likely synthetic — flag for review                   |
| 0.7 – 1.0  | High confidence synthetic/AI-generated               |

**Always present scores with context.** Say "The detection returned a score of 0.87, indicating high confidence that this audio is AI-generated" — never just "it's fake."

---

## Phase 2: Intelligence — Media Analysis

Rich structured insights about media: speaker info, emotion, transcription, translation, misinformation, abnormalities.

Two ways to run Intelligence:
1. **Combined with detection** — add `intelligence: true` to `POST /detect` (preferred; one call)
2. **Standalone** — `POST /intelligence` with a URL (when you only need analysis, not a deepfake verdict)

**Audio/video structured fields include:** `speaker_info`, `language`, `dialect`, `emotion`, `speaking_style`, `context`, `message`, `abnormalities`, `transcription`, `translation`, `misinformation`.

**Image structured fields include:** `scene_description`, `subjects`, `authenticity_analysis`, `context_and_setting`, `abnormalities`, `misinformation`.

### Detect Intelligence — Ask Questions About Results

After a detection completes, ask natural-language questions via `POST /detects/{detect_uuid}/intelligence` with `{ "query": "..." }`. Returns a question UUID — poll `GET /detects/{detect_uuid}/intelligence/{question_uuid}` until `completed`.

**Good questions to suggest:**
- "Summarize the detection results in plain language"
- "What specific indicators suggest this is AI-generated?"
- "How do the audio and video detection results differ?"
- "What is the confidence level and what does it mean?"
- "Are there any inconsistencies in the analysis?"

**Prerequisite:** The detection must have `status: "completed"`. Submitting a question against a processing or failed detection returns 422.

See [references/api-reference.md](references/api-reference.md#intelligence) for full parameters.

---

## Phase 3: Audio Source Tracing

When audio is labeled `"fake"`, identify which AI platform generated it.

**Enable it** by setting `audio_source_tracing: true` in the `POST /detect` request. Result appears in the detection response under `audio_source_tracing.label`.

Known labels: `resemble_ai`, `elevenlabs`, `real`, and others as the model expands.

**Important:** Source tracing only runs on audio labeled `"fake"`. Real audio produces no source tracing result.

Standalone queries: `GET /audio_source_tracings` and `GET /audio_source_tracings/{uuid}`.

---

## Phase 4: Watermarking

Apply invisible watermarks to media for provenance tracking, or detect existing watermarks.

- **Apply**: `POST /watermark/apply` with `url`, optional `strength` (0.0–1.0), optional `custom_message`. Add `Prefer: wait` for synchronous response, or poll `GET /watermark/apply/{uuid}/result`. Response includes `watermarked_media` URL.
- **Detect**: `POST /watermark/detect` with `url`. Audio returns `{ has_watermark, confidence }`; image/video returns `{ has_watermark }`.

See [references/api-reference.md](references/api-reference.md#watermarking) for exact parameter rules.

---

## Phase 5: Identity — Speaker Verification (Beta)

Create voice identity profiles and match incoming audio against them.

> **Beta feature** — requires joining the preview program. Inform the user if they encounter access errors.

- **Create profile**: `POST /identity` with `{ audio_url, name }`
- **Search**: `POST /identity/search` with `{ audio_url, top_k }`

Response returns ranked matches with `confidence` (higher = stronger) and `distance` (lower = closer match).

See [references/api-reference.md](references/api-reference.md#identity--speaker-verification-beta) for full schemas.

---

## Phase 6: Text Detection

Detect whether text content is AI-generated or human-written via `POST /text_detect`.

> **Beta feature** — requires the `detect_beta_user` role or a billing plan that includes the `dfd_text` product.

**Key parameters:**
- `text` (required, max 100,000 chars)
- `threshold` (default 0.5)
- `privacy_mode: true` — text content not stored after analysis
- `callback_url` — async notification webhook

Add `Prefer: wait` for synchronous response, or poll `GET /text_detect/{uuid}`. Response includes `prediction` (`"ai"` or `"human"`) and `confidence` (0.0–1.0).

See [references/api-reference.md](references/api-reference.md#text-detection) for full schema and callback format.

---

## Recommended Workflows

### Full Media Forensics (Most Thorough)

For a comprehensive analysis, combine all capabilities:

1. Submit detection with all flags enabled:
   ```json
   {
     "url": "https://example.com/suspect.mp4",
     "visualize": true,
     "intelligence": true,
     "audio_source_tracing": true,
     "use_reverse_search": true
   }
   ```
2. Poll until `status: "completed"`
3. Read `metrics` / `image_metrics` / `video_metrics` for the verdict
4. Read `intelligence.description` for structured media analysis
5. If audio labeled `"fake"`, check `audio_source_tracing.label` for the source platform
6. Ask follow-up questions via Detect Intelligence if anything needs clarification
7. Check for watermarks via `POST /watermark/detect` if provenance is relevant

### Quick Authenticity Check (Fastest)

1. Submit minimal detection: `{ "url": "..." }`
2. Poll until complete
3. Check `label` and `aggregated_score` (audio) or `label` and `score` (image/video)
4. Report result with score context

### Provenance Pipeline (Content Creators)

1. Apply watermark to original content: `POST /watermark/apply`
2. Distribute watermarked media
3. Later, verify provenance: `POST /watermark/detect` against any copy

---

## Red Flags — Stop and Reassess

- **Declaring authenticity without a detection result** — Never say media is real or fake based on visual/auditory inspection alone
- **Ignoring the score and reporting only the label** — A `"fake"` label with score 0.51 means something very different from score 0.95
- **Submitting local file paths to the API** — The API requires publicly accessible HTTPS URLs (does not apply to text detection)
- **Sending text longer than 100,000 characters to text detection** — Split into chunks or inform the user of the limit
- **Polling too aggressively** — Start at 2s intervals, back off exponentially; do not loop at <1s
- **Asking Detect Intelligence questions before detection completes** — Results in 422 error
- **Expecting source tracing on "real" audio** — Source tracing only runs on audio labeled `"fake"`
- **Treating beta features (Identity, Text Detection) as production-ready** — Warn users about beta status
- **Ignoring `zero_retention_mode` for sensitive media** — Always suggest this flag when the user indicates the media is sensitive or private
- **Making multiple separate API calls when flags can combine** — Use `intelligence: true` and `audio_source_tracing: true` on the detection call instead of separate requests

## Response Presentation Guidelines

When presenting results to users:

1. **Lead with the verdict** — "The detection indicates this audio is likely AI-generated (score: 0.87)"
2. **Provide score context** — Use the score interpretation table above
3. **Mention limitations** — Detection is probabilistic, not absolute proof
4. **Include actionable next steps** — Suggest intelligence queries, source tracing, or watermark checks as appropriate
5. **For inconclusive results (0.3–0.5)** — Explicitly state the result is inconclusive and recommend additional analysis with different parameters or manual review
6. **Never present detection as legal evidence** — Detection results are analytical tools, not forensic certifications

## Error Handling

| Error     | Cause                                      | Resolution                                      |
|-----------|--------------------------------------------|-------------------------------------------------|
| 400       | Invalid request body or missing `url`      | Check required parameters                       |
| 401       | Invalid or missing API key                 | Verify `RESEMBLE_API_KEY`                       |
| 404       | Detection UUID not found                   | Verify the UUID from the creation response     |
| 422       | Detection not completed (for Intelligence) | Wait for detection to reach `completed` status |
| 429       | Rate limited                               | Back off and retry with exponential delay       |
| 500       | Server error                               | Retry once, then report to user                  |

## Privacy & Compliance Notes

- **Zero retention mode**: Set `zero_retention_mode: true` to auto-delete media after analysis. The URL is redacted and `media_deleted` is set to true post-completion.
- **Text privacy mode**: Set `privacy_mode: true` on text detection to prevent text content from being stored after analysis.
- **Data handling**: Media URLs and text content are stored by default. For GDPR/compliance-sensitive workflows, enable zero retention (media) or privacy mode (text).
- **Callback security**: If using `callback_url`, ensure the endpoint is HTTPS and authenticated on the receiving end.
