#!/usr/bin/env bash
#
# shepherd-task-init-campaign.sh — Initializes durable shepherd-task campaign metadata.
#
# Usage:
#   ./shepherd-task-init-campaign.sh \
#     <CAMPAIGN_ISSUE_NUMBER> <CAMPAIGN_SHORTNAME> <BASE_BRANCH> <REPO> \
#     <LESSON_PROPAGATION>

set -euo pipefail

usage() {
    echo "Usage: $0 <CAMPAIGN_ISSUE_NUMBER> <CAMPAIGN_SHORTNAME> <BASE_BRANCH> <REPO> <LESSON_PROPAGATION>" >&2
}

fail() {
    echo "Error: $1" >&2
    usage
    exit 1
}

if [[ $# -ne 5 ]]; then
    fail "Expected exactly 5 arguments; received $#."
fi

CAMPAIGN_ISSUE_NUMBER="$1"
CAMPAIGN_SHORTNAME="$2"
BASE_BRANCH="$3"
REPO="$4"
LESSON_PROPAGATION="$5"

if [[ ! "$CAMPAIGN_ISSUE_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
    fail "CAMPAIGN_ISSUE_NUMBER must be a positive integer; received '$CAMPAIGN_ISSUE_NUMBER'."
fi

if [[ ! "$CAMPAIGN_SHORTNAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    fail "CAMPAIGN_SHORTNAME must be lowercase ASCII kebab-case; received '$CAMPAIGN_SHORTNAME'."
fi

if [[ "$BASE_BRANCH" == "main" ]]; then
    fail "BASE_BRANCH must not be 'main'."
fi

if ! git check-ref-format --branch "$BASE_BRANCH" >/dev/null 2>&1; then
    fail "BASE_BRANCH is not a valid Git branch name; received '$BASE_BRANCH'."
fi

if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    fail "REPO must be in OWNER/REPO format; received '$REPO'."
fi

if [[ "$LESSON_PROPAGATION" != "off" && "$LESSON_PROPAGATION" != "campaign" ]]; then
    fail "LESSON_PROPAGATION must be 'off' or 'campaign'; received '$LESSON_PROPAGATION'."
fi

for command in git jq uuidgen; do
    if ! command -v "$command" >/dev/null 2>&1; then
        fail "Required command '$command' was not found."
    fi
done

if ! REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    fail "Run this command inside the campaign Git worktree."
fi
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"

if ! CURRENT_BRANCH="$(git branch --show-current)"; then
    fail "Unable to determine the current Git branch."
fi
if [[ -z "$CURRENT_BRANCH" ]]; then
    fail "Campaign initialization requires a checked-out branch, not detached HEAD."
fi
if [[ "$CURRENT_BRANCH" != "$BASE_BRANCH" ]]; then
    fail "Current branch '$CURRENT_BRANCH' does not match BASE_BRANCH '$BASE_BRANCH'."
fi

CAMPAIGN_METADATA_DIRECTORY="${CAMPAIGN_ISSUE_NUMBER}-${CAMPAIGN_SHORTNAME}-remove-before-merge"
CAMPAIGN_METADATA_PATH="$REPO_ROOT/$CAMPAIGN_METADATA_DIRECTORY"
MANIFEST_PATH="$CAMPAIGN_METADATA_PATH/shepherd-campaign.json"
LESSONS_PATH="$CAMPAIGN_METADATA_PATH/campaign-lessons.md"
TEMP_MANIFEST_PATH="$CAMPAIGN_METADATA_PATH/.shepherd-campaign.json.tmp.$$"
TEMP_LESSONS_PATH="$CAMPAIGN_METADATA_PATH/.campaign-lessons.md.tmp.$$"
CREATED_DIRECTORY=0

if [[ -e "$CAMPAIGN_METADATA_PATH" || -L "$CAMPAIGN_METADATA_PATH" ]]; then
    fail "Campaign metadata path already exists: $CAMPAIGN_METADATA_PATH"
fi

cleanup_failure() {
    local exit_code="$1"
    trap - ERR INT TERM
    if [[ "$CREATED_DIRECTORY" == "1" ]]; then
        rm -f -- "$TEMP_MANIFEST_PATH" "$TEMP_LESSONS_PATH" "$MANIFEST_PATH" "$LESSONS_PATH"
        rmdir -- "$CAMPAIGN_METADATA_PATH" 2>/dev/null || true
    fi
    exit "$exit_code"
}

trap 'cleanup_failure $?' ERR
trap 'cleanup_failure 130' INT
trap 'cleanup_failure 143' TERM

mkdir -- "$CAMPAIGN_METADATA_PATH"
CREATED_DIRECTORY=1

CAMPAIGN_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
if [[ ! "$CAMPAIGN_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ ]]; then
    echo "Error: uuidgen did not produce a canonical UUID version 4: '$CAMPAIGN_ID'." >&2
    false
fi

CREATED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

jq -n \
    --argjson schemaVersion 1 \
    --arg campaignId "$CAMPAIGN_ID" \
    --argjson campaignIssueNumber "$CAMPAIGN_ISSUE_NUMBER" \
    --arg campaignShortname "$CAMPAIGN_SHORTNAME" \
    --arg repository "$REPO" \
    --arg baseBranch "$BASE_BRANCH" \
    --arg lessonPropagation "$LESSON_PROPAGATION" \
    --arg campaignMetadataDirectory "$CAMPAIGN_METADATA_DIRECTORY" \
    --arg lessonsFile "campaign-lessons.md" \
    --arg createdAt "$CREATED_AT" \
    '{
        schemaVersion: $schemaVersion,
        campaignId: $campaignId,
        campaignIssueNumber: $campaignIssueNumber,
        campaignShortname: $campaignShortname,
        repository: $repository,
        baseBranch: $baseBranch,
        lessonPropagation: $lessonPropagation,
        campaignMetadataDirectory: $campaignMetadataDirectory,
        lessonsFile: $lessonsFile,
        createdAt: $createdAt
    }' >"$TEMP_MANIFEST_PATH"

cat >"$TEMP_LESSONS_PATH" <<'EOF'
# Campaign lessons

This file contains validated, reusable lessons for subsequent issues in this campaign.
The issue specification and repository instructions remain authoritative.

## Validated lessons

No validated lessons have been recorded yet.
EOF

mv -- "$TEMP_MANIFEST_PATH" "$MANIFEST_PATH"
mv -- "$TEMP_LESSONS_PATH" "$LESSONS_PATH"

CREATED_DIRECTORY=0
trap - ERR INT TERM

echo "Campaign initialized."
echo "  Campaign ID:                $CAMPAIGN_ID"
echo "  Repository:                 $REPO"
echo "  Base branch:                $BASE_BRANCH"
echo "  Lesson propagation:         $LESSON_PROPAGATION"
echo "  Campaign metadata directory: $CAMPAIGN_METADATA_DIRECTORY"
echo "  Absolute path:              $CAMPAIGN_METADATA_PATH"
