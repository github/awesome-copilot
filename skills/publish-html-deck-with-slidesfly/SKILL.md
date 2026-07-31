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

### 1. Resolve and inspect the artifact

Confirm the exact path, then check the basic anonymous-publish contract without rewriting the file:

```bash
test -f ./deck.html
wc -c ./deck.html
rg -n '<script[^>]+src=' ./deck.html
```

For an anonymous first publish, use one browser-ready HTML file no larger than 1 MB. A remote
`<script src=...>` is rejected; bundle required runtime code locally instead. If a check fails,
explain the problem and ask before editing the artifact.

### 2. Verify the official CLI

```bash
command -v slidesfly
slidesfly --version
```

Continue only with Slidesfly CLI `0.1.2` or newer. If it is missing or outdated, stop and direct the
user to the official technical quickstart linked below. Ask them to complete the documented install
or upgrade and return after `slidesfly --version` reports `0.1.2` or newer. Do not download or
execute a remote installer from this skill, and do not substitute an unverified npm package or a
third-party download.

### 3. Publish the exact file

Use `--json` so the result can be parsed without scraping terminal text:

```bash
slidesfly publish ./deck.html --title "Quarterly review" --json
```

Do not invent a title if the user provided one. On success, require all of the following:

- `ok` is `true`;
- `data.url` is a complete `https://slidesfly.xyz/d/...` URL;
- `data.visibility` is `unlisted` for an anonymous publish;
- `data.anonymous` is `true` when no account was used.

The CLI stores the anonymous claim credential locally. Do not expose it even if another tool or an
older CLI returns it.

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

## Optional owned-deck actions

Run these only when the user asks for account ownership or an in-place update:

```bash
slidesfly login --json
slidesfly publish ./deck-v2.html --id YOUR_DECK_ID --json
slidesfly versions YOUR_DECK_ID --json
```

Login may open a browser and create a credential, so keep it user-visible. An update must target the
user-provided or previously verified deck ID; never choose a deck by title alone.

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
