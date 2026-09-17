#!/usr/bin/env bash
# Convert a plain-text briefing into an MP3 using local neural TTS (Kyutai pocket-tts).
#
# Usage: tts.sh <input.txt> <output.mp3> [voice.safetensors]
#
# CPU-only and fully offline after the first model download, so it runs the same
# on an Apple Silicon Mac and in a Linux cloud agent container. No text is sent
# to any cloud TTS service.
#
# Resolution order for the engine:
#   1. pocket-tts already on PATH (e.g. `brew install pocket-tts`)
#   2. a cached venv at $SPEAK_TTS_HOME (default ~/.cache/speak-summary/venv)
#   3. create that venv and `pip install pocket-tts`
# Set SPEAK_TTS_BIN to point at a specific pocket-tts binary to skip all this.
set -euo pipefail

IN="${1:?usage: tts.sh <input.txt> <output.mp3> [voice.safetensors]}"
OUT="${2:?usage: tts.sh <input.txt> <output.mp3> [voice.safetensors]}"
VOICE="${3:-}"

TTS_HOME="${SPEAK_TTS_HOME:-$HOME/.cache/speak-summary/venv}"

# pocket-tts supports Python >=3.10,<3.15. The system python3 is often outside
# that range, so search for a usable interpreter rather than assuming.
find_python() {
  for c in python3.14 python3.13 python3.12 python3.11 python3.10 python3; do
    p="$(command -v "$c" 2>/dev/null)" || continue
    "$p" -c 'import sys; raise SystemExit(0 if (3,10) <= sys.version_info < (3,15) else 1)' 2>/dev/null \
      && { echo "$p"; return 0; }
  done
  return 1
}

resolve_tts() {
  if [ -n "${SPEAK_TTS_BIN:-}" ]; then echo "$SPEAK_TTS_BIN"; return; fi
  if command -v pocket-tts >/dev/null 2>&1; then command -v pocket-tts; return; fi
  if [ -x "$TTS_HOME/bin/pocket-tts" ]; then echo "$TTS_HOME/bin/pocket-tts"; return; fi

  PY="$(find_python)" || {
    cat >&2 <<'MSG'
No suitable Python found. pocket-tts requires Python >=3.10 and <3.15.
Install one (e.g. 'brew install python@3.14' or 'apt-get install -y python3.12-venv'),
or install pocket-tts yourself and point SPEAK_TTS_BIN at the binary.
MSG
    exit 1
  }

  echo "pocket-tts not found; creating a virtualenv at $TTS_HOME using $PY (one-off, a few minutes)..." >&2
  "$PY" -m venv "$TTS_HOME" >&2 || { echo "Failed to create virtualenv (is the venv module installed?)." >&2; exit 1; }
  "$TTS_HOME/bin/pip" install --quiet --upgrade pip >&2
  "$TTS_HOME/bin/pip" install --quiet pocket-tts >&2 || { echo "Failed to install pocket-tts." >&2; exit 1; }
  [ -x "$TTS_HOME/bin/pocket-tts" ] || { echo "pocket-tts install completed but the binary is missing." >&2; exit 1; }
  echo "$TTS_HOME/bin/pocket-tts"
}

TTS="$(resolve_tts)"
[ -x "$TTS" ] || { echo "TTS engine not executable: $TTS" >&2; exit 1; }

# Encoder: prefer ffmpeg; fall back to macOS afconvert (AAC in .m4a) if absent.
ENCODER=""
if command -v ffmpeg >/dev/null 2>&1; then ENCODER="ffmpeg"
elif command -v afconvert >/dev/null 2>&1; then ENCODER="afconvert"
else
  echo "Need ffmpeg to encode audio. Install with 'brew install ffmpeg' or 'apt-get install -y ffmpeg'." >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# pocket-tts quality degrades on very long inputs, so split into ~600-char chunks
# on sentence boundaries, synthesise each, then concatenate.
python3 - "$IN" "$WORK" <<'PY'
import re, sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text()
work = pathlib.Path(sys.argv[2])

# Strip markdown that would otherwise be read aloud as noise.
src = re.sub(r'```.*?```', ' ', src, flags=re.S)          # fenced code
src = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', src)        # links -> label
src = re.sub(r'^\s*#{1,6}\s*', '', src, flags=re.M)       # headings
src = re.sub(r'^\s*[-*+]\s+', '', src, flags=re.M)        # bullets
src = re.sub(r'[*_`>|~]+', '', src)                       # emphasis/code/table pipes
src = re.sub(r'https?://\S+', '', src)                    # bare URLs
src = re.sub(r'[ \t]+', ' ', src)
src = re.sub(r'\n{2,}', '\n\n', src).strip()

MAX = 600
chunks, cur = [], ""
for sent in re.split(r'(?<=[.!?])\s+|\n\n', src):
    sent = sent.strip()
    if not sent:
        continue
    # A single sentence longer than MAX is split on commas as a last resort.
    while len(sent) > MAX:
        cut = sent.rfind(',', 0, MAX)
        cut = cut if cut > MAX // 2 else sent.rfind(' ', 0, MAX)
        cut = cut if cut > 0 else MAX
        if cur:
            chunks.append(cur); cur = ""
        chunks.append(sent[:cut].strip())
        sent = sent[cut:].strip(' ,')
    if len(cur) + len(sent) + 1 > MAX:
        if cur:
            chunks.append(cur)
        cur = sent
    else:
        cur = f"{cur} {sent}".strip()
if cur:
    chunks.append(cur)

if not chunks:
    raise SystemExit("No speakable text found in input.")

for i, c in enumerate(chunks):
    (work / f"chunk_{i:04d}.txt").write_text(c)
PY

N=0
for f in "$WORK"/chunk_*.txt; do
  IDX="$(basename "$f" .txt)"
  ARGS=(generate --quiet --text "$(cat "$f")" --output-path "$WORK/$IDX.wav")
  [ -n "$VOICE" ] && ARGS+=(--voice "$VOICE")
  N=$((N+1))
  echo "  synthesising chunk $N ..." >&2
  "$TTS" "${ARGS[@]}" >/dev/null
  echo "file '$WORK/$IDX.wav'" >> "$WORK/list.txt"
done

mkdir -p "$(dirname "$OUT")"

if [ "$ENCODER" = "ffmpeg" ]; then
  ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$WORK/list.txt" \
    -c:a libmp3lame -b:a 96k -ar 24000 -ac 1 "$OUT"
else
  # afconvert cannot concat, so join the WAVs first, then encode to AAC.
  python3 - "$WORK" "$WORK/joined.wav" <<'PY'
import sys, wave, pathlib
work, out = pathlib.Path(sys.argv[1]), sys.argv[2]
parts = sorted(work.glob("chunk_*.wav"))
with wave.open(parts[0], 'rb') as w0:
    params = w0.getparams()
with wave.open(out, 'wb') as o:
    o.setparams(params)
    for p in parts:
        with wave.open(str(p), 'rb') as w:
            o.writeframes(w.readframes(w.getnframes()))
PY
  OUT="${OUT%.mp3}.m4a"
  afconvert -f m4af -d aac -b 96000 "$WORK/joined.wav" "$OUT"
  echo "Note: ffmpeg not available; wrote AAC (.m4a) instead of MP3." >&2
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "Wrote $OUT ($SIZE, $N chunks)"
