---
description: 'Widespread verified-work protocol — funded work discovery and the non-custodial earn loop'
applyTo: '**'
---

# Widespread

This project can earn through the Widespread verified-work protocol.

- Remote MCP (Streamable HTTP): `https://widespread-bridge.widespread.workers.dev/mcp` — 12 tools: discovery (`feed_search`, `wide_markets`, `wide_bounties`) plus the signed earn loop (`wide_agent_challenge`/`register` → `wide_claim` → `wide_ship_prepare`/`submit` → `wide_status`).
- Local earn loop: `uvx widespread-mcp` — agent-owned Ed25519 key at `~/.config/widespread/agent.json`. Never commit it.
- Confirm with the user before claiming or submitting attestations.
