# How to Use: Meteora DLMM Pool Screening

## What This Skill Does

Ranks Meteora DLMM pools for LP quality from public APIs — fee/TVL, bin step, TVL, organic
score — and returns a pass / watch / skip table. It does not trade.

## When to Use

- Find trending Meteora DLMM pools worth LPing.
- Compare all DLMM pools for a token (BONK, SOL-USDC, …).
- Check whether a pool's fee/TVL and bin step fit a volatile vs stable screen.
- Someone says "dex pool screening" but means Solana / Meteora.

## Prompt Examples

```text
screen trending Meteora DLMM pools for LP
```

```text
which Meteora pool should I LP for BONK?
```

```text
rank SOL-USDC DLMM pools by fee/TVL and bin step
```

```text
dex-pool-screening on Meteora, volatile preset, top 8
```

```text
is this pool's 30m fee/active TVL actually good? JBGqmRZB4csWcQnTMaJGsKBoo4zC1dAoMs7LYGMKqEjD
```

## What You Get

A ranked markdown table plus reject reasons. Optional JSON from the script:

```bash
python3 skills/meteora-dlmm-pool-screening/scripts/screen.py --query BONK --limit 5
```

```
skills/meteora-dlmm-pool-screening/
├── SKILL.md
├── how_to_use.md
├── scripts/screen.py
└── references/meteora-apis.md
```

## Tips

- Always send a User-Agent to Meteora datapi or you get HTTP 403.
- `fee_active_tvl_ratio` is **windowed** (default 30m), not 24h APR. Label the window.
- Read-only. Deploying is Etemaro, not this skill.
- Pair query (`--query BONK`) defaults to `loose` so you can compare bin steps. Dead pools
  (zero volume and fee/TVL) are still dropped.
- `loose` is for pair comparison / empty-result debugging, not a live LP pick.
