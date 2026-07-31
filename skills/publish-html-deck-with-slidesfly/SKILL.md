---
name: publish-html-deck-with-slidesfly
description: 'Publish a completed local HTML presentation with Slidesfly and return a verified reader URL. Use only when an HTML deck already exists and the user explicitly asks to put that exact deck online or update an existing Slidesfly deck.'
license: MIT
---

# Publish a finished HTML deck with Slidesfly

Use this skill for the publishing step after a presentation has already been generated. It uploads
the exact local HTML artifact to Slidesfly, verifies the returned reader URL, and reports the
visibility and local-ownership boundary.

> **Affiliation disclosure:** This workflow was contributed by a Slidesfly maintainer. Slidesfly is
> a hosted service with free and paid usage. The instructions below are intentionally limited to
> the technical publishing workflow.

## When to use this skill

Use it only when both conditions are true:

1. A browser-ready `.html` or `.htm` presentation already exists on disk.
2. The user explicitly asks to publish, share, put online, or update that presentation with
   Slidesfly.

Do not use it to generate or redesign slides. Do not upload a general website, application build,
PDF, or PowerPoint file. If the user wants repository-backed static hosting or a general website,
use the existing `publish-to-pages` skill instead.

## Safety rules

- Treat publishing as an external write. A request to explain the process is not authorization to
  upload.
- Publish only the file the user identified. If several HTML files are plausible, ask which one.
- Do not upload credentials, secrets, regulated data, or content the user is not authorized to
  host. Stop if the artifact's sensitivity is unclear.
- Never print or paste `~/.slidesfly/config.json`, an API key, or an anonymous claim token.
- Do not change the deck's visibility, claim it, update an existing deck, or install software unless
  the user requested or approved that action.
- Anonymous publishing is unlisted, not private. Anyone with the reader URL can open it.

## Workflow

### 1. Resolve the bundled runner and local state

Resolve the directory containing this `SKILL.md` as `SKILL_DIR`. Require the bundled runner and
verify its pinned version before any write:

```bash
test -f "$SKILL_DIR/scripts/slidesfly.mjs"
node "$SKILL_DIR/scripts/slidesfly.mjs" --version
node "$SKILL_DIR/scripts/slidesfly.mjs" status --json
```

Continue only with runner `0.1.3` and SHA-256
`cd94667fc714e998d87fd47e1ad94bd4d44e23a0b0f0fb70671df1a22365b699`. It is the complete,
dependency-free Slidesfly CLI bundle, not a separate API implementation. It shares the same
commands, JSON envelope, auth flows, idempotency behavior, error codes, and
`~/.slidesfly/config.json` with the official PATH CLI. Do not download a replacement or install a
package during this workflow.

The `status` result reports whether an API key is already configured without printing the key. Tell
the user whether the requested publish will be anonymous or account-owned before uploading.

### 2. Resolve and inspect the artifact

Confirm the exact path, then run the bundled, local-only preflight without rewriting the file. Use
`anonymous` when `status.data.has_api_key` is false and `owned` when it is true:

```bash
node "$SKILL_DIR/scripts/preflight.mjs" ./deck.html --mode anonymous
# or, for an already authenticated account:
node "$SKILL_DIR/scripts/preflight.mjs" ./deck.html --mode owned
```

Require `ok: true` before continuing. The receipt records the exact byte size, SHA-256, detected
script sources, mode, and applicable anonymous limit. Owned mode deliberately does not guess the
account plan's size limit; the service remains authoritative. The script performs no network
requests and cannot upload or modify the deck. If a check fails, explain the structured error and
ask before editing the artifact.

### 3. Publish the exact file with the bundled runner

After the user has explicitly authorized the upload, use the same local runner. Do not invent a
title or visibility. Add `--visibility` only for an authenticated publish when the user requested
that value.

```bash
node "$SKILL_DIR/scripts/slidesfly.mjs" publish ./deck.html --title "Quarterly review" --json
```

Do not invent a title if the user did not provide one. On success, require all of the following:

- `ok` is `true`;
- `data.url` is a complete `https://slidesfly.xyz/d/...` URL;
- `data.visibility` is `unlisted` for an anonymous publish;
- `data.anonymous` matches the status observed before upload.

The runner saves an anonymous claim credential locally before returning success and strips it from
stdout. Never read or print the config to prove it.

### 4. Verify before sharing

Open the exact returned URL in a browser when browser control is available. Confirm that the deck
renders and that at least one next/previous navigation action works. Otherwise, perform a minimum
HTTP check against the returned URL and state that visual/navigation verification remains pending.

Do not construct or guess the reader URL from a deck ID.

### 5. Report the result

Return:

1. the complete reader URL;
2. the observed visibility;
3. whether visual/navigation verification passed or only HTTP reachability was checked;
4. for an anonymous deck, this warning: ownership is currently tied to the local Slidesfly config,
   so the user should claim it before changing machines.

## Optional management actions

The bundled runner exposes the full CLI command surface. Run any of these only when the user asks
for that state change:

```bash
node "$SKILL_DIR/scripts/slidesfly.mjs" login --json
node "$SKILL_DIR/scripts/slidesfly.mjs" claim --json
node "$SKILL_DIR/scripts/slidesfly.mjs" publish ./deck-v2.html --id YOUR_DECK_ID --json
node "$SKILL_DIR/scripts/slidesfly.mjs" list --json
node "$SKILL_DIR/scripts/slidesfly.mjs" versions YOUR_DECK_ID --json
node "$SKILL_DIR/scripts/slidesfly.mjs" restore YOUR_DECK_ID 2 --json
node "$SKILL_DIR/scripts/slidesfly.mjs" visibility YOUR_DECK_ID public --json
node "$SKILL_DIR/scripts/slidesfly.mjs" expire YOUR_DECK_ID 7d --json
node "$SKILL_DIR/scripts/slidesfly.mjs" password YOUR_DECK_ID "user-provided-value" --json
node "$SKILL_DIR/scripts/slidesfly.mjs" allowlist YOUR_DECK_ID user@example.com --json
node "$SKILL_DIR/scripts/slidesfly.mjs" delete YOUR_DECK_ID --json
node "$SKILL_DIR/scripts/slidesfly.mjs" logout --json
```

Login may open a browser and create a credential, so keep it user-visible. Passwords and allowlist
addresses are sensitive inputs; never invent or echo them. An update, restore, protection change,
or deletion must target the user-provided or previously verified deck ID; never choose a deck by
title alone. `install` and `uninstall` are also present for CLI parity but are outside this
repository-installed Skill workflow unless the user explicitly requests distribution changes.

## Failure handling

| Error | Action |
|---|---|
| `FILE_NOT_FOUND` | Resolve the actual path; do not guess. |
| `INVALID_HTML` | Explain the validation failure; edit only with approval. |
| `MALICIOUS_CONTENT` | Stop. Explain the rejected construct; do not weaken the scan or auto-retry. |
| `QUOTA_EXCEEDED` | Stop and report the returned limit. |
| `RATE_LIMITED` | Wait about 60 seconds and retry once at most. |
| `AUTH_REQUIRED` / `AUTH_INVALID` | Ask the user to authenticate; do not search for credentials. |
| Network or server error | Retry once, then report the failure and preserve the local artifact. |

## Necessary references

- [Slidesfly technical quickstart](https://slidesfly.com/docs/quickstart)
- [Slidesfly security boundaries](https://slidesfly.com/security)
- [Public integration and Skill source](https://github.com/rare/slidesfly-integrations/tree/main/skills/slidesfly)
- [Bundled-runner source update](https://github.com/rare/slidesfly/pull/125)
- [Public bundled-runner mirror update](https://github.com/rare/slidesfly-integrations/pull/16)
