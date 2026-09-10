#!/usr/bin/env bash
# shepherd-task-version: 1.0.2

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SKILL="$REPO_ROOT/skills/shepherd-task-40-from-ready-to-merged-to-base/SKILL.md"
STAGE25="$REPO_ROOT/plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh"

required=(
    '--add-reviewer "@copilot"'
    'if GH_PR_EDIT_HELP=$(gh pr edit --help 2>&1); then'
    'GH_PR_EDIT_HELP_STATUS=$?'
    'case "$GH_PR_EDIT_HELP" in'
    "*'@copilot'*)"
    'gh path:'
    'copilot-pull-request-reviewer(\\[bot\\])?'
    'gh pr ready "$PR_NUMBER" -R "$REPO" --undo'
    'DETERMINISTIC_REQUEST_ERROR'
)
for text in "${required[@]}"; do
    grep -Fq -- "$text" "$SKILL" || {
        echo "Stage-40 skill is missing required review contract text: $text" >&2
        exit 1
    }
done
if grep -Fq -- '--add-reviewer Copilot' "$SKILL"; then
    echo 'Stage-40 skill still requests Copilot as an ordinary login.' >&2
    exit 1
fi
if grep -Eq 'gh pr edit --help[[:space:]]*\|[[:space:]]*grep[[:space:]]+-Fq' "$SKILL"; then
    echo 'Stage-40 skill still uses an early-closing grep pipeline for capability detection.' >&2
    exit 1
fi

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/shepherd-stage40-preflight.XXXXXX")"
trap 'rm -rf "$temp_dir"' EXIT
mock_gh="$temp_dir/gh"
cat >"$mock_gh" <<'EOF'
#!/usr/bin/env bash
case "${MOCK_GH_MODE:-supported}" in
supported)
    printf '%s\n' 'Use "@copilot" to request review from Copilot.'
    index=0
    while [[ "$index" -lt 20000 ]]; do
        printf '%s\n' 'additional help output that must be fully consumed'
        index=$((index + 1))
    done
    ;;
missing)
    printf '%s\n' 'Reviewer help without the special token.'
    ;;
error)
    printf '%s\n' 'mock gh help failure' >&2
    exit 42
    ;;
*)
    exit 64
    ;;
esac
EOF
chmod +x "$mock_gh"

set +e
PATH="$temp_dir:$PATH" MOCK_GH_MODE=supported gh pr edit --help |
    grep -Fq '@copilot'
unsafe_status=$?
set -e
[[ "$unsafe_status" -ne 0 ]] ||
    { echo 'Stage-40 regression fixture did not reproduce the pipefail false negative.' >&2; exit 1; }

supports_copilot_reviewer() {
    local help_output help_status
    if help_output="$(gh pr edit --help 2>&1)"; then
        help_status=0
    else
        help_status=$?
    fi
    [[ "$help_status" -eq 0 ]] || return "$help_status"
    case "$help_output" in
    *'@copilot'*) return 0 ;;
    *) return 1 ;;
    esac
}

PATH="$temp_dir:$PATH" MOCK_GH_MODE=supported supports_copilot_reviewer ||
    { echo 'Stage-40 preflight rejected supported large help output.' >&2; exit 1; }
if PATH="$temp_dir:$PATH" MOCK_GH_MODE=missing supports_copilot_reviewer; then
    echo 'Stage-40 preflight accepted help output without @copilot.' >&2
    exit 1
fi
set +e
PATH="$temp_dir:$PATH" MOCK_GH_MODE=error supports_copilot_reviewer
preflight_status=$?
set -e
[[ "$preflight_status" -eq 42 ]] ||
    { echo "Stage-40 preflight did not preserve gh status 42; got $preflight_status." >&2; exit 1; }

manifest_line="$(grep -n -m1 'completed_at=' "$STAGE25" | cut -d: -f1)"
post_mortem_line="$(grep -n -m1 'if \[\[ "\$POST_MORTEM_INVOKED"' "$STAGE25" | cut -d: -f1)"
if [[ -z "$manifest_line" || -z "$post_mortem_line" || "$manifest_line" -ge "$post_mortem_line" ]]; then
    echo 'Bash stage 25 does not finalize its run manifest before post-mortem generation.' >&2
    exit 1
fi

stage25_required=(
    '[shepherd-task] Stage 50: Generating campaign post-mortem...'
    '[shepherd-task] Stage 50 report:'
    '[shepherd-task] Stage 50 session:'
    '[shepherd-task] Stage 50 events:'
    '[shepherd-task] Stage 50 prompt:'
    '[shepherd-task] Stage 50 COMPLETE: Post-mortem created:'
    '- OUTPUT_FILE: $post_mortem_path'
)
for text in "${stage25_required[@]}"; do
    grep -Fq -- "$text" "$STAGE25" || {
        echo "Bash stage 25 is missing required post-mortem logging text: $text" >&2
        exit 1
    }
done

echo 'Stage-40 Bash contract tests passed.'
