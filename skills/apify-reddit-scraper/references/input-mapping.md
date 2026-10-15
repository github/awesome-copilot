# Input mapping — apify-reddit-scraper

User phrasing → `harshmaur/reddit-scraper` input. Field names are exact; unknown ones are ignored, and when nothing valid remains the run finishes SUCCEEDED with 0 items (`emptyReason` in `RUN-SUMMARY`, nothing charged) rather than failing.

## Targets (at least one)

| User intent | Input |
|---|---|
| Search Reddit for a keyword or brand | `"searchTerms": ["<term>"]` |
| Several keywords | `"searchTerms": ["a", "b", "c"]` (one search each; free plans: first 40) |
| Search only inside one subreddit | `"searchTerms": [...], "withinCommunity": "r/<name>"` |
| Scrape a subreddit in bulk | `"subredditUrls": ["<name>"]` or `["https://www.reddit.com/r/<name>/"]` |
| Scrape one or more post threads | `"startUrls": [{"url": "https://www.reddit.com/r/<sub>/comments/<id>/..."}]` |
| Scrape a user's posts and comments | `"startUrls": [{"url": "https://www.reddit.com/user/<name>/"}]` |
| Scrape a subreddit listing with a specific sort | `"startUrls": [{"url": "https://www.reddit.com/r/<name>/top/?t=week"}]` |
| Scrape a `/s/` share link | `"startUrls": [{"url": "https://www.reddit.com/r/<sub>/s/<token>"}]` (the Actor resolves it to the post or profile) |
| Scrape a Reddit search-results page the user already has | `"startUrls": [{"url": "https://www.reddit.com/search/?q=..."}]` |

## What to return

| User intent | Input |
|---|---|
| Posts only (default) | `"searchPosts": true, "searchComments": false, "searchCommunities": false` |
| Comments that mention the term | `"searchComments": true, "searchPosts": false, "maxCommentsCount": 400` |
| Communities about a topic | `"searchCommunities": true, "maxCommunitiesCount": 20` |
| Posts **and** their comment threads | `"crawlCommentsPerPost": true, "maxCommentsPerPost": 50` |
| Only posts with a flair | `"onlyWithFlair": true` |
| Include adult content | `"includeNSFW": true` |

## Ranking and time

| User intent | Input |
|---|---|
| Newest first (monitoring) | `"searchSort": "new"` |
| Best keyword match | `"searchSort": "relevance"` |
| Highest scoring | `"searchSort": "top"` |
| Currently active | `"searchSort": "hot"` |
| Most discussed | `"searchSort": "comments"` |
| Reddit's relative window | `"searchTime": "hour" | "day" | "week" | "month" | "year" | "all"` |
| Explicit date window (posts) | `"postedAfter": "2026-08-01", "postedBefore": "2026-08-31"` |
| Explicit date window (comments) | `"commentedAfter": "2026-08-01", "commentedBefore": "2026-08-31"` |

`searchSort`, `searchTime` and `withinCommunity` apply to `searchTerms` only, never to `startUrls`. Once `postedAfter` or `postedBefore` is set, `searchSort` and `searchTime` are ignored and the run collects newest-first.

## Limits

| Field | Default | Meaning |
|---|---|---|
| `maxPostsCount` | 50 | Posts **per search term** (and per subreddit or profile URL) — 4 terms × 8 returned 32 posts. The schema title says "total across all inputs"; measured runs and the README say per term. Max 50,000; Reddit itself stops near 1,000 per listing |
| `maxCommentsCount` | 400 | Comments per keyword when `searchComments` is on |
| `maxCommentsPerPost` | 200 | Comments per post when `crawlCommentsPerPost` is on. A very large thread returns about 600–3,000 comments, even when this is higher |
| `maxCommunitiesCount` | 2 | Communities per keyword when `searchCommunities` is on |

## AI enrichment (billed per row on top of results — see gotchas; the "free plans ignore it" note in the schema did not hold in a measured run)

| User intent | Input |
|---|---|
| Sentiment / intent labels on every row | `"aiAnalysis": true` → adds `sentimentLabel` and related fields |
| Custom yes/no labels | `"customLabels": {"is_buying_intent": "The author is looking to buy or switch tools"}` |

## Delivery (MCP connectors)

| User intent | Input |
|---|---|
| Post each hit to Slack | `"mcpConnector": "<connectorId>", "mcpTarget": "<channelId>", "mcpMode": "perPost"` |
| One digest to Notion | `"mcpConnector": "<connectorId>", "mcpTarget": "<databaseId>", "mcpMode": "summary"` |
| Include top comments in each message | `"mcpComments": "bundle", "mcpCommentsPerPost": 5` (needs `crawlCommentsPerPost`) |
| Custom message shape | `"mcpMessage": "**{{title}}** in {{communityName}}\n{{postUrl}}"` |

## Worked examples

Brand monitoring, last 30 days, with comments, to Slack:

```json
{
  "searchTerms": ["Notion", "notion.so"],
  "searchSort": "new",
  "postedAfter": "2026-08-10",
  "maxPostsCount": 200,
  "crawlCommentsPerPost": true,
  "maxCommentsPerPost": 20,
  "mcpConnector": "<connectorId>",
  "mcpTarget": "<slackChannelId>",
  "mcpMessage": "**{{title}}** in {{communityName}} ({{score}}↑)\n{{postUrl}}"
}
```

Lead generation inside one community:

```json
{
  "searchTerms": ["CRM recommendation", "switching from HubSpot", "best CRM for"],
  "withinCommunity": "r/smallbusiness",
  "searchSort": "new",
  "searchTime": "month",
  "maxPostsCount": 150
}
```

Full thread:

```json
{
  "startUrls": [{ "url": "https://www.reddit.com/r/webdev/comments/abc123/example/" }],
  "crawlCommentsPerPost": true,
  "maxCommentsPerPost": 1000
}
```

Whole subreddit, newest first, posts only:

```json
{
  "subredditUrls": ["r/SaaS", "r/startups"],
  "maxPostsCount": 1000,
  "postedAfter": "2026-08-01"
}
```
