# Files & Links

## File Upload

| Aspect | Slack | Teams |
|---|---|---|
| Upload API | `files.uploadV2()` — single call | FileConsentCard → user consent → Graph API upload (3-step flow) |
| Large files | Handled automatically | Graph resumable upload sessions for >4 MB |
| Sharing links | `files.sharedPublicURL()` | Graph `createLink()` |
| File events | `file_shared` event | Check `activity.attachments` in message handler |
| Download | `files.info()` → `url_private` with Bearer token | `attachment.content.downloadUrl` (pre-authenticated, short-lived) |
| Manifest config | None | `supportsFiles: true` required |
| Context | Works in channels and DMs | FileConsentCard works in personal chat only; channels use direct Graph upload |

**Rating:** YELLOW (Slack → Teams), GREEN (Teams → Slack).

### Impact

Slack's one-call `files.uploadV2()` becomes a 3-step flow in Teams: send consent card → user approves → upload via Graph API. Missing the `supportsFiles: true` manifest flag causes silent failure.

### Mitigation Strategies (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **`sendFile()` helper (Recommended)** | Unified wrapper: auto-detects personal/channel context, routes to OneDrive or SharePoint, handles >4 MB chunking. The manual flow is error-prone. | 24–40 hrs |
| **Manual FileConsentCard** | Implement the 3-step consent flow directly. Works but verbose and easy to get wrong. | 16–24 hrs per upload pattern |

### Reverse Direction (Teams → Slack)

Use `files.uploadV2()` directly — much simpler than the Teams consent flow. No consent step needed.

### File Download

| Aspect | Slack | Teams |
|---|---|---|
| URL lifetime | Permanent (with valid token) | Pre-authenticated URL expires quickly |
| Auth required | Bearer token in request | URL is pre-authenticated |

**Mitigation:** For Teams downloads, use the URL immediately or cache the file. Don't store the download URL for later use.

---

## Link Unfurling / Previews

| Aspect | Slack | Teams |
|---|---|---|
| Event | `link_shared` event (async) | `message.ext.query-link` handler (synchronous) |
| Response deadline | 30 minutes (via `chat.unfurl()`) | **5 seconds** |
| Domain matching | Wildcards supported (`*.example.com`) | **Exact domain only** — must enumerate every subdomain |
| Manifest config | Event subscription in app settings | `composeExtensions[].messageHandlers[].value.domains` |
| Retroactive unfurling | Unfurls links in existing messages | **New messages only** |
| Response format | Attachment with Block Kit | Adaptive Card via `composeExtension` result |

**Rating:** YELLOW for basic unfurling, RED for retroactive unfurling and wildcard domains.

### Impact

The 5-second deadline is the critical difference. Slack allows async unfurling up to 30 minutes later. Teams requires a synchronous response within 5 seconds — any slow data source (API call, database query, rendering) will silently fail.

### Mitigation Strategies (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Cache-first with prefetch (Recommended)** | Cache middleware wraps the handler. Pre-populate cache for known URLs. Without this, slow unfurls silently die. | 12–16 hrs |
| **Synchronous handler only** | Direct handler, must return within 5 seconds. Only viable for fast data sources (in-memory, pre-cached). | 4–8 hrs |

### Wildcard Domains (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **Manual enumeration (Recommended)** | List every subdomain in manifest `domains` array. Fine for <10 subdomains. | 1–2 hrs |
| **Manifest generator script** | Script reads subdomains from config and generates the manifest array. Worth it for 10+ subdomains. | 4–8 hrs |

### Reverse Direction (Teams → Slack)

Use `link_shared` event with `chat.unfurl()`. Slack supports wildcards and async responses — both are easier than the Teams model.

### Retroactive Unfurling

| Direction | Behavior |
|---|---|
| Slack → Teams | **Platform gap.** Teams only unfurls links in new messages. No workaround exists. Consider a bot command where users paste a URL to get a preview card. |
| Teams → Slack | Slack unfurls links retroactively by default. No issue. |

**Rating:** RED — no mitigation. Accept the limitation.
