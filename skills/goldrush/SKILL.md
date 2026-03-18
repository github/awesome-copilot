---
name: goldrush
description: |
  Query blockchain data across 100+ chains using the GoldRush API by Covalent. Use this skill when you need wallet token balances, transaction history, NFT holdings, token prices, DEX pair data, real-time OHLCV price feeds, or any on-chain data. Supports REST API, real-time WebSocket streams, CLI, and x402 pay-per-request access without signup.
---

# GoldRush Blockchain Data

## Overview
GoldRush by Covalent provides blockchain data across 100+ chains through a unified REST API, real-time WebSocket streams, a CLI, and an x402 pay-per-request proxy. Use this skill to query on-chain data including wallet balances, token prices, transaction history, NFT holdings, and DEX pairs.

## When to Use This Skill
- Querying wallet token balances or portfolio value across chains
- Fetching transaction history for an address
- Getting current or historical token prices
- Monitoring DEX pairs and liquidity data
- Streaming real-time OHLCV price feeds via WebSocket
- Building blockchain explorers, portfolio dashboards, or DeFi analytics tools
- Accessing on-chain data with pay-per-request (no signup required via x402)

## How It Works

### Step 1: Get an API key
Sign up at https://goldrush.dev for a free API key, or use x402 pay-per-request for no-signup access.

### Step 2: Choose your access method
- **REST API** — `https://api.covalenthq.com/v1/` — HTTP requests with `Authorization: Bearer YOUR_API_KEY`
- **WebSocket** — Real-time streams for OHLCV price feeds and DEX pair monitoring
- **CLI** — `npx @covalenthq/goldrush-cli` for terminal queries
- **x402** — Pay-per-request proxy, agent-native, no API key required

### Step 3: Make a query

```bash
# Get token balances for a wallet on Ethereum
curl -H "Authorization: Bearer $GOLDRUSH_API_KEY"   "https://api.covalenthq.com/v1/eth-mainnet/address/0xYOUR_ADDRESS/balances_v2/"
```

```javascript
// Using the GoldRush SDK
import GoldRushClient from "@covalenthq/client-sdk";

const client = new GoldRushClient(process.env.GOLDRUSH_API_KEY);
const resp = await client.BalanceService.getTokenBalancesForWalletAddress(
  "eth-mainnet",
  "0xYOUR_ADDRESS"
);
```

## Examples

### Example 1: Wallet Token Balances
```bash
curl -H "Authorization: Bearer $GOLDRUSH_API_KEY"   "https://api.covalenthq.com/v1/eth-mainnet/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/balances_v2/"
```

### Example 2: Token Price History
```bash
curl -H "Authorization: Bearer $GOLDRUSH_API_KEY"   "https://api.covalenthq.com/v1/pricing/historical_by_addresses_v2/eth-mainnet/USD/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/"
```

### Example 3: Real-time DEX Pairs via CLI
```bash
npx @covalenthq/goldrush-cli stream dex-pairs --chain eth-mainnet
```

### Example 4: x402 Pay-per-request (no API key needed)
```bash
# Agent-native access — pay with USDC on Base
npx @covalenthq/goldrush-cli --x402
```

## Best Practices
- Use chain slugs like `eth-mainnet`, `matic-mainnet`, `base-mainnet` — full list at https://goldrush.dev/docs/networks
- Cache responses where possible — balance data updates every block (~12s on Ethereum)
- Use WebSocket streams for real-time data instead of polling REST
- Store your API key in `GOLDRUSH_API_KEY` environment variable, never hardcode it
- Use SDK cursor pagination rather than manual offset pagination

## Common Pitfalls

**Problem:** 401 Unauthorized  
**Solution:** Ensure the API key is in the `Authorization: Bearer` header

**Problem:** Unknown chain name  
**Solution:** Use the chain slug format (e.g., `eth-mainnet`) — see https://goldrush.dev/docs/networks

## Additional Resources
- Docs: https://goldrush.dev/docs
- npm MCP server: https://www.npmjs.com/package/@covalenthq/goldrush-mcp-server
- Agent Skills: https://github.com/covalenthq/goldrush-agent-skills
- Smithery: https://smithery.ai/server/covalenthq/goldrush-foundational-api