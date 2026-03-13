---
name: noizai-voice-workflow
description: Build human-like text-to-speech workflows with style controls, local/cloud backends, and delivery-ready audio outputs.
---

# NoizAI Voice Workflow

Use this skill when the user asks for practical text-to-speech workflows that should sound natural and be ready for downstream delivery.

## Source Repository

- https://github.com/NoizAI/skills

## When to use

- The user asks for more human-like TTS output
- The user needs emotional tone, filler style, or pacing control
- The user wants local-first or cloud-backed TTS fallback options
- The user needs generated audio prepared for app messaging or broadcast workflows

## Suggested flow

1. Clarify target scenario and voice style.
2. Choose backend mode (local for privacy, cloud for speed/features).
3. Generate short samples to validate style before long renders.
4. Render final audio and check format, clipping, and duration.
5. Prepare output for downstream publishing or app delivery.

## Quick commands

```bash
npx skills add NoizAI/skills --list --full-depth
npx skills add NoizAI/skills --full-depth --skill tts -y
```

## Notes

- Keep language factual and avoid exaggerated claims.
- If a backend is unavailable, provide a compatible fallback path.
