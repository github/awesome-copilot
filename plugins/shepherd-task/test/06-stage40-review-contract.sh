#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SKILL="$REPO_ROOT/skills/shepherd-task-40-from-ready-to-merged-to-base/SKILL.md"
STAGE25="$REPO_ROOT/plugins/shepherd-task/scripts/shepherd-task-25-given-list.sh"

required=(
    '--add-reviewer "@copilot"'
    "grep -Fq '@copilot'"
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
