---
name: x-research
description: |
  Search and inspect current public X/Twitter posts, trends, profiles, profile posts, media, and replies through AgentBody's fixed REST contract. Use this skill when the user asks to search X or Twitter, monitor a topic or account, inspect a post, track trends, or gather current X evidence.
---

# X Research

Read-only X/Twitter research through AgentBody's REST API.

## When to Use

- Search public X posts
- Read current trends
- Inspect a post or profile
- Read profile posts, media, or post replies

## Setup

Configure `AGENTBODY_API_KEY` once using the AgentBody Agent Quickstart. Run the bundled client:

```bash
python3 scripts/x_client.py search --query "AI agents"
python3 scripts/x_client.py trending --country US
python3 scripts/x_client.py profile --username OpenAI
```

This skill is read-only. Posting, OAuth, likes, follows, and account management are out of scope.