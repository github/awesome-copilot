#!/usr/bin/env bash
#
# Stage 15: derives stage-20 inputs and creates prompt and invocation artifacts.
#
# Usage:
#   ./shepherd-task-15-prepare-create-issues.sh <CAMPAIGN_METADATA_DIRECTORY>

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

fail() {
    echo "Error: $1" >&2
    exit 1
}

[[ $# -eq 1 ]] ||
    fail "Usage: $0 <CAMPAIGN_METADATA_DIRECTORY>"

CAMPAIGN_METADATA_DIRECTORY="$1"

for command in git jq awk find; do
    command -v "$command" >/dev/null 2>&1 ||
        fail "Required command '$command' was not found."
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
    (.baseBranch | type == "string" and . != "main") and
    (.lessonPropagation == "off" or .lessonPropagation == "campaign")
' "$MANIFEST_PATH" >/dev/null || fail "Campaign manifest is invalid: $MANIFEST_PATH"

CAMPAIGN_ID="$(jq -r '.campaignId' "$MANIFEST_PATH")"
PARENT_ISSUE="$(jq -r '.campaignIssueNumber' "$MANIFEST_PATH")"
CAMPAIGN_SHORTNAME="$(jq -r '.campaignShortname' "$MANIFEST_PATH")"
REPO="$(jq -r '.repository' "$MANIFEST_PATH")"
BASE_BRANCH="$(jq -r '.baseBranch' "$MANIFEST_PATH")"
LESSON_PROPAGATION="$(jq -r '.lessonPropagation' "$MANIFEST_PATH")"
DRAFT_VALIDATOR="$SCRIPT_DIR/validate-stage20-drafts.sh"
[[ -x "$DRAFT_VALIDATOR" ]] ||
    fail "Stage-20 draft validator is missing or not executable: $DRAFT_VALIDATOR"
ISSUE_BODY_VERIFIER="$SCRIPT_DIR/verify-github-issue-body.sh"
[[ -x "$ISSUE_BODY_VERIFIER" ]] ||
    fail "Stage-20 issue body verifier is missing or not executable: $ISSUE_BODY_VERIFIER"
PLAN_DIRECTORY="$(jq -r '.campaignMetadataDirectory' "$MANIFEST_PATH")"
EXPECTED_DIRECTORY="${PARENT_ISSUE}-${CAMPAIGN_SHORTNAME}-remove-before-merge"
[[ "$PLAN_DIRECTORY" == "$EXPECTED_DIRECTORY" && "$CAMPAIGN_METADATA_DIRECTORY" == "$EXPECTED_DIRECTORY" ]] ||
    fail "Campaign manifest and directory must both use '$EXPECTED_DIRECTORY'."

mapfile -d '' PLAN_FILES < <(
    find "$CAMPAIGN_METADATA_PATH" -maxdepth 1 -type f \
        -iname '*ignorance-reduction-plan.md' -print0
)
[[ ${#PLAN_FILES[@]} -eq 1 ]] ||
    fail "Expected exactly one *ignorance-reduction-plan.md in the campaign metadata directory; found ${#PLAN_FILES[@]}."
PLAN_PATH="${PLAN_FILES[0]}"
PLAN_FILE_NAME="$(basename "$PLAN_PATH")"

mapfile -t QUESTION_HEADINGS < <(
    awk '
        /^```/ { in_fence = !in_fence; next }
        !in_fence {
            sub(/\r$/, "")
            if (tolower($0) ~ /^##[[:space:]].*ignorance reduction/) print
        }
    ' "$PLAN_PATH"
)
[[ ${#QUESTION_HEADINGS[@]} -eq 1 ]] ||
    fail "Expected exactly one level-two ignorance-reduction heading in $PLAN_FILE_NAME; found ${#QUESTION_HEADINGS[@]}."
QUESTIONS_SECTION="${QUESTION_HEADINGS[0]}"

mapfile -t IMPLEMENTATION_HEADINGS < <(
    awk '
        /^```/ { in_fence = !in_fence; next }
        !in_fence {
            sub(/\r$/, "")
            if ($0 ~ /^##[[:space:]]/) {
                if (is_implementation && task_count > 0) print implementation_heading
                is_implementation = (tolower($0) ~ /^##[[:space:]].*implementation/)
                implementation_heading = $0
                task_count = 0
                next
            }
            if (is_implementation && $0 ~ /^###[[:space:]]/) task_count++
        }
        END {
            if (is_implementation && task_count > 0) print implementation_heading
        }
    ' "$PLAN_PATH"
)
[[ ${#IMPLEMENTATION_HEADINGS[@]} -eq 1 ]] ||
    fail "Expected exactly one level-two implementation heading with direct level-three task headings in $PLAN_FILE_NAME; found ${#IMPLEMENTATION_HEADINGS[@]}."
IMPLEMENTATION_SECTION="${IMPLEMENTATION_HEADINGS[0]}"

TASK_HEADING_COUNT="$(
    awk -v section="$IMPLEMENTATION_SECTION" '
        /^```/ { in_fence = !in_fence; next }
        !in_fence {
            sub(/\r$/, "")
            if ($0 == section) { in_section=1; next }
            if (in_section && /^##[[:space:]]/) exit
            if (in_section && /^###[[:space:]]/) count++
        }
        END { print count + 0 }
    ' "$PLAN_PATH"
)"
[[ "$TASK_HEADING_COUNT" -gt 0 ]] ||
    fail "Implementation section '$IMPLEMENTATION_SECTION' has no direct level-three task headings."

BASE_REMOTE="$("$SCRIPT_DIR/resolve-repository-remote.sh" "$REPO")"

echo "=== shepherd-task stage-15 preparation for stage 20 ==="
echo "Campaign ID:                 $CAMPAIGN_ID"
echo "Repository:                  $REPO"
echo "Campaign base branch:        $BASE_BRANCH"
echo "Campaign issue:              #$PARENT_ISSUE"
echo "Lesson propagation:          $LESSON_PROPAGATION"
echo "Campaign metadata directory: $PLAN_DIRECTORY"
echo "Plan file:                   $PLAN_FILE_NAME"
echo "Questions section:           $QUESTIONS_SECTION"
echo "Implementation section:      $IMPLEMENTATION_SECTION"
echo "Implementation tasks:        $TASK_HEADING_COUNT"
echo "Git remote:                  $BASE_REMOTE"

timestamp="$(date +%Y%m%d-%H%M)"
prompts_directory="$CAMPAIGN_METADATA_PATH/prompts"
mkdir -p -- "$prompts_directory"
log_dir_full="$prompts_directory/shepherd-task-20-$timestamp"
[[ ! -e "$log_dir_full" ]] ||
    fail "Stage-20 artifact directory already exists: $log_dir_full"
mkdir -- "$log_dir_full"

out_file="$log_dir_full/${timestamp}-invoke-shepherd-task-20-create-issues-from-plan-skill.md"
invocation_file="$log_dir_full/${timestamp}-invoke-shepherd-task-20-create-issues-from-plan-skill.sh"

cat >"$out_file" <<EOF
Invoke skill \`shepherd-task-20-create-issues-from-plan\` with these inputs:

- CAMPAIGN_ID: $CAMPAIGN_ID
- LESSON_PROPAGATION: $LESSON_PROPAGATION
- REPO: $REPO
- BASE_BRANCH: $BASE_BRANCH
- PARENT_ISSUE: $PARENT_ISSUE
- PLAN_DIRECTORY: $PLAN_DIRECTORY
- PLAN_FILE_NAME: $PLAN_FILE_NAME
- QUESTIONS_SECTION: $QUESTIONS_SECTION
- IMPLEMENTATION_SECTION: $IMPLEMENTATION_SECTION
- EXPECTED_TASK_COUNT: $TASK_HEADING_COUNT
- BASE_REMOTE: $BASE_REMOTE
- LOG_DIRECTORY: $log_dir_full
- DRAFT_VALIDATOR: $DRAFT_VALIDATOR
- ISSUE_BODY_VERIFIER: $ISSUE_BODY_VERIFIER
EOF

{
    printf '#!/usr/bin/env bash\n'
    printf 'set -euo pipefail\n'
    printf 'timestamp=%q\n' "$timestamp"
    printf 'log_dir_full=%q\n' "$log_dir_full"
    printf 'session_share_path="$log_dir_full/create-issues-session-$timestamp.md"\n'
    printf 'session_jsonl_path="$log_dir_full/create-issues-session-$timestamp.jsonl"\n'
    printf 'session_otel_path="$log_dir_full/create-issues-otel-$timestamp.jsonl"\n'
    printf 'prompt_file=%q\n' "$out_file"
    printf 'prompt=$(cat "$prompt_file")\n'
    printf 'echo "[shepherd-task] Logging create-issues run to: $log_dir_full"\n'
    printf 'export COPILOT_OTEL_FILE_EXPORTER_PATH="$session_otel_path"\n'
    printf 'set +e\n'
    printf 'printf '\''%%s'\'' "$prompt" | copilot --yolo --output-format json --share "$session_share_path" | "%s" - > "$session_jsonl_path"\n' "$SCRIPT_DIR/redact-secrets.sh"
    printf 'pipeline_status=("${PIPESTATUS[@]}")\n'
    printf 'copilot_exit=${pipeline_status[1]}\n'
    printf 'redact_exit=${pipeline_status[2]}\n'
    printf 'set -e\n'
    printf '"%s" "$log_dir_full" >/dev/null\n' "$SCRIPT_DIR/redact-secrets.sh"
    printf 'unset COPILOT_OTEL_FILE_EXPORTER_PATH\n'
    printf 'if [[ $copilot_exit -ne 0 || $redact_exit -ne 0 ]]; then echo "[shepherd-task] FAILED: copilot or redaction exited with code $copilot_exit/$redact_exit" >&2; exit 1; fi\n'
    printf '"%s" "$log_dir_full/stage-20-result.json"\n' "$SCRIPT_DIR/assert-stage20-result.sh"
    printf 'echo "[shepherd-task] Create-issues session complete."\n'
} >"$invocation_file"
chmod +x "$invocation_file"

echo ""
echo "Artifacts written:"
echo "  Directory: $log_dir_full"
echo "  Prompt:    $out_file"
echo "  Script:    $invocation_file"
