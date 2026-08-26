# Sentry Triage Canvas

A GitHub Copilot canvas for on-call error triage. It scans your live Sentry
issues, groups them by why they need attention, and lets you hand a selected
issue off to Copilot — either to file a tracking issue or to spin up a session
that drafts a fix pull request.

## Features

- **Live scan** of Sentry issues for an organization (optionally narrowed to a
  single project), grouped by urgency.
- **Plain-English titles** toggle that rewrites the raw Sentry error into a
  one-sentence, user-facing summary.
- **Tracking detection** so already-triaged issues (filed with the
  `sentry-triage` label) are recognized on later scans.
- **📝 Create issue** files or reuses a tracking issue only — no code, branch, or
  PR.
- **🔧 Fix with Copilot** files/reuses the tracking issue **and** spawns a
  dedicated session that drafts a fix PR.
- **Settings panel** to confirm the repository, local checkout, base branch, and
  issue tracker before anything is created.

## Files

- `extension.mjs` — canvas declaration, agent hand-off tools, and orchestration.
- `server.mjs` — loopback HTTP server that backs the canvas webview.
- `state.mjs` — per-canvas state and render coordination.
- `styles.mjs` — canvas styling.
- `sentry.mjs` / `sentryClient.mjs` — Sentry CLI (library mode) access: scan
  issues, list orgs and projects.
- `preflight.mjs` — Sentry sign-in / connection checks with the setup gate.
- `prefs.mjs` — persisted user preferences.
- `escape.mjs` — prompt/HTML escaping helpers.
- `components/` — `page.mjs`, `card.mjs`, and `category.mjs` webview components.
- `assets/preview.png` — preview image for the extensions gallery.
- `package.json` — ESM entry point and runtime dependencies.
- `copilot-extension.json` — Copilot extension name/version metadata.

## Prerequisites

- **Node.js 22 or newer.**
- The GitHub Copilot app canvas / UI-extensions experiment enabled.
- A Sentry sign-in. This canvas reads issues through the
  [Sentry CLI](https://cli.sentry.dev) in library mode — there is no MCP server
  to configure. Sign in once from your terminal:

  ```sh
  sentry auth login
  ```

  This stores an OAuth credential the canvas auto-detects. For non-interactive
  environments, export a token instead:

  ```sh
  export SENTRY_AUTH_TOKEN=<your-token>
  ```

  The login or token needs these scopes: `event:read`, `org:read`,
  `project:read`. The canvas checks for a valid sign-in each time it opens; if
  you aren't signed in it shows a setup gate with the exact reason.

## Install

Drop this folder at `~/.copilot/extensions/sentry-triage/` for user scope, or in
a repository at `.github/extensions/sentry-triage/` for project scope. Then
install dependencies from inside the copied folder (this canvas depends on the
`sentry` npm package at runtime):

```sh
# User scope
cd ~/.copilot/extensions/sentry-triage

# Or project scope, from the repository root
cd .github/extensions/sentry-triage

npm install
```

Reload extensions in the GitHub Copilot app, then open the `sentry-triage`
canvas.

## Open the canvas in the correct repository scope

Open the canvas from a Copilot session scoped to the repository where you want
issues and draft pull requests created, so it can detect the repository, local
checkout, and base branch automatically. If you opened it outside the intended
repository, open **Settings** and confirm the targets before selecting **Create
issue** or **Fix with Copilot**.

## Use the canvas

1. Open the canvas from the repository you want to work in.
2. Confirm the Sentry **organization** (auto-detected from your sign-in). If your
   account has more than one org, pick it from the dropdown. **Scan issues**
   stays disabled until an organization is set.
3. Optionally narrow to a single **project** using the autocomplete field. Leave
   it blank to scan the whole org.
4. Review the issues grouped by why they need attention. Toggle **Plain-English
   titles** to swap the raw Sentry error for a readable summary.
5. Select issues and choose an action in the toolbar — **📝 Create issue** or
   **🔧 Fix with Copilot**.

## Agent tools

The canvas exposes structured hand-off tools the agent calls instead of printing
JSON into the timeline: `submit_issue_summaries`, `submit_projects`,
`submit_tracking`, `submit_related`, and `submit_work_pr`.

## License

MIT — see [LICENSE](LICENSE).
