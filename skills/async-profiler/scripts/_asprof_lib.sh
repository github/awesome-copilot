#!/usr/bin/env bash

ASPROF_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

asprof_stat_mtime() {
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
        mtime="$(asprof_stat_mtime "$candidate")"
        if [[ -z "$newest" || "$mtime" -gt "$newest_mtime" ]]; then
            newest="$candidate"
            newest_mtime="$mtime"
        fi
    done
    printf '%s\n' "$newest"
}

default_installed_asprof() {
    local install_script candidate newest_versioned=""
    local -a versioned_candidates=()
    install_script="${ASPROF_LIB_DIR}/install.sh"
    if [[ -f "$install_script" ]]; then
        for candidate in \
            "$(bash "$install_script" --path-only 2>/dev/null || true)" \
            "$(bash "$install_script" /opt --path-only 2>/dev/null || true)"
        do
            if [[ -x "$candidate" ]]; then
                printf '%s\n' "$candidate"
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
            printf '%s\n' "$newest_versioned"
            return 0
        fi
    fi

    return 0
}

locate_asprof_binary() {
    local asprof_arg="${1:-}"
    local asprof="" candidate installed_asprof=""
    if [[ -n "$asprof_arg" ]]; then
        asprof="$asprof_arg"
        if [[ ! -f "$asprof" || ! -x "$asprof" ]]; then
            echo "❌ --asprof must point to an executable asprof binary: $asprof" >&2
            return 1
        fi
    elif command -v asprof &>/dev/null; then
        asprof="$(command -v asprof)"
    else
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
        return 1
    fi
    printf '%s\n' "$asprof"
}
