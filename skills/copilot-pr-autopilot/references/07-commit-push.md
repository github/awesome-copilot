# Step 7: Commit and push

Owner: **parent** (no sub-agent); budget: n/a.

## Inputs

- The fix results from step 5 and the green build from step 6.

## Return contract

- Pushed `HeadOid` (the new commit SHA), recorded for step 8 reply
  bodies and step 9 convergence proof.

## Procedure

- Parent runs `git commit` + `git push` directly. One focused commit
  per round — bundling rounds destroys the audit trail of which finding
  drove which change and breaks `git bisect`.
- Include the trailer:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Record the pushed SHA so step 8 can cite it in every reply body and
  step 9 can compare it against `LatestCopilotReview.commitOid`.
