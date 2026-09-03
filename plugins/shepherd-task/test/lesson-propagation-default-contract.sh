#!/usr/bin/env bash

set -euo pipefail

TEST_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIR="$(cd "$TEST_DIR/../scripts" && pwd)"
STAGE00="$SCRIPTS_DIR/shepherd-task-00-init-campaign.sh"
STAGE25="$SCRIPTS_DIR/shepherd-task-25-given-list.sh"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/shepherd-lesson-default.XXXXXX")"
BIN_DIR="$TEMP_DIR/bin"

mkdir -p -- "$BIN_DIR"
cat >"$BIN_DIR/uuidgen" <<'EOF'
#!/usr/bin/env bash
echo "12345678-1234-4234-8234-123456789abc"
EOF
chmod +x "$BIN_DIR/uuidgen"

cat >"$BIN_DIR/jq" <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

declare -A values=()
declare -A json_values=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        -n)
            shift
            ;;
        --arg)
            values["$2"]="$3"
            shift 3
            ;;
        --argjson)
            json_values["$2"]="$3"
            shift 3
            ;;
        *)
            shift
            ;;
    esac
done

cat <<JSON
{
  "schemaVersion": ${json_values[schemaVersion]},
  "campaignId": "${values[campaignId]}",
  "campaignIssueNumber": ${json_values[campaignIssueNumber]},
  "campaignShortname": "${values[campaignShortname]}",
  "repository": "${values[repository]}",
  "baseBranch": "${values[baseBranch]}",
  "lessonPropagation": "${values[lessonPropagation]}",
  "campaignMetadataDirectory": "${values[campaignMetadataDirectory]}",
  "lessonsFile": "${values[lessonsFile]}",
  "createdAt": "${values[createdAt]}"
}
JSON
EOF
chmod +x "$BIN_DIR/jq"
export PATH="$BIN_DIR:$PATH"

cleanup() {
    rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT

new_test_repository() {
    local name="$1"
    local path="$TEMP_DIR/$name"
    local branch="experiment/$name"
    mkdir -p -- "$path"
    git -C "$path" init --quiet --initial-branch "$branch"
    printf '%s\n%s\n' "$path" "$branch"
}

mapfile -t default_repository < <(new_test_repository default)
(
    cd "${default_repository[0]}"
    "$STAGE00" 1 default "${default_repository[1]}" owner/repository >/dev/null
)
default_manifest="${default_repository[0]}/1-default-remove-before-merge/shepherd-campaign.json"
grep -Fq '"lessonPropagation": "off"' "$default_manifest" ||
    { echo "Stage 00 did not persist lessonPropagation=off by default." >&2; exit 1; }
[[ -f "${default_repository[0]}/1-default-remove-before-merge/campaign-lessons.md" ]] ||
    { echo "Stage 00 did not create campaign-lessons.md in off mode." >&2; exit 1; }

mapfile -t campaign_repository < <(new_test_repository campaign)
(
    cd "${campaign_repository[0]}"
    "$STAGE00" 2 campaign "${campaign_repository[1]}" owner/repository campaign >/dev/null
)
campaign_manifest="${campaign_repository[0]}/2-campaign-remove-before-merge/shepherd-campaign.json"
grep -Fq '"lessonPropagation": "campaign"' "$campaign_manifest" ||
    { echo "Stage 00 did not preserve explicit campaign lesson propagation." >&2; exit 1; }

mapfile -t invalid_repository < <(new_test_repository invalid)
if (
    cd "${invalid_repository[0]}"
    "$STAGE00" 3 invalid "${invalid_repository[1]}" owner/repository invalid >/dev/null 2>&1
); then
    echo "Stage 00 accepted an invalid lesson propagation mode." >&2
    exit 1
fi

if grep -q -- '--lesson-propagation' "$STAGE25"; then
    echo "Stage 25 still exposes the removed lesson propagation option." >&2
    exit 1
fi
grep -Fq '[[ $# -eq 2 ]]' "$STAGE25" ||
    { echo "Stage 25 does not require its new two-argument interface." >&2; exit 1; }
grep -Fq "LESSON_PROPAGATION=\"\$(jq -r '.lessonPropagation' \"\$MANIFEST_PATH\")\"" "$STAGE25" ||
    { echo "Stage 25 does not derive lesson propagation from the campaign manifest." >&2; exit 1; }
grep -Fq '(.lessonPropagation == "off" or .lessonPropagation == "campaign")' "$STAGE25" ||
    { echo "Stage 25 does not fail closed on an invalid manifest lesson mode." >&2; exit 1; }

echo "Bash lesson propagation default contract tests passed."
