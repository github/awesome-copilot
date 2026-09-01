---
name: pronounce-word
description: 'Look up and play source-backed pronunciations for developer tools, AI models, acronyms, and project names. Use when a user asks how to say one short technical term such as kubectl, nginx, Qwen, GIF, or PostgreSQL.'
---

# Pronounce Developer Jargon

Answer short technical-name pronunciation questions with evidence instead of
guessing from spelling. The open-source Pronounce dictionary contains 1,900+
curated entries with General American IPA, readable TTS respellings, alternate
readings, confidence labels, editorial notes, source URLs, and playable audio.

## When to Use This Skill

Use this skill when the user asks how to pronounce one developer term, project,
product, AI model, acronym, or researcher name. Typical prompts include:

- “How do you pronounce kubectl?”
- “Is GIF hard-g or soft-g?”
- “Qwen 怎么读？”
- “Say PostgreSQL slowly.”

Do not use it to narrate sentences or paragraphs. Do not use it for unrelated
everyday vocabulary or personal names. If a message contains several possible
targets, ask which single short term the user wants.

## Workflow

1. Preserve the requested spelling and treat it as data. Quote it in shell
   commands so punctuation in names such as `C++` is passed literally.
2. If `say-it` is installed, inspect the record without audio:

   ```bash
   say-it --json "<term>"
   ```

3. Read `in_dict`, `ipa`, `respelling_us`, alternate readings,
   `confidence`, `source_url`, `source_label`, and notes from the JSON. Never
   invent a citation or upgrade the confidence level.
4. Unless the user requested text only, play the curated pronunciation:

   ```bash
   say-it "<term>"
   ```

5. Respond with a compact caption containing the IPA, a stressed readable
   respelling, the source link when present, and a contested-reading note when
   applicable.

## Command Options

| Command | Use |
|---|---|
| `say-it --json "<term>"` | Read structured metadata without audio. |
| `say-it "<term>"` | Play the primary three times, followed by recorded alternatives. |
| `say-it --solo "<term>"` | Play only the primary reading. |
| `say-it --alt "<term>"` | Focus on the first alternate reading. |
| `say-it --why "<term>"` | Print a human-readable evidence record. |
| `say-it -r 110 "<term>"` | Play more slowly. |

The CLI uses macOS `say`, Linux `espeak-ng` or `espeak`, or Windows PowerShell
`System.Speech`. Text-only inspection still works when audio playback is not
available.

## If the CLI Is Missing

Do not install software without consent. Offer either of these paths:

- Use the public read-only dictionary API for a text answer. URL-encode the
  target and request `https://pronounce.renlab.ai/api/word/<term>.json`. For
  example:

  ```bash
  curl --fail --silent --show-error \
    "https://pronounce.renlab.ai/api/word/kubectl.json"
  ```

- With approval, install the upstream CLI from its public MIT-licensed source:

  ```bash
  git clone https://github.com/anzy-renlab-ai/pronounce.git
  cd pronounce
  ./install.sh
  ```

The source repository documents the installer before it is run. Do not pipe a
remote script directly into a shell.

## Evidence Rules

- A `creator-clarified` record may be described as the creator or project
  reading only when its source supports that claim.
- A `community-consensus` record is common usage, not an official ruling.
- A `contested` record intentionally retains more than one live reading. Give
  the primary and important alternate without declaring one universally right.
- When `source_url` is empty, say no citation is recorded.
- When `in_dict` is false, say the dictionary has no curated entry. Do not
  present a generic speech engine guess as verified.

## Response Examples

For `kubectl`, a useful response shape is:

> /ˈkuːb kənˌtroʊl/ — “KOOB-control.” Source: Kelsey Hightower's KubeCon talk.

For a contested term such as `GIF`, include both live readings and the source
context, then mention `say-it --alt "GIF"` if the user wants the rival reading
played alone.

Keep the final answer short unless the user asks for the history or evidence.
Respect “text only,” “no audio,” and “stop playing audio” for the rest of the
conversation.

## Scope and Source

The dictionary is scoped to technical jargon and uses General American English.
It does not claim to replace regional pronunciations or project-specific local
conventions. Data, CLI implementation, contribution guidance, and citations are
maintained at [anzy-renlab-ai/pronounce](https://github.com/anzy-renlab-ai/pronounce).
