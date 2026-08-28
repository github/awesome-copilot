#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOLVER="$SCRIPT_DIR/../scripts/resolve-repository-remote.sh"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

git -C "$TEMP_DIR" init --quiet

expect_remote() {
    local expected="$1"
    shift
    local actual
    actual="$("$RESOLVER" "$@")"
    [[ "$actual" == "$expected" ]] ||
        { echo "Expected remote '$expected', got '$actual'." >&2; exit 1; }
}

expect_failure() {
    local expected_message="$1"
    shift
    local output
    if output="$("$RESOLVER" "$@" 2>&1)"; then
        echo "Expected resolver failure, got '$output'." >&2
        exit 1
    fi
    [[ "$output" == *"$expected_message"* ]] ||
        { echo "Expected failure containing '$expected_message', got '$output'." >&2; exit 1; }
}

cd "$TEMP_DIR"
git remote add origin https://github.com/example/project.git
expect_remote origin example/project
expect_remote origin example/project origin

git remote rename origin upstream
expect_remote upstream example/project

expect_failure "found 0" other/project
expect_failure "Could not read URL" example/project missing

git remote add origin git@github.com:example/project.git
expect_failure "found 2" example/project
expect_failure "does not have a GitHub URL matching" other/project origin

echo "Repository remote resolution tests passed."
