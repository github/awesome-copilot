# Stage 30 CCA remediation and re-engagement loop

### Step 7: Request changes from Copilot (iteration loop)

**Max iterations: 20**

When CI fails or review agents flag problems:

#### 7.1: Gather failure details

```bash
# Get failed run IDs
FAILED_RUNS=$(gh run list -R $REPO --branch "$JTBDTASK_BRANCH" \
  --status completed --json databaseId,conclusion,name \
  --jq '.[] | select(.conclusion == "failure") | .databaseId')

# Get logs for failed runs (only failed steps)
for RUN_ID in $FAILED_RUNS; do
  gh run view $RUN_ID -R $REPO --log-failed
done
```

#### 7.2: Gather review agent comments

```bash
# Get review comments on the PR
gh api "/repos/$REPO/pulls/$PR_NUMBER/comments" \
  --jq '.[] | select(.user.type == "Bot") | {user: .user.login, body: .body}'

# Also get issue-level comments (review agents sometimes post there)
gh pr view $PR_NUMBER -R $REPO --comments --json comments \
  --jq '.comments[] | select(.author.login | test("bot|copilot|agent"; "i")) | {author: .author.login, body: .body}'
```

#### 7.3: Compose and submit a "Request changes" review

Analyze the failures and compose a hybrid message: relevant log excerpts plus a short targeted instruction for Copilot.

```bash
# Submit review requesting changes, @mentioning Copilot
gh pr review $PR_NUMBER -R $REPO --request-changes --body "$REVIEW_BODY"
```

The `$REVIEW_BODY` should follow this format:

```
@copilot Please fix the following issues:

## CI Failure: [workflow name]

<relevant log excerpt, trimmed to the essential error>

**Fix:** [Short, specific instruction on what to change]

## Review Comment from [bot name]

> [quoted comment]

**Fix:** [Short, specific instruction on what to change]
```

#### 7.4: Wait for Copilot to push fixes (with re-engagement)

After submitting the review, CCA may or may not re-engage automatically. Once CCA has emitted `copilot_work_finished`, a review comment alone may not restart it. This step uses a two-phase approach: first wait briefly for organic re-engagement, then explicitly re-assign CCA if needed.

```bash
# Record the review submission timestamp and current HEAD
REVIEW_SUBMITTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
CURRENT_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')

# --- Phase A: Wait up to 2 minutes for CCA to organically re-engage ---
PHASE_A_TIMEOUT=120
INTERVAL=15
ELAPSED=0
CCA_REENGAGED=false

while [ $ELAPSED -lt $PHASE_A_TIMEOUT ]; do
  # Check for a new copilot_work_started event after our review
  TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
    -H "Accept: application/vnd.github+json" 2>/dev/null)
  NEW_START=$(printf '%s' "$TIMELINE" | jq -r --arg after "$REVIEW_SUBMITTED_AT" \
    '[.[] | select(.event == "copilot_work_started") | .created_at | select(. >= $after)] | first // empty')
  if [ -n "$NEW_START" ]; then
    CCA_REENGAGED=true
    echo "CCA re-engaged organically at $NEW_START"
    break
  fi
  # Also check if HEAD already changed (CCA pushed without a visible start event)
  NEW_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')
  if [ "$NEW_SHA" != "$CURRENT_SHA" ]; then
    CCA_REENGAGED=true
    echo "CCA pushed new HEAD $NEW_SHA (no explicit work_started observed)"
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

# --- Phase B: If CCA did not re-engage, explicitly re-assign ---
if [ "$CCA_REENGAGED" != true ]; then
  echo "CCA did not re-engage within ${PHASE_A_TIMEOUT}s. Re-assigning task to trigger a new work cycle."
  gh api --method POST \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/repos/$REPO/issues/$TASK_ISSUE/assignees" \
    --input - <<< "{
      \"assignees\": [\"copilot-swe-agent[bot]\"],
      \"agent_assignment\": {
        \"target_repo\": \"$REPO\",
        \"base_branch\": \"$BASE_BRANCH\"
      }
    }" > /dev/null
fi

# --- Phase C: Wait for CCA to complete a full work cycle (up to 10 minutes) ---
PHASE_C_TIMEOUT=600
ELAPSED=0

while [ $ELAPSED -lt $PHASE_C_TIMEOUT ]; do
  # Check for new HEAD
  NEW_SHA=$(gh pr view $PR_NUMBER -R $REPO --json headRefOid --jq '.headRefOid')
  if [ "$NEW_SHA" != "$CURRENT_SHA" ]; then
    # Verify CCA actually finished (not mid-cycle)
    TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
      -H "Accept: application/vnd.github+json" 2>/dev/null)
    LATEST_START=$(printf '%s' "$TIMELINE" | jq -r \
      '[.[] | select(.event == "copilot_work_started") | .created_at] | max // empty')
    LATEST_FINISH=$(printf '%s' "$TIMELINE" | jq -r \
      '[.[] | select(.event == "copilot_work_finished") | .created_at] | max // empty')
    if [ -n "$LATEST_START" ] && [ -n "$LATEST_FINISH" ] \
        && [[ "$LATEST_FINISH" > "$LATEST_START" || "$LATEST_FINISH" == "$LATEST_START" ]]; then
      echo "CCA completed work cycle. New HEAD: $NEW_SHA"
      break
    fi
  fi
  sleep 30
  ELAPSED=$((ELAPSED + 30))
done

# --- Diagnostic output on failure ---
if [ "$NEW_SHA" = "$CURRENT_SHA" ]; then
  TIMELINE=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
    -H "Accept: application/vnd.github+json" 2>/dev/null)
  LAST_FINISH=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_finished") | .created_at] | max // "none"')
  LAST_START=$(printf '%s' "$TIMELINE" | jq -r \
    '[.[] | select(.event == "copilot_work_started") | .created_at] | max // "none"')
  echo "SHEPHERD FAILED: CCA did not push fixes for PR #$PR_NUMBER within ${PHASE_C_TIMEOUT}s after re-engagement attempt."
  echo "  Review posted at: $REVIEW_SUBMITTED_AT"
  echo "  Last copilot_work_started: $LAST_START"
  echo "  Last copilot_work_finished: $LAST_FINISH"
  echo "  Re-assignment attempted: $([ "$CCA_REENGAGED" = true ] && echo 'no (organic)' || echo 'yes')"
  echo "  HEAD unchanged at: $CURRENT_SHA"
  exit 8
fi
```

After a new SHA appears and CCA's work cycle is complete, return to **Step 3**. Wait for the latest CCA work cycle to finish, re-prove the nonempty effective diff, rebuild the issue-requirement evidence table, and rerun every validation gate. A new commit invalidates all evidence collected for the previous SHA.

#### 7.5: Loop back

Return to **Step 3** and repeat. Track iteration count. If 20 iterations are exhausted without all checks passing, stop and report:

```
SHEPHERD FAILED: Exhausted 20 iterations on PR #$PR_NUMBER for task #$TASK_ISSUE.
Manual intervention required.
```
