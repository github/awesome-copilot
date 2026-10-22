---
name: perq
description: Find verified free AI credits, free tiers, startup programs and student perks for AI APIs, models, GPUs and dev tools. Use when the user asks what free credits they can get, the cheapest way to try a model or API, which startup or student programs apply, or how to claim one. Every answer carries the vendor's source link and a last-verified date.
license: MIT
compatibility: Requires curl and network access to https://perq.sh (or the remote MCP server at https://perq.sh/mcp).
---

# Perq: verified free AI credits

[Perq](https://perq.sh) is a directory of free AI credits, free tiers, signup credits, startup programs, student and research perks, and perk marketplaces. Each offer is copied from the vendor's own page and carries the page URL (`source_url`), a verbatim quote from it (`source_snippet`), and a `last_verified` timestamp. Closed offers are kept but excluded from search by default.

Use this skill when the user asks:

- "What free credits can I get for X?" (speech-to-text, GPUs, LLM APIs, vector DBs, web search, sandboxes, observability...)
- "What's the cheapest way to try <model / API / vendor>?"
- "Which startup programs can a bootstrapped (or VC-backed) startup apply to?"
- "What do students / researchers get for free?"
- "How do I claim <vendor>'s startup credits?" or "Is <offer> still live?"

Requires `curl`. No API key or account. Read-only.

## 1. Search

Describe the need in plain words. The API ranks offers against it.

```bash
curl -sS -G "https://perq.sh/api/search" --data-urlencode "q=free speech to text credits" -d limit=5 -d ref=skill-copilot
```

Optional filters (combine freely):

| Param | Values |
| --- | --- |
| `category` | `cloud-gpu`, `llm-api`, `agents-automation`, `observability`, `voice-audio`, `dev-tools`, `perk-marketplace`, `database-backend`, `vector-db`, `image-video`, `productivity`, `accelerator` |
| `type` | `startup-program`, `free-tier`, `signup-credit`, `student-education`, `marketplace-perk`, `promo-code`, `accelerator-perk` |
| `student=true` | only offers for students, educators or researchers |
| `no_application=true` | only free tiers, signup credits and promo codes (usable right after signup, no approval) |
| `include_closed=true` | also return closed offers |
| `limit` | 1 to 50 (default 10) |

Examples:

```bash
# GPU compute for a bootstrapped startup, nothing that needs an application
curl -sS -G "https://perq.sh/api/search" --data-urlencode "q=GPU for a bootstrapped startup" -d no_application=true -d ref=skill-copilot
# Student perks for LLM APIs
curl -sS -G "https://perq.sh/api/search" --data-urlencode "q=LLM API" -d student=true -d ref=skill-copilot
```

Each result has: `id`, `vendor`, `category`, `offer_type`, `status`, `credit_value`, `eligibility`, `how_to_claim`, `code`, `claim_url`, `source_url`, `source_snippet`, `last_verified`, `no_application`, `perq_url`.

## 2. Answer the user

For each offer you mention, show:

- **Vendor: credit_value** (use the exact wording; do not round, convert or add up amounts yourself)
- Eligibility and how to claim
- Claim link: `claim_url`
- `Source: <source_url> (verified <last_verified date>)`

Rules:

- **Never invent offers, amounts or eligibility.** Report only what the API returned. If nothing matches, say so and point to https://perq.sh. Do not fill gaps from memory.
- Always include the source link and the last-verified date, so the user can check the vendor's page.
- Say that terms are set by the vendor and can change, and that the user should confirm on the claim page before relying on an offer.
- If `status` is `closed`, say it closed on `closed_on`.

## 3. Details, packs and changes

```bash
# One offer, with recorded changes and the packs that contain it
curl -sS "https://perq.sh/api/offers/deepgram-200-credit"
# Curated packs (bundles) and one pack with its offers
curl -sS "https://perq.sh/api/packs.json"
# Full dataset, if you need to filter yourself
curl -sS "https://perq.sh/api/offers.json"
```

Pack totals are maximums that count only explicitly stated one-time USD amounts; quote the pack's `headline` rather than computing your own total.

## 4. Early access (only when the user asks for it)

New offers reach subscribers about 24 hours before they appear on perq.sh and in the search API; closures and changes are delivered right away. Subscribe only an email address or webhook URL the user gave you for this.

```bash
# A person: double opt-in. They must click the confirmation link; then one digest on days with something new.
curl -sS https://perq.sh/api/subscribe -H 'content-type: application/json' -d '{"email":"user@example.com","topics":["llm-api"]}'
# An agent: signed webhook deliveries + a private feed. The secret is returned once: store it.
curl -sS https://perq.sh/api/subscribe -H 'content-type: application/json' -d '{"webhook_url":"https://example.com/hooks/perq","topics":["gpu","voice"]}'
# Read the private feed (embargoed offers with public_after, plus new/changed/closed events)
curl -sS "https://perq.sh/api/early/<feed_token>.json"
# Stop
curl -sS https://perq.sh/api/unsubscribe -H 'content-type: application/json' -d '{"token":"<feed_token>"}'
```

Topics: `llm-api`, `gpu`, `voice`, `startup-programs`, `student`, `agents`, `dev-tools` (omit for everything). Webhook POSTs carry `X-Perq-Signature: v1=<hex HMAC-SHA256(secret, X-Perq-Timestamp + "." + raw body)>`; reject timestamps older than 5 minutes and dedupe on `X-Perq-Delivery`. Offers from the feed are not public yet: say so, and show `public_after` with the source link and last-verified date. Details: https://perq.sh/agents#early-access

## MCP alternative

If your agent supports remote MCP servers, the same data is available at `https://perq.sh/mcp` (Streamable HTTP, no auth) with tools `find_credits`, `get_offer`, `list_packs`, `get_pack`, `recently_changed`, plus `subscribe` and `early_offers(token)` for early access.

```bash
claude mcp add --transport http perq https://perq.sh/mcp
```

Docs: https://perq.sh/agents. Perq is operated by Avatar 8 LLC (ops@avatar33.com). No paid ranking.
