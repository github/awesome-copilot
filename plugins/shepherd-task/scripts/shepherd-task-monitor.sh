#!/usr/bin/env bash
#
# shepherd-task-monitor.sh — Monitors an ongoing shepherd-task run.
#
# Watches a shepherd-task log directory for new files and polls GitHub
# for real-time PR/review/CI status. Alerts on failures, stalls, and completion.
#
# Run this in a SEPARATE terminal while shepherd-task-given-list.sh is running.
#
# Usage: ./shepherd-task-monitor.sh <LOG_DIR> <REPO> [POLL_INTERVAL]

set -uo pipefail

LOG_DIR="${1:?Usage: $0 <LOG_DIR> <REPO> [POLL_INTERVAL]}"
REPO="${2:?Usage: $0 <LOG_DIR> <REPO> [POLL_INTERVAL]}"
POLL_INTERVAL="${3:-30}"
STALE_MINUTES=20

if [[ ! -d "$LOG_DIR" ]]; then
    echo "Error: Log directory not found: $LOG_DIR" >&2
    exit 1
fi

LOG_DIR_FULL="$(cd "$LOG_DIR" && pwd)"

echo "=== Shepherd Task Monitor ==="
echo "Log directory: $LOG_DIR_FULL"
echo "Repository:    $REPO"
echo "Poll interval: ${POLL_INTERVAL}s"
echo "Press Ctrl+C to stop."
echo ""

# --- State tracking ---
declare -A KNOWN_FILES      # filename -> size
declare -A ISSUE_PHASE1     # issue# -> done|none
declare -A ISSUE_PHASE2     # issue# -> done|none
declare -A ISSUE_PR         # issue# -> PR number
declare -A ISSUE_STATUS     # issue# -> merged|failed|open|unknown
LAST_ACTIVITY=$(date +%s)

timestamp() { date +%H:%M:%S; }

monitor()  { echo "[$(timestamp)] $*"; }
alert()    { echo "[$(timestamp)] ⚠️  $*"; }
success()  { echo "[$(timestamp)] ✅ $*"; }
failure()  { echo "[$(timestamp)] ❌ $*"; }

# Extract issue number from filename like "phase1-task-20260718-1650-33.md"
get_issue() {
    local name="$1"
    if [[ "$name" =~ -([0-9]+)\.(md|json|jsonl)$ ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

# Extract phase from filename
get_phase() {
    local name="$1"
    if [[ "$name" =~ ^(phase[12]) ]]; then
        echo "${BASH_REMATCH[1]}"
    fi
}

# Find PR linked to an issue
find_pr() {
    local issue="$1"
    local pr=""

    # Strategy A: issue timeline
    pr=$(gh api "/repos/$REPO/issues/$issue/timeline" \
        --jq '.[] | select(.event == "cross-referenced") | select(.source.issue.pull_request != null) | select(.source.issue.state == "open") | .source.issue.number' 2>/dev/null | head -1)
    if [[ -n "$pr" ]]; then echo "$pr"; return 0; fi

    # Strategy B: PR body search
    pr=$(gh pr list -R "$REPO" --state all --json number,body \
        --jq ".[] | select(.body | test(\"#$issue\")) | .number" 2>/dev/null | head -1)
    if [[ -n "$pr" ]]; then echo "$pr"; return 0; fi

    return 1
}

# Get PR status as a one-line summary
get_pr_status() {
    local pr_number="$1"

    local state draft base mergeable
    local info
    info=$(gh pr view "$pr_number" -R "$REPO" --json state,isDraft,baseRefName,mergeable 2>/dev/null)
    if [[ -z "$info" ]]; then return 1; fi

    state=$(echo "$info" | jq -r '.state')
    draft=$(echo "$info" | jq -r '.isDraft')
    mergeable=$(echo "$info" | jq -r '.mergeable')

    # Count Copilot review rounds
    local review_count
    review_count=$(gh api "/repos/$REPO/pulls/$pr_number/reviews" \
        --jq '[.[] | select(.user.login | test("copilot-pull-request-reviewer|Copilot"))] | length' 2>/dev/null || echo "0")

    # Count open review comments from Copilot
    local comment_count
    comment_count=$(gh api "/repos/$REPO/pulls/$pr_number/comments" \
        --jq '[.[] | select(.user.login | test("copilot-pull-request-reviewer|Copilot"))] | length' 2>/dev/null || echo "0")

    # Check CI
    local ci_failures ci_status
    ci_failures=$(gh pr checks "$pr_number" -R "$REPO" --json name,state,bucket \
        --jq '.[] | select(.bucket == "fail") | select(.name != "No remove-before-merge directories") | .name' 2>/dev/null)
    if [[ -z "$ci_failures" ]]; then ci_status="passing"; else ci_status="failing"; fi

    echo "state=$state draft=$draft reviews=$review_count comments=$comment_count CI=$ci_status"
}

# --- Main monitor loop ---
ITERATION=0

while true; do
    ITERATION=$((ITERATION + 1))
    NOW=$(date +%s)
    NEW_FILES=()

    # Scan log directory for new or changed files
    while IFS= read -r line; do
        filename=$(basename "$line")
        size=$(stat -f%z "$line" 2>/dev/null || stat -c%s "$line" 2>/dev/null || echo "0")

        if [[ -z "${KNOWN_FILES[$filename]+x}" ]]; then
            KNOWN_FILES[$filename]="$size"
            NEW_FILES+=("$filename")
            LAST_ACTIVITY=$NOW
        elif [[ "${KNOWN_FILES[$filename]}" != "$size" ]]; then
            KNOWN_FILES[$filename]="$size"
            LAST_ACTIVITY=$NOW
        fi
    done < <(find "$LOG_DIR_FULL" -maxdepth 1 -type f 2>/dev/null)

    # Process new files
    for filename in "${NEW_FILES[@]}"; do
        issue=$(get_issue "$filename")
        phase=$(get_phase "$filename")
        ext="${filename##*.}"

        [[ -z "$issue" || -z "$phase" ]] && continue

        # Initialize issue state if needed
        : "${ISSUE_PHASE1[$issue]:=none}"
        : "${ISSUE_PHASE2[$issue]:=none}"
        : "${ISSUE_STATUS[$issue]:=unknown}"

        if [[ "$ext" == "md" ]]; then
            if [[ "$phase" == "phase1" ]]; then
                ISSUE_PHASE1[$issue]="done"
                monitor "Issue #$issue: Phase 1 session exported ($filename)"

                # Try to find the PR
                pr=$(find_pr "$issue") || true
                if [[ -n "$pr" ]]; then
                    ISSUE_PR[$issue]="$pr"
                    monitor "Issue #$issue: Linked to PR #$pr"
                fi
            elif [[ "$phase" == "phase2" ]]; then
                ISSUE_PHASE2[$issue]="done"
                monitor "Issue #$issue: Phase 2 session exported ($filename)"
            fi
        fi
    done

    # For issues with known PRs, check status
    ACTIVE_ISSUE=""
    for issue in "${!ISSUE_PR[@]}"; do
        pr="${ISSUE_PR[$issue]}"

        # Detect active issue (has PR, phase2 not done)
        if [[ "${ISSUE_PHASE2[$issue]}" != "done" ]]; then
            ACTIVE_ISSUE="$issue"
        fi

        # If phase2 just completed, check final state
        if [[ "${ISSUE_PHASE2[$issue]}" == "done" && "${ISSUE_STATUS[$issue]}" != "merged" && "${ISSUE_STATUS[$issue]}" != "failed" ]]; then
            pr_state=$(gh pr view "$pr" -R "$REPO" --json state --jq '.state' 2>/dev/null)
            review_count=$(gh api "/repos/$REPO/pulls/$pr/reviews" \
                --jq '[.[] | select(.user.login | test("copilot-pull-request-reviewer|Copilot"))] | length' 2>/dev/null || echo "?")
            if [[ "$pr_state" == "MERGED" ]]; then
                ISSUE_STATUS[$issue]="merged"
                success "Issue #$issue: PR #$pr MERGED ($review_count review rounds)"
            elif [[ "$pr_state" == "CLOSED" ]]; then
                ISSUE_STATUS[$issue]="failed"
                failure "Issue #$issue: PR #$pr CLOSED (not merged)"
            else
                ISSUE_STATUS[$issue]="open"
                failure "Issue #$issue: PR #$pr still OPEN after Phase 2 exited"
            fi
        fi
    done

    # Poll active PR for real-time status
    if [[ -n "$ACTIVE_ISSUE" && -n "${ISSUE_PR[$ACTIVE_ISSUE]+x}" ]]; then
        pr="${ISSUE_PR[$ACTIVE_ISSUE]}"
        status_line=$(get_pr_status "$pr")
        if [[ -n "$status_line" ]]; then
            full_line="Issue #$ACTIVE_ISSUE PR #$pr: $status_line"
            if [[ "$status_line" == *"state=MERGED"* ]]; then
                success "$full_line"
                ISSUE_STATUS[$ACTIVE_ISSUE]="merged"
            elif [[ "$status_line" == *"CI=failing"* ]]; then
                alert "$full_line"
            else
                monitor "$full_line"
            fi
        fi
    fi

    # Try to find PRs for issues that don't have one yet
    if [[ $ITERATION -eq 1 ]] || [[ ${#NEW_FILES[@]} -gt 0 ]]; then
        for issue in "${!ISSUE_PHASE1[@]}"; do
            if [[ -z "${ISSUE_PR[$issue]+x}" ]]; then
                pr=$(find_pr "$issue") || true
                if [[ -n "$pr" ]]; then
                    ISSUE_PR[$issue]="$pr"
                    monitor "Issue #$issue: Found PR #$pr"
                fi
            fi
        done
    fi

    # Stale detection
    STALE_SECONDS=$(( NOW - LAST_ACTIVITY ))
    STALE_MINS=$(( STALE_SECONDS / 60 ))
    if [[ $STALE_MINS -ge $STALE_MINUTES ]]; then
        alert "No activity for ${STALE_MINS} minutes — shepherd may be stalled or waiting for CCRA"
    fi

    # Periodic summary (every 5 iterations)
    if [[ $(( ITERATION % 5 )) -eq 0 ]] && [[ ${#ISSUE_PHASE1[@]} -gt 0 ]]; then
        echo ""
        echo "[$(timestamp)] === Summary ==="
        for issue in $(echo "${!ISSUE_PHASE1[@]}" | tr ' ' '\n' | sort -n); do
            p1="${ISSUE_PHASE1[$issue]}"
            p2="${ISSUE_PHASE2[$issue]:-none}"
            pr="${ISSUE_PR[$issue]:-none}"
            status="${ISSUE_STATUS[$issue]:-unknown}"
            [[ "$pr" != "none" ]] && pr="PR #$pr"
            echo "  Issue #$issue : P1=$p1 P2=$p2 $pr status=$status"
        done
        echo ""
    fi

    sleep "$POLL_INTERVAL"
done
