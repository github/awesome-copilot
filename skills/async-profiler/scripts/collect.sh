#!/usr/bin/env bash
# collect.sh — Agent-friendly async-profiler background collection.
#
# Designed for coding agents that need to start profiling without blocking
# so they can reproduce the problem, run load, or do other work while data
# is being collected.
#
# Usage:
#   bash scripts/collect.sh start <PID|app-name> [--asprof PATH]
#   bash scripts/collect.sh stop  <PID|app-name> [--asprof PATH]
#   bash scripts/collect.sh timed [-d N] <PID|app-name> [--asprof PATH]
#
# Subcommands:
#   start   Attach asprof and begin recording all events; returns immediately.
#           Session state is saved in $XDG_RUNTIME_DIR when available, otherwise
#           under /tmp, so 'stop' knows where to write output.
#   stop    Stop the active session, split the JFR into four per-event flamegraphs
#           in parallel (cpu, alloc, wall, lock), then print paths to all outputs.
#   timed   Fixed-duration all-event capture that blocks for the duration.
#           Run with & to let the agent continue working; then: wait $PROF_PID
#
# Agent workflow — start/stop (full control):
#   bash scripts/collect.sh start 12345
#   # ... reproduce the problem, trigger load, wait for requests, etc. ...
#   bash scripts/collect.sh stop 12345
#
# Agent workflow — timed background:
#   bash scripts/collect.sh timed -d 30 12345 &
#   PROF_PID=$!
#   # ... trigger load while profiling runs ...
#   wait $PROF_PID
#
# Output layout:
#   profile-<target>-<timestamp>/
#     combined.jfr          — multi-event JFR (open in IntelliJ or JMC)
#     profile-cpu.html      — CPU flamegraph
#     profile-alloc.html    — allocation flamegraph
#     profile-wall.html     — wall-clock flamegraph
#     profile-lock.html     — lock contention flamegraph

set -euo pipefail

# ── Parse subcommand ──────────────────────────────────────────────────────────
if [[ $# -eq 0 ]]; then
    sed -n '2,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
    exit 0
fi

SUBCMD="$1"; shift

case "$SUBCMD" in
    help|-h|--help)
        sed -n '2,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
        exit 0
        ;;
esac

# ── Parse options ─────────────────────────────────────────────────────────────
DURATION=30
TARGET=""
ASPROF_ARG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--duration) [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; DURATION="$2"; shift 2 ;;
        --asprof)      [[ $# -ge 2 ]] || { echo "❌ Missing value for $1" >&2; exit 1; }; ASPROF_ARG="$2"; shift 2 ;;
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
            TARGET="$1"; shift ;;
    esac
done

if [[ -z "$TARGET" && "$SUBCMD" != "help" ]]; then
    echo "❌ No target specified. Provide a PID or app name." >&2
    echo "   List Java processes: jps -l" >&2
    exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
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

locate_asprof() {
    local asprof=""
    if [[ -n "$ASPROF_ARG" ]]; then
        asprof="$ASPROF_ARG"
        if [[ ! -f "$asprof" || ! -x "$asprof" ]]; then
            echo "❌ --asprof must point to an executable asprof binary: $asprof" >&2
            exit 1
        fi
    elif command -v asprof &>/dev/null; then
        asprof="$(command -v asprof)"
    else
        local installed_asprof=""
        installed_asprof="$(default_installed_asprof)"
        for candidate in \
            "$installed_asprof" \
            "$HOME/async-profiler/bin/asprof" \
            "/opt/async-profiler/bin/asprof" \
            "/usr/local/bin/asprof"
        do
            if [[ -x "$candidate" ]]; then
                asprof="$candidate"
                break
            fi
        done
    fi
    if [[ -z "$asprof" ]]; then
        echo "❌ asprof not found. Install with: bash scripts/install.sh" >&2
        exit 1
    fi
    echo "$asprof"
}

locate_jfrconv() {
    local asprof="$1"
    if command -v jfrconv &>/dev/null; then
        command -v jfrconv
    elif [[ -x "$(dirname "$asprof")/jfrconv" ]]; then
        echo "$(dirname "$asprof")/jfrconv"
    else
        echo ""
    fi
}

newest_by_mtime() {
    local newest=""
    local newest_mtime=0
    local candidate mtime
    for candidate in "$@"; do
        if [[ "$(uname)" == "Darwin" ]]; then
            mtime="$(stat -f '%m' "$candidate" 2>/dev/null || echo 0)"
        else
            mtime="$(stat -c '%Y' "$candidate" 2>/dev/null || echo 0)"
        fi
        if [[ -z "$newest" || "$mtime" -gt "$newest_mtime" ]]; then
            newest="$candidate"
            newest_mtime="$mtime"
        fi
    done
    echo "$newest"
}

stat_uid() {
    if [[ "$(uname)" == "Darwin" ]]; then
        stat -f '%u' "$1"
    else
        stat -c '%u' "$1"
    fi
}

stat_mode() {
    if [[ "$(uname)" == "Darwin" ]]; then
        stat -f '%Lp' "$1"
    else
        stat -c '%a' "$1"
    fi
}

ensure_private_state_dir() {
    local uid base_dir state_dir owner mode
    uid="$(id -u)"

    if [[ -n "${XDG_RUNTIME_DIR:-}" && -d "${XDG_RUNTIME_DIR}" && -w "${XDG_RUNTIME_DIR}" ]]; then
        base_dir="${XDG_RUNTIME_DIR}"
    else
        base_dir="/tmp"
    fi

    state_dir="${base_dir}/asprof-session-${uid}"
    if [[ -L "$state_dir" ]]; then
        echo "❌ Session state directory is a symlink — refusing to use it: $state_dir" >&2
        exit 1
    fi
    if [[ -e "$state_dir" ]]; then
        if [[ ! -d "$state_dir" ]]; then
            echo "❌ Session state path exists but is not a directory: $state_dir" >&2
            exit 1
        fi
        owner="$(stat_uid "$state_dir")"
        if [[ "$owner" != "$uid" ]]; then
            echo "❌ Session state directory is not owned by the current user: $state_dir" >&2
            exit 1
        fi
        chmod 700 "$state_dir"
    else
        mkdir -m 700 -p "$state_dir"
    fi

    mode="$(stat_mode "$state_dir")"
    if [[ "$mode" != "700" ]]; then
        echo "❌ Session state directory must have mode 700: $state_dir (found $mode)" >&2
        exit 1
    fi

    echo "$state_dir"
}

validate_session_file() {
    local sess="$1" uid owner mode
    uid="$(id -u)"

    if [[ -L "$sess" ]]; then
        echo "❌ Session file path is a symlink — refusing to use it: $sess" >&2
        exit 1
    fi

    owner="$(stat_uid "$sess")"
    if [[ "$owner" != "$uid" ]]; then
        echo "❌ Session file is not owned by the current user: $sess" >&2
        exit 1
    fi

    mode="$(stat_mode "$sess")"
    if [[ "$mode" != "600" ]]; then
        echo "❌ Session file must have mode 600: $sess (found $mode)" >&2
        exit 1
    fi
}

# Session state file — stores output path and asprof path between start/stop.
session_file() {
    local safe state_dir
    safe="${TARGET//[^a-zA-Z0-9_-]/_}"
    state_dir="$(ensure_private_state_dir)"
    echo "${state_dir}/${safe}"
}

split_jfr() {
    local jfrconv="$1"
    local jfr_path="$2"
    local base="$3"

    local cpu_html="${base}-cpu.html"
    local alloc_html="${base}-alloc.html"
    local wall_html="${base}-wall.html"
    local lock_html="${base}-lock.html"

    echo "Splitting JFR into per-event flamegraphs in parallel..."
    # jfrconv: event flag must come FIRST, before the input file
    "$jfrconv" --cpu   "$jfr_path" "$cpu_html"   &
    local pid_cpu=$!
    "$jfrconv" --alloc "$jfr_path" "$alloc_html" &
    local pid_alloc=$!
    "$jfrconv" --wall  "$jfr_path" "$wall_html"  &
    local pid_wall=$!
    "$jfrconv" --lock  "$jfr_path" "$lock_html"  &
    local pid_lock=$!
    local wait_failed=0
    local _pid _label
    for _pid in "$pid_cpu" "$pid_alloc" "$pid_wall" "$pid_lock"; do
        case "$_pid" in
            "$pid_cpu")   _label="cpu" ;;
            "$pid_alloc") _label="alloc" ;;
            "$pid_wall")  _label="wall" ;;
            "$pid_lock")  _label="lock" ;;
        esac
        if ! wait "$_pid"; then
            echo "ERROR: jfrconv ${_label} conversion failed." >&2
            wait_failed=1
        fi
    done
    if [[ "$wait_failed" -ne 0 ]]; then
        return 1
    fi

    echo ""
    echo "📊 Flamegraphs ready:"
    echo "   CPU time        : $cpu_html"
    echo "   Allocations     : $alloc_html"
    echo "   Wall-clock      : $wall_html"
    echo "   Lock contention : $lock_html"
    echo "   Combined JFR    : $jfr_path"

    if [[ "$(uname)" == "Darwin" ]]; then
        echo ""
        echo "Opening all flamegraphs in browser..."
        open "$cpu_html" "$alloc_html" "$wall_html" "$lock_html"
    fi

    local script_dir; script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo ""
    echo "💡 Next step: analyze results."
    echo "   For collapsed stack analysis (CPU):"
    echo "   jfrconv --cpu \"$jfr_path\" \"${base}-cpu.collapsed\""
    echo "   python3 \"${script_dir}/analyze_collapsed.py\" \"${base}-cpu.collapsed\""
}

# ── start ─────────────────────────────────────────────────────────────────────
cmd_start() {
    local asprof; asprof="$(locate_asprof)"
    local timestamp; timestamp="$(date +%Y%m%d-%H%M%S)"
    local safe_target; safe_target="$(printf '%s' "$TARGET" | tr -c '[:alnum:]._-' '_')"
    [[ -n "$safe_target" ]] || safe_target="unknown"
    local outdir="profile-${safe_target}-${timestamp}"
    mkdir -p "$outdir"
    local jfr_path; jfr_path="$(pwd)/${outdir}/combined.jfr"
    local sess; sess="$(session_file)"

    echo "▶ Starting all-event async-profiler on target: $TARGET"
    echo "  Binary    : $asprof"
    echo "  Output dir: $outdir/"
    echo "  Events    : cpu + alloc + wall + lock (combined JFR)"
    echo ""

    if [[ -e "$sess" ]]; then
        echo "❌ An active session already exists for target '$TARGET'." >&2
        echo "   Session state: $sess" >&2
        echo "   Stop it first: bash scripts/collect.sh stop $TARGET" >&2
        exit 1
    fi

    # macOS: asprof stop ignores -f and writes to /var/folders instead.
    # Create a sentinel so we can find the JFR after stop via find -newer.
    local sentinel; sentinel="$(mktemp "/tmp/asprof-sentinel.XXXXXX")"
    if [[ -L "$sentinel" ]]; then
        echo "❌ mktemp created a symlink for the sentinel file: $sentinel" >&2
        exit 1
    fi

    "$asprof" start --all "$TARGET"

    # Save session state (jfr_path, asprof binary, sentinel path)
    if [[ -L "$sess" ]]; then
        echo "❌ Session file path is a symlink — refusing to use it." >&2
        rm -f "$sentinel"; exit 1
    fi
    (umask 077; printf '%s\n%s\n%s\n' "$jfr_path" "$asprof" "$sentinel" > "$sess")
    chmod 600 "$sess"

    echo "✅ Profiling started. Session state: $sess"
    echo ""
    echo "Now reproduce the problem — make requests, run load, wait for the"
    echo "slow operation, etc. asprof is collecting all event types."
    echo ""
    echo "When ready to collect results:"
    echo "   bash scripts/collect.sh stop $TARGET"
}

# ── stop ──────────────────────────────────────────────────────────────────────
cmd_stop() {
    local sess; sess="$(session_file)"

    if [[ ! -f "$sess" ]]; then
        echo "❌ No active session found for target '$TARGET'." >&2
        echo "   Expected state file: $sess" >&2
        echo "   Run first: bash scripts/collect.sh start $TARGET" >&2
        exit 1
    fi
    validate_session_file "$sess"

    local jfr_path; jfr_path="$(sed -n '1p' "$sess")"
    local asprof;   asprof="$(sed -n '2p' "$sess")"
    local sentinel; sentinel="$(sed -n '3p' "$sess")"
    if [[ -n "$ASPROF_ARG" ]]; then
        asprof="$(locate_asprof)"
    fi

    echo "⏹  Stopping profiler on target: $TARGET"
    # Note: on macOS, -f is silently ignored by asprof stop — handled below.
    "$asprof" stop -f "$jfr_path" "$TARGET"
    # Session file is removed only after the JFR is confirmed written (see end of block).

    # ── macOS JFR path workaround ────────────────────────────────────────────
    # On macOS, asprof stop ignores -f and writes the JFR to:
    #   /var/folders/<hash>/T/<timestamp>_<pid>/<timestamp>.jfr
    # Use the sentinel (created at 'start') to find the file via find -newer.
    if [[ "$(uname)" == "Darwin" ]] && [[ -n "$sentinel" ]] && [[ -f "$sentinel" ]]; then
        echo ""
        echo "⚠️  macOS: -f is ignored by asprof stop — locating JFR in /var/folders..."
        local found_jfr=""
        local search_maxdepth=2
        local search_hint="find /var/folders/*/*/T -maxdepth 2 -name '*.jfr' -newer '$sentinel' 2>/dev/null"
        local -a search_roots=()
        local -a jfr_matches=()
        local jfr_candidate
        shopt -s nullglob
        search_roots=(/var/folders/*/*/T)
        shopt -u nullglob
        if [[ ${#search_roots[@]} -eq 0 ]]; then
            search_roots=(/var/folders)
            search_maxdepth=8
            search_hint="find /var/folders -maxdepth 8 -name '*.jfr' -newer '$sentinel' 2>/dev/null"
        fi
        while IFS= read -r -d '' jfr_candidate; do
            jfr_matches+=("$jfr_candidate")
        done < <(find "${search_roots[@]}" -maxdepth "$search_maxdepth" -name "*.jfr" -newer "$sentinel" -print0 2>/dev/null)

        if [[ ${#jfr_matches[@]} -gt 0 ]]; then
            found_jfr="$(newest_by_mtime "${jfr_matches[@]}")"
        fi
        if [[ -n "$found_jfr" ]]; then
            cp "$found_jfr" "$jfr_path"
            rm -f "$sentinel"
            echo "   Found: $found_jfr"
            echo "   Copied to: $jfr_path"
        else
            echo "❌ Could not find JFR in /var/folders. Try:"
            echo "   $search_hint"
            echo "   (The JFR may still be there — copy it manually to $jfr_path)"
            echo "   Sentinel preserved at: $sentinel for retry"
            echo "   Session state preserved at: $sess"
            exit 1
        fi
    else
        rm -f "$sentinel" 2>/dev/null || true
    fi
    # ────────────────────────────────────────────────────────────────────────
    if [[ ! -s "$jfr_path" ]]; then
        echo "❌ Profiling stopped but expected JFR output is missing or empty: $jfr_path"
        echo "   Session state preserved at: $sess"
        exit 1
    fi
    rm -f "$sess"

    echo ""
    echo "✅ Capture saved: $jfr_path"
    echo ""

    local jfrconv; jfrconv="$(locate_jfrconv "$asprof")"
    if [[ -z "$jfrconv" ]]; then
        echo "⚠️  jfrconv not found — skipping flamegraph split."
        echo "   Convert manually: jfrconv --cpu \"$jfr_path\" cpu.html"
        echo "   Or open in IntelliJ IDEA or JDK Mission Control."
        return
    fi

    local base; base="$(dirname "$jfr_path")/profile"
    split_jfr "$jfrconv" "$jfr_path" "$base"
}

# ── timed ─────────────────────────────────────────────────────────────────────
cmd_timed() {
    local asprof; asprof="$(locate_asprof)"
    local timestamp; timestamp="$(date +%Y%m%d-%H%M%S)"
    local safe_target; safe_target="$(printf '%s' "$TARGET" | tr -c '[:alnum:]._-' '_')"
    [[ -n "$safe_target" ]] || safe_target="unknown"
    local outdir="profile-${safe_target}-${timestamp}"
    mkdir -p "$outdir"
    local jfr_path="${outdir}/combined.jfr"

    echo "⏱  ${DURATION}s all-event capture on target: $TARGET"
    echo "   Binary  : $asprof"
    echo "   Output  : $jfr_path"
    echo "   Events  : cpu + alloc + wall + lock"
    echo ""
    echo "Running for ${DURATION}s — trigger your workload now."
    echo "(If called with &, the agent can do other work and then: wait \$PROF_PID)"
    echo ""

    "$asprof" -d "$DURATION" --all -f "$jfr_path" "$TARGET"

    echo ""
    echo "✅ Capture complete: $jfr_path"
    echo ""

    local jfrconv; jfrconv="$(locate_jfrconv "$asprof")"
    if [[ -z "$jfrconv" ]]; then
        echo "⚠️  jfrconv not found — skipping flamegraph split."
        echo "   Open $jfr_path in IntelliJ IDEA or JDK Mission Control."
        return
    fi

    local base="${outdir}/profile"
    split_jfr "$jfrconv" "$jfr_path" "$base"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
case "$SUBCMD" in
    start)           cmd_start ;;
    stop)            cmd_stop  ;;
    timed)           cmd_timed ;;
    help|-h|--help)
        sed -n '2,/^[^#]/p' "$0" | grep '^#' | sed 's/^# \?//'
        exit 0
        ;;
    *)
        echo "❌ Unknown subcommand: '$SUBCMD'" >&2
        echo "   Valid subcommands: start | stop | timed" >&2
        exit 1
        ;;
esac
