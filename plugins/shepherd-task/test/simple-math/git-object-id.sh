#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

git_object_format() {
    local repository="$1"
    local format
    format="$(git -C "$repository" rev-parse --show-object-format 2>/dev/null)" ||
        return 1
    case "$format" in
        sha1 | sha256)
            printf '%s\n' "$format"
            ;;
        *)
            return 1
            ;;
    esac
}

is_full_git_object_id() {
    local repository="$1"
    local object_id="$2"
    local format
    format="$(git_object_format "$repository")" || return 1
    case "$format" in
        sha1)
            [[ "$object_id" =~ ^[0-9a-fA-F]{40}$ ]]
            ;;
        sha256)
            [[ "$object_id" =~ ^[0-9a-fA-F]{64}$ ]]
            ;;
    esac
}

require_git_commit_object_id() {
    local repository="$1"
    local object_id="$2"
    local name="${3:-Git object ID}"
    local format expected_length resolved normalized_object_id

    format="$(git_object_format "$repository")" ||
        fail "Could not determine a supported Git object format for '$repository'."
    expected_length=40
    [[ "$format" == sha1 ]] || expected_length=64
    is_full_git_object_id "$repository" "$object_id" ||
        fail "$name must be a full $expected_length-character $format object ID: '$object_id'."
    resolved="$(git -C "$repository" rev-parse --verify "$object_id^{commit}" 2>/dev/null)" ||
        fail "$name is not an available commit in '$repository': '$object_id'."
    normalized_object_id="$(printf '%s' "$object_id" | tr '[:upper:]' '[:lower:]')"
    [[ "$resolved" == "$normalized_object_id" ]] ||
        fail "$name did not resolve to the supplied full object ID: '$object_id' resolved as '$resolved'."
}
