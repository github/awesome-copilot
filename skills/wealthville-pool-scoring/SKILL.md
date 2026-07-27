---
name: wealthville-pool-scoring
description: 'Use this skill when the user asks whether a DeFi liquidity pool is worth providing liquidity to, which pools currently look best, or how accurate the scores have actually been. Returns a 0-100 pool score and an Enter/Hold/Exit/Reduce/Avoid verdict with calibrated confidence for Solana and EVM pools, plus a public miss-inclusive track record. Do not trigger for token price lookups, swap quotes, or wallet balances.'
license: MIT
compatibility: 'Cross-platform. Read-only HTTP GET requests to a public API; no API key, no wallet, no install step.'
---

# WealthVille — liquidity-pool scoring

Answer "should I put liquidity in this pool?" with a number, a verdict, and the
evidence for how often that verdict has been right.

Covers ~68,800 Solana pools (Meteora DLMM, Orca Whirlpool, Raydium AMM/CLMM/CPMM)
and 575 EVM pools across Ethereum, Arbitrum, Base, Optimism, Polygon and BSC
(Uniswap v2/v3/v4, Aave, Morpho, Pendle, Curve, Compound, Aerodrome).

## Safety and scope

This skill is **read-only**. It performs `GET` requests against a public HTTP API
and nothing else.

- It never builds, signs, simulates or sends a transaction.
- It never asks for a seed phrase, private key, or wallet connection. There is
  nothing for it to ask for — the API takes no authentication.
- It installs no software and runs no shell bootstrap. Use `curl` or any HTTP
  client you already trust.
- No API key is required. A free partner key raises the rate limit from 60 to
  600 requests/minute; it is sent as `x-api-key` and grants no extra data.

Everything below is public information. Treat the output as research, not advice:
the scores are a model's opinion, and the track record exists precisely because
that opinion is wrong a meaningful fraction of the time.

## When to use this

Use it when the user asks any of:

- "Is this pool worth LPing into?" (they give a pool address)
- "What are the best pools right now?" (ranked list)
- "What's the current signal feed?" (recent ENTER/EXIT calls)
- "How accurate are these scores?" (track record — always offer this when the
  user is about to act on a verdict)

Do **not** use it to price a token, quote a swap, or read a wallet balance. It
scores pools; it is not a market-data or portfolio API.

## API

Base URL: `https://wealthville.net/api/v1`

### 1. Score one pool

```
GET /scores/{poolAddress}
```

```bash
curl -s "https://wealthville.net/api/v1/scores/Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE"
```

Returns the composite WealthVille score (0-100), the verdict, calibrated
confidence, and the component scores (farmer / risk / scout).

### 2. Rank pools

```
GET /pools/top?limit=20
GET /scores/top?limit=25&chain=solana        # chain: solana | evm | ethereum | base | …
```

```bash
curl -s "https://wealthville.net/api/v1/pools/top?limit=10"
```

Ranked pools with TVL, 24h volume, fee APR and score. Results already exclude
pools below liquidity and volume floors, so the head of the list is not microcaps.

### 3. EVM pools

```
GET /evm/pools?limit=20
GET /evm/chains
```

```bash
curl -s "https://wealthville.net/api/v1/evm/pools?limit=5"
```

Each row carries `verdict`, `confidence`, a plain-language `summary`, and
`reasons`. Note `apy_capped`: when true the displayed APY is a 500% display bound,
not a measurement — say ">500%" rather than quoting the number.

### 4. Signal feed

```
GET /signals/feed?limit=10
```

Recent published signals, actionable calls (ENTER/EXIT/REDUCE/AVOID) ordered
above informational ones. Each carries both `confidence` (raw) and
`calibrated_confidence` — **prefer the calibrated value**, which is fitted per
protocol against realised outcomes.

### 5. Track record

```
GET /track-record
```

```bash
curl -s "https://wealthville.net/api/v1/track-record"
```

Per-action hit rates over a rolling 30 days, with misses included. Also returns
`weekly_enter_hit_rate` so you can see direction, not just a headline.

## How to read a verdict

| Verdict | Meaning |
| --- | --- |
| `ENTER` | Conditions support opening a position |
| `HOLD` | Keep an existing position; do not add new capital |
| `REDUCE` | Trim exposure |
| `EXIT` | Close the position |
| `AVOID` | Do not open — typically a launch-risk screen |

`HOLD` is the majority class and is not a weak `ENTER`. It specifically means
"existing position fine, new capital frozen."

## Reporting results honestly

When you relay a verdict, bring the track record with it. As of the last
published window: ENTER hits 0.63 across 3,043 resolved calls, EXIT 0.69, AVOID
1.00 on a small sample — and **REDUCE 0.00 on n=16**. That last figure is real and
published deliberately. If you surface a REDUCE verdict, say that the class has no
demonstrated accuracy yet.

Always fetch `/track-record` rather than quoting the numbers above; they move.

Quote TVL and volume alongside any score. A high score on a $60k pool is a very
different proposition from the same score on a $26M pool, and the score alone does
not encode position-size suitability.

## Also available as MCP

The same four capabilities are exposed as MCP tools — `get_pool_score`,
`get_top_pools`, `get_signals_feed`, `get_track_record` — if you would rather
call tools than HTTP:

```bash
claude mcp add wealthville -- npx -y @wealthville/mcp-server
```

A hosted Streamable-HTTP endpoint is also available at
`https://wealthville.net/mcp` with no authentication.

## Limitations

- Solana coverage is broad; EVM coverage is 575 curated pools, not the whole
  universe. Absence from the EVM set is not a negative signal.
- Scores refresh on a tier cadence — vault-held pools every 15 minutes, the long
  tail far less often. Check `signals_ts` / snapshot age before treating a score
  on an obscure pool as current.
- Fee APR above 500% is a display bound (`fee_apr_capped` / `apy_capped`), not a
  measured rate.
- The scoring model has no audit and a limited history. It is one input.
