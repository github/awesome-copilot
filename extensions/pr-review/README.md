# PR Review canvas

A personal, read-only GitHub PR review canvas. Paste a direct PR link from
`github.com` or an enterprise `*.ghe.com` host. Copilot retrieves the actual PR
through the current session's authorized GitHub tools, groups related file
changes by intent, and saves the results in the canvas.

## Use

Ask Copilot to open the **PR Review** canvas. Paste a PR URL and choose **Load PR**.
The link is the only required input. Check the conversation for any GitHub
authentication or tool permission requests.

Select a group to see its rationale and files. Expand a file to inspect its
patch. Use **Ask about group**, **Ask about file**, or **Ask about hunk**, then
enter your question. Answers appear below the question form.

The canvas uses the existing conversation and its model. It does not start
another model client, require an API key, install dependencies, or transmit
source code to another AI service. Loading and asking questions use Copilot
turns and may wait behind work already running in the conversation.

## Review and source boundaries

- This extension does not submit reviews, post comments, approve PRs, or edit code.
- Group checkmarks are local review notes, not GitHub approvals.
- Snapshots include base/head commit IDs. Copilot must recheck both before
  publishing groups. Every changed file must belong to exactly one primary group.
- GitHub's file patches are excerpts, not guaranteed complete diffs. Missing
  and deliberately shortened patches must be identified explicitly. Questions
  may require additional authorized reads at the pinned commit.
- Reload the PR to retrieve new commits. Refreshing clears local group
  checkmarks; earlier answers retain their source head SHA.
- **Stop waiting** invalidates the local request. It does not cancel Copilot's
  backend work. Late results cannot overwrite a newer request.
- A provider restart marks an unfinished request as interrupted rather than
  claiming that it completed.
- Maximum snapshot size: 24 MB. Maximum changed files: 3,000. Incomplete file
  enumeration cannot be published as a complete review.

## Storage and implementation

The extension is installed in the user's Copilot extensions folder. Review
snapshots and answers are stored under `pr-review` in the current session's
workspace. Records are keyed by the canonical PR URL, not by the canvas panel.
They survive extension reloads in that session. A different session starts
with its own review records.

`extension.mjs` registers the canvas and agent actions. `review.mjs` owns
snapshot validation and persistence. `server.mjs` serves the UI on loopback.
`view.html`, `styles.css`, and `client.js` implement the responsive review UI.

The local server uses a random per-panel URL token, host validation, and
same-origin POST checks. Untrusted source and model content is displayed as
text, never injected as HTML. Credentials are neither read nor stored by this
extension; GitHub operations stay with the session's normal authorized tools.
