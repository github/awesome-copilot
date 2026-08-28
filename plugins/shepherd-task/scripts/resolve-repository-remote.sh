#!/usr/bin/env bash

set -euo pipefail

REPO="${1:?Usage: $0 <OWNER/REPO> [REMOTE]}"
EXPLICIT_REMOTE="${2:-}"

fail() {
    echo "Error: $1" >&2
    exit 1
}

normalize_github_repo() {
    local url="${1%.git}"
    case "$url" in
        git@github.com:*) echo "${url#git@github.com:}" ;;
        https://github.com/*) echo "${url#https://github.com/}" ;;
        ssh://git@github.com/*) echo "${url#ssh://git@github.com/}" ;;
        *) echo "" ;;
    esac
}

remote_repository() {
    local remote="$1"
    local remote_url
    remote_url="$(git remote get-url "$remote" 2>/dev/null)" ||
        fail "Could not read URL for Git remote '$remote'."
    normalize_github_repo "$remote_url"
}

if [[ -n "$EXPLICIT_REMOTE" ]]; then
    REMOTE_REPO="$(remote_repository "$EXPLICIT_REMOTE")"
    [[ -n "$REMOTE_REPO" && "${REMOTE_REPO,,}" == "${REPO,,}" ]] ||
        fail "Git remote '$EXPLICIT_REMOTE' does not have a GitHub URL matching '$REPO'."
    echo "$EXPLICIT_REMOTE"
    exit 0
fi

MATCHING_REMOTES=()
while IFS= read -r remote; do
    REMOTE_REPO="$(remote_repository "$remote")"
    if [[ -n "$REMOTE_REPO" && "${REMOTE_REPO,,}" == "${REPO,,}" ]]; then
        MATCHING_REMOTES+=("$remote")
    fi
done < <(git remote)

[[ ${#MATCHING_REMOTES[@]} -eq 1 ]] ||
    fail "Expected exactly one Git remote whose GitHub URL matches '$REPO'; found ${#MATCHING_REMOTES[@]}."

echo "${MATCHING_REMOTES[0]}"
