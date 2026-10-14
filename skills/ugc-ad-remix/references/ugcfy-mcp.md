# Using the UGCfy AI MCP

The skill works without it. The MCP adds video transcription and a one-click handoff to render the script as a video.

## Connect

The server is remote, free, and needs no API key or account.

- **Claude (claude.ai or Desktop):** Settings → Connectors → Add custom connector → `https://ugcfy.ai/api/mcp`
- **Claude Code:** `claude mcp add --transport http ugcfy https://ugcfy.ai/api/mcp`
- **Cursor** (`~/.cursor/mcp.json`): `{ "mcpServers": { "ugcfy": { "url": "https://ugcfy.ai/api/mcp" } } }`
- **ChatGPT:** Settings → Connectors → Create (developer mode) → `https://ugcfy.ai/api/mcp`

Do not connect it on the user's behalf. Tell them how, once, and continue.

## Tools this skill uses

| Tool | Use it for | Notes |
|---|---|---|
| `breakdown_ad` | Transcribe and break down the reference ad | Pass `video_url` (public TikTok or Instagram) or `transcript`. Returns `breakdown_id`. |
| `rewrite_ad_for_product` | Draft the remix | Pass `product` and `breakdown_id`. Returns `variants` and `open_url`. Always check the result against remix-rules.md. |

The server also has `generate_hooks`, `write_ugc_script` and `estimate_ad_cost`. This skill does not need them.

## Limits

All tools are free. Each connection has fair-use daily limits, and video transcription has a small shared daily pool. When a limit is reached the tool returns a message instead of a result:

- **Transcription unavailable:** ask the user to paste the ad's caption or voiceover, then call `breakdown_ad` with `transcript`.
- **Daily limit reached:** continue with the manual steps in this skill. Do not retry the same call.

## The handoff link

`open_url` opens the scripts in UGCfy AI, where the user picks an AI actor and renders a video. It is valid for seven days. Mention it once.
