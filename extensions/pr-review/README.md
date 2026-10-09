# PR Review canvas

A personal, read-only GitHub PR review canvas. Paste a direct PR link from
`github.com` or an enterprise `*.ghe.com` host. The extension retrieves PR
metadata, every changed-file record, and the full unified diff directly from
GitHub. It saves complete text patches locally, then asks Copilot to group files
using their paths and change metadata.

## Use

Ask Copilot to open the **PR Review** canvas. Paste a PR URL and choose **Load PR**.
The link is the only required input. The extension uses a matching GitHub
account already available to Copilot or GitHub CLI. It does not ask for or store
credentials.

Select a group to see its rationale and files. Expand a file to inspect its
full patch, loaded on demand from the local snapshot. Use **Ask about group**,
**Ask about file**, then enter your question. Answers
appear below the question form.

Highlight text within a diff hunk, then choose **Add selected lines**. The
selected lines appear in a separate preview above the question input with
their old/new line numbers. The question input stays unchanged. The selection
is saved as line positions within the pinned diff hunk; Copilot receives the
verified selected lines and the surrounding hunk as context. Choose **Ask
Copilot** to send your question; adding lines does not send a message.

The canvas uses the existing conversation and its model. It does not start
another model client, require an API key, install dependencies, or transmit
source code to another AI service. Copilot receives file metadata for grouping
and only the selected diff context for a question. These turns may wait behind
work already running in the conversation.

## Review and source boundaries

- This extension does not submit reviews, post comments, approve PRs, or edit code.
- Group checkmarks are local review notes, not GitHub approvals.
- Snapshots include base/head commit IDs. The extension rechecks both against
  GitHub before publishing groups. Every changed file must belong to exactly
  one primary group.
- Groups use paths and file metadata, not diff contents. Group rationales must
  state uncertainty and must not claim code behavior.
- The full PR diff is downloaded directly and split into per-file patches.
  Patches are fetched from local storage when a file expands; they are not
  passed through Copilot action arguments. Files without a text patch include
  an explicit note.
- Reload the PR to retrieve new commits. Refreshing clears local group
  checkmarks; earlier answers retain their source head SHA.
- **Stop waiting** invalidates the local request. It does not cancel Copilot's
  backend work. Late results cannot overwrite a newer request.
- A provider restart marks an unfinished request as interrupted rather than
  claiming that it completed.
- Maximum diff size: 20 MB. Maximum snapshot size: 24 MB. Maximum changed files:
  3,000. Incomplete file enumeration cannot be published as a complete review.

## Storage and implementation

The extension is installed in the user's Copilot extensions folder. Review
snapshots and answers are stored under `pr-review` in the current session's
workspace. Records are keyed by the canonical PR URL, not by the canvas panel.
They survive extension reloads in that session. A different session starts
with its own review records.

`extension.mjs` registers the canvas and agent actions. `github.mjs` retrieves
the PR and full diff from the URL's GitHub host using an existing authorized
account. `review.mjs` owns snapshot validation and persistence. `server.mjs` serves the UI on loopback.
`view.html`, `styles.css`, and `client.js` implement the responsive review UI.

The local server uses a random per-panel URL token, host validation, and
same-origin POST checks. Untrusted source and model content is displayed as
text, never injected as HTML. Tokens are used only for requests to the matching
GitHub host and are not written to snapshots or logs.
