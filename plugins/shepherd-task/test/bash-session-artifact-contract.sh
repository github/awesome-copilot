#!/usr/bin/env bash
# shepherd-task-version: 1.0.5

set -euo pipefail

test_root="$(cd "$(dirname "$0")" && pwd)"
plugin_root="$(cd "$test_root/.." && pwd)"
orchestrator="$plugin_root/scripts/shepherd-task.sh"
temp_root="$(mktemp -d)"
trap 'rm -rf "$temp_root"' EXIT

repo_root="$temp_root/repo"
campaign_directory="41-failed-phase-redaction-remove-before-merge"
campaign_path="$repo_root/$campaign_directory"
log_directory="$campaign_path/run"
mock_bin="$temp_root/mock-bin"
mkdir -p "$log_directory" "$mock_bin"

git -C "$temp_root" init -q repo
git -C "$repo_root" config user.name 'Shepherd Contract'
git -C "$repo_root" config user.email 'shepherd-contract@example.invalid'
git -C "$repo_root" remote add origin git@github.com:owner/repo.git

cat >"$campaign_path/shepherd-campaign.json" <<EOF
{
  "campaignId": "11111111-1111-4111-8111-111111111111",
  "baseBranch": "campaign-base",
  "repository": "owner/repo",
  "lessonPropagation": "off",
  "campaignMetadataDirectory": "$campaign_directory"
}
EOF
printf '# Campaign lessons\n' >"$campaign_path/campaign-lessons.md"
git -C "$repo_root" add .
git -C "$repo_root" commit -qm 'Create contract campaign'
git -C "$repo_root" branch -M campaign-base

cat >"$mock_bin/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "$1 $2" == "issue view" ]]; then
    printf 'OPEN\n'
    exit 0
fi
if [[ "$1" == "api" || "$1 $2" == "pr list" ]]; then
    exit 0
fi
echo "Unexpected gh invocation: $*" >&2
exit 90
EOF

cat >"$mock_bin/copilot" <<'EOF'
#!/usr/bin/env bash
share_path=""
while (($#)); do
    if [[ "$1" == "--share" ]]; then
        share_path="$2"
        shift 2
        continue
    fi
    shift
done
printf 'partial failed session\n' >"$share_path"
printf '{"token":"ghp_failed_phase_secret"}\n' >"$COPILOT_OTEL_FILE_EXPORTER_PATH"
printf '{"token":"ghp_failed_stream_secret"}\n'
exit 23
EOF
chmod +x "$mock_bin/gh" "$mock_bin/copilot"

set +e
(
    cd "$repo_root"
    PATH="$mock_bin:$PATH" bash "$orchestrator" \
        7 "$campaign_directory" "$log_directory"
) >"$temp_root/orchestrator.out" 2>&1
orchestrator_exit=$?
set -e

[[ $orchestrator_exit -eq 23 ]] || {
    cat "$temp_root/orchestrator.out" >&2
    echo "Expected failed Copilot status 23, got $orchestrator_exit." >&2
    exit 1
}

otel_file="$(find "$log_directory" -type f -name 'phase1-otel-*.jsonl' -print -quit)"
[[ -n "$otel_file" ]] || {
    echo 'Failed phase did not produce an OTel artifact.' >&2
    exit 1
}
jq -e '.token == "[REDACTED]"' "$otel_file" >/dev/null || {
    echo 'Failed-phase OTel was not redacted before exit.' >&2
    exit 1
}
if grep -R -Fq 'ghp_failed_phase_secret' "$log_directory"; then
    echo 'Failed-phase secret remained in the run directory.' >&2
    exit 1
fi
grep -Fq \
    'FAILED: Phase 1 copilot session or redaction failed.' \
    "$temp_root/orchestrator.out"

echo 'Bash session artifact contract tests passed.'
