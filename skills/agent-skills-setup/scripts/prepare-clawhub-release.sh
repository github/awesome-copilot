#!/usr/bin/env bash
#
# prepare-clawhub-release.sh — SINGLE RESPONSIBILITY: validate a skill folder and
# construct/run the `clawhub publish` command for release.
# Canonical publish command: `clawhub publish`. (`npx skills add` is for CONSUMERS
# installing a published skill, NOT for publishing.)
# This script does NOT build the public repo layout or README; that is done upstream by
# export-public-skill.sh (see ./export-public-skill.sh), which must prepare the public
# GitHub repository before this script publishes it to ClawHub.
#
set -euo pipefail

SKILL_DIR=""
SKILL_DIR_ABS=""
SLUG=""
DISPLAY_NAME=""
VERSION=""
TAGS="latest"
CHANGELOG_TEXT=""
CHANGELOG_FILE=""
RUN_PUBLISH=0

usage() {
    cat <<'EOF'
Usage: prepare-clawhub-release.sh [options]

Validate a skill folder and print or run the exact ClawHub publish command.

Options:
  --skill-dir <dir>         Path to the skill folder to publish.
  --slug <slug>             Public ClawHub slug.
  --name <name>             Display name.
  --version <semver>        Release version, e.g. 1.0.0.
  --tags <csv>              Comma-separated tags. Default: latest.
  --changelog <text>        Inline changelog text.
  --changelog-file <file>   Read changelog text from a file.
  --publish                 Execute `clawhub publish` after validation.
  -h, --help                Show this help text.
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skill-dir)
            [[ $# -ge 2 ]] || die "--skill-dir requires a value"
            SKILL_DIR="$2"
            shift 2
            ;;
        --slug)
            [[ $# -ge 2 ]] || die "--slug requires a value"
            SLUG="$2"
            shift 2
            ;;
        --name)
            [[ $# -ge 2 ]] || die "--name requires a value"
            DISPLAY_NAME="$2"
            shift 2
            ;;
        --version)
            [[ $# -ge 2 ]] || die "--version requires a value"
            VERSION="$2"
            shift 2
            ;;
        --tags)
            [[ $# -ge 2 ]] || die "--tags requires a value"
            TAGS="$2"
            shift 2
            ;;
        --changelog)
            [[ $# -ge 2 ]] || die "--changelog requires a value"
            CHANGELOG_TEXT="$2"
            shift 2
            ;;
        --changelog-file)
            [[ $# -ge 2 ]] || die "--changelog-file requires a value"
            CHANGELOG_FILE="$2"
            shift 2
            ;;
        --publish)
            RUN_PUBLISH=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

[[ -n "$SKILL_DIR" ]] || die "--skill-dir is required"
[[ -n "$SLUG" ]] || die "--slug is required"
[[ -n "$DISPLAY_NAME" ]] || die "--name is required"
[[ -n "$VERSION" ]] || die "--version is required"
[[ -d "$SKILL_DIR" ]] || die "Skill directory not found: $SKILL_DIR"
[[ -f "$SKILL_DIR/SKILL.md" ]] || die "Missing SKILL.md in $SKILL_DIR"

if command_exists realpath; then
    SKILL_DIR_ABS="$(realpath "$SKILL_DIR")"
else
    SKILL_DIR_ABS="$(cd "$SKILL_DIR" && pwd)"
fi

if [[ -n "$CHANGELOG_FILE" ]]; then
    [[ -f "$CHANGELOG_FILE" ]] || die "Changelog file not found: $CHANGELOG_FILE"
    CHANGELOG_TEXT="$(cat "$CHANGELOG_FILE")"
fi

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9]+)?$ ]] || die "Version must look like semver: $VERSION"
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || die "Slug must contain only lowercase letters, numbers, and hyphens"

command_exists clawhub || die "clawhub is not installed"

if ! clawhub whoami >/dev/null 2>&1; then
    if [[ $RUN_PUBLISH -eq 1 ]]; then
        die "Not logged in to ClawHub. Run: clawhub login"
    fi
    echo "WARN: Not logged in to ClawHub. Run 'clawhub login' before using --publish." >&2
fi

PUBLISH_CMD=(clawhub publish "$SKILL_DIR_ABS" --slug "$SLUG" --name "$DISPLAY_NAME" --version "$VERSION" --tags "$TAGS")

if [[ -n "$CHANGELOG_TEXT" ]]; then
    PUBLISH_CMD+=(--changelog "$CHANGELOG_TEXT")
fi

echo "Validated skill folder: $SKILL_DIR_ABS"
echo "Suggested publish command:"
printf '%q ' "${PUBLISH_CMD[@]}"
printf '\n'

if [[ $RUN_PUBLISH -eq 1 ]]; then
    "${PUBLISH_CMD[@]}"
fi