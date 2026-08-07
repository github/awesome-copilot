---
name: edit-timeline-studio
description: 'Create and refine editable Timeline Studio video projects from local images, video, and audio. Use when assembling a timeline, generating voiceover or captions, adding overlays, validating deterministic browser rendering, saving a .timeline project, or exporting MP4/WebM while keeping the edit reversible. Works with GitHub Copilot, Codex, Claude Code, and other Agent Skills-compatible hosts.'
license: MIT
compatibility: Requires a modern Chromium browser for the hosted editor, or Node.js 20+ and the Timeline Studio repository for local development. Browser automation is optional.
metadata:
  author: MartinDelophy
  version: '1.0'
---

# Edit Timeline Studio

Create a real, editable video project instead of returning only an opaque one-shot render. Use Timeline Studio's multi-track editor for local media, AI voiceover, synchronized captions, overlays, music, and deterministic browser export.

## Choose the execution path

1. Use the hosted editor at <https://video-editor.ai-creator.top/> when the user wants an immediate editing session and browser control is available.
2. Use the local repository at <https://github.com/MartinDelophy/ai-video-editor> for development, unpublished features, repeatable evaluation, or automated tests.
3. When neither browser control nor a local checkout is available, prepare an exact edit plan and tell the user which media and decisions are still required. Do not pretend the edit was applied.

For local work, inspect `package.json`, install dependencies, start the development server, and use the URL printed by the server. Do not assume a fixed port.

## Editing workflow

### 1. Inspect the source media

- Resolve every user-provided image, video, and audio file explicitly.
- Record media type, duration, dimensions, frame rate when relevant, and whether video contains audio.
- Preserve the user's editorial brief verbatim before making creative choices.
- Ask only when an unresolved decision materially changes the result, such as aspect ratio, target duration, language, or voice.

### 2. Build an editable timeline

- Import the first visual into the main Visuals track and arrange later visuals deliberately.
- Keep the main Visuals sequence contiguous unless the user requests a gap.
- Place picture-in-picture media on Overlay tracks.
- Place captions, stickers, source audio, voiceover, and music as independently timed clips.
- Preserve clip identity, source offsets, timing, and media references while trimming or moving clips.
- Prefer complete-frame contain fitting when source and project aspect ratios differ. Crop only when the user explicitly requests fill or cover behavior.

### 3. Add voiceover and captions

- Use the requested voice and language; never silently substitute another model or voice after a failure.
- Align voice clips and captions to the intended visual beats.
- Generate captions from the selected audio clip when automatic transcription is requested.
- Review caption text, timing, wrapping, and safe-area placement instead of trusting raw transcription output.
- Keep captions editable in the project even when they are also burned into an exported video.

### 4. Add visual and audio polish

- Apply overlays, stickers, transitions, masks, keyframes, and effects only when they support the brief.
- Check music and voice balance by listening, not merely by confirming that tracks exist.
- Preserve embedded video audio separately from generated voiceover, separated source audio, and music.
- Keep every change reversible through normal timeline editing.

### 5. Save the project before export

- Save or download a `.timeline` project archive before the final render.
- Treat the `.timeline` file as the editable source of truth.
- Keep referenced local media available or bundled according to the editor's project-save behavior.
- Never replace the editable deliverable with only an MP4 or WebM.

### 6. Export and verify

- Prefer Timeline Studio's deterministic offline renderer, which resolves frames from exact timeline timestamps and composes video, captions, stickers, overlays, effects, and mixed audio.
- Export MP4 when the browser supports the requested codec/container; otherwise use WebM or the editor's documented compatibility fallback.
- Verify the exported file by decoding it, not only by checking that a download completed.
- Confirm dimensions, duration, visible frame count, opening and final frames, caption visibility, transparent overlays, and the presence of an audible audio track.
- Report when compatibility fallback was used because its timing guarantees may differ from deterministic offline rendering.

## Deliverables

Return or identify all artifacts produced:

- the editable `.timeline` project;
- the final `.mp4` or `.webm` render;
- a short timeline summary covering aspect ratio, duration, clip order, captions, overlays, and audio tracks;
- any limitation, fallback, missing model, or unsupported operation encountered.

## Verification checklist

- The requested local media appears on the intended tracks.
- Clip order and timing match the brief.
- Voiceover and captions stay synchronized at cuts and clip boundaries.
- Captions remain readable and editable.
- Overlays and transparent stickers render without black backgrounds.
- Preview and export use matching fit, crop, transform, mask, and caption geometry.
- The `.timeline` archive can be reopened and edited.
- The exported MP4/WebM decodes with the expected dimensions, duration, visible content, and audio.

## Safety and honesty

- Do not upload local media to an unrequested third-party service.
- Do not start paid or remote AI generation without explicit user authorization.
- Do not invent media, voice, font, model, export, or verification results.
- Do not claim deterministic or idempotent execution when only approximate UI automation or MediaRecorder fallback was available.
- Preserve a valid partial timeline when an operation fails, and state the exact unsupported action or missing capability.

## Example requests

- "Turn these local clips into a 30-second vertical video, add Chinese voiceover and captions, and give me the editable project plus MP4."
- "Open this `.timeline` project, replace the intro image, retime the captions, and export WebM without changing the music."
- "Run the local Timeline Studio editor and verify that captions, stickers, and voiceover survive deterministic export."
