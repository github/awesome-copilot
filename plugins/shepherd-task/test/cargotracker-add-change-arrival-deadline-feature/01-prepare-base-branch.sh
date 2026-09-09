#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

usage() {
    echo "Usage: $0 <OWNER/REPO> <BASE_BRANCH> <CAMPAIGN_SHORTNAME> <BASELINE_SHA>" >&2
}

fail() {
    echo "Error: $*" >&2
    exit 1
}

[[ $# -eq 4 ]] || { usage; exit 1; }
repo="$1"
base_branch="$2"
campaign_shortname="$3"
baseline_sha="$(printf '%s' "$4" | tr '[:upper:]' '[:lower:]')"

for command_name in git gh jq base64 gzip awk tail; do
    command -v "$command_name" >/dev/null 2>&1 ||
        fail "Required command was not found on PATH: $command_name"
done
command -v sha256sum >/dev/null 2>&1 ||
    command -v shasum >/dev/null 2>&1 ||
    fail "Required SHA-256 command was not found on PATH: sha256sum or shasum"
[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
    fail "Repo must be in OWNER/REPO format."
campaign_shortname_pattern='^[a-z0-9]+(-[a-z0-9]+)*$'
[[ "$campaign_shortname" =~ $campaign_shortname_pattern ]] ||
    fail "CampaignShortname must be lowercase kebab-case."
[[ "$baseline_sha" =~ ^[0-9a-f]{40}$ ]] ||
    fail "BaselineSha must be a 40-character hexadecimal SHA."
[[ "$base_branch" != "main" ]] || fail "BaseBranch must not be 'main'."
git check-ref-format --branch "$base_branch" >/dev/null 2>&1 ||
    fail "Invalid BaseBranch: '$base_branch'."

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
    fail "Run this script inside the target test worktree."
repo_root="$(cd "$repo_root" && pwd -P)"
[[ -z "$(git -C "$repo_root" status --porcelain)" ]] ||
    fail "Working tree is not clean. Commit or stash changes before creating a campaign."

script_dir="$(cd "$(dirname "$0")" && pwd)"
resolver="$script_dir/../../scripts/resolve-repository-remote.sh"
initializer="$script_dir/../../scripts/shepherd-task-00-init-campaign.sh"
plan_archive="$script_dir/cargotracker-plan.md.gz.b64"
[[ -x "$resolver" ]] || fail "Repository remote resolver not found or not executable: $resolver"
[[ -x "$initializer" ]] || fail "Stage 00 script not found or not executable: $initializer"
[[ -f "$plan_archive" ]] || fail "Cargo Tracker plan archive not found: $plan_archive"

decode_plan_archive() {
    if base64 --decode </dev/null >/dev/null 2>&1; then
        base64 --decode "$plan_archive"
    else
        base64 -D "$plan_archive"
    fi
}

sha256_stream() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum | awk '{print $1}'
    else
        shasum -a 256 | awk '{print $1}'
    fi
}

base_remote="$("$resolver" "$repo")"
git -C "$repo_root" fetch --no-tags "$base_remote" ||
    fail "Failed to fetch remote '$base_remote'."
git -C "$repo_root" cat-file -e "$baseline_sha^{commit}" 2>/dev/null ||
    fail "BaselineSha is not an available commit: '$baseline_sha'."
for baseline_file in \
    pom.xml \
    mvnw \
    src/main/java/org/eclipse/cargotracker/application/BookingService.java \
    src/main/webapp/admin/tables/listNotRouted.xhtml; do
    git -C "$repo_root" cat-file -e "${baseline_sha}:${baseline_file}" 2>/dev/null ||
        fail "Baseline commit '$baseline_sha' does not contain '$baseline_file'."
done

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$base_branch"; then
    fail "Local campaign branch already exists: '$base_branch'."
fi
set +e
git -C "$repo_root" ls-remote --exit-code --heads "$base_remote" "$base_branch" >/dev/null 2>&1
remote_exit=$?
set -e
if [[ $remote_exit -eq 0 ]]; then
    fail "Remote campaign branch already exists: '$base_remote/$base_branch'."
elif [[ $remote_exit -ne 2 ]]; then
    fail "Could not determine whether '$base_remote/$base_branch' exists."
fi

git -C "$repo_root" checkout -b "$base_branch" "$baseline_sha" ||
    fail "Failed to create '$base_branch' from '$baseline_sha'."

campaign_issue_body="$(cat <<EOF
## Shepherd-task Cargo Tracker control campaign

This campaign contains five serial tasks that add the Change Arrival Deadline
feature to the prepared Cargo Tracker baseline with lesson propagation
disabled.

- Campaign base branch: \`$base_branch\`
- Campaign shortname: \`$campaign_shortname\`
- Lesson propagation: \`off\`
- Immutable baseline SHA: \`$baseline_sha\`
- Expected task count: 5
- Task 1: application-layer deadline change operation
- Task 2: booking-facade deadline change operation
- Task 3: deadline editor backing model
- Task 4: PrimeFaces deadline dialog
- Task 5: Administration dashboard integration and acceptance
EOF
)"

set +e
campaign_issue_output="$(
    gh issue create --repo "$repo" \
        --title '[Campaign][off] Cargo Tracker arrival-deadline control' \
        --body "$campaign_issue_body" 2>&1
)"
gh_exit=$?
set -e
[[ $gh_exit -eq 0 ]] ||
    fail "Failed to create campaign issue: $campaign_issue_output"
campaign_issue_url="$(printf '%s\n' "$campaign_issue_output" | tail -n 1)"
campaign_issue_url_pattern='/issues/([1-9][0-9]*)$'
[[ "$campaign_issue_url" =~ $campaign_issue_url_pattern ]] ||
    fail "Could not parse campaign issue number from '$campaign_issue_url'."
campaign_issue_number="${BASH_REMATCH[1]}"

(
    cd "$repo_root"
    "$initializer" "$campaign_issue_number" "$campaign_shortname" "$base_branch" "$repo"
)

campaign_metadata_directory="${campaign_issue_number}-${campaign_shortname}-remove-before-merge"
campaign_metadata_path="$repo_root/$campaign_metadata_directory"
manifest_path="$campaign_metadata_path/shepherd-campaign.json"
jq -e '.lessonPropagation == "off"' "$manifest_path" >/dev/null ||
    fail "Initialized control campaign does not use lessonPropagation=off."

plan_file='add-change-arrival-deadline-feature-ignorance-reduction-plan.md'
plan_path="$campaign_metadata_path/$plan_file"
plan_hash="$(decode_plan_archive | gzip -dc | sha256_stream)"
[[ "$plan_hash" == "6fdedc8d42a586fe8dc74bf4155d4d2b927b2dd35754093e6719b2061835e882" ]] ||
    fail "Embedded Cargo Tracker plan hash '$plan_hash' is invalid."
set +e
decode_plan_archive | gzip -dc >"$plan_path"
decode_status=("${PIPESTATUS[@]}")
set -e
[[ ${decode_status[0]} -eq 0 && ${decode_status[1]} -eq 0 ]] ||
    fail "Unable to decode the embedded Cargo Tracker plan."
printf '\n' >>"$plan_path"

workflow_directory="$repo_root/.github/workflows"
mkdir -p "$workflow_directory"
cat >"$workflow_directory/shepherd-task-cargotracker.yml" <<'EOF'
name: Shepherd task Cargo Tracker

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    name: Shepherd task Cargo Tracker
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
          cache: maven
      - name: Build Cargo Tracker with Open Liberty
        run: ./mvnw --batch-mode --no-transfer-progress clean package -Popenliberty
EOF

jq -n \
    --arg baselineSha "$baseline_sha" \
    '{
      schemaVersion: 1,
      baselineSha: $baselineSha,
      lessonPropagation: "off",
      expectedTaskCount: 5
    }' >"$campaign_metadata_path/shepherd-test-experiment.json"

git -C "$repo_root" add -- \
    "$campaign_metadata_directory" \
    .github/workflows/shepherd-task-cargotracker.yml ||
    fail "git add failed."
git -C "$repo_root" commit \
    -m "test: initialize Cargo Tracker control campaign #$campaign_issue_number" ||
    fail "git commit failed."

first_parent="$(git -C "$repo_root" rev-parse 'HEAD^')"
[[ "$first_parent" == "$baseline_sha" ]] ||
    fail "Campaign init commit parent '$first_parent' is not baseline '$baseline_sha'."
git -C "$repo_root" push -u "$base_remote" "$base_branch" ||
    fail "Failed to push '$base_branch' to '$base_remote'."

campaign_id="$(jq -r '.campaignId' "$manifest_path")"
printf '\nCampaign initialized.\n'
echo "  Mode:               off"
echo "  Campaign issue:     $campaign_issue_url"
echo "  Campaign ID:        $campaign_id"
echo "  Base remote:        $base_remote"
echo "  Baseline SHA:       $baseline_sha"
echo "  Init commit parent: $first_parent"
echo "  Metadata directory: $campaign_metadata_directory"
printf '\nNext: 02-create-issues.sh %q\n' "$campaign_metadata_directory"
