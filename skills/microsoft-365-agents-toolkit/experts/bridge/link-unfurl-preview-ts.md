# link-unfurl-preview-ts

## purpose

Bridges Slack link unfurling (link_shared, chat.unfurl) and Teams link preview (messageHandlers) for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack `app.event('link_shared')` + `chat.unfurl()` → Teams `message.ext.query-link` handler.** Slack fires a `link_shared` event and the bot calls `chat.unfurl()` asynchronously. Teams uses a compose extension handler that must return the unfurl card synchronously. The handler name in the Teams SDK is `message.ext.query-link` (or the equivalent `composeExtension/queryLink` activity). [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
2. **Manifest `composeExtensions[].messageHandlers` with domain list is required.** Unlike Slack where you register unfurl domains in the app dashboard, Teams requires them in the manifest JSON under `composeExtensions[0].messageHandlers[0].value.domains`. Only URLs matching these domains trigger unfurling. [learn.microsoft.com -- Manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensionsmessagehandlers)
3. **Teams has a 5-second synchronous response deadline.** Slack's `link_shared` event allows async unfurling — the bot receives the event, processes it, then calls `chat.unfurl()` within 30 minutes. Teams' `query-link` is an invoke that must return the preview card within ~5 seconds. If data fetching takes longer, return a minimal card and cannot update later. [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
4. **The bot must be installed in the conversation for unfurling to work.** Slack link unfurling works in any channel where the app is installed (workspace-level). Teams link unfurling only works in conversations where the bot is explicitly installed. Users may need to @mention the bot or add it to the team/chat first. [learn.microsoft.com -- Link unfurling prerequisites](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling#prerequisites)
5. **No retroactive unfurling of already-posted links.** Slack can unfurl links in messages already posted (if the app is added later). Teams only unfurls links at the time they are composed/sent. Links in existing messages are never retroactively unfurled. [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
6. **Slack unfurl supports multiple links per message; Teams handles one at a time.** Slack's `link_shared` event includes an array of `links` from the message. Teams invokes the `query-link` handler once per URL. If a message contains multiple matching URLs, the handler is called multiple times. [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
7. **Return an Adaptive Card (not Hero/Thumbnail) for rich previews.** Slack unfurls return attachment objects with `title`, `text`, `thumb_url`, `color`. Teams link unfurling should return Adaptive Cards for the richest preview. The response format wraps the card in a `composeExtension` result with `type: "result"`. [learn.microsoft.com -- Cards in extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling#response)
8. **Domain matching is exact — no wildcards for subdomains.** Slack unfurl domain matching supports wildcards. Teams manifest `messageHandlers.value.domains` requires exact domain entries. To match `foo.example.com` and `bar.example.com`, list both explicitly. [learn.microsoft.com -- Manifest domains](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
9. **Slack's unfurl `is_bot_token_only` flag → not applicable.** Slack distinguishes between user-token and bot-token unfurling. Teams link unfurling always runs as the bot identity. There is no user-token mode. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. **Cache unfurl results where possible.** Since the 5-second deadline is strict, cache API responses for frequently unfurled URLs. Slack's async model made caching less critical. In Teams, a cache miss that takes >5 seconds means the unfurl silently fails with no preview shown. [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map `messageHandlers` domain config to `link_shared` event subscription (configured in the Slack app dashboard under Unfurl Domains), and preview card responses to `chat.unfurl` calls. The key advantage in reverse is that Slack's async model (`chat.unfurl` within 30 minutes) is more forgiving than Teams' 5-second synchronous deadline. Adaptive Card preview content maps to Slack unfurl attachment objects with `title`, `text`, `thumb_url`, and `color`.

## patterns

### link_shared → query-link handler migration

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Async unfurl — no time pressure
app.event("link_shared", async ({ event, client }) => {
  const unfurls: Record<string, any> = {};

  for (const link of event.links) {
    if (link.domain === "myapp.example.com") {
      const match = link.url.match(/\/issues\/(\d+)/);
      if (match) {
        const issue = await fetchIssue(match[1]); // can take 10+ seconds
        unfurls[link.url] = {
          title: `Issue #${issue.id}: ${issue.title}`,
          text: issue.description,
          color: issue.status === "open" ? "#36a64f" : "#e01e5a",
          thumb_url: issue.assignee?.avatarUrl,
          footer: `Status: ${issue.status}`,
        };
      }
    }
  }

  if (Object.keys(unfurls).length > 0) {
    await client.chat.unfurl({
      ts: event.message_ts,
      channel: event.channel,
      unfurls,
    });
  }
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Simple in-memory cache to meet 5-second deadline
const issueCache = new Map<string, { data: any; expiry: number }>();

// Synchronous unfurl — must respond within 5 seconds
app.on("message.ext.query-link" as any, async ({ activity }) => {
  const url: string = activity.value?.url ?? "";
  const match = url.match(/\/issues\/(\d+)/);

  if (!match) {
    return { status: 200, body: {} }; // No preview for unrecognized URLs
  }

  const issueId = match[1];
  let issue: any;

  // Check cache first (critical for meeting 5-second deadline)
  const cached = issueCache.get(issueId);
  if (cached && cached.expiry > Date.now()) {
    issue = cached.data;
  } else {
    issue = await fetchIssue(issueId);
    issueCache.set(issueId, { data: issue, expiry: Date.now() + 5 * 60_000 });
  }

  const statusColor = issue.status === "open" ? "good" : "attention";

  return {
    status: 200,
    body: {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            version: "1.5",
            body: [
              {
                type: "TextBlock",
                text: `Issue #${issue.id}: ${issue.title}`,
                weight: "Bolder",
                size: "Medium",
              },
              {
                type: "TextBlock",
                text: issue.description,
                wrap: true,
                maxLines: 3,
              },
              {
                type: "ColumnSet",
                columns: [
                  {
                    type: "Column",
                    width: "auto",
                    items: [{
                      type: "TextBlock",
                      text: `Status: **${issue.status}**`,
                      color: statusColor,
                    }],
                  },
                  {
                    type: "Column",
                    width: "stretch",
                    items: [{
                      type: "TextBlock",
                      text: issue.assignee?.name ? `Assigned: ${issue.assignee.name}` : "Unassigned",
                      isSubtle: true,
                      horizontalAlignment: "Right",
                    }],
                  },
                ],
              },
            ],
            actions: [{
              type: "Action.OpenUrl",
              title: "View Issue",
              url,
            }],
          },
          preview: {
            contentType: "application/vnd.microsoft.card.thumbnail",
            content: {
              title: `Issue #${issue.id}: ${issue.title}`,
              text: `Status: ${issue.status}`,
            },
          },
        }],
      },
    },
  };
});

async function fetchIssue(id: string) {
  return { id, title: "Login broken on Safari", description: "Users report...", status: "open", assignee: { name: "Alice", avatarUrl: "" } };
}

app.start(3978);
```

### Manifest domain configuration

**Slack** — domains are configured in the Slack app dashboard under "Event Subscriptions > Unfurl Domains".

**Teams** — domains must be in the manifest JSON:

```json
{
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "messageHandlers": [
        {
          "type": "link",
          "value": {
            "domains": [
              "myapp.example.com",
              "issues.example.com"
            ]
          }
        }
      ],
      "commands": []
    }
  ]
}
```

### Unfurl mapping table

| Slack Pattern | Teams Equivalent | Notes |
|---|---|---|
| `app.event('link_shared')` | `app.on('message.ext.query-link')` | Invoke-based, not event-based |
| `chat.unfurl(ts, channel, unfurls)` | Return card from handler | Synchronous response |
| Unfurl domains in app dashboard | Manifest `messageHandlers.value.domains` | JSON config, not web UI |
| Async unfurl (up to 30 min) | Synchronous (5-second deadline) | Must respond immediately |
| Multiple links in one event | One invoke per URL | Handler called N times |
| Wildcard domain matching | Exact domain matching only | List all subdomains explicitly |
| `is_bot_token_only` flag | *(not applicable)* | Always bot identity |
| Attachment unfurl format | Adaptive Card in composeExtension result | Richer card format |

### Cache middleware best practice (Y7)

The 5-second Teams deadline makes caching non-optional. Always use a cache layer for unfurl handlers.

```typescript
// Reusable cache-first unfurl wrapper
const unfurlCache = new Map<string, { data: any; expires: number }>();

function withUnfurlCache<T>(
  fetchFn: (url: string) => Promise<T>,
  ttlMs: number = 300_000 // 5 min default
) {
  return async (url: string): Promise<T> => {
    const cached = unfurlCache.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    const data = await fetchFn(url); // must complete in <4 seconds
    unfurlCache.set(url, { data, expires: Date.now() + ttlMs });
    return data;
  };
}

// Usage
const cachedFetchIssue = withUnfurlCache(
  async (url: string) => {
    const id = url.match(/\/issues\/(\d+)/)?.[1];
    return id ? await fetchIssue(id) : null;
  },
  5 * 60_000 // 5 min TTL
);

app.on("message.ext.query-link" as any, async ({ activity }) => {
  const url: string = activity.value?.url ?? "";
  const issue = await cachedFetchIssue(url);
  if (!issue) return { status: 200, body: {} };
  return buildUnfurlResponse(issue);
});
```

**Best practices:**
- Set TTL based on data freshness needs (5–60 minutes)
- Pre-populate cache for known high-traffic URLs on startup
- Never make multiple API calls inside the unfurl handler — pre-fetch or batch
- For production, replace the `Map` with Redis or a shared cache

**Don't:** Skip caching even for "fast" data sources. Network latency + cold starts can push you past 5 seconds.

**Reverse (Teams → Slack):** Slack's 30-minute async model makes caching less critical, but still recommended for performance.

## pitfalls

- **Missing `messageHandlers` in manifest**: Without the `messageHandlers` array in `composeExtensions`, link unfurling never triggers. The bot receives no activity for matching URLs. This is the #1 deployment issue for link unfurling.
- **5-second deadline with no fallback**: If data fetching exceeds 5 seconds, the unfurl silently fails — no error card, no retry. Users see a plain URL with no preview. Implement aggressive caching and fast-path responses.
- **Bot must be installed in the conversation**: Unlike Slack where workspace-level app installation enables unfurling everywhere, Teams requires the bot to be installed in each team/chat where unfurling should work. Users may not understand why links aren't unfurling in some conversations.
- **No retroactive unfurling**: Existing messages with matching URLs are never unfurled when the bot is installed later. Only new messages trigger the handler. Slack supports unfurling existing messages.
- **Exact domain matching**: `*.example.com` is not supported. If your app has URLs across `app.example.com`, `api.example.com`, and `docs.example.com`, all three must be listed separately in the manifest. For apps with many subdomains, use a build-time manifest generator script (see Y15 pattern below).
- **Adaptive Card size limit**: Link preview cards are subject to the standard 28 KB Adaptive Card size limit. Keep previews concise — unfurl cards with embedded images or long descriptions may be silently truncated.

### Domain wildcard workaround: manifest generator (Y15)

Teams requires exact domain listing — no wildcards. For apps with many subdomains, automate manifest generation at build time.

```typescript
// scripts/generate-manifest-domains.ts
import fs from "fs";

// Source of truth: your subdomain list (from config, DNS, or API)
const BASE_DOMAIN = "example.com";
const SUBDOMAINS = ["app", "docs", "api", "staging", "portal", "admin"];

function generateManifestDomains(): string[] {
  return SUBDOMAINS.map(sub => `${sub}.${BASE_DOMAIN}`);
}

// Read the template manifest
const manifest = JSON.parse(fs.readFileSync("manifest.template.json", "utf8"));

// Inject domains into composeExtensions messageHandlers
manifest.composeExtensions[0].messageHandlers[0].value.domains = generateManifestDomains();

// Also inject into validDomains (required for link unfurling)
manifest.validDomains = [
  ...new Set([...(manifest.validDomains ?? []), ...generateManifestDomains()]),
];

fs.writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));
console.log(`Generated manifest with ${SUBDOMAINS.length} domains.`);
```

Add to your build pipeline: `ts-node scripts/generate-manifest-domains.ts` before packaging.

**Don't:** Try to register a single wildcard domain — Teams silently rejects it with no error message.

**Reverse (Teams → Slack):** Slack supports `*.example.com` wildcards natively in the app dashboard.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling
- https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensionsmessagehandlers
- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions
- https://github.com/microsoft/teams.ts
- https://api.slack.com/reference/messaging/link-unfurling — Slack link unfurling
- https://api.slack.com/methods/chat.unfurl — Slack chat.unfurl

## instructions

Use this expert when adding cross-platform support in either direction for Slack link unfurling or Teams link preview. It covers: `link_shared` event to `message.ext.query-link` handler, `chat.unfurl()` to synchronous card response, manifest `messageHandlers` domain configuration, the 5-second response deadline, installation requirement, and the lack of retroactive unfurling. For Teams → Slack, map `messageHandlers` domain config to `link_shared` event subscription, and preview card responses to `chat.unfurl` calls. Pair with `../teams/ui.message-extensions-ts.md` for general message extension patterns, `../teams/runtime.manifest-ts.md` for manifest configuration, and `ui-block-kit-adaptive-cards-ts.md` for converting between Slack attachment unfurl format and Adaptive Cards.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack link unfurling (link_shared event + chat.unfurl) and Teams link preview (compose extension query-link handler, messageHandlers) in either direction for cross-platform bots. Cover: manifest messageHandlers domain configuration, the 5-second synchronous response deadline vs Slack's async model, bot installation requirement, no retroactive unfurling, exact domain matching, Adaptive Card response format, caching strategies, per-URL invocation, and reverse-direction mapping from Teams messageHandlers to Slack link_shared subscriptions and chat.unfurl calls. Include TypeScript code examples and a mapping table."
