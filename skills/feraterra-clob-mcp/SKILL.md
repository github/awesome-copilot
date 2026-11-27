---
name: feraterra-clob-mcp
description: 'Connect GitHub Copilot and MCP agents to FeraTerra / Arena Exchange central limit order books via Streamable HTTP MCP or Python feraterra-sdk. Use when inspecting Spot, Perpetual, FormulaPerp, BoundedClaim, or SpreadBook L2/L3 order books, verifying Keccak-256 + secp256k1 ledger tips, querying Gladiator leaderboards, or running stateless pre-trade Eigen-SPAN margin previews.'
---

# FeraTerra / Arena Exchange CLOB & MCP Integration

Connect GitHub Copilot, coding agents, and Python trading tools to **FeraTerra / Arena Exchange** (`https://feraterra.app`, Base Sepolia testnet `https://testnet.feraterra.app`) — a headless central limit order book (CLOB) supporting cross-margined Spot, Linear Perpetuals, Formula Perpetuals (`Power2`, `Ratio`, `RealizedVar`, `BookImbalance`), Bounded Claims, and Perp-Spot Basis `SpreadBook` instruments.

This skill covers the non-obvious protocol rules that models otherwise get wrong: exact fixed-point integer scales (`ticks`, `lots`, `micro-USD`), unauthenticated vs. authenticated MCP tool boundaries, stateless `POST /order/preview` margin dry runs, and `ARENA_LEDGER_TIP_V2_1` operator state-root signature verification.

## When to Use

- Configuring `.vscode/mcp.json` or Copilot MCP settings for FeraTerra's hosted Streamable HTTP MCP server (`https://mcp.feraterra.app/mcp`) or local `feraterra-mcp` `stdio` server.
- Inspecting live Spot, Perpetual, Formula Perpetual, Bounded Claim, or Basis `SpreadBook` market specs, L2/L3 order book depth, trades, OHLCV candles, or Gladiator Leaderboard rankings.
- Building or reviewing Python integrations against `feraterra_sdk` (`ArenaHttpClient`, `ArenaCcxtAdapter`, `EthWalletSigner`, `verify_ledger_tip`) or C++23 64-byte `ArenaWire` / `ArenaITCH` headers (`arena_hft_client.hpp`).
- Simulating pre-trade fills, fees, and Eigen-SPAN initial margin impact via `arena_preview_order` / `POST /order/preview` before any live execution.
- Do not use for unrelated centralized exchange REST APIs or generic EVM token swaps.

## MCP Server Setup

### 1. Zero-Install Remote Streamable HTTP MCP (Read-Only Public Data)

Add the hosted remote MCP endpoint to `.vscode/mcp.json` for zero-install access to public market metadata, L2/L3 order books, candles, leaderboard standings, and signed ledger tips:

```json
{
  "servers": {
    "feraterra-clob": {
      "type": "http",
      "url": "https://mcp.feraterra.app/mcp"
    }
  }
}
```

### 2. Local `stdio` MCP Server on Base Sepolia Testnet (`feraterra-sdk`)

When you need account-scoped pre-trade margin simulations (`arena_preview_order`), portfolio inspection (`arena_get_account_portfolio`), or testnet execution with explicit notional guardrails, install the pinned zero-dependency PyPI package (`https://github.com/FeraTerra/feraterra-sdk`, MIT) in a virtual environment after confirming with the user:

```bash
python -m venv .venv
.venv/bin/pip install feraterra-sdk==4.9.3
```

Configure `.vscode/mcp.json` in read-only mode by default (or remove `--read-only` only when the user explicitly authorizes testnet trading):

```json
{
  "servers": {
    "feraterra-testnet": {
      "type": "stdio",
      "command": "${workspaceFolder}/.venv/bin/feraterra-mcp",
      "args": [
        "--testnet",
        "--read-only",
        "--max-order-notional-usd",
        "5000"
      ]
    }
  }
}
```

## Tool Selection & Auth Boundaries

The MCP server exposes 24 `ToolAnnotations`-tagged tools (`9` read-only). Choose the right surface based on authentication state:

| Intent | MCP Tool | Works on Unauthenticated Remote HTTP? | Notes |
| --- | --- | --- | --- |
| Check daemon health, `wal_seq`, and conservation | `arena_health_and_manifest` | Yes | Returns protocol manifest and `wal_seq` |
| List active markets, unified symbols, and BBOs | `arena_list_markets` | Yes | Filter by `kind` (`spot`, `perp`, `formula_perp`, `bounded_claim`, `spread_book`) |
| Read live L2/L3 order book snapshot | `arena_get_orderbook` | Yes | Accepts `symbol` (`BTC/USD:USD` or `BTC-USD-PERP`) or `market_id`, `depth` `1..200` |
| Fetch recent fills and `tick`/`1s`/`1m` candles | `arena_get_trades_and_candles` | Yes | `limit` `1..240` |
| Query ranked Gladiator Leaderboard | `arena_get_leaderboard` | Yes | `sort` in `equity`, `pnl`, `streak`, `volume`, `roi` |
| Verify `Keccak-256` + `secp256k1` WAL state root | `arena_verify_ledger_tip` | Yes | Pass `expected_operator_address` to pin operator identity |
| Dry-run order fill, fee, and Eigen-SPAN IMR impact | `arena_preview_order` | Requires auth (`local stdio`) | Zero WAL mutation; depends on account portfolio margin |
| Inspect balances, positions, IMR/MMR, open orders | `arena_get_account_portfolio` | Requires auth (`local stdio`) | Hidden on unauthenticated public HTTP gateway |
| Verify withdrawal vouchers & Merkle escape proofs | `arena_get_withdrawals_and_escape_proof` | Requires auth (`local stdio`) | Verifies `ARENA_ESCAPE_LEAF_V1_4` proofs |

If `arena_preview_order` is called against the unauthenticated public HTTP endpoint, the server returns `{"auth_required": true, "http_status": 401}` rather than guessing standalone margin. Switch to a local authenticated `feraterra-mcp --testnet` session for account-aware margin previews.

## Critical Protocol Rules & Fixed-Point Scales

Never use floating-point math when constructing raw Arena REST or 64-byte `ArenaWire` payloads. Always use the exact integer scales or the SDK conversion helpers:

| Quantity | Integer Field | Exact Scale | SDK Helper (`feraterra_sdk`) |
| --- | --- | --- | --- |
| Price | `price_ticks` | `1 tick = $0.01 USD` | `usd_to_price_ticks("60500.00")` / `price_ticks_to_usd_str(ticks)` |
| Base size | `qty_lots` | `1 lot = 1e-4` base asset (`0.0001`) | `base_to_qty_lots("0.2500")` / `qty_lots_to_base_str(lots)` |
| USD collateral / PnL | `*_micro` | `1 micro = 1e-6 USD` (`$0.000001`) | `usd_to_micro("1000.00")` / `micro_to_usd_str(micro)` |

### Python SDK Pattern: Discovery, Ledger Verification & Stateless Preview

```python
from feraterra_sdk import (
    ArenaCcxtAdapter,
    ArenaHttpClient,
    EthWalletSigner,
    verify_ledger_tip,
)

# Connect to public Base Sepolia testnet (https://testnet.feraterra.app)
client = ArenaHttpClient.testnet()

# 1. Cryptographically verify the signed WAL state root (ARENA_LEDGER_TIP_V2_1)
tip = client.ledger_tip()
is_valid = verify_ledger_tip(tip, allow_self_asserted_signer=True)
print(f"wal_seq={tip['wal_seq']} state_root={tip['state_root']} verified={is_valid}")

# 2. Ephemeral EIP-191 testnet login (no browser or KYC; never hardcode private keys)
signer = EthWalletSigner()
session = client.login_with_wallet(signer)
account_id = int(session["account_id"])

# 3. CCXT camelCase adapter + zero-mutation order/margin preview
exchange = ArenaCcxtAdapter(client, account_id=account_id)
markets = exchange.loadMarkets()
preview = exchange.previewOrder(
    "BTC/USD:USD",
    "limit",
    "buy",
    "0.0100",
    "60000.00",
    {"postOnly": True},
)
print("Would accept:", preview["would_accept"], "Post-IMR micro:", preview["post_imr_micro"])
```

### Machine-Readable Discovery Endpoints

When generating typed clients or checking live market parameters on an Arena deployment:

- `GET https://testnet.feraterra.app/llms.txt` — Concise protocol specification, fixed-point scales, EIP-191 login challenge format, and endpoint summary.
- `GET https://testnet.feraterra.app/openapi.json` — Complete OpenAPI `3.1.0` schema.
- `GET https://testnet.feraterra.app/faucet/status` — Base Sepolia (`chain_id=84532`) `Clearinghouse` contract address and collateral token metadata.

## Limitations & Safety Guardrails

- **Always preview before mutating:** Run `arena_preview_order` (`POST /order/preview`) and ask for explicit user confirmation of symbol, side, size, limit price, and post-trade initial margin before invoking any order-placing, faucet, or withdrawal tool.
- **Point-in-time snapshots:** Order book reads and `previewOrder` outputs are bound to the returned `wal_seq`; fast order books can move before a subsequent live order arrives.
- **Secret hygiene:** Never embed wallet private keys, `ARENA_API_SECRET`, or bearer tokens in source files, shell history, or prompts; load credentials from environment variables (`ARENA_API_KEY`, `ARENA_API_SECRET`) or a gitignored key file.
- **Testnet scope:** Assets and balances on `https://testnet.feraterra.app` (`chain_id=84532`) are Base Sepolia test tokens with no monetary value.
