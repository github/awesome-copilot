#!/usr/bin/env bash
# run_profile.sh — Wrapper around asprof for common profiling scenarios.
#
# Usage:
#   bash scripts/run_profile.sh [options] <PID|app-name>
#
# Options:
#   -e, --event   cpu|alloc|wall|lock    Single event (default: cpu)
#   -d, --duration N                     Seconds to profile (default: 30)
#   -f, --format  html|svg|jfr|collapsed|txt Output format for single-event (default: html)
#   -o, --output  FILE                   Output path (default: auto-named)
#   -t, --threads                        Profile threads separately
#       --all                            Capture all events to a JFR file
#       --comprehensive                  Capture all events AND split into per-event
#                                        flamegraphs in parallel (recommended for
#                                        diagnosis when you don't know the cause)
#       --asprof  PATH                   Path to asprof binary (auto-detected)
#   -h, --help                           Show this help
#
# Examples:
#   bash scripts/run_profile.sh 12345                        # 30s CPU flamegraph
#   bash scripts/run_profile.sh --comprehensive 12345        # all events, split into flamegraphs
#   bash scripts/run_profile.sh -e alloc -d 60 MyApp         # 60s allocation flamegraph
#   bash scripts/run_profile.sh -e wall -f jfr 12345         # wall-clock JFR recording
#   bash scripts/run_profile.sh --all -d 120 12345           # all events, single JFR file

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
EVENT="cpu"
DURATION=30
FORMAT="html"
FORMAT_SET=false
OUTPUT=""
THREADS=false
ALL_EVENTS=false
COMPREHENSIVE=false
ASPROF=""
TARGET=""

detect_format_from_output() {
  local output_path="$1"
  case "${output_path##*.}" in
    html|svg|jfr|collapsed|txt) echo "${output_path##*.}" ;;
    *) echo "" ;;
  esac
}

stat_mtime() {
  if [[ "$(uname)" == "Darwin" ]]; then
    stat -f '%m' "$1" 2>/dev/null || echo 0
  else
    stat -c '%Y' "$1" 2>/dev/null || echo 0
  fi
}

newest_by_mtime() {
  local newest="" newest_mtime=0 candidate mtime
  for candidate in "$@"; do
    [[ -n "$candidate" ]] || continue
    mtime="$(stat_mtime "$candidate")"
    if [[ -z "$newest" || "$mtime" -gt "$newest_mtime" ]]; then
      newest="$candidate"
      newest_mtime="$mtime"
    fi
  done
  echo "$newest"
}

default_installed_asprof() {
  local script_dir install_script candidate newest_versioned=""
  local -a versioned_candidates=()
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  install_script="${script_dir}/install.sh"
  if [[ -f "$install_script" ]]; then
    for candidate in \
      "$(bash "$install_script" --path-only 2>/dev/null || true)" \
      "$(bash "$install_script" /opt --path-only 2>/dev/null || true)"
    do
      if [[ -x "$candidate" ]]; then
        echo "$candidate"
        return 0
      fi
    done
  fi

  shopt -s nullglob
  versioned_candidates=("$HOME"/async-profiler-*/bin/asprof /opt/async-profiler-*/bin/asprof)
  shopt -u nullglob
  if [[ ${#versioned_candidates[@]} -gt 0 ]]; then
    newest_versioned="$(newest_by_mtime "${versioned_candidates[@]}")"
    if [[ -x "$newest_versioned" ]]; then
      echo "$newest_versioned"
      return 0
    fi
  fi

  return 0
}

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--event)       [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; EVENT="$2";    shift 2 ;;
    -d|--duration)    [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; DURATION="$2"; shift 2 ;;
    -f|--format)      [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; FORMAT="$2"; FORMAT_SET=true; shift 2 ;;
    -o|--output)      [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; OUTPUT="$2";   shift 2 ;;
    -t|--threads)     THREADS=true;  shift ;;
    --all)            ALL_EVENTS=true; FORMAT="jfr"; shift ;;
    --comprehensive)  COMPREHENSIVE=true; ALL_EVENTS=true; FORMAT="jfr"; shift ;;
    --asprof)         [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; ASPROF="$2";   shift 2 ;;
    -h|--help)
      sed -n '2,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    -*)
      echo "❌ Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -n "$TARGET" ]]; then
        echo "❌ Multiple targets provided: '$TARGET' and '$1'." >&2
        echo "   Provide exactly one PID or app name." >&2
        exit 1
      fi
      TARGET="$1"
      shift
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "❌ No target specified. Provide a PID or app name."
  echo "   Usage: $0 [options] <PID|app-name>"
  echo "   List Java processes: jps -l"
  exit 1
fi

# ── Locate asprof ─────────────────────────────────────────────────────────────
if [[ -z "$ASPROF" ]]; then
  if command -v asprof &>/dev/null; then
    ASPROF="$(command -v asprof)"
  else
    INSTALLED_ASPROF="$(default_installed_asprof)"
    for candidate in \
      "$INSTALLED_ASPROF" \
      "$HOME/async-profiler/bin/asprof" \
      "/opt/async-profiler/bin/asprof" \
      "/usr/local/bin/asprof"
    do
      if [[ -x "$candidate" ]]; then
        ASPROF="$candidate"
        break
      fi
    done
  fi
fi

if [[ -z "$ASPROF" ]]; then
  echo "❌ asprof not found. Install with: bash scripts/install.sh"
  echo "   Or specify path: --asprof /path/to/asprof"
  exit 1
fi

if [[ ! -f "$ASPROF" || ! -x "$ASPROF" ]]; then
  echo "❌ --asprof must point to an executable asprof binary: $ASPROF" >&2
  exit 1
fi

# ── Build output filename ─────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [[ -z "$OUTPUT" ]]; then
  if $ALL_EVENTS; then
    OUTPUT="profile-all-${TIMESTAMP}.jfr"
  else
    EXT="$FORMAT"
    OUTPUT="profile-${EVENT}-${TIMESTAMP}.${EXT}"
  fi
fi

OUTPUT_FORMAT="$(detect_format_from_output "$OUTPUT")"
if [[ -z "$OUTPUT_FORMAT" ]]; then
  echo "❌ Unsupported output extension in '$OUTPUT'." >&2
  echo "   Use one of: .html, .svg, .jfr, .collapsed, .txt" >&2
  exit 1
fi

OUTPUT_DIR="$(dirname "$OUTPUT")"
if [[ "$OUTPUT_DIR" != "." ]] && [[ ! -d "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR" || {
    echo "❌ Failed to create output directory: $OUTPUT_DIR" >&2
    exit 1
  }
fi

if $FORMAT_SET && [[ "$FORMAT" != "$OUTPUT_FORMAT" ]]; then
  echo "❌ --format '$FORMAT' conflicts with output extension '.$OUTPUT_FORMAT'." >&2
  echo "   Use matching values or omit --format when --output already sets the format." >&2
  exit 1
fi
if $ALL_EVENTS && [[ "$OUTPUT_FORMAT" != "jfr" ]]; then
  echo "❌ --all/--comprehensive require a .jfr output file." >&2
  echo "   Received: $OUTPUT" >&2
  exit 1
fi
FORMAT="$OUTPUT_FORMAT"

# ── Build asprof command ──────────────────────────────────────────────────────
CMD=("$ASPROF" "-d" "$DURATION" "-f" "$OUTPUT")
$ALL_EVENTS  && CMD+=("--all") || CMD+=("-e" "$EVENT")
$THREADS     && CMD+=("-t")
CMD+=("$TARGET")

# ── Print plan ────────────────────────────────────────────────────────────────
echo "🔍 async-profiler run"
echo "   Binary  : $ASPROF"
echo "   Target  : $TARGET"
if $COMPREHENSIVE; then
  echo "   Mode    : comprehensive (all events → JFR → split into flamegraphs)"
elif $ALL_EVENTS; then
  echo "   Events  : all (cpu + alloc + wall + lock)"
else
  echo "   Event   : $EVENT"
fi
echo "   Duration: ${DURATION}s"
echo "   Output  : $OUTPUT"
$THREADS && echo "   Threads : separate"
echo ""
echo "▶ ${CMD[*]}"
echo "Press Ctrl+C to stop early (partial results will be saved)."
echo ""

# ── Execute ───────────────────────────────────────────────────────────────────
CAPTURE_INTERRUPTED=false
set +e
"${CMD[@]}"
ASPROF_STATUS=$?
set -e

if [[ "$ASPROF_STATUS" -eq 130 ]]; then
  CAPTURE_INTERRUPTED=true
  if [[ ! -f "$OUTPUT" ]]; then
    echo "❌ Profiling was interrupted before async-profiler wrote output: $OUTPUT" >&2
    exit 130
  fi
elif [[ "$ASPROF_STATUS" -ne 0 ]]; then
  echo "❌ async-profiler failed with exit code $ASPROF_STATUS." >&2
  exit "$ASPROF_STATUS"
fi

echo ""
if $CAPTURE_INTERRUPTED; then
  echo "⚠️  Capture interrupted; using partial results: $OUTPUT"
else
  echo "✅ Capture complete: $OUTPUT"
fi
echo ""

# ── Comprehensive mode: split JFR into per-event flamegraphs in parallel ──────
if $COMPREHENSIVE; then
  if ! command -v jfrconv &>/dev/null; then
    # jfrconv ships alongside asprof
    JFRCONV="$(dirname "$ASPROF")/jfrconv"
    if [[ ! -x "$JFRCONV" ]]; then
      echo "⚠️  jfrconv not found — skipping flamegraph split."
      echo "   You can convert manually: jfrconv $OUTPUT flamegraph.html"
      COMPREHENSIVE=false
    fi
  else
    JFRCONV="jfrconv"
  fi
fi

if $COMPREHENSIVE; then
  BASE="${OUTPUT%.jfr}"
  CPU_HTML="${BASE}-cpu.html"
  ALLOC_HTML="${BASE}-alloc.html"
  WALL_HTML="${BASE}-wall.html"
  LOCK_HTML="${BASE}-lock.html"

  echo "Splitting into per-event flamegraphs in parallel..."

  "$JFRCONV" --cpu   "$OUTPUT" "$CPU_HTML"   &  PID_CPU=$!
  "$JFRCONV" --alloc "$OUTPUT" "$ALLOC_HTML" &  PID_ALLOC=$!
  "$JFRCONV" --wall  "$OUTPUT" "$WALL_HTML"  &  PID_WALL=$!
  "$JFRCONV" --lock  "$OUTPUT" "$LOCK_HTML"  &  PID_LOCK=$!

  CONVERSION_FAILED=false
  for pid in "$PID_CPU" "$PID_ALLOC" "$PID_WALL" "$PID_LOCK"; do
    if ! wait "$pid"; then
      CONVERSION_FAILED=true
    fi
  done

  if $CONVERSION_FAILED; then
    echo "Error: one or more jfrconv conversions failed." >&2
    exit 1
  fi

  echo ""
  echo "📊 Flamegraphs ready:"
  echo "   CPU time     : $CPU_HTML"
  echo "   Allocations  : $ALLOC_HTML"
  echo "   Wall-clock   : $WALL_HTML"
  echo "   Lock contention: $LOCK_HTML"
  echo "   Combined JFR : $OUTPUT  (open in IntelliJ or JDK Mission Control)"
  echo ""

  # Open all flamegraphs at once if on macOS
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "Opening all flamegraphs in browser..."
    open "$CPU_HTML" "$ALLOC_HTML" "$WALL_HTML" "$LOCK_HTML"
  else
    echo "Open flamegraphs with:"
    echo "   xdg-open \"$CPU_HTML\""
    echo "   xdg-open \"$ALLOC_HTML\""
    echo "   xdg-open \"$WALL_HTML\""
    echo "   xdg-open \"$LOCK_HTML\""
  fi

  echo ""
  echo "💡 Next step — analyze results:"
  echo "   Ask your AI assistant: 'Analyze these profiles and tell me where"
  echo "   to focus: $CPU_HTML, $ALLOC_HTML, $WALL_HTML, $LOCK_HTML'"
  echo ""
  echo "   Or for collapsed stack analysis:"
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "   jfrconv \"$OUTPUT\" \"${BASE}-cpu.collapsed\""
  echo "   python3 \"${SCRIPT_DIR}/analyze_collapsed.py\" \"${BASE}-cpu.collapsed\""

else
  # Single-event post-run guidance
  case "$FORMAT" in
    html|svg)
      echo "Open in browser:"
      if [[ "$(uname)" == "Darwin" ]]; then
        open "$OUTPUT"
      else
        echo "   xdg-open \"$OUTPUT\""
      fi
      echo ""
      echo "What to look for:"
      echo "  • Wide frames near the top = hot code (primary optimization targets)"
      echo "  • Wide leaf frames = direct CPU/allocation consumers"
      echo "  • LockSupport.park / Object.wait (wall profile) = blocked threads"
      echo ""
      echo "💡 Next step — ask your AI assistant to analyze:"
      echo "   'I have a flamegraph at $OUTPUT — what's causing the bottleneck?'"
      ;;
    jfr)
      echo "Open in IntelliJ IDEA: File → Open → select $OUTPUT"
      echo "Open in JDK Mission Control: File → Open File → select $OUTPUT"
      echo ""
      echo "Or convert to flamegraph:"
      echo "   jfrconv \"$OUTPUT\" flamegraph.html"
      echo ""
      echo "💡 Next step — ask your AI assistant to analyze:"
      echo "   'I have a JFR recording at $OUTPUT — help me interpret it.'"
      ;;
    collapsed)
      SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      echo "Analyze with:"
      echo "   python3 \"${SCRIPT_DIR}/analyze_collapsed.py\" \"$OUTPUT\""
      echo ""
      echo "Or render an SVG flamegraph (if FlameGraph is installed):"
      echo "   flamegraph.pl \"$OUTPUT\" > flamegraph.svg"
      echo ""
      echo "💡 Next step — ask your AI assistant to analyze:"
      echo "   'Run analyze_collapsed.py on $OUTPUT and tell me what's slow.'"
      ;;
    txt)
      echo "Plain-text summary saved at:"
      echo "   $OUTPUT"
      echo ""
      echo "Review with:"
      echo "   cat \"$OUTPUT\""
      ;;
  esac
fi
