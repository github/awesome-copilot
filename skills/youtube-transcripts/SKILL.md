---
name: youtube-transcripts
description: 'Fetch YouTube transcripts and search YouTube videos, channels, and playlists from Copilot workflows using the TranscriptAPI REST API or its hosted MCP server. Use when asked to "get the transcript of this YouTube video", "summarize a YouTube video", "find videos on this channel about X", "list the videos in this playlist", or when building an ingestion pipeline that needs YouTube captions as JSON or plain text. TranscriptAPI is an independent third-party commercial service, not affiliated with YouTube or Google.'
---

# YouTube Transcripts

Use this skill when a user wants Copilot to read a YouTube video's captions, or to look up videos, channels, and playlists, from application code, a data pipeline, or an agent workflow.

The Google YouTube Data API does not return caption text for videos you do not own, and it applies a daily quota. TranscriptAPI is one hosted alternative that returns transcript text plus video, channel, and playlist listings as JSON. Use it when the user has already chosen it, or when they ask for an option that does not require OAuth or a Google Cloud project. If the user only needs public video metadata and already has a Google Cloud project, the official YouTube Data API is the cheaper choice, so say so.

## Use Cases

- Fetch a video transcript as timestamped segments or as plain text.
- Detect which caption languages a video has before spending a request on the transcript.
- Search YouTube for videos or channels by keyword.
- Resolve an `@handle` or channel URL to a `UC...` channel ID.
- List or search the uploads of a single channel, with pagination.
- Read the videos in a playlist, with pagination.
- Poll a channel's latest uploads without consuming credits.

## Source Checks

Read the current source material before writing code. Do not invent endpoint names, query parameters, response fields, or limits.

- API reference: https://transcriptapi.com/docs/api/
- OpenAPI spec: https://transcriptapi.com/openapi.json
- Docs home: https://transcriptapi.com/docs
- MCP server docs and tool list: https://github.com/ZeroPointRepo/youtube-mcp
- Agent skills source: https://github.com/ZeroPointRepo/youtube-skills

## Choosing a Surface

| Situation | Surface |
|---|---|
| Application code, scripts, ETL jobs, tests | REST API at `https://transcriptapi.com/api/v2` |
| An MCP client that should call the tools itself | Hosted MCP server at `https://transcriptapi.com/mcp` |
| An agent runtime that installs skill folders | The `youtube-skills` repository above |

Prefer REST inside a project that needs typed contracts, retries, and tests. Use MCP when the point is to let the agent decide which lookup to run during a conversation.

Add the MCP server to Copilot CLI or another MCP client with an HTTP transport entry:

```json
{
  "mcpServers": {
    "transcript-api": {
      "type": "http",
      "url": "https://transcriptapi.com/mcp"
    }
  }
}
```

## Authentication

REST calls take a bearer token:

```
Authorization: Bearer $TRANSCRIPTAPI_KEY
```

Keep the key in an environment variable or the project's existing secret manager. Never hard-code it, never put it in a query string, and never write it into a committed example. The MCP server accepts either the same bearer key or an OAuth 2.1 sign-in, so a chat client can connect without a key being pasted into the conversation.

Requests must send a `User-Agent` header that names your application. A missing or default agent string can be rejected at the edge with a 403.

## Endpoints

Base URL: `https://transcriptapi.com/api/v2`

| Endpoint | Purpose | Key parameters |
|---|---|---|
| `GET /youtube/transcript` | Caption text for one video | `video_url` (required), `language`, `format`, `include_timestamp`, `send_metadata` |
| `GET /youtube/info` | Video metadata and available caption languages | `video_url` (required) |
| `GET /youtube/search` | Search videos or channels | `q`, `type`, `continuation` |
| `GET /youtube/channel/resolve` | Resolve a handle or URL to a `UC...` ID | `input` (required) |
| `GET /youtube/channel/search` | Search inside one channel | `channel`, `q`, `continuation` |
| `GET /youtube/channel/videos` | Paginated channel uploads | `channel`, `continuation` |
| `GET /youtube/channel/latest` | Most recent uploads for a channel | `channel` |
| `GET /youtube/playlist/videos` | Paginated playlist contents | `playlist`, `continuation` |

`video_url` accepts a full YouTube URL or a bare 11-character video ID. `channel` accepts an `@handle`, a channel URL, or a `UC...` ID. Paginated endpoints return a `continuation` token, so loop until the token is absent rather than guessing a page count.

Fetch a transcript:

```bash
curl --fail --silent --show-error --get \
  "https://transcriptapi.com/api/v2/youtube/transcript" \
  --data-urlencode "video_url=${VIDEO_ID}" \
  --data-urlencode "format=text" \
  --data-urlencode "include_timestamp=false" \
  --header "Authorization: Bearer ${TRANSCRIPTAPI_KEY}" \
  --header "User-Agent: my-app/1.0"
```

List a channel's most recent uploads:

```bash
curl --fail --silent --show-error --get \
  "https://transcriptapi.com/api/v2/youtube/channel/latest" \
  --data-urlencode "channel=@NASA" \
  --header "Authorization: Bearer ${TRANSCRIPTAPI_KEY}" \
  --header "User-Agent: my-app/1.0"
```

## Transcript Options

- `format=json` returns segments; `format=text` returns a single string.
- `include_timestamp=true` with `format=json` adds `start` and `duration` to each segment. With `format=text` it produces lines prefixed like `[123.45s]`.
- `include_timestamp=false` is what you want when the transcript is going straight into a summarization prompt, because it removes tokens the model does not need.
- `language` takes a comma-separated priority list, for example `de,en,asr`. Codes ignore region, so `de` matches `de-DE`. The prefix `asr` selects auto-generated captions and `asr-<code>` selects a specific auto-generated language.
- The `language` field on the response is the code that was actually resolved. If it comes back as `asr-<code>`, the auto-generated track was used, which is also a cheap way to detect the spoken language of a video.
- `send_metadata=true` adds title, author, and thumbnail so you do not need a second call.

Call `/youtube/info` first when you are unsure a video has captions in the language you need. It is free and it returns `available_languages` in the exact form the `language` parameter expects.

## Implementation Flow

1. Identify the task: transcript, language probe, keyword search, channel listing, playlist listing, or upload polling.
2. Pick the surface from the table above, then read the matching reference page before choosing parameter names.
3. Read the key from the environment. Fail with a clear message if it is unset rather than sending an unauthenticated request.
4. Probe with `/youtube/info` when caption availability is uncertain.
5. Request the narrowest output the task needs. Plain text without timestamps is smaller and cheaper to pass to a model.
6. Follow `continuation` tokens for anything paginated, and bound the loop so a large channel cannot run away.
7. Cache transcripts by video ID. Captions rarely change, and a cached response still costs a request.
8. Return structured data to the caller instead of printing raw response bodies.

## Costs and Limits

This is a metered commercial service. Requests are billed in credits, so treat every call as a real cost in code review and in tests:

- `/youtube/info`, `/youtube/channel/resolve`, and `/youtube/channel/latest` are free.
- The transcript, search, and listing endpoints consume credits, and the paginated ones charge per page.
- Credits are charged on `200` responses only, including cached ones. Errors and rate-limited requests are not charged.
- `402 Payment Required` means the account is out of credits.

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. Read them instead of hard-coding a rate, and use them to pace batch jobs.

## Error Handling

| Status | Meaning | Retry |
|---|---|---|
| `400` | Bad parameters | No |
| `401` | Missing or invalid key | No |
| `402` | Out of credits | No |
| `404` | Video missing, or no transcript for it | No |
| `408` | Temporary upstream failure | Yes, after a short delay |
| `429` | Rate limited | Yes, honor `Retry-After` |
| `500` | Server error | Only once, then surface the failure |
| `503` | Temporarily unavailable | Yes, after a short delay |

Use exponential backoff for the retryable statuses, cap the attempts, and never retry a `4xx` other than `408` and `429`. Treat `404` as a normal outcome in a batch job, because plenty of videos simply have no captions, and record the video ID rather than aborting the run.

## Safety and Accuracy

- Keep the language neutral and technical. This is an integration guide, not a recommendation to buy anything.
- State that TranscriptAPI is an independent third-party service. Do not claim affiliation with YouTube or Google.
- Do not expose API keys, tokens, or authorization headers in logs, error messages, or committed examples.
- Do not bypass access controls or platform policies, and do not use the API to collect content the user has no right to process.
- Respect the copyright of transcript text. It is source material for analysis, not content to republish wholesale.
- Prefer the live API reference and OpenAPI spec over memory, because parameters and credit costs change.
- Use neutral example channels such as `@TED`, `@NASA`, or `@natgeo` in generated samples rather than a named individual's channel.

TranscriptAPI is a commercial service operated by Zero Point Studio. YouTube is a trademark of Google LLC.
