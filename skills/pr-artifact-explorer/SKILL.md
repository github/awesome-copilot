---
name: pr-artifact-explorer
description: 'Open, share, and inspect GitHub PRs, issues, Actions artifacts, and local or HTTP(S) web previews in the Artifact Explorer canvas, with viewport presets, zoom, screenshots, and recoverable download jobs.'
---

# Artifact Explorer

Use the `pr-artifact-explorer` canvas to show a user pull requests, issues, Actions artifacts, and web pages.

## How to drive the canvas

The action names below (`open_target`, `share`, ...) are **canvas actions, not standalone tools**. Always:

1. Call `list_canvas_capabilities { canvasId: "pr-artifact-explorer" }` to discover the actions and their schemas.
2. Call `open_canvas { canvasId: "pr-artifact-explorer", instanceId: "<handle you choose>" }` to open or focus the panel.
3. Call `invoke_canvas_action { instanceId, actionName, input }` with that same `instanceId`.

## Open a target

`invoke_canvas_action` with `open_target { input }` (or the open input `repository`, `pullNumber`, `artifactId`, `url`, `route`, plus `preset`/`width`/`height`/`zoom`). `input` accepts:

- GitHub PR/issue URLs or `owner/repo#123`; issues display details only, artifacts are PR-specific
- real artifact permalinks (`https://github.com/<owner>/<repo>/actions/runs/<run>/artifacts/<id>`), an artifact ID with a repository, or a shared explorer link/route such as `#/docs`, `#/artifact/owner%2Frepo/0/456?file=index.html`, `#/browser?v=...`
- `http(s)://` and `localhost` URLs (browser preview)
- bounded natural language: `open PR 123 in owner/repo`, `show localhost:3000 on mobile`, `go back`, `zoom 150%`, `tablet`, `1280x720`, `screenshot`

Use `share { input, preset?, zoom?, width?, height? }` to produce a link, route, and text to give the user. Artifact shares keep repository/artifact/file identity (not preview ports); the recipient pastes it into the canvas or into `open_target`.

## Artifacts

`inspect_artifact { repository, artifactId }` starts a background job. Downloads continue past soft limits; when one is reached the user is prompted for a larger value (`set_limit { kind, value }`; the value must be at least the live progress). Check `job_status`; use `retry_job` after an `interrupted` or `failed` job (a completed ZIP is reused) and `cancel_job` only when asked. Never execute artifact programs or build scripts: artifacts are only inspected or previewed as static sites and files.

Re-running the workflow that produced an artifact is a UI-only, user-confirmed action (the Re-run button on an artifact row). Never attempt it yourself or call its API; if the user wants a fresh artifact, tell them to use that button. It reuses the original commit, ref and actor, is limited to 30 days and 50 re-runs, and only requests a run, not a ready artifact.

## Browser preview

- `navigate_browser { url, preset?, zoom? }` opens an http(s) URL, including localhost.
- `set_viewport { preset: native | mobile | tablet | desktop | custom, width?, height?, orientation? }` sets the emulated page size.
- `set_zoom { zoom, fit? }` scales the view without changing the viewport.
- `screenshot { mode?: "fresh" | "controlled", url?, preset?, width?, height?, fullPage? }` takes a real Chromium PNG saved under the session `files/artifact-explorer-screenshots` folder. `fresh` (default) renders the URL anew and is labeled `fresh-render`; `controlled` captures the live isolated Chromium page (`controlled-current`).
- `controlled_navigate { url, preset?, ... }`, `controlled_back`, `controlled_forward`, `controlled_refresh`, `controlled_close` drive an isolated Chromium (in-memory profile, no login state) with real history; use it for sites that block iframes. Navigation failures are returned as errors, never as blank pages. If Playwright or Chromium is missing, relay the returned setup instructions to the user (including a `playwright_config_unsupported` error for the retired `PR_ARTIFACT_EXPLORER_PLAYWRIGHT` variable); never install silently.
- Pages that forbid framing (X-Frame-Options / CSP) are reported and not bypassed.

## Previewing files

- A contextual **Browser view** action appears in the preview toolbar only for static-site HTML artifacts; it is not a global nav item. Open URLs directly with `open_target` / `navigate_browser` or a `#/browser?v=...` route.
- `.webm`, `.mp4` and `.mov` use native `<video controls>` with range seeking (the whole entry is CRC/size verified once, then reused). Codec support is browser-dependent (WebM VP8/VP9 is most reliable; H.264 MP4/MOV may not play), so a failure shows an explanation and a download fallback.
- A compact **Preview / Raw** toggle sits beside Download for every file (`&view=raw` in routes). Raw shows exact source for text and a bounded, labelled-partial hex+ASCII view for binary; unsafe/encrypted entries explain why and keep the ZIP download.
- Browser chrome and owned artifact HTML follow the inherited canvas theme (initial and live changes); controlled Chromium and captures follow the current color scheme. External sites keep their own theme.
- **Open in default browser** (Sharing and help menu) launches the current http(s) target in the OS browser. Owned artifact sites are served by this canvas's loopback server and stop when it closes.
- JUnit XML (`testsuites`/`testsuite` roots) renders a native report with totals, status filters, search and failure/error/skipped/stdout/stderr details; the XML source and download stay available. Malformed reports fall back to source with an error; other XML uses the generic viewer.

## Recovery

If the canvas misbehaves, call `restart_canvas`: it keeps the port, token, and running jobs. Use `docs` to open the built-in Docs tab, which also lists keyboard shortcuts (press `?`).
