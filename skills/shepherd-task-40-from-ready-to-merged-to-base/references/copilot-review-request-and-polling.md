# Stage 40 Copilot review request and polling procedure

### Step 1: Mark the PR as Ready for Review and request Copilot review

Before changing PR state, verify that the installed GitHub CLI supports the
special Copilot reviewer token. This is a local capability preflight and must
complete before `gh pr ready`:

```bash
if GH_PR_EDIT_HELP=$(gh pr edit --help 2>&1); then
  GH_PR_EDIT_HELP_STATUS=0
else
  GH_PR_EDIT_HELP_STATUS=$?
fi
if [ "$GH_PR_EDIT_HELP_STATUS" -ne 0 ]; then
  echo "SHEPHERD FAILED: could not inspect gh pr edit capabilities; gh exited $GH_PR_EDIT_HELP_STATUS."
  echo "gh path: $(command -v gh || printf '%s' '<not found>')"
  gh --version 2>&1 || true
  exit 1
fi
case "$GH_PR_EDIT_HELP" in
*'@copilot'*)
  ;;
*)
  echo "SHEPHERD FAILED: installed gh does not support the @copilot reviewer token."
  echo "gh path: $(command -v gh || printf '%s' '<not found>')"
  gh --version 2>&1 || true
  exit 1
  ;;
esac
```

On PowerShell, perform the equivalent check with:

```powershell
$helpOutput = @(gh pr edit --help 2>&1)
$ghExitCode = $LASTEXITCODE
if ($ghExitCode -ne 0) {
    throw "SHEPHERD FAILED: could not inspect gh pr edit capabilities; gh exited $ghExitCode."
}

$supportsCopilotReviewer = [bool](
    $helpOutput | Select-String -SimpleMatch '@copilot'
)
if (-not $supportsCopilotReviewer) {
    throw 'SHEPHERD FAILED: installed gh does not support the @copilot reviewer token.'
}
```

Record whether this invocation transitions the PR from draft to ready:

```bash
PR_WAS_DRAFT=$(gh pr view "$PR_NUMBER" -R "$REPO" --json isDraft --jq '.isDraft')
READY_TRANSITIONED=false
if [ "$PR_WAS_DRAFT" = true ]; then
  gh pr ready "$PR_NUMBER" -R "$REPO"
  READY_TRANSITIONED=true
fi
```

```bash
# If the PR was already ready, preserve that state.
gh pr view "$PR_NUMBER" -R "$REPO" --json isDraft
```

**Important:** Copilot code review is NOT automatically triggered when a PR is taken out of draft state. You must explicitly request it.

Before requesting review, capture the PR head and the latest completed Copilot review. These values identify the review round and prevent a previous review from satisfying a later poll:

```bash
REVIEW_TARGET_HEAD=$(gh pr view "$PR_NUMBER" -R "$REPO" --json headRefOid --jq '.headRefOid')
PREVIOUS_COPILOT_REVIEW_ID=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" \
  --jq '[.[]
    | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
    | .id
  ] | max // 0')
```

Request reviewer `@copilot` with `gh pr edit`. The leading `@` is mandatory:
`Copilot` is treated as an ordinary username and can fail with
`Could not resolve user with login 'copilot'`. Do not treat a nonzero
`gh pr edit` exit as proof that the mutation failed; verify positive API state.

For up to three attempts, record the request time, request reviewer `@copilot`, and poll for up to two minutes for at least one positive acknowledgement:

- a new `review_requested` timeline event for a Copilot reviewer identity at or after the recorded request time;
- a Copilot reviewer identity in `gh pr view --json reviewRequests`; or
- a new Copilot review whose `commit_id` is `REVIEW_TARGET_HEAD` and whose ID is greater than `PREVIOUS_COPILOT_REVIEW_ID`.

Accept `Copilot`, `copilot-pull-request-reviewer`, and
`copilot-pull-request-reviewer[bot]` case-insensitively as observable Copilot
reviewer identities.

```bash
REVIEW_REQUEST_ACKNOWLEDGED=false

for ATTEMPT in 1 2 3; do
  REQUESTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  set +e
  EDIT_OUTPUT=$(gh pr edit "$PR_NUMBER" -R "$REPO" --add-reviewer "@copilot" 2>&1)
  EDIT_STATUS=$?
  set -e
  DETERMINISTIC_REQUEST_ERROR=false

  if printf '%s' "$EDIT_OUTPUT" |
      grep -Eqi "Could not resolve user with login|@copilot.*not supported|Copilot.*not available"; then
    DETERMINISTIC_REQUEST_ERROR=true
  fi

  if [ "$EDIT_STATUS" -ne 0 ]; then
    printf '%s\n' "$EDIT_OUTPUT"
    echo "gh pr edit exited $EDIT_STATUS; verifying whether the review request was accepted"
  fi

  ACK_ELAPSED=0
  while [ "$ACK_ELAPSED" -lt 120 ]; do
    REQUEST_EVENT=$(gh api "/repos/$REPO/issues/$PR_NUMBER/timeline?per_page=100" \
      -H 'Accept: application/vnd.github+json' 2>/dev/null \
      | jq --arg requested_at "$REQUESTED_AT" '[.[]
          | select(.event == "review_requested")
          | select((.requested_reviewer.login // "")
              | test("^(Copilot|copilot-pull-request-reviewer(\\[bot\\])?)$"; "i"))
          | select(.created_at >= $requested_at)
        ] | length')

    REQUEST_STATE=$(gh pr view "$PR_NUMBER" -R "$REPO" --json reviewRequests \
      --jq '[.reviewRequests[]
        | select((.login // "")
            | test("^(Copilot|copilot-pull-request-reviewer(\\[bot\\])?)$"; "i"))
      ] | length' 2>/dev/null)

    COMPLETED_REVIEW=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" 2>/dev/null \
      | jq --arg head "$REVIEW_TARGET_HEAD" --argjson previous "$PREVIOUS_COPILOT_REVIEW_ID" '[.[]
          | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
          | select(.commit_id == $head)
          | select(.id > $previous)
        ] | length')

    if [ "${REQUEST_EVENT:-0}" -gt 0 ] || [ "${REQUEST_STATE:-0}" -gt 0 ] || [ "${COMPLETED_REVIEW:-0}" -gt 0 ]; then
      REVIEW_REQUEST_ACKNOWLEDGED=true
      break 2
    fi

    [ "$DETERMINISTIC_REQUEST_ERROR" = true ] && break
    sleep 10
    ACK_ELAPSED=$((ACK_ELAPSED + 10))
  done

  [ "$DETERMINISTIC_REQUEST_ERROR" = true ] && break
  [ "$ATTEMPT" -lt 3 ] && sleep 10
done

if [ "$REVIEW_REQUEST_ACKNOWLEDGED" != true ]; then
  if [ "$READY_TRANSITIONED" = true ]; then
    if gh pr ready "$PR_NUMBER" -R "$REPO" --undo; then
      echo "Restored PR #$PR_NUMBER to draft after the unacknowledged review request."
    else
      echo "SHEPHERD WARNING: could not restore PR #$PR_NUMBER to draft."
    fi
  fi
  echo "SHEPHERD FAILED: Copilot review request was not acknowledged for PR #$PR_NUMBER at $REVIEW_TARGET_HEAD."
  echo "The task is resumable; do not repeat completed fixes."
  exit 1
fi
```

Do not begin the review-completion timeout until the request is positively acknowledged. Do not repeat a deterministic capability or reviewer-resolution error. If attempts remain unacknowledged, report `SHEPHERD FAILED: Copilot review request was not acknowledged`, include the PR number and target head, restore draft state only when this invocation made the ready transition and no review was acknowledged, and stop in a resumable state.

### Step 2: Wait for Copilot code review agent to complete

Wait for a new review from the Copilot code review agent for `REVIEW_TARGET_HEAD`. Review body text is presentation and may change; do not use headings such as `Copilot's findings`, `Pull request overview`, or `Not ready to approve` as completion signals.

Set `COPILOT_REVIEW_TIMEOUT_SECONDS` to override the default 30-minute completion timeout. The request-acknowledgement check in Step 1 is separate and must already have succeeded.

**⚠️ Keep the polling command active. Use the largest supported `initial_wait`, and if the tool returns while the command is still running, immediately read the same shell again.**

```bash
TIMEOUT=${COPILOT_REVIEW_TIMEOUT_SECONDS:-1800}
INTERVAL=30
ELAPSED=0
COPILOT_REVIEW=''

while [ $ELAPSED -lt $TIMEOUT ]; do
  COPILOT_REVIEW=$(gh api "/repos/$REPO/pulls/$PR_NUMBER/reviews" 2>/dev/null \
    | jq --arg head "$REVIEW_TARGET_HEAD" --argjson previous "$PREVIOUS_COPILOT_REVIEW_ID" '
      [.[]
        | select((.user.login // "") | test("^copilot-pull-request-reviewer(\\[bot\\])?$"; "i"))
        | select(.commit_id == $head)
        | select(.id > $previous)
      ] | last // empty')

  if [ -n "$COPILOT_REVIEW" ]; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ -z "$COPILOT_REVIEW" ]; then
  echo "SHEPHERD FAILED: Copilot review did not complete within ${TIMEOUT}s for PR #$PR_NUMBER at $REVIEW_TARGET_HEAD."
  echo "The acknowledged review request is resumable; do not repeat completed fixes."
  exit 1
fi

COPILOT_REVIEW_ID=$(printf '%s' "$COPILOT_REVIEW" | jq -r '.id')
```

#### 2.1: Stop if Copilot refused review because the PR has too many files

Before interpreting the review as findings or treating a zero-comment review as success, check the current review for the specific too-many-files refusal. Require both stable phrases so unrelated review text cannot trigger this gate:

```bash
TOO_MANY_FILES_REVIEW=$(printf '%s' "$COPILOT_REVIEW" | jq '
  select((.body // "") | test("was" + "n\u0027t able to review"; "i"))
  | select((.body // "") | test("maximum number of files"; "i"))')

if [ -n "$TOO_MANY_FILES_REVIEW" ]; then
  echo "SHEPHERD FAILED: Copilot could not review PR #$PR_NUMBER because it exceeds the maximum number of files."
  echo "The PR must not be merged. Reduce or split the PR, then request a new Copilot review."
  echo "Manual intervention required."
  exit 1
fi
```

Do not attempt to reduce or split the PR automatically. This gate handles only this specific refusal and does not change the treatment of any other Copilot review outcome.

Use `COPILOT_REVIEW_ID` to identify this batch of review findings (`jtbdtask-pr-comments`).

If there are no top-level line comments associated with `COPILOT_REVIEW_ID`, skip to **Step 15**.

When `jtbdtask-pr-comments` has been identified, proceed.
