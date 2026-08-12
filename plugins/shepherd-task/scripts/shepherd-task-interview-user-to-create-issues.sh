#!/usr/bin/env bash
#
# Creates stage-20 prompt and invocation artifacts for an initialized campaign.
#
# Usage:
#   ./shepherd-task-interview-user-to-create-issues.sh \
#     <CAMPAIGN_METADATA_DIRECTORY> [ANSWERS_FILE]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

usage() {
    echo "Usage: $0 <CAMPAIGN_METADATA_DIRECTORY> [ANSWERS_FILE]" >&2
}

fail() {
    echo "Error: $1" >&2
    exit 1
}

read_required() {
    local prompt="$1"
    local default="${2:-}"
    local value=""

    if [[ -n "$default" ]]; then
        prompt="$prompt [$default]"
    fi

    while true; do
        printf '%s: ' "$prompt" >&2
        IFS= read -r value
        value="${value#"${value%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"
        if [[ -z "$value" && -n "$default" ]]; then
            value="$default"
        fi
        if [[ -n "$value" ]]; then
            echo "$value"
            return
        fi
        echo "  This input is required." >&2
    done
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage
    exit 1
fi

CAMPAIGN_METADATA_DIRECTORY="$1"
ANSWERS_FILE="${2:-}"

for command in git jq; do
    command -v "$command" >/dev/null 2>&1 || fail "Required command '$command' was not found."
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the campaign Git worktree."
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"

if [[ "$CAMPAIGN_METADATA_DIRECTORY" = /* || "$CAMPAIGN_METADATA_DIRECTORY" == *"/"* ]]; then
    fail "CAMPAIGN_METADATA_DIRECTORY must be a repository-root-relative basename."
fi

CAMPAIGN_METADATA_PATH="$REPO_ROOT/$CAMPAIGN_METADATA_DIRECTORY"
[[ -d "$CAMPAIGN_METADATA_PATH" ]] ||
    fail "Campaign metadata directory not found: $CAMPAIGN_METADATA_PATH"
CAMPAIGN_METADATA_PATH="$(cd "$CAMPAIGN_METADATA_PATH" && pwd -P)"
[[ "$(dirname "$CAMPAIGN_METADATA_PATH")" == "$REPO_ROOT" ]] ||
    fail "Campaign metadata directory must be a direct child of the repository root."

MANIFEST_PATH="$CAMPAIGN_METADATA_PATH/shepherd-campaign.json"
[[ -f "$MANIFEST_PATH" ]] || fail "Campaign manifest not found: $MANIFEST_PATH"

jq -e '
    .schemaVersion == 1 and
    (.campaignId | type == "string" and test("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")) and
    (.campaignIssueNumber | type == "number" and . > 0 and floor == .) and
    (.campaignShortname | type == "string" and test("^[a-z0-9]+(-[a-z0-9]+)*$")) and
    (.repository | type == "string" and test("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) and
    (.baseBranch | type == "string" and . != "main")
' "$MANIFEST_PATH" >/dev/null || fail "Campaign manifest is invalid: $MANIFEST_PATH"

CAMPAIGN_ID="$(jq -r '.campaignId' "$MANIFEST_PATH")"
PARENT_ISSUE="$(jq -r '.campaignIssueNumber' "$MANIFEST_PATH")"
CAMPAIGN_SHORTNAME="$(jq -r '.campaignShortname' "$MANIFEST_PATH")"
REPO="$(jq -r '.repository' "$MANIFEST_PATH")"
BASE_BRANCH="$(jq -r '.baseBranch' "$MANIFEST_PATH")"
PLAN_DIRECTORY="$(jq -r '.campaignMetadataDirectory' "$MANIFEST_PATH")"
EXPECTED_DIRECTORY="${PARENT_ISSUE}-${CAMPAIGN_SHORTNAME}-remove-before-merge"
[[ "$PLAN_DIRECTORY" == "$EXPECTED_DIRECTORY" && "$CAMPAIGN_METADATA_DIRECTORY" == "$EXPECTED_DIRECTORY" ]] ||
    fail "Campaign manifest and directory must both use '$EXPECTED_DIRECTORY'."

echo "=== shepherd-task-20-create-issues-from-plan — Input Interview ==="
echo "Campaign ID:                 $CAMPAIGN_ID"
echo "Repository:                  $REPO"
echo "Campaign base branch:        $BASE_BRANCH"
echo "Campaign issue:              #$PARENT_ISSUE"
echo "Campaign metadata directory: $PLAN_DIRECTORY"
echo ""

if [[ -n "$ANSWERS_FILE" ]]; then
    [[ -f "$ANSWERS_FILE" ]] || fail "Answers file not found: $ANSWERS_FILE"
    jq -e . "$ANSWERS_FILE" >/dev/null || fail "Answers file is not valid JSON: $ANSWERS_FILE"

    PLAN_FILE_NAME="$(jq -er '.planFileName | select(type == "string" and length > 0)' "$ANSWERS_FILE")"
    QUESTIONS_SECTION="$(jq -er '.questionsSection | select(type == "string" and length > 0)' "$ANSWERS_FILE")"
    IMPLEMENTATION_SECTION="$(jq -er '.implementationSection | select(type == "string" and length > 0)' "$ANSWERS_FILE")"
    EXAMPLE_ISSUES="$(jq -er '.exampleIssues | if type == "array" then join(",") else select(type == "string") end | select(length > 0)' "$ANSWERS_FILE")"
    BASE_REMOTE="$(jq -er '.baseRemote | select(type == "string" and length > 0)' "$ANSWERS_FILE")"
    ISSUE_TYPE="$(jq -er '.issueType | select(type == "string" and length > 0)' "$ANSWERS_FILE")"
    SUPPORTING_ARTIFACTS="$(jq -er '.supportingArtifacts | if type == "array" then join(",") else select(type == "string") end | select(length > 0)' "$ANSWERS_FILE")"
else
    PLAN_FILE_NAME="$(read_required "1/7  PLAN_FILE_NAME (name within campaign metadata directory)")"
    QUESTIONS_SECTION="$(read_required "2/7  QUESTIONS_SECTION (exact resolved-questions heading)")"
    IMPLEMENTATION_SECTION="$(read_required "3/7  IMPLEMENTATION_SECTION (exact implementation heading)")"
    EXAMPLE_ISSUES="$(read_required "4/7  EXAMPLE_ISSUES (full issue URLs whose style to follow)")"
    BASE_REMOTE="$(read_required "5/7  BASE_REMOTE (git remote name)" "upstream")"
    ISSUE_TYPE="$(read_required "6/7  ISSUE_TYPE (GitHub issue type for children)" "Task")"
    SUPPORTING_ARTIFACTS="$(read_required "7/7  SUPPORTING_ARTIFACTS (repo-relative paths or constraints)" "$PLAN_DIRECTORY")"
fi

[[ -f "$CAMPAIGN_METADATA_PATH/$PLAN_FILE_NAME" ]] ||
    fail "Plan file not found in campaign metadata directory: $PLAN_FILE_NAME"

IFS=',' read -ra EXAMPLE_VALUES <<< "$EXAMPLE_ISSUES"
declare -A SEEN_EXAMPLES=()
UNIQUE_EXAMPLES=()
for value in "${EXAMPLE_VALUES[@]}"; do
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    [[ "$value" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[1-9][0-9]*$ ]] ||
        fail "Invalid EXAMPLE_ISSUES URL: '$value'."
    if [[ -z "${SEEN_EXAMPLES[$value]:-}" ]]; then
        UNIQUE_EXAMPLES+=("$value")
        SEEN_EXAMPLES["$value"]=1
    fi
done
EXAMPLE_ISSUES="$(IFS=','; echo "${UNIQUE_EXAMPLES[*]}")"

timestamp="$(date +%Y%m%d-%H%M)"
prompts_directory="$CAMPAIGN_METADATA_PATH/prompts"
mkdir -p -- "$prompts_directory"
log_dir_full="$prompts_directory/shepherd-task-20-$timestamp"
[[ ! -e "$log_dir_full" ]] || fail "Stage-20 artifact directory already exists: $log_dir_full"
mkdir -- "$log_dir_full"

out_file="$log_dir_full/${timestamp}-invoke-shepherd-task-20-create-issues-from-plan-skill.md"
invocation_file="$log_dir_full/${timestamp}-invoke-shepherd-task-20-create-issues-from-plan-skill.sh"

cat >"$out_file" <<EOF
Invoke skill \`shepherd-task-20-create-issues-from-plan\` with these inputs:

- CAMPAIGN_ID: $CAMPAIGN_ID
- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXAMPLE_ISSUES: $EXAMPLE_ISSUES
- BASE_REMOTE: $BASE_REMOTE
- ISSUE_TYPE: $ISSUE_TYPE
- SUPPORTING_ARTIFACTS: $SUPPORTING_ARTIFACTS
- LOG_DIRECTORY: $log_dir_full
EOF

{
    printf '#!/usr/bin/env bash\n'
    printf 'set -euo pipefail\n'
    printf 'timestamp=%q\n' "$timestamp"
    printf 'log_dir_full=%q\n' "$log_dir_full"
    printf 'session_share_path="$log_dir_full/create-issues-session-$timestamp.md"\n'
    printf 'session_json_path="$log_dir_full/create-issues-session-$timestamp.json"\n'
    printf 'session_otel_path="$log_dir_full/create-issues-otel-$timestamp.jsonl"\n'
    printf 'prompt_file=%q\n' "$out_file"
    printf 'prompt=$(cat "$prompt_file")\n'
    printf 'echo "[shepherd-task] Logging create-issues run to: $log_dir_full"\n'
    printf 'export COPILOT_OTEL_FILE_EXPORTER_PATH="$session_otel_path"\n'
    printf 'set +e\n'
    printf 'printf '\''%%s'\'' "$prompt" | copilot --yolo --output-format json --share "$session_share_path" | "%s" - > "$session_json_path"\n' "$SCRIPT_DIR/redact-secrets.sh"
    printf 'pipeline_status=("${PIPESTATUS[@]}")\n'
    printf 'copilot_exit=${pipeline_status[0]}\n'
    printf 'redact_exit=${pipeline_status[1]}\n'
    printf 'set -e\n'
    printf '"%s" "$log_dir_full" >/dev/null\n' "$SCRIPT_DIR/redact-secrets.sh"
    printf 'unset COPILOT_OTEL_FILE_EXPORTER_PATH\n'
    printf 'if [[ $copilot_exit -ne 0 || $redact_exit -ne 0 ]]; then echo "[shepherd-task] FAILED: copilot or redaction exited with code $copilot_exit/$redact_exit" >&2; exit 1; fi\n'
    printf 'echo "[shepherd-task] Create-issues session complete."\n'
} >"$invocation_file"
chmod +x "$invocation_file"

echo ""
echo "Artifacts written:"
echo "  Directory: $log_dir_full"
echo "  Prompt:    $out_file"
echo "  Script:    $invocation_file"
